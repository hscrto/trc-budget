import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { PageTitle } from '../components/FavoriteButton.jsx';
import { getNode } from '../config/navigation.js';
import { dataService } from '../services/dataService.js';
import { nodeLinkProps } from '../nodeActions.js';
import { navigate } from '../useHashRoute.js';
import { usePerm } from '../permissions.jsx';
import ReviewStatus, { statusText } from '../components/ReviewStatus.jsx';
import { orgLevel } from '../config/org.js';

// ─────────────────────────────────────────────────────────────
// 我的預算審查 List View（參照 Salesforce List View，11/10；11/12 改為明細表）
// 三種清單共用同一組欄位，只是篩選條件不同：
//   我提交的預算＝自己單位提交給上一層的（室：預算編列；段以上：明細表）（提交者角度）
//   待審＝下一層送到我這一層、輪到我審核的（段：各室的預算編列；處以上：明細表）
//   已完成的審核＝我已核准或退回的
// 狀態依「誰在看」顯示（見 components/ReviewStatus.jsx）
// ─────────────────────────────────────────────────────────────
export const VIEWS = [
  // 11/12 順序：已送審 > 我待審 > 已完成（同選單）
  // 11/18 使用者：移除「已送審」，我提交出去的併入「已完成」
  { id: 'rv-pending', icon: 'pending', tone: 'amber', filter: (r) => r.status === '我待審', sortKey: 'submitDate', sortDir: 'asc' },
  { id: 'rv-done', icon: 'reviewed', tone: 'green', filter: (r) => r.status === '已完成', sortKey: 'doneDate', sortDir: 'desc' },
];

export const COLUMNS = [
  { key: 'title', label: '名稱' },
  { key: 'submitter', label: '提交人' },
  { key: 'submitDate', label: '提交日期' },
  { key: 'income', label: '收入（千元）', num: true },
  { key: 'expense', label: '費用（千元）', num: true },
  { key: 'reviewUnit', label: '審核單位' },
  { key: 'reviewer', label: '審核人' },
  { key: 'doneDate', label: '完成日期' },
  { key: 'status', label: '狀態' },
];
const colLabel = (k) => COLUMNS.find((c) => c.key === k)?.label || k;
const dirLabel = (k, dir) => (k.endsWith('Date') ? (dir === 'asc' ? '由舊到新' : '由新到舊') : (dir === 'asc' ? '遞增' : '遞減'));
// 管理者（11/12）看全系統：層級顯示「全系統」，表格多一欄「階層」
const levelOf = (user) => ((user?.roles || []).includes('管理者') ? '全系統' : orgLevel(user?.dept));
const fmtK = (n) => (n || n === 0 ? n.toLocaleString('zh-TW') : '—');

// 清單沒有資料時的說明（依層級）
function emptyText(viewId, level) {
  if (level === '室') return '室級人員只負責填表，沒有送審與審核作業。';
  if (viewId === 'rv-submitted' && level === '總公司') return '總公司為最上層，沒有需要提交的明細表。';
  if (level === '全系統' && viewId === 'rv-submitted') return '管理者不提交預算；全系統的審查資料請看「我待審」「已完成」。';
  if (!['室', '段', '處', '會計處', '總公司', '全系統'].includes(level)) return '您的單位目前沒有審查項目。';
  if (viewId === 'rv-submitted') return '目前沒有已送審的項目（尚未提交，或上一層已審完，請看「已完成」）。';
  return '目前沒有資料。';
}

