// 11/24 使用者：審核會計模組「02.動支管理」底下只留「非工程動支請示登錄」。
//   清單頁（圖1）：左側動作欄＋右側請示單列表；點一筆進入明細頁（圖2、3）：登錄／分年預算／預算查詢／創建資訊 4 個頁籤（圖4～6）。
//   進入明細頁後，左側功能列（Menu）不能再打開，要先回「清單視圖」。資料為示意，含 TEST 的單號一律不列。
import { useMemo, useState } from 'react';
import { toast } from '../components/Notification.jsx';

import search16 from '@carbon/icons/es/search/16.js';
import search20 from '@carbon/icons/es/search/20.js';
import chevDown16 from '@carbon/icons/es/chevron--down/16.js';
import chevLeft16 from '@carbon/icons/es/chevron--left/16.js';
import chevRight16 from '@carbon/icons/es/chevron--right/16.js';
import addAlt16 from '@carbon/icons/es/add--alt/16.js';
import addAlt20 from '@carbon/icons/es/add--alt/20.js';
import save16 from '@carbon/icons/es/save/16.js';
import save20 from '@carbon/icons/es/save/20.js';
import undo16 from '@carbon/icons/es/undo/16.js';
import undo20 from '@carbon/icons/es/undo/20.js';
import printer16 from '@carbon/icons/es/printer/16.js';
import arrowLeft16 from '@carbon/icons/es/arrow--left/16.js';
import arrowLeft20 from '@carbon/icons/es/arrow--left/20.js';
import arrowRight20 from '@carbon/icons/es/arrow--right/20.js';
import overflow16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import bookmarkAdd20 from '@carbon/icons/es/bookmark--add/20.js';
import filter16 from '@carbon/icons/es/filter/16.js';
import filterRemove16 from '@carbon/icons/es/filter--remove/16.js';
import renew16 from '@carbon/icons/es/renew/16.js';
import download16 from '@carbon/icons/es/download/16.js';
import minimize16 from '@carbon/icons/es/minimize/16.js';
import calendar16 from '@carbon/icons/es/calendar/16.js';
import package32 from '@carbon/icons/es/package/32.js';

function I({ d, size }) {
  const s = size || Number(d.attrs.width) || 16;
  return (
    <svg className="au-ico" width={s} height={s} viewBox={d.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {d.content.map((c, i) => { const Tag = c.elem; return <Tag key={i} {...c.attrs} />; })}
    </svg>
  );
}

const fmt = (n, dp = 0) => (n === '' || n == null ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }));
// 請示類別說明（示意）
// 11/24 使用者截圖：B＝固資、C＝材料（D 工程為暫定）
const CAT = { A: '一般支出', B: '固資', C: '材料', D: '工程' };
const UNIT = {
  ENY01: '臺北工務段', TKYA1: '北區營運處', TNYA1: '中區營運處', TSYA1: '南區營運處', WDY00: '富岡機廠會計室', WAY00: '富岡機廠', WFY00: '富岡機廠工作組', MXY00: '潮州機廠',
  MHY00: '', EHY00: '', AAY00: '會計處', CAY00: '財務處', EHY01: '臺北機務段', ENY02: '臺中工務段', MAY00: '機務處',
};
const USE = { 5250: '修理保養及保固', 9511: '', '127A': '', 128: '', 9520: '', 5110: '水電費', 5280: '郵電費' };

// 清單（依截圖；含 TEST 的單號不列，其後補幾筆示意）
const R = (no, cat, yr, req, use, bud, exe, tax, total) => ({ no, cat, yr, req, use, bud, exe, tax, total });
const ROWS0 = [
  R('A15-ENY01-00010-03', 'A', '2026', 'ENY01', '5250', 'ENY01', 'ENY01', 0, 3205968),
  R('A15-TKYA1-00010-04', 'B', '2026', 'TKYA1', '', 'WDY00', 'WFY00', '', ''),
  R('A15-TKYA1-00010-05', 'C', '2026', 'TKYA1', '9511', 'WAY00', 'MXY00', '', ''),
  R('A15-TKYA1-00010-07', 'C', '2026', 'TKYA1', '127A', 'TKYA1', 'TKYA1', '', ''),
  R('A15-TKYA1-00010-08', 'C', '2026', 'TKYA1', '128', 'TKYA1', 'TKYA1', '', ''),
  R('A15-TKYA1-00010-09', 'A', '2026', 'TKYA1', '', '', 'MHY00', '', ''),
  R('A15-TNYA1-00010-06', 'B', '2027', 'TNYA1', '9511', 'TNYA1', 'TNYA1', '', ''),
  R('D10-EHY00-00053A02', 'D', '', 'EHY00', '9520', 'EHY00', 'EHY00', 328122, 7590109),
  R('A15-EHY01-00011-01', 'A', '2026', 'EHY01', '5110', 'EHY01', 'EHY01', 0, 486250),
  R('A15-EHY01-00011-02', 'A', '2026', 'EHY01', '5280', 'EHY01', 'EHY01', 0, 12880),
  R('A15-ENY02-00012-01', 'A', '2026', 'ENY02', '5250', 'ENY02', 'ENY02', 0, 1258400),
  R('A15-MAY00-00013-01', 'B', '2026', 'MAY00', '', 'MAY00', 'MAY00', '', ''),
  R('A15-TSYA1-00014-01', 'C', '2026', 'TSYA1', '9511', 'TSYA1', 'TSYA1', '', ''),
].filter((r) => !/test/i.test(r.no));

