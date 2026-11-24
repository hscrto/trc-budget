// ─────────────────────────────────────────────────────────────
// 審查計畫頁（預算審查設定 › 費用明細表／收入明細表，11/18 使用者，依 PAW Plans 畫面）
//   頁首：計畫名稱、計劃狀態、天剩餘、檢視計劃、計劃動作、新增作業
//   頁籤：概觀（監視計劃＋時間表）、作業（卡片，可展開、摘要、更多動作）、工作流程（可拖拉的畫布）、公告
//   公告：與 Portal 的公告串聯——有權限編輯這張明細表的人，可以在這裡針對新增／調整的內容發布公告，
//         會出現在 Portal 最新公告與訊息中心；Portal 的公告管理（依權限）也看得到、可以管理
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '../components/Notification.jsx';
import { usePerm } from '../permissions.jsx';
import { loadPlan, savePlan, resetPlan } from '../config/reviewPlans.js';
import { loadGroups, membersOfGroup } from '../config/userGroups.js';

import { getAll as getNews, upsert as upsertNews, remove as removeNews, newId, nowLocal, statusOf, fmtTime } from '../services/announcementStore.js';
import chevDown from '@carbon/icons/es/chevron--down/16.js';
import chevUp from '@carbon/icons/es/chevron--up/16.js';
import more from '@carbon/icons/es/overflow-menu--vertical/16.js';
import launch from '@carbon/icons/es/launch/16.js';
import add from '@carbon/icons/es/add/16.js';
import searchI from '@carbon/icons/es/search/16.js';
import filterI from '@carbon/icons/es/filter/16.js';
import cal from '@carbon/icons/es/calendar/16.js';
import book from '@carbon/icons/es/book/16.js';
import flowI from '@carbon/icons/es/flow/16.js';
import drag from '@carbon/icons/es/draggable/16.js';
import userI from '@carbon/icons/es/user/16.js';
import closeI from '@carbon/icons/es/close/20.js';
import saveI from '@carbon/icons/es/save/16.js';
import panelI from '@carbon/icons/es/side-panel--open/16.js';
import copyI from '@carbon/icons/es/copy/16.js';
import maxI from '@carbon/icons/es/maximize/16.js';
import minI from '@carbon/icons/es/minimize/16.js';
import zIn from '@carbon/icons/es/zoom--in/16.js';
import zOut from '@carbon/icons/es/zoom--out/16.js';
import zFit from '@carbon/icons/es/fit-to-screen/16.js';
import printI from '@carbon/icons/es/printer/16.js';
import uploadI from '@carbon/icons/es/upload/16.js';
import bI from '@carbon/icons/es/text--bold/16.js';
import iI from '@carbon/icons/es/text--italic/16.js';
import uI from '@carbon/icons/es/text--underline/16.js';
import colorI from '@carbon/icons/es/text--color/16.js';
import olI from '@carbon/icons/es/list--numbered/16.js';
import ulI from '@carbon/icons/es/list--bulleted/16.js';
import linkI from '@carbon/icons/es/link/16.js';
import clearI from '@carbon/icons/es/text--clear-format/16.js';
import netI from '@carbon/icons/es/group/16.js';
import editI from '@carbon/icons/es/edit/16.js';
import trashI from '@carbon/icons/es/trash-can/16.js';

