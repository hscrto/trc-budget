// ─────────────────────────────────────────────────────────────
// 組織層級（11/12）：依使用者單位判斷在預算流程中的層級
//   室 → 段 → 處 → 會計處 → 總公司
//   有審核動作的只有：段、處、會計處、總公司（使用者 11/12 說明）
// 單位名稱依組織架構圖（claude/臺鐵組織單位名稱與用語.md）
// TODO：正式環境依 SSO 回傳的單位代碼判斷
// ─────────────────────────────────────────────────────────────
// 單位代碼資料（11/13）
import { ORG_UNITS, unitByName, unitByCode, childrenOf } from './orgUnits.js';

export const HQ_UNITS = ['總公司', '總經理室', '董事長室', '董事會'];

export function orgLevel(dept = '') {
  const d = dept.trim();
  if (HQ_UNITS.some((u) => d.startsWith(u))) return '總公司';
  if (d.startsWith('會計處')) return '會計處';
  if (/段\s+\S+室$/.test(d)) return '室';
  if (/段$/.test(d)) return '段';
  if (/處(\s+\S+科)?$/.test(d)) return '處';
  return '其他';
}

// 單位名稱（去掉科／室）：「臺北機務段 運轉室」→「臺北機務段」、「會計處 預算科」→「會計處」
export const orgUnit = (dept = '') => dept.trim().split(/\s+/)[0];

// 各處督導的下層單位、各段下設的室（11/13 改依使用者提供的單位代碼 Excel「組織節點(父子)」）
//   下層單位＝該處底下「預算單位＝是」的單位（段、機廠、供應中心、訓練所、營業分處、電訊中心、工務養護總隊）
//   室＝該單位底下「預算編列單位＝是」的單位；運務段的各車站、分駐所、車班組不列入（示意用，避免筆數過多）

const SUB_DEPTS = ['運務處', '機務處', '工務處', '電務處', '供應處', '員工訓練處', '資產開發處'];
export const SECTIONS_OF = Object.fromEntries(SUB_DEPTS.map((d) => {
  const u = unitByName(d);
  return [d, u ? childrenOf(u.code).filter((k) => k.budgetUnit).map((k) => k.name) : []];
}));
export const parentOf = (section) => Object.keys(SECTIONS_OF).find((k) => SECTIONS_OF[k].includes(section)) || '';

const SKIP_ROOM = /(站|分駐所|車班組|分處)$/;
// 回傳室的簡稱（去掉上層單位名稱前綴），例如「臺北機務段運轉室」→「運轉室」
export const roomsOf = (section = '') => {
  const u = unitByName(section);
  if (!u) return [];
  return childrenOf(u.code)
    .filter((k) => k.budgetPrep && !SKIP_ROOM.test(k.name))
    .map((k) => (k.name.startsWith(section) ? k.name.slice(section.length) : k.name));
};

// 單位代碼：依名稱查（室用「段名＋室名」），查不到回傳空字串
export const codeOf = (name = '') => unitByName(name.replace(/\s+/g, ''))?.code || '';
// 11/18 使用者：組織代號全站統一呈現「名稱 (代號)」——半形括號、大寫、字體與前面的名稱相同
export const fmtCode = (code = '') => (code ? `(${String(code).toUpperCase()})` : '');
export const withOrgCode = (name = '', code = '') => (code ? `${name} ${fmtCode(code)}` : name);
// 11/18 使用者：組織代號＝User Group（簽核群組）；個人帳號＝代號加尾綴（_01、_02、_MGR）
//   簽核設定以 User Group 為單位，群組內每個人都可以簽
// 預算流程用的單位名稱 → 簽核群組代號（全公司彙整由會計處提交；總公司批准群組＝總經理室）
export const groupOfUnit = (u = '') => codeOf(u === '全公司' ? '會計處' : u === '總公司' ? '總經理室' : u);
export const groupLabel = (code = '') => withOrgCode(unitByCode(String(code).toUpperCase())?.name || '（查無此群組）', String(code).toUpperCase());
export { ORG_UNITS, unitByCode, unitByName };
