
# LINE 影片行銷小助理（修正版 ZIP）

這個專案已修正你遇到的兩個問題：

1. 📱 手機上傳影片「只說收到，卻沒有評論」  
   - 現在：只要是 *影片訊息*（video），就會自動：
     - 下載影片 → Whisper 轉文字 → GPT 進階分析  
     - 回傳：影片定位＋專業評價＋故事行銷反差開場腳本

2. 🔗 貼上影片網址「只說收到網址，卻沒下文」  
   - 現在：如果是 *文字訊息裡有網址*，會：
     - 嘗試直接下載影片檔（僅支援可以直接下載 mp4/mov 的網址）
     - 若成功 → 同樣進入轉錄＋分析流程
     - 若網址是 YouTube / FB / IG 等無法直接抓檔：
       - Bot 會回覆說明：目前僅支援可直接下載影片檔的連結，請先下載成 mp4 再上傳

---

## 檔案結構

- `api/line-webhook.js`：LINE Webhook 主程式  
- `package.json`：專案設定（Node ESM + openai）  
- `vercel.json`：指定使用 nodejs18.x runtime  

---

## 部署步驟（Vercel）

1. 把整個資料夾壓成 zip，上傳到 Vercel 或推到 GitHub 再 Import
2. 在 Vercel 專案設定 Environment Variables：

   - `OPENAI_API_KEY`  
   - `LINE_CHANNEL_SECRET`  
   - `LINE_CHANNEL_ACCESS_TOKEN`

3. 重新 Deploy 後，取得網址：
   - `https://你的專案名稱.vercel.app/api/line-webhook`

4. 到 LINE Developers → Messaging API：
   - Webhook URL 填上面那個網址
   - 啟用 Use webhook 並按 Verify

---

## 使用方式

- ✅ 模式 A：直接上傳影片（建議 1 分鐘內）  
- ✅ 模式 B：貼上可 *直接下載 mp4/mov* 的影片網址  
- ❌ 若是 YouTube / FB / IG / TikTok 等一般頁面網址 → 會回傳說明，請先下載成影片檔再上傳。

部署後你就可以直接用官方帳號測試：  
- 上傳影片 → 會先收到「收到影片，我在分析」，稍後再收到完整評價＋腳本。  
- 貼上可下載影片的網址 → 會收到「收到網址，我在下載與分析」，成功就一樣回傳完整結果。  
