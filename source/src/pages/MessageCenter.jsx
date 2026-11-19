import SystemTag from '../components/SystemTag.jsx';
import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { getNode, getTrail } from '../config/navigation.js';
import { dataService } from '../services/dataService.js';
import { navigate } from '../useHashRoute.js';
import { nodeLinkProps, openNode } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';
import { usePrefs } from '../prefs.jsx';
import { useMessages } from '../messages.jsx';
import { toast } from '../components/Notification.jsx';

// ═════════════════════════════════════════════════════════════
// 訊息中心（11/10）：公告與通知整併在同一頁，以頁籤切換
//   #messages / #msg-news = 公告；#msg-notify = 通知（頂列鈴鐺進入）
// ═════════════════════════════════════════════════════════════
const NEWS_TAGS = ['全部', '公告', '系統'];
const NOTIFY_TYPE_CLS = { 審核: 'info', 退回: 'alert', 提醒: 'warn', 系統: 'sys' };

export function MessageCenterPage({ node }) {
  const tab = node.tab || 'news';
  const { unread } = useMessages();
  const [news, setNews] = useState(null);
  useEffect(() => { dataService.getAnnouncements().then(setNews).catch(() => setNews([])); }, []);

  return (
    <>
      <div className="page-head-row">
        <div>
          <h1 className="page-title">訊息中心</h1>
          <div className="page-desc">所有公告與給您的通知。</div>
        </div>
      </div>

      <div className="mc-tabs" role="tablist" aria-label="訊息類別">
        <a role="tab" aria-selected={tab === 'news'} className={tab === 'news' ? 'on' : ''} href="#msg-news"
          onClick={(e) => { e.preventDefault(); navigate('msg-news'); }}>
          <Icon name="doc" size={16} /> 公告 {news && <span className="mc-count">{news.length}</span>}
        </a>
        <a role="tab" aria-selected={tab === 'notify'} className={tab === 'notify' ? 'on' : ''} href="#msg-notify"
          onClick={(e) => { e.preventDefault(); navigate('msg-notify'); }}>
          <Icon name="bell" size={16} /> 通知 {unread > 0 && <span className="mc-count unread">{unread}</span>}
        </a>
      </div>

      {tab === 'news' ? <NewsTab news={news} /> : <NotifyTab />}
    </>
  );
}

