# 臺鐵會計系統 Prototype 1109-C（Carbon）

分支：`ibm-trc-1119`（2026/11/19）

1109-C 是 1109-B 主版另存後，進一步套用 IBM Carbon 設計規範的版本（預算系統內頁）；Portal 與登入頁維持 B 版設計。

## 內容
| 路徑 | 說明 |
|---|---|
| `index.html` | 建置好的單一檔案版（所有圖片、字型、程式都內嵌）。GitHub Pages 選這個分支、根目錄即可直接上線。 |
| `source/` | 原始碼（React 18＋Vite 5）。 |

## 本機執行與重新建置
```
cd source
npm install
npm run dev            # 開發模式
npm run build          # 一般部署：產生 dist/（index.html＋assets/）
npm run build:preview  # 單一檔案：產生 dist-preview/index.html（＝根目錄的 index.html）
```
需要 Node.js 18 以上。

## 說明
- 純前端，使用網址 `#` 路由（例如 `#portal`、`#home`、`#bf-income`），伺服器不需要 rewrite；可放在子目錄。
- Prototype 資料存在使用者自己瀏覽器的 localStorage，不同電腦或瀏覽器之間不會同步。
- 登入為測試帳號模式（`src/config/appConfig.js` 的 `auth.mode = 'mock'`），測試帳號密碼皆為 1234（admin／admin），登入頁點「測試帳號」可展開清單。
