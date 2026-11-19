// 公告所屬系統標記（11/16 使用者：Portal 公告要標示與哪個系統相關）
//   顏色沿用臺鐵三個標準色：預算系統＝金、審核會計系統＝藍、商業智慧 BI＝灰（同 Portal 版3 乘車證）
export const SYSTEM_TAGS = {
  budget: '預算系統',
  audit: '審核會計系統',
  bi: '商業智慧 BI',
};
export default function SystemTag({ system }) {
  const label = SYSTEM_TAGS[system];
  if (!label) return null;
  return <span className={`sys-tag ${system}`}>{label}</span>;
}
