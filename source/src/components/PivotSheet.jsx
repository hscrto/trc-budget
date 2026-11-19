// ─────────────────────────────────────────────────────────────
// 交叉分析表頁籤（PAW 樣式）：單位 × 預算表 × 會計科目 → 金額、調整數、調整後金額、調整%
//   11/19 使用者：資通訊預算編列的「費用明細表」頁籤依 PAW 截圖改成交叉分析表
//   上方內容列：年度、版本、量值（收入／支出／本期其他綜合損益）；列維度：單位、預算表、會計科目
//   調整數依同一本工作簿「預算調整設定」頁籤的扣除％數計算
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import Icon from './Icon.jsx';
import { codeOf } from '../config/org.js';

const n = (x) => Number(x) || 0;
const fmt = (x) => Math.round(n(x)).toLocaleString('en-US');
const hashOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// 預算表代碼（與費用彙整的類別按鈕對應）
export const PIVOT_TABLES = [
  { code: '2101', cat: '動力費', acct: '510206' }, { code: '2102', cat: '電費', acct: '510206' },
  { code: '2104', cat: '水費', acct: '510206' }, { code: '2106', cat: '瓦斯費', acct: '510206' },
  { code: '2505', cat: '機修費', acct: '510206' }, { code: '2506', cat: '交修費', acct: '510206' },
  { code: '3205', cat: '服裝費', acct: '510207' },
];
// 每個單位填了哪些表、金額多少（示意，依單位名稱固定產生）
export function pivotRowsOf(u) {
  const h = hashOf(u);
  const picked = PIVOT_TABLES.filter((t, i) => ((h >> i) & 1) || i === h % PIVOT_TABLES.length).slice(0, 4);
  return picked.map((t) => ({ unit: u, ...t, amt: 50000 + (hashOf(u + t.code) % 997) * 9871 }));
}
export const pivotRows = (units) => units.flatMap(pivotRowsOf);

const MEASURES = ['收入', '支出', '本期其他綜合損益'];

export function makePivotSheet({ id, name, units, adjustId }) {
  return {
    id, name, custom: 'render', filterBy: 'cat', explore: true,
    render: (p) => <Pivot {...p} units={typeof units === 'function' ? units() : units} adjustId={adjustId} />,
  };
}

function Pivot({ ctx, filter, setFilter, units, adjustId }) {
  const [measure, setMeasure] = useState('支出');
  const adj = adjustId ? ctx.rowsOf(adjustId).filter((r) => r.vals.unit && n(r.vals.pct)) : [];
  const pctOf = (u, cat) => { const hit = adj.find((a) => a.vals.unit === codeOf(u) && (!a.vals.cat || a.vals.cat === cat)); return hit ? n(hit.vals.pct) : 0; };
  const rows = measure !== '支出' ? [] : pivotRows(units).filter((r) => !filter || r.cat === filter)
    .map((r) => { const d = -Math.round(r.amt * pctOf(r.unit, r.cat) / 100); return { ...r, d, after: r.amt + d }; });
  const groups = units.map((u) => rows.filter((r) => r.unit === u)).filter((g) => g.length);
  return (
    <div className="pv">
      <div className="pv-tools" aria-hidden="true"><Icon name="settings" size={16} /></div>
      <div className="pv-ctx">
        <span className="pv-chip"><i>◉</i>2027<Icon name="chevronDown" size={16} /></span>
        <span className="pv-chip"><i>◉</i>公司概算版<Icon name="chevronDown" size={16} /></span>
        <label className="pv-chip pv-sel"><i>Σ</i>
          <select value={measure} onChange={(e) => setMeasure(e.target.value)} aria-label="量值">{MEASURES.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        {filter && <span className="wb-tag pv-filter">{filter}<button type="button" aria-label="清除篩選" onClick={() => setFilter('')}>×</button></span>}
      </div>
      <div className="pv-ctx pv-dims">
        {['單位', '預算表', '會計科目'].map((x) => <span key={x} className="pv-chip"><Icon name="grid" size={14} />{x}<Icon name="chevronDown" size={16} /></span>)}
        <span className="pv-chip pv-coldim"><Icon name="grid" size={14} />量值<Icon name="chevronDown" size={16} /></span>
      </div>
      {!groups.length ? <p className="muted pv-none">{measure !== '支出' ? `「${measure}」目前沒有資料（資通訊預算只編支出）。` : '這個類別沒有資料。'}</p> : (
        <table className="wb-grid pv-grid">
          <colgroup><col style={{ width: 168 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 150 }} /><col style={{ width: 140 }} /><col style={{ width: 150 }} /><col style={{ width: 110 }} /></colgroup>
          <thead><tr><th>單位</th><th>預算表</th><th>會計科目</th><th>金額</th><th>調整數</th><th>調整後金額</th><th>調整%</th></tr></thead>
          <tbody>
            {groups.flatMap((g) => g.map((r, i) => (
              <tr key={r.unit + r.code}>
                {i === 0 && <th rowSpan={g.length} className="pv-unit">{r.unit}</th>}
                <th className="pv-rh">{r.code}</th>
                <th className="pv-rh">{r.acct}</th>
                <td className="num">{fmt(r.amt)}</td>
                <td className="num">{fmt(r.d)}</td>
                <td className="num">{fmt(r.after)}</td>
                <td className="num pv-pct">{((r.after / r.amt) * 100).toFixed(2)}%</td>
              </tr>
            )))}
          </tbody>
        </table>
      )}
    </div>
  );
}
