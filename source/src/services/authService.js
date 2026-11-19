// ─────────────────────────────────────────────────────────────
// 登入：測試期間用測試帳號；正式環境改 SSO（會計系統共用）
// 使用者物件：{ id, name, dept, roles: [] }
// ─────────────────────────────────────────────────────────────
import { APP_CONFIG } from '../config/appConfig.js';
import { store } from './storage.js';
import { loadUsers } from './userStore.js';

// unitCode：所屬單位代碼（11/13 依使用者提供的單位代碼 Excel「組織節點(父子)」）
export const MOCK_USERS = {
  // 11/18 使用者：帳號改依命名規則——一般使用者＝組織代號；同單位多人＝代號_01、_02；管理職（有審核身分）＝代號_MGR
  AHY00: { password: '1234', name: '王小明', dept: '會計處 預算科', unitCode: 'AHY00', roles: ['編列人員'] },
  ACY00_MGR: { password: '1234', name: '林美華', dept: '會計處 審核科', unitCode: 'ACY00', roles: ['審核人員'] },
  // 段底下的室（非會計處），用來測試「預算表設定」只有會計處以上看得到
  MHY01: { password: '1234', name: '黃建華', dept: '臺北機務段 運轉室', unitCode: 'MHY01', roles: ['編列人員'] },
  // 各審核層級（段、處、總公司）
  MHY00_MGR: { password: '1234', name: '鄭文傑', dept: '臺北機務段', unitCode: 'MHY00', roles: ['審核人員'] },
  MAY00_MGR: { password: '1234', name: '劉佳穎', dept: '機務處', unitCode: 'MAY00', roles: ['審核人員'] },
  OBY00_MGR: { password: '1234', name: '周芷若', dept: '總經理室', unitCode: 'OBY00', roles: ['審核人員'] },
  MPY00_MGR: { password: '1234', name: '許志豪', dept: '高雄機務段', unitCode: 'MPY00', roles: ['審核人員'] },
  admin: { password: 'admin', name: '系統管理員', dept: '數位發展處', unitCode: 'DAY00', roles: ['管理者'] },
  // 11/18 使用者：臺北工務段三關——EHY00_01 編列各表 → EHY00 以明細表審核、提交 → EHY00_MGR 核准
  EHY00_01: { password: '1234', name: '林志明', dept: '臺北工務段', unitCode: 'EHY00', roles: ['編列人員'] },
  EHY00: { password: '1234', name: '陳俊宏', dept: '臺北工務段', unitCode: 'EHY00', roles: ['編列人員'] },
  EHY00_MGR: { password: '1234', name: '張雅琪', dept: '臺北工務段', unitCode: 'EHY00', roles: ['審核人員'] },
};
// 11/18：舊帳號 → 新帳號（瀏覽器裡已存的登入狀態、我的最愛、已讀、授權名單一併搬過去）
export const RENAMED_IDS = { aa001: 'AHY00', aa002: 'ACY00_MGR', aa003: 'MHY01', aa004: 'MHY00_MGR', aa005: 'MAY00_MGR', aa006: 'OBY00_MGR', aa007: 'MPY00_MGR' };
export function moveUserData(from, to) {
  if (!from || !to || from === to) return;
  ['aa.prefs.', 'aa.read.'].forEach((p) => {
    try { const v = localStorage.getItem(p + from); if (v != null && localStorage.getItem(p + to) == null) localStorage.setItem(p + to, v); localStorage.removeItem(p + from); } catch { /* 略過 */ }
  });
  try {
    const a = JSON.parse(sessionStorage.getItem('aa.rbac.assign.v1') || 'null');
    if (a) { Object.values(a).forEach((x) => { if (x && Array.isArray(x.users)) x.users = x.users.map((u) => (u === from ? to : u)); }); sessionStorage.setItem('aa.rbac.assign.v1', JSON.stringify(a)); }
  } catch { /* 略過 */ }
}
(() => { try { if (!localStorage.getItem('aa.ids.renamed.1118')) { Object.entries(RENAMED_IDS).forEach(([a, b]) => moveUserData(a, b)); localStorage.setItem('aa.ids.renamed.1118', '1'); } } catch { /* 略過 */ } })();

