// ─────────────────────────────────────────────────────────────
// 使用者的修改（11/17 使用者：使用者與單位只有系統管理員可以編輯）
//   Prototype：管理員新增／修改／刪除的帳號存在瀏覽器（localStorage），載入時取代 MOCK_USERS 的內容
//   正式環境：使用者由 SSO／人事系統帶入，這裡改呼叫後端 API
// ─────────────────────────────────────────────────────────────
const KEY = 'aa.directory.users.v1';

export function loadUsers() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function saveUsers(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* 略過 */ }
}
export function resetUsers() {
  try { localStorage.removeItem(KEY); } catch { /* 略過 */ }
}
export const usersEdited = () => !!loadUsers();
