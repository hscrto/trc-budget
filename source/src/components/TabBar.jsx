import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { TABS, getNode, getTrail } from '../config/navigation.js';
import { nodeLinkProps } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';

export default function TabBar({ route }) {
  const { visible } = usePerm();
  const [openId, setOpenId] = useState(null);
  const timer = useRef(null);

  // 依權限整理每個頁籤：只留看得到的連結；完全沒有內容的頁籤隱藏
  const tabs = TABS.map((t) => {
    const ok = (id) => visible(getNode(id));
    const columns = t.columns
      .map((c) => ({ ...c, links: c.links.filter(ok) }))
      .filter((c) => c.links.length);
    const actions = (t.actions || []).filter(ok);
    const featured = t.featured && ok(t.featured) ? t.featured : null;
    const first = columns[0]?.links[0] || actions[0];
    const target = ok(t.target) ? t.target : first;
    return { ...t, columns, actions, featured, target };
  }).filter((t) => t.target);

  // 目前路徑中最深的符合節點決定亮起的頁籤
  const trail = getTrail(route).map((n) => n.id);
  let activeTab = null;
  let best = -1;
  tabs.forEach((t) => {
    trail.forEach((id, depth) => {
      if (t.match.includes(id) && depth > best) { best = depth; activeTab = t; }
    });
  });

  const openSoon = (id) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpenId(id), 120); };
  const closeSoon = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpenId(null), 180); };
  const keep = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { setOpenId(null); }, [route]);

  const link = (id) => nodeLinkProps(getNode(id), () => setOpenId(null));
  const panel = tabs.find((t) => t.id === openId);

  return (
    <div className="tabbar-wrap" onMouseLeave={closeSoon} onKeyDown={(e) => { if (e.key === 'Escape') setOpenId(null); }}>
      <nav className="tabbar" aria-label="功能頁籤">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${activeTab?.id === t.id ? 'active' : ''} ${openId === t.id ? 'hover' : ''}`}
            onMouseEnter={() => openSoon(t.id)}
          >
            <a {...link(t.target)} onFocus={() => setOpenId(t.id)}>{t.label}</a>
            <button
              className="tab-more"
              aria-label={`${t.label} 快速連結`}
              aria-expanded={openId === t.id}
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
            >
              <Icon name="chevronDown" size={14} />
            </button>
          </div>
        ))}
      </nav>

      {panel && (
        <div className="mega" onMouseEnter={keep} role="region" aria-label={`${panel.label} 快速連結`}>
          <div className="mega-col mega-lead">
            <h3>{panel.label}</h3>
            {panel.actions.map((id) => {
              const n = getNode(id);
              return (
                <a key={id} className="mega-action" {...link(id)}>
                  <Icon name={n.launch ? 'launch' : n.icon || 'edit'} size={18} /> {n.label}
                </a>
              );
            })}
          </div>

          {panel.columns.map((col) => (
            <div key={col.title} className="mega-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((id) => {
                  const n = getNode(id);
                  return (
                    <li key={id}>
                      <a {...link(id)} className={n.icon === 'form' ? 'has-ico' : undefined}>
                        {n.icon === 'form' && <Icon name="form" size={16} className="fi-form" />}
                        {n.label}
                        {n.launch && <Icon name="launch" size={14} className="ext-mark" />}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {panel.featured && (
            <a className="mega-featured" {...link(panel.featured)}>
              <span><small>推薦功能</small>{getNode(panel.featured).label}</span>
              <Icon name="chevronRight" size={16} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
