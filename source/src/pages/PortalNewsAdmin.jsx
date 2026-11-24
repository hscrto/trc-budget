// ─────────────────────────────────────────────────────────────
// Portal 公告管理（11/16 使用者：Admin 在 Portal 有發布公告的編輯中心，並可排程公告）
//   網址 #portal-news-admin；權限 news-admin（預設只有管理者）
//   入口：Portal 各版「最新公告」標題列的「管理公告」（只有有權限的人看得到）
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import UserSwitcher from '../components/UserSwitcher.jsx';
import SystemTag, { SYSTEM_TAGS } from '../components/SystemTag.jsx';
import emblemWhite from '../assets/emblem-white.png';
import { APP_CONFIG } from '../config/appConfig.js';
import { usePerm } from '../permissions.jsx';
import { SessionTimer } from '../session.jsx';
import { navigate } from '../useHashRoute.js';
import { openBudgetPage } from '../nodeActions.js';
import { toast } from '../components/Notification.jsx';
import {
  getAll, upsert, remove, resetAll, statusOf, nowLocal, fmtTime, newId, STATUSES,
} from '../services/announcementStore.js';

const STATUS_CLS = { 已發布: 'pub', 排程中: 'sch', 草稿: 'dft', 已下架: 'off' };
const blank = (user) => ({
  id: '', system: 'budget', tag: '公告', title: '', body: '', from: user?.dept?.split(/\s+/)[0] || '',
  mode: 'now', publishAt: '', unpublishAt: '', pinned: false,
});

