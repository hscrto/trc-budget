import Icon from './Icon.jsx';
import UserSwitcher from './UserSwitcher.jsx';
import { SessionTimer } from '../session.jsx';
import emblemWhite from '../assets/emblem-white.png';
import SystemSwitcher from './SystemSwitcher.jsx';
import { currentSystem } from '../config/appConfig.js';
import { navigate } from '../useHashRoute.js';

export default function TopBar({ user, route, sidebarOpen, onToggleSidebar, onLogout }) {
  return (
    <header className="topbar">
      <button
        className="hamburger"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? '收合選單' : '展開選單'}
        aria-expanded={sidebarOpen}
        aria-controls="sidebar"
      >
        <Icon name="menu" size={22} />
      </button>

      <a
        className="brand"
        href="#home"
        onClick={(e) => { e.preventDefault(); navigate('home'); }}
        title="回首頁"
      >
        <img src={emblemWhite} alt="臺鐵公司" className="brand-emblem" />
        <span className="brand-name">臺鐵 {currentSystem().name}</span>
      </a>

      <SystemSwitcher />

      <div className="topbar-right">
        <SessionTimer />
        {/* 11/13 使用者：通知鈴鐺移除 */}
        {/* 11/13 使用者：右上角齒輪移除，內容搬到選單「使用者」（只有管理員看得到） */}
        <UserSwitcher user={user} />
        <button className="topbar-logout" onClick={onLogout}>
          <Icon name="logout" size={18} /> <span>登出</span>
        </button>
      </div>
    </header>
  );
}
