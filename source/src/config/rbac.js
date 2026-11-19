// ─────────────────────────────────────────────────────────────
// RBAC：每個功能（節點 id 或 EXTRA_FEATURES id）都可以獨立授權
//
// 規則
//   1. 授權某個節點 = 該節點與它底下所有子節點都可見
//   2. '*' = 全部功能
//   3. 分類節點只要底下有任一子節點可見，就會顯示（作為通往子節點的路徑）
//
// 正式環境：SSO 回傳使用者的 roles，ROLE_GRANTS 改由 RBAC 服務／API 提供
// ─────────────────────────────────────────────────────────────
import { getTrail } from './navigation.js';
import { orgLevel, unitByCode } from './org.js';

// 「會計處以上」不是登入時選的角色，而是依使用者所屬單位自動帶入（orgRoles），11/12 新增
export const ROLES = ['編列人員', '審核人員', '管理者', '處以上', '會計處以上'];

// 依所屬單位自動帶入的角色：會計處、總公司（董事長室、總經理室等）視為「會計處以上」
// TODO：正式環境依 SSO 回傳的單位代碼判斷
const ABOVE_ACCOUNTING = ['會計處', '總公司', '董事長室', '總經理室', '董事會'];
// 11/13：另加「處以上」（處、會計處、總公司）：選單可看到「新建」
export function orgRoles(user) {
  const dept = user?.dept || '';
  const roles = [];
  if (['處', '會計處', '總公司'].includes(orgLevel(dept))) roles.push('處以上');
  if (ABOVE_ACCOUNTING.some((u) => dept.startsWith(u))) roles.push('會計處以上');
  return roles;
}

// 正式 RBAC 尚未提供：目前所有角色都看得到全部選單，只有「系統管理」限管理者
const ALL_BUDGET = [
  'sys-budget', 'sys-audit', 'sys-bi',
  'home', 'home-tasks', 'home-news', 'favorites', 'recent', 'messages', 'my-favorites', 'my-recent',
  'new', 'review-plan', 'budget-fill', 'reports', 'personal',
  // 11/13 使用者：各類預算編列（維護）、預算表設定、預算審查設定都屬於維護，只授權給「會計處以上」
  // 管理（sysadm）只有管理者；選單「新建」另由 menu-new 控制（處以上）
];

export const DEFAULT_GRANTS = {
  編列人員: [...ALL_BUDGET],
  審核人員: [...ALL_BUDGET],
  管理者: ['*'],
  處以上: ['menu-new'], // 11/13：選單顯示「新建」
  會計處以上: ['budget-review', 'budget-maint', 'review-setting', 'menu-budget-admin', 'menu-new'], // 11/13：App／R&A／Plan 只給會計處以上（管理者為 *）
};

// ─────────────────────────────────────────────────────────────
// 依單位或人員授權（11/17 使用者：公告由誰管理／發布，要在權限中彈性設定可以給哪些單位或人）
//   { 功能代碼: { units: [單位代碼], users: [帳號] } }；授權某單位＝該單位與其下層單位的所有人
//   與角色授權並存（任一符合即有權限）；管理者一律有權限
//   正式環境：由 RBAC 服務提供
// ─────────────────────────────────────────────────────────────
export const ASSIGNABLE = [
  { id: 'news-admin', label: '公告管理', desc: '進入公告管理、新增與修改公告（只能存成草稿）' },
  { id: 'news-publish', label: '公告發布', desc: '發布、排程、下架、重新上架、刪除公告' },
];
export const DEFAULT_ASSIGN = { 'news-admin': { units: [], users: [] }, 'news-publish': { units: [], users: [] } };

// 使用者所屬單位與所有上層單位的代碼
export function unitChain(code) {
  const out = [];
  let u = code ? unitByCode(code) : null;
  while (u) { out.push(u.code); u = u.parent ? unitByCode(u.parent) : null; }
  return out;
}
// 這位使用者因「單位或人員授權」而擁有的功能代碼
export function assignedFeatures(assign = {}, user) {
  if (!user) return [];
  const chain = unitChain(user.unitCode);
  return Object.entries(assign)
    .filter(([, a]) => (a.users || []).includes(user.id) || (a.units || []).some((c) => chain.includes(c)))
    .map(([id]) => id);
}

// grants：{ 角色: [功能 id] }；roles：使用者擁有的角色；extra：依單位或人員授權的功能
export function makeCan(grants, roles = [], extra = []) {
  const set = new Set([...roles.flatMap((r) => grants[r] || []), ...extra]);
  const all = set.has('*');
  return (id) => {
    if (all || set.has(id)) return true;
    return getTrail(id).some((n) => set.has(n.id));
  };
}

// 節點是否顯示：本身有權限，或任一子孫有權限
export function makeVisible(can) {
  // node.perm：此節點改看另一個權限代碼（例如「新增」底下的系統管理員項目要有 sysadm 權限才能用）
  const visible = (node) => !!node && (node.perm ? can(node.perm) : (can(node.id) || (node.children || []).some(visible)));
  return visible;
}

// 權限矩陣用：某角色對某功能是「直接授權」還是「由上層繼承」
export function grantState(grants, role, id) {
  const list = grants[role] || [];
  if (list.includes('*')) return 'inherited';
  if (list.includes(id)) return 'explicit';
  if (getTrail(id).slice(0, -1).some((n) => list.includes(n.id))) return 'inherited';
  return 'none';
}
