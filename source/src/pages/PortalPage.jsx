import SystemTag from '../components/SystemTag.jsx';
import Icon from '../components/Icon.jsx';
import UserSwitcher from '../components/UserSwitcher.jsx';
import emblemWhite from '../assets/emblem-white.png';
import { APP_CONFIG, portalSystems } from '../config/appConfig.js';
import { isSystemOpen, CLOSED_HINT } from '../config/appConfig.js';
import { switchSystem } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';
import { PortalVersionSwitcher, BoardingTickets } from './PortalVariants.jsx';
import { SessionTimer } from '../session.jsx';
import { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { openBudgetPage } from '../nodeActions.js';
import { navigate } from '../useHashRoute.js';

// 會計系統（AA）SSO 登入後的系統入口
// 11/12 版本整理：原版1（只有系統卡片）刪除；原版4（系統卡片＋最新公告）改名「簡約風」成為版1（#portal）
// variant 'v5'：版4「待審核筆數」（原版5，#portal-v4）＝版1＋預算模組、審核會計模組卡片顯示待審核筆數（BI 不顯示）
export default function PortalPage({ user, onLogout, variant }) {
  // 11/20 使用者：版2-1＝版2 的藍底＋版3 的乘車證入口；移除「XXX，您好」問候，卡片上移；公告區間距縮為 80%
  const v21 = variant === 'v2-1';
  const v5 = variant === 'v5' || v21;
  const [pending, setPending] = useState(null);
  useEffect(() => { if (v5) dataService.getPendingCounts(user).then(setPending).catch(() => setPending({})); }, [v5, user]);
  const { can } = usePerm();
  const items = portalSystems().filter((s) => can(`sys-${s.id}`));

  return (
    <div className={`portal ${v21 ? 'pv21' : ''}`}>
      <header className="topbar portal-bar">
        <div className="brand portal-brand">
          <img src={emblemWhite} alt="臺鐵公司" className="brand-emblem" />
          <span className="brand-name">{APP_CONFIG.suiteName}</span>
        </div>
        <div className="topbar-right">
          <SessionTimer />
          <UserSwitcher user={user} />
          <button className="topbar-logout" onClick={onLogout}>
            <Icon name="logout" size={18} /> <span>登出</span>
          </button>
        </div>
      </header>
      <PortalVersionSwitcher current={v21 ? 'portal-v1-2' : 'portal'} />

      <section className="portal-hero">
        <div className="portal-inner">
          <p className="welcome-kicker">系統入口</p>
          {!v21 && <h1>{user.name}，您好</h1>}
          <p>請選擇要進入的模組，模組會在新視窗開啟；進入後可隨時從上方「切換模組」切換。</p>
        </div>
      </section>

      {v21 ? (
        <main className="portal-inner pv21-main" aria-label="系統入口">
          {items.length === 0 ? <p className="muted">目前沒有可使用的模組，請洽系統管理員。</p> : <BoardingTickets items={items} pending={pending} />}
        </main>
      ) : (
      <main className="portal-inner portal-grid" aria-label="系統入口">
        {items.length === 0 && <p className="muted">目前沒有可使用的模組，請洽系統管理員。</p>}
        <PortalCards items={items} pending={pending} withPending={v5} />
      </main>
      )}

      {/* 11/20 使用者：版2-1 最新公告最多 3 筆 */}
      {can('home-news') && <PortalNews max={v21 ? 3 : PORTAL_NEWS_MAX} ticker={v5 && !v21} />}

      <footer className="portal-foot">© {APP_CONFIG.companyName}・{APP_CONFIG.version}</footer>
    </div>
  );
}

// 版1 的模組入口卡片（11/24 抽出成元件，版1-1 與版2-2 共用）
export function PortalCards({ items, pending, withPending = true }) {
  return (
    <>
    {items.map((s) => (
      <button key={s.id} className={`portal-card ${withPending ? 'with-pending' : ''} ${isSystemOpen(s.id) ? '' : 'is-closed'}`} disabled={!isSystemOpen(s.id)} aria-disabled={!isSystemOpen(s.id) || undefined} title={isSystemOpen(s.id) ? undefined : CLOSED_HINT} style={{ '--accent': s.portal.accent }} onClick={() => switchSystem(s.id)}>
        <span className="portal-card-top">
          <span className="portal-ico"><Icon name={s.portal.icon} size={28} /></span>
          {withPending && pending?.[s.id] && (
            <span className={`portal-pending ${pending[s.id].count ? '' : 'zero'}`} aria-label={`${pending[s.id].label} ${pending[s.id].count}`}>
              <span className="pp-num">{pending[s.id].count}</span>
              <span className="pp-label">{pending[s.id].label}</span>
            </span>
          )}
        </span>
        <span className="portal-name">{s.name}</span>
        <span className="portal-desc">{s.portal.desc}</span>
        <span className="portal-go">
          {isSystemOpen(s.id) ? <>進入模組 <Icon name="launch" size={16} /></> : <span className="portal-closed">尚未開放</span>}
        </span>
      </button>
    ))}
    </>
  );
}

// Portal 版4：最新公告（最多 4 筆；「查看全部」在新視窗開啟訊息中心）
const PORTAL_NEWS_MAX = 4;
// inline：放在其他版面的主內容區內（版3），不另外限制寬度
// 11/20 使用者：版2 公告改成跑馬燈——不列清單，輪播前 5 筆、每 2.5 秒換一則
function NewsTicker({ news }) {
  const list = (news || []).slice(0, 5);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (list.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 2500);
    return () => clearInterval(t);
  }, [list.length]);
  if (!news) return <span className="pnt-track muted">載入中…</span>;
  if (!list.length) return <span className="pnt-track muted">目前沒有公告</span>;
  return (
    <div className="pnt-track" aria-live="polite">
      {list.map((n, k) => (
        <button key={n.id} type="button" className={`pnt-item ${k === i ? 'on' : k === (i - 1 + list.length) % list.length ? 'out' : ''}`}
          tabIndex={k === i ? 0 : -1} aria-hidden={k !== i} onClick={() => openBudgetPage('msg-news')} title={n.title}>
          <span className="pn-date">{n.date}</span>
          {n.pinned && <span className="na-pin">置頂</span>}
          <SystemTag system={n.system} />
          <span className={`tag ${n.tag === '系統' ? 'sys' : ''}`}>{n.tag}</span>
          <span className="pn-title">{n.title}</span>
        </button>
      ))}
      <span className="pnt-dots" aria-hidden="true">{list.map((n, k) => <i key={n.id} className={k === i ? 'on' : ''} />)}</span>
    </div>
  );
}

