import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// 1109-B：IBM Plex Sans（Carbon 字體），隨網頁一起部署，不依賴外部網路
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
