import { useEffect, useMemo, useRef, useState } from 'react';
import UserSwitcher from '../components/UserSwitcher.jsx';
import Icon from '../components/Icon.jsx';
import emblemWhite from '../assets/emblem-white.png';
import logoFull from '../assets/logo-full.png';
import trainSun from '../assets/trains/sun.svg';
import trainSea from '../assets/trains/sea.svg';
import trainBlue from '../assets/trains/blue.svg';
import trainStar from '../assets/trains/star.svg';
import trainMist from '../assets/trains/mist.svg';
import stTaipei from '../assets/stations/taipei.webp';
import stHsinchu from '../assets/stations/hsinchu.webp';
import stTaichung from '../assets/stations/taichung.webp';
import stKaohsiung from '../assets/stations/kaohsiung.webp';
import stHualien from '../assets/stations/hualien.webp';
import stJiji from '../assets/stations/jiji.webp';
import stKeelung from '../assets/stations/keelung.webp';
import stChanghua from '../assets/stations/changhua.webp';
// 11/16：版6 改用使用者提供的手繪水彩車站插圖（右側放插圖、左側淡出成紙色），依北→中→南→東排序
import art_keelung from '../assets/stations-art/keelung.webp';
import art_taipei from '../assets/stations-art/taipei.webp';
import art_hsinchu from '../assets/stations-art/hsinchu.webp';
import art_taichung from '../assets/stations-art/taichung.webp';
import art_changhua from '../assets/stations-art/changhua.webp';
import art_kaohsiung from '../assets/stations-art/kaohsiung.webp';
import art_hualien from '../assets/stations-art/hualien.webp';
// 11/16 使用者：版6 整個背景都是幻燈片——使用原圖（16:9）全幅顯示
import full_keelung from '../assets/stations-full/keelung.webp';
import full_taipei from '../assets/stations-full/taipei.webp';
import full_hsinchu from '../assets/stations-full/hsinchu.webp';
import full_taichung from '../assets/stations-full/taichung.webp';
import full_changhua from '../assets/stations-full/changhua.webp';
import full_kaohsiung from '../assets/stations-full/kaohsiung.webp';
import full_hualien from '../assets/stations-full/hualien.webp';
import patAudit from '../assets/ticket-pattern-audit.png';
import { APP_CONFIG, portalSystems } from '../config/appConfig.js';
import { isSystemOpen, CLOSED_HINT } from '../config/appConfig.js';
import { flattenSiteMap, getTrail } from '../config/navigation.js';
import { switchSystem, requestLaunch, openBudgetPage } from '../nodeActions.js';
import { usePerm } from '../permissions.jsx';
import { dataService } from '../services/dataService.js';
import { SessionTimer } from '../session.jsx';
import { PortalNews, HeroNews, PortalCards } from './PortalPage.jsx';

// ─────────────────────────────────────────────────────────────
// Portal 三版比較（內部參考用）：#portal = 版1、#portal-v2、#portal-v3
// 定案後保留選定的版本，並移除 PortalVersionSwitcher
// ─────────────────────────────────────────────────────────────
// 11/12 整理為四版：原版1 刪除；原版4（加入公告）改名簡約風成為版1；待審核筆數移到版2，其他順延
export const PORTAL_VERSIONS = [
  // 11/24 使用者：刪除原版1（簡約風）、原版6（早期車票），其他依序重新編號：
  //   原版2→版1、原版2-1→版1-1、原版3→版2、原版3-1→版2-1、原版4→版3、原版5→版4
  // 11/24 下午：版1→版1-1、版1-1→版1-2；版2-1 不動、原版2→版2-3、新增版2-2（版2 的底＋版1 入口卡片）；版3、版4 交換
  { id: 'portal', label: '版1-1', title: '我待審筆數' },
  { id: 'portal-v1-2', label: '版1-2', title: '車票入口' },
  { id: 'portal-v2-1', label: '版2-1', title: '特色列車' },
  { id: 'portal-v2-2', label: '版2-2', title: '特色列車' },
  { id: 'portal-v2-3', label: '版2-3', title: '特色列車' },
  { id: 'portal-v3', label: '版3', title: '特色車站' },
  { id: 'portal-v4', label: '版4', title: '模組總覽' },
];

