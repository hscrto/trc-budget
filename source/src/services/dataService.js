// ─────────────────────────────────────────────────────────────
// 資料轉接層：畫面只呼叫這裡，不直接碰 TM1
// mock 與 tm1 兩種實作提供相同的函式
// ─────────────────────────────────────────────────────────────
import { APP_CONFIG } from '../config/appConfig.js';
import { tm1 } from './tm1Client.js';
import { orgLevel, orgUnit, SECTIONS_OF, parentOf, roomsOf } from '../config/org.js';
import { APP_CONFIG as CFG } from '../config/appConfig.js';

import { publicList } from './announcementStore.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// 明細表審查快照（模擬）：各單位在「上一層」眼中的狀態
// ─────────────────────────────────────────────────────────────
const NAMES = ['陳志明', '林怡君', '吳俊賢', '張雅婷', '蔡宗翰', '李美玲', '王大同', '楊凱文', '謝佩珊', '郭建宏'];
// 有測試帳號的單位，提交人就是該帳號（各層看到的人名一致）
const PERSON_OF = { 臺北機務段: '鄭文傑', 高雄機務段: '許志豪', 機務處: '劉佳穎', 全公司: '王小明', 會計處: '林美華', 總公司: '周芷若' };
const personOf = (u) => PERSON_OF[u] || NAMES[hash(u) % NAMES.length];
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
// 11/12 調整示意資料：讓每個帳號的各狀態都有數字（11/13 單位改依單位代碼 Excel 後，機務處第 5 個為高雄機務段＝已送審，第 8 個花蓮機廠＝被退回）
// 11/18 使用者例：臺北工務段（工務處第 2 個）承辦已提交、等臺北工務段審核群組批准 → 第 2 個改為「尚未送達」處
const SEC_STATUS = ['待審', '尚未送達', '已核准', '尚未送達', '待審', '待審', '已核准', '已退回', '待審'];
// 會計處收到的各處明細表（11/12 擴充為組織架構圖上各處；區域營運處是否編列待確認，暫不列）
const DEPT_STATUS = {
  運務處: '待審', 機務處: '待審', 工務處: '已核准', 電務處: '待審', 供應處: '已退回', 員工訓練處: '已核准',
  企劃處: '已核准', 營運安全處: '待審', 營業處: '已核准', 行控處: '尚未送達', 數位發展處: '待審', 專案工程處: '尚未送達',
  公關處: '已核准', 行政處: '待審', 財務處: '已核准', 人力資源處: '已核准', 附業營運處: '已退回', 資產開發處: '尚未送達',
};
const DEPTS = Object.keys(DEPT_STATUS);
export const MOCK_DEPTS = DEPTS; // 11/13：系統管理「使用者與單位」標示 Prototype 使用中的單位
const ALL_CO = '全公司 明細表（會計處彙整）';
const d11 = (day) => `2026-11-${String(Math.min(day, 12)).padStart(2, '0')}`;

// 金額（千元）：明細表由各預算編列表彙整，所以上一層的金額＝下一層合計（室 → 段 → 處 → 全公司）
const roomAmount = (sec, room) => ({ income: 300 + (hash(sec + room + 'i') % 300) * 4, expense: 1500 + (hash(sec + room + 'e') % 400) * 5 });
const sumOf = (list) => list.reduce((a, x) => ({ income: a.income + x.income, expense: a.expense + x.expense }), { income: 0, expense: 0 });
function amountOf(u, lv) {
  if (lv === '段') return sumOf(roomsOf(u).map((r) => roomAmount(u, r)));
  if (lv === '處') {
    const secs = SECTIONS_OF[u];
    if (secs) return sumOf(secs.map((x) => amountOf(x, '段')));
    return { income: 20000 + (hash(u + 'i') % 900) * 30, expense: 90000 + (hash(u + 'e') % 900) * 60 }; // 沒有段的處（模擬）
  }
  if (lv === '會計處') return sumOf(DEPTS.map((d) => amountOf(d, '處'))); // 全公司（會計處彙整）
  return { income: 0, expense: 0 };
}

