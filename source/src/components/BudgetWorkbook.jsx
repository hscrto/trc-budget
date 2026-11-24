// ─────────────────────────────────────────────────────────────
// 第三層：預算編列工作簿（11/18 使用者）
//   版面依現行填表畫面：上方工具列、左側可收合的表清單（公告、區段、選取資產）、
//   表內像 Excel 一樣的頁籤、黃底輸入／灰底計算的試算表。
//   外觀採 Maximo MAS 9 的 Carbon 風格（工具列、頁籤、手風琴清單、焦點框），
//   讓預算模組與審核會計模組的操作感受一致。
//   資料：Prototype 存在瀏覽器（localStorage aa.wb.v1｜填表單位｜表），正式環境寫回預算工作區。
// ─────────────────────────────────────────────────────────────
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from './Notification.jsx';
import save16 from '@carbon/icons/es/save/16.js';
import renew16 from '@carbon/icons/es/renew/16.js';
import share16 from '@carbon/icons/es/share/16.js';
import undo16 from '@carbon/icons/es/undo/16.js';
import redo16 from '@carbon/icons/es/redo/16.js';
import export16 from '@carbon/icons/es/document--export/16.js';
import maximize16 from '@carbon/icons/es/maximize/16.js';
import minimize16 from '@carbon/icons/es/minimize/16.js';
import reset16 from '@carbon/icons/es/reset/16.js';
import grid16 from '@carbon/icons/es/grid/16.js';
import upload16 from '@carbon/icons/es/upload/16.js';
import terminal16 from '@carbon/icons/es/terminal/16.js';
import saveAs16 from '@carbon/icons/es/save/16.js';
import resetAlt16 from '@carbon/icons/es/reset--alt/16.js';
import imgRef16 from '@carbon/icons/es/image--reference/16.js';
import docView16 from '@carbon/icons/es/document--view/16.js';
import renewAlt16 from '@carbon/icons/es/renew--alt/16.js';
import fitW16 from '@carbon/icons/es/fit-to-width/16.js';
import zoomInArea16 from '@carbon/icons/es/zoom--in-area/16.js';
import zoomOutArea16 from '@carbon/icons/es/zoom--out-area/16.js';
import temp16 from '@carbon/icons/es/temperature/16.js';
import checkO16 from '@carbon/icons/es/checkmark--outline/16.js';
import download16 from '@carbon/icons/es/download/16.js';
import swap16 from '@carbon/icons/es/arrows--horizontal/16.js';
import viewOff16 from '@carbon/icons/es/view--off/16.js';
import code16 from '@carbon/icons/es/code/16.js';
import center16 from '@carbon/icons/es/center--circle/16.js';
import tree16 from '@carbon/icons/es/tree-view--alt/16.js';
import tableSplit16 from '@carbon/icons/es/table--split/16.js';
import chev16 from '@carbon/icons/es/chevron--down/16.js';
import chartLine16 from '@carbon/icons/es/chart--line/16.js';
import docImport16 from '@carbon/icons/es/document--import/16.js';
import column16 from '@carbon/icons/es/column/16.js';
import dashboard20 from '@carbon/icons/es/dashboard/20.js';
import book16 from '@carbon/icons/es/book/16.js';
import table16 from '@carbon/icons/es/data-table/16.js';
import settings16 from '@carbon/icons/es/settings/16.js';
import checkmark16 from '@carbon/icons/es/checkmark/16.js';
import chevronDown16 from '@carbon/icons/es/chevron--down/16.js';
import chevronLeft16 from '@carbon/icons/es/chevron--left/16.js';
import chevronRight16 from '@carbon/icons/es/chevron--right/16.js';
import close16 from '@carbon/icons/es/close/16.js';
import locked16 from '@carbon/icons/es/locked/16.js';
import time16 from '@carbon/icons/es/time/16.js';
import caretDown16 from '@carbon/icons/es/caret--down/16.js';
import caretRight16 from '@carbon/icons/es/caret--right/16.js';
import { createPortal } from 'react-dom';
import { local } from '../services/storage.js';

