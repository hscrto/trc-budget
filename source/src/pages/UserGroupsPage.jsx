// ─────────────────────────────────────────────────────────────
// 群組管理（User Group；11/18 使用者：依 Book2.xlsx 的 Group／Login Id，給系統管理員維護）
//   這些群組用在「預算審查設定」各作業的貢獻者（Submitter）與核准者（Approver）
//   Prototype：存在瀏覽器（config/userGroups.js）；正式環境改讀 PAW／TM1 的使用者群組
// ─────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { PageTitle } from '../components/FavoriteButton.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import { toast } from '../components/Notification.jsx';
import { usePerm } from '../permissions.jsx';
import { MOCK_USERS, findUserId } from '../services/authService.js';
import { loadGroups, saveGroups, resetGroups, groupsEdited } from '../config/userGroups.js';
import { loadPlan } from '../config/reviewPlans.js';

const PLANS = [['rs-expense', '費用明細表'], ['rs-income', '收入明細表']];
// 哪些 Plan 作業用到這個群組（貢獻者或核准者）
function usageMap() {
  const m = {};
  const add = (g, s) => { (m[g] = m[g] || new Set()).add(s); };
  PLANS.forEach(([id, label]) => {
    const plan = loadPlan(id);
    (plan.tasks || []).forEach((t) => {
      const cons = Array.isArray(t.contributors) ? t.contributors : [];
      cons.forEach((c) => add(c, `${label}・${t.name}（貢獻者）`));
      if (t.approvers && !Array.isArray(t.approvers)) Object.values(t.approvers).flat().forEach((a) => add(a, `${label}・${t.name}（核准者）`));
    });
  });
  return m;
}
const memberLabel = (login) => {
  const id = findUserId(login);
  return id ? `${MOCK_USERS[id].name} (${login.toUpperCase()})` : login.toUpperCase();
};

