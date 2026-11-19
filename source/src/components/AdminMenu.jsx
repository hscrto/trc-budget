import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { getNode, getTrail } from '../config/navigation.js';
import { navigate } from '../useHashRoute.js';
import { usePerm } from '../permissions.jsx';

// 頂列齒輪：點擊進入「系統管理」，滑鼠滑過顯示快捷選單；只有有權限的角色看得到
export default function AdminMenu({ route }) {
  const { visible } = usePerm();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const node = getNode('admin');

  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 100); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => setOpen(false), [route]);

  if (!visible(node)) return null;
  const items = node.children.filter(visible);
  const active = getTrail(route)[0]?.id === 'admin';
  const go = (id) => { setOpen(false); navigate(id); };

  return (
    <div
      className="admin-menu"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
    >
      <button
        className={`topbar-icon ${active ? 'is-active' : ''}`}
        aria-label={node.label}
        title={node.label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => go('admin')}
      >
        <Icon name="settings" size={20} />
      </button>

      {open && (
        <div className="admin-panel" role="menu">
          <button className="admin-head" onClick={() => go('admin')}>
            <Icon name="settings" size={16} /> {node.label}
          </button>
          {items.map((c) => (
            <button
              key={c.id}
              role="menuitem"
              className={`admin-item ${route === c.id ? 'current' : ''}`}
              onClick={() => go(c.id)}
            >
              <Icon name={c.icon || 'doc'} size={17} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
