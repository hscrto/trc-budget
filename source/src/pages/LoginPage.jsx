import { withOrgCode } from '../config/org.js';
import { useState } from 'react';
import { orgLevel } from '../config/org.js';

const levelOf = (id, u) => ((u.roles || []).includes('管理者') ? '管理者' : orgLevel(u.dept || ''));
import Icon from '../components/Icon.jsx';
import logoFull from '../assets/logo-full.png';
import emblemWhite from '../assets/emblem-white.png';
import { APP_CONFIG } from '../config/appConfig.js';
import { InlineNotification } from '../components/Notification.jsx';
import { MOCK_USERS, authService } from '../services/authService.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  // 閒置自動登出後回到登入頁時顯示提示（只顯示一次）
  const [idleOut, setIdleOut] = useState(() => {
    try { const v = sessionStorage.getItem('aa.logoutReason') === 'idle'; sessionStorage.removeItem('aa.logoutReason'); return v; } catch { return false; }
  });
  const [missing, setMissing] = useState({});
  const [busy, setBusy] = useState(false);

  // 點選帶入測試帳號；direct＝直接登入
  async function pick(id, direct = false) {
    const u = MOCK_USERS[id];
    setUsername(id); setPassword(u.password); setMissing({}); setError('');
    if (!direct) return;
    setBusy(true);
    try { onLogin(await authService.login(id, u.password)); } catch (err) { setError(err.message || '登入失敗，請稍後再試。'); } finally { setBusy(false); }
  }

  async function submit(e) {
    e.preventDefault();
    const miss = { username: !username.trim(), password: !password };
    setMissing(miss);
    if (miss.username || miss.password) { setError(''); return; }
    setBusy(true);
    setError('');
    try {
      onLogin(await authService.login(username, password));
    } catch (err) {
      setError(err.message || '登入失敗，請稍後再試。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-brand" aria-hidden="true">
        <div className="login-rings">
          <span /><span /><span />
        </div>
        <div className="login-brand-inner">
          <img src={emblemWhite} alt="" className="login-emblem" />
          <h2>{APP_CONFIG.suiteName}</h2>
          <p className="login-brand-en">Accounting System</p>
          <p className="login-brand-desc">單一登入，進入所有會計相關模組</p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit} noValidate>
          <img src={logoFull} alt="臺鐵公司 Taiwan Railway" className="login-logo" />
          <h1>{APP_CONFIG.suiteName}</h1>
          <p className="login-sub">請使用您的個人帳號登入，登入後選擇要進入的模組</p>

          <label className="field">
            <span>帳號</span>
            <div className={`input-wrap ${missing.username ? 'invalid' : ''}`}>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setMissing((m) => ({ ...m, username: false })); }}
                placeholder="請輸入帳號"
                aria-invalid={!!missing.username}
                autoFocus
              />
              {missing.username && <Icon name="alert" size={16} className="field-err-ico" />}
            </div>
            {missing.username && <div className="field-helper err">請輸入帳號</div>}
          </label>

          <label className="field">
            <span>密碼</span>
            <div className={`input-wrap ${missing.password ? 'invalid' : ''}`}>
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setMissing((m) => ({ ...m, password: false })); }}
                placeholder="請輸入密碼"
                aria-invalid={!!missing.password}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? '隱藏密碼' : '顯示密碼'}
              >
                <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
            {missing.password && <div className="field-helper err">請輸入密碼</div>}
          </label>

          {error && <InlineNotification kind="error" title="登入失敗" subtitle={error} onClose={() => setError('')} />}
          {idleOut && !error && (
            <InlineNotification kind="info" title="已自動登出" subtitle="閒置超過 30 分鐘，系統已自動登出，請重新登入。" onClose={() => setIdleOut(false)} />
          )}

          <button className="btn-primary btn-block" disabled={busy}>
            <span>{busy ? '登入中…' : '登入'}</span>
            <Icon name="arrowRight" size={16} />
          </button>

          {/* 11/16 使用者：設計階段方便測試——點選帶入帳號（雙擊直接登入）；正式環境（SSO）不顯示 */}
          {APP_CONFIG.auth.mode === 'mock' && (
            // 11/19 使用者：測試帳號清單預設收合，避免一眼看到所有角色而混淆畫面模擬；點標題才展開
            <details className="login-pick">
              <summary className="login-pick-head"><strong>測試帳號</strong><span className="lp-toggle"><i className="lp-closed">展開</i><i className="lp-opened">收合</i></span></summary>
              <p className="login-pick-tip">點選帶入，雙擊直接登入（正式環境改為 SSO）</p>
              <div className="login-pick-grid">
                {Object.entries(MOCK_USERS).map(([id, u]) => (
                  <button key={id} type="button" className={`login-pick-item ${username === id ? 'on' : ''}`}
                    onClick={() => pick(id)} onDoubleClick={() => pick(id, true)} title={`${id} / ${u.password}`}>
                    <span className="lp-name">{u.name}<small>{id}</small></span>
                    <span className="lp-unit">{withOrgCode((u.dept || "").replace(/\s+/g, ""), u.unitCode)}</span>
                    <span className="lp-level">{levelOf(id, u)}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
        </form>
        <footer className="login-foot">© {APP_CONFIG.companyName}</footer>
      </section>
    </div>
  );
}