function I({ d, size }) {
  const s = size || Number(d.attrs.width) || 16;
  return (
    <svg className="pl-ico" width={s} height={s} viewBox={d.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false">
      {d.content.map((c, i) => { const Tg = c.elem; return <Tg key={i} {...c.attrs} />; })}
    </svg>
  );
}

const TODAY = '2026-11-18';
const fmtD = (d) => (d ? d.replace(/-/g, '/') : '- -');
const days = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
const stateOf = (t) => (t.items && t.done >= t.items ? '已完成' : t.state === '進行中' || t.done > 0 ? '進行中' : '未開始');
const STATE_CLS = { 已完成: 'done', 進行中: 'doing', 未開始: 'todo' };

function Toggle({ on, onChange, labelOn = '作用中', labelOff = '非作用中', id }) {
  return (
    <label className={`pl-toggle ${on ? 'on' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="pl-toggle-track" aria-hidden="true"><span /></span>
      <span>{on ? labelOn : labelOff}</span>
    </label>
  );
}

function StateIcon({ s }) {
  if (s === '進行中') return <svg width="16" height="16" viewBox="0 0 16 16" aria-label="進行中"><circle cx="8" cy="8" r="6.5" fill="none" stroke="#f1c21b" strokeWidth="1.5" /><path d="M8 8V1.5A6.5 6.5 0 0 1 14.5 8Z" fill="#f1c21b" /></svg>;
  if (s === '已完成') return <svg width="16" height="16" viewBox="0 0 16 16" aria-label="已完成"><circle cx="8" cy="8" r="7" fill="#24a148" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>;
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-label="未開始"><circle cx="8" cy="8" r="6.5" fill="none" stroke="#8d8d8d" strokeWidth="1.2" strokeDasharray="2 2" /></svg>;
}

export default function PlanDetail({ node }) {
  const planId = node.id;
  const { user } = usePerm();
  const [plan, setPlanState] = useState(() => loadPlan(planId));
  const [tab, setTab] = useState('overview');
  const [menu, setMenu] = useState(''); // 'plan' | 'add' | 作業 id
  const [summary, setSummary] = useState(null); // { id, edit }
  const [confirmDel, setConfirmDel] = useState(null);
  useEffect(() => { setPlanState(loadPlan(planId)); setTab('overview'); }, [planId]);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!e.target.closest?.('.pl-pop, .pl-menu-btn')) setMenu(''); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const setPlan = (fn) => setPlanState((p) => { const v = typeof fn === 'function' ? fn(p) : fn; savePlan(planId, v); return v; });
  const updTask = (id, patch) => setPlan((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const tasks = plan.tasks;
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const lastDue = tasks.map((t) => t.due).filter(Boolean).sort().pop();
  const left = lastDue ? Math.max(0, days(TODAY, lastDue)) : 0;
  const copyId = (label, idv) => { try { navigator.clipboard?.writeText(idv); } catch { /* 略過 */ } toast({ kind: 'info', title: `已複製${label}`, subtitle: idv }); };

  const newTask = () => {
    const id = `t${Date.now().toString(36)}`;
    setPlan((p) => ({ ...p, tasks: [...p.tasks, { id, name: '新作業', desc: '', active: true, start: TODAY, due: '', items: 1, done: 0, state: '未開始', deps: [], contributors: [], approvers: {}, x: 90, y: 40 + p.tasks.length * 130 }] }));
    setSummary({ id, edit: true });
  };
  const taskAction = (t, a) => {
    setMenu('');
    if (a === 'submit') { updTask(t.id, { done: t.items, state: '已完成' }); toast({ kind: 'success', title: '已提交', subtitle: t.name }); }
    if (a === 'copyId') copyId('作業 ID', `${planId}.${t.id}`);
    if (a === 'edit') setSummary({ id: t.id, edit: true });
    if (a === 'dup') { const id = `t${Date.now().toString(36)}`; setPlan((p) => ({ ...p, tasks: [...p.tasks, { ...t, id, name: `${t.name}（副本）`, y: t.y + 120 }] })); toast({ kind: 'success', title: '已複製作業', subtitle: t.name }); }
    if (a === 'delete') setConfirmDel(t);
  };

  return (
    <div className="pl">
      <header className="pl-head">
        <h1>{plan.name}</h1>
        <div className="pl-head-r">
          <span className="pl-hstat">計劃狀態 <Toggle id="pl-active" on={plan.active} onChange={(v) => { setPlan((p) => ({ ...p, active: v })); toast({ kind: 'info', title: v ? '計劃已啟用' : '計劃已停用', subtitle: plan.name }); }} /></span>
          <span className="pl-hstat">天剩餘 <b>{left}</b></span>
          <button type="button" className="pl-link" onClick={() => toast({ kind: 'info', title: '檢視計劃', subtitle: `${plan.path}（正式環境會在預算工作區新視窗開啟）` })}>檢視計劃 <I d={launch} /></button>
          <span className="pl-menu-wrap">
            <button type="button" className={`pl-link pl-menu-btn ${menu === 'plan' ? 'open' : ''}`} aria-expanded={menu === 'plan'} onClick={() => setMenu(menu === 'plan' ? '' : 'plan')}>計劃動作 <I d={menu === 'plan' ? chevUp : chevDown} /></button>
            {menu === 'plan' && (
              <div className="pl-pop" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenu(''); toast({ kind: 'info', title: '編輯計劃', subtitle: 'Prototype 示意' }); }}>編輯</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(''); copyId('計劃 ID', planId); }}>複製計劃 ID</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(''); toast({ kind: 'info', title: '另存新檔', subtitle: `${plan.name}（副本）—Prototype 示意` }); }}>另存新檔</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(''); toast({ kind: 'info', title: '已重新整理權限' }); }}>重新整理權限</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(''); setPlanState(loadPlan(planId)); toast({ kind: 'info', title: '已重新整理計劃' }); }}>重新整理計劃</button>
                <button type="button" role="menuitem" className="pl-pop-sub" onClick={() => { setMenu(''); resetPlan(planId); setPlanState(loadPlan(planId)); toast({ kind: 'info', title: '已還原示意計劃' }); }}>還原示意資料（Prototype）</button>
              </div>
            )}
          </span>
          <span className="pl-menu-wrap">
            <button type="button" className="pl-primary pl-menu-btn" aria-expanded={menu === 'add'} onClick={() => setMenu(menu === 'add' ? '' : 'add')}>新增作業 <I d={chevDown} /></button>
            {menu === 'add' && (
              <div className="pl-pop pl-pop-full" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenu(''); newTask(); }}>新增作業</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(''); setTab('flow'); newTask(); }}>在工作流程中新增</button>
              </div>
            )}
          </span>
        </div>
      </header>

      <div className="pl-tabs" role="tablist">
        {[['overview', '概觀'], ['tasks', '作業'], ['flow', '工作流程'], ['news', '公告']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="pl-body">
        {tab === 'overview' && <Overview plan={plan} />}
        {tab === 'tasks' && <Tasks plan={plan} byId={byId} menu={menu} setMenu={setMenu} updTask={updTask} setPlan={setPlan} onAction={taskAction} onSummary={(id) => setSummary({ id, edit: false })} />}
        {tab === 'flow' && <Flow plan={plan} setPlan={setPlan} onAdd={newTask} onOpen={(id) => setSummary({ id, edit: false })} />}
        {tab === 'news' && <News planId={planId} plan={plan} user={user} />}
      </div>

      {summary && byId[summary.id] && (
        <Summary task={byId[summary.id]} tasks={tasks} plan={plan} edit={summary.edit}
          onEdit={() => setSummary({ ...summary, edit: true })}
          onClose={() => setSummary(null)}
          onSave={(patch) => { updTask(summary.id, patch); setSummary({ ...summary, edit: false }); toast({ kind: 'success', title: '已儲存作業', subtitle: patch.name }); }} />
      )}
      {confirmDel && (
        <Modal title="刪除作業" onClose={() => setConfirmDel(null)} danger
          footer={[{ label: '取消', kind: 'sec', on: () => setConfirmDel(null) }, { label: '刪除', kind: 'danger', on: () => {
            const t = confirmDel;
            setPlan((p) => ({ ...p, tasks: p.tasks.filter((x) => x.id !== t.id).map((x) => ({ ...x, deps: x.deps.filter((d) => d !== t.id) })) }));
            setConfirmDel(null); toast({ kind: 'info', title: '已刪除作業', subtitle: t.name });
          } }]}>
          <p>確定要刪除「{confirmDel.name}」嗎？相依於這個作業的關係也會一併移除。</p>
        </Modal>
      )}
    </div>
  );
}

// ───────────── 概觀 ─────────────
function Overview({ plan }) {
  const ts = plan.tasks;
  const cnt = (s) => ts.filter((t) => stateOf(t) === s).length;
  const [scale, setScale] = useState('月');
  const [st, setSt] = useState('全部');
  const [q, setQ] = useState('');
  const months = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'];
  const start = '2026-11-01'; const end = '2027-07-01';
  const span = days(start, end);
  const pos = (d) => `${(Math.max(0, Math.min(span, days(start, d))) / span) * 100}%`;
  const rows = ts.filter((t) => t.start && t.due).filter((t) => st === '全部' || stateOf(t) === st).filter((t) => !q.trim() || t.name.includes(q.trim()));
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <>
      <section className="pl-ov">
        <div className="pl-ov-main">
          <h2>監視計劃</h2>
          <p className="pl-ov-big">{cnt('已完成')}/{ts.length} 作業已完成</p>
          <div className="pl-bar" role="img" aria-label={`已完成 ${cnt('已完成')}、進行中 ${cnt('進行中')}、未開始 ${cnt('未開始')}`}>
            {['已完成', '進行中', '未開始'].map((s) => <i key={s} className={STATE_CLS[s]} style={{ width: `${(cnt(s) / Math.max(1, ts.length)) * 100}%` }} />)}
          </div>
          <p className="pl-legend">{['已完成', '進行中', '未開始'].filter((s) => cnt(s)).map((s) => <span key={s}><i className={STATE_CLS[s]} />{s} ({cnt(s)})</span>)}</p>
        </div>
        <div className="pl-people" title="參與人員"><I d={userI} /> {plan.contributors?.length || 0}{(plan.contributors || []).map((c, i) => <span key={c} className={`pl-av av${i}`}>{c}</span>)}</div>
      </section>
      <section className="pl-card">
        <h3 className="pl-card-h"><I d={drag} /> 時間表</h3>
        <div className="pl-filters">
          <select value={scale} onChange={(e) => setScale(e.target.value)} aria-label="時間單位"><option>月</option><option>季</option></select>
          <select defaultValue="全部" aria-label="時段"><option value="全部">時段</option><option>116 年度</option></select>
          <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="狀態"><option value="全部">狀態</option><option>進行中</option><option>未開始</option><option>已完成</option></select>
          <label className="pl-search"><I d={searchI} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋作業" aria-label="搜尋作業" /></label>
        </div>
        <div className="pl-gantt">
          <div className="pl-g-head">
            <b>所有作業</b>
            <div className="pl-g-scale">
              {months.map((m, i) => (
                <span key={m} style={{ left: pos(`${m}-01`) }}>
                  {(i === 0 || m.endsWith('-01')) && <b>{m.slice(0, 4)}</b>}
                  {scale === '季' ? (['01', '04', '07', '10'].includes(m.slice(5)) || i === 0 ? `Q${Math.ceil(Number(m.slice(5)) / 3)}` : '') : MN[Number(m.slice(5)) - 1]}
                </span>
              ))}
            </div>
          </div>
          {rows.map((t) => (
            <div key={t.id} className="pl-g-row">
              <span className="pl-g-name" title={t.name}>{t.name}</span>
              <div className="pl-g-track">
                {months.map((m) => <i key={m} className="pl-g-grid" style={{ left: pos(`${m}-01`) }} />)}
                <i className="pl-g-today" style={{ left: pos(TODAY) }} title={`今天 ${fmtD(TODAY)}`} />
                <span className={`pl-g-bar ${STATE_CLS[stateOf(t)]}`} style={{ left: pos(t.start), width: `calc(${pos(t.due)} - ${pos(t.start)})` }} title={`${t.name}：${fmtD(t.start)} – ${fmtD(t.due)}`} />
              </div>
            </div>
          ))}
          {!rows.length && <p className="muted pl-g-none">沒有符合的作業。</p>}
        </div>
      </section>
    </>
  );
}

// ───────────── 作業 ─────────────
function Tasks({ plan, byId, menu, setMenu, updTask, setPlan, onAction, onSummary }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const [only, setOnly] = useState('全部');
  const [dragId, setDragId] = useState('');
  const list = plan.tasks.filter((t) => (!q.trim() || t.name.includes(q.trim())) && (only === '全部' || (only === '作用中') === t.active));
  const move = (from, to) => setPlan((p) => {
    const a = [...p.tasks]; const i = a.findIndex((t) => t.id === from); const j = a.findIndex((t) => t.id === to);
    if (i < 0 || j < 0 || i === j) return p; const [x] = a.splice(i, 1); a.splice(j, 0, x); return { ...p, tasks: a };
  });
  return (
    <>
      <h2 className="pl-h2">管理您的作業 ({plan.tasks.length})</h2>
      <div className="pl-searchbar">
        <label className="pl-filter-btn" title="篩選">
          <I d={filterI} />
          <select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="篩選作業"><option>全部</option><option>作用中</option><option>非作用中</option></select>
        </label>
        <label className="pl-search wide"><I d={searchI} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋作業" aria-label="搜尋作業" /></label>
      </div>
      <div className="pl-tasks">
        {list.map((t) => {
          const isOpen = open.has(t.id);
          const toggleOpen = () => setOpen((s) => { const x = new Set(s); if (x.has(t.id)) x.delete(t.id); else x.add(t.id); return x; });
          return (
            <article key={t.id} className={`pl-task ${isOpen ? 'open' : ''} ${dragId === t.id ? 'dragging' : ''}`}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={() => { move(dragId, t.id); setDragId(''); }}>
              <header>
                <span className="pl-handle" draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId('')} title="拖曳調整順序" aria-label="拖曳調整順序"><I d={drag} /></span>
                <h3>{t.name}</h3>
                <Toggle id={`tg-${t.id}`} on={t.active} onChange={(v) => updTask(t.id, { active: v })} />
                <span className="pl-menu-wrap">
                  <button type="button" className="pl-icon pl-menu-btn" aria-label={`${t.name} 更多動作`} aria-expanded={menu === t.id} onClick={() => setMenu(menu === t.id ? '' : t.id)}><I d={more} /></button>
                  {menu === t.id && (
                    <div className="pl-pop" role="menu">
                      {[['submit', '提交'], ['copyId', '複製作業 ID'], ['edit', '編輯作業'], ['dup', '複製作業'], ['delete', '刪除作業']].map(([k, l]) => (
                        <button key={k} type="button" role="menuitem" className={k === 'delete' ? 'danger' : ''} onClick={() => onAction(t, k)}>{l}</button>
                      ))}
                    </div>
                  )}
                </span>
              </header>
              {t.desc && <p className="pl-task-desc">{t.desc}</p>}
              {isOpen && (
                <div className="pl-task-more">
                  <div><b><I d={book} /> 資產 (1)</b><span>{plan.name}</span><button type="button" className="pl-link sm" onClick={() => onSummary(t.id)}>摘要 <I d={launch} /></button></div>
                  <div><b><I d={flowI} /> 相依關係 ({t.deps.length})</b>{t.deps.length ? t.deps.map((d) => <span key={d}>{byId[d]?.name}</span>) : <span className="muted">無</span>}</div>
                  <div><b><I d={userI} /> 貢獻者 ({consOf(t).length})</b>{consOf(t).length ? <span className="pl-groups">{consOf(t).slice(0, 4).map((c) => <span key={c} className="pl-group" title={`核准者：${apOf(t, c).join(' → ') || '尚未指派'}`}>{c}<small>{apOf(t, c).length} 關</small></span>)}{consOf(t).length > 4 && <span className="muted">等 {consOf(t).length} 個群組</span>}</span> : <span className="muted">尚未設定</span>}</div>
                </div>
              )}
              <div className="pl-task-meta">
                <span><I d={cal} /> 到期： <b>{fmtD(t.due)}</b></span>
                <span className="pl-items">要素項 <b>已完成 {t.done}/{t.items}</b><span className="pl-mini"><i className={STATE_CLS[stateOf(t)]} style={{ width: `${Math.max(stateOf(t) === '進行中' ? 12 : 0, (t.done / Math.max(1, t.items)) * 100)}%` }} /></span></span>
                <button type="button" className="pl-icon pl-expand" aria-expanded={isOpen} aria-label={isOpen ? '收合' : '展開看更多'} onClick={toggleOpen}><I d={isOpen ? chevUp : chevDown} /></button>
              </div>
            </article>
          );
        })}
        {!list.length && <p className="muted">沒有符合的作業。</p>}
      </div>
    </>
  );
}

// ───────────── 工作流程（可拖拉的畫布） ─────────────
const NW = 264; const NH = 112;
function Flow({ plan, setPlan, onAdd, onOpen }) {
  const [pos, setPos] = useState(() => Object.fromEntries(plan.tasks.map((t) => [t.id, { x: t.x, y: t.y }])));
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panel, setPanel] = useState(true);
  const [full, setFull] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => { setPos((p) => Object.fromEntries(plan.tasks.map((t) => [t.id, p[t.id] || { x: t.x, y: t.y }]))); }, [plan.tasks]);
  const w = Math.max(900, ...Object.values(pos).map((p) => p.x + NW + 60));
  const h = Math.max(520, ...Object.values(pos).map((p) => p.y + NH + 60));

  const startDrag = (e, id) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX; const sy = e.clientY; const o = pos[id];
    const mv = (ev) => { setPos((p) => ({ ...p, [id]: { x: Math.max(0, o.x + (ev.clientX - sx) / zoom), y: Math.max(0, o.y + (ev.clientY - sy) / zoom) } })); setDirty(true); };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const save = () => { setPlan((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t, ...pos[t.id] })) })); setDirty(false); toast({ kind: 'success', title: '已儲存工作流程' }); };
  const relayout = () => {
    const ts = plan.tasks; const depth = {};
    const d = (t, seen = new Set()) => { if (depth[t.id] !== undefined) return depth[t.id]; if (seen.has(t.id)) return 0; seen.add(t.id); const v = t.deps.length ? 1 + Math.max(...t.deps.map((x) => (ts.find((y) => y.id === x) ? d(ts.find((y) => y.id === x), seen) : 0))) : 0; depth[t.id] = v; return v; };
    ts.forEach((t) => d(t));
    const col = {}; const next = {};
    ts.forEach((t) => { const c = depth[t.id]; col[c] = (col[c] || 0); next[t.id] = { x: 60 + c * (NW + 220), y: 40 + col[c] * (NH + 40) }; col[c] += 1; });
    setPos(next); setDirty(true); toast({ kind: 'info', title: '已重新排列流程', subtitle: '依相依關係由左到右排列，記得儲存。' });
  };
  const fit = (min = 0.4) => { const cw = (wrapRef.current?.clientWidth || 900) - 32; setZoom(Math.max(min, Math.min(1.2, cw / w))); };
  useEffect(() => { fit(0.75); }, [panel, full]); // eslint-disable-line react-hooks/exhaustive-deps -- 一開始就讓整個流程放進畫面
  const edges = plan.tasks.flatMap((t) => t.deps.filter((d) => pos[d]).map((d) => ({ from: pos[d], to: pos[t.id], key: `${d}-${t.id}` })));

  const content = (
    <section className={`pl-card pl-flow ${full ? 'is-full' : ''}`}>
      <div className="pl-ftool">
        <button type="button" className={`pl-icon ${panel ? 'on' : ''}`} aria-label="作業面板" title="作業面板" onClick={() => setPanel(!panel)}><I d={panelI} /></button>
        <button type="button" className="pl-icon" aria-label="複製" title="複製選取的作業" disabled><I d={copyI} /></button>
        <button type="button" className="pl-icon" aria-label={full ? '結束全螢幕' : '全螢幕'} title={full ? '結束全螢幕' : '全螢幕'} onClick={() => setFull(!full)}><I d={full ? minI : maxI} /></button>
        <button type="button" className="pl-tlink" onClick={save} disabled={!dirty}>儲存 <I d={saveI} /></button>
        <button type="button" className="pl-tlink" onClick={relayout}>重新排列流程 <I d={flowI} /></button>
        <span className="pl-fdirty">{dirty ? '有未儲存的變更' : ''}</span>
        <span className="pl-fright">
          <button type="button" className="pl-icon" aria-label="放大" title="放大" onClick={() => setZoom(Math.min(1.6, zoom + 0.1))}><I d={zIn} /></button>
          <button type="button" className="pl-icon" aria-label="縮小" title="縮小" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}><I d={zOut} /></button>
          <button type="button" className="pl-icon" aria-label="符合畫面" title="符合畫面" onClick={() => fit()}><I d={zFit} /></button>
          <button type="button" className="pl-icon" aria-label="列印" title="列印" onClick={() => toast({ kind: 'info', title: '列印工作流程', subtitle: 'Prototype 示意' })}><I d={printI} /></button>
        </span>
      </div>
      <div className="pl-fbody">
        {panel && (
          <aside className="pl-fpanel">
            <h3>作業</h3>
            <button type="button" className="pl-fadd" onClick={onAdd}><span>新增作業</span><I d={add} /><small>稍後新增詳細資料</small></button>
          </aside>
        )}
        <div className="pl-fmain">
          <h3>作業流程 <small className="muted">拖曳方塊調整位置；點方塊看摘要</small></h3>
          <div className="pl-canvas-wrap" ref={wrapRef}>
            <div className="pl-canvas" style={{ width: w * zoom, height: h * zoom }}>
              <div style={{ width: w, height: h, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
                <svg className="pl-edges" width={w} height={h} aria-hidden="true">
                  <defs><marker id="pl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c6c6c6" /></marker></defs>
                  {edges.map((e) => {
                    const x1 = e.from.x + NW; const y1 = e.from.y + 56; const x2 = e.to.x; const y2 = e.to.y + 56;
                    const mx = (x1 + x2) / 2;
                    return <path key={e.key} d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2 - 2} ${y2}`} fill="none" stroke="#c6c6c6" strokeWidth="2.5" markerEnd="url(#pl-arrow)" />;
                  })}
                </svg>
                {plan.tasks.map((t) => {
                  const p = pos[t.id] || { x: t.x, y: t.y };
                  const s = stateOf(t);
                  return (
                    <div key={t.id} className={`pl-node ${STATE_CLS[s]} ${t.active ? '' : 'inactive'}`} style={{ left: p.x, top: p.y }}
                      onPointerDown={(e) => startDrag(e, t.id)} onDoubleClick={() => onOpen(t.id)}>
                      <span className="pl-port in" /><span className="pl-port out" />
                      <div className="pl-node-h"><b title={t.name}>{t.name}</b><StateIcon s={s} /></div>
                      {t.due && <small>於 {fmtD(t.due)} 到期</small>}
                      <small className="pl-node-ap" title={consOf(t).join('、')}>貢獻者 {consOf(t).length > 1 ? `${consOf(t).length} 個群組` : (consOf(t)[0] || '—')}</small>
                      <button type="button" className="pl-node-open" onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpen(t.id)}>摘要</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
  return (
    <>
      <h2 className="pl-h2">管理您的作業 ({plan.tasks.length})</h2>
      {full ? createPortal(content, document.body) : content}
    </>
  );
}

// ───────────── 摘要（詳細資料）與編輯 ─────────────
// 11/18 使用者：依 PAW「編輯作業」——作業詳細資料、資產、貢獻者、核准者、管理程序 5 個子頁籤
//   貢獻者、核准者的群組來自「管理 > 群組」（Book2.xlsx）
const apOf = (task, c) => (task.approvers && !Array.isArray(task.approvers) ? task.approvers[c] || [] : []);
const consOf = (task) => (Array.isArray(task.contributors) ? task.contributors : []);
function Summary({ task, tasks, plan, edit, onEdit, onClose, onSave }) {
  if (edit) return <TaskEditor task={task} tasks={tasks} plan={plan} onClose={onClose} onSave={onSave} />;
  const cons = consOf(task);
  return (
    <Modal title={task.name} onClose={onClose} wide footer={[{ label: '編輯', kind: 'sec', on: onEdit }, { label: '完成', kind: 'pri', on: onClose }]}>
      <h4>詳細資料</h4>
      <dl className="pl-dl">
        <dt>名稱</dt><dd>{task.name}</dd>
        <dt>說明</dt><dd>{task.desc || ''}</dd>
        <dt>開始日期</dt><dd>{fmtD(task.start)}</dd>
        <dt>到期日</dt><dd>{fmtD(task.due)}</dd>
      </dl>
      <h4>資產 (1)</h4>
      <div className="pl-asset"><span><I d={book} /> {plan.name}</span><span>{plan.path}</span></div>
      <h4>貢獻者和核准者</h4>
      <table className="pl-mtable"><thead><tr><th>貢獻者</th><th>核准者</th></tr></thead>
        <tbody>{cons.length ? cons.map((c) => <tr key={c}><td>{c}</td><td>{apOf(task, c).join(', ') || <span className="muted">尚未指派</span>}</td></tr>) : <tr><td colSpan={2} className="muted">尚未設定（按「編輯」選擇貢獻者群組）</td></tr>}</tbody>
      </table>
    </Modal>
  );
}

const TE_TABS = [['detail', '作業詳細資料'], ['asset', '資產'], ['contrib', '貢獻者'], ['approve', '核准者'], ['proc', '管理程序']];
const ASSET_FOLDERS = ['00.基本設定維護', '01.空表編列', '02.概算審查資料', '03.交通部審查', '04.主計總處審查', '05.行政院審查', '06.立法院審查'];
function TaskEditor({ task, tasks, plan, onClose, onSave }) {
  const groups = useMemo(() => loadGroups(), []);
  const [tab, setTab] = useState('detail');
  const [f, setF] = useState(() => ({ ...task, contributors: [...consOf(task)], approvers: Object.fromEntries(consOf(task).map((c) => [c, [...apOf(task, c)]])) }));
  const [q, setQ] = useState('');
  const [aq, setAq] = useState('');
  const [adding, setAdding] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const others = tasks.filter((t) => t.id !== task.id);
  const toggleCon = (g) => setF((x) => (x.contributors.includes(g)
    ? { ...x, contributors: x.contributors.filter((c) => c !== g), approvers: Object.fromEntries(Object.entries(x.approvers).filter(([k]) => k !== g)) }
    : { ...x, contributors: [...x.contributors, g], approvers: { ...x.approvers, [g]: x.approvers[g] || [] } }));
  const setAp = (c, list) => setF((x) => ({ ...x, approvers: { ...x.approvers, [c]: list } }));
  const shown = groups.filter(([g]) => !q.trim() || g.includes(q.trim()));
  const save = () => {
    if (!f.name.trim()) { setTab('detail'); toast({ kind: 'warning', title: '請輸入作業名稱' }); return; }
    const miss = f.contributors.filter((c) => !(f.approvers[c] || []).length);
    if (miss.length) toast({ kind: 'info', title: '提醒', subtitle: `${miss.length} 個貢獻者尚未指派核准者` });
    onSave({ name: f.name.trim(), desc: f.desc, start: f.start, due: f.due, deps: f.deps, active: f.active, contributors: f.contributors, approvers: Object.fromEntries(f.contributors.map((c) => [c, f.approvers[c] || []])) });
  };
  return createPortal(
    <div className="pl-overlay" role="dialog" aria-modal="true" aria-label={`編輯作業：${task.name}`}>
      <div className="pl-te">
        <header className="pl-te-h"><h2>{f.name || task.name}</h2><p>在 {plan.name} 中編輯作業。</p><button type="button" className="pl-x" onClick={onClose} aria-label="關閉"><I d={closeI} size={20} /></button></header>
        <div className="pl-te-main">
          <nav className="pl-te-nav" aria-label="編輯作業">
            {TE_TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>)}
          </nav>
          <div className="pl-te-body">
            {tab === 'detail' && (
              <section className="pl-te-sec pl-te-detail">
                <div>
                  <h3>作業詳細資料</h3><p className="pl-te-desc">您的團隊成員將使用此資訊來瞭解在此作業中必須完成哪些動作。</p>
                  <label className="pl-te-f"><span>作業名稱</span><input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} /></label>
                  <label className="pl-te-f"><span>作業說明 <small>{(f.desc || '').length}/350</small></span><textarea rows={4} value={f.desc} maxLength={350} placeholder="新增此作業的說明" onChange={(e) => set('desc', e.target.value)} /></label>
                  <fieldset className="pl-te-f"><legend>作業相依關係（選用）</legend>
                    <div className="pl-checks">{others.map((t) => (
                      <label key={t.id}><input type="checkbox" checked={f.deps.includes(t.id)} onChange={(e) => set('deps', e.target.checked ? [...f.deps, t.id] : f.deps.filter((d) => d !== t.id))} /> {t.name}</label>
                    ))}</div>
                    <small>根據相依關係啟動此作業</small>
                  </fieldset>
                  <div className="pl-te-row">
                    <label className="pl-te-f"><span>開始日期（選用）</span><input type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></label>
                    <label className="pl-te-f"><span>到期日（選用）</span><input type="date" value={f.due} min={f.start || undefined} onChange={(e) => set('due', e.target.value)} /></label>
                  </div>
                </div>
                <aside>
                  <span className="pl-te-lbl">作業狀態</span>
                  <Toggle id={`te-${task.id}`} on={f.active} onChange={(v) => set('active', v)} />
                  <h4>上傳檔案</h4><p className="pl-te-desc">檔案大小上限為 5MB。您最多可以上傳 10 個檔案。支援的檔案類型為 .pdf、.docx、.xlsx、.csv 及 .pptx</p>
                  <div className="pl-te-drop">將檔案拖放到這裡或上傳</div>
                </aside>
              </section>
            )}
            {tab === 'asset' && (
              <section className="pl-te-sec">
                <h3>資產</h3><p className="pl-te-desc">選取您要包括的資產。拖曳資產，以將它們按照檢視順序進行排序。</p>
                <div className="pl-te-dual">
                  <div className="pl-te-box"><b>可用</b><div className="pl-te-search"><I d={searchI} /><input placeholder="搜尋資產" aria-label="搜尋資產" /></div><small className="muted">已共用</small>
                    <ul className="pl-te-folders">{ASSET_FOLDERS.map((x) => <li key={x}><span className="pl-te-fold" aria-hidden="true" />{x}</li>)}</ul></div>
                  <div className="pl-te-box"><b>已選取 (1)</b>
                    <div className="pl-te-asset"><I d={book} /><div><b>{plan.name}</b><small>{plan.path}</small><span className="pl-te-lbl">預設標籤</span><select defaultValue="2"><option value="2">2. {plan.name}</option></select></div></div></div>
                </div>
              </section>
            )}
            {tab === 'contrib' && (
              <section className="pl-te-sec">
                <h3>新增群組</h3><p className="pl-te-desc">選取需要存取此項作業的群組（群組在「管理 &gt; 群組」維護）。</p>
                <div className="pl-te-dual">
                  <div className="pl-te-box"><b>可用</b>
                    <div className="pl-te-search"><I d={searchI} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋群組" aria-label="搜尋群組" /></div>
                    <ul className="pl-te-list">{shown.map(([g, m]) => (
                      <li key={g}><label><input type="checkbox" checked={f.contributors.includes(g)} onChange={() => toggleCon(g)} /><span className={`pl-te-gav g${hashStr(g) % 6}`} aria-hidden="true"><I d={userI} /></span>{g}<small>{m.length} 人</small></label></li>
                    ))}{!shown.length && <li className="muted pl-te-none">找不到群組</li>}</ul>
                  </div>
                  <div className="pl-te-box"><div className="pl-te-boxh"><b>已選取 ({f.contributors.length})</b>{f.contributors.length > 0 && <button type="button" className="pl-link sm" onClick={() => setF((x) => ({ ...x, contributors: [], approvers: {} }))}>全部移除 ⊖</button>}</div>
                    <ul className="pl-te-list sel">{f.contributors.map((g) => (
                      <li key={g}><span className={`pl-te-gav g${hashStr(g) % 6}`} aria-hidden="true"><I d={userI} /></span>{g}<button type="button" className="pl-te-rm" aria-label={`移除 ${g}`} onClick={() => toggleCon(g)}>⊖</button></li>
                    ))}{!f.contributors.length && <li className="muted pl-te-none">尚未選取</li>}</ul>
                  </div>
                </div>
              </section>
            )}
            {tab === 'approve' && (
              <section className="pl-te-sec">
                <h3>新增核准者</h3><p className="pl-te-desc">在這裡指派核准者給您的貢獻者。視需要重新排序，以反映您的核准階層。</p>
                <div className="pl-te-box">
                  <div className="pl-te-search"><I d={searchI} /><input value={aq} onChange={(e) => setAq(e.target.value)} placeholder="搜尋貢獻者" aria-label="搜尋貢獻者" /></div>
                  <table className="pl-te-ap"><thead><tr><th>貢獻者</th><th>核准者</th></tr></thead>
                    <tbody>{f.contributors.filter((c) => !aq.trim() || c.includes(aq.trim())).map((c) => {
                      const list = f.approvers[c] || [];
                      return (
                        <tr key={c}>
                          <td><span className={`pl-te-gav g${hashStr(c) % 6}`} aria-hidden="true"><I d={userI} /></span>{c}</td>
                          <td><div className="pl-te-chips">
                            {list.map((a, i) => (
                              <span key={a} className="pl-te-chip" title={`第 ${i + 1} 關：${a}（${membersOfGroup(a).length} 人）`}>
                                {i > 0 && <button type="button" aria-label={`${a} 往前`} onClick={() => { const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setAp(c, n); }}>‹</button>}
                                <span>{i + 1}. {a}</span>
                                <button type="button" aria-label={`移除 ${a}`} onClick={() => setAp(c, list.filter((x) => x !== a))}>×</button>
                              </span>
                            ))}
                            {adding === c ? (
                              <select autoFocus className="pl-te-add" defaultValue="" onBlur={() => setAdding('')} onChange={(e) => { if (e.target.value) setAp(c, [...list, e.target.value]); setAdding(''); }} aria-label={`${c} 新增核准者`}>
                                <option value="">選擇群組…</option>
                                {groups.filter(([g]) => !list.includes(g)).map(([g]) => <option key={g} value={g}>{g}</option>)}
                              </select>
                            ) : <button type="button" className="pl-te-addbtn" onClick={() => setAdding(c)}>新增核准者 +</button>}
                          </div></td>
                        </tr>
                      );
                    })}{!f.contributors.length && <tr><td colSpan={2} className="muted">請先在「貢獻者」選擇群組。</td></tr>}</tbody>
                  </table>
                </div>
              </section>
            )}
            {tab === 'proc' && (
              <section className="pl-te-sec">
                <h3>管理事件程序</h3><p className="pl-te-desc">透過選取事件並執行程序來自動化您的作業。</p>
                <button type="button" className="pl-te-outline" onClick={() => toast({ kind: 'info', title: '新增處理程序', subtitle: '正式環境由預算工作區（PAW）設定事件程序。' })}>新增處理程序</button>
                <h4>事件</h4>
                <div className="pl-te-empty"><span className="pl-te-cube" aria-hidden="true" /><b>尚未新增任何程序</b><p>新增一個程序以開始自動化事件。</p></div>
              </section>
            )}
          </div>
        </div>
        <footer className="pl-te-f2"><button type="button" className="pl-mbtn sec" onClick={onClose}>取消</button><button type="button" className="pl-mbtn pri" onClick={save}>儲存</button></footer>
      </div>
    </div>,
    document.body,
  );
}
const hashStr = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);