// 單位 u（層級 lv）在上一層眼中的狀態
function inParent(u, lv) {
  const o = typeof window !== 'undefined' ? decisions()[`${u}@${upperOf(u, lv)}`] : '';
  if (o) return o === 'approve' ? '已核准' : '已退回';
  if (lv === '段') {
    const list = SECTIONS_OF[parentOf(u)] || [];
    const i = list.indexOf(u);
    return i < 0 ? '尚未送達' : SEC_STATUS[i % SEC_STATUS.length];
  }
  if (lv === '處') return DEPT_STATUS[u] || '尚未送達';
  if (lv === '會計處') return '待審'; // 全公司明細表：會計處已提交給總公司（示意：讓會計處有「已送審」）
  return '';
}
// 11/18 使用者：段內也有一關——承辦（室級或段的一般使用者）提交 → 段的審核群組批准 → 再到處
//   承辦按「提交」的紀錄（Prototype 存在瀏覽器）
const SUBMIT_KEY = 'aa.rd.submitted.v1';
const submittedIds = () => { try { return new Set(JSON.parse(localStorage.getItem(SUBMIT_KEY) || '[]')); } catch { return new Set(); } };
// 11/18 使用者：核准／拒絕（PAW「核准或拒絕作業」）與作業歷程（Prototype 存在瀏覽器）
//   決定：aa.rd.decisions.v1 ＝ { '單位@審核單位': 'approve' | 'reject' }（該關最後一個核准群組核准才算通過）
//   歷程：aa.rd.history.v1 ＝ [{ c: 提交群組, type: submit|approve|reject|reset, by: 核准群組, who, at, note }]
const DEC_KEY = 'aa.rd.decisions.v1';
const HIST_KEY = 'aa.rd.history.v1';
const readJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 略過 */ } };
const decisions = () => readJ(DEC_KEY, {});
export const reviewHistory = () => readJ(HIST_KEY, []);
const logHistory = (entries) => writeJ(HIST_KEY, [...reviewHistory(), ...entries]);
export function submitReview(id, meta = {}) {
  try { const s = submittedIds(); s.add(id); localStorage.setItem(SUBMIT_KEY, JSON.stringify([...s])); } catch { /* 略過 */ }
  if (meta.c) logHistory([{ c: meta.c, type: 'submit', who: meta.who || '', at: new Date().toISOString() }]);
  // 重新提交：清掉段內的退回
  const u = String(id).replace(/^out-/, ''); const d = decisions();
  if (d[`${u}@${u}`] === 'reject') { delete d[`${u}@${u}`]; writeJ(DEC_KEY, d); }
}
// unit：被審的單位；at：審核單位（段內＝自己）；final：這一關的核准群組都核准了
export function decideReview({ unit, at, action, final, groups = [], by, who, note }) {
  const now = new Date().toISOString();
  logHistory(groups.map((c) => ({ c, type: action, by, who, at: now, note })));
  if (action === 'approve' && !final) return;
  const d = decisions();
  d[`${unit}@${at}`] = action;
  if (action === 'reject') {
    if (at !== unit) delete d[`${unit}@${unit}`]; // 上一層退回後，段內也要重新核准
    try { const s = submittedIds(); s.delete(`out-${unit}`); localStorage.setItem(SUBMIT_KEY, JSON.stringify([...s])); } catch { /* 略過 */ }
  }
  writeJ(DEC_KEY, d);
}
// 段的實際狀態：p＝在處眼中的狀態；sent＝承辦是否已提交（尚未送達處但承辦已提交＝在段的審核群組）
function secState(sec) {
  let p = inParent(sec, '段');
  const resub = p === '已退回' && submittedIds().has(`out-${sec}`); // 被處退回後，承辦重新提交 → 回到段審核
  if (resub) p = '尚未送達';
  const sent = p !== '尚未送達' || resub || INTERNAL_SENT.has(sec) || submittedIds().has(`out-${sec}`);
  // 段內審核群組核准了 → 送到處（處待審）
  if (p === '尚未送達' && sent && decisions()[`${sec}@${sec}`] === 'approve') p = '待審';
  return { p, sent };
}
// 11/18 使用者測試資料：臺北工務段——EHY00_01 編列各表 → EHY00 以明細表審核後提交（對 EHY00＝已完成）→ EHY00_MGR 我待審
const INTERNAL_SENT = new Set(['臺北工務段']);
const upperOf = (u, lv) => (lv === '段' ? parentOf(u) || '所屬處' : lv === '處' ? '會計處' : lv === '會計處' ? '總公司' : '');

// 一筆「收到的」明細表（審核者角度）
function inRow(u, lv, i, status, reviewer, extra = {}) {
  const sent = status !== '尚未送達';
  const done = status === '已核准' || status === '已退回';
  const day = 11 - (i % 9);
  return {
    kind: 'in', id: `in-${u}`, unit: u, title: lv === '會計處' ? ALL_CO : `${u} 明細表`,
    ...amountOf(u, lv),
    status, submitter: sent ? personOf(u) : '', submitDate: sent ? d11(day) : '',
    waitDays: status === '待審' ? Math.max(1, Math.round((new Date('2026-11-12') - new Date(d11(day))) / 864e5)) : 0, reviewer: done ? reviewer : '', doneDate: done ? d11(day + 1) : '',
    ...extra,
  };
}

