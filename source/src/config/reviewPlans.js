// ─────────────────────────────────────────────────────────────
// 審查計畫（預算審查設定，11/18 使用者，依 PAW Plans 畫面）
//   一個計畫＝一張明細表（費用明細表、收入明細表）的審查流程，由多個「作業」組成
//   作業：名稱、說明、作用中、開始／到期日、要素項（完成數／總數）、相依關係、資產、貢獻者、核准者（＝批准人）
//   之後首頁待辦與明細表頁的「批准人」改讀這裡的核准者
//   Prototype：存在瀏覽器（localStorage aa.plan.計畫代碼.v3）；正式環境改用 PAW Plans API
// ─────────────────────────────────────────────────────────────
import { local } from '../services/storage.js';

// 11/18 使用者：貢獻者（Submitter）與核准者（Approver）都用 User Group（管理 > 群組，來源 Book2.xlsx）
//   contributors：貢獻者群組陣列；approvers：{ 貢獻者群組: [第 1 關核准群組, 第 2 關, …] }（依序核准）
const T = (id, name, o) => ({ id, name, desc: '', active: true, start: '', due: '', items: 1, done: 0, state: '未開始', deps: [], contributors: [], approvers: {}, x: 90, y: 60, ...o });
// 依 PAW 畫面：每個段的「_審」提交，依序經「_審1」「_審2」，最後到處的審核群組
const chain = (units, last, steps = ['審1', '審2']) => Object.fromEntries(units.map((u) => [`${u}_審`, [...steps.map((s) => `${u}_${s}`), ...(last ? [last] : [])]]));
const E_SECS = ['花蓮工務段', '臺北工務段', '臺中工務段', '嘉義工務段', '宜蘭工務段', '臺東工務段', '高雄工務段'];
const M_SECS = ['臺北機務段', '七堵機務段', '新竹機務段', '宜蘭機務段', '彰化機務段', '嘉義機務段', '高雄機務段', '花蓮機務段', '臺東機務段', '花蓮機廠', '潮州機廠', '富岡機廠'];
const E_AP = { ...chain(E_SECS, '工務處審'), 工務處本處_審: ['工務處本處_審1', '工務處本處_審2', '工務處本處_審3', '工務處審'] };
const E_CON = ['花蓮工務段_審', '臺北工務段_審', '臺中工務段_審', '工務處本處_審', '嘉義工務段_審', '宜蘭工務段_審', '臺東工務段_審', '高雄工務段_審'];

export const PLAN_DEFAULTS = {
  'rs-expense': {
    name: '費用明細表', path: '/shared/01.預算概算編列/1.02.費用', active: true, contributors: ['A', '會'],
    tasks: [
      T('t1', '工務段審查', { start: '2026-11-09', due: '2027-02-19', items: 8, done: 0, state: '進行中', contributors: E_CON, approvers: E_AP, x: 90, y: 175 }),
      T('t2', '工務處審查', { active: false, start: '2027-02-19', due: '2027-06-18', deps: ['t1'], contributors: ['工務處審'], approvers: { 工務處審: ['工務處審1', '工務處審2', '工務處審3'] }, x: 580, y: 225 }),
      T('t3', '機務段/機廠->機務處審查流程', { desc: '機務(廠、段)預算彙整成', start: '2026-11-01', due: '2026-12-31', items: 13, contributors: M_SECS.map((u) => `${u}_審`), approvers: chain(M_SECS, '機務處本處_審'), x: 90, y: 60 }),
      T('t4', '機務處審查', { active: false, start: '2027-01-01', due: '2027-04-30', deps: ['t3'], contributors: ['機務處本處_審'], approvers: { 機務處本處_審: ['機務處本處_審1', '機務處本處_審2'] }, x: 580, y: 95 }),
      T('t5', '各處->會計處審查', { active: false, deps: ['t4', 't2', 't6'], contributors: ['處審'], approvers: { 處審: ['會計處審1', '會計處審2', '會計處審3'] }, x: 1070, y: 250 }),
      T('t6', '會計處本處審查', { contributors: ['會計處審'], approvers: { 會計處審: ['會計處審1', '會計處審2', '會計處審3'] }, x: 580, y: 380 }),
    ],
  },
  'rs-income': {
    // Book2.xlsx 沒有運務、附業營運的群組，先留空，由管理員新增群組後在這裡設定
    name: '收入明細表', path: '/shared/01.預算概算編列/1.01.收入', active: true, contributors: ['A', '會'],
    tasks: [
      T('t1', '運務段審查', { start: '2026-11-09', due: '2027-02-19', items: 6, done: 1, state: '進行中', x: 90, y: 60 }),
      T('t2', '運務處審查', { active: false, start: '2027-02-19', due: '2027-05-31', deps: ['t1'], x: 580, y: 60 }),
      T('t3', '附業營運處審查', { start: '2026-11-15', due: '2027-03-31', items: 3, x: 580, y: 220 }),
      T('t4', '各處->會計處審查', { active: false, deps: ['t2', 't3'], contributors: ['處審'], approvers: { 處審: ['會計處審1', '會計處審2', '會計處審3'] }, x: 1070, y: 140 }),
    ],
  },
};

// 11/18 使用者：貢獻者／核准者改用 User Group（Book2.xlsx），舊的 v1、v2 資料不再讀取
const key = (id) => `aa.plan.${id}.v3`;
export const loadPlan = (id) => local.get(key(id), null) || JSON.parse(JSON.stringify(PLAN_DEFAULTS[id] || { name: id, tasks: [] }));
export const savePlan = (id, plan) => local.set(key(id), plan);
export const resetPlan = (id) => { try { localStorage.removeItem(key(id)); } catch { /* 略過 */ } };