export default function UserGroupsPage({ node }) {
  const { user } = usePerm();
  const isAdmin = (user?.roles || []).includes('管理者');
  const [list, setList] = useState(loadGroups);
  const [edited, setEdited] = useState(groupsEdited);
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('all');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState('');
  const usage = useMemo(usageMap, []);
  const commit = (next, msg) => { saveGroups(next); setList(next); setEdited(true); toast({ kind: 'success', title: msg }); };
  const k = q.trim().toLowerCase();
  const shown = list
    .filter(([g, m]) => !k || g.toLowerCase().includes(k) || m.some((x) => x.toLowerCase().includes(k) || memberLabel(x).toLowerCase().includes(k)))
    .filter(([g, m]) => only === 'all' || (only === 'used' ? usage[g] : !m.length));

  return (
    <>
      <PageTitle node={node} desc="預算審查設定（Plan）作業的貢獻者與核准者群組。來源：Book2.xlsx（Group／Login Id）。只有系統管理員可以編輯；正式環境改讀預算工作區的使用者群組。" />
      <div className="table-card">
        <div className="table-meta"><span>群組成員以登入帳號表示；同一個群組的成員都可以提交或核准該群組負責的作業。</span></div>
        <TableToolbar value={q} onChange={setQ} placeholder="搜尋群組名稱或成員帳號">
          <div className="uu-filter" role="group" aria-label="範圍">
            <button className={only === 'all' ? 'on' : ''} aria-pressed={only === 'all'} onClick={() => setOnly('all')}>全部（{list.length}）</button>
            <button className={only === 'used' ? 'on' : ''} aria-pressed={only === 'used'} onClick={() => setOnly('used')}>Plan 使用中（{list.filter(([g]) => usage[g]).length}）</button>
            <button className={only === 'empty' ? 'on' : ''} aria-pressed={only === 'empty'} onClick={() => setOnly('empty')}>沒有成員（{list.filter(([, m]) => !m.length).length}）</button>
          </div>
          {isAdmin && (
            <>
              {edited && <button type="button" className="link-btn" onClick={() => { resetGroups(); setList(loadGroups()); setEdited(false); toast({ kind: 'success', title: '已還原為 Excel 原始群組' }); }}>還原 Excel 群組</button>}
              <button type="button" className="btn-primary uu-add" onClick={() => setEdit({ isNew: true, name: '', members: [] })}><Icon name="add" size={16} /> 新增群組</button>
            </>
          )}
        </TableToolbar>
        <div className="table-scroll">
          <table className="data-table uu-table ug-table">
            <thead><tr><th>群組名稱</th><th className="center">人數</th><th>成員（登入帳號）</th><th>使用於（預算審查設定）</th>{isAdmin && <th className="uu-actcol">動作</th>}</tr></thead>
            <tbody>
              {shown.map(([g, m]) => (
                <tr key={g}>
                  <td className="strong">{g}</td>
                  <td className="center">{m.length}</td>
                  <td>{m.length ? <span className="ug-members">{m.map((x) => <span key={x} className={`ug-mem ${findUserId(x) ? 'known' : ''}`}>{memberLabel(x)}</span>)}</span> : <span className="muted">—</span>}</td>
                  <td>{usage[g] ? <span className="ug-use" title={[...usage[g]].join('\n')}>{[...usage[g]].slice(0, 2).join('、')}{usage[g].size > 2 ? ` 等 ${usage[g].size} 項` : ''}</span> : <span className="muted">—</span>}</td>
                  {isAdmin && (
                    <td className="uu-actcol">
                      <button type="button" className="link-btn" onClick={() => setEdit({ name: g, members: [...m], orig: g })}>編輯</button>
                      <button type="button" className={`link-btn ${del === g ? 'danger' : ''}`} disabled={!!usage[g]} title={usage[g] ? 'Plan 作業使用中，不能刪除' : ''}
                        onClick={() => { if (del !== g) { setDel(g); return; } commit(list.filter(([x]) => x !== g), `已刪除群組 ${g}`); setDel(''); }}>{del === g ? '確定刪除？' : '刪除'}</button>
                    </td>
                  )}
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={isAdmin ? 5 : 4} className="muted center">沒有符合的群組</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <GroupDrawer init={edit} list={list} onClose={() => setEdit(null)}
          onSave={(name, members) => {
            const next = edit.isNew ? [...list, [name, members]] : list.map(([g, m]) => (g === edit.orig ? [name, members] : [g, m]));
            commit(next, edit.isNew ? `已新增群組 ${name}` : `已更新群組 ${name}`);
            setEdit(null);
          }} />
      )}
    </>
  );
}

function GroupDrawer({ init, list, onClose, onSave }) {
  const [name, setName] = useState(init.name);
  const [members, setMembers] = useState(init.members);
  const [add, setAdd] = useState('');
  const [err, setErr] = useState('');
  const addOne = () => {
    const v = add.trim();
    if (!v) return;
    if (members.some((x) => x.toLowerCase() === v.toLowerCase())) { setErr(`${v} 已在群組中。`); return; }
    setMembers([...members, v]); setAdd(''); setErr('');
  };
  const save = () => {
    const n = name.trim();
    if (!n) return setErr('請輸入群組名稱。');
    if (list.some(([g]) => g === n && g !== init.orig)) return setErr(`群組 ${n} 已存在。`);
    onSave(n, members);
  };
  return createPortal(
    <div className="ud-overlay" role="dialog" aria-modal="true" aria-label={init.isNew ? '新增群組' : '編輯群組'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ud-drawer">
        <header className="ud-dh">
          <h2>{init.isNew ? '新增群組' : `編輯群組：${init.orig}`}</h2>
          <button type="button" className="ud-x" onClick={onClose} aria-label="關閉"><Icon name="close" size={20} /></button>
        </header>
        <div className="ud-form">
          <label className="ud-field"><span>群組名稱</span><input value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} maxLength={30} placeholder="例如 臺北工務段_審1" /></label>
          <div className="ud-field"><span>成員（登入帳號）</span>
            <div className="ug-add">
              <input value={add} onChange={(e) => { setAdd(e.target.value); setErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } }} placeholder="例如 ehy00_01" list="ug-users" maxLength={20} />
              <datalist id="ug-users">{Object.entries(MOCK_USERS).map(([id, u]) => <option key={id} value={id}>{u.name}</option>)}</datalist>
              <button type="button" className="btn-outline sm" onClick={addOne}>加入</button>
            </div>
            <ul className="ug-list">
              {members.map((x) => (
                <li key={x}><span>{memberLabel(x)}{!findUserId(x) && <small className="muted">（Prototype 沒有此測試帳號）</small>}</span>
                  <button type="button" className="ud-x sm" aria-label={`移除 ${x}`} onClick={() => setMembers(members.filter((y) => y !== x))}><Icon name="close" size={16} /></button></li>
              ))}
              {!members.length && <li className="muted">尚無成員</li>}
            </ul>
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