// 室 → 段：室提交的是「預算編列」（約 70 張表，期限到自動鎖定＝提交）；段審查各室後，彙整成明細表提交給處（11/12 使用者說明）
//   明細表由各預算編列表彙整而成，數據相同
const ROOM_PATTERN = ['已核准', '待審', '已核准', '已核准', '已退回', '待審', '已核准', '已核准', '待審', '已核准', '已核准'];
// 各室 11/08 期限到自動鎖定（＝提交），段 11/10 起陸續審核（示意）
function roomDates() { return { lock: '2026-11-08', done: '2026-11-10' }; }
function roomRow(sec, room, i, reviewer) {
  const status = ROOM_PATTERN[i % ROOM_PATTERN.length]; // 示意：段已送審時，仍保留部分室待審，讓各狀態都有數字
  const done = status === '已核准' || status === '已退回';
  const { lock, done: doneDate } = roomDates(sec);
  return {
    kind: 'in', id: `in-${sec}-${room}`, unit: `${sec} ${room}`, title: `${room} 預算編列`,
    ...roomAmount(sec, room),
    status, submitter: '期限到自動鎖定', submitDate: lock,
    waitDays: status === '待審' ? Math.max(1, Math.round((new Date(TODAY) - new Date(lock)) / 864e5)) : 0,
    reviewer: done ? reviewer : '', doneDate: done ? doneDate : '',
  };
}

// 管理者（11/12 使用者）：看得到整個系統每一項審查——各室預算編列、各段（含機廠等）明細表、各處明細表、全公司明細表
//   每筆加上 layer（提交階層）與 reviewUnit（審核單位）；管理者本身不提交、不審核
const LAYER = { 室: '室 → 段', 段: '段 → 處', 處: '處 → 會計處', 會計處: '會計處 → 總公司' };
function adminSnapshot() {
  const ok = DEPTS.filter((d) => DEPT_STATUS[d] === '已核准').length;
  const items = [
    { ...inRow('全公司', '會計處', 0, '待審', personOf('總公司'), { note: `第 2 次送審（各處已核准 ${ok}／${DEPTS.length}）` }), reviewUnit: '總公司', layer: LAYER.會計處 },
    { ...inRow('全公司', '會計處', 6, '已退回', personOf('總公司'), { note: '第 1 次送審，退回補正' }), id: 'in-全公司-1', title: `${ALL_CO}（第 1 次）`, reviewUnit: '總公司', layer: LAYER.會計處 },
  ];
  DEPTS.forEach((d, i) => {
    items.push({ ...inRow(d, '處', i + 1, DEPT_STATUS[d], personOf('會計處')), reviewUnit: '會計處', layer: LAYER.處 });
    (SECTIONS_OF[d] || []).forEach((sec, j) => {
      const st = secState(sec);
      if (!st.p || st.p === '尚未送達') { if (st.sent) items.push({ ...inRow(sec, '段', j, '待審', personOf(sec)), id: `in-${sec}-段內`, reviewUnit: sec, layer: '承辦 → 段' }); }
      else items.push({ ...inRow(sec, '段', j, st.p, personOf(d)), reviewUnit: d, layer: LAYER.段 });
      // 11/13 使用者：預算編列＝填表，沒有審核，不列入待辦（各室的預算編列已移除）
    });
  });
  return { level: '全系統', unit: '管理者', items, mine: null, upper: '', admin: true };
}

