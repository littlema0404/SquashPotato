# Supabase Authentication Providers 設定指南

本專案使用 **LINE Login** 作為身份驗證，透過 Supabase **Custom Provider**（`custom:line`）整合。本文說明 Supabase Dashboard、LINE Developers、Vercel 的完整設定步驟。

## 架構概覽

本專案有兩條登入路徑：

| 路徑 | 使用情境 | Session 類型 |
|------|----------|--------------|
| **瀏覽器 OAuth** | 一般瀏覽器點「LINE 登入」 | Supabase cookie |
| **LIFF** | LINE App 內開啟 | 自簽 `liff_session` JWT cookie |

兩條路徑最終都對應到 `profiles.line_user_id`（LINE 的 `U...` sub）。程式會自動處理帳號合併。

```
瀏覽器：App → Supabase OAuth (custom:line) → LINE 授權 → Supabase callback → /auth/callback?code=...
LIFF：  LINE App → liff.login() → POST /api/auth/liff → liff_session cookie
```

---

## 重要：必須使用 Manual configuration

**不要**選擇 **Auto-discovery (OIDC)**。

LINE 網頁登入的 ID Token 使用 **HS256**（Channel Secret 簽名），但 Supabase OIDC 模式僅支援透過 JWKS 驗證 **ES256**。使用 OIDC Auto-discovery 會導致登入失敗。

常見錯誤訊息：

```
#error=server_error&error_description=error+missing+provider+id
```

解法：改用 **Manual configuration**，並將 UserInfo URL 設為 OIDC 端點（見下方表格）。

參考：

