// ─────────────────────────────────────────────────────────────
// 第三層：各類預算編列的填表工作簿（11/18 使用者）
//   第1層＝Portal、第2層＝首頁、第3層＝從選單或首頁點進去的項目
//   每個類別有一到多張「表」（左側清單，可收合），表裡面像 Excel 一樣可以有多個頁籤；
//   黃底儲存格可以輸入，灰底為自動計算。版面依使用者提供的現行畫面截圖（11/18）。
//   外觀採 Maximo MAS 9 的 Carbon 風格，讓預算模組與審核會計模組看起來像同一套介面。
//
// 資料結構
//   WORKBOOKS[分類代碼] = { notices, sections: [{ id, name, open, assets: [asset] }] }
//   asset = { id, name, kind: 'sheet'（單張表）| 'book'（有頁籤）, sheets: [sheet] }
//   sheet = { id, name, setting（設定頁籤）, title, fields, side, grid | custom }
//   grid  = { head: [[{ l, cs, rs }]], cols: [col], rows: [row], blank, total }
//   col   = { k, t: 'in'（黃底輸入）| 'dd'（黃底下拉）| 'text'（固定文字）| 'calc'（灰底計算）,
//             fmt: 'num' | 'num2' | 'pct' | 'text' | 'date', w, f(r, ctx), g(r)（群組列的算法） }
//   row   = { id, v: { 欄位: 預設值 }, p（上層列）, match（群組列：加總哪些明細列）, band }
//
// Prototype：表名、欄位、示意數字依截圖整理；未提供截圖的「資本支出」為 Claude 暫定。
// 正式環境：表格內容來自預算工作區（TM1 Cube／View），輸入值透過 API 寫回。
// ─────────────────────────────────────────────────────────────

import { makePivotSheet, pivotRows } from '../components/PivotSheet.jsx';
import { codeOf } from './org.js';

export const VERSIONS = ['公司概算版', '公司預算版', '法定預算版'];
export const YEARS = ['116', '115'];

// 共同的表頭欄位（版本、年份、預算單位）
const F = {
  version: { label: '版本', dd: VERSIONS, v: '公司概算版' },
  year: { label: '年份', dd: YEARS, v: '116' },
  unitCode: { label: '預算單位代號', unit: 'code' },
  unitName: { label: '預算單位名稱', unit: 'name' },
  acct: (v, list = [v]) => ({ label: '會計科目', dd: list, v }),
};
const STD = [F.version, F.year, F.unitCode, F.unitName];

// 欄位定義的小工具
const txt = (k, w = 140, extra = {}) => ({ k, t: 'in', fmt: 'text', w, ...extra });
const num = (k, w = 96, extra = {}) => ({ k, t: 'in', fmt: 'num', w, ...extra });
const num2 = (k, w = 96, extra = {}) => ({ k, t: 'in', fmt: 'num2', w, ...extra });
const calc = (k, f, w = 110, extra = {}) => ({ k, t: 'calc', fmt: 'num', w, f, ...extra });
const fixed = (k, w = 140, extra = {}) => ({ k, t: 'text', fmt: 'text', w, ...extra });
const dd = (k, options, w = 140, extra = {}) => ({ k, t: 'dd', fmt: 'text', w, options, ...extra });
const H = (l, cs = 1, rs = 1) => ({ l, cs, rs });
const n = (x) => Number(x) || 0;

// ───────────── 一般收入：貨運、客運收入明細表（12 個月） ─────────────
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
// 11/19 使用者 PAW 截圖：每個月 4 欄＝單位、數量、加權平均單（元）價（灰底＝金額÷數量）、金額（黃底輸入）
const monthCols = () => MONTHS.flatMap((m) => [
  txt(`u${m}`, 60),
  num(`q${m}`, 92),
  calc(`p${m}`, (r) => (n(r[`q${m}`]) ? n(r[`a${m}`]) / n(r[`q${m}`]) : 0), 112, { fmt: 'num2', noTotalSum: true, g: (r) => (n(r[`q${m}`]) ? n(r[`a${m}`]) / n(r[`q${m}`]) : 0) }),
  num(`a${m}`, 100),
]);
const sumCols = [
  txt('unit', 64),
  calc('qty', (r) => MONTHS.reduce((s, m) => s + n(r[`q${m}`]), 0), 100),
  calc('avg', (r) => (n(r.qty) ? n(r.amt) / n(r.qty) : 0), 112, { fmt: 'num2', g: (r) => (n(r.qty) ? n(r.amt) / n(r.qty) : 0), noTotalSum: true }),
  calc('amt', (r) => MONTHS.reduce((s, m) => s + n(r[`a${m}`]), 0), 116),
];
const monthHead = (lead) => [
  [...lead.top, H('預算合計', 4), ...MONTHS.map((m) => H(m, 4))],
  [...lead.sub, ...[0, ...MONTHS].flatMap(() => [H('單位'), H('數量'), H('加權平均單（元）價'), H('金額')])],
];
// 全年數量、金額分到 12 個月（四捨五入，差額放在 12 月；與 PAW 截圖的每月數字一致）
const spread = (q, amt) => {
  const mq = q ? Math.round(q / 12) : 0; const ma = amt ? Math.round(amt / 12) : 0;
  return Object.fromEntries(MONTHS.flatMap((m, i) => [[`q${m}`, q ? (i === 11 ? q - mq * 11 : mq) : ''], [`a${m}`, amt ? (i === 11 ? amt - ma * 11 : ma) : '']]));
};

