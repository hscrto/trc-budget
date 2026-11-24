import { navigate } from './useHashRoute.js';
import { toast } from './components/Notification.jsx';
import { APP_CONFIG, systemUrl } from './config/appConfig.js';

// 開啟外部模組：交給 LaunchDialog 顯示提示；不需提示時直接開新視窗
export function requestLaunch(node) {
  if (!APP_CONFIG.launch.confirm) {
    const { system, path } = node.launch;
    window.open(systemUrl(system, path), `aa-${system}`);
    return;
  }
  window.dispatchEvent(new CustomEvent('aa:launch', { detail: node }));
}

// 點擊任何節點的統一處理
export function openNode(node) {
  if (!node) return;
  if (node.launch) {
    window.dispatchEvent(new CustomEvent('aa:visit', { detail: node.id }));
    requestLaunch(node);
  }
  else navigate(node.id);
}

export const nodeLinkProps = (node, after) => ({
  href: `#${node.id}`,
  onClick: (e) => { e.preventDefault(); openNode(node); after?.(); },
});

// 在新視窗開啟預算模組的某一頁（Portal 上的連結一律開新視窗）
// 預覽環境若封鎖彈出視窗，改在原視窗開啟
// 預覽頁是嵌在框架裡（iframe）：新視窗打不開框架內的網址，所以預覽時改在原視窗切換
const inPreviewFrame = () => { try { return window.self !== window.top; } catch { return true; } };

export function openBudgetPage(route = 'home') {
  if (inPreviewFrame()) {
    navigate(route);
    toast({ kind: 'info', icon: 'launch', title: '預覽環境：在原視窗開啟', subtitle: '正式環境會開新視窗' });
    return;
  }
  const url = `${window.location.href.split('#')[0]}#${route}`;
  let w = null;
  try { w = window.open(url, `aa-budget-${route}`); } catch { w = null; }
  if (!w) navigate(route);
}

// 切換模組（Portal 卡片、頂列切換選單）：一律開新視窗
export function switchSystem(id) {
  const sys = APP_CONFIG.systems[id];
  if (!sys || sys.open === false) return; // 尚未開放的模組不能進入
  if (sys.internal) { openBudgetPage('home'); return; }
  if (sys.mockRoute) { openBudgetPage(sys.mockRoute); return; } // 11/20：審核會計模組示意畫面
  const url = systemUrl(id, '/');
  // 預覽時先顯示提示（網址為示意）；正式環境直接切換
  if (APP_CONFIG.dataMode === 'mock') {
    window.dispatchEvent(new CustomEvent('aa:launch', {
      detail: { id: `sys-${id}`, label: sys.name, switchSystem: true, launch: { system: id, path: '/', title: sys.name } },
    }));
    return;
  }
  if (sys.openIn === 'same') window.location.href = url;
  else window.open(url, `aa-${id}`); // 預設開新視窗
}
