import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { APP_CONFIG, currentSystem, systemUrl } from '../config/appConfig.js';
import { toast } from './Notification.jsx';

// 開啟外部模組前的提示：告訴使用者要去哪裡、本系統會留在背景
export default function LaunchDialog() {
  const [node, setNode] = useState(null);
  const openBtn = useRef(null);

  useEffect(() => {
    const on = (e) => setNode(e.detail);
    window.addEventListener('aa:launch', on);
    return () => window.removeEventListener('aa:launch', on);
  }, []);

  useEffect(() => {
    if (!node) return;
    openBtn.current?.focus();
    const key = (e) => { if (e.key === 'Escape') setNode(null); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [node]);

  if (!node) return null;
  const { system, path, title } = node.launch;
  const sys = APP_CONFIG.systems[system] || { name: system };
  const url = systemUrl(system, path);

  return (
    <div className="dialog-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setNode(null); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="launch-title">
        <header className="dialog-head">
          <span className="dialog-icon"><Icon name={node.switchSystem ? 'swap' : 'launch'} size={20} /></span>
          <h2 id="launch-title">{node.switchSystem ? `切換至 ${sys.name}` : `開啟 ${sys.name}`}</h2>
          <button className="icon-btn" onClick={() => setNode(null)} aria-label="關閉">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="dialog-body">
          {node.switchSystem ? (
            <p>
              {sys.openIn === 'same'
                ? `將在同一個視窗切換到 ${sys.name}。`
                : `將在新視窗開啟 ${sys.name}，目前的畫面會保留在原視窗。`}
              登入狀態沿用 SSO，不需要重新登入。
            </p>
          ) : (
            <p>
              <b>{title || node.label}</b>
              {` 將在新視窗開啟。${currentSystem().name}會保留在背景，完成後切回這個視窗即可繼續。`}
            </p>
          )}
          <dl className="dialog-meta">
            <dt>目標系統</dt><dd>{sys.name}</dd>
            <dt>網址</dt><dd><code>{url}</code></dd>
          </dl>
          {APP_CONFIG.dataMode === 'mock' && (
            <p className="dialog-note">Prototype：網址為示意，正式網址於 appConfig.js 的 systems 設定。</p>
          )}
        </div>
        <footer className="dialog-foot">
          <button className="btn-secondary" onClick={() => setNode(null)}>取消</button>
          <a
            ref={openBtn}
            className="btn-primary"
            href={url}
            target={node.switchSystem && sys.openIn === 'same' ? '_self' : `aa-${system}`}
            rel="noreferrer"
            onClick={() => { setNode(null); toast({ kind: 'info', icon: 'launch', title: `已在新視窗開啟 ${sys.name}`, subtitle: title || node.label }); }}
          >
            <span>{node.switchSystem && sys.openIn === 'same' ? '切換' : '開啟'}</span> <Icon name={node.switchSystem && sys.openIn === 'same' ? 'swap' : 'launch'} size={16} />
          </a>
        </footer>
      </div>
    </div>
  );
}
