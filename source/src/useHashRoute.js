import { useEffect, useState } from 'react';

// 以網址 #id 做路由：靜態主機、PAW 網頁元件（iframe）都能用，不需伺服器設定
const read = () => decodeURIComponent(window.location.hash.replace(/^#/, '')) || 'portal'; // 沒有指定頁面時進入模組入口

export function navigate(id) {
  if (read() === id) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = id;
}

export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
