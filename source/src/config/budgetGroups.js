// ─────────────────────────────────────────────────────────────
// 各類預算編列：分類與預算表（11/13 使用者說明）
//   - 收入、費用預算共 70 多張表，由會計處分類成幾個分類（目前五類），方便各室編列。
//   - 「預算編列維護App › 各類預算編列」＝維護：命名分類、編輯分類中有哪些表；
//     同一張表可以同時在多個分類；之後可以新增更多分類。
//   - 首頁「快速功能」＝各室點過去填表編列預算（budget-fill）。
//
// Prototype：表名為示意，分類存在瀏覽器（localStorage，所有測試帳號共用）。
// 正式環境：表清單與分類由預算工作區提供（TM1 維度／屬性或設定 Cube），透過 API 讀寫。
// ─────────────────────────────────────────────────────────────
import { getNode, rebuildIndex } from './navigation.js';
import { local } from '../services/storage.js';

const R = (n, name) => ({ id: `R${String(n).padStart(2, '0')}`, name, kind: '收入' });
const E = (n, name) => ({ id: `E${String(n).padStart(2, '0')}`, name, kind: '費用' });

// 收入 22 張、費用 50 張（示意）
export const BUDGET_TABLES = [
  R(1, '客運收入－普通車'), R(2, '客運收入－對號車'), R(3, '客運收入－定期票'), R(4, '行李包裹收入'),
  R(5, '貨運收入－整車'), R(6, '貨運收入－零擔'), R(7, '附業收入－餐旅'), R(8, '附業收入－站區商場'),
  R(9, '租金收入－土地'), R(10, '租金收入－建物'), R(11, '廣告收入'), R(12, '權利金收入'),
  R(13, '代辦業務收入'), R(14, '利息收入'), R(15, '投資收益'), R(16, '資產處分收入'),
  R(17, '違規罰款收入'), R(18, '政府補助收入'), R(19, '雜項收入'), R(20, '觀光列車收入'),
  R(21, '包車收入'), R(22, '停車場收入'),
  E(1, '用人費用－正式員額薪資'), E(2, '用人費用－超時工作報酬'), E(3, '用人費用－獎金'), E(4, '用人費用－退休及卹償金'),
  E(5, '用人費用－福利費'), E(6, '服務費用－水電費'), E(7, '服務費用－郵電費'), E(8, '服務費用－旅運費'),
  E(9, '服務費用－印刷裝訂與廣告費'), E(10, '服務費用－修理保養及保固費'), E(11, '服務費用－保險費'), E(12, '服務費用－一般服務費'),
  E(13, '服務費用－專業服務費'), E(14, '材料及用品費－使用材料費'), E(15, '材料及用品費－用品消耗'), E(16, '材料及用品費－燃料'),
  E(17, '材料及用品費－牽引用電'), E(18, '租金與利息－地租及水租'), E(19, '租金與利息－房租'), E(20, '租金與利息－機器租金'),
  E(21, '租金與利息－利息'), E(22, '折舊－房屋建築'), E(23, '折舊－機械設備'), E(24, '折舊－交通運輸設備'),
  E(25, '折舊－軌道設施'), E(26, '攤銷－電腦軟體'), E(27, '稅捐與規費－房屋稅'), E(28, '稅捐與規費－地價稅'),
  E(29, '稅捐與規費－規費'), E(30, '會費、捐助、補助－會費'), E(31, '會費、捐助、補助－捐助'), E(32, '短絀與賠償給付'),
  E(33, '其他－雜項支出'), E(34, '出國計畫－考察'), E(35, '出國計畫－開會'), E(36, '出國計畫－訓練研習'),
  E(37, '出國計畫－洽公'), E(38, '資通訊－軟體購置'), E(39, '資通訊－硬體設備'), E(40, '資通訊－系統維運'),
  E(41, '資通訊－資安服務'), E(42, '資通訊－雲端服務'), E(43, '資通訊－網路通訊'), E(44, '資本支出－土地'),
  E(45, '資本支出－房屋及建築'), E(46, '資本支出－機械及設備'), E(47, '資本支出－車輛購置'), E(48, '資本支出－軌道改善工程'),
  E(49, '資本支出－號誌電訊工程'), E(50, '資本支出－電腦軟體'),
];
export const tableById = (id) => BUDGET_TABLES.find((t) => t.id === id);

const range = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${p}${String(a + i).padStart(2, '0')}`);

// 預設五類（順序同選單：一般收入、一般費用、出國計畫、資通訊、資本支出）
// 同一張表可同時在多個分類，例如「旅運費」也在出國計畫、「攤銷－電腦軟體」也在資通訊
export const DEFAULT_GROUPS = [
  { id: 'income', name: '一般收入預算空表編列', tables: range('R', 1, 22) },
  { id: 'expense', name: '一般費用預算空表編列', tables: range('E', 1, 33) },
  { id: 'overseas', name: '出國計畫預算編列', tables: ['E08', ...range('E', 34, 37)] },
  { id: 'ict', name: '資通訊預算編列', tables: ['E26', ...range('E', 38, 43), 'E50'] },
  { id: 'capex', name: '資本支出預算編列', tables: [...range('E', 44, 50), 'E24'] },
];

const KEY = 'aa.budgetGroups.v1';
export const getGroups = () => local.get(KEY, null) || DEFAULT_GROUPS;
export const getGroup = (id) => getGroups().find((g) => g.id === id) || null;
// 首頁快速功能用的簡稱：「一般收入預算空表編列」→「一般收入」
export const shortName = (name = '') => name.replace(/預算(空表)?編列$/, '') || name;

export function saveGroups(groups) {
  local.set(KEY, groups);
  syncGroupsToNav();
  window.dispatchEvent(new Event('aa-groups'));
}
export function resetGroups() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  syncGroupsToNav();
  window.dispatchEvent(new Event('aa-groups'));
}
export function newGroupId() {
  return `g${Date.now().toString(36)}`;
}

// 依分類產生選單節點：維護（#bp-分類）與填表（#bf-分類）
export function syncGroupsToNav() {
  const groups = getGroups();
  const plan = getNode('budget-plan');
  const fill = getNode('budget-fill');
  if (plan) plan.children = groups.map((g) => ({ id: `bp-${g.id}`, label: g.name, icon: 'form', page: 'group-edit', groupId: g.id }));
  if (fill) fill.children = groups.map((g) => ({ id: `bf-${g.id}`, label: g.name, icon: 'form', page: 'group-fill', groupId: g.id }));
  rebuildIndex();
}
syncGroupsToNav();
// 其他視窗修改分類時同步
try {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { syncGroupsToNav(); window.dispatchEvent(new Event('aa-groups')); }
  });
} catch { /* ignore */ }
