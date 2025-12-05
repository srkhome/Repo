# LINE 評價影片 Bot 專案

這是一個可以直接丟到 Vercel 的範例專案：

- 使用 LINE 官方帳號當作前端
- 使用 Vercel 作為後端 Webhook
- 使用 OpenAI：
  - Chat Completions：產生「影片評價＋重寫腳本」
  - Audio Transcription（Whisper）：將影片中的語音轉成文字（逐字稿）

目前已實作兩種情境：

1. 使用者貼上 **影片網址（文字訊息）**
   - Bot 會根據網址與一般行銷影片的常見情境
   - 回覆「評分、優點、可優化處」＋「60 秒故事行銷腳本（反差開場）」

2. 使用者 **直接上傳影片檔**
   - Bot 會：
     - 向 LINE API 下載影片檔
     - 丟給 OpenAI Whisper 做語音轉文字
     - 再把逐字稿丟給 GPT 產出「評價＋重寫腳本」

> 提醒：實際使用時，請注意 OpenAI API 費用與用量控管。

---

## 一、部署步驟（快速版）

1. **Fork / 下載這個專案到你的 GitHub**

2. 到 [Vercel](https://vercel.com/)：
   - Import Project → 選你的 GitHub repo
   - 設定環境變數（Environment Variables）：

     - `LINE_CHANNEL_ACCESS_TOKEN`  
       從 LINE Developers 後台複製 Messaging API 的「Channel access token (long-lived)」

     - `LINE_CHANNEL_SECRET`  
       從 LINE Developers 後台複製「Channel secret」（目前程式裡未驗證簽章，但建議先設定好，之後要加驗證比較方便）

     - `OPENAI_API_KEY`  
       從 OpenAI 平台建立的 API Key

3. 完成部署後，Vercel 會給你一個網址，例如：

   ```
   https://你的專案名稱.vercel.app
   ```

4. 到 LINE Developers → 你的 Channel → Messaging API：
   - 把 **Webhook URL** 設為：

     ```
     https://你的專案名稱.vercel.app/api/line-webhook
     ```

   - 打開「Use webhook」

5. 用 LINE 官方帳號自己傳訊息測試：
   - 貼一個 YouTube 連結 → Bot 會回傳「可能的評論＋重寫腳本」
   - 上傳一個短影片 → Bot 會進行語音轉文字＋產生新腳本（影片不要太長以免超時）

---

## 二、檔案說明

- `package.json`  
  - 定義 Node.js 專案與所需的套件（axios, form-data）

- `vercel.json`  
  - 指定使用 `nodejs18.x` 來執行 `api/line-webhook.js`

- `api/line-webhook.js`  
  - 核心 Webhook 邏輯：
    - 接收 LINE 的事件
    - 分流處理「文字訊息」與「影片訊息」
    - 呼叫 OpenAI API 產生回覆

---

## 三、注意事項

1. **影片轉文字（Whisper）**
   - 目前是使用 OpenAI 的 `whisper-1` 模型
   - 這段程式會將從 LINE 下載的影片 buffer，透過 `form-data` 送到 `/v1/audio/transcriptions`

2. **OpenAI 模型**
   - Chat 使用 `gpt-4.1-mini`（可視你的帳號實際可用模型調整）
   - 如果你有更新的模型，也可以在程式中自行替換

3. **錯誤處理**
   - 範例程式有基本的 try/catch 與 console.error
   - 正式上線建議再增加：
     - log 系統
     - 簽章驗證（確認是 LINE 傳來的請求）

---

## 四、開發小提醒

- 如果你想本機測試，可以用：
  - `ngrok` 之類的工具 expose 本機 port
  - 或是直接在 Vercel 上測試，改程式 → push GitHub → 自動重新部署

- 如果你要再加上其他功能（例如：會議記錄、摘要、腳本多版本），可以在 `askGPT` 的 prompt 再擴充。

祝你玩得開心，如果要改成 TypeScript 版，我也可以幫你整理一套！