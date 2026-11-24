// 11/20 使用者：審核會計模組先做一層「皮」——第一頁（啟動中心）的示意畫面，讓使用者從 Portal、預算模組的「切換模組」
//   可以進入，並能從右上角切換回系統入口或其他模組。版面依使用者提供的 3 張現行畫面截圖：
//   1. 展開左側功能列（覆蓋在內容上） 2. 收合後只剩圖示欄 3. 右下角 AI「會計選單小幫手」
//   頁籤只做「審核會計」；「Administration」只有系統管理員看得到（點了只顯示示意訊息）。
//   左側 11 個會計模組、98 個功能的名稱為 Claude 暫定的示意名稱（啟動中心卡片上的連結依截圖）。
import { useEffect, useMemo, useRef, useState } from 'react';
import emblemWhite from '../assets/emblem-white.png';
import { APP_CONFIG, portalSystems, isSystemOpen, CLOSED_HINT } from '../config/appConfig.js';
import { switchSystem } from '../nodeActions.js';
import { navigate } from '../useHashRoute.js';
import { toast } from '../components/Notification.jsx';
import { SessionTimer } from '../session.jsx';
import UserSwitcher from '../components/UserSwitcher.jsx';
import SystemSwitcher from '../components/SystemSwitcher.jsx';
import AuditDisburse from './AuditDisburse.jsx';

import menu16 from '@carbon/icons/es/menu/20.js';
import close20 from '@carbon/icons/es/close/20.js';
import close16 from '@carbon/icons/es/close/16.js';
import search16 from '@carbon/icons/es/search/16.js';
import search20 from '@carbon/icons/es/search/20.js';
import home16 from '@carbon/icons/es/home/16.js';
import dashboard16 from '@carbon/icons/es/dashboard/16.js';
import chartLine16 from '@carbon/icons/es/chart--line/16.js';
import catalog16 from '@carbon/icons/es/catalog/16.js';
import receipt16 from '@carbon/icons/es/receipt/16.js';
import docTasks16 from '@carbon/icons/es/document--tasks/16.js';
import report16 from '@carbon/icons/es/report/16.js';
import money16 from '@carbon/icons/es/money/16.js';
import userMulti16 from '@carbon/icons/es/user--multiple/16.js';
import percentage16 from '@carbon/icons/es/percentage/16.js';
import finance16 from '@carbon/icons/es/finance/16.js';
import analytics16 from '@carbon/icons/es/analytics/16.js';
import flow16 from '@carbon/icons/es/flow/16.js';
import settingsAdj16 from '@carbon/icons/es/settings--adjust/16.js';
import testTool16 from '@carbon/icons/es/test-tool/16.js';
import cloud16 from '@carbon/icons/es/cloud-services/16.js';
import task16 from '@carbon/icons/es/task/16.js';
import docSigned16 from '@carbon/icons/es/document--signed/16.js';
import building16 from '@carbon/icons/es/building/16.js';
import locked16 from '@carbon/icons/es/locked/16.js';
import switcher20 from '@carbon/icons/es/switcher/20.js';
import chevDown16 from '@carbon/icons/es/chevron--down/16.js';
import chevRight16 from '@carbon/icons/es/chevron--right/16.js';
import filter16 from '@carbon/icons/es/filter/16.js';
import filterRemove16 from '@carbon/icons/es/filter--remove/16.js';
import add20 from '@carbon/icons/es/add/20.js';
import edit16 from '@carbon/icons/es/edit/16.js';
import renew16 from '@carbon/icons/es/renew/16.js';
import settings16 from '@carbon/icons/es/settings/16.js';
import maximize20 from '@carbon/icons/es/maximize/20.js';
import minimize20 from '@carbon/icons/es/minimize/20.js';
import launch16 from '@carbon/icons/es/launch/16.js';
import location16 from '@carbon/icons/es/location--filled/16.js';
import pedestrian16 from '@carbon/icons/es/pedestrian/16.js';
import logout16 from '@carbon/icons/es/logout/16.js';
import arrowLeft16 from '@carbon/icons/es/arrow--left/16.js';
import docProtected16 from '@carbon/icons/es/document--protected/16.js';
import docView16 from '@carbon/icons/es/document--view/16.js';
import rocket16 from '@carbon/icons/es/rocket/16.js';
import userFollow16 from '@carbon/icons/es/user--follow/16.js';
import calHeat16 from '@carbon/icons/es/calendar--heat-map/16.js';
import chartBar16 from '@carbon/icons/es/chart--bar/16.js';
import network16 from '@carbon/icons/es/network--3/16.js';
import searchLocate16 from '@carbon/icons/es/search--locate/16.js';

