// ─────────────────────────────────────────────────────────────
// 右上角登入者（11/13）：Prototype 階段可點擊切換成其他測試帳號（不需密碼）
//   切換後重新載入目前頁面，讓權限、我的最愛、已讀狀態等都換成新使用者
//   正式環境由 SSO 帶入登入者，不提供切換（APP_CONFIG.auth.mode === 'sso' 時只顯示登入者）
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { APP_CONFIG } from '../config/appConfig.js';
import { MOCK_USERS, authService, personCode } from '../services/authService.js';
import { codeOf, fmtCode } from '../config/org.js';

// 11/18 使用者：名字旁顯示組織代號（大寫）；代號對照「組織節點(父子)」A 欄
const orgCode = (u, id) => personCode(id, { unitCode: (u.unitCode || codeOf(u.dept || '')) });

const meta = (u) => [u.dept, (u.roles || []).join('、')].filter(Boolean).join('・');

export default function UserSwitcher({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const canSwitch = APP_CONFIG.auth?.mode !== 'sso';

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const chip = (
    <>
      <span className="avatar">{user.name.slice(0, 1)}</span>
      <span className="user-meta">
        <b>{user.name}{orgCode(user, user.id) && <span className="org-code">{fmtCode(orgCode(user, user.id))}</span>}</b>
        <small>{meta(user)}</small>
      </span>
    </>
  );
  if (!canSwitch) return <div className="user-chip">{chip}</div>;

  const pick = (id) => {
    setOpen(false);
    if (id === user.id) return;
    authService.switchTo(id);
    window.location.reload();
  };

  return (
    <div className="user-switch" ref={ref}>
      <button className={`user-chip as-button ${open ? 'open' : ''}`} aria-haspopup="menu" aria-expanded={open}
        title="切換使用者（Prototype 測試用）" onClick={() => setOpen((v) => !v)}>
        {chip}
        <Icon name="chevronDown" size={14} className="user-caret" />
      </button>
      {open && (
        <div className="user-menu" role="menu" aria-label="切換使用者">
          <div className="user-menu-head">
            <b>切換使用者</b>
            <small>Prototype 測試用；正式環境由 SSO 帶入</small>
          </div>
          <ul>
            {Object.entries(MOCK_USERS).map(([id, u]) => (
              <li key={id}>
                <button role="menuitemradio" aria-checked={id === user.id} className={id === user.id ? 'on' : ''} onClick={() => pick(id)}>
                  <span className="avatar sm">{u.name.slice(0, 1)}</span>
                  <span className="um-text">
                    {/* 11/18 使用者：切換選單與右上角一致，組織代號用括號呈現，例如 劉佳穎 (MAY00) */}
                    <b>{u.name}{orgCode(u, id) && <span className="org-code">{fmtCode(orgCode(u, id))}</span>}</b>
                    <small>{meta(u)}</small>
                    {orgCode(u, id) !== id.toUpperCase() && <small className="um-code">帳號 {id}</small>}
                  </span>
                  {id === user.id && <Icon name="check" size={16} className="um-check" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
