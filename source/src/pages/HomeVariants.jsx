import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import CarbonDate from '../components/CarbonDate.jsx';
import TaskPanel, { statusesFor } from '../components/TaskPanel.jsx';
import { TABS, getNode } from '../config/navigation.js';
import ReviewStatus, { STATUS_HINT } from '../components/ReviewStatus.jsx';
import { dataService } from '../services/dataService.js';
import { nodeLinkProps } from '../nodeActions.js';
import { Can, usePerm } from '../permissions.jsx';
import { usePrefs, timeAgo } from '../prefs.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { HOME_LIMITS } from './Pages.jsx';
import { groupLabel, groupOfUnit } from '../config/org.js';
import { membersText } from '../services/authService.js';

// ─────────────────────────────────────────────────────────────
// 預算系統首頁三版比較（內部參考）：#home＝版1、#home-v2＝版2、#home-v3＝版3（原版4）
// 各版都可用右上「背景」切換深色／淺色（原版3 的深藍底色改為切換方式，11/12）
// 選定後保留選定的版本，並移除 HomeVersionSwitcher
// ─────────────────────────────────────────────────────────────
// 11/12 傍晚再調整順序與名稱（使用者指定）；網址跟著版號：#home＝版1 … #home-v6＝版6
export const HOME_VERSIONS = [
  // 11/13 使用者：刪除原版1（簡約待辦）、版2（基礎頁）、版4（卡片式），保留原版3、5、6 並重新排序
  { id: 'home', label: '版1', title: '編列/待辦' },
  { id: 'home-v2', label: '版2', title: '待辦卡片' },
  { id: 'home-v3', label: '版3', title: '三欄總覽' },
];

// 首頁背景：'light' | 'dark'，存在瀏覽器；各元件以自訂事件同步
const THEME_KEY = 'aa.homeTheme';
export function useHomeTheme() {
  const read = () => { try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const on = () => setTheme(read());
    window.addEventListener('aa:homeTheme', on);
    return () => window.removeEventListener('aa:homeTheme', on);
  }, []);
  const set = (t) => { try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ } window.dispatchEvent(new Event('aa:homeTheme')); };
  return [theme, set];
}

export function HomeThemeToggle() {
  const [theme, setTheme] = useHomeTheme();
  return (
    <div className="theme-toggle" role="group" aria-label="首頁背景">
      <button className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>清新</button>
      <button className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>穩重</button>
    </div>
  );
}

export function HomeVersionSwitcher({ current }) {
  return (
    <nav className="pv-switch" aria-label="首頁版本比較">
      <span className="pv-switch-title">首頁版本比較</span>
      {HOME_VERSIONS.map((v) => (
        <a key={v.id} href={`#${v.id}`} className={current === v.id ? 'on' : ''} aria-current={current === v.id ? 'page' : undefined}>
          <b>{v.label}</b> {v.title}
        </a>
      ))}
    </nav>
  );
}

const QUICK_ICON = { 'tab-budget': 'form', 'tab-review': 'pending', 'tab-report': 'chart', 'tab-personal': 'user' };
const STAT_ICON = { 全部: 'task', 我待審: 'pending', 已完成: 'check', 已送審: 'submitted' };

function useQuick() {
  const { visible } = usePerm();
  return TABS.map((t) => {
    const links = t.columns.flatMap((c) => c.links).filter((id) => visible(getNode(id)));
    const target = visible(getNode(t.target)) ? t.target : links[0];
    return target ? { ...t, links, target } : null;
  }).filter(Boolean);
}

