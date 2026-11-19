import { getTrail } from '../config/navigation.js';
import { navigate } from '../useHashRoute.js';

// 每一頁都從「首頁」開始，每一層都可以點擊（1109-B：Carbon 麵包屑，以 / 分隔）
export default function Breadcrumb({ route }) {
  const trail = route === 'home' ? [] : getTrail(route);
  const items = [{ id: 'home', label: '首頁' }, ...trail];

  return (
    <nav className="breadcrumb" aria-label="麵包屑">
      <ol>
        {items.map((n, i) => {
          const last = i === items.length - 1;
          return (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                onClick={(e) => { e.preventDefault(); navigate(n.id); }}
                aria-current={last ? 'page' : undefined}
              >
                {n.label}
              </a>
              {!last && <span className="crumb-sep" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