export default function PortalNewsAdmin({ user, onLogout }) {
  const { can } = usePerm();
  const [tick, setTick] = useState(0);
  const [st, setSt] = useState('全部');
  const [sys, setSys] = useState('全部');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // 編輯中的公告（表單資料）
  const [confirmDel, setConfirmDel] = useState('');
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    window.addEventListener('aa-news', f);
    const timer = setInterval(f, 60000); // 排程時間到時更新狀態
    return () => { window.removeEventListener('aa-news', f); clearInterval(timer); };
  }, []);

  const now = nowLocal();
  const all = useMemo(() => getAll().map((a) => ({ ...a, status: statusOf(a, now) })), [tick, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (s) => all.filter((a) => a.status === s).length;
  const k = q.trim();
  const rows = all
    .filter((a) => (st === '全部' || a.status === st) && (sys === '全部' || a.system === sys) && (!k || `${a.title} ${a.body} ${a.from}`.includes(k)))
    .sort((x, y) => (STATUSES.indexOf(x.status) - STATUSES.indexOf(y.status)) || (y.publishAt || '').localeCompare(x.publishAt || ''));

  const bar = (
    <header className="topbar portal-bar">
      <div className="brand portal-brand">
        <img src={emblemWhite} alt="臺鐵公司" className="brand-emblem" />
        <span className="brand-name">{APP_CONFIG.suiteName}</span>
      </div>
      <div className="topbar-right">
        <SessionTimer />
        <UserSwitcher user={user} />
        <button className="topbar-logout" onClick={onLogout}><Icon name="logout" size={18} /> <span>登出</span></button>
      </div>
    </header>
  );
  // 11/17：管理（新增、修改、存草稿）與發布（發布、排程、下架、刪除）分開授權
  const canPub = can('news-publish');
  if (!can('news-admin') && !canPub) {
    return (
      <div className="portal">{bar}
        <main className="portal-inner na-page"><div className="card na-noacc"><Icon name="noAccess" size={28} /><p>您沒有公告管理權限，請洽系統管理員。</p>
          <button type="button" className="link-btn" onClick={() => navigate('portal')}>← 回到系統入口</button></div></main>
      </div>
    );
  }

  const act = (a, patch, msg) => {
    const { status, ...rest } = a; // eslint-disable-line no-unused-vars
    upsert({ ...rest, ...patch, updatedAt: now, updatedBy: user.name });
    toast({ kind: 'success', title: msg, subtitle: a.title });
  };
  const openEdit = (a) => setEdit(a ? {
    ...a, mode: a.draft ? 'draft' : a.publishAt > now ? 'schedule' : 'now',
  } : { ...blank(user), mode: canPub ? 'now' : 'draft' });
  // 沒有發布權限：只能修改草稿（已發布、排程中的公告改了等於發布）
  const canEdit = (a) => can('news-admin') && (canPub || a.status === '草稿');

  return (
    <div className="portal">
      {bar}
      <main className="portal-inner na-page">
        <p className="na-crumb"><button type="button" className="link-btn" onClick={() => navigate('portal')}>系統入口</button> / 公告管理</p>
        <div className="na-head">
          <div>
            <h1>公告管理</h1>
            <p className="muted">新增、修改 Portal 與各模組訊息中心的公告。可設定發布時間（排程）與下架時間；排程時間到了會自動出現在 Portal。</p>
            <p className="na-perm">
              <span className={`na-permtag ${can('news-admin') ? 'on' : ''}`}>{can('news-admin') ? '✓' : '✕'} 管理</span>
              <span className={`na-permtag ${canPub ? 'on' : ''}`}>{canPub ? '✓' : '✕'} 發布</span>
              <span className="muted">{canPub ? '您可以發布、排程、下架與刪除公告。' : '您可以新增與修改草稿；發布需由有發布權限的人員執行。'}</span>
              {can('admin-roles') && <button type="button" className="link-btn" onClick={() => openBudgetPage('admin-roles')}>設定誰可以管理／發布 <Icon name="launch" size={14} /></button>}
            </p>
          </div>
          {can('news-admin') && <button type="button" className="btn-primary na-add" onClick={() => openEdit(null)}>新增公告 <Icon name="add" size={16} /></button>}
        </div>

        <div className="na-stats">
          {['全部', ...STATUSES].map((s) => (
            <button key={s} type="button" className={`na-stat ${STATUS_CLS[s] || 'all'} ${st === s ? 'on' : ''}`} onClick={() => setSt(s)}>
              <b>{s === '全部' ? all.length : count(s)}</b><span>{s}</span>
            </button>
          ))}
        </div>

        <div className="card na-card">
          <div className="na-tools">
            <label className="na-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋標題、內容或發布單位" /></label>
            <select value={sys} onChange={(e) => setSys(e.target.value)} aria-label="所屬系統">
              <option value="全部">全部系統</option>
              {Object.entries(SYSTEM_TAGS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <span className="muted na-count">{rows.length} 筆</span>
          </div>
          <div className="na-scroll">
            <table className="data-table na-table">
              <thead><tr><th>狀態</th><th>系統</th><th>分類</th><th>標題</th><th>發布時間</th><th>下架時間</th><th>發布單位</th><th className="na-actcol">動作</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><span className={`na-st ${STATUS_CLS[a.status]}`}>{a.status}</span></td>
                    <td><SystemTag system={a.system} /></td>
                    <td><span className={`tag ${a.tag === '系統' ? 'sys' : ''}`}>{a.tag}</span></td>
                    <td className="na-title">{a.pinned && <span className="na-pin">置頂</span>}{canEdit(a) ? <button type="button" className="link-btn" onClick={() => openEdit(a)}>{a.title}</button> : <b>{a.title}</b>}{a.sourceName && <small className="na-src">來源：{a.sourceName}</small>}</td>
                    <td className="na-time">{a.draft ? <span className="muted">—</span> : fmtTime(a.publishAt)}{a.status === '排程中' && <em className="na-sch">排程</em>}</td>
                    <td className="na-time">{fmtTime(a.unpublishAt) || <span className="muted">不下架</span>}</td>
                    <td className="na-from">{a.from}</td>
                    <td className="na-actcol">
                      {canEdit(a) && <button type="button" className="link-btn" onClick={() => openEdit(a)}>編輯</button>}
                      {canPub && (a.status === '排程中' || a.status === '草稿') && <button type="button" className="link-btn" onClick={() => act(a, { draft: false, publishAt: now, unpublishAt: a.unpublishAt && a.unpublishAt <= now ? '' : a.unpublishAt }, '已立即發布')}>立即發布</button>}
                      {canPub && a.status === '已發布' && <button type="button" className="link-btn" onClick={() => act(a, { unpublishAt: now }, '已下架')}>下架</button>}
                      {canPub && a.status === '已下架' && <button type="button" className="link-btn" onClick={() => act(a, { unpublishAt: '' }, '已重新上架')}>重新上架</button>}
                      {!(canPub || (a.status === '草稿' && can('news-admin'))) ? null : confirmDel === a.id
                        ? <><button type="button" className="link-btn na-del" onClick={() => { remove(a.id); setConfirmDel(''); toast({ kind: 'success', title: '已刪除公告', subtitle: a.title }); }}>確定刪除</button><button type="button" className="link-btn" onClick={() => setConfirmDel('')}>取消</button></>
                        : <button type="button" className="link-btn na-del" onClick={() => setConfirmDel(a.id)}>刪除</button>}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} className="muted na-empty">沒有符合的公告</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <p className="na-foot"><button type="button" className="link-btn" onClick={resetAll}>還原為示意公告（Prototype）</button></p>
      </main>
      <footer className="portal-foot">© {APP_CONFIG.companyName}・{APP_CONFIG.version}</footer>
      {edit && <Editor init={edit} now={now} user={user} canPub={canPub} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ init, now, user, canPub, onClose }) {
  const [f, setF] = useState(init);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const isNew = !init.id;

  const save = (asDraft) => {
    const mode = asDraft ? 'draft' : f.mode;
    if (!f.title.trim()) return setErr('請輸入標題。');
    if (!asDraft && !f.body.trim()) return setErr('請輸入內容。');
    if (mode === 'schedule' && !f.publishAt) return setErr('請選擇排程發布時間。');
    if (mode === 'schedule' && f.publishAt <= now) return setErr('排程發布時間必須晚於現在。');
    const publishAt = mode === 'now' ? (init.publishAt && init.publishAt <= now && !init.draft ? init.publishAt : now) : mode === 'schedule' ? f.publishAt : f.publishAt;
    if (f.unpublishAt && publishAt && f.unpublishAt <= publishAt) return setErr('下架時間必須晚於發布時間。');
    const item = {
      id: f.id || newId(), system: f.system, tag: f.tag, title: f.title.trim(), body: f.body.trim(), from: f.from.trim() || '數位發展處',
      publishAt: mode === 'draft' ? (f.publishAt || '') : publishAt, unpublishAt: f.unpublishAt || '', pinned: !!f.pinned, draft: mode === 'draft',
      updatedAt: now, updatedBy: user.name,
    };
    upsert(item);
    toast({ kind: 'success', title: mode === 'draft' ? '已儲存草稿' : mode === 'schedule' ? `已排程，${fmtTime(item.publishAt)} 發布` : '已發布', subtitle: item.title });
    onClose();
  };
  const primaryLabel = f.mode === 'schedule' ? '排程發布' : isNew || init.draft ? '立即發布' : '儲存';

  return (
    <div className="na-overlay" role="dialog" aria-modal="true" aria-label={isNew ? '新增公告' : '編輯公告'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="na-drawer">
        <header className="na-dh">
          <h2>{isNew ? '新增公告' : '編輯公告'}</h2>
          <button type="button" className="na-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button>
        </header>
        <div className="na-form">
          <div className="na-field">
            <span>所屬系統</span>
            <div className="na-sys">
              {Object.entries(SYSTEM_TAGS).map(([id, label]) => (
                <button key={id} type="button" className={`na-sysbtn ${id} ${f.system === id ? 'on' : ''}`} onClick={() => set('system', id)} aria-pressed={f.system === id}>{label}</button>
              ))}
            </div>
          </div>
          <div className="na-row2">
            <div className="na-field">
              <span>分類</span>
              <div className="na-seg">{['公告', '系統'].map((t) => <button key={t} type="button" className={f.tag === t ? 'on' : ''} onClick={() => set('tag', t)}>{t}</button>)}</div>
            </div>
            <label className="na-field"><span>發布單位</span><input value={f.from} onChange={(e) => set('from', e.target.value)} maxLength={20} /></label>
          </div>
          <label className="na-field"><span>標題 <em>{f.title.length}／60</em></span><input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={60} placeholder="例如：116 年度預算審議時程公布" /></label>
          <label className="na-field"><span>內容</span><textarea rows={5} value={f.body} onChange={(e) => set('body', e.target.value)} maxLength={500} /></label>

          <div className="na-field">
            <span>發布方式</span>
            <div className="na-modes">
              {(canPub ? [['now', '立即發布'], ['schedule', '排程發布'], ['draft', '先存草稿']] : [['draft', '先存草稿']]).map(([m, label]) => (
                <label key={m} className={`na-mode ${f.mode === m ? 'on' : ''}`}>
                  <input type="radio" name="na-mode" checked={f.mode === m} onChange={() => set('mode', m)} /> {label}
                </label>
              ))}
            </div>
            {f.mode === 'schedule' && (
              <label className="na-sub">發布時間 <input type="datetime-local" value={f.publishAt} min={now} onChange={(e) => set('publishAt', e.target.value)} /></label>
            )}
          </div>
          <div className="na-row2">
            <label className="na-field"><span>下架時間（選填）</span>
              <span className="na-inline"><input type="datetime-local" value={f.unpublishAt} onChange={(e) => set('unpublishAt', e.target.value)} />
                {f.unpublishAt && <button type="button" className="link-btn" onClick={() => set('unpublishAt', '')}>清除</button>}</span>
            </label>
            <label className="na-check"><input type="checkbox" checked={!!f.pinned} onChange={(e) => set('pinned', e.target.checked)} /> 置頂（排在最上面）</label>
          </div>

          <div className="na-field">
            <span>預覽（Portal 最新公告）</span>
            <div className="na-preview">
              <span className="pn-date">{f.mode === 'schedule' ? (f.publishAt || '').slice(0, 10) || '—' : now.slice(0, 10)}</span>
              {f.pinned && <span className="na-pin">置頂</span>}
              <SystemTag system={f.system} />
              <span className={`tag ${f.tag === '系統' ? 'sys' : ''}`}>{f.tag}</span>
              <span className="pn-title">{f.title || <span className="muted">（標題）</span>}</span>
              <span className="pn-from">{f.from}</span>
            </div>
          </div>
          {err && <p className="na-err"><Icon name="alert" size={16} /> {err}</p>}
        </div>
        <footer className="na-df">
          <button type="button" className="link-btn" onClick={onClose}>取消</button>
          {!canPub && <span className="na-nopub muted">沒有發布權限，只能存成草稿</span>}
          {f.mode !== 'draft' && <button type="button" className="btn-secondary na-btn" onClick={() => save(true)}>儲存草稿</button>}
          <button type="button" className="btn-primary na-btn" onClick={() => save(f.mode === 'draft')}>{f.mode === 'draft' ? '儲存草稿' : primaryLabel}</button>
        </footer>
      </div>
    </div>
  );
}
