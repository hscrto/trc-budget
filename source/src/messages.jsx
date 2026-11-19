import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dataService } from './services/dataService.js';
import { local } from './services/storage.js';

// ─────────────────────────────────────────────────────────────
// 通知：清單與已讀狀態（頂列鈴鐺的未讀數、訊息中心「通知」頁籤共用）
// Prototype 已讀狀態存在瀏覽器；正式環境需後端儲存
// ─────────────────────────────────────────────────────────────
const MessagesContext = createContext({ notifications: null, unread: 0, isRead: () => true, markRead: () => {}, markAllRead: () => {} });
export const useMessages = () => useContext(MessagesContext);

export function MessagesProvider({ user, children }) {
  const key = `aa.read.${user.id}`;
  const [list, setList] = useState(null);
  const [readIds, setReadIds] = useState(() => new Set(local.get(key, ['n4', 'n6', 'n7'])));

  useEffect(() => { dataService.getNotifications().then(setList).catch(() => setList([])); }, []);
  useEffect(() => { local.set(key, [...readIds]); }, [key, readIds]);

  const markRead = useCallback((id) => setReadIds((s) => (s.has(id) ? s : new Set([...s, id]))), []);
  const markUnread = useCallback((id) => setReadIds((s) => { const n = new Set(s); n.delete(id); return n; }), []);
  const markAllRead = useCallback(() => setReadIds((s) => new Set([...s, ...(list || []).map((n) => n.id)])), [list]);

  const value = useMemo(() => ({
    notifications: list,
    unread: (list || []).filter((n) => !readIds.has(n.id)).length,
    isRead: (id) => readIds.has(id),
    markRead, markUnread, markAllRead,
  }), [list, readIds, markRead, markUnread, markAllRead]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}