function rawSnapshot(user) {
  if ((user?.roles || []).includes('管理者')) return adminSnapshot();
  const level = orgLevel(user?.dept);
  const unit = orgUnit(user?.dept);
  const me = user?.name || '';
  const reviewUnit = level === '總公司' ? '總公司' : unit;
  let items = [];
  if (level === '處') items = (SECTIONS_OF[unit] || []).map((s, i) => inRow(s, '段', i, secState(s).p, me));
  if (level === '會計處') items = DEPTS.map((d, i) => inRow(d, '處', i + 1, DEPT_STATUS[d], me));
  if (level === '總公司') {
    const ok = DEPTS.filter((d) => DEPT_STATUS[d] === '已核准').length;
    items = [
      inRow('全公司', '會計處', 0, '待審', me, { note: `第 2 次送審（各處已核准 ${ok}／${DEPTS.length}）` }),
      // 示意：第 1 次送審已退回（讓總公司也有「已完成」）
      { ...inRow('全公司', '會計處', 6, '已退回', me, { note: '第 1 次送審，退回補正' }), id: 'in-全公司-1', title: `${ALL_CO}（第 1 次）` },
    ];
  }

  // 11/18 使用者：段與室——承辦（室級、或段的一般使用者）提交明細表；段的審核人員（審核群組）批准後送到處
  if (level === '段' || level === '室') {
    // 11/18 使用者：段的「代號_01、_02」帳號只負責編列各表（填表），不經手明細表 → 待辦沒有明細表
    if (level === '段' && /_\d{2}$/.test(String(user?.id || '')) && !(user?.roles || []).includes('審核人員')) return { level, unit, items: [], mine: null, upper: unit };
    const sec = unit;
    const up = parentOf(sec) || '所屬處';
    const idx = Math.max(0, (SECTIONS_OF[up] || []).indexOf(sec));
    const { p, sent } = secState(sec);
    if (level === '段' && (user?.roles || []).includes('審核人員')) {
      // 段的審核群組：承辦提交後是「待審」；已送到處（不論處的結果）＝我已批准
      const st = !sent ? '' : p === '尚未送達' ? '待審' : p === '已退回' ? '已退回' : '已核准'; // 上一層退回＝已完成・已退回
      const rows = st ? [{ ...inRow(sec, '段', idx, st, me), title: `${sec} 明細表`, reviewUnit: sec, at: up }] : [];
      return { level, unit, items: rows, mine: null, upper: up };
    }
    const internal = p === '尚未送達';
    const status = !sent ? (decisions()[`${sec}@${sec}`] === 'reject' ? '被退回' : '尚未提交') : internal ? '審核中' : { 待審: '審核中', 已核准: '已核准', 已退回: '被退回' }[p];
    const at = internal ? sec : up;
    const base = inRow(sec, '段', idx, internal ? (sent ? '待審' : '尚未送達') : p, personOf(at));
    const note = status === '尚未提交' ? `彙整後提交給${sec}審核群組` : status === '被退回' ? `${up}退回，請修正後重新提交` : '';
    const mine2 = { ...base, kind: 'out', id: `out-${sec}`, title: `${sec} 明細表`, status, at, reviewUnit: at, submitter: status === '尚未提交' ? '' : me, waitDays: 0, note };
    if (status === '尚未提交') mine2.submitDate = '';
    return { level, unit, items: [], mine: mine2, upper: at };
  }

  // 我提交的（提交者角度）
  let mine = null;
  if (['段', '處', '會計處'].includes(level)) { // 段以上提交的是明細表
    const own = level === '會計處' ? '全公司' : unit;
    const up = upperOf(unit, level);
    const p = inParent(unit, level);
    // 用同一個序號，讓提交者與審核者看到的日期、天數一致
    const idx = level === '段' ? Math.max(0, (SECTIONS_OF[up] || []).indexOf(unit)) : level === '處' ? DEPTS.indexOf(unit) + 1 : 0;
    const base = inRow(own, level, idx, p, personOf(up));
    const status = { 待審: '審核中', 已核准: '已核准', 已退回: '被退回', 尚未送達: '尚未提交' }[p];
    let note = '';
    if (status === '尚未提交' && level === '處') {
      const ok = items.filter((r) => r.status === '已核准').length;
      note = `所屬段已核准 ${ok}／${items.length}，全部核准後提交給${up}`;
    } else if (status === '尚未提交' && level === '會計處') {
      const ok = items.filter((r) => r.status === '已核准').length;
      note = `各處已核准 ${ok}／${items.length}，全部核准後提交給${up}`;
    } else if (status === '尚未提交') note = `審核完成後提交給${up}`;
    else if (status === '被退回') note = `${up}退回，請修正後重新提交`;
    if (level === '段') base.title = `${unit} 明細表`;
    mine = { ...base, kind: 'out', id: `out-${own}`, status, at: up, reviewUnit: up, submitter: status === '尚未提交' ? '' : me, waitDays: 0, note,
      sentDays: status === '審核中' ? base.waitDays : 0 };
    if (status === '尚未提交') mine.submitDate = '';
  }

  // 11/13 使用者：預算編列＝填表，填表沒有審核、不是待辦；待辦只代表審核相關作業（明細表）
  //   段：沒有收到要審核的項目；只有自己彙整後提交給處的明細表
  //   室：只填表，沒有待辦
  if (level === '段' && mine.status === '尚未提交') {
    mine.note = `各室填表期限已到並自動鎖定，彙整成明細表後提交給${mine.at}`;
  }
  items.forEach((r) => { r.reviewUnit = reviewUnit; });
  return { level, unit, items, mine, upper: mine?.at || '' };
}