function NewsTab({ news }) {
  const [tag, setTag] = useState('全部');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const list = (news || [])
    .filter((n) => tag === '全部' || n.tag === tag)
    .filter((n) => !q.trim() || (n.title + (n.body || '')).includes(q.trim()));

  return (
    <section className="card mc-card">
      <div className="mc-toolbar">
        <div className="mc-chips" role="group" aria-label="公告分類">
          {NEWS_TAGS.map((t) => (
            <button key={t} className={`stat-chip ${tag === t ? 'on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
        <label className="mc-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋公告" aria-label="搜尋公告" />
        </label>
      </div>
      {!news ? <p className="muted">載入中…</p> : list.length === 0 ? <p className="muted mc-empty">沒有符合的公告。</p> : (
        <ul className="mc-list">
          {list.map((n) => {
            const isOpen = open === n.id;
            return (
              <li key={n.id} className={isOpen ? 'open' : ''}>
                <button className="mc-row" onClick={() => setOpen(isOpen ? null : n.id)} aria-expanded={isOpen}>
                  <SystemTag system={n.system} />
                  <span className={`tag ${n.tag === '系統' ? 'sys' : ''}`}>{n.tag}</span>
                  <span className="mc-title">{n.title}</span>
                  <span className="mc-meta">{n.from}</span>
                  <span className="mc-date">{n.date}</span>
                  <Icon name="chevronDown" size={16} className={`mc-chev ${isOpen ? 'open' : ''}`} />
                </button>
                {isOpen && <div className="mc-body">{n.body}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NotifyTab() {
  const { notifications, isRead, markRead, markUnread, markAllRead, unread } = useMessages();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const list = (notifications || []).filter((n) => !onlyUnread || !isRead(n.id));

  const open = (n) => {
    markRead(n.id);
    const target = n.route && getNode(n.route);
    if (target) openNode(target);
  };

  return (
    <section className="card mc-card">
      <div className="mc-toolbar">
        <div className="mc-chips" role="group" aria-label="通知篩選">
          <button className={`stat-chip ${!onlyUnread ? 'on' : ''}`} aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>
            全部 <span className="stat-num">{(notifications || []).length}</span>
          </button>
          <button className={`stat-chip s-overdue ${onlyUnread ? 'on' : ''}`} aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>
            未讀 <span className="stat-num">{unread}</span>
          </button>
        </div>
        <button className="link-btn" disabled={!unread}
          onClick={() => { markAllRead(); toast({ kind: 'success', icon: 'check', title: '已全部標為已讀' }); }}>
          全部標為已讀
        </button>
      </div>
      {!notifications ? <p className="muted">載入中…</p> : list.length === 0 ? <p className="muted mc-empty">沒有未讀通知。</p> : (
        <ul className="mc-list">
          {list.map((n) => {
            const read = isRead(n.id);
            return (
              <li key={n.id} className={read ? 'read' : 'unread'}>
                <div className="mc-row nt-row">
                  <span className="nt-dot" aria-label={read ? '已讀' : '未讀'} />
                  <span className={`nt-type t-${NOTIFY_TYPE_CLS[n.type] || 'info'}`}>{n.type}</span>
                  <button className="nt-main" onClick={() => open(n)}>
                    <b>{n.title}</b>
                    <small>{n.body}</small>
                  </button>
                  <span className="mc-date">{n.time}</span>
                  <button className="link-btn nt-toggle" onClick={() => (read ? markUnread(n.id) : markRead(n.id))}>
                    {read ? '標為未讀' : '標為已讀'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// 我的最愛（11/10）：完整清單，可取消（單筆或勾選多筆）
// ═════════════════════════════════════════════════════════════
export function FavoritesPage() {
  const { visible } = usePerm();
  const { favorites, toggleFavorite } = usePrefs();
  const favs = favorites.filter(visible);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const allOn = favs.length > 0 && favs.every((n) => sel.has(n.id));

  const removeSelected = () => {
    [...sel].forEach((id) => toggleFavorite(id, { silent: true }));
    toast({ kind: 'info', icon: 'star', title: `已從我的最愛移除 ${sel.size} 項` });
    setSel(new Set()); setEditing(false);
  };
  const where = (n) => getTrail(n.id).slice(0, -1).map((x) => x.label).join(' / ') || '首頁';

  return (
    <>
      <div className="page-head-row">
        <div>
          <div className="page-title-line"><h1 className="page-title">我的最愛</h1></div>
          <div className="page-desc">共 {favs.length} 項。在功能頁標題旁點 ☆ 可加入；在這裡可以取消。</div>
          <PersonalTabs current="my-favorites" />
        </div>
        {favs.length > 0 && (
          <div className="page-actions">
            {editing ? (
              <>
                <button className="btn-outline" onClick={() => { setEditing(false); setSel(new Set()); }}>取消</button>
                <button className="btn-danger" disabled={!sel.size} onClick={removeSelected}>
                  移除選取（{sel.size}）
                </button>
              </>
            ) : (
              <button className="btn-outline" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> 編輯</button>
            )}
          </div>
        )}
      </div>

      <section className="card fav-page">
        {favs.length === 0 ? (
          <p className="empty-hint">還沒有最愛的功能。在功能頁標題旁點 <Icon name="star" size={15} className="inline-ico" /> 就會加到這裡。</p>
        ) : (
          <table className="data-table fav-table">
            <thead>
              <tr>
                {editing && (
                  <th className="col-check">
                    <input type="checkbox" checked={allOn} aria-label="全選"
                      onChange={() => setSel(allOn ? new Set() : new Set(favs.map((n) => n.id)))} />
                  </th>
                )}
                <th>功能</th><th>位置</th><th className="col-act">{editing ? '' : '動作'}</th>
              </tr>
            </thead>
            <tbody>
              {favs.map((n) => (
                <tr key={n.id} className={sel.has(n.id) ? 'selected' : ''}>
                  {editing && (
                    <td className="col-check">
                      <input type="checkbox" checked={sel.has(n.id)} aria-label={`選取「${n.label}」`}
                        onChange={() => setSel((s) => { const x = new Set(s); x.has(n.id) ? x.delete(n.id) : x.add(n.id); return x; })} />
                    </td>
                  )}
                  <td>
                    <a className="fav-link" {...nodeLinkProps(n)}>
                      <Icon name={n.launch ? 'launch' : n.children ? 'folder' : n.icon || 'doc'} size={16} /> {n.label}
                    </a>
                  </td>
                  <td className="muted-cell">{where(n)}</td>
                  <td className="col-act">
                    {!editing && (
                      <button className="link-btn fav-remove" onClick={() => toggleFavorite(n.id)}>
                        <Icon name="starFilled" size={16} className="star-gold" /> 取消最愛
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// 我的最愛／最近打開 的頁籤（11/13：選單移除兩者，只從首頁「查看全部」進入這兩頁）
// ═════════════════════════════════════════════════════════════
function PersonalTabs({ current }) {
  const { can } = usePerm();
  const tabs = [['my-favorites', 'star', '我的最愛', 'favorites'], ['my-recent', 'clock', '最近打開', 'recent']].filter((t) => can(t[3]));
  return (
    <div className="mc-tabs personal-tabs" role="tablist" aria-label="我的最愛與最近打開">
      {tabs.map(([id, icon, label]) => (
        <a key={id} role="tab" aria-selected={current === id} className={current === id ? 'on' : ''} href={`#${id}`}
          onClick={(e) => { e.preventDefault(); navigate(id); }}>
          <Icon name={icon} size={16} /> {label}
        </a>
      ))}
    </div>
  );
}

const fmtTime = (t) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 最近打開（完整清單，11/13）
export function RecentPage() {
  const { visible } = usePerm();
  const { recent, clearRecent } = usePrefs();
  const rows = recent.filter((r) => visible(r.node));
  const where = (n) => getTrail(n.id).slice(0, -1).map((x) => x.label).join(' / ') || '首頁';
  return (
    <>
      <div className="page-head-row">
        <div>
          <div className="page-title-line"><h1 className="page-title">最近打開</h1></div>
          <div className="page-desc">共 {rows.length} 項，依開啟時間由新到舊（保留最近 10 項）。</div>
          <PersonalTabs current="my-recent" />
        </div>
        {rows.length > 0 && (
          <div className="page-actions">
            <button className="btn-outline" onClick={() => { clearRecent(); toast({ kind: 'info', icon: 'clock', title: '已清除最近打開' }); }}>清除紀錄</button>
          </div>
        )}
      </div>
      <section className="card fav-page">
        {rows.length === 0 ? (
          <p className="empty-hint">開啟過的功能會依時間顯示在這裡。</p>
        ) : (
          <table className="data-table fav-table">
            <thead><tr><th>功能</th><th>位置</th><th>開啟時間</th></tr></thead>
            <tbody>
              {rows.map(({ node: n, at }) => (
                <tr key={n.id}>
                  <td><a className="fav-link" {...nodeLinkProps(n)}><Icon name={n.launch ? 'launch' : n.icon || 'doc'} size={16} /> {n.label}</a></td>
                  <td className="muted-cell">{where(n)}</td>
                  <td className="muted-cell">{fmtTime(at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
