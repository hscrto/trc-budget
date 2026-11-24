import { portalSystems } from './appConfig.js';

// ─────────────────────────────────────────────────────────────
// 預算模組：選單與頁面結構（唯一的資料來源）
// 左側選單、上方頁籤、麵包屑、頁面、權限矩陣都從這裡產生。
//
// 節點欄位
//   id          路由代碼與權限代碼（網址 #id），僅限英數字與連字號
//   label       顯示文字
//   icon        圖示（見 components/Icon.jsx）
//   children    子項目；有子項目的節點會成為「分類頁」
//   group       子項目在 hover 子選單中的分組標題（用於「新增」）
//   flyout      true = 滑鼠移過去時在右側展開子選單
//   sidebar     false = 不出現在左側選單（只從頁籤進入）
//   sidebarLeaf true = 左側選單不展開子項目
//
// 頁面類型（三選一，都不填 = 本系統頁面）
//   embed   { kind: 'iframe', system, path, title }   嵌入其他模組畫面
//           { kind: 'api', system, endpoint, title }  用 API 讀取資料後顯示
//   launch  { system, path, title }                   在新視窗開啟其他模組，本系統留在背景
//   page    特殊頁面代碼（例如 'roles'）
// ─────────────────────────────────────────────────────────────
export const SITE_MAP = [
  { id: 'home', label: '首頁', icon: 'home' },
  {
    // 11/13 使用者：「新增」改為「新建」，分組與項目文字參照 PAW 的新建選單（權限維持原設定）
    // 11/13 使用者：新建只給處以上（menuPerm: 'menu-new'）；室、段的選單只有首頁、個人
    id: 'new', label: '新建', icon: 'add', flyout: true, sidebarLeaf: true, menuPerm: 'menu-new',
    children: [
      // TODO：PAW 新建各項的實際入口網址
      { id: 'new-book', label: '工作簿', icon: 'notebook', group: '預算編列維護作業', perm: 'budget-maint',
        launch: { system: 'paw', path: '/', title: '新建工作簿' } },
      { id: 'new-book-template', label: '源自範本的工作簿', icon: 'notebook', group: '預算編列維護作業', perm: 'budget-maint',
        launch: { system: 'paw', path: '/', title: '從範本新建工作簿' } },
      { id: 'new-data-model', label: '工作台', icon: 'treeView', group: '建模', lockedVisible: true, perm: 'sysadm',
        launch: { system: 'paw', path: '/', title: '新建工作台' } },
      { id: 'new-application', label: '預算編列計畫維護', icon: 'app', group: '預算編列與審查',
        launch: { system: 'paw', path: '/', title: '預算編列計畫維護' } },
      { id: 'new-plan', label: '審查計畫維護', icon: 'map', group: '預算編列與審查',
        launch: { system: 'paw', path: '/', title: '審查計畫維護' } },
      { id: 'new-forecast', label: '基準線預測', icon: 'chartLine', group: '預測',
        launch: { system: 'paw', path: '/', title: '基準線預測' } },
    ],
  },
  // 我的預算審查（11/12：原「預算審查」改名，獨立為第一層）：依審核狀態區分
  // 11/13 使用者：「我的預算審查」改名「我的待辦」，並從選單移除，只從首頁進入
  { id: 'review-plan', label: '我的待辦', icon: 'task', page: 'review-overview', sidebar: false, children: [
    // 11/12 狀態全面調整：待審（待我本人審核）、已完成（核准或退回，case close）、已送審（我已提交）
    // 11/12 順序：已送審 > 我待審 > 已完成
    // 11/18 使用者：狀態只剩 我待審、已完成（原「已送審」併入已完成）
    { id: 'rv-pending', page: 'review-list', label: '我待審', icon: 'pending' },
    { id: 'rv-done', page: 'review-list', label: '已完成', icon: 'reviewed' },
    // 11/18 第三層：明細表（依 PAW 畫面；網址 #rd:明細表代碼，從我的待辦、首頁待辦點進來）
    { id: 'review-detail', page: 'review-detail', label: '明細表', icon: 'doc', sidebar: false, favorite: false },
  ] },
  // 預算編列（11/13 使用者）：首頁「快速功能」點過去的地方＝各室填表編列預算。不出現在選單。
  //   子項目＝各分類（由 config/budgetGroups.js 依「各類預算編列」的維護結果產生），網址 #bf-分類代碼
  { id: 'budget-fill', label: '預算編列', icon: 'form', sidebar: false, children: [] },
  {
    // 預算編列維護（11/12 下午再改為縮寫：Application → App；：原「預算審查作業」→「預算審查維護」→「預算編列維護」→ 加註 PAW 對照名稱）
    // 底下：各類預算編列（＝PAW Application）。預算表設定 11/12 移到第一層
    id: 'budget-review', label: '預算編列維護', icon: 'grid', menuPerm: 'menu-budget-admin', page: 'plan-home', // 11/18：與預算審查設定 共用子首頁「預算編列與審查」
    // 11/13：只有會計處以上與管理者看得到，其他人選單不顯示
    children: [
      // 各類預算編列（11/13 使用者：屬於「維護」）：會計處把 70 多張表分類成幾個分類（目前五類），
      //   可命名分類、編輯分類中有哪些表；同一張表可同時在多個分類。各室填表則從首頁快速功能進入（budget-fill）。
      //   子項目由 config/budgetGroups.js 依維護結果產生，網址 #bp-分類代碼
      { id: 'budget-plan', label: '各類預算編列', page: 'group-list', children: [] },
    ],
  },
  {
    // 預算表設定（11/12 下午再改為縮寫：Report & Analysis → R&A； 由「預算編列維護」底下往上提到第一層並加註 PAW 對照名稱）
    // 只有會計處以上的人員可以查看並使用（見 rbac.js 的「會計處以上」）
    id: 'budget-maint', label: '預算表設定', icon: 'clipboard', menuPerm: 'menu-budget-admin',
    children: [
      // 00、01 依現有 PAW 選單（2026-11-09 參考圖）；▸ 項目的下一層待提供
      { id: 'bm-00', label: '00.基本設定維護', children: [
        { id: 'bm-00-version', label: '0.01.預算版本建立作業' },
        { id: 'bm-00-copy', label: '0.02.預算複製版本作業' },
        { id: 'bm-00-setg', label: 'SET-G.設定作業', children: [
          { id: 'bm-00-setg-tbd', label: '下一層項目待提供', placeholder: true },
        ] },
      ] },
      { id: 'bm-01', label: '01.預算概算編列', children: [
        { id: 'bm-01-plan', label: '1.00.企劃', children: [
          { id: 'bm-01-plan-tbd', label: '下一層項目待提供', placeholder: true },
        ] },
        { id: 'bm-01-income', label: '1.01.收入', children: [
          { id: 'bm-01-income-tbd', label: '下一層項目待提供', placeholder: true },
        ] },
        { id: 'bm-01-expense', label: '1.02.費用', children: [
          { id: 'bm-01-expense-tbd', label: '下一層項目待提供', placeholder: true },
        ] },
        { id: 'bm-01-report', label: '1.03.報表', children: [
          { id: 'bm-01-report-tbd', label: '下一層項目待提供', placeholder: true },
        ] },
      ] },
      // 02 依 PAW 現有選單（2026-11-09 參考圖）；icon: 'bookChart' = 參考圖中的彩色長條圖示
      { id: 'bm-02', label: '02.公司審查資料', children: [
        { id: 'bm-02-custom', label: '自定義項目設定', icon: 'bookChart' },
        { id: 'bm-02-adjust', label: '調整預算作業', icon: 'bookChart' },
        { id: 'bm-02-expense', label: '費用明細表', icon: 'bookChart' },
      ] },
      { id: 'bm-03', label: '03.報部表件&審查', children: [
        { id: 'bm-03-forms', label: '報部表件產製' },
        { id: 'bm-03-reply', label: '報部審查回覆' },
      ] },
      { id: 'bm-04', label: '04.主計總處審查', children: [
        { id: 'bm-04-opinion', label: '主計總處審查意見' },
        { id: 'bm-04-adj', label: '調整數登錄' },
      ] },
      { id: 'bm-05', label: '05.行政院審查', children: [
        { id: 'bm-05-approved', label: '行政院核定數' },
        { id: 'bm-05-adj', label: '調整數登錄' },
      ] },
      { id: 'bm-06', label: '06.立法院審查', children: [
        { id: 'bm-06-approved', label: '立法院審定數' },
        { id: 'bm-06-cut', label: '刪減數登錄' },
      ] },
      // 11/17 使用者：R&A 移除 TEST
    ],
  },
  // 預算審查設定（11/12 新增，同日移到第一層；同日加註 PAW 對照名稱）：設計提交階層（室 → 段 → 處 → 會計處 → 總公司）
  { id: 'review-setting', label: '預算審查設定', icon: 'plan', menuPerm: 'menu-budget-admin', page: 'plan-home', children: [ // 11/18：共用子首頁的「審查計畫維護」頁籤
    { id: 'rs-expense', label: '費用明細表', icon: 'form', page: 'plan-detail', desc: '設計費用預算的提交階層（室 → 段 → 處 → 會計處 → 總公司）。' },
    { id: 'rs-income', label: '收入明細表', icon: 'form', page: 'plan-detail', desc: '設計收入預算的提交階層（室 → 段 → 處 → 會計處 → 總公司）。' },
  ] },
  {
    // 管理（11/12 新增為「系統管理員」；11/13 使用者：更名「管理」，底下不用子頁）
    // lockedVisible：沒有權限的人也看得到這一項，但呈現鎖定、不能點（只有管理者可以使用）
    // 11/13 使用者：只有系統管理員看得到（其他人選單不顯示，不再呈現鎖定）
    // 11/18 使用者：「管理」底下放「群組」（User Group，Book2.xlsx；用在預算審查設定 的貢獻者與核准者）
    id: 'sysadm', label: '管理', icon: 'settings',
    children: [
      { id: 'admin-groups', label: '群組', icon: 'user', page: 'groups' },
    ],
  },
  {
    // 使用者（11/13 使用者：原右上角齒輪「系統管理」的內容搬到這個選單；只有管理員看得到，其他人不顯示）
    id: 'admin', label: '使用者', icon: 'user',
    children: [
      { id: 'admin-users', label: '使用者與單位', icon: 'user', page: 'users' }, // 11/13：測試帳號與單位代碼表
      { id: 'admin-roles', label: '角色權限', icon: 'lock', page: 'roles' },
      { id: 'admin-codes', label: '代碼維護', icon: 'doc' },
    ],
  },
  {
    // 訊息中心（11/10）：公告與通知整併在同一頁，以頁籤切換；頂列鈴鐺進入「通知」
    // 11/13 使用者：選單移除訊息中心（頁面保留，Portal 公告「查看全部」仍會連到這裡）
    id: 'messages', label: '訊息中心', icon: 'bell', page: 'messages', sidebarLeaf: true, favorite: false, sidebar: false,
    children: [
      { id: 'msg-news', label: '公告', page: 'messages', tab: 'news', favorite: false },
      { id: 'msg-notify', label: '通知', page: 'messages', tab: 'notify', favorite: false },
    ],
  },
  // 我的最愛（完整清單與編輯）：從側欄「我的最愛」與首頁進入，不另外放在選單
  { id: 'my-favorites', label: '我的最愛', icon: 'star', page: 'favorites', sidebar: false, favorite: false },
  // 11/13：完整的最近打開清單（只從首頁「查看全部」進入）
  { id: 'my-recent', label: '最近打開', icon: 'clock', page: 'recent', sidebar: false, favorite: false },
  {
    id: 'personal', label: '個人', icon: 'folder', sidebarLeaf: true,
    children: [
      { id: 'personal-profile', label: '個人資料' },
      { id: 'personal-bookmarks', label: '我的書籤' },
    ],
  },

  // ── 以下只從上方頁籤進入 ──
  {
    id: 'reports', label: '報表查詢', sidebar: false,
    children: [
      { id: 'rpt-financial', label: '財務報表',
        embed: { kind: 'api', system: 'report', endpoint: '/reports/financial?year=116', title: '財務報表' } },
      { id: 'rpt-execution', label: '預算執行報表',
        embed: { kind: 'iframe', system: 'paw', path: '/?perspective=dashboard&path=/shared/AA/預算執行報表&embed=true', title: '預算執行報表' } },
      { id: 'rpt-variance', label: '差異分析' },
    ],
  },
];