// ───────────── 圖示 ─────────────
function I({ d, size = 16, className = '' }) {
  return (
    <svg className={`wb-ico ${className}`} width={size} height={size} viewBox={d.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {d.content.map((c, i) => {
        const Tag = c.elem;
        return <Tag key={i} {...c.attrs} />;
      })}
    </svg>
  );
}

// ───────────── 數字格式 ─────────────
const n = (x) => Number(x) || 0;
const isNumFmt = (f) => f === 'num' || f === 'num2' || f === 'pct';
function fmtVal(v, fmt, { dash = true } = {}) {
  if (v === '' || v === null || v === undefined) return '';
  if (!isNumFmt(fmt)) return String(v);
  const x = Number(v);
  if (!Number.isFinite(x)) return '';
  if (x === 0) return dash ? '–' : '0';
  if (fmt === 'pct') return `${x}%`;
  return x.toLocaleString('en-US', { maximumFractionDigits: fmt === 'num2' ? 2 : 0, minimumFractionDigits: 0 });
}
function parseVal(s, fmt) {
  const t = String(s ?? '').trim();
  if (!isNumFmt(fmt)) return t;
  if (t === '' || t === '–' || t === '-') return '';
  const x = Number(t.replace(/[,%\s]/g, ''));
  return Number.isFinite(x) ? x : '';
}
const colLetter = (i) => { let s = ''; let x = i + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };

// ───────────── 計算 ─────────────
// 每張頁籤的列：明細列（自己的輸入與計算）＋群組列（加總底下明細列）＋合計列
function rowsWithBlank(grid) {
  const blank = Array.from({ length: grid.blank || 0 }, (_, i) => ({ id: `b${i + 1}`, v: {} }));
  return [...(grid.rows || []), ...blank];
}
function computeSheet(sheet, getRaw, ctx) {
  const g = sheet.grid;
  if (!g) return { rows: [], total: {} };
  const rows = rowsWithBlank(g);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const ancestors = (r) => { const out = []; let p = r.p; while (p && byId[p]) { out.push(p); p = byId[p].p; } return out; };
  const out = rows.map((r) => ({ row: r, vals: {}, depth: ancestors(r).length, anc: ancestors(r), leaf: !r.match }));
  // 明細列
  out.filter((o) => o.leaf).forEach((o) => {
    g.cols.forEach((c) => {
      if (c.t === 'calc') return;
      if (c.t === 'text') { o.vals[c.k] = o.row.v?.[c.k] ?? c.def ?? ''; return; }
      const raw = getRaw(`${sheet.id}|${o.row.id}|${c.k}`);
      const v = raw !== undefined ? raw : (o.row.v?.[c.k] ?? '');
      o.vals[c.k] = isNumFmt(c.fmt) ? (v === '' ? '' : n(v)) : v;
    });
    // 計算欄算三輪：前面的欄位可以引用後面的計算結果（例如預算合計＝各月金額加總）
    for (let pass = 0; pass < 3; pass += 1) g.cols.forEach((c) => { if (c.t === 'calc') o.vals[c.k] = c.f(o.vals, ctx); });
  });
  const leaves = out.filter((o) => o.leaf);
  const sumOf = (list, c) => list.reduce((s, o) => s + n(o.vals[c.k]), 0);
  // 群組列（加總）
  out.filter((o) => !o.leaf).forEach((o) => {
    const m = o.row.match;
    const list = leaves.filter((l) => l.anc.includes(m.under) && (!m.band || l.row.band === m.band));
    g.cols.forEach((c) => {
      if (c.t === 'text' || (c.fmt && !isNumFmt(c.fmt) && c.t !== 'calc')) { o.vals[c.k] = o.row.v?.[c.k] ?? ''; return; }
      o.vals[c.k] = sumOf(list, c);
    });
    g.cols.forEach((c) => { if (c.g) o.vals[c.k] = c.g(o.vals); });
  });
  // 合計列
  const total = {};
  if (g.total) {
    g.cols.forEach((c) => {
      const numeric = isNumFmt(c.fmt) || c.t === 'calc';
      if (!numeric) return;
      if (g.total.sumOnly && !g.total.sumOnly.includes(c.k)) return;
      if (c.noTotalSum && !c.g) return;
      total[c.k] = sumOf(leaves, c);
    });
    g.cols.forEach((c) => { if (c.g && !(g.total.sumOnly && !g.total.sumOnly.includes(c.k))) total[c.k] = c.g(total); });
  }
  return { rows: out, total };
}

// ───────────── 主元件 ─────────────
// 11/24 使用者：段看各室、處看各段時，不拆各室進度，直接看彙整後的總額。
//   sources＝要彙整的填表單位；數字欄相加，文字欄取第一個有填的；
//   空白列（b1、b2…，例如出國計畫逐筆填寫）依來源順序往下排，不互相疊加。
export function aggregateSaved(maps) {
  const out = {}; const blankNext = {}; const blankMap = {};
  maps.forEach((m, si) => {
    Object.entries(m || {}).forEach(([key, val]) => {
      const [sh, row, col] = key.split('|');
      let k = key;
      if (col !== undefined && /^b\d+$/.test(row)) {
        const id = `${si}|${sh}|${row}`;
        if (!blankMap[id]) { blankNext[sh] = (blankNext[sh] || 0) + 1; blankMap[id] = `b${blankNext[sh]}`; }
        k = `${sh}|${blankMap[id]}|${col}`;
      }
      if (typeof val === 'number' && Number.isFinite(val)) out[k] = (typeof out[k] === 'number' ? out[k] : 0) + val;
      else if (out[k] === undefined || out[k] === '') out[k] = val;
    });
  });
  return out;
}

// 11/24：彙整檢視切換預算單位時工作簿會重新載入，記住目前的表與頁籤，切換後停在原處
const VIEW_MEMO = {};
export default function BudgetWorkbook({ title, workbook, who, unit, readOnly = false, deadline, banner, iconTile, panelBody, noPanel = false, sources = null, keepView = false }) {
  const sections = workbook.sections;
  const allAssets = sections.flatMap((s) => s.assets);
  const rootRef = useRef(null);
  const [h, setH] = useState(640);
  const [panel, setPanel] = useState(true);
  const [panelW, setPanelW] = useState(() => (window.innerWidth < 1500 ? 272 : 320));
  const [openSec, setOpenSec] = useState(() => new Set(sections.filter((s) => s.open).map((s) => s.id)));
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [noticeIdx, setNoticeIdx] = useState(0);
  const memo = keepView ? VIEW_MEMO[title] : null;
  const [assetId, setAssetId] = useState(memo?.assetId && allAssets.some((a) => a.id === memo.assetId) ? memo.assetId : allAssets[0]?.id);
  const [tabOf, setTabOf] = useState(memo?.tabOf || {}); // 每張表目前的頁籤
  useEffect(() => { if (keepView) VIEW_MEMO[title] = { assetId, tabOf }; }, [keepView, title, assetId, tabOf]);
  const [drafts, setDrafts] = useState({}); // 未儲存的輸入 { 表: { key: 值 } }
  const [savedMap, setSavedMap] = useState({}); // 已儲存 { 表: { v, at } }
  const [hist, setHist] = useState({}); // 復原／取消復原 { 表: { undo: [], redo: [] } }
  const zoom = 100; // 11/24 固定 100%，不提供縮放
  const [headers, setHeaders] = useState(false);
  const [full, setFull] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [filter, setFilter] = useState('');
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [cellOn, setCellOn] = useState(false); // 11/19：選取儲存格後，工具列多出 Web 工作簿工具
  const [sandbox, setSandbox] = useState('Base');
  const canvasRef = useRef(null);
  const [cw, setCw] = useState(900);
  useLayoutEffect(() => {
    const el = canvasRef.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    setCw(el.clientWidth); ro.observe(el); return () => ro.disconnect();
  }, [full, panel]); // 全螢幕會重新掛載畫布，要重新量寬度

  const asset = allAssets.find((a) => a.id === assetId) || allAssets[0];
  const skey = (a) => `aa.wb.v1|${who}|${a}`;
  // 彙整模式：每個來源先補上樣板預設數字（沒改過的格子也算進總額），再相加
  const defaultsOf = (a) => {
    const d = {};
    (allAssets.find((x) => x.id === a)?.sheets || []).forEach((sh) => (sh.grid?.rows || []).forEach((r) => {
      if (r.match) return;
      Object.entries(r.v || {}).forEach(([k, v]) => { if (typeof v === 'number') d[`${sh.id}|${r.id}|${k}`] = v; });
    }));
    return d;
  };
  const load = (a) => (sources
    ? { v: aggregateSaved(sources.map((w) => ({ ...defaultsOf(a), ...(local.get(`aa.wb.v1|${w}|${a}`, null)?.v || {}) }))), at: Math.max(0, ...sources.map((w) => local.get(`aa.wb.v1|${w}|${a}`, null)?.at || 0)) }
    : local.get(skey(a), null) || { v: {}, at: 0 });
  const saved = (a) => savedMap[a] ?? load(a);
  useEffect(() => { // 讀取已儲存的內容（彙整模式：讀各來源後加總）
    setSavedMap((m) => (m[asset?.id] ? m : { ...m, [asset?.id]: load(asset?.id) }));
  }, [asset?.id, who]); // eslint-disable-line react-hooks/exhaustive-deps

  // 高度：填滿視窗，不讓整頁捲動（表格在工作簿內捲動）
  useLayoutEffect(() => {
    const fit = () => {
      const el = rootRef.current; if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setH(Math.max(420, window.innerHeight - top - 16));
    };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [banner]);

  const sheets = asset?.sheets || [];
  const tab = Math.min(tabOf[asset?.id] || 0, Math.max(0, sheets.length - 1));
  const sheet = sheets[tab];
  const draft = drafts[asset?.id] || {};
  const dirtyCount = Object.keys(draft).length;
  const dirtyAssets = new Set(Object.entries(drafts).filter(([, d]) => Object.keys(d).length).map(([a]) => a));

  // 讀值：未儲存 → 已儲存 → 樣板預設
  const getRaw = useCallback((key) => {
    if (key in draft) return draft[key];
    const s = saved(asset.id).v;
    if (key in s) return s[key];
    return undefined;
  }, [draft, savedMap, asset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 跨頁籤計算（例如資通訊：預算調整設定的扣除％數影響費用明細表）
  const computed = useMemo(() => {
    const memo = {}; const busy = new Set();
    const ctx = {
      rowsOf: (id) => {
        if (memo[id]) return memo[id].rows;
        const sh = sheets.find((x) => x.id === id);
        if (!sh || busy.has(id)) return [];
        busy.add(id); memo[id] = computeSheet(sh, getRaw, ctx); busy.delete(id);
        return memo[id].rows;
      },
      listOf: (id, k) => [...new Set(ctx.rowsOf(id).map((r) => r.vals[k]).filter(Boolean))],
    };
    sheets.forEach((s) => ctx.rowsOf(s.id));
    return { memo, ctx };
  }, [sheets, getRaw]);
  const cur = sheet ? computed.memo[sheet.id] || { rows: [], total: {} } : { rows: [], total: {} };

  // 寫入一格（記錄復原）
  const setCell = (key, value) => {
    if (readOnly) return;
    const before = getRaw(key);
    if ((before ?? '') === value) return;
    setDrafts((d) => ({ ...d, [asset.id]: { ...(d[asset.id] || {}), [key]: value } }));
    setHist((hs) => { const x = hs[asset.id] || { undo: [], redo: [] }; return { ...hs, [asset.id]: { undo: [...x.undo.slice(-99), { key, before, after: value }], redo: [] } }; });
  };
  const applyHist = (dir) => {
    const x = hist[asset.id]; if (!x) return;
    const from = dir === 'undo' ? x.undo : x.redo;
    if (!from.length) return;
    const step = from[from.length - 1];
    const val = dir === 'undo' ? step.before : step.after;
    setDrafts((d) => { const nd = { ...(d[asset.id] || {}) }; if (val === undefined) delete nd[step.key]; else nd[step.key] = val; return { ...d, [asset.id]: nd }; });
    setHist((hs) => ({ ...hs, [asset.id]: dir === 'undo' ? { undo: x.undo.slice(0, -1), redo: [...x.redo, step] } : { undo: [...x.undo, step], redo: x.redo.slice(0, -1) } }));
  };
  const saveAll = () => {
    if (readOnly || !dirtyCount) return;
    const merged = { v: { ...saved(asset.id).v, ...draft }, at: Date.now() };
    local.set(skey(asset.id), merged);
    setSavedMap((m) => ({ ...m, [asset.id]: merged }));
    setDrafts((d) => ({ ...d, [asset.id]: {} }));
    toast({ kind: 'success', title: '已儲存', subtitle: `${asset.name}：${dirtyCount} 個儲存格` });
  };
  const renew = () => {
    if (dirtyCount && !confirmRenew) {
      setConfirmRenew(true);
      toast({ kind: 'warning', title: '有未儲存的變更', subtitle: '再按一次「重新整理」會捨棄未儲存的變更。' });
      setTimeout(() => setConfirmRenew(false), 4000);
      return;
    }
    setConfirmRenew(false);
    setDrafts((d) => ({ ...d, [asset.id]: {} }));
    setHist((hs) => ({ ...hs, [asset.id]: { undo: [], redo: [] } }));
    setSavedMap((m) => ({ ...m, [asset.id]: local.get(skey(asset.id), null) || { v: {}, at: 0 } }));
    toast({ kind: 'info', title: '已重新整理', subtitle: '已重新讀取最新資料。' });
  };
  const share = () => {
    const url = window.location.href;
    try { navigator.clipboard?.writeText(url); } catch { /* 略過 */ }
    toast({ kind: 'info', title: '已複製連結', subtitle: '同單位有權限的人員可開啟這張表。' });
  };
  const exportCsv = () => {
    if (!sheet?.grid) { toast({ kind: 'info', title: '這個頁籤沒有表格可以匯出' }); return; }
    const g = sheet.grid;
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const lines = [g.head[g.head.length - 1].map((x) => esc(x.l)).join(',')];
    lines.unshift(esc(`${sheet.title}（${unit?.name || ''}）`));
    cur.rows.forEach((o) => lines.push(g.cols.map((c) => esc(o.vals[c.k])).join(',')));
    const data = `﻿${lines.join('\n')}`;
    const filename = `${sheet.title}.csv`;
    // 預覽環境（Artifact）由平台確認後下載；一般網頁直接下載
    (async () => {
      const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
      if (dl) {
        try { await dl.save({ filename, data }); toast({ kind: 'success', title: '已匯出', subtitle: filename }); }
        catch (err) { if (err?.code !== 'declined') toast({ kind: 'warning', title: '無法匯出', subtitle: '這個檢視環境不支援下載檔案。' }); }
        return;
      }
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast({ kind: 'success', title: '已匯出', subtitle: filename });
    })();
  };
  const resetView = () => { setHeaders(false); setCollapsed(new Set()); setFilter(''); toast({ kind: 'info', title: '已重設檢視', subtitle: '欄列標題、展開狀態與篩選已還原。' }); };

  // 鍵盤：Ctrl+S 儲存、Ctrl+Z 復原、Ctrl+Y 取消復原
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && full && !e.target.closest?.('input, select')) { setFull(false); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); saveAll(); }
      else if ((k === 'z' || k === 'y') && !e.target.closest?.('.wb')) { /* 不在工作簿內 */ }
      else if (k === 'z' && e.target.dataset?.editing !== '1') { e.preventDefault(); applyHist('undo'); }
      else if (k === 'y' && e.target.dataset?.editing !== '1') { e.preventDefault(); applyHist('redo'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 左側清單寬度可拖曳
  const drag = (e) => {
    const x0 = e.clientX; const w0 = panelW;
    const move = (ev) => setPanelW(Math.min(480, Math.max(240, w0 + ev.clientX - x0)));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const pickAsset = (id) => { setAssetId(id); setFilter(''); setCollapsed(new Set()); setCellOn(false); };
  const pickTab = (i) => { setTabOf((t) => ({ ...t, [asset.id]: i })); setCellOn(false); };
  const hx = hist[asset?.id] || { undo: [], redo: [] };
  const lastSaved = saved(asset?.id).at;
  const notices = workbook.notices || [];

  // 11/19 使用者 PAW 截圖：工具列依畫面不同而不同
  //  ① 一般（未選取儲存格）：儲存、重新整理｜分享｜復原、取消復原｜回復資料項目、全螢幕、重設、檢視同步化群組
  //  ② 點進 Web 工作簿的儲存格後：再多一組 Web 工作簿工具＋沙箱［Base］＋資料散佈＋確定
  //  ③ 檢視（樞紐表，例如資通訊「費用明細表」）：改成檢視工具＋探索
  const demo = (label) => () => toast({ kind: 'info', title: label, subtitle: '原型示意，正式版會接上實際功能。' });
  const revertData = () => {
    if (!dirtyCount) { toast({ kind: 'info', title: '沒有要回復的資料項目' }); return; }
    setDrafts((d) => ({ ...d, [asset.id]: {} }));
    setHist((hs) => ({ ...hs, [asset.id]: { undo: [], redo: [] } }));
    toast({ kind: 'info', title: '已回復資料項目', subtitle: `已捨棄 ${dirtyCount} 個尚未儲存的儲存格。` });
  };
  const syncGroups = () => toast({ kind: 'info', title: '檢視同步化群組', subtitle: sheets.length > 1 ? `同步：${sheets.map((x) => x.name).join('、')}` : '這張表沒有其他同步的頁籤。' });
  const isView = !!sheet?.explore;
  const tools = [
    [{ d: save16, label: '儲存（Ctrl+S）', on: saveAll, dis: readOnly || !dirtyCount, primary: dirtyCount > 0 }, { d: renew16, label: confirmRenew ? '再按一次捨棄未儲存的變更' : '重新整理', on: renew, warn: confirmRenew }],
    [{ d: share16, label: '分享', on: share }],
    [{ d: undo16, label: '復原（Ctrl+Z）', on: () => applyHist('undo'), dis: readOnly || !hx.undo.length }, { d: redo16, label: '取消復原（Ctrl+Y）', on: () => applyHist('redo'), dis: readOnly || !hx.redo.length }],
    [{ d: docImport16, label: '回復資料項目', on: revertData }, { d: full ? minimize16 : maximize16, label: full ? '結束全螢幕' : '全螢幕', on: () => setFull(!full), on2: full }, { d: reset16, label: '重設檢視', on: resetView }, { d: grid16, label: '檢視同步化群組', on: syncGroups }],
  ];
  const cellTools = [
    [{ d: upload16, label: '凍結窗格', on: demo('凍結窗格') }, { d: terminal16, label: '顯示公式列', on: demo('顯示公式列') }, { d: saveAs16, label: '另存 Web 工作簿', on: demo('另存 Web 工作簿') }, { d: resetAlt16, label: '重設資料', on: revertData },
      { d: imgRef16, label: '編輯連結', on: demo('編輯連結') }, { d: docView16, label: '重建 Web 工作簿', on: demo('重建 Web 工作簿') }, { d: renewAlt16, label: '重新計算', on: demo('重新計算') }, { d: fitW16, label: '自動適合選定直欄', on: demo('自動適合選定直欄') },
      { d: zoomInArea16, label: '顯示工作表格式區域', on: () => setHeaders(true), on2: headers }, { d: zoomOutArea16, label: '隱藏工作表格式區域', on: () => setHeaders(false) }],
  ];
  const viewTools = [
    [{ d: download16, label: '匯出', on: demo('匯出') }, { d: terminal16, label: 'MDX 編輯器', on: demo('MDX 編輯器') }, { d: saveAs16, label: '儲存檢視', on: demo('儲存檢視') }],
    [{ d: tableSplit16, label: '顯示屬性', on: demo('顯示屬性') }, { d: swap16, label: '交換列與欄', on: demo('交換列與欄') }, { d: viewOff16, label: '隱藏空白列', on: demo('隱藏空白列') }, { d: code16, label: 'MDX', on: demo('MDX') },
      { d: renewAlt16, label: '重新計算', on: demo('重新計算') }, { d: renew16, label: '自動重新計算', on: demo('自動重新計算') }, { d: center16, label: '聚焦', on: demo('聚焦') }, { d: tree16, label: '檢視選項', on: demo('檢視選項') }],
  ];
  const sandboxTools = (
    <div className="wb-tgroup wb-sbx">
      <button type="button" className="wb-sbx-btn" data-tip="沙箱（目前：Base）" onClick={() => { const next = sandbox === 'Base' ? '我的沙箱' : 'Base'; setSandbox(next); toast({ kind: 'info', title: `沙箱：${next}` }); }}>{isView ? sandbox : `[${sandbox}]`}</button>
      <button type="button" className="wb-tbtn" aria-label="資料散佈" data-tip="資料散佈" onClick={demo('資料散佈')}><I d={temp16} /></button>
      <button type="button" className="wb-tbtn" aria-label="確定變更" data-tip="確定變更" onClick={saveAll} disabled={readOnly || !dirtyCount}><I d={checkO16} /></button>
      {isView && <button type="button" className="wb-tbtn" aria-label="捨棄沙箱變更" data-tip="捨棄沙箱變更" onClick={demo('捨棄沙箱變更')}><I d={reset16} /></button>}
    </div>
  );
  const btn = (t) => (
    <button key={t.label} type="button" className={`wb-tbtn ${t.primary ? 'is-dirty' : ''} ${t.warn ? 'is-warn' : ''} ${t.on2 ? 'is-on' : ''}`} onClick={t.on} disabled={t.dis} aria-label={t.label} data-tip={t.label}>
      <I d={t.d} />
    </button>
  );
  const tbMode = sheet?.toolbar || asset?.toolbar; // 'web'｜'basic'｜未設定
  const webOn = !isView && tbMode !== 'basic' && (tbMode === 'web' || !!sheet?.grid); // 11/19 使用者：一打開就有
  const extraTools = isView ? viewTools : (webOn ? cellTools : []);

  const content = (
    <div ref={rootRef} className={`wb ${full ? 'is-full' : ''} ${readOnly ? 'is-ro' : ''} ${extraTools.length ? 'is-xtools' : ''} ${isView ? 'is-view' : ''}`} style={full ? undefined : { height: h }}>
      {/* 工具列 */}
      <div className="wb-toolbar" role="toolbar" aria-label="工作簿工具列">
        {tools.map((grp, gi) => <div key={gi} className="wb-tgroup">{grp.map(btn)}</div>)}
        {extraTools.map((grp, gi) => <div key={`x${gi}`} className="wb-tgroup is-x">{grp.map(btn)}</div>)}
        {(isView || webOn) && sandboxTools}
        {isView && (
          <div className="wb-tgroup wb-explore">
            <button type="button" className="wb-explore-btn" data-tip="切換模式" onClick={demo('探索')}>探索 <I d={chev16} /></button>
            <button type="button" className="wb-tbtn" aria-label="視覺化：表格" data-tip="視覺化：表格" onClick={demo('視覺化：表格')}><I d={table16} /></button>
            <button type="button" className="wb-tbtn" aria-label="圖表" data-tip="圖表" onClick={demo('圖表')}><I d={chartLine16} /></button>
          </div>
        )}
        <div className="wb-tstatus" aria-live="polite">
          {readOnly ? <span className="wb-ro"><I d={locked16} /> 唯讀</span>
            : dirtyCount ? <span className="wb-dirty"><i />{dirtyCount} 個儲存格尚未儲存</span>
              : lastSaved ? <span className="wb-ok"><I d={checkmark16} /> 已儲存 {new Date(lastSaved).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                : <span className="wb-ok muted">尚未修改</span>}
        </div>
        <div className="wb-tright">
          {/* 11/24 使用者：移除縮放（不讓使用者調整比例），工作簿外框隨畫面寬度調整 */}
          <button type="button" className={`wb-fields-btn ${fieldsOpen ? 'is-on' : ''}`} onClick={() => setFieldsOpen(!fieldsOpen)} aria-expanded={fieldsOpen}>
            欄位 <I d={column16} />
          </button>
        </div>
      </div>

      <div className="wb-body">
        {/* 左側圖示欄 */}
        {/* 11/18 使用者：提交者送出後不顯示左側區域（noPanel） */}
        {!noPanel && <nav className="wb-rail" aria-label="工作簿">
          <button type="button" className={`wb-railbtn ${panel ? 'is-on' : ''}`} onClick={() => setPanel(!panel)} aria-label={panel ? '收合表清單' : '展開表清單'} aria-expanded={panel} data-tip={panel ? '收合表清單' : '展開表清單'}>
            <I d={dashboard20} size={20} />
          </button>
        </nav>}

        {/* 左側表清單 */}
        {panel && !noPanel && (
          <aside className="wb-panel" style={{ width: panelW }} aria-label="表清單">
            {/* 11/18：明細表審核頁用自訂的左側面板（核准作業／提供給作業） */}
            {panelBody ? panelBody({ pickTab, sheets, tab }) : (<>
            <div className="wb-ph">
              <div className="wb-ph-top">
                {iconTile}
                <button type="button" className="wb-tbtn sm" aria-label="重新載入清單" data-tip="重新載入清單" onClick={() => toast({ kind: 'info', title: '已重新載入清單' })}><I d={renew16} /></button>
              </div>
              <h2>{title}</h2>
              {deadline && <p className="wb-deadline"><I d={time16} /> {deadline}</p>}
            </div>

            {notices.length > 0 && (
              <div className="wb-acc">
                <button type="button" className="wb-acc-h" onClick={() => setNoticeOpen(!noticeOpen)} aria-expanded={noticeOpen}>
                  <span>公告 <span className="wb-count">{notices.length}</span></span><I d={chevronDown16} className={noticeOpen ? 'up' : ''} />
                </button>
                {noticeOpen && (
                  <div className="wb-notice">
                    <b>{notices[noticeIdx].title}</b>
                    <p>{notices[noticeIdx].body}</p>
                    <small>{notices[noticeIdx].date}</small>
                    <div className="wb-notice-nav">
                      <span className="muted">{noticeIdx + 1}／{notices.length}</span>
                      <button type="button" className="wb-tbtn sm" disabled={noticeIdx === 0} onClick={() => setNoticeIdx(noticeIdx - 1)} aria-label="上一則"><I d={chevronLeft16} /></button>
                      <button type="button" className="wb-tbtn sm" disabled={noticeIdx >= notices.length - 1} onClick={() => setNoticeIdx(noticeIdx + 1)} aria-label="下一則"><I d={chevronRight16} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h3 className="wb-sec-title">區段</h3>
            {sections.map((s) => {
              const open = openSec.has(s.id);
              return (
                <div key={s.id} className="wb-acc">
                  <button type="button" className="wb-acc-h" aria-expanded={open}
                    onClick={() => setOpenSec((o) => { const x = new Set(o); if (x.has(s.id)) x.delete(s.id); else x.add(s.id); return x; })}>
                    <span>{s.name}</span><I d={chevronDown16} className={open ? 'up' : ''} />
                  </button>
                  {open && (
                    <div className="wb-assets">
                      <small className="wb-assets-l">選取資產（{s.assets.length}）</small>
                      <ul>
                        {s.assets.map((a) => (
                          <li key={a.id}>
                            <button type="button" className={`wb-asset ${a.id === asset?.id ? 'on' : ''}`} onClick={() => pickAsset(a.id)} aria-current={a.id === asset?.id ? 'true' : undefined} title={a.name}>
                              <I d={a.kind === 'book' ? book16 : table16} className={a.kind === 'book' ? 'k-book' : 'k-sheet'} />
                              <span>{a.name}</span>
                              {dirtyAssets.has(a.id) && <i className="wb-dot" title="尚未儲存" />}
                              {a.id === asset?.id && <I d={checkmark16} className="wb-check" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            </>)}
          </aside>
        )}
        {panel && !noPanel && <div className="wb-resizer" onMouseDown={drag} role="separator" aria-orientation="vertical" aria-label="調整清單寬度" />}

        {/* 頁籤與試算表 */}
        <section className="wb-main">
          {banner}
          {sheets.length > 1 && !asset?.tabsBottom && <SheetTabs sheets={sheets} tab={tab} onPick={pickTab} />}
          <div className="wb-canvas" ref={canvasRef} style={{ '--cw': `${cw}px` }}
            onMouseDownCapture={(e) => { if (e.target.closest('td, input, select, textarea, [role=gridcell]')) setCellOn(true); }}
            onFocusCapture={(e) => { if (e.target.closest('td, input, select, textarea, [role=gridcell]')) setCellOn(true); }}>
            {sheet && (
              <Sheet key={`${asset.id}|${sheet.id}`} sheet={sheet} sheets={sheets} cur={cur} ctx={computed.ctx} getRaw={getRaw} setCell={setCell}
                readOnly={readOnly} unit={unit} zoom={zoom} headers={headers}
                collapsed={collapsed} setCollapsed={setCollapsed} filter={filter} setFilter={setFilter} pickTab={pickTab} />
            )}
          </div>
          {/* 11/19 使用者：資本支出的頁籤暫時放在最下面（像 Excel 工作表頁籤） */}
          {sheets.length > 1 && asset?.tabsBottom && <div className="wb-tabs-bottom"><SheetTabs sheets={sheets} tab={tab} onPick={pickTab} /></div>}
        </section>

        {fieldsOpen && (
          <aside className="wb-fields" aria-label="欄位">
            <header><b>欄位</b><button type="button" className="wb-tbtn sm" onClick={() => setFieldsOpen(false)} aria-label="關閉"><I d={close16} /></button></header>
            <p className="muted">目前這張表的維度與篩選條件。</p>
            <dl>
              <dt>表</dt><dd>{asset?.name}</dd>
              {sheets.length > 1 && <><dt>頁籤</dt><dd>{sheet?.name}</dd></>}
              {(sheet?.fields || []).map((f, i) => (
                <Fragment key={f.label}><dt>{f.label}</dt><dd>{fieldValue(sheet, f, i, getRaw, unit) || '—'}</dd></Fragment>
              ))}
              <dt>填表單位</dt><dd>{who}</dd>
              {filter && <><dt>篩選</dt><dd>{filter}</dd></>}
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
  // 全螢幕：放到 body 底下，蓋住頂列與選單（Esc 離開）
  return full ? createPortal(content, document.body) : content;
}

function fieldValue(sheet, f, i, getRaw, unit) {
  if (f.unit) return f.unit === 'code' ? unit?.code : unit?.name;
  const raw = getRaw(`${sheet.id}|f|${i}`);
  return raw !== undefined ? raw : f.v;
}

// ───────────── 頁籤（像 Excel 工作表） ─────────────
function SheetTabs({ sheets, tab, onPick }) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const chk = () => setOver(el.scrollWidth > el.clientWidth + 2);
    chk(); const ro = new ResizeObserver(chk); ro.observe(el);
    return () => ro.disconnect();
  }, [sheets]);
  useEffect(() => { ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [tab]);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 280, behavior: 'smooth' });
  return (
    <div className="wb-tabs-wrap">
      {over && <button type="button" className="wb-tabs-arrow" onClick={() => scroll(-1)} aria-label="往左捲動頁籤"><I d={chevronLeft16} /></button>}
      <div className="wb-tabs" role="tablist" ref={ref}>
        {sheets.map((s, i) => (
          <button key={s.id} type="button" role="tab" aria-selected={i === tab} className={`wb-tab ${i === tab ? 'on' : ''} ${s.setting ? 'is-setting' : ''} ${s.tone ? `tone-${s.tone}` : ''}`} onClick={() => onPick(i)} title={s.setting ? `${s.name}（設定）` : s.name}>
            {s.setting && <I d={settings16} />}{s.name}
          </button>
        ))}
      </div>
      {over && <button type="button" className="wb-tabs-arrow" onClick={() => scroll(1)} aria-label="往右捲動頁籤"><I d={chevronRight16} /></button>}
    </div>
  );
}

// ───────────── 單一頁籤 ─────────────
function Sheet({ sheet, sheets, cur, ctx, getRaw, setCell, readOnly, unit, zoom, headers, collapsed, setCollapsed, filter, setFilter, pickTab }) {
  const yearIdx = (sheet.fields || []).findIndex((f) => f.label === '年份' || f.label === '預算年度');
  const year = yearIdx >= 0 ? fieldValue(sheet, sheet.fields[yearIdx], yearIdx, getRaw, unit) : '116';
  const g = sheet.grid;

  return (
    <div className="wb-sheet" style={{ zoom: zoom / 100, "--wbz": zoom / 100 }}>
      {sheet.custom !== 'buttons' && sheet.custom !== 'render' && !sheet.noTitle && (
        <header className="wb-stitle">
          <p className="co">國營臺灣鐵路股份有限公司</p>
          <h3>{sheet.title}</h3>
          <p className="yr">中華民國 {year} 年度</p>
        </header>
      )}

      <div className="wb-top">
        {sheet.fields && (
          <table className={`wb-fieldtbl ${sheet.custom === 'buttons' || sheet.caption ? 'is-panel' : ''} ${sheet.fieldTone ? `tone-${sheet.fieldTone}` : ''}`}>
            {(sheet.custom === 'buttons' || sheet.caption) && <caption>{sheet.caption || sheet.title}</caption>}
            <tbody>
              {sheet.fields.map((f, i) => {
                const key = `${sheet.id}|f|${i}`;
                const val = fieldValue(sheet, f, i, getRaw, unit);
                const opts = f.ddFrom ? ['', ...f.ddFrom(ctx)] : f.dd;
                return (
                  <tr key={f.label}>
                    <th scope="row">{f.label}：</th>
                    <td>
                      {/* 11/24 使用者：彙整檢視可在「預算單位名稱」直接下拉切換單位（不另外放篩選器） */}
                      {f.unit === 'name' && unit?.options?.length > 1 ? (
                        <select className="wb-unitpick" value={unit.pick ?? unit.name} onChange={(e) => unit.onPick(e.target.value)} aria-label={f.label}>
                          {unit.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.unit ? <span className="wb-fixed">{val}</span> : (
                        <select value={val ?? ''} onChange={(e) => setCell(key, e.target.value)} disabled={readOnly} aria-label={f.label}>
                          {opts.map((o) => <option key={o} value={o}>{o || '（請選擇）'}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {sheet.side && (
          <table className="wb-fieldtbl wb-side">
            <tbody>
              {sheet.side.map((s) => {
                const key = `${sheet.id}|s|${s.key}`;
                const raw = getRaw(key);
                const get = (k) => { const r = getRaw(`${sheet.id}|s|${k}`); return r === undefined ? '' : r; };
                return (
                  <tr key={s.key}>
                    <th scope="row">{s.label}</th>
                    {s.calc ? <td className="c-calc num">{fmtVal(s.calc(get, cur.total), 'num')}</td> : (
                      <td className="c-in"><CellInput value={raw === undefined ? '' : raw} fmt={s.fmt} readOnly={readOnly} onCommit={(v) => setCell(key, v)} label={s.label} /></td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {sheet.action && (
          <button type="button" className="wb-action" disabled={readOnly} onClick={() => toast({ kind: 'success', title: `${sheet.action}完成`, subtitle: sheet.actionMsg || '已依扣除％數重新計算費用明細表的調整後金額。' })}>{sheet.action}</button>
        )}
      </div>

      {sheet.custom === 'buttons' && (
        <div className="wb-btngrid">
          {sheet.buttons.map((b) => (
            <button key={b} type="button" className="wb-catbtn" onClick={() => {
              setFilter(b === '全部' ? '' : b);
              const i = sheets.findIndex((s) => s.filterBy);
              if (i >= 0) pickTab(i);
            }}>{b}</button>
          ))}
          <p className="wb-btnhint muted">點選費用類別，開啟「費用明細表」並篩選該類別。</p>
        </div>
      )}

      {sheet.custom === 'render' && sheet.render({ ctx, getRaw, setCell, readOnly, filter, setFilter, pickTab })}
      {/* 11/18：名稱建立表單（例如出國計畫名稱設定：輸入新名稱 → 新增到下方清單的第一個空白列） */}
      {sheet.custom === 'nameForm' && <NameForm sheet={sheet} cur={cur} getRaw={getRaw} setCell={setCell} readOnly={readOnly} />}

      {sheet.custom === 'history' && (
        <table className="wb-grid wb-hist">
          <thead><tr><th>時間</th><th>人員</th><th>單位</th><th>動作</th><th>意見</th></tr></thead>
          <tbody>{sheet.history.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      )}

      {/* 11/18：表格右上的單位說明（例如「單位：新臺幣千元」） */}
      {g && g.unitNote && <p className="wb-unitnote">{g.unitNote}</p>}
      {g && <Grid sheet={sheet} cur={cur} ctx={ctx} setCell={setCell} readOnly={readOnly} headers={headers} collapsed={collapsed} setCollapsed={setCollapsed} filter={sheet.filterBy ? filter : ''} setFilter={setFilter} />}
      {/* 11/19：同一頁籤第二張以後的表（例如資本支出「3_分年與科目金額」） */}
      {(sheet.extraGrids || []).map((g2, k) => {
        const sub = { ...sheet, id: `${sheet.id}~${k + 1}`, grid: g2, filterBy: undefined };
        return <div key={k} className="wb-extragrid"><Grid sheet={sub} cur={computeSheet(sub, getRaw, ctx)} ctx={ctx} setCell={setCell} readOnly={readOnly} headers={headers} collapsed={collapsed} setCollapsed={setCollapsed} filter="" setFilter={setFilter} /></div>;
      })}
    </div>
  );
}

function NameForm({ sheet, cur, getRaw, setCell, readOnly }) {
  const f = sheet.form;
  const key = `${sheet.id}|new`;
  const val = getRaw(key) ?? '';
  const add = () => {
    const name = String(val).trim();
    if (!name) { toast({ kind: 'warning', title: `請輸入${f.label}` }); return; }
    if (cur.rows.some((o) => o.vals[f.col] === name)) { toast({ kind: 'warning', title: '名稱重複', subtitle: `「${name}」已經建立過了。` }); return; }
    const slot = cur.rows.find((o) => !o.vals[f.col]);
    if (!slot) { toast({ kind: 'warning', title: '清單已滿', subtitle: '請先刪除不用的名稱。' }); return; }
    setCell(`${sheet.id}|${slot.row.id}|${f.col}`, name);
    setCell(key, '');
    toast({ kind: 'success', title: `${f.button}完成`, subtitle: `已建立「${name}」，各頁籤的「${f.ddLabel || '計畫名稱'}」可以選到。` });
  };
  return (
    <div className="wb-nameform">
      <table className="wb-fieldtbl is-panel">
        <caption>{f.caption}</caption>
        <tbody><tr><th scope="row">{f.label}</th><td className="c-in"><CellInput value={val} fmt="text" readOnly={readOnly} onCommit={(v) => setCell(key, v)} label={f.label} /></td></tr></tbody>
      </table>
      <button type="button" className="wb-action" disabled={readOnly} onClick={add}>{f.button}</button>
      <p className="wb-listcap">{f.listCaption}（{cur.rows.filter((o) => o.vals[f.col]).length}）</p>
    </div>
  );
}

// ───────────── 試算表 ─────────────
function Grid({ sheet, cur, ctx, setCell, readOnly, headers, collapsed, setCollapsed, filter, setFilter }) {
  const g = sheet.grid;
  const cols = g.cols;
  const frozen = g.frozen || 0;
  const lefts = useMemo(() => { const out = []; let x = headers ? 40 : 0; cols.forEach((c, i) => { out.push(i < frozen ? x : null); x += c.w || 100; }); return out; }, [cols, frozen, headers]);
  const sticky = (i, extra = {}) => (lefts[i] !== null && lefts[i] !== undefined ? { position: 'sticky', left: lefts[i], zIndex: 2, ...extra } : extra);

  const hiddenBy = (o) => o.anc.some((a) => collapsed.has(a));
  let rows = cur.rows.filter((o) => !hiddenBy(o));
  if (filter) rows = rows.filter((o) => o.vals[sheet.filterBy] === filter);
  const toggle = (id) => setCollapsed((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const totalRow = g.total && !filter ? (
    <tr className="r-total">
      {headers && <th className="rn" />}
      <td colSpan={g.total.span} style={sticky(0)} className="t-label">{g.total.label}</td>
      {cols.slice(g.total.span).map((c, j) => {
        const i = j + g.total.span;
        const v = cur.total[c.k];
        return <td key={c.k} className={isNumFmt(c.fmt) || c.t === 'calc' ? 'num' : ''} style={sticky(i)}>{v === undefined ? '' : fmtVal(v, c.t === 'calc' && c.fmt === 'text' ? 'num' : c.fmt)}</td>;
      })}
    </tr>
  ) : null;

  let rn = 0;
  return (
    <div className="wb-gridwrap">
      {filter && (
        <p className="wb-filter">篩選：<span className="wb-tag">{filter}<button type="button" aria-label="清除篩選" onClick={() => setFilter('')}><I d={close16} /></button></span>
          <span className="muted">共 {rows.length} 筆</span></p>
      )}
      <table className={`wb-grid ${headers ? 'with-headers' : ''}`}>
        <colgroup>
          {headers && <col style={{ width: 40 }} />}
          {cols.map((c) => <col key={c.k} style={{ width: c.w || 100 }} />)}
        </colgroup>
        <thead>
          {g.caption && <tr className="r-caption">{headers && <th className="rn" />}<th colSpan={cols.length}>{g.caption}</th></tr>}
          {headers && (
            <tr className="r-letters">
              <th className="rn corner" />
              {cols.map((c, i) => <th key={c.k} style={sticky(i)}>{colLetter(i)}</th>)}
            </tr>
          )}
          {(() => {
            // 依表頭的合併儲存格，算出每一列表頭每一格對應的欄位（凍結欄用）
            const occ = g.head.map(() => []);
            return g.head.map((hr, ri) => {
              let ci = 0;
              return (
                <tr key={ri}>
                  {headers && ri === 0 && <th className="rn" rowSpan={g.head.length} />}
                  {hr.map((hc, k) => {
                    while (occ[ri][ci]) ci += 1;
                    const start = ci;
                    for (let r = 0; r < (hc.rs || 1); r += 1) for (let c = 0; c < (hc.cs || 1); c += 1) { occ[ri + r] = occ[ri + r] || []; occ[ri + r][start + c] = true; }
                    ci += hc.cs || 1;
                    return <th key={k} colSpan={hc.cs} rowSpan={hc.rs} style={(hc.cs || 1) === 1 ? sticky(start) : undefined}>{hc.l}</th>;
                  })}
                </tr>
              );
            });
          })()}
        </thead>
        <tbody>
          {g.total?.pos === 'top' && totalRow}
          {rows.map((o) => {
            rn += 1;
            const grp = !o.leaf;
            return (
              <tr key={o.row.id} className={`${grp ? 'r-group' : 'r-leaf'} ${o.row.bandSum ? 'r-band' : ''} d${Math.min(o.depth, 3)}`} style={g.rowH ? { height: g.rowH } : undefined}>
                {headers && <th className="rn">{rn}</th>}
                {cols.map((c, i) => {
                  const v = o.vals[c.k];
                  const st = sticky(i);
                  if (c.tree) {
                    const canToggle = grp && !o.row.bandSum;
                    return (
                      <td key={c.k} className={`c-tree ${grp ? 'c-calc' : 'c-fixed'}`} style={{ ...st, paddingLeft: 8 + o.depth * 16 }}>
                        {canToggle ? (
                          <button type="button" className="wb-twisty" onClick={() => toggle(o.row.id)} aria-expanded={!collapsed.has(o.row.id)} aria-label={`${collapsed.has(o.row.id) ? '展開' : '收合'} ${v}`}>
                            <I d={collapsed.has(o.row.id) ? caretRight16 : caretDown16} />
                          </button>
                        ) : <span className="wb-twisty-sp" />}
                        {v}
                      </td>
                    );
                  }
                  if (grp || c.t === 'calc') return <td key={c.k} className={`c-calc ${isNumFmt(c.fmt) || c.t === 'calc' ? 'num' : ''}`} style={st}>{fmtVal(v, c.t === 'calc' && !isNumFmt(c.fmt) ? 'num' : c.fmt)}</td>;
                  if (c.t === 'text') return <td key={c.k} className="c-fixed" style={st}>{v}</td>;
                  const key = `${sheet.id}|${o.row.id}|${c.k}`;
                  if (c.t === 'dd') {
                    const opts = typeof c.options === 'function' ? c.options(ctx) : c.options;
                    return (
                      <td key={c.k} className="c-in" style={st}>
                        <select value={v ?? ''} onChange={(e) => setCell(key, e.target.value)} disabled={readOnly} aria-label={`${c.k} 第 ${rn} 列`}>
                          <option value="" />
                          {[...new Set([...(opts || []).filter(Boolean), ...(v ? [v] : [])])].map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </td>
                    );
                  }
                  return (
                    <td key={c.k} className={`c-in ${isNumFmt(c.fmt) ? 'num' : ''}`} style={st}>
                      <CellInput value={v} fmt={c.fmt} readOnly={readOnly} onCommit={(x) => setCell(key, x)} r={rn} c={i} label={`第 ${rn} 列 ${colLetter(i)} 欄`} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {g.total?.pos === 'bottom' && totalRow}
        </tbody>
      </table>
    </div>
  );
}

// ───────────── 可輸入的儲存格 ─────────────
function CellInput({ value, fmt, readOnly, onCommit, r, c, label }) {
  const [edit, setEdit] = useState(null);
  const orig = useRef('');
  const shown = edit !== null ? edit : fmtVal(value, fmt);
  // 內容沒有改變就不寫入（避免只是點進去再離開也算成修改）
  const commit = () => { if (edit === null) return; if (edit !== orig.current) onCommit(parseVal(edit, fmt)); setEdit(null); };
  const move = (e, dr) => {
    const t = e.currentTarget.closest('table')?.querySelector(`input[data-r="${r + dr}"][data-c="${c}"]`);
    if (t) { e.preventDefault(); commit(); t.focus(); return true; }
    return false;
  };
  return (
    <input
      className={`wb-cell ${isNumFmt(fmt) ? 'num' : ''}`}
      value={shown}
      readOnly={readOnly}
      data-r={r} data-c={c}
      aria-label={label}
      placeholder={fmt === 'date' && !readOnly ? 'yyyy/mm/dd' : undefined}
      inputMode={isNumFmt(fmt) ? 'decimal' : undefined}
      data-editing={edit !== null && edit !== orig.current ? '1' : undefined}
      onFocus={(e) => { if (!readOnly) { const o = value === '' || value === undefined || value === null ? '' : String(value); orig.current = o; setEdit(o); requestAnimationFrame(() => e.target.select()); } }}
      onChange={(e) => setEdit(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { if (!move(e, e.shiftKey ? -1 : 1)) e.currentTarget.blur(); }
        else if (e.key === 'ArrowDown') move(e, 1);
        else if (e.key === 'ArrowUp') move(e, -1);
        else if (e.key === 'Escape') { setEdit(null); e.currentTarget.blur(); }
      }}
    />
  );
}
