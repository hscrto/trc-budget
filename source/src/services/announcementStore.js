// ─────────────────────────────────────────────────────────────
// 公告資料（11/16 使用者：Admin 在 Portal 有公告編輯中心，可排程公告）
//   每則公告：system（budget／audit／bi）、tag（公告／系統）、title、body、from（發布單位）
//             publishAt（發布時間）、unpublishAt（下架時間，可空白）、pinned（置頂）、draft（草稿）
//   狀態依目前時間計算：草稿、排程中（發布時間未到）、已發布、已下架（下架時間已過）
//   排程公告到時間會自動出現在 Portal 與訊息中心（Portal 每分鐘重新讀取）
//
// Prototype：存在瀏覽器（localStorage，所有測試帳號共用）。
// 正式環境：改由後端儲存（例如 TM1 公告 Cube 或資料表），排程由伺服器時間判斷，不依賴使用者電腦時間。
// ─────────────────────────────────────────────────────────────
import { local } from './storage.js';

const KEY = 'aa.announcements.v1';
const at = (d, t = '08:00') => `${d}T${t}`;

const SEED = [
  { id: 'a12', system: 'budget', tag: '公告', title: '116 年度預算審議時程公布，各處明細表請於 12/05 前提交會計處。', from: '會計處 預算科',
    body: '審議時程：各處提交明細表 12/05、會計處審查 12/06–12/15、提交總公司 12/18。', publishAt: at('2026-11-20'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a13', system: 'audit', tag: '系統', title: '審核會計模組 12 月維護公告（草稿）', from: '數位發展處',
    body: '維護時間待確認。', publishAt: '', unpublishAt: '', pinned: false, draft: true },
  { id: 'a1', system: 'budget', tag: '公告', title: '116 年度預算概算填報作業開始，請於 11/30 前完成。', from: '會計處 預算科',
    body: '各單位請依核定之編列原則，於 11/30 前完成概算填報並送出審核。填報說明與範本請至「預算表設定 › 01.預算概算編列」下載。', publishAt: at('2026-11-09'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a8', system: 'audit', tag: '公告', title: '10 月份傳票請於 11/20 前完成送審，逾期將併入次月辦理。', from: '會計處 審核科',
    body: '請各單位確認 10 月份傳票附件齊全後送審；退件待補的傳票請於 11/18 前補正。', publishAt: at('2026-11-07'), unpublishAt: at('2026-11-21', '00:00'), pinned: false, draft: false },
  { id: 'a2', system: 'budget', tag: '系統', title: '預算模組將於 11/15 (六) 22:00–24:00 進行例行維護。', from: '數位發展處',
    body: '維護期間無法登入預算模組，請提前儲存作業中的資料。維護完成後將另行通知。', publishAt: at('2026-11-05'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a9', system: 'bi', tag: '公告', title: '新增「116 年度預算執行儀表板」，可依處別查看執行率。', from: '數位發展處',
    body: '儀表板每日 07:00 更新前一日資料，可在商業智慧 BI 的「我的儀表板」加入訂閱。', publishAt: at('2026-11-03'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a3', system: 'budget', tag: '公告', title: '主計總處審查意見已匯入，請各單位確認調整數。', from: '會計處 預算科',
    body: '審查意見已匯入「04.主計總處審查」，請各單位於 11/10 前確認調整數並回覆。', publishAt: at('2026-10-28'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a10', system: 'audit', tag: '系統', title: '審核會計模組新增傳票附件線上預覽功能。', from: '數位發展處',
    body: '審核人員可直接在傳票頁面預覽 PDF 與圖片附件，不需下載。', publishAt: at('2026-10-25'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a4', system: 'budget', tag: '公告', title: '115 年度預算執行檢討會議資料，請於 10/31 前上傳。', from: '會計處',
    body: '請各單位上傳執行檢討簡報與差異說明，會議將於 11/05 召開。', publishAt: at('2026-10-20'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a11', system: 'bi', tag: '系統', title: '商業智慧 BI 報表匯出新增 Excel 格式。', from: '數位發展處',
    body: '各報表右上角「匯出」可選擇 PDF 或 Excel。', publishAt: at('2026-10-15'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a5', system: 'budget', tag: '系統', title: '我的待辦改版：依層級呈現明細表，新增「我待審」清單。', from: '數位發展處',
    body: '在首頁「我的待辦」點「查看全部」可看到我待審、已完成兩種清單；待辦只包含明細表的審核作業（段以上），狀態依您是提交者或審核者顯示。', publishAt: at('2026-10-12'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a6', system: 'budget', tag: '公告', title: '116 年度預算編列原則已核定，請各單位參照辦理。', from: '會計處',
    body: '編列原則與各類費用標準已上傳，請各單位據以編列。', publishAt: at('2026-10-01'), unpublishAt: '', pinned: false, draft: false },
  { id: 'a7', system: 'budget', tag: '系統', title: '我的最愛與最近打開功能上線，可快速回到常用頁面。', from: '數位發展處',
    body: '在功能頁標題旁點 ☆ 即可加入我的最愛。', publishAt: at('2026-09-18'), unpublishAt: '', pinned: false, draft: false },
];

// 目前時間（datetime-local 格式，本地時間）
export function nowLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fmtTime = (t) => (t ? t.replace('T', ' ') : '');

export const STATUSES = ['已發布', '排程中', '草稿', '已下架'];
export function statusOf(a, now = nowLocal()) {
  if (a.draft) return '草稿';
  if (a.publishAt && a.publishAt > now) return '排程中';
  if (a.unpublishAt && a.unpublishAt <= now) return '已下架';
  return '已發布';
}

export const getAll = () => local.get(KEY, null) || SEED;
export function saveAll(list) {
  local.set(KEY, list);
  try { window.dispatchEvent(new Event('aa-news')); } catch { /* ignore */ }
}
export function resetAll() {
  try { localStorage.removeItem(KEY); window.dispatchEvent(new Event('aa-news')); } catch { /* ignore */ }
}
export function upsert(item) {
  const list = getAll();
  const i = list.findIndex((a) => a.id === item.id);
  const next = i >= 0 ? list.map((a) => (a.id === item.id ? item : a)) : [item, ...list];
  saveAll(next);
}
export function remove(id) { saveAll(getAll().filter((a) => a.id !== id)); }
export const newId = () => `a${Date.now().toString(36)}`;

// 一般使用者看到的公告：已發布，置頂在前，再依發布時間新到舊
export function publicList(now = nowLocal()) {
  return getAll()
    .filter((a) => statusOf(a, now) === '已發布')
    .sort((x, y) => (Number(!!y.pinned) - Number(!!x.pinned)) || (y.publishAt || '').localeCompare(x.publishAt || ''))
    .map((a) => ({ ...a, date: (a.publishAt || '').slice(0, 10) }));
}