function I({ d, size, className = '' }) {
  const s = size || Number(d.attrs.width) || 16;
  return (
    <svg className={`au-ico ${className}`} width={s} height={s} viewBox={d.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {d.content.map((c, i) => { const Tag = c.elem; return <Tag key={i} {...c.attrs} />; })}
    </svg>
  );
}

// ───────────── 左側功能列（11 個會計模組、98 個功能為示意） ─────────────
export const AUDIT_MODULES = [
  { id: 'm00', label: '00.預算編列', icon: chartLine16, budget: true, items: ['前往預算模組'] },
  // 11/20 使用者截圖：01、02、06 改用現行選單內容（含 TEST 字樣的項目一律不列）
  { id: 'm01', label: '01.預算管控', icon: docProtected16, items: ['資本支出預算檔', '費用預算檔', '專案計畫'] },
  // 11/24 使用者：02.動支管理底下只有「非工程動支請示登錄」
  { id: 'm02', label: '02.動支管理', icon: receipt16, items: ['非工程動支請示登錄'] },
  { id: 'm03', label: '03.採購履約', icon: docView16, items: ['請購單', '採購單', '採購案查詢', '決標登錄', '履約管理', '驗收登錄', '合約變更', '保證金管理', '廠商資料維護', '採購統計'] },
  { id: 'm04', label: '04.請款報銷', icon: report16, items: ['請款報銷單登錄', '請款報銷單查詢', '差旅費報支', '零用金報支', '預付款申請', '預付款沖轉', '代墊款報銷', '請款退件處理', '憑證黏存單', '請款進度查詢'] },
  { id: 'm05', label: '05.收入作業', icon: rocket16, items: ['收入通知單', '應收帳款維護', '收入傳票', '收據開立', '收入調整', '呆帳處理', '收入彙總', '應收帳齡分析'] },
  { id: 'm06', label: '06.收付款作業', icon: userFollow16, items: ['收款作業', '銀行帳戶維護', '檔別維護', '金融機構維護', '財收支科目設定', '額度管理', '付款通知單', '付款傳票', '支票開立'] },
  { id: 'm07', label: '07.稅務作業', icon: money16, items: ['營業稅申報', '扣繳憑單', '進項發票登錄', '銷項發票登錄', '發票作廢', '稅額試算', '二代健保補充保費', '稅務報表'] },
  { id: 'm08', label: '08.總帳作業', icon: calHeat16, items: ['總帳會計科目維護', '總帳會計期間', '總帳傳票', '轉帳傳票', '傳票審核', '傳票過帳', '試算表', '明細分類帳', '月結作業', '年結作業'] },
  { id: 'm10', label: '10.分析師', icon: chartBar16, items: ['財務報表', '預算執行分析', '費用分析', '收入分析', '自訂報表', '報表排程', '儀表板設計', '資料匯出'] },
  { id: 'm11', label: '11.規劃', icon: network16, items: ['年度工作計畫', '中長程計畫', '資本計畫', '計畫進度', '計畫成本', '計畫變更', '計畫評核', '計畫查詢'] },
  { id: 'm12', label: '12.系統管理', icon: settingsAdj16, items: ['使用者', '安全群組', '簽核流程設定', '代碼維護', '組織維護', '會計年度設定', '介面排程', '系統參數', '稽核紀錄', '公告管理'] },
  { id: 'm13', label: '13.測試中功能', icon: searchLocate16, items: ['測試功能 A', '測試功能 B'] },
  { id: 'it', label: 'IT 基礎架構', icon: cloud16, items: ['系統資源', '介面監控'] },
  { id: 'job', label: '作業管理', icon: task16, items: ['工作單', '工作排程'] },
  { id: 'contract', label: '合約', icon: docSigned16, items: ['採購合約', '租賃合約'] },
  { id: 'bim', label: '大廈資訊模型', icon: building16, items: ['建物資料', '空間管理'] },
  { id: 'sec', label: '安全', icon: locked16, items: ['使用者', '安全群組'] },
];
// 11/20 使用者：一般使用者（以 EHY00 為例）左側功能列顯示較少，依截圖；系統管理員看完整清單
// 11/20 使用者：選單內容若有 TEST 字樣一律刪除（不分大小寫）
const NO_TEST = (x) => !/test/i.test(x);
AUDIT_MODULES.forEach((m) => { m.items = m.items.filter(NO_TEST); });
// 11/24 使用者：選單只保留第一層，只有 02.動支管理 可以展開到「非工程動支請示登錄」；其他模組的功能名稱留在 allItems 備查
AUDIT_MODULES.forEach((m) => { m.allItems = m.items; if (m.id !== 'm02') m.items = []; });
// 11/24 使用者：有數字的模組一律依截圖呈現 00～13（含 03、04），一般使用者其後接採購、管理
const USER_MODULE_IDS = ['m00', 'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm10', 'm11', 'm12', 'm13', 'buy', 'mgr'];
const EXTRA_USER_MODULES = [
  { id: 'buy', label: '採購', icon: docTasks16, items: ['請購單', '採購單', '採購案查詢', '驗收登錄'] },
  { id: 'mgr', label: '管理', icon: userMulti16, items: ['使用者資料', '變更密碼', '預設啟動中心'] },
];
EXTRA_USER_MODULES.forEach((m) => { m.allItems = m.items; m.items = []; });
export const modulesFor = (isAdmin) => (isAdmin ? AUDIT_MODULES
  : USER_MODULE_IDS.map((id) => AUDIT_MODULES.find((m) => m.id === id) || EXTRA_USER_MODULES.find((m) => m.id === id)));

// 啟動中心卡片（依截圖）
// 11/24 使用者：預算與動支位置調換
const LAUNCH = [
  { title: '動支', links: [['m02', '非工程動支請示登錄']] },
  { title: '預算', links: [['m01', '資本支出預算檔'], ['m01', '費用預算檔']] },
  { title: '總帳', links: [['m08', '總帳會計科目維護'], ['m08', '總帳會計期間'], ['m08', '總帳傳票']] },
];

// 公佈欄（11/20 使用者截圖）；點主旨展開內容
const BULLETIN = [
  { id: 'b1', subject: '臺鐵會計系統再造案-系統測試公告', msg: '', sent: '2026/11/03 12:05:28', due: '2026/11/25 12:05:28', viewed: 'N' },
  { id: 'b2', subject: '預算系統設計書', msg: '', sent: '2026/11/03 11:22:00', due: '2026/12/24 11:22:00', viewed: 'N' },
  { id: 'b3', subject: '臺鐵會計系統再造案-系統測試公告', msg: '核心內容架構＊測試範圍：＊測試方法：＊資源與時程：＊問題回報方式（示意內容）', sent: '2026/10/20 09:41:53', due: '2029/02/28 09:47:00', viewed: 'N' },
];

// ───────────── 小幫手：關鍵字 → 功能 ─────────────
const SYNONYM = [
  [/轉帳傳票/, '08.總帳作業', '轉帳傳票'], [/請款|報銷/, '04.請款報銷', '請款報銷單登錄'], [/動支/, '02.動支管理', '非工程動支請示登錄'], [/專案/, '01.預算管控', '專案計畫'],
  [/採購單|採購/, '03.採購履約', '採購單'], [/請購/, '03.採購履約', '請購單'], [/差旅|出差/, '04.請款報銷', '差旅費報支'],
  [/零用金/, '04.請款報銷', '零用金報支'], [/傳票審核|審核傳票/, '08.總帳作業', '傳票審核'], [/過帳/, '08.總帳作業', '傳票過帳'],
  [/月結/, '08.總帳作業', '月結作業'], [/年結/, '08.總帳作業', '年結作業'], [/科目/, '08.總帳作業', '總帳會計科目維護'],
  [/會計期間/, '08.總帳作業', '總帳會計期間'], [/試算/, '08.總帳作業', '試算表'], [/付款|匯款/, '06.收付款作業', '付款通知單'], [/銀行帳戶/, '06.收付款作業', '銀行帳戶維護'], [/額度/, '06.收付款作業', '額度管理'],
  [/支票/, '06.收付款作業', '支票開立'], [/收款/, '06.收付款作業', '收款作業'], [/發票/, '07.稅務作業', '進項發票登錄'],
  [/營業稅/, '07.稅務作業', '營業稅申報'], [/扣繳/, '07.稅務作業', '扣繳憑單'], [/應收/, '05.收入作業', '應收帳款維護'],
  [/收入/, '05.收入作業', '收入通知單'], [/資本支出/, '01.預算管控', '資本支出預算檔'],
  [/預算/, '01.預算管控', '費用預算檔'], [/報表/, '10.分析師', '財務報表'], [/驗收/, '03.採購履約', '驗收登錄'],
  [/廠商/, '03.採購履約', '廠商資料維護'], [/權限|安全群組/, '12.系統管理', '安全群組'], [/簽核|流程/, '12.系統管理', '簽核流程設定'],
];
const QUICK = ['動支請示單怎麼開立', '非工程動支請示登錄', '轉帳傳票怎麼開', '請款在哪'];
const QUERY_OF = (mod, name) => mod.items.find((x) => x !== name && /查詢/.test(x) && x.slice(0, 2) === name.slice(0, 2)) || mod.items.find((x) => /查詢/.test(x));

function findFn(q, mods, allFns) {
  const t = q.replace(/\s+/g, '');
  const exact = allFns.find((f) => t.includes(f.name));
  if (exact) return exact;
  for (const [re, modLabel, name] of SYNONYM) {
    if (re.test(t)) {
      const mod = mods.find((m) => m.label === modLabel);
      if (!mod) return { denied: modLabel, name };
      return { mod, name, key: `${mod.id}:${name}` };
    }
  }
  return null;
}
function suggest(q, allFns) {
  const chars = [...new Set(q.replace(/[\s，。？?！!怎麼在哪裡如何要開立的我]/g, ''))];
  if (!chars.length) return [];
  return allFns.map((f) => ({ f, s: chars.filter((c) => f.name.includes(c)).length }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4).map((x) => x.f);
}

const HKEY = (u) => `aa.audit.helper.${u.id}`;
const loadHist = (u) => { try { return JSON.parse(localStorage.getItem(HKEY(u)) || '[]'); } catch { return []; } };

function Helper({ user, mods, onGo, onWalk }) {
  const allFns = useMemo(() => mods.flatMap((m) => m.items.map((it) => ({ mod: m, name: it, key: `${m.id}:${it}` }))), [mods]);
  const acct = mods.filter((m) => /^(0[1-8]|1[0-2])\./.test(m.label));
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(false);
  const [tab, setTab] = useState('qa');
  const [hist, setHist] = useState(() => loadHist(user));
  const [msgs, setMsgs] = useState(() => { const h = loadHist(user); return h.length ? [{ divider: true }, ...h.slice(-1)[0].msgs] : []; });
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const inRef = useRef(null);
  useEffect(() => { try { localStorage.setItem(HKEY(user), JSON.stringify(hist.slice(-30))); } catch { /* ignore */ } }, [hist, user]);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, open, tab]);
  useEffect(() => { if (open) setTimeout(() => inRef.current?.focus(), 60); }, [open]);

  const answer = (q) => {
    const f = findFn(q, mods, allFns);
    if (f?.denied) return { q, denied: f };
    if (f && f.mod.budget) return { q, budget: true };
    if (f && !f.mod.items.includes(f.name)) return { q, closed: { mod: f.mod.label, name: f.name } };
    if (f) return { q, fn: { modId: f.mod.id, mod: f.mod.label, name: f.name, query: QUERY_OF(f.mod, f.name) } };
    return { q, miss: suggest(q, allFns).map((x) => ({ modId: x.mod.id, mod: x.mod.label, name: x.name })) };
  };
  const ask = (text) => {
    const q = text.trim(); if (!q) return;
    setInput(''); setTab('qa');
    const a = answer(q);
    setMsgs((m) => [...m, { me: q }, a]);
    setHist((h) => [...h, { at: new Date().toLocaleString('zh-TW', { hour12: false }), q, msgs: [{ me: q }, a] }]);
  };
  const newChat = () => { setMsgs([]); setTab('qa'); };

  const fnBlock = (fn) => (
    <div className="ah-card">
      <p className="ah-label"><I d={location16} className="ah-pin" /> 位置</p>
      <p className="ah-path">左側功能列 › <span className="ah-chip">{fn.mod}</span> › <span className="ah-chip">{fn.name}</span></p>
      <p className="ah-label"><I d={pedestrian16} className="ah-feet" /> 進入步驟</p>
      <ol className="ah-steps">
        <li>在左側功能列找到「{fn.mod}」（滑鼠移過去會展開）</li>
        <li>點「{fn.name}」進入</li>
      </ol>
      <div className="ah-acts">
        <button type="button" className="ah-btn pri" onClick={() => { onGo(fn.modId, fn.name); setOpen(false); }}>帶我過去</button>
        <button type="button" className="ah-btn" onClick={() => { onWalk(fn.modId, fn.name); setOpen(false); }}>一步一步帶</button>
        <button type="button" className="ah-btn" onClick={() => { onGo(fn.modId, fn.name, 'new'); setOpen(false); }}>開始登錄</button>
        {fn.query && <button type="button" className="ah-btn" onClick={() => { onGo(fn.modId, fn.query); setOpen(false); }}>條件查詢</button>}
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <section className={`ah ${big ? 'big' : ''}`} role="dialog" aria-label="會計選單小幫手">
          <header className="ah-head">
            <div><b>會計選單小幫手</b><small>輸入想做的事，例如「轉帳傳票怎麼開」</small></div>
            <button type="button" onClick={newChat} title="新對話" aria-label="新對話"><I d={add20} /></button>
            <button type="button" onClick={() => setBig(!big)} title={big ? '還原' : '放大'} aria-label={big ? '還原' : '放大'}><I d={big ? minimize20 : maximize20} /></button>
            <button type="button" onClick={() => setOpen(false)} title="關閉" aria-label="關閉"><I d={close20} /></button>
          </header>
          <div className="ah-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'qa'} className={tab === 'qa' ? 'on' : ''} onClick={() => setTab('qa')}>問答</button>
            <button type="button" role="tab" aria-selected={tab === 'hist'} className={tab === 'hist' ? 'on' : ''} onClick={() => setTab('hist')}>歷史</button>
          </div>
          {tab === 'qa' ? (
            <div className="ah-list" ref={listRef}>
              <div className="ah-card ah-hello">
                <p>嗨！告訴我你想做什麼，我會告訴你在哪個選單、怎麼操作。</p>
                <small>目前開放：02.動支管理 › 非工程動支請示登錄（其他 {Math.max(acct.length - 1, 0)} 個會計模組尚未開放）</small>
              </div>
              {msgs.map((m, i) => (
                m.divider ? <p key={i} className="ah-divider">— 上次問到這裡（完整紀錄在「歷史」）—</p>
                : m.me ? <div key={i} className="ah-me"><span>{m.me}</span></div>
                : m.fn ? <div key={i}>{fnBlock(m.fn)}</div>
                : m.denied ? (
                  <div key={i} className="ah-card"><p>「{m.denied.name}」在「{m.denied.denied}」底下，你目前的權限沒有這個模組。如需使用，請洽系統管理員開通。</p></div>
                ) : m.closed ? (
                  <div key={i} className="ah-card"><p>「{m.closed.name}」屬於「{m.closed.mod}」，這個模組目前還沒開放。審核會計模組目前只開放「02.動支管理 › 非工程動支請示登錄」。</p>
                    <div className="ah-acts"><button type="button" className="ah-btn pri" onClick={() => { onGo('m02', '非工程動支請示登錄'); setOpen(false); }}>前往非工程動支請示登錄</button></div></div>
                ) : m.budget ? (
                  <div key={i} className="ah-card"><p>預算編列在「預算模組」裡。點下面就會在新視窗開啟預算模組首頁。</p>
                    <div className="ah-acts"><button type="button" className="ah-btn pri" onClick={() => switchSystem('budget')}>前往預算模組</button></div></div>
                ) : (
                  <div key={i} className="ah-card"><p>找不到完全符合「{m.q}」的功能。{m.miss?.length ? '你要找的是不是：' : '可以換個說法，或輸入功能名稱試試。'}</p>
                    {m.miss?.length > 0 && <div className="ah-acts">{m.miss.map((x) => <button key={x.mod + x.name} type="button" className="ah-btn" onClick={() => ask(x.name)}>{x.name}</button>)}</div>}</div>
                )
              ))}
            </div>
          ) : (
            <div className="ah-list">
              {hist.length === 0 ? <p className="ah-empty">還沒有提問紀錄。</p> : (
                <ul className="ah-hist">
                  {[...hist].reverse().map((h, i) => (
                    <li key={i}><button type="button" onClick={() => { setMsgs(h.msgs); setTab('qa'); }}><b>{h.q}</b><small>{h.at}</small></button></li>
                  ))}
                </ul>
              )}
              {hist.length > 0 && <button type="button" className="ah-clear" onClick={() => { setHist([]); setMsgs([]); }}>清除歷史</button>}
            </div>
          )}
          <div className="ah-quick">{QUICK.map((q) => <button key={q} type="button" onClick={() => ask(q)}>{q}</button>)}</div>
          <form className="ah-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input ref={inRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="輸入問題或功能名稱..." aria-label="輸入問題或功能名稱" maxLength={100} />
            <button type="submit">問</button>
          </form>
        </section>
      )}
      <button type="button" className="ah-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? '關閉會計選單小幫手' : '開啟會計選單小幫手'} title="會計選單小幫手"><I d={search20} size={24} /></button>
    </>
  );
}