// 不在選單裡、但也要能獨立設定權限的功能（按鈕、區塊）
export const EXTRA_FEATURES = [
  { id: 'favorites', label: '我的最愛（側欄、首頁、☆ 按鈕）' },
  { id: 'recent', label: '最近打開（側欄、首頁）' },
  // Portal 入口與頂列切換：每個系統一個權限代碼 sys-<系統代碼>
  ...portalSystems().map((s) => ({ id: `sys-${s.id}`, label: `系統入口：${s.name}` })),
  { id: 'home-tasks', label: '首頁：我的待辦' },
  { id: 'home-news', label: '首頁：最新公告' },
  // 11/12：左側選單「預算編列維護」「預算表設定」「預算審查設定」三項能否展開（預設只有會計處以上、管理者）
  //   其他人在選單上看到的是鎖定（同系統管理員：不能點、不能展開），要做事從首頁或「新增」進入；頁面本身的權限不變
  { id: 'menu-budget-admin', label: '選單：顯示預算編列維護／預算表設定／預算審查設定（會計處以上）' },
  // 11/13：選單「新建」只給處以上（室、段的選單只有首頁、個人）
  { id: 'menu-new', label: '選單：顯示新建（處以上）' },
  // 11/16：Portal 公告管理（新增、修改、排程、下架）；預設只有管理者
  { id: 'news-admin', label: 'Portal：公告管理（新增、修改、存草稿）' },
  // 11/17：公告「管理」與「發布」分開授權；兩者都可依角色、單位或人員授權（角色權限頁下方）
  { id: 'news-publish', label: 'Portal：公告發布（發布、排程、下架、刪除）' },
];

