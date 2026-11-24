// ─────────────────────────────────────────────────────────────
// 第三層：明細表（11/18 使用者，依現行 PAW 畫面截圖）
//   從我的待辦、首頁待辦點明細表進來；網址 #rd:明細表代碼
//   左側：核准作業／提供給作業、作業數、選取作業、到期日、批准人、作業歷程、資產
//   頁籤：費用彙整、費用明細表、預算調整設定、簽核歷程
//   批准人目前依預設規則（上一層單位的審核人）；「預算審查設定」設定好後改讀 Plan
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import BudgetWorkbook from '../components/BudgetWorkbook.jsx';
import Icon from '../components/Icon.jsx';
import { usePerm } from '../permissions.jsx';
import { navigate } from '../useHashRoute.js';
import { dataService, approvalChain, detailUnits, hashOf, submitReview, decideReview, reviewHistory } from '../services/dataService.js';
import { loadPlan } from '../config/reviewPlans.js';
import { membersOfGroup } from '../config/userGroups.js';
import { MOCK_USERS, findUserId } from '../services/authService.js';
import { toast } from '../components/Notification.jsx';
import { ICT_SUMMARY, ICT_ADJUST } from '../config/budgetWorkbooks.js';
import { codeOf, fmtCode, withOrgCode, groupLabel } from '../config/org.js';
import { membersText } from '../services/authService.js';

