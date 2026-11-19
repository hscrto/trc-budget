// 11/16 Carbon Date picker（簡化版）：標籤在上、40px 欄位、底線、yyyy/mm/dd、右側日曆圖示
//   點欄位或圖示打開瀏覽器日曆（showPicker），值仍為 yyyy-mm-dd
import { useRef } from 'react';

export default function CarbonDate({ label, value, onChange, min, max, hideLabel = false, placeholder = 'yyyy/mm/dd' }) {
  const ref = useRef(null);
  const open = () => { try { ref.current?.showPicker(); } catch { ref.current?.focus(); } };
  return (
    <label className="cds-date">
      {!hideLabel && <span className="cds-date-label">{label}</span>}
      <span className="cds-date-field" onClick={open}>
        <span className={value ? '' : 'ph'}>{value ? value.replace(/-/g, '/') : placeholder}</span>
        <svg className="cds-date-ico" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M26 4h-4V2h-2v2h-8V2h-2v2H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 22H6V12h20Zm0-16H6V6h4v2h2V6h8v2h2V6h4Z"/></svg>
        <input ref={ref} type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} aria-label={label} tabIndex={0} />
      </span>
    </label>
  );
}