// 上方頁籤
//   target  點頁籤本身前往的節點（沒有權限時改用第一個有權限的連結）
//   match   目前頁面路徑中「最深」符合的節點決定哪個頁籤亮起
//   actions 快捷按鈕；columns 分組連結；featured 右側推薦（都填節點 id）
export const TABS = [
  {
    id: 'tab-budget', label: '預算編列', target: 'budget-review',
    match: ['new', 'review-plan', 'budget-review', 'review-setting', 'budget-maint', 'bm-00', 'bm-01', 'bm-test'],
    actions: ['new-book', 'bm-00-version'],
    columns: [
      { title: '預算編列維護', links: ['budget-plan', 'review-setting', 'review-plan'] },
      { title: '各類預算編列', links: ['bp-income', 'bp-expense', 'bp-overseas', 'bp-ict', 'bp-capex'] },
      { title: '預算表設定', links: ['bm-00', 'bm-01', 'bm-test'] },
      { title: '01.預算概算編列', links: ['bm-01-plan', 'bm-01-income', 'bm-01-expense', 'bm-01-report'] },
    ],
    featured: 'bm-00-copy',
  },
  {
    id: 'tab-review', label: '預算審查', target: 'bm-02',
    match: ['bm-02', 'bm-03', 'bm-04', 'bm-05', 'bm-06'],
    actions: ['bm-02-adjust'],
    columns: [
      { title: '02.公司審查資料', links: ['bm-02-custom', 'bm-02-adjust', 'bm-02-expense'] },
      { title: '報部與外部審查', links: ['bm-03', 'bm-04', 'bm-05', 'bm-06'] },
    ],
    featured: 'bm-03-forms',
  },
  {
    id: 'tab-report', label: '報表查詢', target: 'reports', match: ['reports'],
    actions: ['rpt-financial'],
    columns: [{ title: '常用報表', links: ['rpt-financial', 'rpt-execution', 'rpt-variance'] }],
    featured: 'rpt-execution',
  },
  {
    id: 'tab-personal', label: '個人專區', target: 'personal', match: ['personal'],
    actions: ['personal-profile'],
    columns: [{ title: '我的設定', links: ['personal-profile', 'personal-bookmarks'] }],
  },
];