// 明細（第一筆依截圖；其他筆示意產生）
const LINE0 = { seq: '', acct: '510206-2201', acctName: '郵費', memo: '3/19 - 4/30郵資', cost: '', costName: '', unit: 'ENY01', price: 10541, qty: 1, tax: 0 };
function detailOf(r) {
  const first = r.no === 'A15-ENY01-00010-03';
  const total = Number(r.total) || 0;
  return {
    ...r,
    tcode: first ? '2' : r.cat === 'B' ? '1' : '2', tname: first ? '勞務' : r.cat === 'B' ? '財物' : '勞務',
    audit: '4', auth: '2', bid: '訂約', contract: '', relay: '', acct: '51', rate: '0.050', regDate: '',
    check: total,
    lines: first ? [LINE0] : total ? [{ ...LINE0, acct: '510203-1101', acctName: r.use === '5110' ? '水電費' : '修理保養費', memo: '示意明細', unit: r.req, price: total, qty: 1 }] : [],
    query: { yr: r.yr || '2026', acctNo: '5102064302', acctName: '機械及設備租金', unit: r.bud || r.req, left: 1047313, used: 0 },
    created: CREATED[r.no] || { by: 'RAY', at: '2026/09/22 4:28 PM', mby: 'NICK', mat: '2026/11/12 9:25 AM' },
    v: assetValues(r),
  };
}

const TABS = ['登錄', '分年預算', '預算查詢', '創建資訊'];