const FREIGHT_ROWS = (() => {
  const rows = [];
  const grp = (id, name, code, p) => rows.push({ id, p, v: { name, code }, match: { under: id } });
  const leaf = (id, p, name, code, q, amt) => rows.push({ id, p, v: { name, code, ...spread(q, amt) } });
  grp('f0', '貨運收入', '410206');
  grp('f1', '貨運-本路', '41020601', 'f0');
  leaf('f101', 'f1', '普通整車', '4102060101');
  leaf('f102', 'f1', '普通零擔', '4102060102');
  leaf('f103', 'f1', '特價整車', '4102060103', 73252, 177938);
  leaf('f104', 'f1', '特價零擔', '4102060104', 36785, 86608);
  leaf('f105', 'f1', '貨櫃', '4102060105');
  leaf('f106', 'f1', '特種運費', '4102060106');
  leaf('f107', 'f1', '本路公物', '4102060107');
  leaf('f108', 'f1', '本路材料', '4102060108');
  grp('f2', '其他貨運收入-本路', '41020698', 'f0');
  leaf('f201', 'f2', '調車費', '4102069801', 2100, 15912);
  leaf('f202', 'f2', '裝卸費', '4102069802');
  leaf('f203', 'f2', '延期費', '4102069803');
  leaf('f299', 'f2', '4102069898-其他', '4102069898');
  return rows;
})();

const BANDS = ['0~50公里', '51~100公里', '101~200公里', '201公里以上'];
// 11/19 使用者 PAW 截圖：客運收入的科目（每個項目有「全部」與 4 個距離級距）
const PASSENGER_ROWS = (() => {
  const rows = [];
  // 群組：「全部」一列，加上依距離級距加總的四列
  const grp = (id, name, code, p) => {
    rows.push({ id, p, v: { name, code, band: '全部' }, match: { under: id } });
    BANDS.forEach((b, i) => rows.push({ id: `${id}-b${i}`, p: id, v: { name, band: b }, match: { under: id, band: b }, bandSum: true }));
  };
  // 項目：「全部」一列（加總），底下 4 個級距可以輸入
  const item = (id, p, name, code, qs = [], amts = []) => {
    rows.push({ id, p, v: { name, code, band: '全部' }, match: { under: id } });
    BANDS.forEach((b, i) => rows.push({ id: `${id}-${i}`, p: id, band: b, v: { name, band: b, ...spread(qs[i] || 0, amts[i] || 0) } }));
  };
  grp('c0', '客運收入', '410204');
  grp('c1', '客運-本路', '41020401', 'c0');
  item('c11', 'c1', '普通及快車票', '4102040101', [8000000, 8000000, 0, 8000000], [9583333, 9583333, 9583333, 9583334]);
  item('c12', 'c1', '區間車票', '4102040102');
  item('c13', 'c1', '對號快車票', '4102040103');
  item('c14', 'c1', '莒光車票', '4102040104');
  item('c15', 'c1', '自強車票', '4102040105');
  item('c16', 'c1', '復興車票', '4102040106');
  grp('c2', '月台票', '41020402', 'c0');
  item('c21', 'c2', '4102040201-月台票', '4102040201');
  item('c22', 'c2', '補票加重金', '4102040202');
  item('c3', 'c0', '其他客運收入-聯運', '41020442');
  grp('c4', '其他客運收入', '41020498', 'c0');
  item('c41', 'c4', '其他客運收入-本路', '4102049801');
  item('c42', 'c4', '4102049898-其他', '4102049898');
  grp('c5', '郵件', '410204412', 'c0');
  item('c51', 'c5', '4102044120-郵件', '4102044120');
  grp('c6', '包裹', '410204413', 'c0');
  item('c61', 'c6', '4102044130-包裹', '4102044130');
  return rows;
})();

const freightSheet = {
  id: 'freight', name: '貨運收入明細表', title: '貨運收入明細表',
  fields: STD,
  grid: {
    head: monthHead({ top: [H('科目及營運項目', 1), H('IFRS編號', 1, 2)], sub: [H('名稱')] }),
    cols: [fixed('name', 200, { tree: true }), fixed('code', 120), ...sumCols, ...monthCols()],
    rows: FREIGHT_ROWS,
    total: { pos: 'top', label: '勞務收入合計', span: 2 },
    frozen: 2,
  },
};
const passengerSheet = {
  id: 'passenger', name: '客運收入明細表', title: '客運收入明細表',
  fields: STD,
  grid: {
    head: monthHead({ top: [H('科目及營運項目', 1), H('IFRS 編號', 1, 2), H('單位級距', 1, 2)], sub: [H('名稱')] }),
    cols: [fixed('name', 170, { tree: true }), fixed('code', 120), fixed('band', 116), ...sumCols, ...monthCols()],
    rows: PASSENGER_ROWS,
    total: { pos: 'top', label: '勞務收入合計', span: 3 },
    frozen: 3,
  },
};

// ───────────── 一般費用：各計算明細表 ─────────────
const rowsOf = (keys, data) => data.map((d, i) => ({ id: `r${i + 1}`, v: Object.fromEntries(keys.map((k, j) => [k, d[j] ?? ''])) }));

