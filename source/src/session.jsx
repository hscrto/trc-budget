import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './components/Icon.jsx';
import { APP_CONFIG } from './config/appConfig.js';

// ─────────────────────────────────────────────────────────────
// 登入時間＋閒置自動登出（11/10）
//   頁面沒有任何動作（滑鼠、鍵盤、捲動、觸控）超過 idleMinutes 分鐘就自動登出
//   最後 warnSeconds 秒跳出提醒，可按「繼續使用」
//   同一瀏覽器開的多個視窗（Portal、預算系統）共用最後動作時間（localStorage）
// ─────────────────────────────────────────────────────────────
const IDLE_MS = (APP_CONFIG.session?.idleMinutes ?? 30) * 60 * 1000;
const WARN_MS = (APP_CONFIG.session?.warnSeconds ?? 60) * 1000;
const KEY = 'aa.lastActivity';
export const LOGOUT_REASON_KEY = 'aa.logoutReason';

const readLast = () => {
  try { return Number(localStorage.getItem(KEY)) || Date.now(); } catch { return Date.now(); }
};
const writeLast = (t) => { try { localStorage.setItem(KEY, String(t)); } catch { /* ignore */ } };

const SessionContext = createContext({ loginAt: null, remaining: IDLE_MS, extend: () => {} });
export const useSession = () => useContext(SessionContext);

export function SessionProvider({ user, onTimeout, children }) {
  const last = useRef(readLast());
  const [now, setNow] = useState(Date.now());

  const extend = useCallback(() => { last.current = Date.now(); writeLast(last.current); setNow(Date.now()); }, []);

  useEffect(() => {
    // 登入當下重設
    if (Date.now() - last.current > IDLE_MS || (user.loginAt && last.current < user.loginAt)) extend();
    let lastWrite = 0;
    const onAct = () => {
      const t = Date.now();
      last.current = t;
      if (t - lastWrite > 1000) { lastWrite = t; writeLast(t); }
    };
    const evs = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true, capture: true }));
    const onStorage = (e) => { if (e.key === KEY && e.newValue) last.current = Math.max(last.current, Number(e.newValue)); };
    window.addEventListener('storage', onStorage);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct, { capture: true }));
      window.removeEventListener('storage', onStorage);
      clearInterval(tick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = Math.max(0, IDLE_MS - (now - last.current));

  useEffect(() => {
    if (remaining <= 0) {
      try { sessionStorage.setItem(LOGOUT_REASON_KEY, 'idle'); } catch { /* ignore */ }
      onTimeout();
    }
  }, [remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SessionContext.Provider value={{ loginAt: user.loginAt, remaining, extend }}>
      {children}
      {remaining > 0 && remaining <= WARN_MS && <IdleWarning remaining={remaining} onStay={extend} onLogout={onTimeout} />}
    </SessionContext.Provider>
  );
}

export const fmtCountdown = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const fmtTime = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtFull = (t) => {
  const d = new Date(t);
  return `${d.getFullYear() - 1911}/${d.getMonth() + 1}/${d.getDate()} ${fmtTime(t)}`;
};

// 頂列右上：登入時間＋閒置倒數
export function SessionTimer({ light = false }) {
  const { loginAt, remaining } = useSession();
  const level = remaining <= 60000 ? 'danger' : remaining <= 5 * 60000 ? 'warn' : '';
  return (
    <div className={`session-timer ${light ? 'light' : ''} ${level}`} role="status" aria-live="off"
      title={`登入時間 ${loginAt ? fmtFull(loginAt) : '—'}；閒置 ${APP_CONFIG.session?.idleMinutes ?? 30} 分鐘未操作將自動登出`}>
      <span className="st-row"><span className="st-label">登入</span><b>{loginAt ? fmtTime(loginAt) : '—'}</b></span>
      <span className="st-row"><Icon name="clock" size={14} /><span className="st-label">自動登出</span><b className="st-count">{fmtCountdown(remaining)}</b></span>
    </div>
  );
}

function IdleWarning({ remaining, onStay, onLogout }) {
  return (
    <div className="dialog-scrim idle-scrim">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
        <header className="dialog-head">
          <span className="dialog-icon warn"><Icon name="clock" size={20} /></span>
          <h2 id="idle-title">即將自動登出</h2>
        </header>
        <div className="dialog-body">
          <p>您已閒置一段時間，系統將於 <b className="idle-count">{fmtCountdown(remaining)}</b> 後自動登出。</p>
          <p className="muted">要繼續使用請按「繼續使用」。</p>
        </div>
        <footer className="dialog-foot">
          <button className="btn-outline" onClick={onLogout}>立即登出</button>
          <button className="btn-primary" onClick={onStay} autoFocus>繼續使用</button>
        </footer>
      </div>
    </div>
  );
}