// ── 索引工具 ──
const INDEX = {};
// 11/13：各類預算編列的分類可以維護（新增、改名），維護後重建索引
export function rebuildIndex() {
  Object.keys(INDEX).forEach((k) => delete INDEX[k]);
  (function build(nodes, parent, depth) {
    nodes.forEach((n) => {
      INDEX[n.id] = { node: n, parent, depth };
      if (n.children) build(n.children, n.id, depth + 1);
    });
  })(SITE_MAP, null, 0);
}
rebuildIndex();

export const getNode = (id) => INDEX[id]?.node || null;
export const getDepth = (id) => INDEX[id]?.depth ?? -1;

// ── 我的最愛／最近打開 ──
// 可加入最愛的層級：0 = 第一層，1 = 第二層，2 = 第三層
// 11/12 選單調整後「01.預算概算編列」等變成第三層，放寬到 2（各類預算編列的五種表也可加入）
// 個別節點可用 favorite: true / false 覆寫
export const FAVORITE_MAX_DEPTH = 2;

export function isFavoritable(node) {
  if (!node || node.id === 'home' || node.page === 'roles') return false;
  if (node.favorite !== undefined) return node.favorite;
  return getDepth(node.id) <= FAVORITE_MAX_DEPTH;
}

// 開啟某頁時，「最近打開」記錄它所屬、可加入最愛的最深上層（含自己）
export function recentTargetFor(id) {
  const trail = getTrail(id).filter(isFavoritable);
  return trail[trail.length - 1] || null;
}

// 從第一層到目前節點的路徑（不含首頁）
export function getTrail(id) {
  const trail = [];
  let cur = id;
  while (cur && INDEX[cur]) {
    trail.unshift(INDEX[cur].node);
    cur = INDEX[cur].parent;
  }
  return trail;
}

// 權限矩陣用：攤平成 [{ node, depth }]
export function flattenSiteMap() {
  const out = [];
  (function walk(nodes, depth) {
    nodes.forEach((n) => { out.push({ node: n, depth }); if (n.children) walk(n.children, depth + 1); });
  })(SITE_MAP, 0);
  return out;
}
