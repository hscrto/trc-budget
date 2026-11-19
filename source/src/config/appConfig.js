// ─────────────────────────────────────────────────────────────
// 全域設定：部署時主要改這個檔案
// 會計系統（AA）= 預算系統 + 審核會計系統，共用 SSO 登入
// ─────────────────────────────────────────────────────────────
export const APP_CONFIG = {
  suiteName: '臺鐵會計系統',
  companyName: '國營臺灣鐵路股份有限公司',
  version: 'Prototype 1109-C',

  // 目前這套前端是哪一個子系統（Portal 與頂列「切換系統」會標示為目前所在）
  currentSystem: 'budget',

  // 'mock' = 模擬資料（prototype）；'live' = 連接 TM1 / 外部系統 API
  dataMode: 'mock',

  // 系統註冊表：Portal 入口、頂列切換、嵌入（embed）、開啟（launch）都從這裡組網址
  //   url      頁面網址根目錄；apiBase = API 根目錄
  //   portal   有填 = 出現在 Portal 與頂列切換選單（依 order 排序）
  //              icon / desc / accent（卡片色條）
  //   openIn   'new' = 新視窗（預設，使用者 11/09 確認）；'same' = 同一視窗
  //   建置平台只記在註解（畫面不顯示平台，使用者 11/10 決定）：Portal、預算系統＝PAW；審核會計系統、BI＝Maximo MAS 9
  //   internal true = 就是這套前端本身（進入時直接到本系統首頁）
  // 之後 Portal 要擴充入口，只要在這裡新增一筆並給 portal 設定
  systems: {
    budget: {
      name: '預算系統', url: './', internal: true,
      portal: { order: 1, icon: 'clipboard', accent: '#00529c', desc: '預算編列、審查、報部與各階段審議作業' },
    },
    audit: {
      name: '審核會計系統', url: 'https://audit.trc.example/', // TODO：正式網址
      openIn: 'new', open: false, // 11/17 使用者：尚未開放的系統禁止點擊（開放後改為 true）
      portal: { order: 2, icon: 'shield', accent: '#1a2d65', desc: '會計審核、傳票與帳務作業' },
    },
    bi: {
      name: '商業智慧 BI', url: 'https://bi.trc.example/', // TODO：正式網址
      openIn: 'new', open: false,
      portal: { order: 3, icon: 'chart', accent: '#5e93ba', desc: '經營分析儀表板與管理報表' },
    },
    paw: { name: '預算工作區', short: '預算工作區', url: 'https://paw.trc.example' }, // TODO
    report: { name: '報表服務', apiBase: 'https://report-api.trc.example/api' },  // TODO
  },

  launch: {
    confirm: true, // true = 開啟外部系統前先顯示提示視窗
  },

  // 登入：mock = 測試帳號；sso = 導向 SSO，回來後呼叫 userInfoUrl 取得使用者與角色
  // 閒置自動登出（11/10）：閒置 idleMinutes 分鐘自動登出；最後 warnSeconds 秒跳出提醒
  session: { idleMinutes: 30, warnSeconds: 60 },

  auth: {
    mode: 'mock',
    ssoLoginUrl: '',   // TODO：SSO 登入頁
    ssoLogoutUrl: '',  // TODO：SSO 登出頁
    userInfoUrl: '',   // TODO：回傳 { id, name, dept, roles: [] }
  },

  tm1: {
    // PAW Local 通常把 TM1 REST API 轉接在 /tm1/<資料庫名稱>/api/v1（部署前需實測）
    baseUrl: '/tm1/AA/api/v1',
  },
};

export const currentSystem = () => APP_CONFIG.systems[APP_CONFIG.currentSystem];

export function systemUrl(systemId, path = '') {
  const s = APP_CONFIG.systems[systemId];
  if (!s) return '#';
  return s.url.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

// 系統是否已開放（open: false＝尚未開放，Portal 與切換選單都不能點）
export const isSystemOpen = (id) => APP_CONFIG.systems[id]?.open !== false;
export const CLOSED_HINT = '系統建置中，尚未開放';

// Portal／切換選單的入口（依 order 排序）
export const portalSystems = () =>
  Object.entries(APP_CONFIG.systems)
    .filter(([, s]) => s.portal)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.portal.order - b.portal.order);
