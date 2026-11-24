import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TABS, getNode } from '../config/navigation.js';
import { APP_CONFIG, systemUrl } from '../config/appConfig.js';
import { dataService } from '../services/dataService.js';
import { navigate } from '../useHashRoute.js';
import { nodeLinkProps, requestLaunch } from '../nodeActions.js';
import { Can, usePerm } from '../permissions.jsx';
import TaskPanel from '../components/TaskPanel.jsx';
import FavoriteButton, { PageTitle } from '../components/FavoriteButton.jsx';
import { usePrefs, timeAgo } from '../prefs.jsx';
import { InlineNotification } from '../components/Notification.jsx';
import TableToolbar from '../components/TableToolbar.jsx';

const go = (id) => ({ href: `#${id}`, onClick: (e) => { e.preventDefault(); navigate(id); } });

// 首頁各區塊最多顯示筆數（11/10 使用者指定）
export const HOME_LIMITS = { tasks: 6, favorites: 3, recent: 5, news: 4 };

// variant 'v4'（11/10）：移除最新公告、我的最愛、最近打開（公告移到 Portal 版4）
export function HomePage({ user, variant }) {
  const lite = variant === 'v4';
  const { visible } = usePerm();
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    dataService.getMyTasks(user).then(setTasks).catch(() => setTasks([]));
  }, [user]);

  const visibleTasks = tasks?.filter((t) => visible(getNode(t.route)));


  return (
    <div className={`home-v1 no-side ${lite ? 'home-v4' : ''}`}>
      <div className="home-main">
      {/* 「歡迎回來」問候區已移除（11/10 使用者指定）；登入資訊改在右上角 */}

      {/* 我的待辦：放在問候區下方（11/10 決定） */}
      <Can feature="home-tasks">
        <TaskPanel tasks={visibleTasks} max={HOME_LIMITS.tasks} />
      </Can>

      {!lite && <MyShortcuts />}
      </div>

      {/* 11/12 使用者：首頁所有版本移除「最新公告」與「快速功能」（原本在右側欄） */}
    </div>
  );
}

// 首頁：我的最愛 + 最近打開
function MyShortcuts() {
  const { can, visible } = usePerm();
  const { favorites, recent, clearRecent } = usePrefs();
  const [recentAll, setRecentAll] = useState(false);
  const allFavs = favorites.filter(visible);
  const favs = allFavs.slice(0, HOME_LIMITS.favorites);
  const allRecents = recent.filter((r) => visible(r.node));
  const recents = recentAll ? allRecents : allRecents.slice(0, HOME_LIMITS.recent);
  const favPage = getNode('my-favorites');
  if (!can('favorites') && !can('recent')) return null;

  return (
    <div className="two-col shortcuts">
      <Can feature="favorites">
        <section className="card">
          <header className="card-head with-action">
            <h2><Icon name="star" size={18} filled className="star-gold" /> 我的最愛</h2>
            {allFavs.length > 0 && <a className="link-btn" {...nodeLinkProps(favPage)}>編輯</a>}
          </header>
          {favs.length === 0 ? (
            <p className="empty-hint">
              還沒有最愛的功能。在功能頁標題旁點 <Icon name="star" size={15} className="inline-ico" /> 就會加到這裡。
            </p>
          ) : (
            <div className="fav-grid">
              {favs.map((n) => (
                <div key={n.id} className="fav-tile">
                  <a {...nodeLinkProps(n)}>
                    <Icon name={n.launch ? 'launch' : n.children ? 'folder' : n.icon || 'doc'} size={18} />
                    <span>{n.label}</span>
                  </a>
                  <FavoriteButton node={n} compact />
                </div>
              ))}
            </div>
          )}
          {allFavs.length > HOME_LIMITS.favorites && (
            <a className="link-btn task-more" {...nodeLinkProps(favPage)}>顯示全部（{allFavs.length} 筆）</a>
          )}
        </section>
      </Can>

      <Can feature="recent">
        <section className="card">
          <header className="card-head with-action">
            <h2><Icon name="clock" size={18} /> 最近打開</h2>
            {recents.length > 0 && <button className="link-btn" onClick={clearRecent}>清除</button>}
          </header>
          {recents.length === 0 ? (
            <p className="empty-hint">開啟過的功能會依時間顯示在這裡。</p>
          ) : (
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
          )}
          {allRecents.length > HOME_LIMITS.recent && (
            <button className="link-btn task-more" onClick={() => setRecentAll((v) => !v)}>
              {recentAll ? '收合' : `顯示全部（${allRecents.length} 筆）`}
            </button>
          )}
        </section>
      </Can>
    </div>
  );
}

const kindBadge = (n) =>
  n.launch ? { icon: 'launch', text: `開啟 ${APP_CONFIG.systems[n.launch.system]?.short || APP_CONFIG.systems[n.launch.system]?.name}` }
  : n.embed ? { icon: n.embed.kind === 'api' ? 'api' : 'frame', text: n.embed.kind === 'api' ? 'API 資料' : '嵌入畫面' }
  : null;