// ───────────── 11/18 使用者：Plan 作業、核准／拒絕、作業歷程 ─────────────
// 這份明細表屬於 Plan（預算審查設定）的哪個作業、哪個提交群組（貢獻者）
function planCtx(unit) {
  const plan = loadPlan('rs-expense');
  const tries = unit === '全公司' ? ['會計處審'] : [`${unit}_審`, `${unit}本處_審`, `${unit.replace(/處$/, '')}處本處_審`];
  for (const c of tries) {
    const t = plan.tasks.find((x) => Array.isArray(x.contributors) && x.contributors.includes(c));
    if (t) return { task: t, c, approvers: (t.approvers && t.approvers[c]) || [] };
  }
  const t = plan.tasks.find((x) => Array.isArray(x.contributors) && x.contributors.includes('處審')) || plan.tasks[0];
  return { task: t, c: (t.contributors || [])[0] || '', approvers: (t.approvers && t.approvers[(t.contributors || [])[0]]) || [] };
}
// 這一關（段內或上一層）由哪些核准群組依序核准
function stageGroups(ctx, unit, at) {
  const own = ctx.approvers.filter((a) => a.startsWith(unit));
  const up = ctx.approvers.filter((a) => !a.startsWith(unit));
  const g = at === unit ? own : up;
  return g.length ? g : ctx.approvers;
}
const nameOfLogin = (login) => { const id = findUserId(login); return id ? MOCK_USERS[id].name : String(login).toUpperCase(); };
// 群組成員的顯示名稱：優先用 Prototype 有的測試帳號（不含 admin）
const firstMember = (g) => { const m = membersOfGroup(g).filter((x) => x.toLowerCase() !== 'admin'); const known = m.find((x) => findUserId(x)); return known ? nameOfLogin(known) : m.length ? nameOfLogin(m[0]) : 'Admin'; };
const fmtAt = (iso) => { const d = new Date(iso); const h = d.getHours(); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${h < 12 ? '上午' : '下午'}${String(h % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
// 示意歷程（依群組名稱固定產生）＋瀏覽器裡真的按過的紀錄
function historyOf(task, c, live) {
  const aps = (task.approvers && task.approvers[c]) || [];
  const h = hashOf(c);
  const base = new Date('2026-10-29T15:30:00+08:00').getTime() + (h % 40) * 60000;
  const at = (k) => new Date(base + k * 61000).toISOString();
  const out = [];
  const real = reviewHistory().filter((e) => e.c === c);
  if (!live) {
    let k = 0;
    out.push({ type: 'submit', who: 'Admin', at: at(k++) });
    const done = h % (aps.length + 1);
    aps.slice(0, done).forEach((a) => out.push({ type: 'approve', by: a, who: 'AdminAdminAdmin', at: at(k++) }));
    if (h % 4 === 0) out.push({ type: 'reset', who: 'Admin', at: at(k++) });
  } else if (live.sent) {
    if (!real.some((e) => e.type === 'submit')) out.push({ type: 'submit', who: live.submitter || firstMember(c), at: live.submitAt || at(0) });
    (live.passed || []).forEach((a, i) => out.push({ type: 'approve', by: a, who: firstMember(a), at: at(i + 1) }));
  }
  return [...out, ...real].sort((a, b) => (a.at < b.at ? 1 : -1));
}
const H_ICON = { submit: 'submitted', approve: 'check', reject: 'close', reset: 'swap' };
function HistLine({ e, c }) {
  if (e.type === 'submit') return <><b>{e.who}</b> 已代表 <b>{c}</b> 群組提交</>;
  if (e.type === 'reset') return <><b>{e.who}</b> 重設提交</>;
  if (e.type === 'approve') return <><b>{e.by}</b> 群組中的 <b>{e.who}</b> 已代表 <b>{c}</b> 群組核准提交</>;
  return <><b>{e.by}</b> 群組中的 <b>{e.who}</b> 已拒絕 <b>{c}</b> 群組的提交{e.note ? `：${e.note}` : ''}</>;
}
function HistoryModal({ ctx, live, onClose }) {
  const groups = (ctx.task.contributors || []).length ? ctx.task.contributors : [ctx.c];
  const [g, setG] = useState(ctx.c && groups.includes(ctx.c) ? ctx.c : groups[0]);
  const list = historyOf(ctx.task, g, g === ctx.c ? live : null);
  return createPortal(
    <div className="rdm-overlay" role="dialog" aria-modal="true" aria-label="作業歷程" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rdm rdm-hist">
        <header className="rdm-h"><small>{ctx.task.name}</small><h2>作業歷程</h2><button type="button" className="rdm-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button></header>
        <div className="rdm-body">
          <p>檢視此作業的註解及提交歷程。</p>
          <label className="rdm-lbl" htmlFor="rdm-g">選取群組</label>
          <select id="rdm-g" className="rdm-select" value={g} onChange={(e) => setG(e.target.value)}>
            {groups.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <ul className="rdm-hlist">
            {list.map((e, i) => (
              <li key={i}><Icon name={H_ICON[e.type]} size={16} /><div><p><HistLine e={e} c={g} /></p><small>{fmtAt(e.at)}</small></div></li>
            ))}
            {!list.length && <li className="muted">尚無歷程（這個群組還沒有提交）。</li>}
          </ul>
        </div>
        <footer className="rdm-f"><span /><button type="button" className="rdm-btn pri" onClick={onClose}>完成</button></footer>
      </div>
    </div>,
    document.body,
  );
}
function DecideModal({ ctx, pending, onClose, onDecide }) {
  const [g, setG] = useState(pending[0] || '');
  const [subs, setSubs] = useState(ctx.c ? [ctx.c] : []);
  const [note, setNote] = useState('');
  const others = (ctx.task.contributors || []).filter((x) => !subs.includes(x));
  return createPortal(
    <div className="rdm-overlay" role="dialog" aria-modal="true" aria-label="核准或拒絕作業" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rdm rdm-decide">
        <header className="rdm-h"><small>費用明細表</small><h2>核准或拒絕作業 "{ctx.task.name}"</h2><button type="button" className="rdm-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button></header>
        <div className="rdm-body">
          <p>選取針對此作業正在核准或拒絕哪個或哪些群組提交。如果您拒絕此作業，則會將它傳回給群組以重新提交。如果已核准，則會將它傳送至行核准者中的下一個，或標示為已完成。</p>
          <label className="rdm-lbl" htmlFor="rdm-ap">選取核准群組</label>
          <select id="rdm-ap" className="rdm-select" value={g} onChange={(e) => setG(e.target.value)}>
            {pending.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <span className="rdm-lbl">選取要核准或拒絕提交的提交群組</span>
          <div className="rdm-chips">
            {subs.map((x) => <span key={x} className="rdm-chip">{x}<button type="button" aria-label={`移除 ${x}`} onClick={() => setSubs(subs.filter((y) => y !== x))}>×</button></span>)}
            <select className="rdm-addsel" value="" onChange={(e) => e.target.value && setSubs([...subs, e.target.value])} aria-label="選取提交群組">
              <option value="">選取提交群組</option>
              {others.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="rdm-notehd"><b>新增註解（選用）</b><b>{note.length}/350</b></div>
          <textarea className="rdm-note" rows={5} maxLength={350} value={note} onChange={(e) => setNote(e.target.value)} placeholder="新增註解以支援所作的拒絕或核准。" />
          <button type="button" className="link-btn rdm-up" onClick={() => toast({ kind: 'info', title: '上傳檔案', subtitle: 'Prototype 不實際上傳檔案。' })}>上傳檔案 <Icon name="arrowRight" size={14} /></button>
          <small className="rdm-hint">檔案大小上限為 5MB。您最多可以上傳 10 個檔案。支援的檔案類型為 .pdf、.docx、.xlsx、.csv 及 .pptx</small>
        </div>
        <footer className="rdm-f rdm-f3">
          <button type="button" className="rdm-cancel" onClick={onClose}>取消</button>
          <button type="button" className="rdm-btn danger" disabled={!g || !subs.length} onClick={() => onDecide('reject', g, subs, note)}>拒絕</button>
          <button type="button" className="rdm-btn pri" disabled={!g || !subs.length} onClick={() => onDecide('approve', g, subs, note)}>核准</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

const n = (x) => Number(x) || 0;
const fmt = (x) => Math.round(n(x)).toLocaleString('en-US');
const unitOf = (r) => (r.id.startsWith('out-') ? r.id.slice(4) : r.unit);
const taskName = (r) => (r.kind === 'out' ? `${unitOf(r)}明細表提交` : `${unitOf(r)}審查`);
// 11/18 使用者：組織代號一律對照「組織階層關係.1151005改」工作表「組織節點(父子)」A 欄（config/orgUnits.js）
const unitCode = (u = '') => codeOf(u === '全公司' ? '會計處' : u === '總公司' ? '總經理室' : u); // 全公司彙整由會計處（AAY00）提交；總公司批准人在總經理室（OBY00）
const withCode = (u = '') => withOrgCode(u, unitCode(u));
const addDays = (d, k) => { const t = new Date(`${d || '2026-11-12'}T00:00:00`); t.setDate(t.getDate() + k); return `${t.getFullYear()}/${String(t.getMonth() + 1).padStart(2, '0')}/${String(t.getDate()).padStart(2, '0')}`; };
const dueOf = (r) => (r.kind === 'out' ? (r.submitDate ? addDays(r.submitDate, 7) : '2026/11/25') : addDays(r.submitDate, 7));

// 預算表代碼（與費用彙整的類別按鈕對應）
const TABLES = [
  { code: '2101', cat: '動力費', acct: '510206' }, { code: '2102', cat: '電費', acct: '510206' },
  { code: '2104', cat: '水費', acct: '510206' }, { code: '2106', cat: '瓦斯費', acct: '510206' },
  { code: '2505', cat: '機修費', acct: '510206' }, { code: '2506', cat: '交修費', acct: '510206' },
  { code: '3205', cat: '服裝費', acct: '510207' },
];
// 每個單位填了哪些表、金額多少（示意，依單位名稱固定產生）
function rowsOfUnit(u) {
  const h = hashOf(u);
  const picked = TABLES.filter((t, i) => ((h >> i) & 1) || i === h % TABLES.length).slice(0, 4);
  return picked.map((t) => ({ unit: u, ...t, amt: 50000 + (hashOf(u + t.code) % 997) * 9871 }));
}

export default function ReviewDetailPage({ id }) {
  const { user } = usePerm();
  const [rv, setRv] = useState(null);
  const [modal, setModal] = useState('');
  useEffect(() => { let ok = true; dataService.getMyReviewItems(user).then((x) => { if (ok) setRv(x); }); return () => { ok = false; }; }, [user]);

  const all = useMemo(() => (rv ? [...rv.items, ...(rv.mine && !rv.items.some((r) => r.id === rv.mine.id) ? [rv.mine] : [])] : []), [rv]);
  const rec = all.find((r) => r.id === id);
  // 11/18 使用者：目前展示先這樣分——審核人員只有「核准作業」頁籤，其他人只有「提供給作業」頁籤
  const isReviewer = (user?.roles || []).includes('審核人員');
  const sideNow = isReviewer ? 'approve' : 'provide';
  const approveList = all.filter((r) => r.kind === 'in');
  // 11/18 使用者：Admin 看得到每一份明細表（各處的編列）
  const isAdmin = (user?.roles || []).includes('管理者');
  const provideList = isAdmin ? all : all.filter((r) => r.kind === 'out');
  const list = sideNow === 'approve' ? approveList : provideList;

  if (!rv) return <p className="muted">載入中…</p>;
  if (!rec) return <div className="rd-empty"><Icon name="lock" size={20} /><p>找不到這份明細表，或您沒有檢視權限。</p><a className="link-btn" href="#review-plan">回到我的待辦</a></div>;

  const unit = unitOf(rec);
  const chain = approvalChain(unit);
  // 11/18：Plan 作業與這一關的核准群組
  const ctx = planCtx(unit);
  const atUnit = rec.kind === 'in' ? (rec.reviewUnit || rec.approverUnit || '') : '';
  const stage = rec.kind === 'in' ? stageGroups(ctx, unit, atUnit) : [];
  const since = (() => { const h = reviewHistory().filter((e) => e.c === ctx.c); let i = h.length - 1; while (i >= 0 && h[i].type !== 'submit' && h[i].type !== 'reject') i -= 1; return h.slice(i + 1); })();
  const pending = stage.filter((g) => !since.some((e) => e.type === 'approve' && e.by === g));
  const canDecide = sideNow === 'approve' && rec.kind === 'in' && rec.result === '待審' && pending.length > 0;
  const submitted = sideNow === 'provide' && rec.kind === 'out' && !['尚未提交', '被退回'].includes(rec.result);
  const ownStage = ctx.approvers.filter((a) => a.startsWith(unit));
  const live = { sent: rec.kind === 'in' || submitted, submitter: rec.kind === 'out' ? (rec.submitter || user?.name) : firstMember(ctx.c), submitAt: rec.submitDate ? new Date(`${rec.submitDate}T09:30:00+08:00`).toISOString() : '', passed: rec.kind === 'out' && rec.at !== unit && submitted ? ownStage : rec.kind === 'in' && atUnit !== unit ? ownStage : [] };
  const reload = () => dataService.getMyReviewItems(user).then(setRv);
  const onDecide = (action, g, subs, note) => {
    const final = action === 'reject' || pending.filter((x) => x !== g).length === 0;
    decideReview({ unit, at: atUnit, action, final, groups: subs, by: g, who: user?.name || '', note });
    setModal('');
    toast({ kind: action === 'approve' ? 'success' : 'warning', title: action === 'approve' ? '已核准' : '已拒絕', subtitle: action === 'approve' ? (final ? `${ctx.c} 的提交已核准，送到下一關。` : `${g} 已核准，等待 ${pending.filter((x) => x !== g)[0]} 核准。`) : `已退回給 ${subs.join('、')} 重新提交。` });
    reload();
  };
  const units = detailUnits(unit);

  // 費用明細表（PAW 交叉分析表樣式）：單位 × 預算表 × 會計科目 → 金額、調整數、調整後金額、調整%
  const PIVOT = {
    id: 'rd-pivot', name: '費用明細表', custom: 'render', filterBy: 'cat',
    render: ({ ctx, filter, setFilter }) => {
      const adj = ctx.rowsOf(ICT_ADJUST.id).filter((r) => r.vals.unit && n(r.vals.pct));
      const pctOf = (u, cat) => { const hit = adj.find((a) => a.vals.unit === codeOf(u) && (!a.vals.cat || a.vals.cat === cat)); return hit ? n(hit.vals.pct) : 0; };
      const rows = units.flatMap(rowsOfUnit).filter((r) => !filter || r.cat === filter)
        .map((r) => { const d = -Math.round(r.amt * pctOf(r.unit, r.cat) / 100); return { ...r, d, after: r.amt + d }; });
      const groups = units.map((u) => rows.filter((r) => r.unit === u)).filter((g) => g.length);
      return (
        <div className="pv">
          <div className="pv-tools" aria-hidden="true"><Icon name="settings" size={16} /></div>
          <div className="pv-ctx">
            <span className="pv-chip"><i>◉</i>2027<Icon name="chevronDown" size={16} /></span>
            <span className="pv-chip"><i>◉</i>公司概算版<Icon name="chevronDown" size={16} /></span>
            <span className="pv-chip"><i>Σ</i>支出<Icon name="chevronDown" size={16} /></span>
            {filter && <span className="wb-tag pv-filter">{filter}<button type="button" aria-label="清除篩選" onClick={() => setFilter('')}>×</button></span>}
          </div>
          <div className="pv-ctx pv-dims">
            {['單位', '預算表', '會計科目'].map((x) => <span key={x} className="pv-chip"><Icon name="grid" size={14} />{x}<Icon name="chevronDown" size={16} /></span>)}
            <span className="pv-chip pv-coldim"><Icon name="grid" size={14} />量值<Icon name="chevronDown" size={16} /></span>
          </div>
          {!groups.length ? <p className="muted pv-none">這個類別沒有資料。</p> : (
            <table className="wb-grid pv-grid">
              <colgroup><col style={{ width: 168 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 150 }} /><col style={{ width: 140 }} /><col style={{ width: 150 }} /><col style={{ width: 110 }} /></colgroup>
              <thead><tr><th>單位</th><th>預算表</th><th>會計科目</th><th>金額</th><th>調整數</th><th>調整後金額</th><th>調整%</th></tr></thead>
              <tbody>
                {groups.flatMap((g) => g.map((r, i) => (
                  <tr key={r.unit + r.code}>
                    {i === 0 && <th rowSpan={g.length} className="pv-unit">{r.unit}</th>}
                    <th className="pv-rh">{r.code}</th>
                    <th className="pv-rh">{r.acct}</th>
                    <td className="num">{fmt(r.amt)}</td>
                    <td className="num">{fmt(r.d)}</td>
                    <td className="num">{fmt(r.after)}</td>
                    <td className="num pv-pct">{((r.after / r.amt) * 100).toFixed(2)}%</td>
                  </tr>
                )))}
              </tbody>
            </table>
          )}
        </div>
      );
    },
  };

  // 簽核歷程：計畫、狀態、目前關卡、現在要處理（批准人）、資料時間；點計畫名稱看流程圖
  const FLOW = { id: 'rd-flow', name: '簽核歷程', custom: 'render', render: () => <SignFlow rec={rec} chain={chain} /> };

  const workbook = { sections: [{ id: 'task', name: '資產', open: true, assets: [{ id: 'cost', name: '費用明細表', kind: 'book', sheets: [ICT_SUMMARY, PIVOT, ICT_ADJUST, FLOW] }] }] };
  const me = chain[0];
  const approver = rec.kind === 'in' ? { name: rec.approver || user?.name, unit: rec.approverUnit } : { name: me.approver, unit: me.approverUnit };

  return (
    <BudgetWorkbook
      key={id}
      title="費用明細表"
      workbook={workbook}
      who={`rv|${unit}`}
      unit={{ code: codeOf(unit), name: unit }}
      readOnly={sideNow !== 'approve'}
      noPanel={submitted}
      panelBody={({ pickTab }) => (
        <div className="rdp">
          <div className="rdp-h">
            <h2>費用明細表</h2>
            <button type="button" className="wb-tbtn sm" aria-label="重新整理" onClick={() => dataService.getMyReviewItems(user).then(setRv)}><Icon name="swap" size={16} /></button>
          </div>
          <div className="rdp-tabs" role="tablist">
            {[['approve', '核准作業'], ['provide', '提供給作業']].filter(([k]) => k === sideNow).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected="true" className="on">{l}</button>
            ))}
          </div>
          <div className="rdp-body">
            <h3>作業 <span className="wb-count">{list.length}</span></h3>
            {list.length ? (
              <>
                <label className="rdp-label" htmlFor="rdp-task">選取作業</label>
                <select id="rdp-task" className="rdp-select" value={list.some((r) => r.id === id) ? id : ''} onChange={(e) => e.target.value && navigate(`rd:${encodeURIComponent(e.target.value)}`)}>
                  {!list.some((r) => r.id === id) && <option value="">（請選擇）</option>}
                  {list.map((r) => <option key={r.id} value={r.id}>{withOrgCode(taskName(r), unitCode(unitOf(r)))}</option>)}
                </select>
                <dl className="rdp-dl">
                  <dt>到期日</dt><dd>{dueOf(rec)}</dd>
                  <dt>批准群組</dt><dd><b>{unitCode(approver.unit) ? groupLabel(unitCode(approver.unit)) : approver.unit}</b><small>成員：{membersText(unitCode(approver.unit))}</small></dd>
                  <dt>作業歷程</dt><dd><button type="button" className="link-btn rdp-link" onClick={() => setModal('hist')}><Icon name="launch" size={14} /> 檢視</button></dd>
                </dl>
              </>
            ) : <p className="muted rdp-none">{sideNow === 'approve' ? '目前沒有需要您核准的作業。' : '目前沒有您提供的作業。'}</p>}
            <h3>資產 <span className="wb-count">1</span></h3>
            <div className="wb-asset on"><Icon name="book" size={16} /><span>費用明細表</span><Icon name="check" size={16} /></div>
          </div>
          {/* 11/18 使用者：提供給作業——彙整後按「提交」送到下一關（PAW 左下的提交鈕） */}
          {sideNow === 'provide' && rec.kind === 'out' && (() => {
            const can = ['尚未提交', '被退回'].includes(rec.result);
            const to = rec.result === '尚未提交' || rec.result === '被退回' ? (rec.at && rec.at !== unit ? rec.at : unit) : rec.at;
            return (
              <button type="button" className="rdp-submit" disabled={!can} title={can ? `提交給 ${to} 的審核群組` : '已提交，等待下一關處理'}
                onClick={() => { submitReview(rec.id, { c: ctx.c, who: user?.name }); toast({ kind: 'success', title: '已提交', subtitle: `${rec.title} 已提交給 ${groupLabel(unitCode(to)) || to}` }); dataService.getMyReviewItems(user).then(setRv); }}>
                <span>{can ? '提交' : '已提交'}</span><Icon name="submitted" size={16} />
              </button>
            );
          })()}
          {/* 11/18 使用者：該關卡的審核者在「核准作業」下方有「核准 / 拒絕」 */}
          {canDecide && <button type="button" className="rdp-submit" onClick={() => setModal('decide')}><span>核准 / 拒絕</span></button>}
          {modal === 'hist' && <HistoryModal ctx={ctx} live={live} onClose={() => setModal('')} />}
          {modal === 'decide' && <DecideModal ctx={ctx} pending={pending} onClose={() => setModal('')} onDecide={onDecide} />}
        </div>
      )}
    />
  );
}

function SignFlow({ rec, chain }) {
  const [open, setOpen] = useState(true);
  const cur = chain.findIndex((c) => c.status !== '已核准');
  const at = chain[cur >= 0 ? cur : chain.length - 1];
  const STATUS = { 待審: '審核中', 已核准: '已核准', 已退回: '已退回', 尚未送達: '尚未提交' };
  const status = cur < 0 ? '已完成' : STATUS[at.status];
  const now = at.status === '尚未送達' || at.status === '已退回' ? groupLabel(unitCode(at.unit)) : `批准群組 ${groupLabel(unitCode(at.approverUnit))}`;
  return (
    <div className="sf">
      <h3>簽核流程</h3>
      <p className="muted">你參與的計畫（共同擁有人、貢獻者、核准者），每 5 分鐘從預算工作區更新一次。按計畫名稱看流程圖。</p>
      <table className="sf-table">
        <thead><tr><th>計畫</th><th>狀態</th><th>目前關卡</th><th>現在要處理</th><th>資料時間</th></tr></thead>
        <tbody>
          <tr>
            <td><button type="button" className="link-btn" onClick={() => setOpen(!open)} aria-expanded={open}>{rec.title}</button></td>
            <td>{status}</td>
            <td>{cur < 0 ? '—' : `${at.approverUnit}${at.level === '段' || at.level === '段內' ? '審核' : '審查'}`}</td>
            <td>{cur < 0 ? '—' : now}</td>
            <td>2026/11/18 13:55</td>
          </tr>
        </tbody>
      </table>
      {open && (
        <ol className="sf-flow" aria-label="流程圖">
          {chain.map((c, i) => (
            <li key={`${c.level}-${c.unit}`} className={i < cur || cur < 0 ? 'done' : i === cur ? 'now' : ''}>
              <span className="sf-box">
                <b>{c.level === '段內' ? `${c.unit} 承辦提交` : `${c.unit === '全公司' ? '會計處' : c.unit} 提交`}</b>
                <small>擁有者 {c.owner}</small>
              </span>
              <span className="sf-arrow" aria-hidden="true">→</span>
              <span className="sf-box sf-ap">
                <b>{c.approverUnit} {c.level === '段' || c.level === '段內' ? '審核' : '審查'}</b>
                <small>批准群組 {unitCode(c.approverUnit) ? groupLabel(unitCode(c.approverUnit)) : c.approverUnit}・成員 {membersText(unitCode(c.approverUnit))}</small>
              </span>
              {i < chain.length - 1 && <span className="sf-arrow" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      )}
      <p className="sf-note muted">批准人目前依預設規則（上一層單位的審核人）；「預算審查設定」設定完成後，改依 Plan 的設定呈現。</p>
    </div>
  );
}