- [LINE ID Token 簽章演算法說明](https://developers.line.biz/en/docs/line-login/verify-id-token/)
- [Supabase + LINE Login 實作筆記](https://zenn.dev/sasatech/articles/02b8fb72b45cdd?locale=en)

---

## 1. Supabase Custom Provider 設定

路徑：**Authentication → Providers → Custom Providers → New Provider**

### Configuration Method

選擇 **Manual configuration**（不要選 Auto-discovery OIDC）。

### Provider 欄位

| 欄位 | 值 | 說明 |
|------|-----|------|
| **Identifier** | `custom:line` | 程式碼使用 `provider: 'custom:line'`，必須一致 |
| **Client ID** | LINE Channel ID | 例如 `2010312125` |
| **Client Secret** | LINE Channel Secret | 僅設在 Supabase，不需放 Vercel |
| **Authorization URL** | `https://access.line.me/oauth2/v2.1/authorize` | |
| **Token URL** | `https://api.line.me/oauth2/v2.1/token` | |
| **UserInfo URL** | `https://api.line.me/oauth2/v2.1/userinfo` | **必須用此 URL**，不可用 `v2/profile` |
| **Issuer URL** | `https://access.line.me` | 若有此欄位則填寫 |
| **JWKS URI** | 留空 | Manual 模式不需要 |
| **Scopes** | `openid profile` | `openid` 必填，才能取得 `sub` |
| **Allow users without email** | **ON** | LINE 使用者不一定有 email |

### UserInfo URL 常見錯誤

| URL | 回傳欄位 | 結果 |
|-----|----------|------|
| `https://api.line.me/oauth2/v2.1/userinfo` | `sub` | ✅ 正確 |
| `https://api.line.me/v2/profile` | `userId`（無 `sub`） | ❌ `missing provider id` |

### Email 權限

本專案**不需要**使用者 email。請：

- Scopes **不要**包含 `email`
- **不要**在 LINE Developers 申請 Email address permission
- Supabase **Allow users without email** 保持開啟

程式碼 OAuth scope：

```typescript
scopes: 'profile openid',
```

### Callback URL（複製到 LINE Developers）

建立 Provider 後，Supabase 會顯示 Callback URL，格式為：

```
https://<project-ref>.supabase.co/auth/v1/callback
```

將此 URL 貼到 LINE Developers Console 的 **Callback URL**。

---

## 2. Supabase URL Configuration

路徑：**Authentication → URL Configuration**

| 欄位 | 值 |
|------|-----|
| **Site URL** | `https://<vercel-domain>`（例如 `https://jj-squash.vercel.app`） |
| **Redirect URLs** | `https://<vercel-domain>/auth/callback` |
| | `http://localhost:3000/auth/callback`（本機開發） |

---

## 3. LINE Developers 設定

路徑：[LINE Developers Console](https://developers.line.biz/console/)

### LINE Login Channel

| 設定項 | 值 |
|--------|-----|
| **Channel ID** | → Vercel `LINE_CHANNEL_ID`、Supabase Client ID |
| **Channel Secret** | → Supabase Client Secret |
| **Callback URL** | `https://<project-ref>.supabase.co/auth/v1/callback` |

### LIFF App（LINE App 內開啟用）

| 設定項 | 值 |
|--------|-----|
| **LIFF ID** | → Vercel `NEXT_PUBLIC_LIFF_ID` |
| **Endpoint URL** | `https://<vercel-domain>/` |
| **Scope** | 至少勾選 **openid** |

> LIFF Endpoint 必須是正式部署網域，本機無法直接測試 LIFF（需用 ngrok 等 tunnel）。

---

## 4. Vercel 環境變數

路徑：**Vercel Dashboard → Settings → Environment Variables**

| 變數 | 用途 | 必填 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開 anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Server 端管理操作（**不可暴露到 client**） | ✅ |
| `NEXT_PUBLIC_LIFF_ID` | LIFF App ID | ✅ |
| `LINE_CHANNEL_ID` | LINE Channel ID（LIFF idToken 驗證用） | ✅ |
| `AUTH_SECRET` | 簽署 `liff_session` JWT（≥ 32 字元） | ✅ |

不需放在 Vercel 的變數：

| 變數 | 說明 |
|------|------|
| `LINE_CHANNEL_SECRET` | 僅 Supabase Custom Provider 使用 |
| `NEXT_PUBLIC_APP_URL` | 程式碼未使用，可省略 |

產生 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

> `AUTH_SECRET` 只放在 Vercel / `.env.local`，**不要**設在 Supabase 或 LINE Developers。  
> Production 上修改會使所有 LIFF 使用者 session 失效，需重新登入。

---

## 5. 本機開發

在專案根目錄建立 `.env.local`（參考 `.env.example`）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_LIFF_ID=<liff-id>
LINE_CHANNEL_ID=<channel-id>
AUTH_SECRET=<至少-32-字元的隨機字串>
```

---

## 6. Callback URL 對照表

三層 URL 各自指向不同位置，請勿混淆：

```
LINE OAuth Callback
  → https://<project-ref>.supabase.co/auth/v1/callback
      （LINE Developers Console）

Supabase Redirect
  → https://<vercel-domain>/auth/callback
      （Supabase URL Configuration）

LIFF Endpoint
  → https://<vercel-domain>/
      （LINE Developers LIFF App）

App OAuth redirectTo（程式動態組成）
  → ${window.location.origin}/auth/callback
```

---

## 7. 驗證登入是否成功

### 瀏覽器 OAuth

1. 開啟 `https://<vercel-domain>/`
2. 點「LINE 登入」
3. 成功時導向：

```
https://<vercel-domain>/auth/callback?code=...
```

4. 新用戶 → `/pending`；已審核 → 首頁

### LIFF

1. 用 LINE Developers 的 QR code 在 LINE App 內開啟
2. 自動 `liff.login()` → `POST /api/auth/liff`
3. 設定 `liff_session` cookie → reload 或跳轉審核頁

---

## 8. 疑難排解

### `missing provider id`

| 可能原因 | 解法 |
|----------|------|
| 使用 OIDC Auto-discovery | 改為 Manual configuration |
| UserInfo URL 填 `v2/profile` | 改為 `oauth2/v2.1/userinfo` |
| Scopes 缺少 `openid` | 加上 `openid` |
| Provider identifier 不對 | 確認為 `custom:line` |

### `redirect_uri mismatch`

LINE Callback URL 未設為 Supabase `/auth/v1/callback`。

### 回來後落在首頁 `#error=...`

Supabase 在 callback 階段失敗，尚未到達 App 的 `/auth/callback`。檢查 **Authentication → Logs** 與上述 Provider 設定。

### LIFF 相關

| 錯誤 | 解法 |
|------|------|
| `LIFF_ID not configured` | Vercel 設定 `NEXT_PUBLIC_LIFF_ID` 並 redeploy |
| `idToken` 為 null | LIFF Scope 勾選 `openid` |
| LINE token verification failed | `LINE_CHANNEL_ID` 與 LIFF 所屬 channel 不一致 |

---

## 9. 程式碼參考

| 檔案 | 說明 |
|------|------|
| `src/components/LoginPage.tsx` | 瀏覽器 OAuth 登入（`custom:line`） |
| `src/app/auth/callback/route.ts` | OAuth code 換 session、帳號合併 |
| `src/components/LiffProvider.tsx` | LIFF 初始化 |
| `src/app/api/auth/liff/route.ts` | LIFF idToken 驗證、發 `liff_session` |
| `src/proxy.ts` | 雙 session 驗證與路由保護 |

### LINE sub 取得方式

1. `user.user_metadata?.sub`
2. `authUser.user.identities[i].id` where `provider === 'custom:line'`

> 不要使用 `user.app_metadata?.provider_id`，此欄位不可靠。

---

## 10. 設定檢查清單

- [ ] Supabase Provider 使用 **Manual configuration**
- [ ] Identifier 為 `custom:line`
- [ ] UserInfo URL = `https://api.line.me/oauth2/v2.1/userinfo`
- [ ] Scopes = `openid profile`
- [ ] Allow users without email = ON
- [ ] Supabase Site URL 與 Redirect URLs 正確
- [ ] LINE Callback URL = Supabase `/auth/v1/callback`
- [ ] LIFF Endpoint = Vercel 網域根路徑
- [ ] LIFF Scope 含 `openid`
- [ ] Vercel 環境變數已設定並 redeploy
- [ ] 瀏覽器 OAuth 登入成功
- [ ] LINE App 內 LIFF 登入成功
