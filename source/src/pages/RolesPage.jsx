import { withOrgCode } from '../config/org.js';
import Icon from '../components/Icon.jsx';
import { EXTRA_FEATURES, flattenSiteMap } from '../config/navigation.js';
import { ROLES, DEFAULT_GRANTS, grantState, ASSIGNABLE, DEFAULT_ASSIGN } from '../config/rbac.js';
import { MOCK_USERS, personCode } from '../services/authService.js';
import { ORG_UNITS, unitByCode } from '../config/org.js';
import { usePerm } from '../permissions.jsx';
import { PageTitle } from '../components/FavoriteButton.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import { toast } from '../components/Notification.jsx';
import { useState } from 'react';

// 角色 × 功能 權限矩陣（Prototype：修改即時生效，只保存在這個瀏覽器工作階段）
export default function RolesPage({ node }) {
  const { grants, setGrants } = usePerm();
  const [q, setQ] = useState('');
  const rows = [
    ...flattenSiteMap().filter(({ node: n }) => !n.placeholder).map(({ node: n, depth }) => ({ id: n.id, label: n.label, depth, kind: n.launch ? '開啟外部' : n.embed ? '嵌入' : n.children ? '分類' : '頁面' })),
    ...EXTRA_FEATURES.map((f) => ({ id: f.id, label: f.label, depth: 0, kind: '畫面元素', extra: true })),
  ];

  const shown = rows.filter((r) => !q || r.label.includes(q.trim()) || r.id.includes(q.trim().toLowerCase()));

  const toggle = (role, id) => {
    setGrants((g) => {
      const list = g[role] || [];
      return { ...g, [role]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    });
  };

  return (
    <>
      <PageTitle node={node} desc="勾選即授權，授權上層會自動包含所有下層功能。修改立即生效，可用不同測試帳號登入確認。">
        <button className="btn-outline" onClick={() => { setGrants(DEFAULT_GRANTS); toast({ kind: 'info', title: '已還原預設權限' }); }}>還原預設</button>
      </PageTitle>

      <div className="table-card">
        <div className="table-meta">
          <span className="legend"><i className="lg explicit" /> 直接授權</span>
          <span className="legend"><i className="lg inherited" /> 由上層繼承</span>
          <span>Prototype：設定只保存在此瀏覽器；正式環境由 RBAC 服務提供。</span>
        </div>
        <TableToolbar value={q} onChange={setQ} placeholder="搜尋功能名稱或代碼" />
        <div className="table-scroll">
          <table className="data-table rbac-table">
            <thead>
              <tr>
                <th>功能</th>
                <th>類型</th>
                <th>功能代碼</th>
                {ROLES.map((r) => <th key={r} className="center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id} className={r.extra && !shown[i - 1]?.extra ? 'group-start' : ''}>
                  <td style={{ paddingLeft: 14 + r.depth * 22 }} className={r.depth === 0 ? 'strong' : ''}>{r.label}</td>
                  <td><span className="kind-pill">{r.kind}</span></td>
                  <td><code>{r.id}</code></td>
                  {ROLES.map((role) => {
                    const st = grantState(grants, role, r.id);
                    return (
                      <td key={role} className="center">
                        <label className={`chk ${st}`} title={st === 'inherited' ? '由上層或全部權限繼承' : ''}>
                          <input
                            type="checkbox"
                            checked={st !== 'none'}
                            disabled={st === 'inherited'}
                            onChange={() => toggle(role, r.id)}
                            aria-label={`${role}：${r.label}`}
                          />
                          <span><Icon name="check" size={12} strokeWidth={2.4} /></span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AssignPanel />
    </>
  );
}

// 11/17 使用者：公告由哪些單位或人員管理／發布，要能彈性設定（不限角色）
function AssignPanel() {
  const { assign = DEFAULT_ASSIGN, setAssign = () => {} } = usePerm();
  const [draft, setDraft] = useState({}); // { 功能代碼: { unit: '', user: '' } }
  const [err, setErr] = useState({});
  const val = (id, k) => draft[id]?.[k] || '';
  const setVal = (id, k, v) => { setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } })); setErr((e) => ({ ...e, [id]: '' })); };
  const update = (id, fn) => setAssign((a) => {
    const cur = { units: [], users: [], ...(a[id] || {}) };
    return { ...a, [id]: fn(cur) };
  });
  const addUnit = (id) => {
    const code = val(id, 'unit').trim().toUpperCase();
    if (!unitByCode(code)) { setErr((e) => ({ ...e, [id]: '查無此組織代號' })); return; }
    update(id, (c) => ({ ...c, units: c.units.includes(code) ? c.units : [...c.units, code] }));
    setVal(id, 'unit', '');
    toast({ kind: 'success', title: '已授權單位', subtitle: `${unitByCode(code).name}（含下層單位）` });
  };
  const addUser = (id) => {
    const uid = val(id, 'user');
    if (!MOCK_USERS[uid]) return;
    update(id, (c) => ({ ...c, users: c.users.includes(uid) ? c.users : [...c.users, uid] }));
    setVal(id, 'user', '');
    toast({ kind: 'success', title: '已授權人員', subtitle: `${MOCK_USERS[uid].name}（${uid}）` });
  };
  return (
    <div className="table-card as-card">
      <div className="as-head">
        <h2><Icon name="shield" size={18} /> 依單位或人員授權</h2>
        <p className="muted">公告的管理與發布，除了上方依角色授權，也可以直接指定單位或人員。授權單位時，該單位與其下層單位的人員都有權限；系統管理員一律有權限。</p>
      </div>
      <table className="data-table as-table">
        <thead><tr><th>功能</th><th>授權單位（含下層單位）</th><th>授權人員</th></tr></thead>
        <tbody>
          {ASSIGNABLE.map((f) => {
            const a = { units: [], users: [], ...(assign[f.id] || {}) };
            return (
              <tr key={f.id}>
                <td className="as-feat"><b>{f.label}</b><small className="muted">{f.desc}</small><code>{f.id}</code></td>
                <td>
                  <div className="as-chips">
                    {a.units.map((c) => (
                      <span key={c} className="as-chip">{withOrgCode(unitByCode(c)?.name || '（已刪除的單位）', c)}
                        <button type="button" aria-label={`移除 ${c}`} onClick={() => update(f.id, (x) => ({ ...x, units: x.units.filter((u) => u !== c) }))}><Icon name="close" size={12} /></button>
                      </span>
                    ))}
                    {!a.units.length && <span className="muted as-none">尚未指定</span>}
                  </div>
                  <div className="as-add">
                    <input value={val(f.id, 'unit')} onChange={(e) => setVal(f.id, 'unit', e.target.value.toUpperCase())} placeholder="組織代號，例如 GHY00" list={`as-units-${f.id}`} maxLength={8}
                      onKeyDown={(e) => { if (e.key === 'Enter') addUnit(f.id); }} aria-label={`${f.label}：新增授權單位`} />
                    <datalist id={`as-units-${f.id}`}>{ORG_UNITS.filter((r) => r[3] <= 2).map((r) => <option key={r[0]} value={r[0]}>{r[1]}</option>)}</datalist>
                    <button type="button" className="btn-outline sm" onClick={() => addUnit(f.id)}>加入單位</button>
                  </div>
                  {val(f.id, 'unit') && unitByCode(val(f.id, 'unit')) && <small className="as-hint">{withOrgCode(unitByCode(val(f.id, 'unit')).name, val(f.id, 'unit'))}</small>}
                  {err[f.id] && <small className="as-err">{err[f.id]}</small>}
                </td>
                <td>
                  <div className="as-chips">
                    {a.users.map((id) => (
                      <span key={id} className="as-chip">{withOrgCode(MOCK_USERS[id]?.name || id, personCode(id, MOCK_USERS[id] || {}))}
                        <button type="button" aria-label={`移除 ${id}`} onClick={() => update(f.id, (x) => ({ ...x, users: x.users.filter((u) => u !== id) }))}><Icon name="close" size={12} /></button>
                      </span>
                    ))}
                    {!a.users.length && <span className="muted as-none">尚未指定</span>}
                  </div>
                  <div className="as-add">
                    <select value={val(f.id, 'user')} onChange={(e) => setVal(f.id, 'user', e.target.value)} aria-label={`${f.label}：新增授權人員`}>
                      <option value="">選擇人員…</option>
                      {Object.entries(MOCK_USERS).filter(([id]) => !a.users.includes(id)).map(([id, u]) => <option key={id} value={id}>{withOrgCode(u.name, personCode(id, u))}・{u.dept}</option>)}
                    </select>
                    <button type="button" className="btn-outline sm" disabled={!val(f.id, 'user')} onClick={() => addUser(f.id)}>加入人員</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="as-foot muted">Prototype：設定只保存在此瀏覽器；正式環境由 RBAC 服務提供。
        <button type="button" className="link-btn" onClick={() => { setAssign(DEFAULT_ASSIGN); toast({ kind: 'info', title: '已清除單位與人員授權' }); }}>清除全部指定</button>
      </p>
    </div>
  );
}
