// ─────────────────────────────────────────────────────────────
// 各類預算編列（11/13 使用者）
//   GroupListPage  #budget-plan  維護：分類清單、新增分類（會計處以上）
//   GroupEditPage  #bp-分類      維護：分類名稱、分類中有哪些表（同一張表可在多個分類）
//   GroupFillPage  #bf-分類      填表：各室從首頁「快速功能」點進來編列預算
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { PageTitle } from '../components/FavoriteButton.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import { toast } from '../components/Notification.jsx';
import { usePerm } from '../permissions.jsx';
import { navigate } from '../useHashRoute.js';
import { getNode } from '../config/navigation.js';
import { nodeLinkProps } from '../nodeActions.js';
import { orgLevel, orgUnit, roomsOf, SECTIONS_OF, unitByCode, unitByName } from '../config/org.js';
import BudgetWorkbook from '../components/BudgetWorkbook.jsx';
import { WORKBOOKS, genericWorkbook } from '../config/budgetWorkbooks.js';
import {
  BUDGET_TABLES, tableById, getGroups, getGroup, saveGroups, resetGroups, newGroupId, shortName,
} from '../config/budgetGroups.js';

const kindPill = (k) => <span className={`kind-pill bg-kind ${k === '收入' ? 'in' : 'out'}`}>{k}</span>;

