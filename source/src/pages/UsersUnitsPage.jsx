import { withOrgCode } from '../config/org.js';
// ─────────────────────────────────────────────────────────────
// 系統管理 › 使用者與單位（11/13）
//   使用者：Prototype 測試帳號，每人都有所屬組織代號（依使用者提供的組織代號 Excel「組織節點(父子)」）
//   組織代號：Excel 全部組織節點；「Prototype 使用中」＝目前示意資料用到的處、段（含機廠等）、室與使用者單位
//   11/17 使用者：只有系統管理員可以編輯（新增、修改、刪除使用者與單位）
//     Prototype 存在瀏覽器，儲存後重新載入，讓選單權限、待辦等示意資料依新設定重算
//   正式環境：使用者由 SSO／人事系統帶入，組織代號由代碼主檔維護
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { PageTitle } from '../components/FavoriteButton.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import { MOCK_USERS, DEFAULT_USERS, suggestAccountId, findUserId, normalizeAccountIds, moveUserData } from '../services/authService.js';
import { MOCK_DEPTS } from '../services/dataService.js';
import { ORG_UNITS, unitByCode, unitByName, orgLevel, SECTIONS_OF, roomsOf } from '../config/org.js';
import { saveUsers, resetUsers, usersEdited } from '../services/userStore.js';
import { getUnitOverrides, saveUnitOverrides, resetUnitOverrides, unitOverrideCount, unitChange } from '../config/orgOverrides.js';
import { usePerm } from '../permissions.jsx';

const PAGE = 50;
const EDIT_ROLES = ['編列人員', '審核人員', '管理者']; // 「處以上」「會計處以上」依單位自動帶入，不在這裡選
const yes = (v) => (v ? <span className="kind-pill yes">是</span> : <span className="muted">否</span>);
const SAVED_KEY = 'aa.uu.saved';

// 儲存後重新載入（示意資料、選單權限依新設定重算），並在頁面上方顯示結果
function reloadWith(msg, tab) {
  try { sessionStorage.setItem(SAVED_KEY, JSON.stringify({ msg, tab })); } catch { /* 略過 */ }
  window.location.reload();
}

// 組織代號 → 畫面顯示的單位文字（例如 MHY01 → 「臺北機務段 運轉室」、AHY00 → 「會計處 預算科」）
export function deptOf(code) {
  const u = unitByCode(code);
  if (!u) return '';
  let p = u.parent ? unitByCode(u.parent) : null;
  while (p) {
    if (u.name.startsWith(p.name) && u.name.length > p.name.length) return `${p.name} ${u.name.slice(p.name.length)}`;
    p = p.parent ? unitByCode(p.parent) : null;
  }
  return u.name;
}

// Prototype 示意資料用到的組織代號
function usedCodes() {
  const set = new Set(Object.values(MOCK_USERS).map((u) => u.unitCode));
  const add = (name) => { const u = unitByName(name); if (u) set.add(u.code); };
  ['會計處', '總經理室', ...MOCK_DEPTS].forEach(add);
  Object.values(SECTIONS_OF).flat().forEach((sec) => { add(sec); roomsOf(sec).forEach((r) => add(sec + r)); });
  return set;
}

export default function UsersUnitsPage({ node }) {
  const { user } = usePerm();
  const isAdmin = (user?.roles || []).includes('管理者');
  const [saved] = useState(() => {
    try { const v = JSON.parse(sessionStorage.getItem(SAVED_KEY)); sessionStorage.removeItem(SAVED_KEY); return v; } catch { return null; }
  });
  const [tab, setTab] = useState(saved?.tab || 'users');
  const used = useMemo(usedCodes, []);
  return (
    <>
      <PageTitle node={node} desc="Prototype 的測試帳號與所屬組織代號，以及組織代號表（來源：「組織階層關係.1151005改」Excel「組織節點(父子)」A 欄）。只有系統管理員可以編輯。正式環境由 SSO／人事系統帶入。" />
      {saved?.msg && <p className="uu-saved" role="status"><Icon name="check" size={16} /> {saved.msg}</p>}
      <div className="mc-tabs" role="tablist" aria-label="使用者與單位">
        <a role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'on' : ''} href="#admin-users"
          onClick={(e) => { e.preventDefault(); setTab('users'); }}>
          <Icon name="user" size={16} /> 使用者 <span className="mc-count">{Object.keys(MOCK_USERS).length}</span>
        </a>
        <a role="tab" aria-selected={tab === 'units'} className={tab === 'units' ? 'on' : ''} href="#admin-users"
          onClick={(e) => { e.preventDefault(); setTab('units'); }}>
          <Icon name="grid" size={16} /> 組織代號 <span className="mc-count">{ORG_UNITS.length}</span>
        </a>
      </div>
      {tab === 'users' ? <UsersTab isAdmin={isAdmin} me={user?.id} /> : <UnitsTab used={used} isAdmin={isAdmin} />}
    </>
  );
}