// ───────────── 背景：山景與列車（原創示意） ─────────────
function Scenery() {
  return (
    <svg className="au-scenery" viewBox="0 0 1600 260" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="auSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef2f7" stopOpacity="0" /><stop offset="1" stopColor="#e3eaf2" /></linearGradient>
      </defs>
      <rect width="1600" height="260" fill="url(#auSky)" />
      <path d="M700 260 C820 170 900 150 1010 120 C1120 90 1190 60 1280 70 C1380 80 1430 40 1500 30 L1600 20 L1600 260 Z" fill="#d7e0ea" />
      <path d="M560 260 C700 210 820 200 940 170 C1060 140 1150 150 1260 120 C1360 95 1460 110 1600 80 L1600 260 Z" fill="#c9d5e2" opacity=".85" />
      <path d="M380 260 C560 236 760 226 960 210 C1160 194 1360 196 1600 170 L1600 260 Z" fill="#dfe6ee" />
      <path d="M760 260 C980 214 1220 196 1600 186" stroke="#b7c4d3" strokeWidth="2" fill="none" />
      <path d="M800 260 C1010 220 1240 204 1600 194" stroke="#b7c4d3" strokeWidth="1" fill="none" />
      <g transform="translate(1340 176) rotate(-2)">
        <rect x="0" y="0" width="58" height="10" rx="4" fill="#f4f7fb" stroke="#9fb0c4" />
        <rect x="60" y="0" width="58" height="10" rx="3" fill="#f4f7fb" stroke="#9fb0c4" />
        <path d="M4 4h50M64 4h50" stroke="#7c93ad" strokeWidth="2" strokeDasharray="3 2" />
      </g>
    </svg>
  );
}