// ─────────────────────────────────────────────────────────────
// 狀態全面調整（11/12 使用者）：只用四種
//   全部、待審（待我本人審核）、已完成（我已核准或退回；我送出的被核准或被退回也算——case close）、已送審（我已提交、還在上一層）
//   尚未送達（下一層還沒送來）不列入清單；我自己尚未提交的只顯示在「我提交的」進度列
//   result 保留原本的結果（已核准／已退回／被退回），畫面顯示「已完成・核准」等
// ─────────────────────────────────────────────────────────────
const IN_GROUP = { 待審: '我待審', 已核准: '已完成', 已退回: '已完成' };
// 11/18 使用者：待辦只剩兩種狀態——我待審、已完成。以「我」的角度：我提交出去就算已完成（原「已送審」），
//   到下一關的人那裡則是他的「我待審」；不以整筆資料是否結案來區分。被退回＝回到我手上，要重新提交→我待審
// 11/18 使用者：尚未提交＝在我手上 → 我待審
const OUT_GROUP = { 尚未提交: '我待審', 審核中: '已完成', 已核准: '已完成', 被退回: '我待審' };
// 11/18 使用者：子狀態（PAW 作業狀態）——進行中、等待我批准、已退回
const PHASE = { in: { 待審: '等待我批准', 已核准: '進行中', 已退回: '已退回' }, out: { 尚未提交: '進行中', 審核中: '進行中', 已核准: '進行中', 被退回: '已退回' } };
export const phaseOf = (r) => PHASE[r.kind]?.[r.result || r.status] || '';
export const toGroup = (r) => (r.kind === 'out' ? OUT_GROUP[r.status] : IN_GROUP[r.status]);
function reviewSnapshot(user) {
  const raw = rawSnapshot(user);
  // 11/18 批准人（首頁版2 待辦顯示）：我收到的＝我本人；我提交的＝上一層的審核人；管理者看各筆的審核單位。之後改讀 Plan 的設定
  const approverOf = (r) => {
    if (raw.admin) return { approver: personOf(r.reviewUnit), approverUnit: r.reviewUnit };
    if (r.kind === 'out') return { approver: personOf(r.reviewUnit || raw.upper), approverUnit: r.reviewUnit || raw.upper };
    return { approver: user?.name || '', approverUnit: r.reviewUnit };
  };
  const conv = (r) => ({ ...r, phase: PHASE[r.kind]?.[r.status] || '', ...approverOf(r), result: r.status, status: toGroup(r) });
  const items = raw.items.filter(toGroup).map(conv);
  // 11/13 使用者：室只填表，不送審也不審核，我的待辦（審核流程）不會有項目
  // 11/18 使用者：室級承辦提交明細表後也會出現在待辦（已完成）
  if (raw.mine && toGroup(raw.mine)) items.push(conv(raw.mine));
  // mine：給「我提交的」進度列，尚未提交時保留「尚未提交」
  const mine = raw.mine ? { ...raw.mine, phase: PHASE.out[raw.mine.status] || '', result: raw.mine.status, status: toGroup(raw.mine) || '尚未提交' } : null;
  const pendingIn = raw.items.filter((r) => r.status === '尚未送達').length;
  return { ...raw, items, mine, notArrived: pendingIn };
}