export function PortalVersionSwitcher({ current }) {
  return (
    <nav className="pv-switch" aria-label="Portal 版本比較">
      <span className="pv-switch-title">Portal 版本比較</span>
      {PORTAL_VERSIONS.map((v) => (
        <a key={v.id} href={`#${v.id}`} className={current === v.id ? 'on' : ''} aria-current={current === v.id ? 'page' : undefined}>
          <b>{v.label}</b> {v.title}
        </a>
      ))}
    </nav>
  );
}

function UserChip({ user, onLogout, dark = true }) {
  return (
    <div className={`topbar-right ${dark ? '' : 'light'}`}>
      <SessionTimer light={!dark} />
      <UserSwitcher user={user} />
      <button className="topbar-logout" onClick={onLogout}>
        <Icon name="logout" size={18} /> <span>登出</span>
      </button>
    </div>
  );
}

const useSystems = () => {
  const { can } = usePerm();
  return portalSystems().filter((s) => can(`sys-${s.id}`));
};

// ═════════════════════════════════════════════════════════════
// 版2：臺鐵特色列車
// 主視覺輪播三款特色列車；系統卡片做成「乘車證」，色彩取自對應列車
// 圖片目前為示意插圖，取得官方照片後替換 src/assets/trains/ 內檔案即可
// ═════════════════════════════════════════════════════════════
// 輪播順序：鳴日號 → 藍皮解憂號 → 環島之星 → 海風號 → 山嵐號（循環）
export const TRAINS = [
  {
    id: 'sun', name: '鳴日號', en: 'The Future', image: trainSun,
    slogan: '出發蒐集臺灣之美', note: '以「秋天的風」為主軸，橘黑雙色車身、暖橙金點綴。',
    c1: '#e98a2b', c2: '#f2c27a', ink: '#3b3f46',
  },
  {
    id: 'blue', name: '藍皮解憂號', en: 'Blue Train', image: trainBlue,
    slogan: '南迴線上最解憂的藍色微笑', note: '復古懷舊、慢活好時光，枋寮到臺東的開窗旅行。',
    c1: '#1d4f9a', c2: '#8fd0f0', ink: '#163d78',
  },
  {
    id: 'star', name: '環島之星', en: 'Round-the-Island', image: trainStar,
    slogan: '唯一繞行全臺的觀光列車', note: '串連東西幹線與南迴，一趟車玩遍全臺各地。',
    c1: '#c86a9a', c2: '#f3b6c8', ink: '#4a3f6e',
  },
  {
    id: 'sea', name: '海風號', en: 'Sea Breeze', image: trainSea,
    slogan: '海天一線，從容致遠', note: '藍綠漸層與溫暖馬卡龍色，面海座位看見海天一線。',
    c1: '#2f8f9d', c2: '#f3a98a', ink: '#1f5f6e',
  },
  {
    id: 'mist', name: '山嵐號', en: 'Mountain Mist', image: trainMist,
    slogan: '山巒晨霧間的縱谷慢旅', note: '清新黃綠車身呼應縱谷稻浪，看山嵐繚繞、田園交織。',
    c1: '#7f9a3a', c2: '#d4df6a', ink: '#2f5a45',
  },
];
// 系統 ↔ 列車主題（可自由調整）
const TRAIN_OF = { budget: 'sun', audit: 'sea', bi: 'blue' };
// 11/16 使用者：乘車證移除「車種」，改用號誌燈顯示系統狀態——綠燈「已進站」＝系統正常可用；紅燈「即將進站」＝系統尚未完成
//   目前審核會計模組、BI 還沒設計好，所以是即將進站。正式環境可改由各模組的健康檢查 API 決定。
// 11/17：改依 appConfig 的 open 設定（open: false＝尚未開放，卡片與車票不能點）
const STATION_OF = new Proxy({}, { get: (_, id) => (isSystemOpen(id) ? 'in' : 'soon') });
const closedProps = (id) => (isSystemOpen(id) ? {} : { disabled: true, 'aria-disabled': true, title: CLOSED_HINT });
const STATION_LABEL = { in: '已進站', soon: '即將進站' };
// 乘車證顏色：臺鐵標誌的三個標準色（11/12 使用者指定）——藍 PANTONE 2145C（R0 G77 B161）、
//   灰 PANTONE Cool Gray 11（R80 G85 B91）、金 PANTONE 874C（R202 G140 B81）；ink 為同色系較深的字色（白底上的可讀性）
// 11/12 使用者指定順序：金、藍、灰
const BRAND_OF = {
  budget: { c1: '#CA8C51', ink: '#8C5E31' },
  audit: { c1: '#004DA1', ink: '#003A7A' },
  bi: { c1: '#50555B', ink: '#36393D' },
};
const BRAND_SEQ = [BRAND_OF.budget, BRAND_OF.audit, BRAND_OF.bi];

