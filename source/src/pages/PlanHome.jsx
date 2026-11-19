// ─────────────────────────────────────────────────────────────
// 預算編列與審查（11/18 使用者）：「預算編列維護App」與「預算審查設定Plan」共用的子首頁
//   頁籤：預算編列計畫維護（應用程式＝各類預算編列）｜審查計畫維護（計劃＝費用明細表、收入明細表）
//   版面依 PAW「預算編列與審查」清單截圖：Carbon 資料表格（勾選、名稱＋建立者、說明、類型、狀態、前次修改時間、最愛、更多）
//   選單點「預算編列維護App」開第一個頁籤，點「預算審查設定Plan」開第二個頁籤
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../useHashRoute.js';
import { usePrefs } from '../prefs.jsx';
import { toast } from '../components/Notification.jsx';
import { getGroups } from '../config/budgetGroups.js';
import { getNode } from '../config/navigation.js';
import search16 from '@carbon/icons/es/search/16.js';
import renew16 from '@carbon/icons/es/renew/16.js';
import grid16 from '@carbon/icons/es/grid/16.js';
import list16 from '@carbon/icons/es/list/16.js';
import settings16 from '@carbon/icons/es/settings/16.js';
import fav16 from '@carbon/icons/es/favorite/16.js';
import favOn16 from '@carbon/icons/es/favorite--filled/16.js';
import more16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import down16 from '@carbon/icons/es/chevron--down/16.js';
import up16 from '@carbon/icons/es/arrow--up/16.js';
import arrowDown16 from '@carbon/icons/es/arrow--down/16.js';
import app16 from '@carbon/icons/es/apps/16.js';
import map16 from '@carbon/icons/es/map/16.js';