// 有子項目的節點：列出看得到的子功能
export function SectionPage({ node }) {
  const { visible } = usePerm();
  const kids = node.children.filter((c) => visible(c) && !c.placeholder);
  const pending = node.children.some((c) => c.placeholder);
  return (
    <>
      <PageTitle node={node} desc={pending ? '下一層項目待提供。' : '請選擇要進行的作業。'} />
      {pending && kids.length === 0 && (
        <div className="placeholder">
          <Icon name="folder" size={28} />
          <strong>下一層項目待提供</strong>
          <p>提供項目名稱後，會出現在左側選單與這一頁。</p>
          <code>功能代碼：{node.id}</code>
        </div>
      )}
      <div className="section-grid">
        {kids.map((c) => {
          const b = kindBadge(c);
          return (
            <div key={c.id} className="section-cell">
            <a className="section-card" {...nodeLinkProps(c)}>
              <Icon name={c.children ? 'folder' : c.icon === 'bookChart' ? 'chart' : c.icon || 'doc'} size={22} className={c.icon ? `fi-${c.icon}` : ''} />
              <span className="section-text">
                <span className="section-label">{c.label}</span>
                {c.children && <span className="section-count">{c.children.some((x) => x.placeholder) ? '下一層待提供' : `${c.children.filter(visible).length} 項作業`}</span>}
                {b && <span className="kind-badge"><Icon name={b.icon} size={12} /> {b.text}</span>}
              </span>
              <Icon name={c.launch ? 'launch' : 'chevronRight'} size={18} className="section-arrow" />
            </a>
            <FavoriteButton node={c} compact />
            </div>
          );
        })}
      </div>
    </>
  );
}

// 本系統功能頁：內容待定義
export function PlaceholderPage({ node }) {
  return (
    <>
      <PageTitle node={node} desc={node.desc || "此頁功能尚待定義。"} />
      <div className="placeholder">
        <Icon name="grid" size={28} />
        <strong>內容區</strong>
        <p>之後可放置：引導說明、篩選條件、資料表格、圖表，或嵌入其他模組畫面。</p>
        <code>功能代碼：{node.id}</code>
      </div>
    </>
  );
}

// 嵌入其他模組：iframe 或 API
export function EmbedPage({ node }) {
  const { embed } = node;
  const sys = APP_CONFIG.systems[embed.system] || { name: embed.system };
  return (
    <>
      <PageTitle
        node={node}
        desc={(
          <span className="source-chip">
            <Icon name={embed.kind === 'api' ? 'api' : 'frame'} size={14} />
            資料來源：{sys.name}（{embed.kind === 'api' ? 'API' : '嵌入畫面'}）
          </span>
        )}
      >
        {embed.kind === 'iframe' && (
          <button
            className="btn-outline"
            onClick={() => requestLaunch({ ...node, launch: { system: embed.system, path: embed.path.replace('&embed=true', ''), title: embed.title } })}
          >
            在新視窗開啟 <Icon name="launch" size={16} />
          </button>
        )}
      </PageTitle>
      {embed.kind === 'iframe' ? <IframeEmbed embed={embed} sys={sys} /> : <ApiEmbed embed={embed} />}
    </>
  );
}

function IframeEmbed({ embed, sys }) {
  const url = systemUrl(embed.system, embed.path);
  if (APP_CONFIG.dataMode === 'live') {
    return <iframe className="embed-frame" src={url} title={embed.title} />;
  }
  return (
    <div className="embed-mock">
      <div className="embed-mock-bar">
        <span className="dots"><i /><i /><i /></span>
        <code>{url}</code>
      </div>
      <div className="embed-mock-body">
        <Icon name="frame" size={32} />
        <strong>{embed.title}</strong>
        <p>正式部署時，這裡會直接嵌入 {sys.name} 的畫面（iframe）。</p>
      </div>
    </div>
  );
}

function ApiEmbed({ embed }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    setData(null); setErr('');
    dataService.fetchEmbed(embed).then(setData).catch((e) => setErr(e.message));
  }, [embed]);

  if (err) return <InlineNotification kind="error" title="無法讀取資料" subtitle={err} />;
  if (!data) return <p className="muted">讀取中…</p>;
  const rows = data.rows.filter((r) => !q || String(r[0]).includes(q.trim()));
  return (
    <div className="table-card">
      <div className="table-meta">更新時間：{data.updatedAt}・單位：新臺幣百萬元</div>
      <TableToolbar value={q} onChange={setQ} placeholder="搜尋科目" />
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr>{data.columns.map((c, i) => <th key={c} className={typeof data.rows[0]?.[i] === 'number' ? 'num' : ''}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={data.columns.length} className="empty-row">找不到符合「{q}」的科目</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((v, i) => (
                  <td key={i} className={typeof v === 'number' ? `num ${v < 0 ? 'neg' : ''}` : ''}>
                    {typeof v === 'number' ? (i === r.length - 1 ? v.toFixed(1) : v.toLocaleString()) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 直接以網址進入外部功能時
export function LaunchInfoPage({ node }) {
  const sys = APP_CONFIG.systems[node.launch.system];
  return (
    <>
      <PageTitle node={node} desc={`此功能在 ${sys?.name} 執行。`} />
      <button className="btn-primary" onClick={() => requestLaunch(node)}>
        開啟 {sys?.name} <Icon name="launch" size={16} />
      </button>
    </>
  );
}

export function NoAccessPage() {
  return (
    <div className="empty-state">
      <Icon name="noAccess" size={36} />
      <h1 className="page-title">沒有使用權限</h1>
      <p className="page-desc">您的角色目前無法使用這個功能，如需開通請洽系統管理員。</p>
      <a className="btn-primary" {...go('home')}>回首頁</a>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1 className="page-title">找不到頁面</h1>
      <p className="page-desc">這個連結可能已變更。</p>
      <a className="btn-primary" {...go('home')}>回首頁</a>
    </div>
  );
}
