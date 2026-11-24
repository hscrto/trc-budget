// 11/19 使用者：首頁右下角新增 live chatbot，以臺鐵形象的虛擬人物「阿鐵」作為 AI 回覆的模擬對話視窗
//   Prototype：回覆由關鍵字規則模擬（讀取登入者的待辦、公告、預算編列分類等示意資料），不連外部 AI
//   正式環境：把 reply() 換成後端 AI 服務（帶入登入者身分與權限），畫面元件不用改
import { useEffect, useMemo, useRef, useState } from 'react';
import { dataService } from '../services/dataService.js';
import { publicList } from '../services/announcementStore.js';
import { getGroups, shortName } from '../config/budgetGroups.js';
import { orgLevel } from '../config/org.js';

const FILL_DEADLINE = '2026/11/20 17:00';
const BF = { income: 'bf-income', expense: 'bf-expense', overseas: 'bf-overseas', ict: 'bf-ict', capex: 'bf-capex' };
const CHIPS = ['我的待辦', '填表期限', '怎麼提交明細表', '最新公告', '各類預算編列'];

// 阿鐵（原創角色）：戴臺鐵藍站務帽、金色帽帶的年輕站務員，圓臉、笑眼、紅臉頰
export function AtieAvatar({ size = 40, wave = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="阿鐵" className={`atie-av ${wave ? 'wave' : ''}`}>
      <circle cx="32" cy="32" r="32" fill="#e8f1fa" />
      {/* 制服 */}
      <path d="M12 64c1-11 9-17 20-17s19 6 20 17z" fill="#00529C" />
      <path d="M26 47l6 7 6-7" fill="#fff" />
      <path d="M30.5 52.5h3l1 6h-5z" fill="#CA8C51" />
      {/* 臉 */}
      <ellipse cx="32" cy="33" rx="15" ry="14.5" fill="#FFE2C6" />
      <ellipse cx="17.5" cy="34" rx="2.6" ry="3.4" fill="#FFD3AE" />
      <ellipse cx="46.5" cy="34" rx="2.6" ry="3.4" fill="#FFD3AE" />
      {/* 瀏海 */}
      <path d="M17.5 30c1-7 7-10 14.5-10s13.5 3 14.5 10c-4-2-8-3-14.5-3s-10.5 1-14.5 3z" fill="#2B2B33" />
      {/* 站務帽 */}
      <path d="M14 22c2-8 10-12 18-12s16 4 18 12z" fill="#00529C" />
      <rect x="13" y="21" width="38" height="5" rx="2.5" fill="#CA8C51" />
      <path d="M15 26h34c-3 3-9 4-17 4s-14-1-17-4z" fill="#1A2D65" />
      <circle cx="32" cy="16.5" r="3.6" fill="#fff" />
      <path d="M29.6 16.5h4.8M32 14.2v4.6" stroke="#00529C" strokeWidth="1.3" strokeLinecap="round" />
      {/* 眼睛、嘴巴、臉頰 */}
      <path d="M24.5 35.5q2.5-3 5 0M34.5 35.5q2.5-3 5 0" stroke="#2B2B33" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="23" cy="40" rx="2.6" ry="1.6" fill="#FF9F9F" opacity=".7" />
      <ellipse cx="41" cy="40" rx="2.6" ry="1.6" fill="#FF9F9F" opacity=".7" />
      <path d="M28.5 41.5q3.5 3.5 7 0" stroke="#C0504D" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const now = () => new Date().toTimeString().slice(0, 5);
const has = (q, ...words) => words.some((w) => q.includes(w));

async function reply(text, user) {
  const q = text.replace(/\s+/g, '').toLowerCase();
  const lv = orgLevel(user.dept);
  const groups = getGroups();
  const links = (arr) => arr.map(([label, href]) => ({ label, href }));

  if (has(q, '你好', '嗨', 'hi', 'hello', '哈囉', '早安', '午安')) {
    return { text: `${user.name}您好！我是阿鐵🚆 可以幫您查待辦、填表期限、公告，或說明提交與核准的步驟。想問什麼呢？` };
  }
  if (has(q, '你是誰', '阿鐵', '介紹')) {
    return { text: '我是阿鐵，臺鐵會計系統的預算小幫手！目前是模擬版本，回覆內容依系統示意資料產生，正式上線後會再接上 AI 服務。' };
  }
  if (has(q, '謝謝', '感謝', '3q', 'thx')) return { text: '不客氣！有需要隨時叫我，阿鐵一直都在月台等您 😊' };

  if (has(q, '待辦', '待審', '要審', '我的工作', '要做')) {
    const rv = await dataService.getMyReviewItems(user);
    const list = [...(rv.items || []), ...(rv.mine ? [rv.mine] : [])];
    const todo = list.filter((r) => r.status === '我待審');
    const done = list.filter((r) => r.status === '已完成');
    if (!list.length) {
      return { text: lv === '室' || /_\d+$/.test(user.id || '') ? '您的工作是填表，填表不需要審核，所以「我的待辦」不會有項目。期限到系統會自動鎖定，不需要按提交喔！' : '目前沒有任何待辦。' };
    }
    return {
      text: `目前「我待審」有 ${todo.length} 筆、「已完成」${done.length} 筆。${todo.length ? '最需要處理的是：' : '都處理完了，辛苦了！'}`,
      links: todo.slice(0, 3).map((r) => ({ label: `${r.title}${r.phase ? `（${r.phase}）` : ''}`, href: `#rd:${encodeURIComponent(r.id)}` }))
        .concat([{ label: '查看全部待辦', href: '#review-plan' }]),
    };
  }
  if (has(q, '期限', '截止', '鎖定', '什麼時候', '到期')) {
    return { text: `各室填表期限是 ${FILL_DEADLINE}。時間一到系統會自動鎖定，不用按提交；之後由所屬段彙整成明細表，往上提交給處、會計處。`, links: links([['前往填表', `#${BF.income}`]]) };
  }
  if (has(q, '提交', '送出', '送審')) {
    return {
      text: '提交明細表的步驟：\n1. 從首頁「我的待辦」點明細表名稱。\n2. 左側選「提供給作業」，確認費用彙整與費用明細表。\n3. 按左下角「提交」。\n提交後狀態會變成「已完成・進行中」，下一關的群組會收到「我待審」。',
      links: links([['我的待辦', '#review-plan']]),
    };
  }
  if (has(q, '核准', '拒絕', '退回', '審核', '批准')) {
    return { text: '審核步驟：打開明細表 → 「核准作業」→ 左下角「核准 / 拒絕」，選擇核准群組、填寫註解後按「核准」或「拒絕」。拒絕會退回給提交者，對方的狀態會變成「我待審・已退回」。同一關的群組都核准後，才會送到下一關。' };
  }
  if (has(q, '群組', '簽核', 'group', '誰可以簽')) {
    return { text: '簽核用「群組」區分，群組就是組織代號（例如 EHY00）。群組裡的每個人（EHY00_01、EHY00_MGR…）都可以簽。每份明細表要經過哪些群組，是在「預算審查設定」裡設定的。' };
  }
  if (has(q, '公告', '消息', '通知')) {
    const list = publicList().slice(0, 3);
    return { text: list.length ? '最新公告：' : '目前沒有公告。', links: list.map((a) => ({ label: `${a.date}　${a.title}`, href: '#msg-news' })) };
  }
  const g = groups.find((x) => q.includes(shortName(x.name).replace(/\s/g, '')) || q.includes(x.name));
  if (g) {
    const href = `#${BF[g.id] || `bf-${g.id}`}`;
    return { text: `「${g.name}」共有 ${g.tables.length} 張表，點下面就能開始填寫。黃底是可以輸入的欄位，灰底會自動計算，記得按左上角儲存（Ctrl+S）。`, links: [{ label: `開啟${shortName(g.name)}`, href }] };
  }
  if (has(q, '預算編列', '填表', '怎麼填', '分類', '五大類', '表格')) {
    return { text: '預算編列分成這幾類，點一下就能進入填表：', links: groups.map((x) => ({ label: shortName(x.name), href: `#${BF[x.id] || `bf-${x.id}`}` })) };
  }
  if (has(q, '儲存', '工具列', '復原', '存檔', '匯出')) {
    return { text: '填表畫面上方是工具列：最左邊是儲存，旁邊有重新整理、分享、復原／取消復原、回復資料項目、全螢幕等。滑鼠移到按鈕上會顯示說明。快捷鍵：Ctrl+S 儲存、Ctrl+Z 復原、Ctrl+Y 取消復原。' };
  }
  if (has(q, '密碼', '登入', '登出', 'sso', '帳號')) {
    return { text: '系統使用單一登入，一次登入就能使用所有會計相關模組。閒置 30 分鐘會自動登出，剩 1 分鐘時會提醒您。帳號或權限問題請洽系統管理員。' };
  }
  return {
    text: '這題阿鐵還在學習中😅 您可以試著問我：我的待辦、填表期限、怎麼提交明細表、最新公告，或某一類預算編列（例如「一般收入」）。',
    chips: CHIPS,
  };
}

const KEY = (u) => `aa.atie.chat.${u.id}`;
function loadChat(user) {
  try { const v = JSON.parse(sessionStorage.getItem(KEY(user)) || 'null'); if (Array.isArray(v)) return v; } catch { /* ignore */ }
  return null;
}

export default function AtieChat({ user }) {
  const greet = useMemo(() => ([{ from: 'bot', at: now(), text: `嗨，${user.name}！我是阿鐵🚆 您的預算小幫手。想查什麼都可以問我，或點下面的快速問題。`, chips: CHIPS }]), [user.name]);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(() => loadChat(user) || greet);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [hint, setHint] = useState(() => !loadChat(user));
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { try { sessionStorage.setItem(KEY(user), JSON.stringify(msgs)); } catch { /* ignore */ } }, [msgs, user]);
  useEffect(() => { if (!hint) return undefined; const t = setTimeout(() => setHint(false), 8000); return () => clearTimeout(t); }, [hint]);
  useEffect(() => { if (open) { setHint(false); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing, open]);

  const send = async (text) => {
    const t = text.trim();
    if (!t || typing) return;
    setInput('');
    setMsgs((m) => [...m, { from: 'me', at: now(), text: t }]);
    setTyping(true);
    const started = Date.now();
    let r;
    try { r = await reply(t, user); } catch { r = { text: '抱歉，阿鐵剛剛沒聽清楚，請再問一次。' }; }
    const wait = Math.max(0, 700 + Math.min(900, r.text.length * 12) - (Date.now() - started));
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { from: 'bot', at: now(), ...r }]); }, wait);
  };
  const clear = () => setMsgs(greet.map((g) => ({ ...g, at: now() })));

  return (
    <div className={`atie ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="atie-panel" role="dialog" aria-label="阿鐵 智能小幫手">
          <header className="atie-head">
            <AtieAvatar size={40} />
            <div className="atie-who">
              <b>阿鐵 <small>預算小幫手</small></b>
              <span><i className="atie-dot" />線上・AI 模擬回覆</span>
            </div>
            <button type="button" className="atie-hbtn" onClick={clear} title="重新開始對話" aria-label="重新開始對話">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="atie-hbtn" onClick={() => setOpen(false)} title="收合" aria-label="收合">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </header>
          <div className="atie-list" ref={listRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`atie-msg ${m.from}`}>
                {m.from === 'bot' && <AtieAvatar size={28} />}
                <div className="atie-bubble-wrap">
                  <div className="atie-bubble">
                    {m.text.split('\n').map((l, j) => <p key={j}>{l}</p>)}
                    {m.links?.length > 0 && (
                      <ul className="atie-links">
                        {m.links.map((l) => <li key={l.label + l.href}><a href={l.href} onClick={() => setOpen(false)}>{l.label} ›</a></li>)}
                      </ul>
                    )}
                  </div>
                  <time>{m.at}</time>
                  {m.chips && i === msgs.length - 1 && !typing && (
                    <div className="atie-chips">{m.chips.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}</div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="atie-msg bot"><AtieAvatar size={28} /><div className="atie-bubble atie-typing" aria-label="阿鐵輸入中"><i /><i /><i /></div></div>
            )}
          </div>
          <form className="atie-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="輸入問題，例如：我的待辦" maxLength={200} aria-label="輸入問題" />
            <button type="submit" disabled={!input.trim() || typing} aria-label="送出">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2.5 9L15.5 3l-4 12.5-2.5-5.2z" fill="currentColor" /></svg>
            </button>
          </form>
          <p className="atie-foot">阿鐵目前為模擬回覆，內容僅供參考</p>
        </section>
      )}
      {hint && !open && (
        <button type="button" className="atie-hint" onClick={() => setOpen(true)}>嗨！我是阿鐵，有問題可以問我 👋</button>
      )}
      <button type="button" className="atie-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? '收合阿鐵' : '開啟阿鐵 智能小幫手'} aria-expanded={open}>
        <AtieAvatar size={52} wave={!open} />
        {!open && <span className="atie-fab-label">問阿鐵</span>}
      </button>
    </div>
  );
}