// 版2（11/12 追加）：乘車證顯示待審核筆數（同版4，BI 不顯示）；下方加最新公告（同版1）。重要時程 11/12 全部版本移除
// 版3 的橫式乘車證（11/20 抽出成元件，版3／版3-1／版2-1 共用）
export function BoardingTickets({ items, pending }) {
  return (
  <div className="pv2-tickets">
    {items.map((s, i) => {
      return (
        <button key={s.id} className={`ticket ${isSystemOpen(s.id) ? '' : 'is-closed'}`} {...closedProps(s.id)} style={{ '--c1': (BRAND_OF[s.id] || BRAND_SEQ[i % 3]).c1, '--ink': (BRAND_OF[s.id] || BRAND_SEQ[i % 3]).ink }} onClick={() => switchSystem(s.id)}>
          <span className="ticket-body">
            <span className="ticket-top">
              <span>臺鐵會計系統・乘車證</span>
              <span className="ticket-no">No. {String(i + 1).padStart(3, '0')}</span>
            </span>
            <span className="ticket-route">
              <span className="ticket-st"><small>起站</small>系統入口</span>
              <span className="ticket-arrow"><Icon name="arrowRight" size={20} /></span>
              <span className="ticket-st to"><small>迄站</small>{s.name}</span>
            </span>
            <span className="ticket-desc">{s.portal.desc}</span>
            <span className="ticket-meta">
              <span><small>狀態</small>
                <span className={`ticket-light ${STATION_OF[s.id] || 'soon'}`} title={STATION_OF[s.id] === 'in' ? '系統正常，可以使用' : '模組建置中，尚未開放'}>
                  <i aria-hidden="true" />{STATION_LABEL[STATION_OF[s.id] || 'soon']}
                </span>
              </span>
              <span><small>月台</small>第 {i + 1} 月台</span>
            </span>
          </span>
          <span className="ticket-stub">
            {/* 待審核筆數（同版5；BI 不顯示，維持系統圖示） */}
            {pending?.[s.id] ? (
              <span className={`ticket-pending ${pending[s.id].count ? '' : 'zero'}`} aria-label={`${pending[s.id].label} ${pending[s.id].count}`}>
                <b>{pending[s.id].count}</b>
                <small>{pending[s.id].label}</small>
              </span>
            ) : <span className="ticket-ico"><Icon name={s.portal.icon} size={28} /></span>}
            {/* 11/20 使用者：版2-1、版3、版3-1 車票移除「登車」字樣與圖示 */}
          </span>
        </button>
      );
    })}
  </div>
  );
}