// ─────────────────────────────────────────────────────────────
// 帳號命名規則（11/18 使用者）
//   一般使用者：帳號＝組織代號，例如 EHY00
//   同單位有多位一般使用者：全部加尾綴 _01、_02…，例如 MHY00_01、MHY00_02（原本只有一人的 MHY00 改成 MHY00_01）
//   管理職（有審核身分＝角色含「審核人員」）：組織代號加 _MGR，例如 AHY00_MGR
// ─────────────────────────────────────────────────────────────
const isMgr = (roles = []) => (roles || []).includes('審核人員');
const pad = (n) => String(n).padStart(2, '0');
export function suggestAccountId(unitCode = '', roles = [], users = MOCK_USERS) {
  const code = String(unitCode).trim().toUpperCase();
  if (!code) return '';
  const taken = new Set(Object.keys(users).map((k) => k.toUpperCase()));
  if (isMgr(roles)) return `${code}_MGR`; // 11/18 使用者：先假設同單位不會有兩位管理職
  if (!taken.has(code) && ![...taken].some((k) => /^.+_\d{2}$/.test(k) && k.startsWith(`${code}_`))) return code;
  // 已有人：原本的 代號 會改成 代號_01，新的人從 _02 起
  for (let i = taken.has(code) ? 2 : 1; i < 100; i += 1) if (!taken.has(`${code}_${pad(i)}`)) return `${code}_${pad(i)}`;
  return '';
}
// 儲存時整理：同單位一般使用者超過一人，單獨的「代號」帳號改成「代號_01」
export function normalizeAccountIds(map) {
  const out = { ...map }; const renamed = [];
  Object.keys(out).forEach((id) => {
    const u = out[id]; const code = (u.unitCode || '').toUpperCase();
    if (id.toUpperCase() !== code || isMgr(u.roles)) return;
    const others = Object.keys(out).some((k) => k !== id && new RegExp(`^${code}_\\d{2}$`, 'i').test(k));
    if (!others) return;
    let n = 1; while (out[`${code}_${pad(n)}`]) n += 1;
    out[`${code}_${pad(n)}`] = u; renamed.push([id, `${code}_${pad(n)}`]);
  });
  // 保持原本順序：改名的帳號放在原位置
  const back = Object.fromEntries(renamed); const done = new Set(renamed.map(([, b]) => b));
  const ordered = {};
  Object.keys(out).forEach((k) => { if (back[k]) ordered[back[k]] = out[back[k]]; else if (!done.has(k)) ordered[k] = out[k]; });
  return { map: ordered, renamed };
}
// 11/18 使用者：人員旁顯示的代號跟著帳號——管理職顯示 MHY00_MGR、多人顯示 MHY00_01；admin 等不依規則的帳號顯示組織代號
export function personCode(id = '', u = {}) {
  const org = String(u.unitCode || '').toUpperCase();
  const acct = String(id || '').toUpperCase();
  return org && acct.startsWith(org) ? acct : org;
}
// 11/18 使用者：User Group 的成員＝所屬組織代號相同的帳號（_01、_02、_MGR…都可以簽）
export const groupMembers = (code = '') => Object.entries(MOCK_USERS).filter(([, u]) => String(u.unitCode || '').toUpperCase() === String(code).toUpperCase());
export const membersText = (code = '') => { const m = groupMembers(code); return m.length ? m.map(([id, u]) => `${u.name} (${personCode(id, u)})`).join('、') : '尚無成員帳號'; };
// 帳號不分大小寫（輸入 ehy00 也可以登入 EHY00）
export const findUserId = (input = '') => Object.keys(MOCK_USERS).find((k) => k.toLowerCase() === String(input).trim().toLowerCase()) || '';
// 預設測試帳號（還原用）
export const DEFAULT_USERS = JSON.parse(JSON.stringify(MOCK_USERS));
// 11/17：套用管理員在「使用者與單位」頁的修改（同一個物件，其他模組共用）
(() => {
  const saved = loadUsers();
  if (!saved) return;
  // 11/18：舊帳號名稱（aa001…）換成新命名
  const fixed = Object.fromEntries(Object.entries(saved).map(([k, v]) => [RENAMED_IDS[k] || k, v]));
  Object.keys(MOCK_USERS).forEach((k) => { delete MOCK_USERS[k]; });
  Object.assign(MOCK_USERS, fixed);
})();

const KEY = 'aa.session';

export const authService = {
  restore() {
    const u = store.get(KEY);
    if (u && RENAMED_IDS[u.id]) { u.id = RENAMED_IDS[u.id]; store.set(KEY, u); }
    if (u && !u.unitCode && MOCK_USERS[u.id]) { u.unitCode = MOCK_USERS[u.id].unitCode; store.set(KEY, u); }
    if (u && !u.loginAt) { u.loginAt = Date.now(); store.set(KEY, u); }
    // 11/17：管理員修改了這個帳號（姓名、單位、角色）時，重新整理後套用
    if (u && MOCK_USERS[u.id]) {
      const m = MOCK_USERS[u.id];
      if (m.name !== u.name || m.dept !== u.dept || m.unitCode !== u.unitCode || (m.roles || []).join() !== (u.roles || []).join()) {
        Object.assign(u, { name: m.name, dept: m.dept, unitCode: m.unitCode, roles: m.roles }); store.set(KEY, u);
      }
    }
    return u;
  },

  // SSO：導向 SSO 登入頁，回到本系統後呼叫 completeSso()
  startSso() {
    window.location.href = APP_CONFIG.auth.ssoLoginUrl + '?returnUrl=' + encodeURIComponent(window.location.href);
  },

  async completeSso() {
    const res = await fetch(APP_CONFIG.auth.userInfoUrl, { credentials: 'include' });
    if (!res.ok) return null;
    const user = { ...(await res.json()), loginAt: Date.now() };
    store.set(KEY, user);
    return user;
  },

  async login(username, password) {
    await new Promise((r) => setTimeout(r, 400));
    const id = findUserId(username);
    const u = MOCK_USERS[id];
    if (!u || u.password !== password) throw new Error('帳號或密碼錯誤，請重新輸入。');
    const user = { id, name: u.name, dept: u.dept, unitCode: u.unitCode, roles: u.roles, loginAt: Date.now() }; // loginAt：登入時間（右上角顯示）
    store.set(KEY, user);
    return user;
  },

  // Prototype 測試用（11/13）：右上角直接切換成其他測試帳號，不需密碼；正式環境（SSO）不提供
  switchTo(id) {
    const u = MOCK_USERS[id];
    if (!u) return null;
    const user = { id, name: u.name, dept: u.dept, unitCode: u.unitCode, roles: u.roles, loginAt: Date.now() };
    store.set(KEY, user);
    try { localStorage.setItem('aa.lastActivity', String(Date.now())); } catch { /* 略過 */ }
    return user;
  },

  async logout() {
    store.remove(KEY);
    if (APP_CONFIG.auth.mode === 'sso' && APP_CONFIG.auth.ssoLogoutUrl) {
      window.location.href = APP_CONFIG.auth.ssoLogoutUrl;
    }
  },
};