// 我的待辦＝我的審查（11/12 使用者：待辦與審核是同一件事；室＝預算編列，段以上＝明細表）
//   收到的：待審（截止＝送達後 7 天）／尚未送達／已完成（我已核准或退回）
//   我提交的：尚未提交（截止＝提交期限）／被退回（截止＝重新提交期限）／審核中（提交日）／已完成（上一層已核准）
//   室：沒有審核；待辦是自己這一室的預算編列（提交給段）
const TODAY = '2026-11-12';
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
// 11/13 使用者：審核＝審自己內部的（處審核所屬段的明細表）；審查＝審其他單位的（會計處審查各處、總公司審查全公司）
function buildTasks(user) {
  // 待辦＝我的審查（11/18 兩種狀態：我待審、已完成）
  const rv = reviewSnapshot(user);
  return rv.items.map((r) => {
    const who = rv.admin ? `（${r.reviewUnit}）` : '';
    if (r.status === '我待審' && r.result === '尚未提交') return { id: r.id, route: 'rv-pending', title: `提交 ${r.title}`, status: '我待審', due: addDays(TODAY, 7), dateLabel: '截止' };
    if (r.status === '我待審' && r.result === '被退回') return { id: r.id, route: 'rv-pending', title: `重新提交 ${r.title}（被退回）`, status: '我待審', due: addDays(r.doneDate || r.submitDate || TODAY, 7), dateLabel: '截止' };
    if (r.status === '我待審') return { id: r.id, route: 'rv-pending', title: rv.admin ? `${r.title}${who}` : `${rv.level === '處' ? '審核' : '審查'} ${r.title}`, status: '我待審', due: addDays(r.submitDate || TODAY, 7), dateLabel: '截止' };
    if (r.result === '審核中') return { id: r.id, route: 'rv-done', title: `${r.title}（已提交${r.at ? `，在${r.at}` : ''}）`, status: '已完成', due: r.submitDate, dateLabel: '提交' };
    const res = { 已核准: '核准', 已退回: '退回', 被退回: '被退回' }[r.result] || '';
    return { id: r.id, route: 'rv-done', title: `${r.title}（${res}）${who}`, status: '已完成', due: r.doneDate, dateLabel: '完成' };
  }).map((x, i) => ({ ...x, phase: rv.items[i].phase || '', late: x.dateLabel === '截止' && x.due && x.due < TODAY }));
}

// 11/18 批准鏈（明細表頁「簽核歷程」的流程圖）：本明細表 → 上一層 → … → 總公司
//   目前用預設規則（上一層單位的審核人）；之後由「預算審查設定」設定，改讀 Plan
const APPROVER_TITLE = { 段: '處長', 處: '會計處審查人', 會計處: '總經理' };
export function approvalChain(unit) {
  const out = [];
  let u = unit;
  let lv = u === '全公司' ? '會計處' : DEPTS.includes(u) ? '處' : '段';
  if (lv === '段') { // 11/18 段內：承辦提交 → 段的審核群組
    const { p, sent } = secState(u);
    out.push({ unit: u, level: '段內', owner: personOf(u), approverUnit: u, approver: personOf(u), approverTitle: '段長', status: !sent ? '尚未送達' : p === '尚未送達' ? '待審' : '已核准' });
  }
  while (lv) {
    const up = lv === '段' ? parentOf(u) : lv === '處' ? '會計處' : '總公司';
    out.push({ unit: u, level: lv, owner: personOf(u), approverUnit: up, approver: personOf(up), approverTitle: APPROVER_TITLE[lv], status: lv === '段' ? secState(u).p : inParent(u, lv) });
    if (lv === '段') { u = up; lv = '處'; } else if (lv === '處') { u = '全公司'; lv = '會計處'; } else lv = '';
  }
  return out;
}
// 明細表（審核頁「費用明細表」頁籤）的列：本單位與下一層預算單位 × 預算表
export function detailUnits(unit) {
  // 11/18 使用者：Admin、會計處看得到每個處（含所屬段）的編列；各處只看自己處
  if (unit === '全公司') return DEPTS.flatMap((d) => [d, ...(SECTIONS_OF[d] || [])]);
  if (DEPTS.includes(unit)) return [unit, ...(SECTIONS_OF[unit] || [])];
  return [unit];
}
export const hashOf = hash;

