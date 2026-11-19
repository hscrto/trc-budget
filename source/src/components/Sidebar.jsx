import { useEffect, useRef, useState } from 'react';
import { navigate } from '../useHashRoute.js';
import Icon, { Caret, BookChartIcon } from './Icon.jsx';
import { SITE_MAP, getTrail, getNode } from '../config/navigation.js';
import { nodeLinkProps } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';
import { usePrefs, timeAgo } from '../prefs.jsx';

const ExtMark = ({ node }) => (node.launch ? <Icon name="launch" size={14} className="ext-mark" /> : null);

// 第三層以下（可無限往下展開）：▸ = 還有下一層；文件圖示／彩色長條圖示 = 功能連結
function DeepItem({ node, level, route, expanded, toggle, link, visible, trailIds }) {
  const kids = (node.children || []).filter(visible);
  const pad = { paddingLeft: 52 + (level - 3) * 16 };
  if (node.placeholder) {
    return <li><span className="deep-row tbd" style={pad}><span className="deep-ico" />{node.label}</span></li>;
  }
  if (kids.length) {
    const open = !!expanded[node.id];
    return (
      <li>
        <button
          className={`deep-row ${trailIds.has(node.id) ? 'in-trail' : ''}`}
          style={pad}
          onClick={() => toggle(node.id)}
          aria-expanded={open}
        >
          <span className="deep-ico" />
          <span>{node.label}</span>
          <Caret open={open} />
        </button>
        {open && (
          <ul className={`nav-deep lv${level + 1}`}>
            {kids.map((k) => (
              <DeepItem key={k.id} node={k} level={level + 1} route={route} expanded={expanded} toggle={toggle} link={link} visible={visible} trailIds={trailIds} />
            ))}
          </ul>
        )}
      </li>
    );
  }
  return (
    <li>
      <a className={`deep-row ${route === node.id ? 'active' : ''}`} style={pad} {...link(node)}>
        <span className="deep-ico">{node.icon === 'bookChart' ? <BookChartIcon /> : <Icon name={node.icon || 'doc'} size={15} className={node.icon ? `fi-${node.icon}` : ''} />}</span>
        <span>{node.label}</span>
        <ExtMark node={node} />
      </a>
    </li>
  );
}

