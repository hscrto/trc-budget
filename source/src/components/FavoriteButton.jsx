import Icon from './Icon.jsx';
import { isFavoritable } from '../config/navigation.js';
import { usePrefs } from '../prefs.jsx';
import { usePerm } from '../permissions.jsx';

// ☆／★ 加入或移除我的最愛
export default function FavoriteButton({ node, compact = false }) {
  const { isFavorite, toggleFavorite } = usePrefs();
  const { can } = usePerm();
  if (!can('favorites') || !isFavoritable(node)) return null;
  const on = isFavorite(node.id);
  const label = on ? `從我的最愛移除「${node.label}」` : `將「${node.label}」加入我的最愛`;
  return (
    <button
      type="button"
      className={`fav-btn ${on ? 'on' : ''} ${compact ? 'compact' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(node.id); }}
      aria-pressed={on}
      aria-label={label}
      title={label}
    >
      <Icon name="star" size={compact ? 17 : 18} filled={on} />
      {!compact && <span>{on ? '已加入最愛' : '加入最愛'}</span>}
    </button>
  );
}

// 頁面標題列：標題 + ☆ 按鈕 + 右側動作
export function PageTitle({ node, children, desc }) {
  return (
    <div className="page-head-row">
      <div>
        <div className="page-title-line">
          <h1 className="page-title">{node.label}</h1>
          <FavoriteButton node={node} />
        </div>
        {desc && <div className="page-desc">{desc}</div>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