export function PortalTrains({ user, onLogout, slides = TRAINS, current = 'portal-v2-3', kicker = '臺鐵特色列車', dotsLabel = '特色列車', credit = '示意插圖・正式版改用臺鐵官網列車照片', className = '', paper = false, hoverPause = true, interval = 4000, heroNews = false, entry = 'tickets' }) {
  // paper：'classic'＝版5 原設計紙本車票；'pattern'＝版6 早期車票底紋
  const items = useSystems();
  const { can } = usePerm();
  const [pending, setPending] = useState(null);
  useEffect(() => {
    dataService.getPendingCounts(user).then(setPending).catch(() => setPending({}));
  }, [user]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, slides.length, interval]);
  const cur = slides[idx];

  return (
    <div className={`portal pv2 ${className}`}>
      <header className="topbar portal-bar">
        <div className="brand portal-brand">
          <img src={emblemWhite} alt="臺鐵公司" className="brand-emblem" />
          <span className="brand-name">{APP_CONFIG.suiteName}</span>
        </div>
        <UserChip user={user} onLogout={onLogout} />
      </header>
      <PortalVersionSwitcher current={current} />

      <section className="pv2-hero" style={{ '--c1': cur.c1, '--c2': cur.c2 }}
        onMouseEnter={() => hoverPause && setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {slides.map((t, i) => (
          <img key={t.id} src={t.image} alt={`${t.name}示意圖`} className={`pv2-slide ${i === idx ? 'on' : ''}`} />
        ))}
        <div className="pv2-hero-text">
          <p className="pv2-kicker">{kicker}・{cur.en}</p>
          {/* 11/23 使用者：版3-1 公告輪播取代「XXX，您好」的位置 */}
          {heroNews ? (can('home-news') && <HeroNews />) : <h1>{user.name}，您好</h1>}
          <p className="pv2-train"><b>{cur.name}</b>　{cur.slogan}</p>
          <p className="pv2-note">{cur.note}</p>
        </div>
        {/* 輪播指示：畫面中間下方的圓點（11/12 使用者：左側已有列車說明，不用列車名稱） */}
        {/* 11/16 使用者：左右箭頭，一鍵切換上一張／下一張，不用等輪播秒數 */}
        <button type="button" className="pv2-arrow prev" aria-label="上一張" onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}><Icon name="chevronDown" size={22} /></button>
        <button type="button" className="pv2-arrow next" aria-label="下一張" onClick={() => setIdx((i) => (i + 1) % slides.length)}><Icon name="chevronDown" size={22} /></button>
        <div className="pv2-dots" role="tablist" aria-label={dotsLabel}>
          {slides.map((t, i) => (
            <button key={t.id} role="tab" aria-selected={i === idx} aria-label={t.name} title={t.name}
              className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} />
          ))}
        </div>
        {credit && <span className="pv2-credit">{credit}</span>}
      </section>

      <main className="portal-inner pv2-main" aria-label="系統入口">
        <h2 className="pv2-h2">請選擇您的目的地 <small>模組將於新視窗開啟</small></h2>
        {/* 11/16 使用者：版5／版6 要一頁呈現不捲動——車票與最新公告左右並排 */}
        {paper ? (
          <div className="pt-layout">
            {paper === 'pattern' ? <PaperTickets items={items} pending={pending} /> : <ClassicTickets items={items} pending={pending} />}
            {paper !== 'pattern' && can('home-news') && <div className="pt-side"><PortalNews inline /></div>}
          </div>
        ) : null}
        {/* 11/16 使用者：版6 公告改到車票下方（同版2） */}
        {paper === 'pattern' && can('home-news') && <div className="pt-below"><PortalNews inline /></div>}
        {/* 11/24 使用者：版2-2＝版2 的底，入口改用版1 的卡片 */}
        {paper ? null : entry === 'cards' ? (
          <div className="portal-grid pv22-cards"><PortalCards items={items} pending={pending} withPending /></div>
        ) : <BoardingTickets items={items} pending={pending} />}
      </main>
      {!paper && !heroNews && can('home-news') && <PortalNews />}

      <footer className="portal-foot">© {APP_CONFIG.companyName}・{APP_CONFIG.version}</footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 版3：工作台（以「要做的事」為中心，而非先選系統）