// ── 維護：分類清單 ──
export function GroupListPage({ node }) {
  const groups = getGroups();
  const used = new Set(groups.flatMap((g) => g.tables));
  const unassigned = BUDGET_TABLES.filter((t) => !used.has(t.id));
  const add = () => {
    const id = newGroupId();
    saveGroups([...groups, { id, name: `新分類 ${groups.length + 1}`, tables: [] }]);
    navigate(`bp-${id}`);
  };
  const move = (i, d) => {
    const next = [...groups];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    saveGroups(next);
  };
  return (
    <>
      <PageTitle node={node} desc="會計處把收入、費用預算共 72 張表分成幾個分類，各室在首頁「快速功能」依分類點進去編列。可以命名分類、編輯分類中的表；同一張表可以同時放在多個分類。">
        <button type="button" className="btn-primary bg-add" onClick={add}>新增分類 <Icon name="add" size={16} /></button>
      </PageTitle>
      <div className="table-card">
        <div className="table-meta">
          <span>共 {groups.length} 個分類・預算表 {BUDGET_TABLES.length} 張</span>
          {unassigned.length > 0
            ? <span className="bg-warn">有 {unassigned.length} 張表尚未放入任何分類</span>
            : <span>每張表都至少在一個分類中</span>}
          <span className="bg-meta-right">順序＝首頁快速功能的顯示順序</span>
        </div>
        <div className="table-scroll">
          <table className="data-table bg-table">
            <thead><tr><th className="bg-order">順序</th><th>分類名稱</th><th>首頁顯示</th><th className="num">表數</th><th className="num">收入</th><th className="num">費用</th><th>包含的表</th><th /></tr></thead>
            <tbody>
              {groups.map((g, i) => {
                const ts = g.tables.map(tableById).filter(Boolean);
                const inc = ts.filter((t) => t.kind === '收入').length;
                const n = getNode(`bp-${g.id}`);
                return (
                  <tr key={g.id}>
                    <td className="bg-order">
                      <button type="button" className="bg-mv" disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移"><Icon name="chevronDown" size={16} className="bg-up" /></button>
                      <button type="button" className="bg-mv" disabled={i === groups.length - 1} onClick={() => move(i, 1)} aria-label="下移"><Icon name="chevronDown" size={16} /></button>
                    </td>
                    <td className="strong">{n ? <a {...nodeLinkProps(n)}>{g.name}</a> : g.name}</td>
                    <td>{shortName(g.name)}</td>
                    <td className="num">{ts.length}</td>
                    <td className="num">{inc}</td>
                    <td className="num">{ts.length - inc}</td>
                    <td className="bg-preview">{ts.length ? `${ts.slice(0, 3).map((t) => t.name).join('、')}${ts.length > 3 ? ` 等 ${ts.length} 張` : ''}` : <span className="muted">尚未加入表</span>}</td>
                    <td>{n && <a className="link-btn" {...nodeLinkProps(n)}>編輯</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {unassigned.length > 0 && (
        <p className="bg-foot muted">尚未分類：{unassigned.map((t) => `${t.id} ${t.name}`).join('、')}</p>
      )}
      <p className="bg-foot"><button type="button" className="link-btn" onClick={resetGroups}>還原為預設五類（Prototype）</button></p>
    </>
  );
}

// ── 維護：單一分類 ──
export function GroupEditPage({ node }) {
  const group = getGroup(node.groupId);
  const [name, setName] = useState(group?.name || '');
  const [sel, setSel] = useState(() => new Set(group?.tables || []));
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('全部');
  const [show, setShow] = useState('全部');
  const [confirmDel, setConfirmDel] = useState(false);
  const [saved, setSaved] = useState('');
  useEffect(() => { setName(group?.name || ''); setSel(new Set(group?.tables || [])); setConfirmDel(false); setSaved(''); }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const others = useMemo(() => getGroups().filter((g) => g.id !== node.groupId), [node.groupId, saved]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!group) return <p className="muted">找不到這個分類。</p>;

  const dirty = name.trim() !== group.name || sel.size !== group.tables.length || group.tables.some((t) => !sel.has(t));
  const k = q.trim();
  const rows = BUDGET_TABLES.filter((t) => (kind === '全部' || t.kind === kind)
    && (show === '全部' || (show === '已選' ? sel.has(t.id) : !sel.has(t.id)))
    && (!k || `${t.id} ${t.name}`.includes(k)));
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShown = rows.length > 0 && rows.every((t) => sel.has(t.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); rows.forEach((t) => (allShown ? n.delete(t.id) : n.add(t.id))); return n; });

  const save = () => {
    const nm = name.trim() || group.name;
    // 依表代碼順序存放
    const tables = BUDGET_TABLES.map((t) => t.id).filter((id) => sel.has(id));
    saveGroups(getGroups().map((g) => (g.id === group.id ? { ...g, name: nm, tables } : g)));
    setName(nm);
    setSaved(new Date().toTimeString().slice(0, 5));
    toast({ kind: 'success', title: '已儲存分類', subtitle: `${nm}（${tables.length} 張表）` });
  };
  const remove = () => {
    saveGroups(getGroups().filter((g) => g.id !== group.id));
    navigate('budget-plan');
  };
  const selCount = { 收入: 0, 費用: 0 };
  sel.forEach((id) => { const t = tableById(id); if (t) selCount[t.kind] += 1; });

  return (
    <>
      <PageTitle node={node} desc="設定分類名稱與分類中的預算表。同一張表可以同時放在多個分類；儲存後首頁快速功能與選單會跟著更新。">
        <button type="button" className="btn-secondary bg-btn" disabled={!dirty} onClick={() => { setName(group.name); setSel(new Set(group.tables)); }}>取消變更</button>
        <button type="button" className="btn-primary bg-btn" disabled={!dirty} onClick={save}>儲存 <Icon name="check" size={16} /></button>
      </PageTitle>

      <div className="card bg-namecard">
        <label className="field bg-name">
          <span>分類名稱</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </label>
        <div className="bg-namehint">
          <div>首頁快速功能顯示：<b>{shortName(name.trim() || group.name)}</b></div>
          <div className="muted">名稱結尾的「預算編列」「預算空表編列」在首頁會省略。</div>
        </div>
        <div className="bg-sum">
          <div><b>{sel.size}</b><span>已選表數</span></div>
          <div><b>{selCount.收入}</b><span>收入</span></div>
          <div><b>{selCount.費用}</b><span>費用</span></div>
        </div>
        <div className="bg-status">
          {dirty ? <span className="bg-dirty">尚未儲存</span> : saved ? <span className="bg-ok">已於 {saved} 儲存</span> : null}
        </div>
        <div className="bg-danger">
          {confirmDel ? (
            <>
              <span>刪除後，首頁快速功能不再顯示這個分類（表本身不會刪除）。確定刪除？</span>
              <button type="button" className="btn-danger" onClick={remove}>確定刪除</button>
              <button type="button" className="link-btn" onClick={() => setConfirmDel(false)}>取消</button>
            </>
          ) : (
            <button type="button" className="link-btn bg-del" onClick={() => setConfirmDel(true)}>刪除這個分類</button>
          )}
        </div>
      </div>

      <div className="table-card">
        <TableToolbar value={q} onChange={setQ} placeholder="搜尋表代碼或名稱">
          <div className="bg-filters">
            <div className="bg-seg" role="group" aria-label="類別">
              {['全部', '收入', '費用'].map((x) => <button key={x} type="button" className={kind === x ? 'on' : ''} onClick={() => setKind(x)}>{x}</button>)}
            </div>
            <div className="bg-seg" role="group" aria-label="顯示">
              {['全部', '已選', '未選'].map((x) => <button key={x} type="button" className={show === x ? 'on' : ''} onClick={() => setShow(x)}>{x}</button>)}
            </div>
          </div>
        </TableToolbar>
        <div className="table-scroll bg-scroll">
          <table className="data-table bg-table">
            <thead>
              <tr>
                <th className="bg-chk"><input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="全選目前清單" /></th>
                <th>代碼</th><th>預算表</th><th>類別</th><th>同時在這些分類</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const also = others.filter((g) => g.tables.includes(t.id));
                return (
                  <tr key={t.id} className={sel.has(t.id) ? 'bg-on' : ''} onClick={() => toggle(t.id)}>
                    <td className="bg-chk"><input type="checkbox" checked={sel.has(t.id)} onChange={() => toggle(t.id)} onClick={(e) => e.stopPropagation()} aria-label={`選取 ${t.name}`} /></td>
                    <td><code>{t.id}</code></td>
                    <td className="strong">{t.name}</td>
                    <td>{kindPill(t.kind)}</td>
                    <td>{also.length ? also.map((g) => <span key={g.id} className="bg-also">{shortName(g.name)}</span>) : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={5} className="muted bg-empty">沒有符合的表</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

    </>
  );
}

// ── 填表：各室從首頁快速功能進入 ──
const DEADLINE = '2026/11/20 17:00';
function hash(s) { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function fillStatus(tableId, who) {
  const h = hash(`${tableId}|${who}`);
  const r = h % 6;
  const day = 3 + (h % 10);
  const date = `11/${String(day).padStart(2, '0')} ${String(8 + (h % 9)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`;
  if (r <= 2) return { s: '已填寫', date };
  if (r === 3) return { s: '填寫中', date };
  return { s: '未填寫', date: '' };
}
const STATUS_CLS = { 已填寫: 'ok', 填寫中: 'doing', 未填寫: 'todo' };

// 11/13 使用者：看得到各室填表內容的只有「室本身」與「所屬段」
//   室：填自己的表；段：檢視所屬各室填了什麼，再以段為單位提交明細表給處
//   處、會計處、總公司：看不到各室所填的預算表，只看明細表（我的待辦）
//   管理者：可檢視任一段、任一室（Prototype 用）
const ALL_SECTIONS = [...new Set(Object.values(SECTIONS_OF).flat())];
const rowsFor = (group, who) => group.tables.map(tableById).filter(Boolean).map((t) => ({ ...t, ...fillStatus(t.id, who) }));
const countOf = (rows, s) => rows.filter((t) => t.s === s).length;

const WB_ICON = { income: 'catIncome', expense: 'catExpense', overseas: 'catOverseas', ict: 'catIct', capex: 'catCapex' };
const WB_COLOR = { income: '#004DA1', expense: '#004DA1', overseas: '#B07A44', ict: '#B07A44', capex: '#B07A44' };

export function GroupFillPage({ node }) {
  const { user } = usePerm();
  const group = getGroup(node.groupId);
  const isAdmin = (user?.roles || []).includes('管理者');
  const level = isAdmin ? '管理者' : orgLevel(user?.dept || '');
  const sections = isAdmin ? ALL_SECTIONS : level === '段' ? [orgUnit(user?.dept || '')] : [];
  const [sec, setSec] = useState(sections[0] || '');
  const rooms = roomsOf(sec);
  const [room, setRoom] = useState('');
  // 11/24 使用者：會計處看各營業處（處）的總額，可切換檢視哪一個處
  const BIZ_DEPTS = Object.keys(SECTIONS_OF).filter((d) => d !== '會計處' && (SECTIONS_OF[d] || []).length);
  const [dept, setDept] = useState(BIZ_DEPTS[0] || '');
  const [q, setQ] = useState('');
  const [st, setSt] = useState('全部');
  const [msg, setMsg] = useState('');
  useEffect(() => { setQ(''); setSt('全部'); setMsg(''); }, [node.id, room, sec]);
  useEffect(() => { setRoom(''); }, [sec]);
  if (!group) return <p className="muted">找不到這個分類。</p>;

  const deadline = <span><Icon name="clock" size={14} /> 填表期限 {DEADLINE}，期限到系統自動鎖定，不需要按提交。</span>;

  // 11/24 使用者：段看各室、營業處（會計處以外的處）看各段時，不拆各室進度，直接看彙整後的總額
  const myDept = orgUnit(user?.dept || '');
  const isAcct = level === '會計處';
  const isBizDept = (level === '處' && myDept !== '會計處') || isAcct;
  const wbOf = () => WORKBOOKS[group.id] || genericWorkbook(group, tableById);
  const tileOf = <span className="wb-tile" style={{ '--tile': WB_COLOR[group.id] || '#004DA1' }}><Icon name={WB_ICON[group.id] || 'form'} size={20} /></span>;
  if (level === '段' || isAdmin || isBizDept) {
    const bizScope = isAcct ? dept : myDept;
    const secs = isBizDept ? (SECTIONS_OF[bizScope] || []) : [sec];
    const srcs = secs.flatMap((sc) => roomsOf(sc).map((r) => `${sc} ${r}`));
    const scope = isBizDept ? bizScope : sec;
    const scopeUnit = unitByName(scope);
    return (
      <BudgetWorkbook
        key={`${group.id}|agg|${scope}`}
        title={group.name}
        workbook={wbOf()}
        who={`${scope}（彙整）`}
        sources={srcs}
        unit={{
          code: scopeUnit?.code || '', name: scopeUnit?.name || scope, pick: scope,
          // 11/24 使用者：會計處切換營業處、管理者切換段，改在表內「預算單位名稱」下拉
          options: isAcct ? BIZ_DEPTS : isAdmin ? ALL_SECTIONS : null,
          onPick: (n) => (isAcct ? setDept(n) : setSec(n)),
        }}
        keepView
        readOnly
        deadline={`填表期限 ${DEADLINE}，期限到自動鎖定，不需要提交`}
        iconTile={tileOf}
        // 11/24 使用者：「彙整檢視：○○ 所屬…的總額（唯讀）」提醒移除（工具列仍顯示唯讀）
      />
    );
  }

  // 總公司：看不到各室所填的預算表（11/24 起會計處改為看各營業處總額）
  if (level !== '室') {
    return (
      <>
        <PageTitle node={node} desc={<span className="bf-desc">{deadline}</span>} />
        <div className="bf-msg bf-block"><Icon name="lock" size={16} />
          <span>各室填寫的預算表只有該室、所屬段與所屬處看得到。{level}請在「我的待辦」查看{level === '會計處' ? '各處' : '上一層'}提交的明細表。</span>
          <a className="link-btn" {...nodeLinkProps(getNode('review-plan'))}>前往我的待辦</a>
        </div>
      </>
    );
  }

  const who = level === '室' ? (user?.dept || '') : `${sec} ${room}`;
  const viewOnly = level !== '室';

  // 11/18 第三層：直接進入填表工作簿（室可編輯；段、管理者檢視某一室為唯讀）
  const secUnit = level === '室'
    ? (() => { const me = unitByCode(user?.unitCode); return me?.parent ? unitByCode(me.parent) : null; })()
    : unitByName(sec);
  const wb = WORKBOOKS[group.id] || genericWorkbook(group, tableById);
  return (
    <BudgetWorkbook
      key={`${group.id}|${who}`}
      title={group.name}
      workbook={wb}
      who={who}
      unit={{ code: secUnit?.code || '', name: secUnit?.name || sec }}
      readOnly={viewOnly}
      deadline={`填表期限 ${DEADLINE}，期限到自動鎖定，不需要提交`}
      iconTile={<span className="wb-tile" style={{ '--tile': WB_COLOR[group.id] || '#004DA1' }}><Icon name={WB_ICON[group.id] || 'form'} size={20} /></span>}
      banner={viewOnly ? (
        <div className="wb-banner">
          <Icon name="lock" size={16} />
          <span>唯讀檢視：<b>{who}</b> 填寫的內容</span>
          <button type="button" className="link-btn" onClick={() => setRoom('')}>← 回到各室進度</button>
        </div>
      ) : null}
    />
  );
  // 以下為 11/13 的表清單版面（保留供參考，目前不使用）
  // eslint-disable-next-line no-unreachable
  const all = rowsFor(group, who);
  const k = q.trim();
  const rows = all.filter((t) => (st === '全部' || t.s === st) && (!k || `${t.id} ${t.name}`.includes(k)));
  const open = (t) => {
    setMsg(`「${t.id} ${t.name}」：正式環境會開啟這張表的${viewOnly ? '內容（唯讀）' : '填表畫面'}。`);
    toast({ kind: 'info', title: viewOnly ? '檢視預算表' : '開啟填表畫面', subtitle: `${t.id} ${t.name}（Prototype 示意）` });
  };

  return (
    <>
      <PageTitle node={node} desc={(
        <span className="bf-desc">{deadline}
          <span>{viewOnly ? '檢視' : '填表'}單位：{who || '—'}</span>
        </span>
      )} />
      {viewOnly && <p className="bf-back"><button type="button" className="link-btn" onClick={() => setRoom('')}>← 回到各室進度</button></p>}
      <div className="bf-stats">
        {['全部', '已填寫', '填寫中', '未填寫'].map((x) => (
          <button key={x} type="button" className={`bf-stat ${STATUS_CLS[x] || 'all'} ${st === x ? 'on' : ''}`} onClick={() => setSt(st === x && x !== '全部' ? '全部' : x)}>
            <b>{x === '全部' ? all.length : countOf(all, x)}</b><span>{x}</span>
          </button>
        ))}
      </div>
      {msg && <div className="bf-msg"><Icon name="alert" size={16} /> {msg}<button type="button" className="link-btn" onClick={() => setMsg('')}>關閉</button></div>}
      <div className="table-card">
        <TableToolbar value={q} onChange={setQ} placeholder="搜尋表代碼或名稱" />
        <div className="table-scroll">
          <table className="data-table bg-table">
            <thead><tr><th>代碼</th><th>預算表</th><th>類別</th><th>狀態</th><th>最後編輯</th><th /></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><code>{t.id}</code></td>
                  <td className="strong">{t.name}</td>
                  <td>{kindPill(t.kind)}</td>
                  <td><span className={`bf-st ${STATUS_CLS[t.s]}`}>{t.s}</span></td>
                  <td>{t.date || <span className="muted">—</span>}</td>
                  <td className="bf-act"><button type="button" className="link-btn" onClick={() => open(t)}>{viewOnly ? '檢視' : t.s === '已填寫' ? '檢視／修改' : '填寫'} <Icon name="arrowRight" size={14} /></button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="muted bg-empty">{all.length ? '沒有符合的表' : '這個分類尚未加入任何表'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