function sortRows(rows, key, dir) {
  const num = COLUMNS.find((c) => c.key === key)?.num;
  const out = [...rows].sort((a, b) => (num ? (a[key] || 0) - (b[key] || 0) : String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-Hant')));
  return dir === 'desc' ? out.reverse() : out;
}

function useRecords(user) {
  const [rows, setRows] = useState(null);
  useEffect(() => { dataService.getReviewRecords(user).then(setRows).catch(() => setRows([])); }, [user]);
  return rows;
}

function Table({ rows, sortKey, sortDir, onSort, rowLink }) {
  const showLayer = rows.some((r) => r.layer);
  const cols = showLayer ? [COLUMNS[0], { key: 'layer', label: '階層' }, ...COLUMNS.slice(1)] : COLUMNS;
  return (
    <div className="table-scroll">
      <table className={`data-table lv-table ${showLayer ? 'lv-wide' : ''}`}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={c.num ? 'num' : undefined} aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {onSort ? (
                  <button className={`lv-sort ${sortKey === c.key ? 'on' : ''}`} onClick={() => onSort(c.key)}>
                    {c.label}
                    <Icon name="chevronDown" size={14} className={`lv-sort-ico ${sortKey === c.key && sortDir === 'asc' ? 'asc' : ''}`} />
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="lv-name"><a href={`#rd:${encodeURIComponent(r.id)}`}>{r.title}</a>{r.note && <small className="lv-note">{r.note}</small>}</td>
              {showLayer && <td className="lv-layer">{r.layer}</td>}
              <td>{r.submitter || '—'}</td>
              <td>{r.submitDate || '—'}</td>
              <td className="num">{fmtK(r.income)}</td>
              <td className="num">{fmtK(r.expense)}</td>
              <td>{r.reviewUnit || '—'}</td>
              <td>{r.reviewer || '—'}</td>
              <td>{r.doneDate || '—'}</td>
              <td><ReviewStatus r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 「預算審查」總覽：三個 List View 區塊，各顯示最近 5 筆
export function ReviewOverview({ node }) {
  const { visible, user } = usePerm();
  const all = useRecords(user);
  const level = levelOf(user);
  return (
    <>
      <PageTitle node={node} desc={`待辦只包含審核相關作業：段以上提交「明細表」（由各室填寫的預算表彙整，含收入與費用）；各室填表沒有審核，不列入。您的層級：${level === '全系統' ? '全系統（管理者，可看到每一項審查）' : `${level}（${user?.dept || ''}）`}。各清單顯示最近 5 筆，點「查看全部」進入完整清單。`} />
      {VIEWS.map((v) => {
        const target = getNode(v.id);
        if (!visible(target)) return null;
        const rows = all ? sortRows(all.filter(v.filter), v.sortKey, v.sortDir) : null;
        return (
          <section key={v.id} className={`card lv-card tone-${v.tone}`}>
            <header className="lv-head">
              <span className="lv-ico"><Icon name={v.icon} size={20} /></span>
              <div className="lv-title">
                <h2>{target.label} {rows && <span className="stat-num lv-count">{rows.length}</span>}</h2>
                <small>依{colLabel(v.sortKey)}{dirLabel(v.sortKey, v.sortDir)}排序</small>
              </div>
              <a className="lv-all" {...nodeLinkProps(target)}>查看全部 <Icon name="arrowRight" size={16} /></a>
            </header>
            {!rows ? <p className="muted lv-pad">載入中…</p> : rows.length === 0 ? <p className="muted lv-pad">{emptyText(v.id, level)}</p> : (
              <Table rows={rows.slice(0, 5)} sortKey={v.sortKey} sortDir={v.sortDir} rowLink={nodeLinkProps(target)} />
            )}
          </section>
        );
      })}
    </>
  );
}

// 「查看全部」：完整 List View（切換清單、搜尋、排序）
export function ReviewListPage({ node }) {
  const { visible, user } = usePerm();
  const all = useRecords(user);
  const level = levelOf(user);
  const view = VIEWS.find((v) => v.id === node.id) || VIEWS[0];
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: view.sortKey, dir: view.sortDir });
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { setSort({ key: view.sortKey, dir: view.sortDir }); setQ(''); setMenu(false); }, [view]);
  useEffect(() => {
    if (!menu) return;
    const out = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [menu]);

  const rows = useMemo(() => {
    if (!all) return null;
    const kw = q.trim();
    const base = all.filter(view.filter).filter((r) => !kw || [r.title, r.unit, r.submitter, r.reviewUnit, r.reviewer, statusText(r), r.note, r.layer].some((x) => (x || '').includes(kw)));
    return sortRows(base, sort.key, sort.dir);
  }, [all, view, q, sort]);

  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const parent = getNode('review-plan');
  const views = VIEWS.filter((v) => visible(getNode(v.id)));

  return (
    <>
      <div className={`card lv-card lv-full tone-${view.tone}`}>
        <header className="lv-head">
          <span className="lv-ico"><Icon name={view.icon} size={20} /></span>
          <div className="lv-title">
            <small className="lv-object">{parent.label}</small>
            <div className="lv-switch" ref={menuRef}>
              <button className="lv-switch-btn" onClick={() => setMenu((m) => !m)} aria-haspopup="listbox" aria-expanded={menu}>
                <h1>{node.label}</h1>
                <Icon name="chevronDown" size={16} />
              </button>
              {menu && (
                <ul className="lv-menu" role="listbox" aria-label="切換清單">
                  <li className="lv-menu-title">清單檢視</li>
                  {views.map((v) => (
                    <li key={v.id}>
                      <button role="option" aria-selected={v.id === view.id} className={v.id === view.id ? 'on' : ''} onClick={() => navigate(v.id)}>
                        <Icon name={v.icon} size={16} /> {getNode(v.id).label}
                        {v.id === view.id && <Icon name="check" size={16} className="lv-check" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <small>{rows ? `${rows.length} 筆` : '…'}・依{colLabel(sort.key)}{dirLabel(sort.key, sort.dir)}排序{q ? `・篩選「${q}」` : ''}</small>
          </div>
          <label className="lv-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋這個清單…" aria-label="搜尋這個清單" />
          </label>
        </header>
        {!rows ? <p className="muted lv-pad">載入中…</p> : rows.length === 0 ? <p className="muted lv-pad">{q ? '沒有符合的資料。' : emptyText(view.id, level)}</p> : (
          <Table rows={rows} sortKey={sort.key} sortDir={sort.dir} onSort={onSort} rowLink={{ href: '#', onClick: (e) => e.preventDefault() }} />
        )}
      </div>
    </>
  );
}