// ───── 11/24 使用者圖2～4：B 類「固定資產購置預算」、C 類「資本料採購」明細頁 ─────
// 欄位規格：[標籤, 必填, [部件...]]；部件 { k 欄位, w 寬, look 放大鏡, ro 唯讀, date, sel 下拉, tg 開關, d 顯示某代碼的單位名稱, star 紅星 }
const BID = ['', '公開招標', '選擇性招標', '限制性招標', '小額採購', '訂約'];
const LAYOUTS = {
  B: {
    title: '固定資產購置預算動支請示單登錄', tabs: ['登錄', '創建資訊'],
    btns: ['工作說明書登錄', '請購資產明細表登錄', '完成確認', '請示單列印'],
    cols: [
      [['請示類別', 0, [{ k: 'cat', ro: 1, w: 84 }, { k: 'catN', ro: 1, w: 84, gap: 1 }]], ['會計年度', 0, [{ k: 'yr', ro: 1, w: 100 }]],
        ['採購種類', 0, [{ k: 'buyType', w: 182 }]], ['計劃類別', 0, [{ k: 'planType', w: 182 }]], ['採購地區', 0, [{ k: 'area', w: 182 }]], ['請示單號', 1, [{ k: 'no', look: 1, ro: 1, w: 220 }]]],
      [['請示單位', 1, [{ k: 'req', look: 1, w: 120 }, { d: 'req', star: 1, w: 122 }]], ['預算單位', 1, [{ k: 'bud', look: 1, w: 120 }, { d: 'bud', star: 1, w: 122 }]],
        ['執行單位', 1, [{ k: 'exe', look: 1, w: 120 }, { d: 'exe', star: 1, w: 122 }]], ['執行號及名稱', 0, [{ k: 'exeNo', w: 150 }, { k: 'exeNoN', ro: 1, w: 150, gap: 20 }]],
        ['執行內容', 0, [{ k: 'exeCt', ro: 1, w: 120 }]], ['權責項目', 1, [{ k: 'tcode', look: 1, w: 120 }, { k: 'tname', ro: 0, star: 1, w: 122 }]], ['授權區分', 1, [{ k: 'auth', w: 120 }]]],
      [['預算登錄日期', 0, [{ k: 'regDate', date: 1, w: 122 }]], ['辦理會計', 0, [{ k: 'acct', w: 122 }]], ['稅率', 0, [{ k: 'rate', w: 122 }]], ['單據張數', 0, [{ k: 'bills', w: 122 }]],
        ['購置理由', 0, [{ k: 'reason', w: 182 }]], ['招標種類', 0, [{ k: 'bid', sel: BID, w: 182 }]], ['裁示?', 0, [{ k: 'ruling', tg: 1 }]]],
    ],
    table: { title: '請購明細', tools: ['download', 'add', 'min'],
      cols: ['序號', '預算科目', '預算科目說明', '預估購價', '縣(市)政府作業費', '相關管理費', '總計', '審核?', '錯誤原因', '審查?', '錯誤原因'] },
    more: ['複製動支請示單', '刪除動支請示單', '新增至書籤'], topMin: false,
  },
  C: {
    title: '資本料採購請示單登錄', tabs: ['登錄', '創建資訊'],
    btns: ['工作說明書登錄', '請購材料明細表登錄', '完成確認', '請示單列印'],
    cols: [
      [['請示類別', 0, [{ k: 'cat', ro: 1, w: 84 }, { k: 'catN', ro: 1, w: 84, gap: 1 }]], ['會計年度', 0, [{ k: 'yr', ro: 1, w: 100 }]],
        ['用途代號', 0, [{ k: 'use', look: 1, w: 120 }, { k: 'useN', ro: 1, w: 120 }]], ['採購地區', 0, [{ k: 'area', w: 182 }]],
        ['請示單號', 1, [{ k: 'no', look: 1, ro: 1, w: 220 }]], ['權責項目', 1, [{ k: 'tcode', look: 1, w: 120 }, { k: 'tname', star: 1, w: 122 }]]],
      [['預算單位', 1, [{ k: 'bud', look: 1, w: 120 }, { d: 'bud', star: 1, w: 122 }]], ['執行單位', 1, [{ k: 'exe', look: 1, w: 120 }, { d: 'exe', star: 1, w: 122 }]],
        ['執行內容', 0, [{ k: 'exeCt', w: 120 }]], ['經辦人', 0, [{ k: 'agent', ro: 1, w: 120 }, { k: 'agentN', w: 120, gap: 1 }]],
        ['工程號及名稱', 0, [{ k: 'proj', look: 1, w: 120 }, { k: 'projN', w: 120 }]], ['案號', 0, [{ k: 'caseNo', w: 120 }]]],
      [['招標種類', 0, [{ k: 'bid', sel: BID, w: 182 }]], ['授權區分', 1, [{ k: 'auth', w: 122 }]], ['預算登錄日期', 0, [{ k: 'regDate', date: 1, w: 122 }]],
        ['稅率', 0, [{ k: 'rate', w: 122 }]], ['附請購明細表張數', 0, [{ k: 'sheets', w: 122 }]], ['裁示?', 0, [{ k: 'ruling', tg: 1 }]]],
    ],
    need: true, sub: '主區域',
    table: { title: '請示單明細行', tools: ['add', 'clear', 'filter', 'download', 'min'],
      cols: ['序號', '預算科目', '預算科目說明', '列帳單位', '列帳單位說明', '預估購價', '運什費', '其他', '營業稅', '總計', '審核?', '錯誤原因', '錯誤說明', '審查?', '錯誤原因', '錯誤說明'] },
    more: ['複製動支請示單', '刪除動支請示單'], topMin: true,
  },
};
const USE_N = { 9511: '計劃型資本支出', 5250: '修理保養及保固', 5110: '水電費', 5280: '郵電費' };
function assetValues(r) {
  const common = { cat: r.cat, catN: CAT[r.cat], yr: r.yr || '2026', no: r.no, req: r.req, bud: r.bud, exe: r.exe, area: '本地', regDate: '', rate: '', bid: '', ruling: false, exeCt: '' };
  if (r.cat === 'B') return { ...common, buyType: '1  土地', planType: '1  計畫型', exeNo: '', exeNoN: '', tcode: '2', tname: '勞務', auth: '1', acct: '', bills: '', reason: '' };
  return { ...common, use: r.use || '9511', useN: USE_N[r.use || '9511'] || '', tcode: '3', tname: '其他項目', auth: '1', agent: '', agentN: '', proj: '', projN: '', caseNo: '', sheets: '', need: '' };
}
const CREATED = {
  'A15-TKYA1-00010-04': { by: 'RAY', at: '2026/10/06 4:50 PM', mby: 'RAY', mat: '2026/10/19 2:38 PM' },
  'A15-TKYA1-00010-05': { by: 'RAY', at: '2026/10/06 5:12 PM', mby: 'RAY', mat: '2026/10/19 2:41 PM' },
};