// ═════════════════════════════════════════════════════════════
// 版2（11/10）：最上方以卡片呈現各狀態待辦數量（儀表板式，只呈現統計數字）
// 點卡片篩選下方待辦清單；其他模塊重新排列，盡量一頁看完不捲動
// ═════════════════════════════════════════════════════════════
export function HomeV2({ user }) {
  const { visible } = usePerm();
  const [tasks, setTasks] = useState(null);
  const [filter, setFilter] = useState('全部');
  useEffect(() => {
    dataService.getMyTasks(user).then(setTasks).catch(() => setTasks([]));
  }, [user]);
  const list = tasks?.filter((t) => visible(getNode(t.route)));
  const count = (k) => (list || []).filter((t) => k === '全部' || t.status === k).length;
  const today = new Date();
  const dateStr = `${today.getFullYear() - 1911} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日（${'日一二三四五六'[today.getDay()]}）`;
  const cards = [{ key: '全部', cls: 'all' }, ...statusesFor(list)];

  return (
    <div className="home-v2">
      <div className="hv2-head">
        <div>
          <h1>{user.name}，您好</h1>
          <p>{dateStr}・{[user.dept, (user.roles || []).join('、')].filter(Boolean).join('・')}</p>
        </div>
        {/* 「前往 01.預算概算編列」按鈕已移除（11/10 使用者指定，三版皆同） */}
      </div>

      <Can feature="home-tasks">
        <section className="hv2-stats" aria-label="我的待辦統計">
          {cards.map((c) => {
            const n = count(c.key);
            const on = filter === c.key;
            return (
              <button key={c.key} className={`hv2-stat s-${c.cls} ${on ? 'on' : ''} ${n ? '' : 'zero'}`}
                onClick={() => setFilter(on && c.key !== '全部' ? '全部' : c.key)} aria-pressed={on} disabled={!n && c.key !== '全部'}>
                <span className="hv2-stat-label">{c.key}</span>
                <span className="hv2-stat-num">{list ? n : '–'}</span>
                <Icon name={STAT_ICON[c.key]} size={20} className="hv2-stat-ico" />
              </button>
            );
          })}
        </section>
      </Can>

      <div className="hv2-grid">
        <Can feature="home-tasks">
          <TaskPanel tasks={list} max={HOME_LIMITS.tasks} filter={filter} onFilter={setFilter} showStats={false} />
        </Can>

        {/* 11/12 使用者：首頁所有版本移除「最新公告」與「快速功能」 */}
        <FavRecentTabs />
      </div>
    </div>
  );
}