const mock = {
  // Portal 版3「模組總覽」：各模組的摘要數字、重要事項、常用功能、重要時程
  // budget 可由 TM1／PAW 取得；audit、bi 需 Maximo（MAS 9）提供 API，目前為示意資料
  // Portal 版5：各模組「待審核」筆數（11/12：審核內容尚未定義，先統一稱「待審核」、不顯示量詞；審核會計模組需 MAS 9 API，目前為示意）
  //   預算模組＝登入者「待審」的明細表筆數
  async getPendingCounts(user) {
    await delay(150);
    const rv = await mock.getMyReviewItems(user);
    return {
      budget: { count: rv.items.filter((r) => r.status === '我待審').length, label: '我待審' },
      audit: { count: 23, label: '我待審', sample: true },
    };
  },
  // 我的審查（11/12）：室→段提交「預算編列」；段以上提交「明細表」（由各預算編列表彙整，含收入與費用，數據相同）
  //   同一份明細表只有一個狀態，畫面依「誰在看」顯示不同文字（11/12 使用者同意）：
  //   收到的（我是審核者，items）：待審（輪到我）／尚未送達（下一層還在審）／已核准／已退回（我退回下一層）
  //   我提交的（我是提交者，mine）：尚未提交／審核中（＋目前在哪一層）／被退回（待修正）／已核准
  //   段：收到的＝各室的預算編列；處：所屬各段的明細表；會計處：各處；總公司：全公司（會計處彙整）
  //   室：沒有審核；提交的是自己這一室的預算編列（期限到自動鎖定），由所屬段審查
  //   模擬資料是「全公司同一個時間點」的快照，各層帳號看到的狀態彼此一致
  async getMyReviewItems(user) {
    await delay(200);
    return reviewSnapshot(user);
  },
  // 我的預算審查 List View（11/12 改為明細表）：收到的（kind: 'in'）＋我提交的（kind: 'out'）
  async getReviewRecords(user) {
    await delay(250);
    return reviewSnapshot(user).items;
  },
  // 首頁版4：各類預算編列的最後編輯時間（key＝選單節點 id；之後新增的類別沒有資料時顯示「尚未編輯」）
  async getFormStatus() {
    await delay(150);
    return {
      'bp-overseas': { lastEdited: '2026-11-11 16:42', editor: '王小明' },
      'bp-ict': { lastEdited: '2026-11-10 09:15', editor: '王小明' },
      'bp-expense': { lastEdited: '2026-11-12 10:28', editor: '王小明' },
      'bp-income': { lastEdited: '2026-11-06 14:03', editor: '陳志明' },
      'bp-capex': { lastEdited: '' },
    };
  },
  async getPortalSummary(user) {
    await delay(250);
    const rv = reviewSnapshot(user);
    const pend = rv.items.filter((r) => r.status === '我待審').sort((a, b) => b.waitDays - a.waitDays);
    return {
      updatedAt: '2026-11-10 14:30',
      systems: {
        // 11/12 使用者：版3 只呈現「筆數」（純數字，不用百分比、不用時間點），不再列重要事項
        budget: {
          kpis: [
            { label: '我待審', value: pend.length, tone: pend.length ? 'warn' : undefined },
            { label: '已完成', value: rv.items.filter((r) => r.status === '已完成').length, tone: 'good' },
          ],
          links: [
            { label: '資本支出預算編列', route: 'bf-capex' }, // 11/13：改連各室填表
            { label: '我的待辦', route: 'review-plan' },
            { label: '調整預算作業', route: 'bm-02-adjust' },
          ],
        },
        audit: {
          sample: true,
          kpis: [
            { label: '待審傳票', value: 23, tone: 'warn' },
            { label: '退件待補', value: 4, tone: 'alert' },
            { label: '本月已審', value: 148 },
          ],
          links: [
            { label: '傳票審核', path: '/voucher' },
            { label: '月結作業', path: '/closing' },
            { label: '帳務查詢', path: '/ledger' },
          ],
        },
        bi: {
          sample: true,
          kpis: [
            { label: '新發布報表', value: 3, tone: 'good' },
            { label: '我的儀表板', value: 12 },
            { label: '訂閱報表', value: 5 },
          ],
          links: [
            { label: '經營分析儀表板', path: '/dashboard' },
            { label: '預算執行報表', path: '/dashboard/execution' },
            { label: '運量分析', path: '/dashboard/ridership' },
          ],
        },
      },
      timeline: [
        { date: '11/12', system: 'audit', title: '10 月份月結截止' },
        { date: '11/15', system: 'budget', title: '系統例行維護 22:00–24:00' },
        { date: '11/20', system: 'bi', title: '第 3 季經營分析簡報' },
        { date: '11/30', system: 'budget', title: '116 年度概算填報截止' },
        { date: '12/05', system: 'budget', title: '調整預算作業截止' },
        { date: '12/10', system: 'audit', title: '11 月份月結截止' },
      ],
    };
  },
  // 11/16 使用者：公告標示所屬系統（system：budget／audit／bi）；Admin 在 Portal 的公告管理可新增、修改、排程
  //   只回傳「已發布」的公告（排程時間未到、草稿、已下架都不出現），置頂在前
  async getAnnouncements() {
    await delay(200);
    return publicList();
  },
  // 通知（給個人的訊息；已讀狀態由畫面記錄，正式環境需後端儲存）
  async getNotifications() {
    await delay(150);
    return [
      { id: 'n1', time: '2026-11-10 14:05', type: '審核', title: '「電務處 明細表」已送達，等待您審核', body: '電務處 許志豪 提交。', route: 'rv-pending' },
      { id: 'n2', time: '2026-11-10 10:30', type: '退回', title: '您提交的明細表被退回，請修正後重新提交', body: '退回原因：資本支出設備單價需附報價單。', route: 'rv-done' },
      { id: 'n3', time: '2026-11-09 17:20', type: '提醒', title: '待辦「預算版本建立：116 年度」已逾期', body: '截止日 2026-11-08。', route: 'bm-00-version' },
      { id: 'n4', time: '2026-11-09 09:12', type: '審核', title: '「工務處 明細表」已核准', body: '審核人：王大同。', route: 'rv-done' },
      { id: 'n5', time: '2026-11-08 15:40', type: '提醒', title: '116 年度概算填報將於 11/30 截止', body: '目前 12／18 個單位已送出。', route: 'bm-01' },
      { id: 'n6', time: '2026-11-05 08:00', type: '系統', title: '11/15 (六) 22:00–24:00 系統例行維護', body: '維護期間無法登入。', route: '' },
      { id: 'n7', time: '2026-11-03 11:25', type: '審核', title: '您提交的明細表已核准', body: '審核人：王大同。', route: 'rv-done' },
    ];
  },
  // 我的待辦（11/12）：待辦與我的審查是同一件事——室為預算編列、段以上為明細表（審核者＋提交者角度）
  async getMyTasks(user) {
    await delay(200);
    return buildTasks(user);
  },
  // 嵌入頁（kind: 'api'）的資料
  async fetchEmbed(embed) {
    await delay(350);
    return {
      updatedAt: '2026-11-09 18:45',
      columns: ['科目', '116 年度預算數', '115 年度預算數', '增減數', '增減 %'],
      rows: [
        ['營業收入', 38215, 36880, 1335, 3.6],
        ['營業成本', 33470, 32905, 565, 1.7],
        ['營業費用', 2860, 2795, 65, 2.3],
        ['營業外收入', 1420, 1310, 110, 8.4],
        ['營業外費用', 980, 1012, -32, -3.2],
        ['本期損益', 2325, 1478, 847, 57.3],
      ],
    };
  },
};