function Toggle({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={!!on} aria-label={label} className={`dz-tg ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)}><span /></button>;
}
function Part({ p, v, set }) {
  if (p.tg) return <Toggle on={v[p.k]} onChange={set(p.k)} label={p.k} />;
  if (p.sel) return <span className="dz-in sel" style={{ width: p.w }}><select value={v[p.k]} onChange={(e) => set(p.k)(e.target.value)}>{p.sel.map((o) => <option key={o} value={o}>{o}</option>)}</select></span>;
  const val = p.d ? (UNIT[v[p.d]] || '') : v[p.k];
  return (
    <>
      {p.star ? <i className="dz-star">*</i> : null}
      {p.gap ? <span className="dz-gapx" style={p.gap > 1 ? { width: p.gap } : undefined} /> : null}
      <In v={val} ro={!!p.ro || !!p.d} look={!!p.look} date={!!p.date} w={p.w} onChange={p.d ? undefined : set(p.k)} />
    </>
  );
}

function SideActs({ items, more, onCollapse, back, collapsed }) {
  if (collapsed) {
    return <aside className="dz-side mini"><button type="button" className="dz-ibtn" aria-label="展開動作欄" onClick={onCollapse}><I d={chevRight16} /></button></aside>;
  }
  return (
    <aside className="dz-side">
      {back && (
        <div className="dz-side-top">
          <button type="button" className="dz-back" onClick={back}><I d={arrowLeft16} /> 清單視圖</button>
          <button type="button" className="dz-ibtn" aria-label="收合動作欄" onClick={onCollapse}><I d={chevLeft16} /></button>
        </div>
      )}
      <div className="dz-side-srow">
        <label className="dz-side-search"><I d={search16} /><input placeholder="尋找導覽項目" aria-label="尋找導覽項目" /></label>
        {!back && <button type="button" className="dz-ibtn" aria-label="收合動作欄" onClick={onCollapse}><I d={chevLeft16} /></button>}
      </div>
      <button type="button" className="dz-side-q" onClick={() => toast({ kind: 'info', title: '可用的查詢', subtitle: '示意：正式環境會列出已儲存的查詢。' })}>可用的查詢 <I d={chevDown16} /></button>
      <p className="dz-side-h">共用動作</p>
      {items.map(([ico, label, fn, dis]) => (
        <button key={label} type="button" className="dz-act" disabled={dis} onClick={fn}>{ico ? <I d={ico} /> : null}<span>{label}</span></button>
      ))}
      {more && <p className="dz-side-h">更多動作</p>}
      {more && more.map(([label, fn]) => <button key={label} type="button" className="dz-act plain" onClick={fn}><span>{label}</span></button>)}
    </aside>
  );
}

function F({ label, req, children, w }) {
  return (
    <div className="dz-f" style={w ? { '--w': w } : undefined}>
      <label>{req && <i>*</i>}{label}</label>
      <div className="dz-fv">{children}</div>
    </div>
  );
}
const In = ({ v, onChange, ro, num, look, w, date }) => (
  <span className={`dz-in ${ro ? 'ro' : ''} ${num ? 'num' : ''}`} style={w ? { width: w } : undefined}>
    <input value={v ?? ''} readOnly={ro} onChange={(e) => onChange?.(e.target.value)} />
    {look && <I d={search20} size={18} />}{date && <I d={calendar16} />}
  </span>
);

export default function AuditDisburse({ onDetail, demo }) {
  const [rows, setRows] = useState(ROWS0);
  const [cur, setCur] = useState(null); // 明細的 index
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('登錄');
  const [sideMini, setSideMini] = useState(false);
  const [fltOn, setFltOn] = useState(false);
  const [flt, setFlt] = useState({});
  const [subTab] = useState('年預算');

  const cols = [
    ['no', '請示單號'], ['cat', '請示類別'], ['yr', '會計年度'], ['req', '請示單位'], ['reqN', '請示單位說明'], ['use', '用途代號'], ['useN', '用途說明'],
    ['bud', '預算單位'], ['budN', '預算單位說明'], ['exe', '執行單位'], ['tax', '稅額'], ['total', '總金額合計'],
  ];
  const view = (r) => ({ ...r, reqN: UNIT[r.req] || '', useN: USE[r.use] || '', budN: UNIT[r.bud] || '', tax: r.tax === '' ? '' : fmt(r.tax, 2), total: fmt(r.total) });
  const shown = useMemo(() => rows.map(view).filter((r) => cols.every(([k]) => !flt[k] || String(r[k]).includes(flt[k]))), [rows, flt]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (i) => { setCur(i); setDraft(detailOf(rows[i])); setDirty(false); setTab('登錄'); onDetail(true); };
  const toList = () => { setCur(null); setDraft(null); onDetail(false); };
  const set = (k) => (v) => { setDraft((d) => ({ ...d, [k]: v })); setDirty(true); };
  const save = () => { setRows((rs) => rs.map((r, i) => (i === cur ? { ...r, cat: draft.cat, yr: draft.yr, use: draft.use, req: draft.req, bud: draft.bud, exe: draft.exe } : r))); setDirty(false); toast({ kind: 'success', title: '已儲存動支請示單', subtitle: `${draft.no}（示意，未寫入正式資料）` }); };
  const addNew = () => {
    const no = `A15-ENY01-${String(20 + rows.length).padStart(5, '0')}-01`;
    const r = R(no, 'A', '2026', 'ENY01', '', 'ENY01', 'ENY01', '', '');
    setRows((rs) => [...rs, r]); setCur(rows.length); setDraft({ ...detailOf(r), lines: [], check: '' }); setDirty(true); setTab('登錄'); onDetail(true);
  };
  const go = (d) => { const n = cur + d; if (n >= 0 && n < rows.length) open(n); };

  // ─────────── 清單頁（圖1） ───────────
  if (cur == null) {
    return (
      <div className="dz">
        <div className="dz-title"><h1>非工程動支請示登錄</h1>
          <div className="dz-title-tools"><button type="button" className="dz-ibtn" aria-label="搜尋"><I d={search16} /></button><button type="button" className="dz-ibtn" aria-label="更多"><I d={overflow16} /></button><span className="dz-vsep" /><button type="button" className="dz-ibtn" aria-label="新增動支請示單" data-tip="新增動支請示單" onClick={addNew}><I d={addAlt20} /></button></div>
        </div>
        <div className="dz-body">
          <SideActs collapsed={sideMini} onCollapse={() => setSideMini(!sideMini)} items={[[addAlt16, '開始登錄作業', addNew]]} more={[]} />
          <div className="dz-content">
            <button type="button" className="dz-btn" onClick={() => demo('工程動支請示')}>工程動支請示</button>
            <button type="button" className="dz-tlink" onClick={() => setFlt({ cat: 'D' })}>[示範調整] D 類工程</button>
            <section className="dz-table">
              <header><span>({shown.length ? 1 : 0} - {shown.length}/{shown.length})</span>
                <div>
                  <button type="button" className="dz-ibtn" aria-label="清除過濾" data-tip="清除過濾" disabled={!Object.values(flt).some(Boolean)} onClick={() => setFlt({})}><I d={filterRemove16} /></button>
                  <button type="button" className={`dz-ibtn ${fltOn ? 'on' : ''}`} aria-label="過濾" data-tip="過濾" onClick={() => setFltOn(!fltOn)}><I d={filter16} /></button>
                  <button type="button" className="dz-ibtn" aria-label="重新整理" data-tip="重新整理" onClick={() => toast({ kind: 'success', title: '已重新整理' })}><I d={renew16} /></button>
                  <button type="button" className="dz-ibtn" aria-label="下載" data-tip="下載" onClick={() => demo('下載清單')}><I d={download16} /></button>
                  <button type="button" className="dz-ibtn" aria-label="縮小" data-tip="縮小" onClick={() => setSideMini(!sideMini)}><I d={minimize16} /></button>
                </div>
              </header>
              <div className="dz-scroll">
                <table>
                  <thead><tr>{cols.map(([k, l]) => <th key={k} className={k === 'tax' || k === 'total' ? 'num' : ''}>{l}</th>)}<th className="dz-bm" /></tr>
                    {fltOn && <tr className="dz-flt">{cols.map(([k]) => <th key={k}><input value={flt[k] || ''} onChange={(e) => setFlt({ ...flt, [k]: e.target.value })} aria-label={`過濾`} /></th>)}<th /></tr>}
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const i = rows.findIndex((x) => x.no === r.no);
                      return (
                        <tr key={r.no} onClick={() => open(i)}>
                          {cols.map(([k]) => <td key={k} className={k === 'tax' || k === 'total' ? 'num' : ''}>{k === 'no' ? <button type="button" className="dz-rowlink" onClick={(e) => { e.stopPropagation(); open(i); }}>{r.no}</button> : r[k]}</td>)}
                          <td className="dz-bm"><button type="button" className="dz-ibtn" aria-label="新增至書籤" onClick={(e) => { e.stopPropagation(); toast({ kind: 'success', title: '已新增至書籤', subtitle: r.no }); }}><I d={bookmarkAdd20} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {shown.length === 0 && <p className="dz-none">沒有要顯示的列。</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ─────────── B、C 類明細頁（11/24 圖2～4） ───────────
  function renderAsset(L) {
    const d = draft; const v = d.v;
    const toolIco = { add: [addAlt16, '新增'], clear: [filterRemove16, '清除過濾'], filter: [filter16, '過濾'], download: [download16, '下載'], min: [minimize16, '縮小'] };
    const t = L.tabs.includes(tab) ? tab : '登錄';
    return (
      <div className="dz is-detail">
        <div className="dz-crumb"><button type="button" onClick={toList}>非工程動支請示登錄</button> /
          <span className="dz-crumb-r"><button type="button" onClick={() => { toList(); toast({ kind: 'info', title: '已退回清單' }); }}>退回</button><button type="button" onClick={() => demo('傳回值')}>傳回值</button></span>
        </div>
        <div className="dz-title"><h1>{L.title}</h1>
          <div className="dz-title-tools">
            <button type="button" className="dz-ibtn" aria-label="搜尋"><I d={search16} /></button><button type="button" className="dz-ibtn" aria-label="更多"><I d={overflow16} /></button><span className="dz-vsep" />
            <button type="button" className="dz-ibtn" aria-label="新動支請示單" data-tip="新增" onClick={addNew}><I d={addAlt20} /></button>
            <button type="button" className="dz-ibtn" aria-label="儲存" data-tip="儲存" disabled={!dirty} onClick={save}><I d={save20} /></button>
            {!L.topMin && <>
              <button type="button" className="dz-ibtn" aria-label="清除變更" data-tip="清除變更" onClick={resetDraft}><I d={undo20} /></button>
              <button type="button" className="dz-ibtn" aria-label="上一筆" data-tip="上一筆" disabled={cur === 0} onClick={() => go(-1)}><I d={arrowLeft20} /></button>
              <button type="button" className="dz-ibtn" aria-label="下一筆" data-tip="下一筆" disabled={cur === rows.length - 1} onClick={() => go(1)}><I d={arrowRight20} /></button>
            </>}
          </div>
        </div>
        <div className="dz-body">
          <SideActs collapsed={sideMini} onCollapse={() => setSideMini(!sideMini)} back={toList}
            items={[[addAlt16, '新動支請示單', addNew], [save16, '儲存動支請示單', save, !dirty], [undo16, '清除變更', resetDraft], [printer16, '請示單列印', () => demo('請示單列印')]]}
            more={L.more.map((m) => [m, m === '新增至書籤' ? () => toast({ kind: 'success', title: '已新增至書籤', subtitle: d.no }) : () => demo(m)])} />
          <div className="dz-content detail">
            <div className="dz-tabs" role="tablist">
              {L.tabs.map((x) => <button key={x} type="button" role="tab" aria-selected={t === x} className={t === x ? 'on' : ''} onClick={() => setTab(x)}>{x}</button>)}
              <button type="button" className="dz-tabs-more" aria-label="更多頁籤" onClick={() => demo('更多頁籤')}><I d={chevDown16} /></button>
            </div>
            {t === '登錄' ? (
              <>
                <div className="dz-panel">
                  <div className="dz-btns">{L.btns.map((b) => <button key={b} type="button" className="dz-btn" onClick={() => (b === '完成確認' ? toast({ kind: 'success', title: '完成確認', subtitle: `${d.no}（示意）` }) : demo(b))}>{b}</button>)}</div>
                  <div className="dz-form asset">
                    {L.cols.map((col, ci) => (
                      <div key={ci} className="dz-fcol">
                        {col.map(([label, req, parts]) => <F key={label} label={label} req={!!req}>{parts.map((p, pi) => <Part key={pi} p={p} v={v} set={setV} />)}</F>)}
                      </div>
                    ))}
                  </div>
                </div>
                {L.need && <div className="dz-panel dz-need"><F label="需料原因"><In v={v.need} onChange={setV('need')} w={464} /></F></div>}
                {L.sub ? <div className="dz-subtabs"><button type="button" className="on">{L.sub}</button></div> : <div className="dz-gap-row" />}
                <section className="dz-table">
                  <header><span>{L.table.title}　(0 - 0/0)</span>
                    <div>{L.table.tools.map((k) => <button key={k} type="button" className="dz-ibtn" aria-label={toolIco[k][1]} data-tip={toolIco[k][1]} disabled={k === 'clear' || k === 'download'}
                      onClick={() => (k === 'min' ? setSideMini(!sideMini) : demo(`${L.table.title}・${toolIco[k][1]}`))}><I d={toolIco[k][0]} /></button>)}</div>
                  </header>
                  <div className="dz-scroll">
                    <table><thead><tr>{L.table.cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead></table>
                    <div className="dz-emptybox"><I d={package32} size={64} /><p>沒有要顯示的列。</p></div>
                  </div>
                </section>
              </>
            ) : (
              <div className="dz-card dz-q2" style={{ width: 534 }}>
                <F label="建立者"><In v={d.created.by} ro w={164} /></F>
                <F label="最後異動者"><In v={d.created.mby} ro w={164} /></F>
                <F label="建立時間"><In v={d.created.at} ro w={164} /></F>
                <F label="最後異動時間"><In v={d.created.mat} ro w={164} /></F>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────── 明細頁（圖2～6） ───────────
  const d = draft;
  const sum = d.lines.reduce((a, l) => a + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const totalAmt = Number(d.total) || sum;
  const lineCols = [
    ['seq', '序號', 140], ['acct', '預算科目', 140, 'look'], ['acctName', '預算科目說明', 300], ['memo', '摘要', 300, 'look'], ['cost', '成本項目', 140, 'look'],
    ['costName', '成本項目說明', 110, 'text'], ['unit', '列帳單位', 140, 'look'], ['unitName', '列帳單位說明', 300], ['price', '單價', 86, 'num'], ['qty', '數量', 140],
    ['amt', '金額', 140, 'num'], ['tax', '稅額', 140, 'num'], ['sum', '合計', 70, 'text'],
    // 11/24 使用者圖1：最後面再補審核／審查欄位
    ['audit', '審核?', 70, 'tg'], ['err', '錯誤原因', 86, 'text'], ['errN', '錯誤原因說明', 110, 'text'], ['review', '審查?', 70, 'tg'], ['rej', '審查駁回原因', 110, 'text'], ['revN', '審查說明', 90, 'text'],
  ];
  const L = LAYOUTS[d.cat];
  const resetDraft = () => { setDraft(detailOf(rows[cur])); setDirty(false); };
  const setV = (k) => (val) => { setDraft((x) => ({ ...x, v: { ...x.v, [k]: val } })); setDirty(true); };
  if (L) return renderAsset(L);
  return (
    <div className="dz is-detail">
      <div className="dz-crumb"><button type="button" onClick={toList}>非工程動支請示登錄</button> /
        <span className="dz-crumb-r"><button type="button" onClick={() => { toList(); toast({ kind: 'info', title: '已退回清單' }); }}>退回</button><button type="button" onClick={() => demo('傳回值')}>傳回值</button></span>
      </div>
      <div className="dz-title"><h1>一般支出動支請示單登錄</h1>
        <div className="dz-title-tools">
          <button type="button" className="dz-ibtn" aria-label="搜尋"><I d={search16} /></button><button type="button" className="dz-ibtn" aria-label="更多"><I d={overflow16} /></button><span className="dz-vsep" />
          <button type="button" className="dz-ibtn" aria-label="新增動支請示單" data-tip="新增" onClick={addNew}><I d={addAlt20} /></button>
          <button type="button" className="dz-ibtn" aria-label="儲存" data-tip="儲存" disabled={!dirty} onClick={save}><I d={save20} /></button>
          <button type="button" className="dz-ibtn" aria-label="清除變更" data-tip="清除變更" onClick={() => { setDraft(detailOf(rows[cur])); setDirty(false); }}><I d={undo20} /></button>
          <button type="button" className="dz-ibtn" aria-label="上一筆" data-tip="上一筆" disabled={cur === 0} onClick={() => go(-1)}><I d={arrowLeft20} /></button>
          <button type="button" className="dz-ibtn" aria-label="下一筆" data-tip="下一筆" disabled={cur === rows.length - 1} onClick={() => go(1)}><I d={arrowRight20} /></button>
        </div>
      </div>
      <div className="dz-body">
        <SideActs collapsed={sideMini} onCollapse={() => setSideMini(!sideMini)} back={toList}
          items={[[addAlt16, '新增動支請示單', addNew], [save16, '儲存動支請示單', save, !dirty], [undo16, '清除變更', () => { setDraft(detailOf(rows[cur])); setDirty(false); }], [printer16, '請示單列印', () => demo('請示單列印')]]}
          more={[['複製動支請示單', () => demo('複製動支請示單')], ['刪除動支請示單', () => demo('刪除動支請示單')], ['新增至書籤', () => toast({ kind: 'success', title: '已新增至書籤', subtitle: d.no })]]} />
        <div className="dz-content detail">
          <div className="dz-tabs" role="tablist">
            {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
            <button type="button" className="dz-tabs-more" aria-label="更多頁籤" onClick={() => demo('更多頁籤')}><I d={chevDown16} /></button>
          </div>

          {tab === '登錄' && (
            <>
              <div className="dz-panel">
                <div className="dz-btns"><button type="button" className="dz-btn" onClick={() => demo('工作說明書登錄')}>工作說明書登錄</button><button type="button" className="dz-btn" onClick={() => toast({ kind: 'success', title: '完成確認', subtitle: `${d.no}（示意）` })}>完成確認</button></div>
                <div className="dz-form">
                  <div className="dz-fcol">
                    <F label="請示類別"><In v={d.cat} onChange={set('cat')} ro w={120} /><In v={CAT[d.cat] || ''} ro w={122} /></F>
                    <F label="會計年度"><In v={d.yr} ro w={120} /></F>
                    <F label="請示單號" req><In v={d.no} look w={220} ro /></F>
                    <F label="用途代號"><In v={d.use} onChange={set('use')} look w={120} /><In v={USE[d.use] || ''} ro w={122} /></F>
                    <F label="請示單位"><In v={d.req} onChange={set('req')} look w={120} /><In v={UNIT[d.req] || ''} ro w={122} /></F>
                    <F label="預算單位"><In v={d.bud} onChange={set('bud')} look w={120} /><In v={UNIT[d.bud] || ''} ro w={122} /></F>
                    <F label="預算登錄日期"><In v={d.regDate} onChange={set('regDate')} date w={120} /></F>
                  </div>
                  <div className="dz-fcol">
                    <F label="執行單位" req><In v={d.exe} onChange={set('exe')} look w={120} /><In v={UNIT[d.exe] || ''} ro w={122} /></F>
                    <F label="權責項目" req><In v={d.tcode} onChange={set('tcode')} look w={120} /><In v={d.tname} ro w={122} /></F>
                    <F label="審核單位" req><In v={d.audit} onChange={set('audit')} w={122} /></F>
                    <F label="授權區分" req><In v={d.auth} onChange={set('auth')} w={122} /></F>
                    <F label="招標別"><span className="dz-in sel" style={{ width: 184 }}><select value={d.bid} onChange={(e) => set('bid')(e.target.value)}><option>訂約</option><option>公開招標</option><option>限制性招標</option><option>小額採購</option></select></span></F>
                    <F label="合約號"><In v={d.contract} onChange={set('contract')} w={122} /></F>
                  </div>
                  <div className="dz-fcol">
                    <F label="核轉"><In v={d.relay} onChange={set('relay')} w={122} /></F>
                    <F label="辦理會計"><In v={d.acct} onChange={set('acct')} w={122} /></F>
                    <F label="稅率"><In v={d.rate} onChange={set('rate')} w={122} /></F>
                    <F label="稅額"><In v={fmt(d.tax || 0, 2)} ro num w={122} /></F>
                    <F label="金額檢核"><In v={fmt(d.check)} onChange={(v) => set('check')(v.replace(/,/g, ''))} num w={122} /></F>
                    <F label="金額合計"><In v={fmt(totalAmt)} ro num w={122} /></F>
                    <F label="總金額合計"><In v={fmt(totalAmt)} ro num w={122} /></F>
                  </div>
                </div>
              </div>
              <div className="dz-subtabs"><button type="button" className="on">明細表</button></div>
              <section className="dz-table">
                <header><span>請示單明細　({d.lines.length ? 1 : 0} - {d.lines.length}/{d.lines.length})</span>
                  <div>
                    <button type="button" className="dz-ibtn" aria-label="新增明細" data-tip="新增明細" onClick={() => { setDraft({ ...d, lines: [...d.lines, { seq: '', acct: '', acctName: '', memo: '', cost: '', costName: '', unit: d.req, price: '', qty: 1, tax: 0 }] }); setDirty(true); }}><I d={addAlt16} /></button>
                    <button type="button" className="dz-ibtn" aria-label="清除過濾" disabled><I d={filterRemove16} /></button>
                    <button type="button" className="dz-ibtn" aria-label="過濾" data-tip="過濾" onClick={() => demo('明細過濾')}><I d={filter16} /></button>
                    <button type="button" className="dz-ibtn" aria-label="下載" data-tip="下載" onClick={() => demo('下載明細')}><I d={download16} /></button>
                    <button type="button" className="dz-ibtn" aria-label="縮小" data-tip="縮小" onClick={() => setSideMini(!sideMini)}><I d={minimize16} /></button>
                  </div>
                </header>
                {/* 11/24 圖2、圖3：明細欄位較多，往右捲動可看到成本項目～合計 */}
                <div className="dz-scroll">
                  <table className="dz-lines">
                    <colgroup>{lineCols.map(([k, , w]) => <col key={k} style={{ width: w }} />)}</colgroup>
                    <thead><tr>{lineCols.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
                    <tbody>
                      {d.lines.map((l, i) => {
                        const amt = (Number(l.price) || 0) * (Number(l.qty) || 0);
                        const setL = (k) => (v) => { setDraft({ ...d, lines: d.lines.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }); setDirty(true); };
                        return (
                          <tr key={i}>
                            {lineCols.map(([k, , , t]) => {
                              if (k === 'costName') return <td key={k}>{l.costName}</td>;
                              if (k === 'sum') return <td key={k} />;
                              if (t === 'tg') return <td key={k}><Toggle on={l[k]} onChange={setL(k)} label={k} /></td>;
                              if (t === 'text') return <td key={k}>{l[k] || ''}</td>;
                              if (k === 'unitName') return <td key={k}><In v={UNIT[l.unit] || ''} ro /></td>;
                              if (k === 'amt') return <td key={k}><In v={fmt(amt)} ro num /></td>;
                              if (k === 'tax') return <td key={k}><In v={fmt(l.tax || 0, 2)} ro num /></td>;
                              if (k === 'price') return <td key={k}><In v={l.price === '' ? '' : fmt(l.price)} num onChange={(v) => setL('price')(v.replace(/,/g, ''))} /></td>;
                              return <td key={k}><In v={l[k]} look={t === 'look'} onChange={setL(k)} /></td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {d.lines.length === 0 && <p className="dz-none">沒有要顯示的列。</p>}
                </div>
                <footer>{d.lines.length ? 1 : 0} - {d.lines.length}/{d.lines.length}</footer>
              </section>
            </>
          )}

          {tab === '分年預算' && (
            <div className="dz-card" style={{ width: 720 }}>
              <div className="dz-inline"><F label="請示單號"><In v={d.no} ro w={220} /></F><F label="會計年度"><In v={d.yr} ro w={122} /></F></div>
              <section className="dz-table flat">
                <header><span>分年預算　(0 - 0/0)</span>
                  <div><button type="button" className="dz-ibtn" aria-label="新增" onClick={() => demo('新增分年預算')}><I d={addAlt16} /></button><button type="button" className="dz-ibtn" disabled aria-label="清除過濾"><I d={filterRemove16} /></button><button type="button" className="dz-ibtn" aria-label="過濾"><I d={filter16} /></button><button type="button" className="dz-ibtn" disabled aria-label="下載"><I d={download16} /></button><button type="button" className="dz-ibtn" aria-label="縮小"><I d={minimize16} /></button></div>
                </header>
                <table><thead><tr><th>預算科目</th><th>科目名稱</th><th>動支本年度預算</th><th>以後年度預算數</th><th>動支預算合計</th></tr></thead></table>
                <div className="dz-emptybox"><I d={package32} size={64} /><p>沒有要顯示的列。</p></div>
              </section>
            </div>
          )}

          {tab === '預算查詢' && (
            <div className="dz-card" style={{ width: 720 }}>
              <div className="dz-inline">
                <F label="會計年度"><In v={d.query.yr} w={100} /></F>
                <F label="會計科目"><In v={d.query.acctNo} look w={142} /><In v={d.query.acctName} ro w={142} /></F>
                <button type="button" className="dz-btn sm" onClick={() => toast({ kind: 'success', title: '查詢完成', subtitle: `${d.query.acctName}（示意）` })}>查詢</button>
              </div>
              <div className="dz-inline"><F label="預算單位"><In v={d.query.unit} look w={120} /><In v={UNIT[d.query.unit] || ''} ro w={120} /></F></div>
              <div className="dz-subtabs in"><button type="button" className="on">{subTab}</button></div>
              <div className="dz-q">
                <F label="預算餘額"><In v={fmt(d.query.left)} ro num w={142} /></F>
                <F label="動支數"><In v={fmt(d.query.used)} ro w={142} /></F>
                <F label="尚可支出"><In v={fmt(d.query.left - d.query.used)} ro num w={142} /></F>
              </div>
            </div>
          )}

          {tab === '創建資訊' && (
            <div className="dz-card dz-q2" style={{ width: 534 }}>
              <F label="建立者"><In v={d.created.by} ro w={164} /></F>
              <F label="最後異動者"><In v={d.created.mby} ro w={164} /></F>
              <F label="建立時間"><In v={d.created.at} ro w={164} /></F>
              <F label="最後異動時間"><In v={d.created.mat} ro w={164} /></F>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