export default function AuditHome({ user, onLogout }) {
  const isAdmin = (user.roles || []).includes('管理者');
  const mods = useMemo(() => modulesFor(isAdmin), [isAdmin]);
  const news = BULLETIN;
  const [openNews, setOpenNews] = useState(() => new Set());
  const [navOpen, setNavOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [hl, setHl] = useState(null); // 小幫手「一步一步帶」高亮
  const [q, setQ] = useState('');
  const [page, setPage] = useState(null); // null＝啟動中心；{ modId, name, mode }
  const [menu, setMenu] = useState(null); // 'apps' | 'user'
  const [filterRow, setFilterRow] = useState(true);
  const [flt, setFlt] = useState({ subject: '', msg: '', sent: '', due: '', view: 'N' });
  const barRef = useRef(null);
  const [locked, setLocked] = useState(false); // 11/24 明細頁：左側功能列不能打開
  const isApp = page?.name === '非工程動支請示登錄';
  useEffect(() => { if (!isApp) setLocked(false); }, [isApp]);

  useEffect(() => { document.title = '審核會計模組｜臺鐵會計系統'; return () => { document.title = APP_CONFIG.suiteName; }; }, []);
  useEffect(() => {
    const close = (e) => { if (barRef.current && !barRef.current.contains(e.target)) setMenu(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const demo = (t) => toast({ kind: 'info', title: t, subtitle: '審核會計模組目前為示意畫面，正式環境會串接實際功能。' });
  const modOf = (id) => mods.find((m) => m.id === id);
  const toggleMod = (id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const openFn = (modId, name, mode) => {
    const mod = modOf(modId);
    if (mod?.budget) { switchSystem('budget'); return; }
    setPage({ modId, name, mode }); setNavOpen(false); setHl(null);
  };
  const walk = (modId, name) => {
    setNavOpen(true); setQ('');
    setExpanded(new Set());
    setHl({ modId, name: null });
    setTimeout(() => { setExpanded(new Set([modId])); setHl({ modId, name }); }, 900);
    setTimeout(() => setHl(null), 5200);
  };

  const ql = q.trim();
  const navMods = useMemo(() => mods.map((m) => ({
    ...m, shown: ql ? m.items.filter((x) => x.includes(ql) || m.label.includes(ql)) : m.items,
  })).filter((m) => !ql || m.shown.length || m.label.includes(ql)), [ql, mods]);

  const systems = portalSystems();
  const shownNews = news.filter((nw) => [['subject', 'subject'], ['msg', 'msg'], ['sent', 'sent'], ['due', 'due'], ['view', 'viewed']]
    .every(([k, f]) => !flt[k].trim() || String(nw[f] || '').includes(flt[k].trim())));

  return (
    <div className={`au ${navOpen ? 'nav-open' : ''} ${locked ? 'nav-locked' : ''} ${isApp ? 'in-app' : ''}`}>
      <header className="au-bar" ref={barRef}>
        <button type="button" className="au-burger" onClick={() => { if (!locked) setNavOpen(!navOpen); }} aria-label={navOpen ? '關閉功能列' : '開啟功能列'} aria-expanded={navOpen}>
          <I d={navOpen ? close20 : menu16} size={20} />
        </button>
        {/* 11/24 使用者：點左上「臺鐵 審核會計模組」回到審核會計模組首頁 */}
        <button type="button" className="au-brand au-brand-btn" onClick={() => { setPage(null); setNavOpen(false); setLocked(false); }} title="回到審核會計模組首頁" aria-label="回到審核會計模組首頁">
          <img src={emblemWhite} alt="" />
          <b>臺鐵 審核會計模組</b>
        </button>
        {/* 11/23 使用者：加入跟預算模組一樣的「切換模組」，移除 Manage 字樣；右上角九宮格保留 */}
        <div className="au-switch"><SystemSwitcher current="audit" /></div>
        {/* 11/20 使用者：比照預算模組，右上角顯示登入時間／自動登出與登入者（臺鐵藍底），再接切換模組 */}
        <div className="au-tools">
          <div className="topbar-right au-userblk">
            <SessionTimer />
            <UserSwitcher user={user} />
          </div>
          <div className="au-pop-wrap">
            <button type="button" data-tip="切換模組" aria-label="切換模組" className={menu === 'apps' ? 'on' : ''} onClick={() => setMenu(menu === 'apps' ? null : 'apps')}><I d={switcher20} /></button>
            {menu === 'apps' && (
              <div className="au-pop au-apps" role="menu">
                <p>切換模組</p>
                {systems.map((s) => {
                  const cur = s.id === 'audit';
                  const ok = isSystemOpen(s.id);
                  return (
                    <button key={s.id} type="button" role="menuitem" className={cur ? 'cur' : ''} disabled={cur || !ok} title={ok ? undefined : CLOSED_HINT}
                      onClick={() => { setMenu(null); switchSystem(s.id); }}>
                      <span>{s.name}</span>
                      {cur ? <small>目前所在</small> : ok ? <I d={launch16} /> : <small>尚未開放</small>}
                    </button>
                  );
                })}
                <button type="button" role="menuitem" className="au-apps-portal" onClick={() => { setMenu(null); navigate('portal'); }}>
                  <I d={arrowLeft16} /><span>回到系統入口</span>
                </button>
                <button type="button" role="menuitem" onClick={onLogout}><I d={logout16} /><span>登出</span></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="au-body">
        {/* 左側功能列：收合＝圖示欄；展開＝覆蓋在內容上 */}
        {!locked && <nav className="au-nav" aria-label="功能列">
          <div className="au-nav-search">
            <I d={search16} />
            {navOpen ? <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="尋找導覽項目" aria-label="尋找導覽項目" autoFocus /> : <button type="button" aria-label="尋找導覽項目" onClick={() => setNavOpen(true)} />}
          </div>
          <button type="button" className={`au-nav-row ${page ? '' : 'cur'}`} onClick={() => { setPage(null); setNavOpen(false); }} title="啟動中心"><I d={home16} /><span>啟動中心</span></button>
          <button type="button" className="au-nav-row" onClick={() => demo('作業儀表板')} title="作業儀表板"><I d={dashboard16} /><span>作業儀表板</span></button>
          <hr />
          <div className="au-nav-list">
            {navMods.map((m) => {
              const isOpen = expanded.has(m.id) || !!ql;
              return (
                <div key={m.id} className={`au-mod ${hl?.modId === m.id ? 'hl' : ''}`}>
                  <button type="button" className={`au-nav-row ${page?.modId === m.id ? 'in' : ''}`} title={m.label}
                    onClick={() => {
                      if (!m.items.length) { if (m.budget) switchSystem('budget'); else demo(m.label); return; }
                      if (!navOpen) { setNavOpen(true); setExpanded(new Set([m.id])); } else toggleMod(m.id);
                    }}
                    onMouseEnter={() => { if (navOpen && !ql && m.items.length) setExpanded((s) => (s.has(m.id) ? s : new Set([...s, m.id]))); }} aria-expanded={isOpen}>
                    <I d={m.icon} /><span>{m.label}</span>{m.items.length > 0 ? <I d={chevDown16} className={`au-chev ${isOpen ? 'open' : ''}`} /> : m.budget && navOpen ? <I d={launch16} className="au-chev" /> : null}
                  </button>
                  {navOpen && isOpen && m.shown.length > 0 && (
                    <ul>
                      {m.shown.map((it) => (
                        <li key={it}><button type="button" className={`${hl?.modId === m.id && hl?.name === it ? 'hl' : ''} ${page?.modId === m.id && page?.name === it ? 'cur' : ''}`} onClick={() => openFn(m.id, it)}>{it}{m.budget && <I d={launch16} />}</button></li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {navMods.length === 0 && <p className="au-nav-empty">找不到「{ql}」</p>}
          </div>
        </nav>}
        {navOpen && !locked && <div className="au-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

        <main className="au-main">
          {!isApp && <div className="au-tabs-row">
            <div className="au-tabs" role="tablist">
              {isAdmin && <button type="button" role="tab" aria-selected="false" onClick={() => demo('Administration 啟動中心')}>Administration</button>}
              <button type="button" role="tab" aria-selected="true" className="on" onClick={() => setPage(null)}>首頁</button>
              {isAdmin && <button type="button" className="au-tabs-more" aria-label="更多啟動中心" onClick={() => demo('切換啟動中心')}><I d={chevDown16} /></button>}
            </div>
          </div>}
          {isApp ? (
            <AuditDisburse key={page.mode || 'list'} onDetail={(v) => { setLocked(v); if (v) setNavOpen(false); }} demo={demo} />
          ) : page ? (
            <div className="au-page">
              <p className="au-crumb"><button type="button" onClick={() => setPage(null)}>啟動中心</button> <I d={chevRight16} /> {modOf(page.modId)?.label} <I d={chevRight16} /> {page.name}</p>
              <div className="au-card au-fn">
                <h2>{page.name}{page.mode === 'new' ? '・新增' : ''}</h2>
                <p>這是審核會計模組的示意畫面，「{page.name}」的實際功能會在正式環境串接。</p>
                <button type="button" className="au-back" onClick={() => setPage(null)}><I d={arrowLeft16} /> 回到啟動中心</button>
              </div>
            </div>
          ) : (
            <>
              <div className="au-sub-tools">
                <button type="button" data-tip="作業儀表板" aria-label="作業儀表板" onClick={() => demo('作業儀表板')}><I d={dashboard16} /></button>
                <button type="button" data-tip="啟動中心設定" aria-label="啟動中心設定" onClick={() => demo('啟動中心設定')}><I d={settings16} /></button>
                <button type="button" data-tip="新增入口" aria-label="新增入口" onClick={() => demo('新增入口')}><I d={add20} size={16} /></button>
                <button type="button" data-tip="編輯版面" aria-label="編輯版面" onClick={() => demo('編輯版面')}><I d={edit16} /></button>
                <button type="button" data-tip="重新整理" aria-label="重新整理" onClick={() => toast({ kind: 'success', title: '已重新整理' })}><I d={renew16} /></button>
              </div>
              <div className="au-grid">
                <div className="au-col">
                  {LAUNCH.map((c) => (
                    <section key={c.title} className="au-card au-launch">
                      <h3>{c.title}</h3>
                      {c.links.map(([mid, name]) => <button key={name} type="button" className="au-link" onClick={() => openFn(mid, name)}>{name}</button>)}
                    </section>
                  ))}
                  <button type="button" className="au-link au-mobile" onClick={() => demo('行動式啟動中心')}>行動式啟動中心</button>
                </div>
                <div className="au-col wide">
                  <section className="au-card au-bulletin">
                    <header>
                      <h3>公佈欄</h3>
                      <button type="button" className={`au-ibtn ${filterRow ? 'on' : ''}`} onClick={() => setFilterRow(!filterRow)} aria-label="顯示過濾列" data-tip="顯示過濾列"><I d={filter16} /></button>
                      <button type="button" className="au-filter-link" onClick={() => setFilterRow(!filterRow)}>過濾器 <I d={chevRight16} /></button>
                      <button type="button" className="au-ibtn" aria-label="搜尋" data-tip="搜尋" onClick={() => setFilterRow(true)}><I d={search16} /></button>
                      <button type="button" className="au-ibtn" aria-label="清除過濾" data-tip="清除過濾" onClick={() => setFlt({ subject: '', msg: '', sent: '', due: '', view: 'N' })}><I d={filterRemove16} /></button>
                    </header>
                    <table>
                      <colgroup><col style={{ width: '27%' }} /><col style={{ width: '25%' }} /><col style={{ width: '20%' }} /><col style={{ width: '20%' }} /><col style={{ width: '8%' }} /></colgroup>
                      <thead><tr><th>主旨</th><th>訊息</th><th>傳送日期</th><th>到期日</th><th>檢視</th></tr></thead>
                      {filterRow && (
                        <tbody className="au-flt"><tr>
                          {['subject', 'msg', 'sent', 'due', 'view'].map((k) => (
                            <td key={k}><input value={flt[k]} onChange={(e) => setFlt({ ...flt, [k]: e.target.value })} aria-label={`過濾：${k}`} /></td>
                          ))}
                        </tr></tbody>
                      )}
                      <tbody className="au-news">
                        {shownNews.map((nw) => {
                          const op = openNews.has(nw.id);
                          return [
                            <tr key={nw.id} className={op ? 'open' : ''}>
                              <td><button type="button" className="au-news-subj" aria-expanded={op} onClick={() => { setOpenNews((st) => { const x = new Set(st); if (x.has(nw.id)) x.delete(nw.id); else x.add(nw.id); return x; }); }}><I d={chevDown16} className={`au-chev ${op ? 'open' : ''}`} />{nw.subject}</button></td>
                              <td className="au-news-msg">{nw.msg && <span>{nw.msg.length > 30 ? `${nw.msg.slice(0, 30)}...` : nw.msg}</span>}</td>
                              <td>{nw.sent}</td><td>{nw.due}</td><td className="au-news-v">{nw.viewed}</td>
                            </tr>,
                            op && <tr key={`${nw.id}-d`} className="au-news-detail"><td colSpan={5}>{nw.msg || nw.subject}</td></tr>,
                          ];
                        })}
                      </tbody>
                    </table>
                    {shownNews.length === 0 && <p className="au-empty">目前沒有要檢視的公佈欄訊息。</p>}
                  </section>
                  <section className="au-card au-todo">
                    <h3>待辦事項</h3>
                    <p className="au-empty">找不到下列項目的指定 {user.dept}人員</p>
                  </section>
                </div>
              </div>
            </>
          )}
          <Scenery />
        </main>
      </div>
      <Helper user={user} mods={mods} onGo={openFn} onWalk={walk} />
    </div>
  );
}