const live = {
  // TODO：預算模組由 TM1 計算；審核會計模組、BI 呼叫 MAS 9 提供的摘要 API 後組成相同格式
  async getPortalSummary() {
    return { updatedAt: '', systems: {}, timeline: [] };
  },
  // TODO：依登入者層級取得送到這一層的明細表與自己提交的明細表（PAW Plans 或審核紀錄 Cube），格式同 mock
  async getMyReviewItems() {
    return { level: '', unit: '', items: [], mine: null, upper: '' };
  },
  // TODO：由 TM1 讀取各類預算的最後編輯時間與編輯者
  async getFormStatus() {
    return {};
  },
  // TODO：預算模組由 TM1／PAW Plans 取得；審核會計模組呼叫 MAS 9 API
  async getPendingCounts() {
    return {};
  },
  // TODO：明細表審查紀錄（收到的＋我提交的；可讀 PAW Plans 任務狀態或審核紀錄 Cube），欄位同 mock
  async getReviewRecords() {
    return [];
  },
  // TODO：依實際 Cube 設計改寫，以下為範例
  async getAnnouncements() {
    const res = await tm1.executeMDX(
      "SELECT {[AA_Announce_Measure].[Date],[AA_Announce_Measure].[Tag],[AA_Announce_Measure].[Title]} ON COLUMNS, " +
      "NON EMPTY {TM1SUBSETALL([AA_Announce_Item])} ON ROWS FROM [AA_Announcement]",
    );
    const cols = 3;
    return res.Axes[1].Tuples.map((t, i) => {
      const c = res.Cells.slice(i * cols, i * cols + cols).map((x) => x.FormattedValue);
      return { id: t.Members[0].Name, date: c[0], tag: c[1], title: c[2] };
    });
  },
  // TODO：通知來源（審核流程、待辦到期、系統訊息），格式同 mock
  async getNotifications() {
    return [];
  },
  async getMyTasks() {
    // 可改為讀取 PAW Plans 狀態或自建的工作清單 Cube
    return [];
  },
  // 外部模組 API：回傳 { columns, rows, updatedAt }（依各模組實際格式轉換）
  async fetchEmbed(embed) {
    const base = CFG.systems[embed.system]?.apiBase || '';
    const res = await fetch(base + embed.endpoint, { credentials: 'include' });
    if (!res.ok) throw new Error(`${embed.system} API ${res.status}`);
    return res.json();
  },
};

export const dataService = APP_CONFIG.dataMode === 'live' ? live : mock;
