import SystemTag from '../components/SystemTag.jsx';
import Icon from '../components/Icon.jsx';
import UserSwitcher from '../components/UserSwitcher.jsx';
import emblemWhite from '../assets/emblem-white.png';
import { APP_CONFIG, portalSystems } from '../config/appConfig.js';
import { isSystemOpen, CLOSED_HINT } from '../config/appConfig.js';
import { switchSystem } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';
import { PortalVersionSwitcher } from './PortalVariants.jsx';
import { SessionTimer } from '../session.jsx';
import { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { openBudgetPage } from '../nodeActions.js';
import { navigate } from '../useHashRoute.js';

// 會計系統（AA）SSO 登入後的系統入口
// 11/12 版本整理：原版1（只有系統卡片）刪除；原版4（系統卡片＋最新公告）改名「簡約風」成為版1（#portal）
// variant 'v5'：版4「待審核筆數」（原版5，#portal-v4）＝版1＋預算系統、審核會計系統卡片顯示待審核筆數（BI 不顯示）
export default function PortalPage({ user, onLogout, variant }) {
  const v5 = variant === 'v5';
  const [pending, setPending] = useState(null);
  useEffect(() => { if (v5) dataService.getPendingCounts(user).then(setPending).catch(() => setPending({})); }, [v5, user]);
  const { can } = usePerm();
  const items = portalSystems().filter((s) => can(`sys-${s.id}`));

  return (
    <div className="portal">
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
      <PortalVersionSwitcher current={v5 ? 'portal-v2' : 'portal'} />

      <section className="portal-hero">
        <div className="portal-inner">
          <p className="welcome-kicker">系統入口</p>
          <h1>{user.name}，您好</h1>
          <p>請選擇要進入的系統，系統會在新視窗開啟；進入後可隨時從上方「切換系統」切換。</p>
        </div>
      </section>

      <main className="portal-inner portal-grid" aria-label="系統入口">
        {items.length === 0 && <p className="muted">目前沒有可使用的系統，請洽系統管理員。</p>}
        {items.map((s) => (
          <button key={s.id} className={`portal-card ${v5 ? 'with-pending' : ''} ${isSystemOpen(s.id) ? '' : 'is-closed'}`} disabled={!isSystemOpen(s.id)} aria-disabled={!isSystemOpen(s.id) || undefined} title={isSystemOpen(s.id) ? undefined : CLOSED_HINT} style={{ '--accent': s.portal.accent }} onClick={() => switchSystem(s.id)}>
            <span className="portal-card-top">
              <span className="portal-ico"><Icon name={s.portal.icon} size={28} /></span>
              {v5 && pending?.[s.id] && (
                <span className={`portal-pending ${pending[s.id].count ? '' : 'zero'}`} aria-label={`${pending[s.id].label} ${pending[s.id].count}`}>
                  <span className="pp-num">{pending[s.id].count}</span>
                  <span className="pp-label">{pending[s.id].label}</span>
                </span>
              )}
            </span>
            <span className="portal-name">{s.name}</span>
            <span className="portal-desc">{s.portal.desc}</span>
            <span className="portal-go">
              {isSystemOpen(s.id) ? <>進入系統 <Icon name="launch" size={16} /></> : <span className="portal-closed">尚未開放</span>}
            </span>
          </button>
        ))}
      </main>

      {can('home-news') && <PortalNews />}

      <footer className="portal-foot">© {APP_CONFIG.companyName}・{APP_CONFIG.version}</footer>
    </div>
  );
}

// Portal 版4：最新公告（最多 4 筆；「查看全部」在新視窗開啟訊息中心）
const PORTAL_NEWS_MAX = 4;
// inline：放在其他版面的主內容區內（版3），不另外限制寬度
export function PortalNews({ inline = false }) {
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
    <section className={`${inline ? 'portal-news-inline' : 'portal-inner portal-news'}`} aria-label="最新公告">
      <div className="card pn-card">
        <header className="card-head with-action">
          <h2><Icon name="bell" size={18} /> 最新公告</h2>
          {(can('news-admin') || can('news-publish')) && (
            <button type="button" className="link-btn pn-admin" onClick={() => navigate('portal-news-admin')}>
              <Icon name="edit" size={14} /> 管理公告
            </button>
          )}
          <button className="link-btn pn-all" onClick={() => openBudgetPage('msg-news')}>
            查看全部{news ? `（${news.length} 筆）` : ''} <Icon name="launch" size={14} />
          </button>
        </header>
        {!news ? <p className="muted">載入中…</p> : (
          <ul className="pn-list">
            {news.slice(0, PORTAL_NEWS_MAX).map((n) => {
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
