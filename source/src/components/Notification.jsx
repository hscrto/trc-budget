import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// ─────────────────────────────────────────────────────────────
// Carbon 通知：InlineNotification（頁面內）與 Toast（右上角，自動消失）
// kind: 'error' | 'success' | 'info' | 'warning'
// ─────────────────────────────────────────────────────────────
const KIND_ICON = { error: 'alert', success: 'check', info: 'clock', warning: 'alert' };

export function InlineNotification({ kind = 'error', title, subtitle, onClose }) {
  return (
    <div className={`notif inline ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={KIND_ICON[kind]} size={20} className="notif-ico" />
      <div className="notif-text">
        {title && <b>{title}</b>} {subtitle && <span>{subtitle}</span>}
      </div>
      {onClose && (
        <button className="notif-close" onClick={onClose} aria-label="關閉通知">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

// 任何地方呼叫 toast({ kind, title, subtitle, icon }) 即可
export function toast(detail) {
  window.dispatchEvent(new CustomEvent('aa:toast', { detail: { id: Date.now() + Math.random(), kind: 'info', ...detail } }));
}

const TIMEOUT = 5000;

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const t = e.detail;
      setItems((s) => [...s.slice(-2), t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), TIMEOUT);
    };
    window.addEventListener('aa:toast', on);
    return () => window.removeEventListener('aa:toast', on);
  }, []);
  return (
    <div className="toast-host" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`notif toast ${t.kind}`} role="status">
          <Icon name={t.icon || KIND_ICON[t.kind]} size={20} filled={t.icon === 'star'} className="notif-ico" />
          <div className="notif-text">
            <b>{t.title}</b>
            {t.subtitle && <span>{t.subtitle}</span>}
          </div>
          <button className="notif-close" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="關閉通知">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