// ───────────── 公告（與 Portal 串聯） ─────────────
function News({ planId, plan, user }) {
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [editor, setEditor] = useState(null); // null | {} | 公告
  useEffect(() => { const f = () => setTick((x) => x + 1); window.addEventListener('aa-news', f); return () => window.removeEventListener('aa-news', f); }, []);
  const list = useMemo(() => getNews().filter((a) => a.source === planId).filter((a) => !q.trim() || (a.body || '').includes(q.trim())).sort((a, b) => (b.publishAt || '').localeCompare(a.publishAt || '')), [planId, q, tick]);
  return (
    <section className="pl-card pl-news">
      <div className="pl-news-bar">
        {searching && <label className="pl-search"><I d={searchI} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋公告" aria-label="搜尋公告" /></label>}
        <button type="button" className="pl-icon" aria-label="搜尋" onClick={() => setSearching(!searching)}><I d={searchI} /></button>
        <button type="button" className="pl-primary sm" onClick={() => setEditor({})}>建立 <I d={add} /></button>
      </div>
      <p className="pl-news-note">這裡發布的公告會同步顯示在 Portal「最新公告」與訊息中心（標記為預算模組），Portal 的公告管理也可以看到並管理。</p>
      {!list.length ? (
        <div className="pl-empty">
          <svg width="72" height="80" viewBox="0 0 72 80" aria-hidden="true"><path d="M36 4 68 20v36L36 72 4 56V20z" fill="#e0e0e0" /><path d="M36 4 68 20 36 36 4 20z" fill="#f4f4f4" /><path d="M36 36v36L4 56V20z" fill="#c6c6c6" /><rect x="10" y="26" width="8" height="5" fill="#fff" opacity=".8" /></svg>
          <p>{q ? '沒有符合的公告。' : '沒有公告。若要建立一個，請按一下「建立」。'}</p>
        </div>
      ) : (
        <ul className="pl-news-list">
          {list.map((a) => (
            <li key={a.id}>
              <div className="pl-news-meta"><b>{a.author || a.from}</b><span>{fmtTime(a.publishAt)}</span><span className={`pl-news-st ${statusOf(a) === '已發布' ? 'on' : ''}`}>{statusOf(a)}</span></div>
              <div className="pl-news-body" dangerouslySetInnerHTML={{ __html: a.bodyHtml || a.body }} />
              {a.files?.length > 0 && <p className="pl-news-files">附件：{a.files.join('、')}</p>}
              <div className="pl-news-act">
                <button type="button" className="pl-link sm" onClick={() => setEditor(a)}><I d={editI} /> 編輯</button>
                <button type="button" className="pl-link sm danger" onClick={() => { removeNews(a.id); toast({ kind: 'info', title: '已刪除公告', subtitle: 'Portal 上也會一併移除' }); }}><I d={trashI} /> 刪除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editor && <NewsEditor init={editor} plan={plan} planId={planId} user={user} onClose={() => setEditor(null)} />}
    </section>
  );
}

const MAX = 350;
function NewsEditor({ init, plan, planId, user, onClose }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [len, setLen] = useState(0);
  const [files, setFiles] = useState(init.files || []);
  const [err, setErr] = useState('');
  useEffect(() => { if (ref.current) { ref.current.innerHTML = init.bodyHtml || init.body || ''; setLen(ref.current.innerText.trim().length); ref.current.focus(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (c, v) => { ref.current?.focus(); document.execCommand(c, false, v); setLen(ref.current.innerText.trim().length); };
  const onFiles = (e) => {
    const picked = [...e.target.files];
    const ok = picked.filter((f) => /\.(pdf|docx|xlsx|csv|pptx)$/i.test(f.name) && f.size <= 5 * 1024 * 1024);
    if (ok.length < picked.length) setErr('部分檔案的類型或大小不符，已略過。');
    setFiles((x) => [...x, ...ok.map((f) => f.name)].slice(0, 10));
    e.target.value = '';
  };
  const create = () => {
    const text = ref.current.innerText.trim();
    if (!text) return;
    if (text.length > MAX) { setErr(`公告最多 ${MAX} 字。`); return; }
    const first = text.split('\n')[0].slice(0, 46);
    upsertNews({
      ...(init.id ? init : { id: newId(), publishAt: nowLocal(), unpublishAt: '', pinned: false, draft: false }),
      system: 'budget', tag: '公告', title: `【${plan.name}】${first}`, body: text, bodyHtml: ref.current.innerHTML,
      from: user?.dept || '', author: user?.name || '', source: planId, sourceName: `${plan.name}（審查計畫）`, files,
    });
    toast({ kind: 'success', title: init.id ? '已更新公告' : '已發布公告', subtitle: 'Portal 最新公告也會顯示' });
    onClose();
  };
  return (
    <Modal title={init.id ? '編輯公告' : '建立公告'} onClose={onClose} wide
      footer={[{ label: '取消', kind: 'sec', on: onClose }, { label: init.id ? '儲存' : '建立', kind: 'pri', on: create, disabled: !len || len > MAX }]}>
      <div className="pl-rte-label"><span>在這裡鍵入您的公告</span><span className={len > MAX ? 'over' : ''}>{len}/{MAX}</span></div>
      <div className="pl-rte">
        <div className="pl-rte-tools" role="toolbar" aria-label="文字格式">
          {[[bI, 'bold', '粗體'], [iI, 'italic', '斜體'], [uI, 'underline', '底線']].map(([d, c, l]) => <button key={c} type="button" aria-label={l} title={l} onMouseDown={(e) => { e.preventDefault(); cmd(c); }}><I d={d} /></button>)}
          <button type="button" aria-label="文字顏色（紅）" title="文字顏色（紅）" onMouseDown={(e) => { e.preventDefault(); cmd('foreColor', '#da1e28'); }}><I d={colorI} /></button>
          {[[olI, 'insertOrderedList', '編號清單'], [ulI, 'insertUnorderedList', '項目符號清單']].map(([d, c, l]) => <button key={c} type="button" aria-label={l} title={l} onMouseDown={(e) => { e.preventDefault(); cmd(c); }}><I d={d} /></button>)}
          <button type="button" aria-label="插入連結" title="插入連結（選取文字後按）" onMouseDown={(e) => { e.preventDefault(); const sel = window.getSelection()?.toString(); if (sel) cmd('createLink', '#'); }}><I d={linkI} /></button>
          <span className="pl-rte-sp" />
          <button type="button" aria-label="清除格式" title="清除格式" onMouseDown={(e) => { e.preventDefault(); cmd('removeFormat'); }}><I d={clearI} /></button>
        </div>
        <div ref={ref} className="pl-rte-area" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="公告內容"
          onInput={() => { setLen(ref.current.innerText.trim().length); setErr(''); }} />
      </div>
      <button type="button" className="pl-link pl-upload" onClick={() => fileRef.current?.click()}>上傳檔案 <I d={uploadI} /></button>
      <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.xlsx,.csv,.pptx" hidden onChange={onFiles} />
      <p className="pl-upload-hint">檔案大小上限為 5MB。您最多可以上傳 10 個檔案。支援的檔案類型為 .pdf、.docx、.xlsx、.csv 及 .pptx</p>
      {files.length > 0 && <ul className="pl-files">{files.map((f) => <li key={f}>{f}<button type="button" aria-label={`移除 ${f}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))}>×</button></li>)}</ul>}
      {err && <p className="pl-err">{err}</p>}
      <p className="pl-upload-hint">發布後會出現在 Portal 最新公告，標題為「【{plan.name}】＋第一行文字」。</p>
    </Modal>
  );
}

// ───────────── Carbon Modal ─────────────
function Modal({ title, children, footer, onClose, wide }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(
    <div className="pl-overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`pl-modal ${wide ? 'wide' : ''}`}>
        <header><h2>{title}</h2><button type="button" className="pl-x" onClick={onClose} aria-label="關閉"><I d={closeI} size={20} /></button></header>
        <div className="pl-mbody">{children}</div>
        <footer>{footer.map((b) => <button key={b.label} type="button" className={`pl-mbtn ${b.kind}`} onClick={b.on} disabled={b.disabled}>{b.label}</button>)}</footer>
      </div>
    </div>,
    document.body,
  );
}
