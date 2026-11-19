// ─────────────────────────────────────────────────────────────
// TM1 REST API 用戶端（正式部署時使用）
// 文件：IBM Planning Analytics → TM1 REST API（OData v4）
// ─────────────────────────────────────────────────────────────
import { APP_CONFIG } from '../config/appConfig.js';

const base = () => APP_CONFIG.tm1.baseUrl;

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(base() + path, {
    method,
    credentials: 'include', // 沿用 PAW／SSO 登入後的 session cookie
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`TM1 ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const tm1 = {
  // 以 MDX 查詢資料
  executeMDX(mdx) {
    return request(
      '/ExecuteMDX?$expand=Axes($expand=Tuples($expand=Members($select=Name,Caption))),Cells($select=Ordinal,Value,FormattedValue,Updateable)',
      { method: 'POST', body: { MDX: mdx } },
    );
  },

  // 寫回單一儲存格：cube 名稱 + 依維度順序的元素名稱
  writeCell(cube, elements, value) {
    return request(`/Cubes('${encodeURIComponent(cube)}')/tm1.Update`, {
      method: 'POST',
      body: {
        Cells: [{ 'Tuple@odata.bind': elements.map(([dim, el]) =>
          `Dimensions('${dim}')/Hierarchies('${dim}')/Elements('${el}')`) }],
        Value: String(value),
      },
    });
  },

  // 執行 TI 流程（例如提交、核准、退回）
  executeProcess(name, params = {}) {
    return request(`/Processes('${encodeURIComponent(name)}')/tm1.ExecuteWithReturn`, {
      method: 'POST',
      body: { Parameters: Object.entries(params).map(([Name, Value]) => ({ Name, Value })) },
    });
  },
};