// ───────────── 使用者 ─────────────
function UsersTab({ isAdmin, me }) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // { id?, ...user } 或 null
  const [del, setDel] = useState('');
  const rows = Object.entries(MOCK_USERS).map(([id, u]) => {
    const unit = unitByCode(u.unitCode);
    const parent = unit?.parent ? unitByCode(unit.parent) : null;
    const level = (u.roles || []).includes('管理者') ? '全系統（管理者）' : orgLevel(u.dept);
    return { id, ...u, unitName: unit?.name || '—', parentCode: parent?.code || '', parentName: parent?.name || '', level };
  });
  const k = q.trim();
  const shown = rows.filter((r) => !k || [r.id, r.name, r.dept, r.unitCode, r.unitName, r.parentName, r.level, ...(r.roles || [])].join(' ').includes(k));

  const commit = (map, msg) => { saveUsers(map); reloadWith(msg, 'users'); };
  const remove = (id) => {
    if (del !== id) { setDel(id); return; }
    const map = { ...MOCK_USERS }; delete map[id];
    commit(map, `已刪除帳號 ${id}。`);
  };

  return (
    <div className="table-card">
      <div className="table-meta"><span>每位使用者的所屬單位都有組織代號；預算流程層級依所屬單位判斷。右上角點登入者可切換成這些帳號。</span></div>
      <TableToolbar value={q} onChange={setQ} placeholder="搜尋帳號、姓名、單位或組織代號">
        {isAdmin && (
          <div className="uu-actions">
            {usersEdited() && <button type="button" className="link-btn" onClick={() => { resetUsers(); reloadWith('已還原為預設測試帳號。', 'users'); }}>還原預設帳號</button>}
            <button type="button" className="btn-primary uu-add" onClick={() => setEdit({ isNew: true, id: '', name: '', unitCode: '', roles: ['編列人員'], password: '1234' })}>
              <Icon name="add" size={16} /> 新增使用者
            </button>
          </div>
        )}
      </TableToolbar>
      <div className="table-scroll">
        <table className="data-table uu-table">
          <thead>
            <tr><th>帳號</th><th>姓名</th><th>所屬單位</th><th>上層單位</th><th>預算流程層級</th><th>角色</th><th>測試密碼</th>{isAdmin && <th className="uu-actcol">動作</th>}</tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td className="strong">{r.name}</td>
                <td>{withOrgCode(r.unitName, r.unitCode)}{r.unitName.replace(/\s/g, '') !== r.dept.replace(/\s/g, '') && <small className="uu-sub">畫面顯示：{r.dept}</small>}</td>
                <td>{r.parentCode ? withOrgCode(r.parentName, r.parentCode) : <span className="muted">（第一層）</span>}</td>
                <td><span className="kind-pill">{r.level}</span></td>
                <td>{(r.roles || []).join('、')}</td>
                <td><code>{r.password}</code></td>
                {isAdmin && (
                  <td className="uu-actcol">
                    <button type="button" className="link-btn" onClick={() => setEdit({ ...r, isNew: false })}>編輯</button>
                    {r.id !== me && (
                      <button type="button" className="link-btn uu-del" onClick={() => remove(r.id)} onBlur={() => setDel('')}>
                        {del === r.id ? '確定刪除？' : '刪除'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <UserDrawer init={edit} me={me} onClose={() => setEdit(null)} onSave={commit} />}
    </div>
  );
}

function UserDrawer({ init, me, onClose, onSave }) {
  const [f, setF] = useState({ ...init, roles: [...(init.roles || [])] });
  const [err, setErr] = useState('');
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };
  const unit = unitByCode((f.unitCode || '').trim().toUpperCase());
  const suggestion = init.isNew && unit ? suggestAccountId(unit.code, f.roles) : '';
  const toggleRole = (r) => set('roles', f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r]);
  const save = () => {
    const id = (f.id || '').trim();
    if (!/^[A-Za-z0-9_.-]{2,20}$/.test(id)) return setErr('帳號需為 2～20 個英數字或底線。');
    if (init.isNew && findUserId(id)) return setErr(`帳號 ${id} 已存在。`);
    if (!f.name.trim()) return setErr('請輸入姓名。');
    if (!unit) return setErr('組織代號不存在，請到「組織代號」頁籤查詢。');
    if (!f.roles.length) return setErr('請至少選一個角色。');
    if (init.id === me && !f.roles.includes('管理者')) return setErr('不能移除自己的管理者角色。');
    if (!f.password) return setErr('請輸入測試密碼。');
    const map = { ...MOCK_USERS };
    map[id] = { ...(MOCK_USERS[id] || {}), password: f.password, name: f.name.trim(), dept: deptOf(unit.code), unitCode: unit.code, roles: f.roles };
    // 11/18：同單位一般使用者變成多人時，原本的「代號」帳號自動改成「代號_01」
    const { map: fixed, renamed } = normalizeAccountIds(map);
    renamed.forEach(([a, b]) => moveUserData(a, b));
    const note = renamed.length ? `；${renamed.map(([a, b]) => `${a} 改為 ${b}`).join('、')}` : '';
    onSave(fixed, init.isNew ? `已新增帳號 ${id}（${f.name.trim()}）${note}。` : `已更新帳號 ${id}${note}。`);
  };
  return createPortal(
    <div className="ud-overlay" role="dialog" aria-modal="true" aria-label={init.isNew ? '新增使用者' : '編輯使用者'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ud-drawer">
        <header className="ud-dh">
          <h2>{init.isNew ? '新增使用者' : `編輯使用者：${init.id}`}</h2>
          <button type="button" className="ud-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button>
        </header>
        <div className="ud-form">
          <label className="ud-field"><span>帳號</span>
            <input value={f.id} onChange={(e) => set('id', e.target.value)} disabled={!init.isNew} placeholder="例如 EHY00、EHY00_01、EHY00_MGR" maxLength={20} />
            {init.isNew && (
              <small className="ud-hint">
                命名規則：一般使用者＝組織代號；同單位多人時全部加 _01、_02（原本的代號帳號會自動改成 _01）；有審核身分加 _MGR（同單位只會有一位管理職）。
                {suggestion && suggestion !== f.id && <> 建議：<button type="button" className="link-btn" onClick={() => set('id', suggestion)}>{suggestion}</button></>}
              </small>
            )}
          </label>
          <label className="ud-field"><span>姓名</span><input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={20} /></label>
          <label className="ud-field"><span>組織代號</span>
            <input value={f.unitCode} onChange={(e) => set('unitCode', e.target.value.toUpperCase())} placeholder="例如 MHY01" maxLength={8} list="ud-units" />
            <datalist id="ud-units">{ORG_UNITS.slice(0, 2000).map((r) => <option key={r[0]} value={r[0]}>{r[1]}</option>)}</datalist>
            <small className={unit ? 'ud-hint' : 'ud-hint bad'}>
              {unit ? <>所屬單位：{unit.name}（畫面顯示「{deptOf(unit.code)}」・預算流程層級：{orgLevel(deptOf(unit.code))}）；簽核群組：{unit.code}，群組內每個人都可以簽</> : f.unitCode ? '查無此代碼' : '輸入代碼，或從清單選擇'}
            </small>
          </label>
          <div className="ud-field"><span>角色</span>
            <div className="ud-checks">
              {EDIT_ROLES.map((r) => (
                <label key={r}><input type="checkbox" checked={f.roles.includes(r)} onChange={() => toggleRole(r)} /> {r}</label>
              ))}
            </div>
            <small className="ud-hint">「處以上」「會計處以上」依所屬單位自動帶入，不需要在這裡選。</small>
          </div>
          <label className="ud-field"><span>測試密碼</span><input value={f.password} onChange={(e) => set('password', e.target.value)} maxLength={20} /></label>
          {err && <p className="ud-err"><Icon name="alert" size={16} /> {err}</p>}
        </div>
        <footer className="ud-df">
          <button type="button" className="btn-outline" onClick={onClose}>取消</button>
          <button type="button" className="btn-primary" onClick={save}>儲存</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ───────────── 組織代號 ─────────────
function UnitsTab({ used, isAdmin }) {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('used');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState('');
  const k = q.trim().toUpperCase();
  const all = useMemo(() => ORG_UNITS.map((r) => ({ code: r[0], name: r[1], parent: r[2], level: r[3], budgetUnit: !!r[4], budgetPrep: !!r[5], change: unitChange(r[0]) })), []);
  const hasKids = useMemo(() => new Set(ORG_UNITS.map((r) => r[2]).filter(Boolean)), []);
  const userCodes = new Set(Object.values(MOCK_USERS).map((u) => u.unitCode));
  const rows = all
    .filter((r) => only === 'all' || (only === 'changed' ? !!r.change : used.has(r.code)))
    .filter((r) => !k || r.code.includes(k) || r.name.includes(q.trim()) || r.parent.includes(k));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const setFilter = (v) => { setOnly(v); setPage(1); };
  const changed = unitOverrideCount();

  const remove = (r) => {
    if (del !== r.code) { setDel(r.code); return; }
    const o = getUnitOverrides();
    if (o.added.some((x) => x[0] === r.code)) o.added = o.added.filter((x) => x[0] !== r.code);
    else o.removed = [...new Set([...o.removed, r.code])];
    delete o.edits[r.code];
    saveUnitOverrides(o);
    reloadWith(`已刪除單位 ${withOrgCode(r.name, r.code)}。`, 'units');
  };
  const canDelete = (r) => !hasKids.has(r.code) && !userCodes.has(r.code);

  return (
    <div className="table-card">
      <div className="table-meta">
        <span>預算單位＝提交明細表的單位（段、機廠、中心、處等）；預算編列單位＝提列單位（室），負責填表。</span>
      </div>
      <TableToolbar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="搜尋組織代號或名稱">
        <div className="uu-filter" role="group" aria-label="範圍">
          <button className={only === 'used' ? 'on' : ''} aria-pressed={only === 'used'} onClick={() => setFilter('used')}>Prototype 使用中（{used.size}）</button>
          <button className={only === 'all' ? 'on' : ''} aria-pressed={only === 'all'} onClick={() => setFilter('all')}>全部（{all.length}）</button>
          {changed > 0 && <button className={only === 'changed' ? 'on' : ''} aria-pressed={only === 'changed'} onClick={() => setFilter('changed')}>已修改（{all.filter((r) => r.change).length}）</button>}
        </div>
        {isAdmin && (
          <div className="uu-actions">
            {changed > 0 && <button type="button" className="link-btn" onClick={() => { resetUnitOverrides(); reloadWith('已還原為 Excel 原始組織代號表。', 'units'); }}>還原組織代號表</button>}
            <button type="button" className="btn-primary uu-add" onClick={() => setEdit({ isNew: true, code: '', name: '', parent: '', budgetUnit: false, budgetPrep: false })}>
              <Icon name="add" size={16} /> 新增單位
            </button>
          </div>
        )}
      </TableToolbar>
      <div className="table-scroll">
        <table className="data-table uu-table">
          <thead>
            <tr><th>單位名稱</th><th>上層單位</th><th className="center">階層</th><th className="center">預算單位</th><th className="center">預算編列單位</th><th className="center">Prototype</th>{isAdmin && <th className="uu-actcol">動作</th>}</tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.code}>
                <td className={r.level === 1 ? 'strong' : ''}>{withOrgCode(r.name, r.code)}{r.change && <span className={`uu-chg ${r.change}`}>{r.change === 'added' ? '新增' : '已修改'}</span>}</td>
                <td>{r.parent ? withOrgCode(unitByCode(r.parent)?.name || '', r.parent) : <span className="muted">（第一層）</span>}</td>
                <td className="center">{r.level}</td>
                <td className="center">{yes(r.budgetUnit)}</td>
                <td className="center">{yes(r.budgetPrep)}</td>
                <td className="center">{used.has(r.code) ? <span className="kind-pill used">使用中</span> : ''}</td>
                {isAdmin && (
                  <td className="uu-actcol">
                    <button type="button" className="link-btn" onClick={() => setEdit({ ...r, isNew: false })}>編輯</button>
                    {canDelete(r) ? (
                      <button type="button" className="link-btn uu-del" onClick={() => remove(r)} onBlur={() => setDel('')}>{del === r.code ? '確定刪除？' : '刪除'}</button>
                    ) : <span className="uu-nodel" title={hasKids.has(r.code) ? '底下還有單位，不能刪除' : '有使用者屬於這個單位，不能刪除'}>刪除</span>}
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={isAdmin ? 9 : 8} className="muted center">沒有符合的單位。</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="uu-pager">
        <span>共 {rows.length} 筆・第 {cur}／{pages} 頁</span>
        <button className="btn-outline sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>上一頁</button>
        <button className="btn-outline sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>下一頁</button>
      </div>
      {edit && <UnitDrawer init={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function UnitDrawer({ init, onClose }) {
  const [f, setF] = useState({ ...init });
  const [err, setErr] = useState('');
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };
  const parent = f.parent ? unitByCode(f.parent.trim().toUpperCase()) : null;
  const level = parent ? parent.level + 1 : 1;
  // 上層不能是自己或自己的下層
  const isDescendant = (code) => {
    let p = unitByCode(code);
    while (p) { if (p.code === init.code) return true; p = p.parent ? unitByCode(p.parent) : null; }
    return false;
  };
  const save = () => {
    const code = (f.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,8}$/.test(code)) return setErr('組織代號需為 3～8 個英文大寫或數字。');
    if (init.isNew && unitByCode(code)) return setErr(`組織代號 ${code} 已存在。`);
    if (!f.name.trim()) return setErr('請輸入單位名稱。');
    if (f.parent && !parent) return setErr('上層組織代號不存在。');
    if (parent && !init.isNew && isDescendant(parent.code)) return setErr('上層單位不能是自己或自己的下層單位。');
    const row = [code, f.name.trim(), parent ? parent.code : '', level, f.budgetUnit ? 1 : 0, f.budgetPrep ? 1 : 0];
    const o = getUnitOverrides();
    if (init.isNew) o.added = [...o.added, row];
    else if (o.added.some((x) => x[0] === code)) o.added = o.added.map((x) => (x[0] === code ? row : x));
    else o.edits[code] = row;
    saveUnitOverrides(o);
    reloadWith(init.isNew ? `已新增單位 ${withOrgCode(row[1], code)}。` : `已更新單位 ${withOrgCode(row[1], code)}。`, 'units');
  };
  return createPortal(
    <div className="ud-overlay" role="dialog" aria-modal="true" aria-label={init.isNew ? '新增單位' : '編輯單位'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ud-drawer">
        <header className="ud-dh">
          <h2>{init.isNew ? '新增單位' : `編輯單位：${withOrgCode(init.name || '', init.code)}`}</h2>
          <button type="button" className="ud-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button>
        </header>
        <div className="ud-form">
          <label className="ud-field"><span>組織代號</span>
            <input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} disabled={!init.isNew} placeholder="例如 MHY09" maxLength={8} />
          </label>
          <label className="ud-field"><span>單位名稱</span><input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={40} placeholder="例如 臺北機務段檢修室" /></label>
          <label className="ud-field"><span>上層組織代號（第一層請留空）</span>
            <input value={f.parent} onChange={(e) => set('parent', e.target.value.toUpperCase())} placeholder="例如 MHY00" maxLength={8} list="ud-units2" />
            <datalist id="ud-units2">{ORG_UNITS.filter((r) => r[3] <= 3).map((r) => <option key={r[0]} value={r[0]}>{r[1]}</option>)}</datalist>
            <small className={!f.parent || parent ? 'ud-hint' : 'ud-hint bad'}>
              {!f.parent ? '第一層（處、室等）' : parent ? `上層單位：${parent.name}・此單位為第 ${level} 層` : '查無此代碼'}
            </small>
          </label>
          <div className="ud-field"><span>預算流程</span>
            <div className="ud-checks col">
              <label><input type="checkbox" checked={!!f.budgetUnit} onChange={(e) => set('budgetUnit', e.target.checked)} /> 預算單位（提交明細表，例如段、處）</label>
              <label><input type="checkbox" checked={!!f.budgetPrep} onChange={(e) => set('budgetPrep', e.target.checked)} /> 預算編列單位（提列單位，例如室，負責填表）</label>
            </div>
          </div>
          {err && <p className="ud-err"><Icon name="alert" size={16} /> {err}</p>}
        </div>
        <footer className="ud-df">
          <button type="button" className="btn-outline" onClick={onClose}>取消</button>
          <button type="button" className="btn-primary" onClick={save}>儲存</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
