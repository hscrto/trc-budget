// ─────────────────────────────────────────────────────────────
// 單位代碼表的修改（11/17 使用者：使用者與單位只有系統管理員可以編輯）
//   代碼表本身（orgUnits.js）由 Excel 轉出、不手改；管理員在畫面上的新增／修改／刪除存成「覆寫」，載入時套用
//   Prototype 存在瀏覽器（localStorage）；正式環境改由代碼主檔 API 維護
// ─────────────────────────────────────────────────────────────
const KEY = 'aa.directory.units.v1';
const empty = () => ({ edits: {}, added: [], removed: [] });

export function getUnitOverrides() {
  try { return { ...empty(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return empty(); }
}
export function saveUnitOverrides(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* 略過 */ }
}
export function resetUnitOverrides() {
  try { localStorage.removeItem(KEY); } catch { /* 略過 */ }
}
export const unitOverrideCount = () => { const o = getUnitOverrides(); return Object.keys(o.edits).length + o.added.length + o.removed.length; };
// 這個代碼是否被修改過：'edited'／'added'／''
export function unitChange(code) {
  const o = getUnitOverrides();
  if (o.added.some((r) => r[0] === code)) return 'added';
  if (o.edits[code]) return 'edited';
  return '';
}

// 載入時套用（直接改 ORG_UNITS 陣列，其他模組共用同一份）
export function applyUnitOverrides(rows) {
  const o = getUnitOverrides();
  if (!o.added.length && !o.removed.length && !Object.keys(o.edits).length) return;
  const removed = new Set(o.removed);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const r = rows[i];
    if (removed.has(r[0])) { rows.splice(i, 1); continue; }
    if (o.edits[r[0]]) rows[i] = o.edits[r[0]];
  }
  o.added.forEach((r) => { if (!removed.has(r[0])) rows.push(r); });
}