const waterSheet = {
  id: 'water', name: '工作場所水費計算明細表', title: '工作場所水費計算表',
  fields: [...STD, F.acct('510206210411F－工作場所水費')],
  grid: {
    head: [
      [H('預算單位', 3), H('基本費', 4), H('每月用水費', 3), H('全年合計', 1, 2)],
      [H('名稱'), H('代號'), H('水號'), H('口徑'), H('數量'), H('每口徑基本費'), H('金額'), H('用水量'), H('每度'), H('金額')],
    ],
    cols: [
      txt('name', 150), txt('code', 70), txt('meter', 132),
      num('dia', 60, { noTotalSum: true }), num('cnt', 64), num('base', 96, { noTotalSum: true }), calc('baseAmt', (r) => n(r.cnt) * n(r.base), 100),
      num('use', 80), num2('per', 70, { noTotalSum: true }), calc('useAmt', (r) => n(r.use) * n(r.per), 100),
      calc('year', (r) => (n(r.baseAmt) + n(r.useAmt)) * 12, 120),
    ],
    rows: rowsOf(['name', 'code', 'meter', 'dia', 'cnt', 'base', 'use', 'per'], [
      ['八堵道班', '', '11-08-1127-30', 25, 1, 66, 22, 9.3],
      ['八堵分駐所', '', '11-08-1143-00', 13, 1, 18, 22, 9.45],
      ['光復站', '', '1-06-0189-49', 40, 1, 374, 15, 4.93],
      ['復興站', '', '1-12-0102-40', 40, 1, 374, 6, 5.33],
      ['消防栓 1', '', '2-01-0028-88', 100, 1, 10098, 0, 5],
      ['消防栓 2', '', '3-01-0022-49', 100, 1, 10098, 0, 5],
      ['消防栓 3', '', '4-07-0038-78', 100, 1, 10098, 0, 5],
      ['消防栓 4', '', '4-13-0036-49', 100, 1, 10098, 3, 4.67],
      ['臺北維保班', '', '', '', 1, '', 1, 161],
      ['萬華道班分攤', '', '4-16-011287-2', '', 1, '', 9, 14.44],
      ['段本部', '', 'C5-40-5536-00', 25, 1, 132, 145, 11.52],
    ]),
    blank: 5,
    total: { pos: 'top', label: '費用（總計）', span: 3 },
  },
};

// 11/19 使用者 PAW 截圖：動力費計算明細表＝月計（基本電費、流動電費、電費小計）＋年計（總計）＋說明
// 11/19 使用者截圖：資本支出「項目類別」下拉選項
const CX_CATS = ['一、車輛改善', '二、路線改善', '三、站場改善', '四、號誌、電訊及電力設備改善', '五、車站營運及服務設備改善', '六、廠段設備及貨物裝卸設備改善', '七、辦公房舍設施改善', '八、公務車輛改善', '九、資通訊設備改善', '十、其他設備改善', '十一、什項設備改善'];
// 11/19 工具列依 PAW 截圖（使用者：完整工具列一打開就有）：有表格的頁籤預設就是完整工具列；toolbar 'basic'＝截圖中只有一般工具列（貨運收入、2506、服裝費、進修、各設定頁）
// 11/19 使用者截圖：動力費會計科目下拉
const POWER_ACCTS = ['510206210112V-電動機踏車動力費', '510206210132V-電動機踏車動力費', '510207210101V-電氣機車動力費'];
const powerSheet = {
  id: 'power', name: '動力費計算明細表', title: '動力費計算明細表',
  fields: [...STD, F.acct(POWER_ACCTS[0], POWER_ACCTS)],
  side: [
    { label: '調整後金額', key: 'adj', fmt: 'num' },
    { label: '調整金額差距', key: 'diff', calc: (get, total) => (get('adj') === '' ? 0 : n(get('adj')) - n(total.year)) },
  ],
  grid: {
    head: [
      [H('單位別', 2), H('用電種類', 1, 3), H('月計', 8), H('年計'), H('說明', 1, 3)],
      [H('名稱', 1, 2), H('代號', 1, 2), H('基本電費', 3), H('流動電費', 4), H('電費小計', 1, 2), H('總計', 1, 2)],
      [H('使用度數'), H('費率（元）'), H('小計'), H('行駛公里'), H('KWH／公里'), H('費率（元）'), H('小計')],
    ],
    cols: [txt('name', 170), txt('code', 80), txt('use', 90),
      num('kwh', 90), num2('rate', 90, { noTotalSum: true }), calc('baseAmt', (r) => n(r.kwh) * n(r.rate), 110),
      num('km', 100), num2('per', 96, { noTotalSum: true }), num2('rate2', 90, { noTotalSum: true }), calc('flowAmt', (r) => n(r.km) * n(r.per) * n(r.rate2), 120),
      calc('month', (r) => n(r.baseAmt) + n(r.flowAmt), 120), calc('year', (r) => n(r.month) * 12, 130), txt('memo', 200)],
    rows: rowsOf(['name', 'code', 'kwh', 'rate', 'km', 'per', 'rate2', 'memo'], [
      ['電力機車 E500 型', 'E500', 1200, 236.2, 18000, 14.5, 3.62, '契約容量 1,200 kW'],
      ['EMU900 型電聯車', 'EMU900', 900, 236.2, 22000, 11.8, 3.62, ''],
    ]),
    blank: 12,
    total: { pos: 'top', label: '總　　計', span: 2 },
  },
};

const electricSheet = {
  id: 'electric', name: '工作場所電費計算明細表', title: '工作場所電費計算明細表',
  fields: [...STD, F.acct('510206210211F－工作場所電費')],
  grid: {
    head: [[H('用電地點'), H('電號'), H('契約容量（kW）'), H('每月用電度數'), H('每度單價'), H('每月電費'), H('全年電費')]],
    cols: [txt('place', 160), txt('no', 130), num('kw', 110, { noTotalSum: true }), num('kwh', 110), num2('price', 80, { noTotalSum: true }),
      calc('month', (r) => n(r.kwh) * n(r.price), 110), calc('year', (r) => n(r.month) * 12, 120)],
    rows: rowsOf(['place', 'no', 'kw', 'kwh', 'price'], [
      ['段本部辦公室', '01-2345-67-89', 120, 18500, 4.12],
      ['八堵道班', '01-3456-78-90', 40, 3200, 4.12],
      ['材料庫', '01-4567-89-01', 25, 1600, 4.12],
    ]),
    blank: 7,
    total: { pos: 'top', label: '合計', span: 2 },
  },
};

