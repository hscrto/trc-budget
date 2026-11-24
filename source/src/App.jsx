import { useEffect, useMemo, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Breadcrumb from './components/Breadcrumb.jsx';
import LaunchDialog from './components/LaunchDialog.jsx';
import { ToastHost } from './components/Notification.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RolesPage from './pages/RolesPage.jsx';
import UsersUnitsPage from './pages/UsersUnitsPage.jsx';
import UserGroupsPage from './pages/UserGroupsPage.jsx';
import { ReviewOverview, ReviewListPage } from './pages/ReviewList.jsx';
import ReviewDetailPage from './pages/ReviewDetail.jsx';
import PlanHome from './pages/PlanHome.jsx';
import PlanDetail from './pages/PlanDetail.jsx';
import { PortalTrains, PortalStations, PortalStationsTicket, PortalWorkspace } from './pages/PortalVariants.jsx';
import PortalPage from './pages/PortalPage.jsx';
import { HomeV4, HomeV5, HomeV6, HomeVersionSwitcher, HomeThemeToggle, useHomeTheme } from './pages/HomeVariants.jsx';
import {
  SectionPage, PlaceholderPage, EmbedPage, LaunchInfoPage, NoAccessPage, NotFoundPage,
} from './pages/Pages.jsx';
import { APP_CONFIG, currentSystem } from './config/appConfig.js';
import { getNode, getTrail } from './config/navigation.js';
import './config/budgetGroups.js'; // 11/13：依分類產生「各類預算編列」與「預算編列」的子項目
import PortalNewsAdmin from './pages/PortalNewsAdmin.jsx';
import { GroupListPage, GroupEditPage, GroupFillPage } from './pages/BudgetGroups.jsx';
import { DEFAULT_GRANTS, DEFAULT_ASSIGN, makeCan, makeVisible, orgRoles, assignedFeatures } from './config/rbac.js';
import { PermContext, usePerm } from './permissions.jsx';
import { PrefsProvider, usePrefs } from './prefs.jsx';
import { MessagesProvider } from './messages.jsx';
import { SessionProvider } from './session.jsx';
import { MessageCenterPage, FavoritesPage, RecentPage } from './pages/MessageCenter.jsx';
import { authService } from './services/authService.js';
import { store } from './services/storage.js';
import { useHashRoute, navigate } from './useHashRoute.js';
import AtieChat from './components/AtieChat.jsx'; // 11/19 首頁右下角 AI 模擬對話：阿鐵
import AuditHome from './pages/AuditHome.jsx'; // 11/20 審核會計模組示意畫面

const isNarrow = () => window.matchMedia('(max-width: 960px)').matches;

function pageFor(route, node, visible, user) {
  // 首頁版本（11/13 使用者：只保留三版並重新排序；網址跟著版號，舊網址 #home-v4～v6 導回版1）
  if (route === 'home' || /^home-v[4-9]$/.test(route)) return <HomeV4 user={user} />; // 版1 編列/待辦（原版3；11/17 命名）
  if (route === 'home-v2') return <HomeV6 user={user} />; // 版2 待辦卡片（原版5）
  if (route === 'home-v3') return <HomeV5 user={user} />; // 版3 三欄總覽（原版6）
  if (!node) return <NotFoundPage />;
  if (!visible(node)) return <NoAccessPage />;
  if (node.page === 'roles') return <RolesPage node={node} />;
  if (node.page === 'users') return <UsersUnitsPage node={node} />;
  if (node.page === 'groups') return <UserGroupsPage node={node} />;
  if (node.page === 'messages') return <MessageCenterPage node={node} />;
  if (node.page === 'favorites') return <FavoritesPage />;
  if (node.page === 'recent') return <RecentPage />;
  if (node.page === 'review-overview') return <ReviewOverview node={node} />;
  if (node.page === 'review-list') return <ReviewListPage node={node} />;
  if (node.page === 'plan-home') return <PlanHome node={node} />;
  if (node.page === 'plan-detail') return <PlanDetail node={node} />;
  if (node.page === 'review-detail') return <ReviewDetailPage id={route.startsWith('rd:') ? route.slice(3) : ''} />;
  if (node.page === 'group-list') return <GroupListPage node={node} />;
  if (node.page === 'group-edit') return <GroupEditPage node={node} />;
  if (node.page === 'group-fill') return <GroupFillPage node={node} />;
  if (node.launch) return <LaunchInfoPage node={node} />;
  if (node.embed) return <EmbedPage node={node} />;
  if (node.children) return <SectionPage node={node} />;
  return <PlaceholderPage node={node} />;
}

function Shell({ user, route: pageRoute, onLogout }) {
  // 首頁比較版本（#home-v2…）在選單、麵包屑、頁籤上都視為「首頁」
  const isHomeVariant = pageRoute === 'home' || /^home-v\d$/.test(pageRoute);
  const route = isHomeVariant ? 'home' : pageRoute.startsWith('rd:') ? 'review-detail' : pageRoute; // 11/18 #rd:明細表代碼
  // 首頁背景深色／淺色（11/12：原版3 的深藍底色改為各版都可切換）
  const [homeTheme] = useHomeTheme();
  const [sidebarOpen, setSidebarOpen] = useState(() => store.get('aa.sidebar', !isNarrow()));
  const mainRef = useRef(null);
  // 11/13：各類預算編列的分類有異動（新增、改名、刪除）時重新繪製選單與頁面
  const [, setGroupsTick] = useState(0);
  useEffect(() => {
    const f = () => setGroupsTick((t) => t + 1);
    window.addEventListener('aa-groups', f);
    return () => window.removeEventListener('aa-groups', f);
  }, []);

  useEffect(() => { store.set('aa.sidebar', sidebarOpen); }, [sidebarOpen]);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    const trail = getTrail(route).map((n) => n.label).join(' > ');
    document.title = `${trail ? trail + ' | ' : ''}臺鐵${currentSystem().name}`;
  }, [route]);

  const { visible } = usePerm();
  const { recordVisit } = usePrefs();
  const node = getNode(route);

  // 最近打開：本系統頁面在換頁時記錄；開啟外部模組由 aa:visit 事件記錄
  useEffect(() => { if (node && visible(node)) recordVisit(route); }, [route]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = (e) => recordVisit(e.detail);
    window.addEventListener('aa:visit', on);
    return () => window.removeEventListener('aa:visit', on);
  }, [recordVisit]);

  return (
    <div className={`shell ${sidebarOpen ? 'with-sidebar' : 'with-rail'}`}>
      <TopBar
        user={user}
        route={route}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onLogout={onLogout}
      />
      <div className="body">
        <Sidebar open={sidebarOpen} rail={!sidebarOpen && !isNarrow()} route={route} onNavigate={() => isNarrow() && setSidebarOpen(false)} />
        {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
        <main className={`main ${isHomeVariant && homeTheme === 'dark' ? 'theme-gray' : ''}`} ref={mainRef}>
          {/* 首頁版1 不顯示上方頁籤（11/10） */}
          {/* 11/12 使用者：所有內頁的上排頁籤移除（TabBar 元件保留） */}
          {/* 11/19 使用者：首頁三版寬度隨畫面調整（不限 1320px），寬螢幕右側不再留白 */}
          {/* 11/24 使用者：各類預算編列（#bf-*）與明細表（#rd:）的工作簿也隨畫面寬度放大，不留白 */}
          <div className={`content ${isHomeVariant || /^(bf-|rd:)/.test(pageRoute) ? 'is-home' : ''}`}>
            {isHomeVariant ? (
              <div className="crumb-row"><Breadcrumb route={route} /><HomeThemeToggle /></div>
            ) : <Breadcrumb route={route} />}
            {pageFor(pageRoute, node, visible, user)}
            {isHomeVariant && <HomeVersionSwitcher current={pageRoute} />}
            {isHomeVariant && <AtieChat user={user} />}
          </div>
          <footer className="app-foot">
            {APP_CONFIG.suiteName}・{currentSystem().name}・{APP_CONFIG.version}・資料來源：
            {APP_CONFIG.dataMode === 'mock' ? '模擬資料' : '正式環境'}
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => authService.restore());
  const [grants, setGrantsState] = useState(() => store.get('aa.rbac.v12', DEFAULT_GRANTS));
  const route = useHashRoute();
  // 11/17：依單位或人員授權（公告管理／發布）
  const [assign, setAssignState] = useState(() => ({ ...DEFAULT_ASSIGN, ...store.get('aa.rbac.assign.v1', {}) }));
  const setAssign = (next) => setAssignState((a) => { const v = typeof next === 'function' ? next(a) : next; store.set('aa.rbac.assign.v1', v); return v; });

  const setGrants = (next) =>
    setGrantsState((g) => {
      const v = typeof next === 'function' ? next(g) : next;
      store.set('aa.rbac.v12', v);
      return v;
    });

  const perm = useMemo(() => {
    const can = makeCan(grants, [...(user?.roles || []), ...orgRoles(user)], assignedFeatures(assign, user));
    return { can, visible: makeVisible(can), grants, setGrants, assign, setAssign, user };
  }, [grants, assign, user]);

  const logout = async () => { await authService.logout(); setUser(null); window.location.hash = ''; };

  if (!user) {
    // 登入後進入模組入口（Portal）；若網址帶有頁面代碼（#bm-01 等）就直接停在那一頁
    return <LoginPage onLogin={(u) => { setUser(u); if (!window.location.hash) navigate('portal'); }} />;
  }
  return (
    <PermContext.Provider value={perm}>
      <PrefsProvider user={user} key={user.id}>
        <MessagesProvider user={user}>
        <SessionProvider user={user} onTimeout={logout}>
        {route === 'audit' && perm.can('sys-audit') ? (
          // 11/20 使用者：審核會計模組第一頁（示意）
          <AuditHome user={user} onLogout={logout} />
        ) : route === 'portal-news-admin' ? (
          // 11/16：Portal 公告管理（管理者）
          <PortalNewsAdmin user={user} onLogout={logout} />
        // 11/24 使用者：版號調整——#portal＝版1-1、#portal-v1-2、#portal-v2-1、#portal-v2-2（新）、#portal-v2-3、#portal-v3 特色車站、#portal-v4 模組總覽
        ) : route === 'portal-v2-3' || route === 'portal-v2' ? (
          // 版2-3 特色列車（原版2；舊網址 #portal-v2 導到這裡）；每 2 秒換一張
          <PortalTrains user={user} onLogout={logout} className="pv3t" interval={2000} />
        ) : route === 'portal-v2-2' ? (
          // 版2-2：上半部套用版2-1（大圖＋公告輪播）＋版1 的入口卡片
          <PortalTrains user={user} onLogout={logout} current="portal-v2-2" className="pv3o1 pv22" interval={2000} entry="cards" heroNews />
        ) : route === 'portal-v2-1' ? (
          // 版2-1：大圖、公告輪播取代問候
          <PortalTrains user={user} onLogout={logout} current="portal-v2-1" className="pv3o1" interval={2000} heroNews />
        ) : route === 'portal-v3' ? (
          // 版3 特色車站（與版4 交換）
          <PortalStations user={user} onLogout={logout} />
        ) : route === 'portal-v4' ? (
          // 版4 模組總覽
          <PortalWorkspace user={user} onLogout={logout} />
        ) : route === 'portal-v1-2' ? (
          // 版1-2：版1-1 藍底＋乘車證，移除問候
          <PortalPage user={user} onLogout={logout} variant="v2-1" />
        ) : route === 'portal' || /^portal-v/.test(route) || !perm.can(`sys-${APP_CONFIG.currentSystem}`) ? (
          // 版1-1 我待審筆數；舊網址（#portal-v1-1、#portal-v5 等）導回這裡
          <PortalPage user={user} onLogout={logout} variant="v5" />
        ) : (
          <Shell user={user} route={route} onLogout={logout} />
        )}
        <LaunchDialog />
        <ToastHost />
        </SessionProvider>
        </MessagesProvider>
      </PrefsProvider>
    </PermContext.Provider>
  );
}