// 11/23 使用者：版3-1 公告改成輪播並放進列車輪播（主視覺）裡，畫面不用捲動
export function HeroNews() {
  const [news, setNews] = useState(null);
  useEffect(() => {
    const load = () => dataService.getAnnouncements().then(setNews).catch(() => setNews([]));
    load();
    const t = setInterval(load, 60000);
    window.addEventListener('aa-news', load);
    return () => { clearInterval(t); window.removeEventListener('aa-news', load); };
  }, []);
  return (
    <div className="hero-news" aria-label="最新公告">
      <span className="hero-news-label"><Icon name="bell" size={16} /> 最新公告</span>
      <NewsTicker news={news} />
      <button type="button" className="hero-news-all" onClick={() => openBudgetPage('msg-news')}>查看全部</button>
    </div>
  );
}

export function PortalNews({ inline = false, max = PORTAL_NEWS_MAX, ticker = false }) {
  const [news, setNews] = useState(null);
  const [open, setOpen] = useState(null);
  const { can } = usePerm();
  // 11/16：公告可排程——每分鐘重新讀取，排程時間到就出現；公告管理儲存後也立即更新
  useEffect(() => {
    const load = () => dataService.getAnnouncements().then(setNews).catch(() => setNews([]));
    load();
    const t = setInterval(load, 60000);
    window.addEventListener('aa-news', load);
    return () => { clearInterval(t); window.removeEventListener('aa-news', load); };
  }, []);
  return (
    <section className={`${inline ? 'portal-news-inline' : 'portal-inner portal-news'} ${ticker ? 'is-ticker' : ''}`} aria-label="最新公告">
      <div className="card pn-card">
        <header className="card-head with-action">
          <h2><Icon name="bell" size={18} /> 最新公告</h2>
          {ticker && <NewsTicker news={news} />}
          {(can('news-admin') || can('news-publish')) && (
            <button type="button" className="link-btn pn-admin" onClick={() => navigate('portal-news-admin')}>
              <Icon name="edit" size={14} /> 管理公告
            </button>
          )}
          <button className="link-btn pn-all" onClick={() => openBudgetPage('msg-news')}>
            查看全部{news ? `（${news.length} 筆）` : ''} <Icon name="launch" size={14} />
          </button>
        </header>
        {ticker ? null : !news ? <p className="muted">載入中…</p> : (
          <ul className="pn-list">
            {news.slice(0, max).map((n) => {
              const isOpen = open === n.id;
              return (
                <li key={n.id} className={isOpen ? 'open' : ''}>
                  <button className="pn-row" onClick={() => setOpen(isOpen ? null : n.id)} aria-expanded={isOpen}>
                    <span className="pn-date">{n.date}</span>
                    {n.pinned && <span className="na-pin">置頂</span>}
                    <SystemTag system={n.system} />
                    <span className={`tag ${n.tag === '系統' ? 'sys' : ''}`}>{n.tag}</span>
                    <span className="pn-title">{n.title}</span>
                    <span className="pn-from">{n.from}</span>
                    <Icon name="chevronDown" size={16} className={`mc-chev ${isOpen ? 'open' : ''}`} />
                  </button>
                  {isOpen && <div className="mc-body pn-body">{n.body}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
