import { createContext, useContext } from 'react';

// { can(id), visible(node), grants, setGrants, user }
export const PermContext = createContext({
  can: () => true,
  visible: () => true,
  grants: {},
  setGrants: () => {},
  user: null,
});

export const usePerm = () => useContext(PermContext);

// 頁面內的按鈕或區塊：<Can feature="home-tasks">…</Can>
export function Can({ feature, children, fallback = null }) {
  const { can } = usePerm();
  return can(feature) ? children : fallback;
}
