// ─────────────────────────────────────────────────────────────
// 個人偏好：我的最愛、最近打開
// Prototype 存在瀏覽器（localStorage，依使用者區分）
// TODO 正式環境：改呼叫後端 API 儲存，才能跨電腦、跨瀏覽器同步
// ─────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { local } from './services/storage.js';
import { toast } from './components/Notification.jsx';
import { getNode, isFavoritable, recentTargetFor } from './config/navigation.js';

const RECENT_MAX = 10;

const PrefsContext = createContext(null);
export const usePrefs = () => useContext(PrefsContext);

export function PrefsProvider({ user, children }) {
  const key = `aa.prefs.${user.id}`;
  const [prefs, setPrefs] = useState(() => local.get(key, { favorites: [], recent: [] }));

  useEffect(() => { local.set(key, prefs); }, [key, prefs]);

  const toggleFavorite = useCallback((id, opts = {}) => {
    const had = local.get(key, { favorites: [] }).favorites?.includes(id);
    setPrefs((p) => ({
      ...p,
      favorites: p.favorites.includes(id) ? p.favorites.filter((x) => x !== id) : [...p.favorites, id],
    }));
    const label = getNode(id)?.label || '';
    if (opts.silent) return;
    toast(had
      ? { kind: 'info', icon: 'star', title: '已從我的最愛移除', subtitle: label }
      : { kind: 'success', icon: 'star', title: '已加入我的最愛', subtitle: label });
  }, [key]);

  // 記錄開啟：傳入任一節點 id，會換算成它所屬的上層功能
  const recordVisit = useCallback((id) => {
    const target = recentTargetFor(id);
    if (!target) return;
    setPrefs((p) => ({
      ...p,
      recent: [{ id: target.id, at: Date.now() }, ...p.recent.filter((r) => r.id !== target.id)].slice(0, RECENT_MAX),
    }));
  }, []);

  const clearRecent = useCallback(() => {
    setPrefs((p) => ({ ...p, recent: [] }));
    toast({ kind: 'info', title: '已清除最近打開紀錄' });
  }, []);

  const value = useMemo(() => ({
    favorites: prefs.favorites.map(getNode).filter(isFavoritable),
    recent: prefs.recent.map((r) => ({ node: getNode(r.id), at: r.at })).filter((r) => r.node),
    isFavorite: (id) => prefs.favorites.includes(id),
    toggleFavorite,
    recordVisit,
    clearRecent,
  }), [prefs, toggleFavorite, recordVisit, clearRecent]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

// 「5 分鐘前」「今天 14:05」「11/08」
export function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  const d = new Date(ts);
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