const gasSheet = {
  id: 'gas', name: '煤氣費計算明細表', title: '煤氣費計算明細表',
  fields: [...STD, F.acct('510206210611F－煤氣費')],
  grid: {
    head: [[H('使用地點'), H('用途'), H('每月用量（度）'), H('每度單價'), H('每月金額'), H('全年金額')]],
    cols: [txt('place', 160), txt('use', 150), num('qty', 120), num2('price', 90, { noTotalSum: true }), calc('month', (r) => n(r.qty) * n(r.price), 110), calc('year', (r) => n(r.month) * 12, 120)],
    rows: rowsOf(['place', 'use', 'qty', 'price'], [['員工餐廳', '烹調', 420, 18.6], ['宿舍', '熱水', 160, 18.6]]),
    blank: 8,
    total: { pos: 'top', label: '合計', span: 2 },
  },
};

// 11/19 使用者 PAW 截圖：修護費計算表＝費用別（名稱、代號）、契約起訖日期、契約號碼、項目名稱、契約金額、用途內容、116 年度金額、編列依據
const repairSheet = (id, name, acct, accts, data) => ({
  id, name, title: name,
  fields: [F.version, F.year, { label: '預算單位代號', unit: 'code' }, F.unitName, F.acct(acct, accts || undefined)],
  side: [
    { label: '調整後金額', key: 'adj', fmt: 'num' },
    { label: '調整金額差距', key: 'diff', calc: (get, total) => (get('adj') === '' ? 0 : n(get('adj')) - n(total.y116)) },
  ],
  grid: {
    head: [
      [H('費用別', 2), H('契約起訖日期', 2, 2), H('契約號碼', 1, 2), H('項目名稱', 1, 2), H('契約金額', 1, 2), H('用途內容', 1, 2), H('116 年度金額', 1, 2), H('編列依據', 1, 2)],
      [H('名稱'), H('代號')],
    ],
    cols: [txt('name', 170), txt('code', 110), { k: 'from', t: 'in', fmt: 'date', w: 116 }, { k: 'to', t: 'in', fmt: 'date', w: 116 },
      txt('no', 128), txt('item', 128), num('contract', 128), txt('use', 140), num('y116', 140), txt('basis', 180)],
    rows: rowsOf(['name', 'code', 'from', 'to', 'no', 'item', 'contract', 'use', 'y116', 'basis'], data),
    blank: 14,
    total: { pos: 'top', label: '費用總計', span: 2 },
  },
});

const uniformSheet = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'uniform', name: '服裝費彙計表', title: '服裝費彙計表',
  fields: [...STD, F.acct('510206320511F－服裝費－服裝'), { label: '服裝發放對象', dd: ['現場工作人員服裝', '一般員工服裝', '雨具及安全鞋'], v: '現場工作人員服裝' }],
  side: [
    { label: '調整後金額', key: 'adj', fmt: 'num' },
    { label: '調整金額差距', key: 'diff', calc: (get, total) => (get('adj') === '' ? 0 : n(get('adj')) - n(total.amt)) },
  ],
  grid: {
    head: [[H('服裝發放對象', 1, 2), H('現場工作人員服裝', 3), H('備註', 1, 2)], [H('人數'), H('單價'), H('金額')]],
    cols: [dd('who', () => UNIFORM_WHO, 200), num('cnt', 100), num('price', 110, { noTotalSum: true }), calc('amt', (r) => n(r.cnt) * n(r.price), 130), txt('memo', 180)],
    rows: [],
    blank: 12,
    total: { pos: 'top', label: '總計', span: 1 },
  },
};
// 11/19 使用者 PAW 截圖：服裝單價設定作業＝版本、年份、服裝發放對象；各發放對象的單價
const UNIFORM_WHO = ['站務費用', '工務維持', '電務維持', '機務維持', '行車人員', '車上服務員', '地勤人員', '貨運服務費用', '餐旅服務費用', '業務費用', '管理費用', '廚工'];
const uniformPriceSheet = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'uniform-price', name: '服裝單價設定作業', setting: true, title: '服裝單價設定作業', noTitle: true, caption: '服裝單價設定作業',
  fields: [F.version, F.year, { label: '服裝發放對象', dd: ['現場工作人員服裝', '一般員工服裝', '雨具及安全鞋'], v: '現場工作人員服裝' }],
  grid: {
    head: [[H('服裝發放對象'), H('單價')]],
    cols: [fixed('who', 256), num('price', 206, { noTotalSum: true })],
    rows: UNIFORM_WHO.map((w, i) => ({ id: `w${i + 1}`, v: { who: w, price: 3250 } })),
  },
};

