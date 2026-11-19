import { useState } from 'react';
import Icon from './Icon.jsx';
import { getNode } from '../config/navigation.js';
import { nodeLinkProps } from '../nodeActions.js';

// ─────────────────────────────────────────────────────────────
// 首頁「我的待辦」：依狀態統計筆數（圓底數字），點狀態可篩選
// 狀態清單與顏色在 STATUSES 設定；順序 = 顯示與排序順序
// 11/12：待辦與我的審查是同一件事，以預算編列（室）／明細表（段以上）為單位，狀態與我的審查一致（依「誰在看」顯示）
//   optional：只有該狀態有資料時才顯示（「編列中」只有室級人員有）
// ─────────────────────────────────────────────────────────────
export const STATUSES = [
  // 11/12 使用者：狀態全面調整為 全部（篩選）、我待審、已完成、已送審
  // 11/12 順序：全部 > 已送審 > 我待審 > 已完成
  // 11/18 使用者：只剩 我待審、已完成（原已送審併入已完成）
  { key: '我待審', cls: 'review' },
  { key: '已完成', cls: 'done' },
]
// 依資料決定要顯示的狀態（optional 狀態 0 筆時不顯示）
export const statusesFor = (tasks) => STATUSES.filter((s) => !s.optional || (tasks || []).some((t) => t.status === s.key));
const order = (s) => {
  const i = STATUSES.findIndex((x) => x.key === s);
  return i < 0 ? STATUSES.length : i;
};
const clsOf = (s) => STATUSES.find((x) => x.key === s)?.cls || 'todo';

// max：最多顯示幾筆（首頁版1 為 6 筆，超過時可展開）
// filter／onFilter：由外部控制篩選（首頁版2 由上方統計卡片篩選）；showStats=false 時不顯示標題列的狀態按鈕
export default function TaskPanel({ tasks, max = Infinity, filter: outer, onFilter, showStats = true }) {
  const [own, setOwn] = useState('全部');
  const filter = outer ?? own;
  const setFilter = onFilter ?? setOwn;
  const [expanded, setExpanded] = useState(false);

  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
  (tasks || []).forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const list = (tasks || [])
    .filter((t) => filter === '全部' || t.status === filter)
    .sort((a, b) => order(a.status) - order(b.status) || (a.due || '9').localeCompare(b.due || '9'));
  const shown = expanded ? list : list.slice(0, max);

  return (
    <section className="card task-panel">
      <header className="card-head task-head">
        <h2><Icon name="task" size={18} /> 我的待辦</h2>
        {/* 11/13：選單已移除「我的待辦」，完整清單只從首頁進入 */}
        {getNode('review-plan') && <a className="link-btn todo-all" {...nodeLinkProps(getNode('review-plan'))}>查看全部</a>}
        {!showStats && filter !== '全部' && (
          <span className="task-filter-note">
            篩選：<b>{filter}</b>
            <button className="link-btn" onClick={() => setFilter('全部')}>清除</button>
          </span>
        )}
        {tasks && showStats && (
          <div className="task-stats" role="group" aria-label="依狀態篩選待辦">
            <button
              className={`stat-chip all ${filter === '全部' ? 'on' : ''}`}
              onClick={() => setFilter('全部')}
              aria-pressed={filter === '全部'}
            >
              全部 <span className="stat-num">{tasks.length}</span>
            </button>
            {/* 11/18：狀態固定為 我待審／已完成，0 筆也顯示（變淡、不能點） */}
            {statusesFor(tasks).map((s) => (
              <button
                key={s.key}
                className={`stat-chip s-${s.cls} ${filter === s.key ? 'on' : ''} ${counts[s.key] ? '' : 'zero'}`}
                onClick={() => setFilter(filter === s.key ? '全部' : s.key)}
                aria-pressed={filter === s.key}
                disabled={!counts[s.key]}
              >
                {s.key} <span className="stat-num">{counts[s.key]}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {!tasks ? <p className="muted">載入中…</p> : list.length === 0 ? <p className="muted">目前沒有待辦事項。</p> : (
        <ul className="list">
          {shown.map((t) => {
            const n = getNode(t.route);
            return (
              <li key={t.id} className={t.status === '已完成' ? 'is-done' : ''}>
                <a {...(t.id ? { href: `#rd:${encodeURIComponent(t.id)}` } : nodeLinkProps(n))}>
                  <span className={`status s-${t.phase === '已退回' ? 'overdue' : clsOf(t.status)}`}>{t.status}{t.phase ? `・${t.phase}` : ''}</span>
                  <span className="list-title">
                    {t.title}
                    {n.launch && <Icon name="launch" size={14} className="ext-mark inline" />}
                  </span>
                  <span className={`list-date ${t.late ? 'late' : ''}`}>{t.due ? `${t.dateLabel || '截止'} ${t.due}` : '—'}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > max && (
        <button className="link-btn task-more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? '收合' : `顯示全部（${list.length} 筆）`}
        </button>
      )}
    </section>
  );
}