// 左側系統 Dock、上方全站搜尋、中間今日重點 + 跨模組待辦 + 快速開始、右側公告與系統狀態
// ═════════════════════════════════════════════════════════════
function GlobalSearch({ extra = [] }) {
  const { visible } = usePerm();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const all = useMemo(() => flattenSiteMap()
    .map((x) => x.node)
    .filter((n) => n.label && n.id !== 'home' && !n.placeholder && visible(n)), [visible]);
  const pool = useMemo(() => [
    ...all.map((n) => ({ key: n.id, label: n.label, where: `預算模組 › ${getTrail(n.id).slice(0, -1).map((x) => x.label).join(' › ') || '首頁'}`, go: () => openBudgetPage(n.id) })),
    ...extra.filter((x) => isSystemOpen(x.sysId)).map((x) => ({ key: `${x.sysId}-${x.path}`, label: x.label, where: APP_CONFIG.systems[x.sysId]?.name, go: () => openIn(x.sysId, x) })),
  ], [all, extra]);
  const hits = q.trim()
    ? pool.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const go = (n) => { setOpen(false); setQ(''); n.go(); };

  return (
    <div className="pv3-search" ref={box}>
      <Icon name="search" size={20} />
      <input
        value={q}
        placeholder="搜尋各模組功能，例如：資本支出、傳票審核、儀表板"
        aria-label="搜尋功能"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          if (e.key === 'Enter' && hits[hi]) go(hits[hi]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <ul className="pv3-hits" role="listbox">
          {hits.length === 0 && <li className="muted pv3-nohit">找不到「{q}」相關功能</li>}
          {hits.map((n, i) => (
            <li key={n.key} role="option" aria-selected={i === hi}>
              <button className={i === hi ? 'hi' : ''} onMouseEnter={() => setHi(i)} onClick={() => go(n)}>
                <b>{n.label}</b>
                <small>{n.where}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { PortalOverview as PortalWorkspace };

// ═════════════════════════════════════════════════════════════
// 版3：模組總覽（11/10 改版）
// 不先選系統、也不重複預算模組首頁：每個系統一欄，列出該系統的摘要筆數（11/12：只放筆數，重要事項移除）、常用功能，
// 下方為最新公告（11/12：重要時程移除，改放公告）。審核會計模組、BI 的內容需 MAS 9 提供 API（目前為示意資料）。
// ═════════════════════════════════════════════════════════════

// 開啟某系統內的功能（一律新視窗）：預算模組用頁面代碼；其他模組用路徑
function openIn(sysId, it) {
  if (!isSystemOpen(sysId)) return; // 尚未開放
  if (it.route) { openBudgetPage(it.route); return; }
  if (APP_CONFIG.systems[sysId]?.mockRoute) { openBudgetPage(APP_CONFIG.systems[sysId].mockRoute); return; } // 11/20 審核會計模組示意畫面
  const sys = APP_CONFIG.systems[sysId];
  requestLaunch({ id: `${sysId}-${it.path}`, label: it.label || it.title, launch: { system: sysId, path: it.path, title: `${sys.name}：${it.label || it.title}` } });
}

export function PortalOverview({ user, onLogout }) {
  const systems = useSystems();
  const { can } = usePerm();
  const [data, setData] = useState(null);
  useEffect(() => { dataService.getPortalSummary(user).then(setData); }, [user]);
  const extra = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.systems).filter(([id]) => id !== 'budget')
      .flatMap(([id, sd]) => sd.links.map((l) => ({ sysId: id, ...l })));
  }, [data]);
  const today = new Date();
  const dateStr = `${today.getFullYear() - 1911} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日（${'日一二三四五六'[today.getDay()]}）`;

  return (
    <div className="portal pv3o">
      {/* 11/20 使用者：最上面的 bar 全面改為 #004DA1（版4 原本是白底彩色 Logo） */}
      <header className="pv3-top is-blue">
        <img src={emblemWhite} alt="臺鐵公司" className="brand-emblem" />
        <span className="pv3o-suite">{APP_CONFIG.suiteName}</span>
        <GlobalSearch extra={extra} />
        <UserChip user={user} onLogout={onLogout} />
      </header>
      <PortalVersionSwitcher current="portal-v4" />

      <main className="pv3o-main">
        <div className="pv3o-head">
          <div>
            <h1>模組總覽</h1>
            <p>{dateStr}・各模組摘要{data?.updatedAt ? `（資料時間 ${data.updatedAt}）` : ''}</p>
          </div>
        </div>

        <div className="pv3o-cols">
          {systems.map((s) => {
            const sd = data?.systems?.[s.id];
            return (
              <section key={s.id} className="pv3o-sys" style={{ '--accent': s.portal.accent }} aria-label={s.name}>
                <header className="pv3o-sys-head">
                  <span className="pv3o-sys-ico"><Icon name={s.portal.icon} size={20} /></span>
                  <span className="pv3o-sys-title">
                    <b>{s.name}</b>
                    {/* 11/16 使用者：審核會計、BI 尚未開放（紅點），與版3／版5 號誌燈一致 */}
                    <small className={STATION_OF[s.id] === 'in' ? '' : 'pv3o-closed'}><span className={STATION_OF[s.id] === 'in' ? 'pv3-ok' : 'pv3-ng'} />{STATION_OF[s.id] === 'in' ? '正常運作' : '尚未開放'}</small>
                  </span>
                  <button className={`pv3o-enter ${isSystemOpen(s.id) ? '' : 'is-closed'}`} {...closedProps(s.id)} onClick={() => switchSystem(s.id)}>
                    {isSystemOpen(s.id) ? <>進入 <Icon name="launch" size={16} /></> : '尚未開放'}
                  </button>
                </header>

                {!sd ? <p className="muted pv3o-pad">載入中…</p> : (
                  <>
                    <div className="pv3o-kpis">
                      {sd.kpis.map((k) => (
                        <div key={k.label} className={`pv3o-kpi ${k.tone || ''}`}>
                          <span className="pv3o-kpi-label">{k.label}</span>
                          <span className="pv3o-kpi-num">{k.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pv3o-links">
                      {sd.links.map((l) => (
                        <button key={l.label} {...closedProps(s.id)} className={isSystemOpen(s.id) ? '' : 'is-closed'} onClick={() => openIn(s.id, l)}>{l.label}<Icon name="launch" size={14} /></button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>

        {/* 最新公告（11/12 加入，同版1） */}
        {can('home-news') && <PortalNews inline />}
      </main>
      <footer className="portal-foot">© {APP_CONFIG.companyName}・{APP_CONFIG.version}</footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 版5：臺灣特色車站（11/16 使用者：套用版3 的列車概念，改為精選臺灣特色車站，以 Blender 風格呈現）
//   插圖：以 Blender（Cycles）建立的低多邊形立體模型場景，產生腳本在 scripts/blender/（stations.py、lib.py）
//   乘車證、號誌燈、我待審筆數、最新公告都與版3 相同
// ═════════════════════════════════════════════════════════════
export const STATIONS = [
  { id: 'taipei', name: '臺北車站', en: 'Taipei', image: stTaipei,
    slogan: '交通樞紐，從這裡出發', note: '中式屋頂與方正量體，串連臺鐵、高鐵與捷運的城市門戶。', c1: '#2E6E9E', c2: '#9FD0EE' },
  { id: 'keelung', name: '基隆車站', en: 'Keelung', image: stKeelung,
    slogan: '港都的北方起點', note: '緊鄰基隆港的站房，看貨櫃輪進出，縱貫線由此向南出發。', c1: '#2D6C93', c2: '#9CCBE8' },
  { id: 'hsinchu', name: '新竹車站', en: 'Hsinchu', image: stHsinchu,
    slogan: '百年巴洛克站房', note: '1913 年落成，灰白石造立面與中央鐘塔，是新竹的城市地標。', c1: '#3E6A86', c2: '#A9CBE6' },
  { id: 'taichung', name: '臺中車站', en: 'Taichung', image: stTaichung,
    slogan: '紅磚鐘塔，見證城市百年', note: '1917 年落成的紅磚站房，白色飾帶與尖塔，與新站相伴而立。', c1: '#A4532F', c2: '#F2C9A0' },
  { id: 'changhua', name: '彰化車站', en: 'Changhua', image: stChanghua,
    slogan: '扇形車庫的鐵道風景', note: '車站旁的扇形車庫與轉車台，是全臺唯一仍在使用的扇形車庫。', c1: '#A0672A', c2: '#EFD7AE' },
  { id: 'kaohsiung', name: '高雄車站', en: 'Kaohsiung', image: stKaohsiung,
    slogan: '帝冠式站房的港都記憶', note: '1941 年落成，日式屋頂結合西式量體，椰影間的南國風情。', c1: '#1F7A86', c2: '#8FD6E3' },
  { id: 'hualien', name: '花蓮車站', en: 'Hualien', image: stHualien,
    slogan: '山海之間的白色山稜', note: '起伏的白色屋頂呼應中央山脈稜線，迎接每一位東部旅人。', c1: '#2B7A80', c2: '#9DD5E0' },
  { id: 'jiji', name: '集集車站', en: 'Jiji', image: stJiji,
    slogan: '木造小站的悠閒時光', note: '檜木建造的日式小站，是集集支線上最具代表性的風景。', c1: '#4E7F3E', c2: '#BFE3B5' },
];
export function PortalStations(props) {
  return (
    <PortalTrains {...props} slides={STATIONS} current="portal-v3" kicker="臺灣特色車站" dotsLabel="特色車站"
      credit="" className="pv5" paper="classic" />
  );
}

// 版5 乘車證（11/16 使用者）：早期臺鐵紙本硬卡車票，直式
//   11/16 使用者：版6 移除「會計系統通用」「系統入口 站 至」「站」「限發售當日有效」、票號與日期，只留臺灣鐵路、系統名稱、我待審、狀態
//   11/16 再調整：背景改用早期車票的防偽底紋（臺灣島＋路徽圓圈交錯、細箭頭），版面參考「○○站 至 ○○站／限發售當日有效／票價」
//   11/19 使用者：底紋統一改為藍色（原依系統著色金、藍、灰；系統名稱字色仍依系統）
//   舊說明：底紋依系統著色（金、藍、灰），圖檔 src/assets/ticket-pattern-*.png（產生方式見 scripts/make_ticket_pattern.py）
const PAPER_OF = {
  budget: { pattern: patAudit, ink: '#6B4A1F' },
  audit: { pattern: patAudit, ink: '#123E6E' },
  bi: { pattern: patAudit, ink: '#3A3D41' },
};
const PAPER_SEQ = [PAPER_OF.budget, PAPER_OF.audit, PAPER_OF.bi];
function rocDate(d = new Date()) {
  return `${d.getFullYear() - 1911}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function PaperTickets({ items, pending }) {
  const date = rocDate();
  return (
    <div className="pt-row pt-pattern">
      {items.map((s, i) => {
        const c = PAPER_OF[s.id] || PAPER_SEQ[i % 3];
        const st = STATION_OF[s.id] || 'soon';
        const pd = pending?.[s.id];
        return (
          <span key={s.id} className="pt-wrap"><button type="button" className={`pt-card punched ${isSystemOpen(s.id) ? '' : 'is-closed'}`} {...closedProps(s.id)} style={{ '--ink': c.ink, backgroundImage: `url(${c.pattern})` }} onClick={() => switchSystem(s.id)} aria-label={`進入${s.name}（新視窗）`}>
            <span className="pt-hole" aria-hidden="true" />
            <span className="pt-head">臺灣鐵路</span>
            <span className="pt-to">{s.name}</span>
            {pd ? (
              <span className={`pt-fare ${pd.count ? '' : 'zero'}`}>{pd.label}<b>{pd.count}</b>件</span>
            ) : <span className="pt-fare none">歡迎搭乘</span>}
            <span className="pt-grid">
              <span className={`ticket-light ${st}`}><i aria-hidden="true" />{STATION_LABEL[st]}</span>
              <span>第 {i + 1} 月台</span>
            </span>
          </button></span>
        );
      })}
    </div>
  );
}

// 版6（11/16 使用者：把早期車票底紋的版本另存成版6；版5 維持原設計）
const ART = { keelung: art_keelung, taipei: art_taipei, hsinchu: art_hsinchu, taichung: art_taichung, changhua: art_changhua, kaohsiung: art_kaohsiung, hualien: art_hualien };
// 各插圖的紙色（插圖未蓋滿時，主視覺底色接續紙色，避免出現接縫）
const FULL = { keelung: full_keelung, taipei: full_taipei, hsinchu: full_hsinchu, taichung: full_taichung, changhua: full_changhua, kaohsiung: full_kaohsiung, hualien: full_hualien };
const ART_PAPER = { keelung: '#FBF8F1', taipei: '#F9F9F4', hsinchu: '#F8F7F3', taichung: '#FBFCF7', changhua: '#F9F6ED', kaohsiung: '#F9F4E6', hualien: '#CAE2EB' };
const ART_TEXT = {
  keelung: { slogan: '紅磚鐘塔與港都門戶', note: '紅磚牆面、灰藍色斜頂與中央鐘樓，是縱貫線的北方起點。' },
  kaohsiung: { slogan: '帝冠式站房的港都記憶', note: '日式屋頂結合西式量體，綠瓦白牆的帝冠式站房。' },
  hualien: { slogan: '山海之間的木構雨庇', note: '編織般的木構雨庇與白色立面，背倚中央山脈迎接東部旅人。' },
  changhua: { slogan: '和洋折衷的木造站房', note: '厚重的三段式屋頂與雕花唐破風門廊，展現早期站房的工藝。' },
  taichung: { slogan: '紅磚鐘塔，見證城市百年', note: '紅磚與白色飾帶的站房，中央鐘塔是臺中的城市記憶。' },
};
// 北 → 中 → 南 → 東
const STATIONS_PENCIL = ['keelung', 'taipei', 'hsinchu', 'taichung', 'changhua', 'kaohsiung', 'hualien'].map((id) => {
  const st = STATIONS.find((x) => x.id === id);
  return { ...st, ...(ART_TEXT[id] || {}), image: FULL[id] || ART[id], c2: ART_PAPER[id] || '#F9F7F1' };
});
export function PortalStationsTicket(props) {
  return (
    <PortalTrains {...props} slides={STATIONS_PENCIL} current="portal-v6" kicker="臺灣特色車站" dotsLabel="特色車站"
      credit="" className="pv5 pv6 pv6full" paper="pattern" hoverPause={false} interval={2000} />
    // 11/19 使用者：版6 換圖秒數要和版3 一樣（每 4 秒）。版6 背景鋪滿整頁，滑鼠幾乎一直在圖上，原本「滑鼠移入暫停」會讓它停住，所以版6 不暫停
  );
}

// 版5 原設計（11/16 使用者：版5 不需要剪票設計，整張車票點擊即開啟模組）：淡色厚紙、頂端系統色帶、紅框我待審、右側剪票缺口
//   11/16 使用者：移除贅字（自 系統入口 ▼ 至、系統說明、當日有效、票號、日期），只留系統名稱、狀態、我待審
const CLASSIC_OF = {
  budget: { paper: '#F4E7C3', ink: '#6B4A1F', band: '#CA8C51' },
  audit: { paper: '#DCE9F3', ink: '#123E6E', band: '#004DA1' },
  bi: { paper: '#E6E6E1', ink: '#3A3D41', band: '#50555B' },
};
const CLASSIC_SEQ = [CLASSIC_OF.budget, CLASSIC_OF.audit, CLASSIC_OF.bi];
function ClassicTickets({ items, pending }) {
  const date = rocDate();
  return (
    <div className="pt-row">
      {items.map((s, i) => {
        const c = CLASSIC_OF[s.id] || CLASSIC_SEQ[i % 3];
        const st = STATION_OF[s.id] || 'soon';
        const pd = pending?.[s.id];
        return (
          <span key={s.id} className="pt-wrap"><button type="button" className={`pt-card pt-nopunch ${isSystemOpen(s.id) ? '' : 'is-closed'}`} {...closedProps(s.id)} style={{ '--paper': c.paper, '--ink': c.ink, '--band': c.band }} onClick={() => switchSystem(s.id)} aria-label={`進入${s.name}（新視窗）`}>
            <span className="pt-head"><b>臺灣鐵路</b><small>乘車證</small></span>
            <span className="pt-to">{s.name}</span>
            <span className="pt-grid">
              <span><small>狀態</small>
                <span className={`ticket-light ${st}`}><i aria-hidden="true" />{STATION_LABEL[st]}</span>
              </span>
              <span><small>月台</small>第 {i + 1} 月台</span>
            </span>
            {pd ? (
              <span className={`pt-fare ${pd.count ? '' : 'zero'}`}><small>{pd.label}</small><b>{pd.count}</b><small>件</small></span>
            ) : null}
          </button></span>
        );
      })}
    </div>
  );
}

// 11/16 使用者：版6 移除「登車」字樣，車票直接呈現已剪票（右側三角缺口）；版5 無剪票。以下 usePunch／PunchMark 目前未使用
// 11/16 使用者：車票右側的三角形剪票口（文字「登車」）；點擊＝剪票（視同驗票），車票右側真的被剪掉一個三角缺口，點擊車票＝剪票（視同驗票），剪出三角缺口後開啟模組
function usePunch() {
  const [punch, setPunch] = useState('');
  const onPunch = (id) => {
    if (punch) return;
    setPunch(id);
    setTimeout(() => switchSystem(id), 520);
    setTimeout(() => setPunch(''), 1400);
  };
  return [punch, onPunch];
}
function PunchMark() {
  return (
    <span className="pt-punch" aria-hidden="true">
      <em className="pt-punch-label">登車</em>
      <em className="pt-punch-done">已驗票</em>
      <svg className="pt-tri" viewBox="0 0 18 24" width="18" height="24">
        <polygon className="pt-tri-guide" points="17.5,1 17.5,23 1.5,12" />
      </svg>
    </span>
  );
}
