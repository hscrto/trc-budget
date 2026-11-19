import Icon from './Icon.jsx';

// Carbon Data table 工具列：搜尋（篩選目前表格）＋右側動作
export default function TableToolbar({ value, onChange, placeholder = '搜尋', children }) {
  return (
    <div className="table-toolbar">
      <label className="table-search">
        <Icon name="search" size={16} />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {value && (
          <button type="button" className="table-search-clear" onClick={() => onChange('')} aria-label="清除搜尋">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>
      {children}
    </div>
  );
}