function I({ d, className = '' }) {
  return (
    <svg className={`ph-ico ${className}`} width="16" height="16" viewBox={d.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {d.content.map((c, i) => { const T = c.elem; return <T key={i} {...c.attrs} />; })}
    </svg>
  );
}

// 前次修改時間（示意；依截圖）
const APP_TIME = { income: '2026/11/03 14:50', expense: '2026/11/03 14:53', overseas: '2026/11/09 15:26', capex: '2026/11/03 11:02', ict: '2026/11/05 10:49' };
const PLANS = [
  { id: 'rs-expense', name: '費用明細表', time: '2026/11/18 11:55' },
  { id: 'rs-income', name: '收入明細表', time: '2026/11/18 11:58' },
];

const TABS = [
  { id: 'app', route: 'budget-review', label: '預算編列計畫維護', sub: '只顯示我建立的預算編列' },
  { id: 'plan', route: 'review-setting', label: '審查計畫維護', sub: '只顯示我建立的審查' },
];

export default function PlanHome({ node }) {
  const tab = node.id === 'review-setting' ? 'plan' : 'app';
  const t = TABS.find((x) => x.id === tab);
  const { isFavorite, toggleFavorite } = usePrefs();
  const [q, setQ] = useState('');
  const [dir, setDir] = useState(1);
  const [view, setView] = useState('list');
  const [sel, setSel] = useState(() => new Set());
  const [menu, setMenu] = useState(''); // 開著的「更多」選單（列 id）
  const [create, setCreate] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { setQ(''); setSel(new Set()); setMenu(''); }, [tab]);
  useEffect(() => { const f = () => setTick((x) => x + 1); window.addEventListener('aa-groups', f); return () => window.removeEventListener('aa-groups', f); }, []);
  useEffect(() => {
    if (!menu && !create) return undefined;
    const close = (e) => { if (!e.target.closest?.('.ph-pop, .ph-more, .ph-create')) { setMenu(''); setCreate(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu, create]);

  const rows = useMemo(() => {
    const base = tab === 'app'
      ? getGroups().map((g) => ({ id: `bp-${g.id}`, name: g.name, type: '應用程式', time: APP_TIME[g.id] || '2026/11/18 09:00', icon: app16, cls: 'k-app' }))
      : PLANS.map((p) => ({ ...p, type: '計劃', icon: map16, cls: 'k-plan' }));
    const k = q.trim();
    return base.filter((r) => !k || r.name.includes(k)).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant') * dir);
  }, [tab, q, dir, tick]);

  const open = (r) => { if (getNode(r.id)) navigate(r.id); else toast({ kind: 'info', title: r.name, subtitle: '頁面尚未提供' }); };
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggleSel = (id) => setSel((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const MoreMenu = ({ r }) => (
    <div className="ph-pop" role="menu">
      <button type="button" role="menuitem" onClick={() => { setMenu(''); open(r); }}>開啟</button>
      <button type="button" role="menuitem" onClick={() => { setMenu(''); toast({ kind: 'info', title: '已複製連結', subtitle: r.name }); try { navigator.clipboard?.writeText(`${window.location.href.split('#')[0]}#${r.id}`); } catch { /* 略過 */ } }}>複製連結</button>
      <button type="button" role="menuitem" onClick={() => { setMenu(''); toast({ kind: 'info', title: '複製', subtitle: `${r.name}（Prototype 示意）` }); }}>建立副本</button>
    </div>
  );

  return (
    <div className="ph">
      <div className="ph-head">
        <div>
          <h1>預算編列與審查</h1>
          <p>{t.sub}</p>
        </div>
        <div className="ph-create-wrap">
          <button type="button" className="ph-create" aria-haspopup="menu" aria-expanded={create} onClick={() => setCreate(!create)}>建立 <I d={down16} /></button>
          {create && (
            <div className="ph-pop ph-pop-create" role="menu">
              <button type="button" role="menuitem" onClick={() => { setCreate(false); navigate('budget-plan'); }}>預算編列（應用程式）</button>
              <button type="button" role="menuitem" onClick={() => { setCreate(false); toast({ kind: 'info', title: '建立審查計畫', subtitle: '審查計畫（批准人流程）下一步設計' }); }}>審查計畫（計劃）</button>
            </div>
          )}
        </div>
      </div>

      <div className="ph-tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === tab} className={x.id === tab ? 'on' : ''} onClick={() => navigate(x.route)}>{x.label}</button>
        ))}
      </div>

      <div className="ph-body">
        {sel.size > 0 ? (
          <div className="ph-batch">
            <span>已選取 {sel.size} 項</span>
            <button type="button" onClick={() => toast({ kind: 'info', title: '批次動作', subtitle: 'Prototype 示意' })}>停用</button>
            <button type="button" onClick={() => setSel(new Set())}>取消</button>
          </div>
        ) : (
          <div className="ph-toolbar">
            <label className="ph-search"><I d={search16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋" aria-label="搜尋" /></label>
            <button type="button" className="ph-tool" aria-label="重新整理" data-tip="重新整理" onClick={() => { setTick((x) => x + 1); toast({ kind: 'info', title: '已重新整理' }); }}><I d={renew16} /></button>
            <button type="button" className={`ph-tool ${view === 'grid' ? 'on' : ''}`} aria-label="卡片檢視" data-tip="卡片檢視" onClick={() => setView('grid')}><I d={grid16} /></button>
            <button type="button" className={`ph-tool ${view === 'list' ? 'on' : ''}`} aria-label="清單檢視" data-tip="清單檢視" onClick={() => setView('list')}><I d={list16} /></button>
            <button type="button" className="ph-tool" aria-label="表格設定" data-tip="表格設定" onClick={() => toast({ kind: 'info', title: '表格設定', subtitle: 'Prototype 示意' })}><I d={settings16} /></button>
          </div>
        )}

        {view === 'list' ? (
          <table className="ph-table">
            <thead>
              <tr>
                <th className="ph-ck"><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)))} aria-label="全選" /></th>
                <th className="ph-name ph-sorted"><button type="button" onClick={() => setDir(-dir)}>名稱 <I d={dir > 0 ? up16 : arrowDown16} /></button></th>
                <th>說明</th><th>類型</th><th>狀態</th><th>前次修改時間</th><th className="ph-act" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={sel.has(r.id) ? 'on' : ''}>
                  <td className="ph-ck"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`選取 ${r.name}`} /></td>
                  <td className="ph-name">
                    <span className="ph-nm"><I d={r.icon} className={r.cls} /><a href={`#${r.id}`} onClick={(e) => { e.preventDefault(); open(r); }}>{r.name}</a></span>
                    <small>建立者：Admin</small>
                  </td>
                  <td>-</td><td>{r.type}</td><td>作用中</td><td>{r.time}</td>
                  <td className="ph-act">
                    <button type="button" className={`ph-icon ${isFavorite(r.id) ? 'fav' : ''}`} aria-label={isFavorite(r.id) ? '從我的最愛移除' : '加入我的最愛'} onClick={() => toggleFavorite(r.id)}><I d={isFavorite(r.id) ? favOn16 : fav16} /></button>
                    <span className="ph-more-wrap">
                      <button type="button" className="ph-icon ph-more" aria-label="更多動作" aria-expanded={menu === r.id} onClick={() => setMenu(menu === r.id ? '' : r.id)}><I d={more16} /></button>
                      {menu === r.id && <MoreMenu r={r} />}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="ph-empty">沒有符合的項目。</td></tr>}
            </tbody>
          </table>
        ) : (
          <div className="ph-grid">
            {rows.map((r) => (
              <div key={r.id} className="ph-tile">
                <button type="button" className={`ph-icon ph-tile-fav ${isFavorite(r.id) ? 'fav' : ''}`} aria-label="我的最愛" onClick={() => toggleFavorite(r.id)}><I d={isFavorite(r.id) ? favOn16 : fav16} /></button>
                <a href={`#${r.id}`} onClick={(e) => { e.preventDefault(); open(r); }}>
                  <span className={`ph-tile-ico ${r.cls}`}><I d={r.icon} /></span>
                  <b>{r.name}</b>
                  <small>{r.type}・作用中</small>
                  <small>{r.time}・Admin</small>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