// 「新增」等節點：滑鼠移過去時在側欄右側展開子選單
function FlyoutItem({ node, route, onNavigate }) {
  const { visible } = usePerm();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const [left, setLeft] = useState(0);
  const rowRef = useRef(null);
  const timer = useRef(null);

  const show = () => {
    clearTimeout(timer.current);
    const r = rowRef.current?.getBoundingClientRect();
    const side = rowRef.current?.closest('.sidebar')?.getBoundingClientRect();
    if (r && side) { setTop(r.top); setLeft(side.right); }
    setOpen(true);
  };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 160); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => setOpen(false), [route]);

  // lockedVisible：沒有權限也顯示，但呈現鎖定、不能點（11/12：系統管理員只有管理者可以使用）
  const kids = node.children.filter((k) => visible(k) || k.lockedVisible);
  const groups = [...new Set(kids.map((k) => k.group || ''))];

  return (
    <li className="l1" onMouseEnter={show} onMouseLeave={hide}>
      <a
        ref={rowRef}
        className={`l1-row ${route === node.id ? 'active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onFocus={show}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        {...nodeLinkProps(node, onNavigate)}
      >
        <Icon name={node.icon} size={18} />
        <span>{node.label}</span>
        <Icon name="chevronRight" size={16} className="l1-chev-r" />
      </a>

      {open && kids.length > 0 && (
        <div className="flyout" style={{ top, left }} onMouseEnter={show} onMouseLeave={hide} role="menu" aria-label={node.label}>
          <div className="flyout-head">{node.label}</div>
          {groups.map((g) => (
            <div key={g} className="flyout-group">
              {g && <div className="flyout-title">{g}</div>}
              {kids.filter((k) => (k.group || '') === g).map((k) => (!visible(k) ? (
                <span key={k.id} className="flyout-item locked" role="menuitem" aria-disabled="true" title="僅系統管理員可使用">
                  <Icon name={k.icon || 'doc'} size={18} />
                  <span>{k.label}</span>
                  <Icon name="lock" size={14} className="lock-mark" />
                </span>
              ) : (
                <a key={k.id} className="flyout-item" role="menuitem" {...nodeLinkProps(k, () => { setOpen(false); onNavigate?.(); })}>
                  <Icon name={k.icon || 'doc'} size={18} className={`fi-${k.icon}`} />
                  <span>{k.label}</span>
                </a>
              )))}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

// 我的最愛／最近打開（放在「新增」下方）
function PersonalSection({ kind, route, expanded, onToggle, onNavigate }) {
  const { can, visible } = usePerm();
  const { favorites, recent, toggleFavorite } = usePrefs();
  if (!can(kind === 'fav' ? 'favorites' : 'recent')) return null;

  const isFav = kind === 'fav';
  const items = isFav
    ? favorites.filter(visible).map((n) => ({ node: n }))
    : recent.filter((r) => visible(r.node)).slice(0, 5);

  return (
    <li className="l1 personal">
      <button className="l1-row" onClick={onToggle} aria-expanded={expanded}>
        <Icon name={isFav ? 'star' : 'clock'} size={18} filled={isFav} className={isFav ? 'star-side' : ''} />
        <span>{isFav ? '我的最愛' : '最近打開'}</span>
        {items.length > 0 && <span className="count">{items.length}</span>}
        <Icon name="chevronDown" size={16} className={`l1-chev ${expanded ? 'open' : ''}`} />
      </button>
      {expanded && (
        <ul className="nav-l2">
          {items.length === 0 && (
            <li className="side-empty">{isFav ? '在功能頁標題旁點 ☆ 加入' : '尚無開啟紀錄'}</li>
          )}
          {items.map(({ node: n, at }) => (
            <li key={n.id} className="side-item">
              <a className={`l2-row ${route === n.id ? 'active' : ''}`} {...nodeLinkProps(n, onNavigate)}>
                <span className="side-label">{n.label}</span>
                {isFav ? <ExtMark node={n} /> : <small className="side-time">{timeAgo(at)}</small>}
              </a>
              {isFav && (
                <button className="side-remove" onClick={() => toggleFavorite(n.id)} aria-label={`從我的最愛移除「${n.label}」`} title="移除">
                  <Icon name="close" size={14} />
                </button>
              )}
            </li>
          ))}
          {isFav && items.length > 0 && (
            <li className="side-item side-more">
              <a className={`l2-row ${route === 'my-favorites' ? 'active' : ''}`} {...nodeLinkProps(getNode('my-favorites'), onNavigate)}>
                <span className="side-label">查看全部／編輯</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

// rail = 1109-B（Carbon 6a）：收合時保留 48px 圖示欄，滑鼠移入或鍵盤聚焦時展開
export default function Sidebar({ open, rail = false, route, onNavigate }) {
  const { visible, can } = usePerm();
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    SITE_MAP.forEach((n) => { if (n.children && !n.sidebarLeaf) init[n.id] = true; });
    init['@fav'] = true;
    init['@recent'] = false; // 最近打開預設收合，首頁有完整清單
    return init;
  });

  useEffect(() => {
    const ids = getTrail(route).filter((n) => n.children).map((n) => n.id);
    if (ids.length) setExpanded((s) => ({ ...s, ...Object.fromEntries(ids.map((i) => [i, true])) }));
  }, [route]);

  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const trailIds = new Set(getTrail(route).map((n) => n.id));
  const link = (node) => ({
    ...nodeLinkProps(node, onNavigate),
    'aria-current': route === node.id ? 'page' : undefined,
  });

  return (
    <nav id="sidebar" className={`sidebar ${open ? 'open' : ''} ${rail ? 'rail' : ''}`} aria-label="主選單" aria-hidden={!open && !rail}>
      <ul className="nav-l1">
        {SITE_MAP.filter((n) => n.sidebar !== false && (visible(n) || n.lockedVisible) && (!n.menuPerm || can(n.menuPerm))).map((n) => {
          if (n.flyout) {
            return [
              <FlyoutItem key={n.id} node={n} route={route} onNavigate={onNavigate} />,
              // 11/13 使用者：選單移除「我的最愛」「最近打開」，完整清單只從首頁進入
            ];
          }
          // 沒有權限但 lockedVisible：照樣顯示，呈現鎖定、不能展開
          // menuPerm（11/13 使用者）：沒有選單權限的項目直接不顯示（新建＝處以上；App／R&A／Plan＝會計處以上）
          const menuLocked = false;
          if (!visible(n) || menuLocked) {
            return (
              <li key={n.id} className="l1">
                <div className="l1-row locked" aria-disabled="true" title={menuLocked ? '僅會計處以上與系統管理員可展開' : '僅系統管理員可使用'}>
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                  <Icon name="lock" size={14} className="lock-mark" />
                </div>
              </li>
            );
          }
          const hasKids = n.children && !n.sidebarLeaf;
          const isOpen = !!expanded[n.id];
          const kids = hasKids ? n.children.filter(visible) : [];
                    return (
            <li key={n.id} className="l1">
              {hasKids ? (
                <button className={`l1-row ${n.page === 'plan-home' && route === n.id ? 'active' : ''}`} aria-expanded={isOpen}
                  onClick={() => {
                    // 11/18：App／Plan 有共用子首頁，點第一層會開啟子首頁（並展開下層）
                    if (n.page === 'plan-home') { if (!isOpen) toggle(n.id); navigate(n.id); } else toggle(n.id);
                  }}>
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                  <Icon name="chevronDown" size={16} className={`l1-chev ${isOpen ? 'open' : ''}`} />
                </button>
              ) : (
                <a className={`l1-row ${route === n.id || (n.sidebarLeaf && trailIds.has(n.id)) ? 'active' : ''}`} {...link(n)}>
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                </a>
              )}

              {hasKids && isOpen && (
                <ul className="nav-l2">
                  {kids.map((c) => {
                    const kidOpen = !!expanded[c.id];
                    return (
                      <li key={c.id}>
                        {c.children ? (
                          <button
                            className={`l2-row has-caret ${trailIds.has(c.id) ? 'in-trail' : ''}`}
                            onClick={() => toggle(c.id)}
                            aria-expanded={kidOpen}
                          >
                            <span>{c.label}</span>
                            <Caret open={kidOpen} />
                          </button>
                        ) : (
                          <a className={`l2-row ${route === c.id ? 'active' : ''}`} {...link(c)}>
                            <span>{c.label}</span>
                            <ExtMark node={c} />
                          </a>
                        )}

                        {c.children && kidOpen && (
                          <ul className="nav-deep lv3">
                            {c.children.filter(visible).map((g) => (
                              <DeepItem key={g.id} node={g} level={3} route={route} expanded={expanded} toggle={toggle} link={link} visible={visible} trailIds={trailIds} />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
