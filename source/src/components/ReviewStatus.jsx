// ─────────────────────────────────────────────────────────────
// 審查狀態（11/12 使用者全面調整為四種）：
//   全部（篩選用）、待審（待我本人審核）、已完成（核准或退回，case close）、已送審（我已提交，還在上一層）
//   「尚未提交」只出現在「我提交的」進度列
// ─────────────────────────────────────────────────────────────
// 11/18 使用者：只剩兩種狀態（我待審、已完成）；我提交出去＝已完成（原已送審）
export const STATUS_CLS = { 我待審: 's-review', 已完成: 's-done', 尚未提交: 's-todo' };

// 狀態卡、篩選用的說明（滑鼠移上顯示）
export const STATUS_HINT = {
  全部: '我待審、已完成的全部項目',
  我待審: '輪到我處理：審核或審查下一層提交的明細表，或重新提交被退回的明細表',
  已完成: '我這一關已處理完：我已提交給上一層、已核准或已退回（不看整筆資料是否結案）',
  尚未提交: '還沒有提交給上一層',
};

const RESULT = { 已核准: '核准', 已退回: '退回', 審核中: '已提交' };

export function statusText(r) {
  // 11/18 使用者：主狀態（我待審／已完成）＋子狀態（進行中／等待我批准／已退回）
  if ((r.status === '我待審' || r.status === '已完成') && r.phase) return `${r.status}・${r.phase}`;
  if (r.status === '我待審') return '我待審';
  if (r.status === '已完成') return RESULT[r.result] ? `已完成・${RESULT[r.result]}` : '已完成';
  return r.status;
}

export default function ReviewStatus({ r }) {
  const late = r.status === '我待審' && r.waitDays >= 5;
  const returned = r.phase === '已退回';
  return (
    <span className={`status ${late || returned ? 's-overdue' : STATUS_CLS[r.status] || 's-todo'}`} title={STATUS_HINT[r.status]}>
      {statusText(r)}
    </span>
  );
}
