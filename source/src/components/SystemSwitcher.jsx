import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { APP_CONFIG, portalSystems } from '../config/appConfig.js';
import { switchSystem } from '../nodeActions.js';
import { isSystemOpen, CLOSED_HINT } from '../config/appConfig.js';
import { navigate } from '../useHashRoute.js';
import { usePerm } from '../permissions.jsx';

// 頂列「切換系統」：滑鼠滑過（或點擊）展開，項目來自 Portal 入口設定
export default function SystemSwitcher() {
  const { can } = usePerm();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrap = useRef(null);

  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 100); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const items = portalSystems().filter((s) => can(`sys-${s.id}`));
  if (items.length < 2) return null;

  const pick = (id) => { setOpen(false); switchSystem(id); };

  return (
    <div
      className="switcher"
      ref={wrap}
      onMouseEnter={show}
      onMouseLeave={hide}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      <button className="sys-switch" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="swap" size={17} />
        <span>切換系統</span>
        <Icon name="chevronDown" size={14} className={`sw-chev ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="switcher-panel" role="menu">
          <div className="switcher-title">切換至</div>
          {items.map((s) => {
            const current = s.id === APP_CONFIG.currentSystem;
            const closed = !current && !isSystemOpen(s.id);
            return (
              <button
                key={s.id}
                role="menuitem"
                className={`switcher-item ${current ? 'current' : ''} ${closed ? 'closed' : ''}`}
                onClick={() => !current && !closed && pick(s.id)}
                aria-current={current ? 'true' : undefined}
                aria-disabled={closed || undefined}
                title={closed ? CLOSED_HINT : undefined}
                disabled={current || closed}
              >
                <span className="sw-ico" style={{ background: s.portal.accent }}>
                  <Icon name={s.portal.icon} size={18} />
                </span>
                <span className="sw-text">
                  <b>{s.name}</b>
                  <small>{s.portal.desc}</small>
                </span>
                {current ? <span className="sw-badge">目前所在</span> : closed ? <span className="sw-badge sw-closed">尚未開放</span> : <Icon name="launch" size={16} className="sw-go" />}
              </button>
            );
          })}
          <button className="switcher-portal" onClick={() => { setOpen(false); navigate('portal'); }}>
            <Icon name="app" size={16} /> 回到系統入口
          </button>
        </div>
      )}
    </div>
  );
}