// ───────────── 出國計畫：2303 派員出國計畫預算類別表（11/19 使用者提供 PAW 截圖重整） ─────────────
const TRIP_TYPES = ['考察、視察、訪問', '進修、研究、實習', '開會、談判、業務洽談'];
// 版本：依截圖（全部版本底下另有董事會審核版、版本比較）
const TRIP_VERSIONS = ['公司概算版', '公司審核版', '交通部版', '行政院版', '立法院版', '董事會審核版', '版本比較'];
const planNames = (ctx) => ctx.listOf('names', 'name');
// 出國計畫名稱設定：輸入新計畫名稱 → 按「計畫名稱新增」→ 加到下方清單，各頁籤的「計畫名稱」可以選
const NAMES_SHEET = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'names', name: '出國計畫名稱設定', setting: true, title: '出國計畫名稱設定', noTitle: true, custom: 'nameForm',
  form: { caption: '出國計畫名稱設定', label: '新計畫名稱建立', button: '計畫名稱新增', col: 'name', listCaption: '已建立的計畫名稱', ddLabel: '計畫名稱' },
  grid: {
    head: [[H('計畫名稱')]],
    cols: [txt('name', 320)],
    rows: rowsOf(['name'], [['歐洲進修'], ['韓國鐵路'], ['日本鐵道技術考察'], ['學習日本鐵道專業技術及傳承制度'], ['考察日本RTRI，深化台日軌道發展'], ['新購電聯車驗收']]),
    blank: 8,
  },
};
// 各出國類型的類別表：表頭欄位＋明細（旅費預算、最近三次執行情形）；右上「調整後金額／調整金額差距」
// 11/19 使用者截圖（進修、研究、實習）：第 2、3 欄＝擬前往國家、主要研習課程；沒有計畫內容；旅費預算＝生活費、機票…（右側待補）；預算單位名稱在代號前
const BUDGET_STD = [['fare', '交通費'], ['live', '生活費'], ['office', '辦公費']];
const STUDY_OPT = { noContent: true, budget: [['live', '生活費'], ['air', '機票']] };
const tripSheet = (id, name, type, capex, mid, acct, opt = {}) => ({
  ...(opt.toolbar ? { toolbar: opt.toolbar } : {}),
  id, name, title: `派員出國計畫預算類別表－${type}${capex ? '（資本支出）' : ''}`,
  fields: [{ label: '版本', dd: TRIP_VERSIONS, v: '公司概算版' }, F.year, ...(type !== '考察、視察、訪問' ? [F.unitName, F.unitCode] : [F.unitCode, F.unitName]), F.acct(acct), { label: '計畫名稱', ddFrom: planNames, v: '' }],
  side: [
    { key: 'adj', label: '調整後金額', fmt: 'num' },
    { key: 'gap', label: '調整金額差距', calc: (get, total) => (get('adj') === '' ? 0 : n(get('adj')) - n(total.sum)) },
  ],
  grid: {
    unitNote: '單位：新臺幣千元',
    head: [
      [H('出國類型', 1, 2), H('擬前往國家', 1, 2), H(mid, 1, 2), ...(opt.noContent ? [] : [H('計畫內容', 1, 2)]), H('預計前往期間', 2), H('預計天數', 1, 2), H('擬派人數', 1, 2), H('旅費預算', (opt.budget || BUDGET_STD).length + 1), H('最近三次有關同一出國計畫之實際執行情形', 5)],
      [H('起'), H('迄'), ...(opt.budget || BUDGET_STD).map(([, l]) => H(l)), H('合計'), H('出國地點'), H('出國期間（起）'), H('出國期間（迄）'), H('出國人數'), H('國外旅費')],
    ],
    cols: [
      fixed('type', 150, { def: type }), txt('city', 150), txt('org', 190), ...(opt.noContent ? [] : [txt('content', 220)]),
      { k: 'from', t: 'in', fmt: 'date', w: 110 }, { k: 'to', t: 'in', fmt: 'date', w: 110 },
      calc('days', (r) => dayDiff(r.from, r.to), 86), num('ppl', 86),
      ...(opt.budget || BUDGET_STD).map(([k]) => num(k, 96)), calc('sum', (r) => (opt.budget || BUDGET_STD).reduce((a, [k]) => a + n(r[k]), 0), 104),
      txt('pPlace', 120), { k: 'pFrom', t: 'in', fmt: 'date', w: 120 }, { k: 'pTo', t: 'in', fmt: 'date', w: 120 }, num('pPpl', 86), num('pCost', 96),
    ],
    rows: [],
    blank: 1,
    total: { pos: 'bottom', label: '合　　計', span: opt.noContent ? 6 : 7, sumOnly: ['ppl', ...(opt.budget || BUDGET_STD).map(([k]) => k), 'sum'] },
  },
});
function dayDiff(a, b) {
  const pa = Date.parse(String(a || '').replace(/\//g, '-'));
  const pb = Date.parse(String(b || '').replace(/\//g, '-'));
  if (Number.isNaN(pa) || Number.isNaN(pb) || pb < pa) return '';
  return Math.round((pb - pa) / 86400000) + 1;
}
// 出國計畫合併設定：把來源單位的計畫併入另一單位的計畫（例：MPY00 → MMY20）
const mergeSheet = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'merge', name: '出國計畫合併設定', setting: true, title: '出國計畫合併設定', noTitle: true, caption: '出國計畫合併設定',
  fields: [{ label: '預算版本', dd: TRIP_VERSIONS.slice(0, 5), v: '公司概算版' }, { label: '預算年度', dd: YEARS, v: '116' }],
  action: '合併出國計畫', actionMsg: '已依下表把來源單位的出國計畫併入指定單位的計畫。',
  grid: {
    head: [[H('來源單位'), H('來源計畫名稱'), H('併入單位'), H('併入計畫名稱')]],
    cols: [txt('fromUnit', 130), dd('fromPlan', planNames, 320), txt('toUnit', 110), dd('toPlan', planNames, 320)],
    rows: rowsOf(['fromUnit', 'fromPlan', 'toUnit', 'toPlan'], [['MPY00', '學習日本鐵道專業技術及傳承制度', 'MMY20', '考察日本RTRI，深化台日軌道發展']]),
    blank: 10,
  },
};
const OVERSEAS_ACCT = '510205230301F－國外旅費';
const CAPEX_ACCT = '1312020101－運輸設備';

// ───────────── 資通訊：費用明細表（費用彙整／費用明細表／預算調整設定／簽核歷程） ─────────────
const COST_CATS = ['動力費', '水費', '電費', '瓦斯費', '交修費', '機修費', '服裝費', '出國計畫', '一般建築', '客運收入', '貨運收入'];
export const ICT_SUMMARY = {
  id: 'ict-summary', name: '費用彙整', title: '費用明細表', custom: 'buttons',
  fields: [{ label: '預算版本', dd: VERSIONS, v: '公司概算版' }, { label: '預算年度', dd: YEARS, v: '116' }, { label: '單位', dd: ['國營臺灣鐵路股份有限公司'], v: '國營臺灣鐵路股份有限公司' }],
  buttons: ['全部', '動力費', '客運收入', '水費', '電費', '貨運收入', '瓦斯費', '交修費', '出國計畫', '服裝費', '機修費', '一般建築'],
};
const pctFor = (ctx, cat) => {
  const rows = ctx.rowsOf('ict-adjust');
  const hit = rows.find((r) => r.vals.cat === cat && n(r.vals.pct));
  return hit ? n(hit.vals.pct) : 0;
};
// 11/19 使用者：資通訊「費用明細表」依 PAW 截圖改成交叉分析表（單位 × 預算表 × 會計科目）
const ICT_UNITS = ['工務處', '臺北工務段', '宜蘭工務段', '機務處', '臺北機務段', '宜蘭機務段'];
const ICT_DETAIL = makePivotSheet({ id: 'ict-detail', name: '費用明細表', units: ICT_UNITS, adjustId: 'ict-adjust' });
export const ICT_ADJUST = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'ict-adjust', name: '預算調整設定', setting: true, title: '預算調整設定作業', action: '預算調整',
  fields: [{ label: '預算版本', dd: VERSIONS, v: '公司概算版' }, { label: '預算年度', dd: YEARS, v: '116' }],
  grid: {
    head: [[H('項次'), H('單位'), H('會科'), H('費用類別'), H('費用用途'), H('扣除％數'), H('扣除金額')]],
    cols: [fixed('no', 70), txt('unit', 120), txt('acct', 120), dd('cat', ['', ...COST_CATS], 120), txt('use', 150), { k: 'pct', t: 'in', fmt: 'pct', w: 100, noTotalSum: true },
      calc('cut', (r) => pivotRows(ICT_UNITS).filter((d) => (!r.unit || codeOf(d.unit) === r.unit) && (!r.cat || d.cat === r.cat)).reduce((s2, d) => s2 + n(d.amt), 0) * n(r.pct) / 100, 130)],
    rows: Array.from({ length: 10 }, (_, i) => ({ id: `a${i + 1}`, v: { no: String(i + 1).padStart(4, '0'), ...(i === 0 ? { unit: 'EHY00', cat: '機修費', use: '統籌議價節省', pct: 20 } : {}) } })),
  },
};
const ICT_HISTORY = {
  toolbar: 'basic', // 11/19 PAW 截圖：這張只有一般工具列
  id: 'ict-history', name: '簽核歷程', title: '簽核歷程', custom: 'history',
  history: [
    ['2026/11/12 09:20', '王美玲', '數位發展處 資訊規劃科', '建立', '依 116 年度資通訊計畫建立費用明細'],
    ['2026/11/13 15:42', '陳志明', '數位發展處 資訊規劃科', '修改', '新增機房隔間工程'],
    ['2026/11/14 10:05', '林雅婷', '數位發展處', '審核', '請確認伺服器保固延長數量'],
    ['2026/11/15 11:30', '陳志明', '數位發展處 資訊規劃科', '修改', '依意見修正'],
  ],
};
const ictSetting = (id, name, head, cols, data) => ({ id, name, title: name, fields: [F.version, F.year], grid: { head: [head.map((h) => H(h))], cols, rows: rowsOf(cols.map((c) => c.k), data), blank: 4 } });

// ───────────── 資本支出（未提供截圖，Claude 暫定） ─────────────
const CAPEX_PLAN = {
  id: 'cx-plan', name: '計畫明細', title: '資本支出計畫明細表',
  fields: [...STD, { label: '計畫名稱', ddFrom: (ctx) => ctx.listOf('cx-names', 'name'), v: '' }],
  grid: {
    head: [[H('計畫名稱', 1, 2), H('工作項目', 1, 2), H('會計科目', 1, 2), H('單位', 1, 2), H('數量', 1, 2), H('單價', 1, 2), H('總經費', 1, 2), H('分年經費', 3)], [H('116 年度'), H('117 年度'), H('118 年度以後')]],
    cols: [dd('plan', (ctx) => ctx.listOf('cx-names', 'name'), 180), txt('item', 180), txt('acct', 170), txt('unit', 60), num('qty', 70), num('price', 110, { noTotalSum: true }),
      calc('total', (r) => n(r.qty) * n(r.price), 120), num('y116', 110), num('y117', 110), calc('later', (r) => n(r.total) - n(r.y116) - n(r.y117), 120)],
    rows: rowsOf(['plan', 'item', 'acct', 'unit', 'qty', 'price', 'y116', 'y117'], [
      ['段本部辦公廳舍改善', '屋頂防水及外牆整修', '1311010101－房屋及建築', '式', 1, 6800000, 3000000, 3800000],
      ['道班工具更新', '軌道檢測儀', '1312010101－機械及設備', '台', 2, 1250000, 2500000, 0],
    ]),
    blank: 5,
    total: { pos: 'bottom', label: '合　　計', span: 6 },
  },
};
const CAPEX_NAMES = {
  id: 'cx-names', name: '計畫名稱設定', setting: true, title: '資本支出計畫名稱設定',
  fields: [F.version, F.year],
  grid: {
    head: [[H('計畫名稱'), H('計畫類別'), H('計畫期間'), H('說明')]],
    cols: [txt('name', 220), dd('kind', ['新興計畫', '延續計畫'], 120), txt('period', 140), txt('memo', 260)],
    rows: rowsOf(['name', 'kind', 'period', 'memo'], [['段本部辦公廳舍改善', '新興計畫', '116～117 年', ''], ['道班工具更新', '延續計畫', '115～116 年', '']]),
    blank: 4,
  },
};
const capexItemSheet = (id, name, first) => ({
  id, name, title: name,
  fields: [...STD],
  grid: {
    head: [[H(first), H('規格說明'), H('單位'), H('數量'), H('單價'), H('金額'), H('預計採購月份'), H('備註')]],
    cols: [txt('name', 170), txt('spec', 200), txt('unit', 60), num('qty', 70), num('price', 110, { noTotalSum: true }), calc('amt', (r) => n(r.qty) * n(r.price), 120), txt('month', 110), txt('memo', 150)],
    rows: [],
    blank: 10,
    total: { pos: 'top', label: '合計', span: 3 },
  },
});

// ───────────── 各分類的工作簿 ─────────────
// ───────────── 資本支出：一般建築及設備計畫項目彙整表（11/19 使用者 PAW 截圖） ─────────────
const CX_TITLE = '一般建築及設備計畫項目彙整表';
const CX_FIELDS = [
  { label: '版本', dd: VERSIONS, v: '公司概算版' },
  { label: '年份', dd: ['117', '116'], v: '117' },
  F.unitCode,
  { label: '項目類別', dd: CX_CATS, v: '一、車輛改善' },
  { label: '項次', dd: ['0001', '0002', '0003', '0004', '0005'], v: '0001' },
  F.unitName,
];
const cxSheet = (id, name, o) => ({ id, name, title: CX_TITLE, fieldTone: 'pink', fields: CX_FIELDS, ...o });
const CX1 = cxSheet('cx1', '1_項目基本資料', {
  grid: { caption: `${CX_TITLE}－項目基本資料`, rowH: 300,
    head: [[H('項目名稱'), H('計劃案號'), H('新增計劃案號')]],
    cols: [txt('name', 500), txt('caseNo', 180), txt('newCase', 145)], rows: [{ id: 'r1', v: {} }] },
});
const CX_YEARS = [['y112', '112年及以前年度'], ['y113', '113年'], ['y114', '114年'], ['y115', '115年'], ['y116', '116年']];
const CX_SUBJ = [['land', '土地'], ['landImp', '土地改良物'], ['build', '房屋及建築'], ['mach', '機械及設備'], ['trans', '交通及運輸設備'], ['misc', '什項設備']];
const cxTotal = (ctx) => n(ctx.rowsOf('cx3')[0]?.vals.total);
const CX2 = cxSheet('cx2', '2_期程與經費', {
  grid: { caption: `${CX_TITLE}－期程與經費`, rowH: 150,
    head: [[H('計畫期程起'), H('計畫期程迄'), H('總經費（千元）'), H('計畫核定情形'), H('規劃設計及標案處理情形'), H('目前實際／預定進度')]],
    cols: [{ k: 'from', t: 'in', fmt: 'date', w: 144 }, { k: 'to', t: 'in', fmt: 'date', w: 126 }, calc('total', (r, ctx) => cxTotal(ctx), 170),
      txt('approve', 153), txt('design', 270), txt('progress', 225)],
    rows: [{ id: 'r1', v: {} }] },
});
const CX3 = cxSheet('cx3', '3_分年與科目金額', {
  grid: { rowH: 52,
    head: [[H('總經費（仟元）', 1, 2), H('分年計畫', 5)], CX_YEARS.map(([, l]) => H(l))],
    cols: [calc('total', (r) => CX_YEARS.reduce((t, [k]) => t + n(r[k]), 0), 117), ...CX_YEARS.map(([k]) => num(k, 142))],
    rows: [{ id: 'r1', v: {} }] },
  extraGrids: [{ caption: '117年度各預算科目編列金額（加總需等於117年度擬編列預算）', rowH: 52,
    head: [[H('擬編列預算'), ...CX_SUBJ.map(([, l]) => H(l))]],
    cols: [calc('plan', (r) => CX_SUBJ.reduce((t, [k]) => t + n(r[k]), 0), 117), ...CX_SUBJ.map(([k]) => num(k, 142))],
    rows: [{ id: 'r1', v: {} }] }],
});
const CX4 = cxSheet('cx4', '4_備註與審核意見', {
  grid: { caption: `${CX_TITLE}－備註與各處審核意見`, rowH: 300,
    head: [[H('備註說明'), H('會計處初審意見'), H('財務處初審意見'), H('企劃處初審意見'), H('初審建議核列數'), H('複審建議核列數'), H('會審建議核列數')]],
    cols: [txt('memo', 405), txt('acc', 198), txt('fin', 198), txt('plan', 198), num('n1', 117), num('n2', 117), num('n3', 117)],
    rows: [{ id: 'r1', v: {} }] },
});

export const WORKBOOKS = {
  income: {
    sections: [
      { id: 'blank', name: '空表編列', open: true, assets: [
        { id: 'freight', name: '貨運收入明細表', kind: 'sheet', toolbar: 'basic', sheets: [freightSheet] },
        { id: 'passenger', name: '客運收入明細表', kind: 'sheet', sheets: [passengerSheet] },
      ] },
    ],
  },
  expense: {
    sections: [
      { id: 'blank', name: '空表編列', open: true, assets: [
        { id: '2101', name: '2101-動力費計算明細表', kind: 'sheet', toolbar: 'web', sheets: [powerSheet] },
        { id: '2102', name: '2102-工作場所電費計算明細表', kind: 'sheet', sheets: [electricSheet] },
        { id: '2104', name: '2104-工作場所水費計算明細表', kind: 'sheet', sheets: [waterSheet] },
        { id: '2106', name: '2106-煤氣費計算明細表', kind: 'sheet', sheets: [gasSheet] },
        { id: '2505', name: '2505.機械及設備修護費計算表', kind: 'sheet', sheets: [repairSheet('mach', '機械及設備修護費計算表', '510206250511F－機械及設備修護費', null, [['機械及設備修護費', '25051101', '2026/01/01', '2026/12/31', 'TRA-115-0321', '空壓機保養', 960000, '檢修庫空壓機年度保養', 960000, '依契約']])] },
        { id: '2506', name: '2506.交通及運輸設備修護費計算表', kind: 'sheet', toolbar: 'basic', sheets: [repairSheet('trans', '交通及運輸設備修護費計算表', '510206250617V－通訊設備修護費', ['510206250617V－通訊設備修護費', '510206250611F－交通及運輸設備修護費'], [])] },
        { id: '3205', name: '3205.服裝費彙計表', kind: 'book', sheets: [uniformSheet, uniformPriceSheet] },
      ] },
    ],
  },
  overseas: {
    notices: [{ title: '出國計畫預算', date: '2026/11/09', body: '116 年度出國計畫請先在「出國計畫名稱設定」建立計畫名稱，再依出國類型填寫各頁籤；資本支出項下的出國計畫請填在（資本支出）頁籤。' }],
    sections: [
      { id: 'blank', name: '空表編列', open: true, assets: [
        { id: '2303', name: '2303-派員出國計畫預算類別表', kind: 'book', sheets: [
          NAMES_SHEET,
          tripSheet('visit', '考察、視察、訪問', '考察、視察、訪問', false, '擬參加會議或視察機構', OVERSEAS_ACCT),
          tripSheet('study', '進修、研究、實習', '進修、研究、實習', false, '主要研習課程', OVERSEAS_ACCT, { ...STUDY_OPT, toolbar: 'basic' }),
          tripSheet('meet', '開會、談判、業務洽談', '開會、談判、業務洽談', false, '擬參加會議或洽談機構', OVERSEAS_ACCT),
          tripSheet('visit-cx', '考察、視察、訪問（資本支出）', '考察、視察、訪問', true, '擬參加會議或視察機構', CAPEX_ACCT),
          mergeSheet,
          tripSheet('study-cx', '進修、研究、實習（資本支出）', '進修、研究、實習', true, '主要研習課程', CAPEX_ACCT, STUDY_OPT),
          tripSheet('meet-cx', '開會、談判、業務洽談（資本支出）', '開會、談判、業務洽談', true, '擬參加會議或洽談機構', CAPEX_ACCT),
        ] },
      ] },
    ],
  },
  ict: {
    sections: [
      { id: 'collect', name: '資通訊彙集表', open: true, assets: [
        { id: 'ict-cost', name: '費用明細表', kind: 'book', sheets: [ICT_SUMMARY, ICT_DETAIL, ICT_ADJUST] } /* 11/27 移除簽核歷程 */,
      ] },
      // 11/19 使用者：資通訊設定檔只有一個資產「08_資通訊計畫項目設定」；報部表件也是一本「費用明細表」
      { id: 'setting', name: '資通訊設定檔', open: true, assets: [
        { id: 'ict-items', name: '08_資通訊計畫項目設定_PAfile', kind: 'sheet', sheets: [ictSetting('ict-items-s', '資通訊計畫項目設定', ['項目代碼', '項目名稱', '費用類別', '單位', '單價', '說明'],
          [txt('code', 100), txt('name', 200), dd('cat', COST_CATS, 120), txt('unit', 70), num('price', 110), txt('memo', 220)],
          [['IT01', '伺服器維護', '機修費', '台', 85000, ''], ['IT02', '網路設備維護', '機修費', '台', 12000, ''], ['IT03', '機房用電', '電費', '式', '', ''], ['IT04', '車載通訊設備維修', '交修費', '組', 35000, '']])] },
      ] },
      { id: 'report', name: '報部表件', open: true, assets: [
        { id: 'ict-report', name: '費用明細表', kind: 'book', sheets: [ICT_SUMMARY, ICT_DETAIL, ICT_ADJUST] } /* 11/27 移除簽核歷程 */,
      ] },
    ],
  },
  // 11/19 使用者 PAW 截圖：資本支出預算編列＝一般建築及設備計畫項目彙整表（4 個頁籤，頁籤暫時放在最下面）
  capex: {
    sections: [
      { id: 'cx', name: '一般建築及設備計畫預算、公共建設計畫預算', open: true, assets: [
        { id: 'cx-summary', name: '一般建築及設備計畫項目彙整表', kind: 'sheet', tabsBottom: true, toolbar: 'web', sheets: [CX1, CX2, CX3, CX4] },
      ] },
    ],
  },
};

// 管理者自行新增的分類：每張表一個通用空表
export function genericWorkbook(group, tableById) {
  return {
    sections: [{
      id: 'blank', name: '空表編列', open: true,
      assets: group.tables.map(tableById).filter(Boolean).map((t) => ({
        id: t.id, name: `${t.id}-${t.name}`, kind: 'sheet',
        sheets: [{
          id: `g-${t.id}`, name: t.name, title: t.name, fields: STD,
          grid: {
            head: [[H('項目'), H('說明'), H('數量'), H('單價'), H('金額'), H('備註')]],
            cols: [txt('item', 180), txt('desc', 220), num('qty', 80), num('price', 110, { noTotalSum: true }), calc('amt', (r) => n(r.qty) * n(r.price), 130), txt('memo', 180)],
            rows: [], blank: 10, total: { pos: 'top', label: '合計', span: 2 },
          },
        }],
      })),
    }],
  };
}