// 快速功能：橫排 4 格（版2、版4 共用）
function QuickFunctions() {
  const quick = useQuick();
  return (
    <section className="card hv2-quick" aria-label="快速功能">
      <header className="card-head"><h2><Icon name="grid" size={18} /> 快速功能</h2></header>
      <div className="hv2-quick-grid">
        {quick.map((t) => (
          <div key={t.id} className="hv2-q">
            <a className="hv2-q-main" {...nodeLinkProps(getNode(t.target))}>
              <span className="sq-ico"><Icon name={QUICK_ICON[t.id] || 'doc'} size={18} /></span>
              <span>{t.label}</span>
            </a>
            <div className="hv2-q-subs">
              {t.links.slice(0, 3).map((id) => <a key={id} {...nodeLinkProps(getNode(id))}>{getNode(id).label}</a>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// 我的最愛／最近打開：合併為一張卡片，以頁籤切換
function FavRecentTabs() {
  const { can, visible } = usePerm();
  const { favorites, recent } = usePrefs();
  const [tab, setTab] = useState(can('favorites') ? 'fav' : 'recent');
  const [recentAll, setRecentAll] = useState(false);
  if (!can('favorites') && !can('recent')) return null;
  const allFavs = favorites.filter(visible);
  const allRecents = recent.filter((r) => visible(r.node));
  const recents = recentAll ? allRecents : allRecents.slice(0, HOME_LIMITS.recent);
  const favPage = getNode('my-favorites');
  const recentPage = getNode('my-recent');

  return (
    <section className="card hv2-fr">
      <header className="hv2-fr-tabs" role="tablist">
        {can('favorites') && (
          <button role="tab" aria-selected={tab === 'fav'} className={tab === 'fav' ? 'on' : ''} onClick={() => setTab('fav')}>
            <Icon name="star" size={16} /> 我的最愛 <span className="mc-count">{allFavs.length}</span>
          </button>
        )}
        {can('recent') && (
          <button role="tab" aria-selected={tab === 'recent'} className={tab === 'recent' ? 'on' : ''} onClick={() => setTab('recent')}>
            <Icon name="clock" size={16} /> 最近打開
          </button>
        )}
        {/* 11/13：選單已移除我的最愛／最近打開，這裡是完整清單的唯一入口 */}
        <a className="link-btn hv2-fr-edit" {...nodeLinkProps(tab === 'fav' ? favPage : recentPage)}>查看全部</a>
      </header>

      {tab === 'fav' ? (
        allFavs.length === 0 ? (
          <p className="empty-hint">還沒有最愛的功能。在功能頁標題旁點 <Icon name="star" size={15} className="inline-ico" /> 就會加到這裡。</p>
        ) : (
          <>
            <ul className="list">
              {allFavs.slice(0, HOME_LIMITS.favorites).map((n) => (
                <li key={n.id} className="hv2-fav-row">
                  <a {...nodeLinkProps(n)}>
                    <Icon name={n.launch ? 'launch' : n.children ? 'folder' : n.icon || 'doc'} size={16} className="list-ico" />
                    <span className="list-title">{n.label}</span>
                  </a>
                  <FavoriteButton node={n} compact />
                </li>
              ))}
            </ul>
            {allFavs.length > HOME_LIMITS.favorites && (
              <a className="link-btn task-more" {...nodeLinkProps(favPage)}>顯示全部（{allFavs.length} 筆）</a>
            )}
          </>
        )
      ) : allRecents.length === 0 ? (
        <p className="empty-hint">開啟過的功能會依時間顯示在這裡。</p>
      ) : (
        <>
          <ul className="list">
            {recents.map(({ node: n, at }) => (
              <li key={n.id}>
                <a {...nodeLinkProps(n)}>
                  <Icon name={n.launch ? 'launch' : 'doc'} size={16} className="list-ico" />
                  <span className="list-title">{n.label}</span>
                  <span className="list-date">{timeAgo(at)}</span>
                </a>
              </li>
            ))}
          </ul>
          {allRecents.length > HOME_LIMITS.recent && (
            <a className="link-btn task-more" {...nodeLinkProps(recentPage)}>顯示全部（{allRecents.length} 筆）</a>
          )}
        </>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// 版4（11/12）：上方左右 1:1——左「快速功能」（原「預算編列」區塊）、右「我的待辦」（原「我的審查」區塊）；下方我的最愛／最近打開
// 11/12 使用者：首頁「我的審查」區塊全面更名為「我的待辦」、「預算編列」區塊全面更名為「快速功能」
// 預算編列的類別直接讀選單「各類預算編列」底下的項目（目前 5 類；之後在預算表設定新增類別會自動出現）
// ═════════════════════════════════════════════════════════════
// 11/13 使用者：首頁各版移除「我提交的」進度列（元件保留）
// 我提交的（11/12）：室提交預算編列給段；段、處、會計處提交明細表給上一層（同時也是審核者），這一列呈現「我送出去的進度」
//   提交者角度：尚未提交／審核中・目前所在層級／被退回・待修正／已核准；點「查看」進入「我提交的明細表」清單
function MineBar({ mine, compact = false }) {
  if (!mine) return null;
  const node = getNode('rv-submitted');
  return (
    <div className={`mine-bar st-${mine.status} ${compact ? 'compact' : ''}`} aria-label="我提交的">
      <span className="mine-ico"><Icon name="submitted" size={compact ? 16 : 18} /></span>
      <span className="mine-label">我提交的</span>
      <b className="mine-title">{mine.title}</b>
      {!compact && <span className="mine-amt">收入 {fmtK(mine.income)}・費用 {fmtK(mine.expense)}（千元）</span>}
      <ReviewStatus r={mine} />
      {mine.note && <span className="mine-note">{mine.note}</span>}
      {mine.status === '審核中' && !mine.note && <span className="mine-note">{mine.submitDate.slice(5).replace('-', '/')} 提交</span>}
      {node && <a className="link-btn mine-link" {...nodeLinkProps(node)}>查看</a>}
    </div>
  );
}

// 我的審查（11/12）：審查單位是「明細表」（五大類表彙整，含收入與費用），依登入者層級呈現
//   段＝該段的明細表；處＝所屬各段；會計處＝各處；總公司＝全公司；室＝不需審核
// 狀態（11/12 全面調整）：全部、待審（待我本人審核）、已完成（核准或退回，case close）、已送審（我已提交）
// 11/18 使用者：只剩 我待審、已完成
const REVIEW_STATUS = [
  { key: '我待審', cls: 's-review' },
  { key: '已完成', cls: 's-done' },
];
const REVIEW_ORDER = { 我待審: 1, 已完成: 2 }; // 11/12 順序：全部 > 已送審 > 我待審 > 已完成
const REVIEW_MAX = 5;
const fmtK = (n) => n.toLocaleString('zh-TW');

export function HomeV4({ user }) {
  const { visible } = usePerm();
  const [forms, setForms] = useState(null);
  const [rv, setRv] = useState(null);
  const [rvFilter, setRvFilter] = useState('全部');
  const [rvAll, setRvAll] = useState(false);
  useEffect(() => {
    dataService.getFormStatus().then(setForms).catch(() => setForms({}));
    dataService.getMyReviewItems(user).then(setRv).catch(() => setRv({ items: [] }));
  }, [user]);

  const planNode = getNode('budget-fill'); // 11/13：快速功能＝各室填表（預算編列），不是選單的「各類預算編列」（維護）
  const categories = (planNode?.children || []).filter(visible);
  const items = rv?.items || [];
  const counts = Object.fromEntries(REVIEW_STATUS.map((s) => [s.key, items.filter((r) => r.status === s.key).length]));
  const rvList = items
    .filter((r) => rvFilter === '全部' || r.status === rvFilter)
    .sort((a, b) => REVIEW_ORDER[a.status] - REVIEW_ORDER[b.status] || (b.waitDays || 0) - (a.waitDays || 0));
  const shown = rvAll ? rvList : rvList.slice(0, REVIEW_MAX);
  const reviewer = rv && (['段', '處', '會計處', '總公司', '全系統'].includes(rv.level) || rv.items.length > 0); // 全系統＝管理者；室有自己送出的預算編列時也列出
  const statusOf = (r) => <ReviewStatus r={r} />;

  return (
    <div className="home-v2 home-v4n">
      <div className="hv4-top">
        <section className="card hv4-forms" aria-label="快速功能">
          <header className="card-head with-action">
            <h2><Icon name="grid" size={18} /> 快速功能</h2>
            {planNode && visible(planNode) && <a className="link-btn" {...nodeLinkProps(planNode)}>全部分類</a>}
          </header>
          {!forms ? <p className="muted">載入中…</p> : categories.length === 0 ? <p className="muted">目前沒有可編列的預算類別。</p> : (
            <QuickSList categories={categories} forms={forms} showEditor />
          )}
        </section>

        <section className="card hv4-review" aria-label="我的待辦">
          <header className="card-head with-action">
            <h2><Icon name="task" size={18} /> 我的待辦</h2>
            {/* 11/13：選單已移除「我的待辦」（原我的預算審查），完整清單只從這裡進入 */}
            <a className="link-btn todo-all" {...nodeLinkProps(getNode('review-plan'))}>查看全部</a>
          </header>
          {!rv ? <p className="muted">載入中…</p> : !reviewer ? (
            <>
            <p className="empty-hint hv4-empty">
              {rv.level === '室'
                ? '室級人員只負責填表，沒有送審與審核作業，因此我的待辦不會有項目。'
                : '您的單位目前沒有審查項目。'}
            </p>
            </>
          ) : (
            <>
              <div className="hv4-rv-stats" role="group" aria-label="依審查狀態篩選">
                <button className={`stat-chip all ${rvFilter === '全部' ? 'on' : ''}`} aria-pressed={rvFilter === '全部'} onClick={() => setRvFilter('全部')}>
                  全部 <span className="stat-num">{items.length}</span>
                </button>
                {REVIEW_STATUS.map((s) => (
                  <button key={s.key} className={`stat-chip rv-${s.cls} ${rvFilter === s.key ? 'on' : ''} ${counts[s.key] ? '' : 'zero'}`}
                    aria-pressed={rvFilter === s.key} disabled={!counts[s.key]} title={STATUS_HINT[s.key]} onClick={() => setRvFilter(rvFilter === s.key ? '全部' : s.key)}>
                    {s.key} <span className="stat-num">{counts[s.key]}</span>
                  </button>
                ))}
              </div>
              {/* 11/16 Carbon Structured list */}
              <table className="cds-slist hv4-slist">
                <thead><tr><th>名稱</th><th className="num">收入（千元）</th><th>提交</th><th>狀態</th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="cds-sl-name"><a className="rd-link" href={`#rd:${encodeURIComponent(r.id)}`}>{r.title}</a></td>
                      <td className="num">{fmtK(r.income)}</td>
                      <td>{r.submitDate ? r.submitDate.slice(5).replace('-', '/') : '—'}</td>
                      <td>{statusOf(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rvList.length > REVIEW_MAX && (
                <button className="link-btn task-more" onClick={() => setRvAll((v) => !v)}>
                  {rvAll ? '收合' : `顯示全部（${rvList.length} 筆）`}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {/* 11/12：快速功能移除，只留我的最愛／最近打開（滿版寬） */}
      <div className="hv2-grid single">
        <FavRecentTabs />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 版5（11/12）：三欄 1:1:1；三欄高度固定、上下切齊（預算編列預留 10 張卡片的篇幅，超過時區塊內捲動）
//   左：預算編列（卡片式；類別讀選單「各類預算編列」，之後新增類別會自動多一張卡片）
//   中：我的待辦（狀態卡 全部／待審／已完成／已送審；可搜尋關鍵字、篩選提交日期）
//   右：快速功能＋我的最愛／最近打開（頁籤切換）
// 狀態（11/12 全面調整）：全部、我待審、已完成、已送審
// ═════════════════════════════════════════════════════════════
// 11/13：快速功能的節點是 bf-分類，圖示、顏色、最後編輯沿用 bp-分類 的設定
const catKey = (n) => n.id.replace(/^bf-/, 'bp-');
const CAT_ICON = { 'bp-overseas': 'catOverseas', 'bp-ict': 'catIct', 'bp-expense': 'catExpense', 'bp-income': 'catIncome', 'bp-capex': 'catCapex' };
// 11/12 使用者：一般收入、一般費用同一色（臺鐵藍）；出國計畫、資通訊、資本支出另一色（臺鐵金）
const CAT_COLOR = { 'bp-income': '#004DA1', 'bp-expense': '#004DA1', 'bp-overseas': '#B07A44', 'bp-ict': '#B07A44', 'bp-capex': '#B07A44' };

// 11/16 C 版：快速功能改用 Carbon Structured list（使用者：直接套用 13 看看）
//   欄位：名稱｜最後編輯（｜編輯者）；整列可點，進入該分類的填表頁
//   11/17 使用者：版3 三欄總覽的「名稱」欄改為「預算編列類別」
function QuickSList({ categories, forms, showEditor = false, short = false, nameLabel = '名稱' }) {
  return (
    <table className="cds-slist cds-quick">
      <thead><tr><th>{nameLabel}</th><th>最後編輯</th>{showEditor && <th>編輯者</th>}</tr></thead>
      <tbody>
        {categories.map((n) => {
          const f = forms[catKey(n)] || {};
          return (
            <tr key={n.id} style={{ '--c': CAT_COLOR[catKey(n)] || '#00529c' }}>
              <td className="cds-sl-name">
                <a className="cds-row-link" {...nodeLinkProps(n)}>
                  <Icon name={CAT_ICON[catKey(n)] || n.icon || 'form'} size={16} className="cds-q-ico" />
                  {short ? n.label.replace(/預算(空表)?編列$/, '') : n.label}
                </a>
              </td>
              <td>{f.lastEdited ? (short ? f.lastEdited.slice(5, 10).replace('-', '/') : f.lastEdited.slice(0, 16).replace(/-/g, '/')) : <span className="muted">尚未編輯</span>}</td>
              {showEditor && <td>{f.editor || '—'}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const V5_MAX = 6;

function QuickList() {
  const quick = useQuick();
  return (
    <section className="card side-quick hv5-quick" aria-label="快速功能">
      <header className="card-head"><h2><Icon name="grid" size={18} /> 快速功能</h2></header>
      <ul className="sq-list">
        {quick.map((t) => (
          <li key={t.id}>
            <a className="sq-main" {...nodeLinkProps(getNode(t.target))}>
              <span className="sq-ico"><Icon name={QUICK_ICON[t.id] || 'doc'} size={18} /></span>
              <span className="sq-title">{t.label}</span>
              <Icon name="chevronRight" size={16} className="sq-arrow" />
            </a>
            <div className="sq-subs">
              {t.links.slice(0, 3).map((id) => <a key={id} {...nodeLinkProps(getNode(id))}>{getNode(id).label}</a>)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FavoritesCard() {
  const { can, visible } = usePerm();
  const { favorites } = usePrefs();
  if (!can('favorites')) return null;
  const all = favorites.filter(visible);
  const favPage = getNode('my-favorites');
  return (
    <section className="card hv5-fav" aria-label="我的最愛">
      <header className="card-head with-action">
        <h2><Icon name="star" size={18} filled className="star-gold" /> 我的最愛</h2>
        {all.length > 0 && <a className="link-btn" {...nodeLinkProps(favPage)}>編輯</a>}
      </header>
      {all.length === 0 ? (
        <p className="empty-hint">還沒有最愛的功能。在功能頁標題旁點 <Icon name="star" size={15} className="inline-ico" /> 就會加到這裡。</p>
      ) : (
        <>
          <ul className="list">
            {all.slice(0, HOME_LIMITS.favorites).map((n) => (
              <li key={n.id} className="hv2-fav-row">
                <a {...nodeLinkProps(n)}>
                  <Icon name={n.launch ? 'launch' : n.children ? 'folder' : n.icon || 'doc'} size={16} className="list-ico" />
                  <span className="list-title">{n.label}</span>
                </a>
                <FavoriteButton node={n} compact />
              </li>
            ))}
          </ul>
          {all.length > HOME_LIMITS.favorites && (
            <a className="link-btn task-more" {...nodeLinkProps(favPage)}>顯示全部（{all.length} 筆）</a>
          )}
        </>
      )}
    </section>
  );
}

export function HomeV5({ user }) {
  const { visible } = usePerm();
  const [forms, setForms] = useState(null);
  const [rv, setRv] = useState(null);
  const [group, setGroup] = useState('全部');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [all, setAll] = useState(false);
  useEffect(() => {
    dataService.getFormStatus().then(setForms).catch(() => setForms({}));
    dataService.getMyReviewItems(user).then(setRv).catch(() => setRv({ items: [] }));
  }, [user]);

  const planNode = getNode('budget-fill'); // 11/13：快速功能＝各室填表（預算編列），不是選單的「各類預算編列」（維護）
  const categories = (planNode?.children || []).filter(visible);
  const items = rv?.items || [];
  const groupOf = (r) => r.status;
  const counts = { 全部: items.length, 我待審: items.filter((r) => r.status === '我待審').length, 已完成: items.filter((r) => r.status === '已完成').length };
  const dateOn = from || to;
  const list = items
    .filter((r) => group === '全部' || groupOf(r) === group)
    .filter((r) => !q.trim() || (r.title + r.unit).includes(q.trim()))
    .filter((r) => !dateOn || (r.submitDate && (!from || r.submitDate >= from) && (!to || r.submitDate <= to)))
    .sort((a, b) => REVIEW_ORDER[a.status] - REVIEW_ORDER[b.status] || (b.waitDays || 0) - (a.waitDays || 0));
  const shown = all ? list : list.slice(0, V5_MAX);
  const reviewer = rv && (['段', '處', '會計處', '總公司', '全系統'].includes(rv.level) || rv.items.length > 0); // 全系統＝管理者；室有自己送出的預算編列時也列出
  const filtered = q.trim() || dateOn;
  const badge = (r) => {
    const g = groupOf(r);
    return <ReviewStatus r={r} />;
  };

  return (
    <div className="home-v5">
      <section className="card hv5-forms" aria-label="快速功能">
        <header className="card-head with-action">
          <h2><Icon name="grid" size={18} /> 快速功能</h2>
          {planNode && visible(planNode) && <a className="link-btn" {...nodeLinkProps(planNode)}>全部分類</a>}
        </header>
        {!forms ? <p className="muted">載入中…</p> : (
          <div className="hv5-scroll hv5-slist-wrap"><QuickSList categories={categories} forms={forms} short nameLabel="預算編列類別" /></div>
        )}
      </section>

      <section className="card hv5-review" aria-label="我的待辦">
        <header className="card-head with-action">
          <h2><Icon name="task" size={18} /> 我的待辦</h2>
          <a className="link-btn todo-all" {...nodeLinkProps(getNode('review-plan'))}>查看全部</a>
        </header>
        {!rv ? <p className="muted">載入中…</p> : !reviewer ? (
          <>
          <p className="empty-hint hv4-empty">
            {rv.level === '室' ? '室級人員只負責填表，沒有送審與審核作業，因此我的待辦不會有項目。' : '您的單位目前沒有審查項目。'}
          </p>
          </>
        ) : (
          <>
            <div className="hv5-stats" role="group" aria-label="審查狀態">
              {['全部', '我待審', '已完成'].map((k) => (
                <button key={k} className={`hv5-stat k-${k} ${group === k ? 'on' : ''}`} aria-pressed={group === k} title={STATUS_HINT[k]} onClick={() => setGroup(k)}>
                  <b>{counts[k]}</b><span>{k}</span>
                </button>
              ))}
            </div>
            <div className="hv5-filters">
              <label className="hv5-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋單位或名稱" aria-label="搜尋關鍵字" />
              </label>
              <div className="hv5-dates cds-dates">
                <CarbonDate label="提交日期起" value={from} max={to || undefined} onChange={setFrom} />
                <CarbonDate label="提交日期迄" value={to} min={from || undefined} onChange={setTo} />
                {filtered && <button className="link-btn" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>清除</button>}
              </div>
            </div>
            {list.length === 0 ? <p className="muted hv5-none">沒有符合條件的資料。</p> : (
              <div className="hv5-scroll hv5-slist-wrap">
                <table className="cds-slist hv5-slist">
                  <thead><tr><th>名稱</th><th>提交</th><th>狀態</th></tr></thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id}>
                        <td className="cds-sl-name"><a className="rd-link" href={`#rd:${encodeURIComponent(r.id)}`}>{r.title}</a></td>
                        <td>{r.submitDate ? r.submitDate.slice(5).replace('-', '/') : '—'}</td>
                        <td>{badge(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {list.length > V5_MAX && (
              <button className="link-btn task-more" onClick={() => setAll((v) => !v)}>{all ? '收合' : `顯示全部（${list.length} 筆）`}</button>
            )}
          </>
        )}
      </section>

      {/* 11/12：快速功能移除，右欄只留我的最愛／最近打開 */}
      <div className="hv5-side">
        <FavRecentTabs />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 版6（11/12，以版5 微調）：
//   最上方：我提交的明細表進度列（提交者角度：尚未提交／審核中・層級／被退回・待修正／已核准）
//           4 張狀態卡平均排列（全部／待審／已完成／已送審），點選篩選下方清單
//   中間：我的審查（滿版寬，表格式；關鍵字搜尋、提交日期篩選）
//   底部 1:1:1：預算編列（卡片）｜快速功能｜我的最愛／最近打開
// ═════════════════════════════════════════════════════════════
// 11/12 狀態全面調整：全部、我待審、已完成、已送審
const V6_STATS = [
  { key: '全部', cls: 'all', icon: 'task' },
  { key: '我待審', cls: 'review', icon: 'pending' },
  { key: '已完成', cls: 'done', icon: 'check' },
];
const V6_ORDER = { 我待審: 1, 已完成: 2 }; // 11/12 順序：全部 > 已送審 > 我待審 > 已完成
const V6_MAX = 5;

export function HomeV6({ user }) {
  const { visible } = usePerm();
  const [layer, setLayer] = useState('全部階層');
  const [forms, setForms] = useState(null);
  const [rv, setRv] = useState(null);
  const [st, setSt] = useState('全部');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [all, setAll] = useState(false);
  useEffect(() => {
    dataService.getFormStatus().then(setForms).catch(() => setForms({}));
    dataService.getMyReviewItems(user).then(setRv).catch(() => setRv({ items: [] }));
  }, [user]);

  const planNode = getNode('budget-fill'); // 11/13：快速功能＝各室填表（預算編列），不是選單的「各類預算編列」（維護）
  const categories = (planNode?.children || []).filter(visible);
  const items = rv?.items || [];
  const reviewer = rv && (['段', '處', '會計處', '總公司', '全系統'].includes(rv.level) || rv.items.length > 0); // 全系統＝管理者；室有自己送出的預算編列時也列出
  const count = (k) => (k === '全部' ? items.length : items.filter((r) => r.status === k).length);
  const dateOn = from || to;
  const list = items
    .filter((r) => st === '全部' || r.status === st)
    .filter((r) => layer === '全部階層' || r.layer === layer)
    .filter((r) => !q.trim() || (r.title + r.unit + (r.reviewUnit || '')).includes(q.trim()))
    .filter((r) => !dateOn || (r.submitDate && (!from || r.submitDate >= from) && (!to || r.submitDate <= to)))
    .sort((a, b) => V6_ORDER[a.status] - V6_ORDER[b.status] || (b.waitDays || 0) - (a.waitDays || 0));
  const shown = all ? list : list.slice(0, V6_MAX);
  const badge = (r) => <ReviewStatus r={r} />;

  return (
    <div className="home-v6">
      <section className="hv6-stats" aria-label="我的待辦統計">
        {V6_STATS.map((c) => {
          const n = reviewer ? count(c.key) : 0;
          const on = st === c.key;
          return (
            <button key={c.key} className={`hv6-stat c-${c.cls} ${on ? 'on' : ''} ${n ? '' : 'zero'}`} aria-pressed={on} title={STATUS_HINT[c.key]}
              disabled={!reviewer || (!n && c.key !== '全部')} onClick={() => { setSt(on && c.key !== '全部' ? '全部' : c.key); setAll(false); }}>
              <span className="hv6-stat-label">{c.key}</span>
              <span className="hv6-stat-num">{rv ? n : '–'}</span>
              <Icon name={c.icon} size={20} className="hv6-stat-ico" />
            </button>
          );
        })}
      </section>

      <section className="card hv6-review" aria-label="我的待辦">
        <header className="hv6-review-head">
          <h2><Icon name="task" size={18} /> 我的待辦</h2>
          <a className="link-btn todo-all" {...nodeLinkProps(getNode('review-plan'))}>查看全部</a>
          {reviewer && (
            <div className="hv6-filters">
              {rv.admin && (
                <select className="hv6-layer-select" value={layer} onChange={(e) => { setLayer(e.target.value); setAll(false); }} aria-label="提交階層">
                  {['全部階層', '室 → 段', '段 → 處', '處 → 會計處', '會計處 → 總公司'].map((x) => <option key={x}>{x}</option>)}
                </select>
              )}
              <label className="hv5-search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋單位或名稱" aria-label="搜尋關鍵字" />
              </label>
              <div className="hv5-dates cds-dates">
                <CarbonDate label="提交日期起" placeholder="提交日期起" hideLabel value={from} max={to || undefined} onChange={setFrom} />
                <CarbonDate label="提交日期迄" placeholder="提交日期迄" hideLabel value={to} min={from || undefined} onChange={setTo} />
                {(q.trim() || dateOn) && <button className="link-btn" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>清除</button>}
              </div>
            </div>
          )}
        </header>
        {!rv ? <p className="muted">載入中…</p> : !reviewer ? (
          <p className="empty-hint hv4-empty">{rv.level === '室' ? '室級人員只負責填表，沒有送審與審核作業，因此我的待辦不會有項目。' : '您的單位目前沒有審查項目。'}</p>
        ) : list.length === 0 ? <p className="muted hv5-none">沒有符合條件的資料。</p> : (
          <div className="hv6-table-wrap hv5-scroll">
            <table className="data-table hv6-table">
              <thead>
                <tr><th>名稱</th>{rv.admin && <><th>階層</th><th>審核單位</th></>}<th className="num">收入（千元）</th><th className="num">費用（千元）</th><th>提交日期</th><th>批准群組</th><th>狀態</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><b><a className="rd-link" href={`#rd:${encodeURIComponent(r.id)}`}>{r.title}</a></b>{r.note && <small className="hv6-note">{r.note}</small>}</td>
                    {rv.admin && <><td className="hv6-layer">{r.layer}</td><td>{r.reviewUnit}</td></>}
                    <td className="num">{fmtK(r.income)}</td>
                    <td className="num">{fmtK(r.expense)}</td>
                    <td>{r.submitDate ? r.submitDate.replace(/-/g, '/') : '—'}</td>
                    {/* 11/18 使用者：版2 待辦加上批准人（之後改依 Plan 設定） */}
                    <td className="hv6-approver">{r.approverUnit ? (groupOfUnit(r.approverUnit) ? <><b>{groupLabel(groupOfUnit(r.approverUnit))}</b><small>{membersText(groupOfUnit(r.approverUnit))}</small></> : <b>{r.approverUnit}</b>) : '—'}</td>
                    <td>{badge(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reviewer && list.length > V6_MAX && (
          <button className="link-btn task-more" onClick={() => setAll((v) => !v)}>{all ? '收合' : `顯示全部（${list.length} 筆）`}</button>
        )}
      </section>

      <div className="hv6-bottom">
        <section className="card hv5-forms hv6-forms" aria-label="快速功能">
          <header className="card-head with-action"><h2><Icon name="grid" size={18} /> 快速功能</h2>{planNode && visible(planNode) && <a className="link-btn" {...nodeLinkProps(planNode)}>全部分類</a>}</header>
          {!forms ? <p className="muted">載入中…</p> : (
            <div className="hv5-scroll hv5-slist-wrap"><QuickSList categories={categories} forms={forms} short /></div>
          )}
        </section>
        {/* 11/12：快速功能移除，底部改為兩欄 */}
        <FavRecentTabs />
      </div>
    </div>
  );
}
