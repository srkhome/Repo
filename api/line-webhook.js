
  import crypto from "crypto";
  import OpenAI from "openai";

  // 初始化 OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Vercel Webhook 入口
  export default async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const signature = req.headers["x-line-signature"];
    const bodyString = JSON.stringify(req.body);

    // 驗證 LINE 簽章
    const hash = crypto
      .createHmac("SHA256", process.env.LINE_CHANNEL_SECRET)
      .update(bodyString)
      .digest("base64");

    if (signature !== hash) {
      res.status(403).send("Invalid signature");
      return;
    }

    const events = req.body.events || [];

    try {
      await Promise.all(events.map(handleEvent));
      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }

  // 處理每一個 LINE event
  async function handleEvent(event) {
    if (event.type !== "message") {
      return replyText(
        event.replyToken,
        "嗨，我是影片行銷小助理，目前只支援『影片檔』或『影片網址』，可以直接傳影片給我，或貼上影片連結。"
      );
    }

    const message = event.message;

    // 1) 處理「影片檔」訊息
    if (message.type === "video") {
      return handleVideoMessage(event);
    }

    // 2) 處理「文字＋網址」訊息
    if (message.type === "text") {
      const text = message.text?.trim() || "";

      const urlMatch = text.match(/https?:\/\/\S+/i);
      const hasUrl = !!urlMatch;

      if (!hasUrl) {
        return replyText(
          event.replyToken,
          "請上傳影片檔，或貼上影片網址（例如 YouTube 已另存為雲端 mp4）、Google Drive 直連影片等。
\n我會幫你做：\n1️⃣ 影片內容定位\n2️⃣ 專業優缺點評估\n3️⃣ 故事行銷＋反差開場腳本重寫。"
        );
      }

      const url = urlMatch[0];

      await replyText(
        event.replyToken,
        "收到影片網址，我來幫你嘗試下載並做專業評價與故事行銷腳本重寫，請稍候幾秒…"
      );

      try {
        const videoBuffer = await downloadVideoFromDirectUrl(url);

        if (!videoBuffer) {
          if (event.source?.userId) {
            await pushText(
              event.source.userId,
              "我有收到網址，但無法直接取得影片檔。\n\n目前僅支援『可直接下載 mp4/mov 檔案的網址』，像是：\n- 檔案伺服器上的影片直鏈\n- Google Drive / Dropbox 允許直接下載的分享連結\n\n若是 YouTube、FB、IG、TikTok 等頁面網址，請先下載成 mp4 再上傳給我，我才能幫你分析與重寫腳本。"
            );
          }
          return;
        }

        const file = new File([videoBuffer], "video-from-url.mp4", {
          type: "video/mp4"
        });

        const transcriptRes = await openai.audio.transcriptions.create({
          model: "gpt-4o-transcribe",
          file,
          language: "zh"
        });

        const transcript = transcriptRes.text?.trim() || "";

        if (!transcript) {
          if (event.source?.userId) {
            await pushText(
              event.source.userId,
              "我成功下載影片，但在語音轉文字時沒有抓到有效內容，可能是音量太小或只有背景音樂。\n\n建議：錄一段 30～90 秒、說話清楚、背景安靜的影片給我，我再幫你重寫行銷腳本。"
            );
          }
          return;
        }

        const analysis = await generateAdvancedReview(transcript);

        if (event.source?.userId) {
          await pushText(event.source.userId, analysis);
        }
      } catch (err) {
        console.error("Handle url video error:", err);
        if (event.source?.userId) {
          await pushText(
            event.source.userId,
            "處理影片網址時發生錯誤，可能是該平台不允許直接下載影片。\n\n建議：先把影片下載成 mp4，再直接從 LINE 上傳給我，我會一樣幫你做完整評估與腳本重寫。"
          );
        }
      }

      return;
    }

    // 其他訊息類型
    return replyText(
      event.replyToken,
      "目前只支援『影片檔』或『文字訊息內含影片網址』，請用其中一種方式傳影片給我喔。"
    );
  }

  // 處理影片檔訊息
  async function handleVideoMessage(event) {
    const messageId = event.message.id;

    await replyText(
      event.replyToken,
      "收到你的影片，我正在幫你轉文字與分析內容，稍後會把完整建議與故事行銷腳本傳給你 😊"
    );

    try {
      const videoBuffer = await downloadLineContent(messageId);

      const file = new File([videoBuffer], "line-video.mp4", {
        type: "video/mp4"
      });

      const transcriptRes = await openai.audio.transcriptions.create({
        model: "gpt-4o-transcribe",
        file,
        language: "zh"
      });

      const transcript = transcriptRes.text?.trim() || "";

      if (!transcript) {
        if (event.source?.userId) {
          await pushText(
            event.source.userId,
            "我收到影片了，但在語音轉文字時沒有抓到有效內容。\n可能是音量太小、噪音太多或是純音樂。\n\n你可以試著：\n• 說話靠近一點麥克風\n• 降低環境噪音\n• 再錄一段 30～90 秒的說明影片給我"
          );
        }
        return;
      }

      const analysis = await generateAdvancedReview(transcript);

      if (event.source?.userId) {
        await pushText(event.source.userId, analysis);
      }
    } catch (err) {
      console.error("Handle video message error:", err);
      if (event.source?.userId) {
        await pushText(
          event.source.userId,
          "處理影片時發生錯誤，可能是檔案太大或網路不穩。\n可以先試試 1 分鐘以內的影片，再傳一次給我 🙏"
        );
      }
    }
  }

  // 從 LINE 下載影片檔
  async function downloadLineContent(messageId) {
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `LINE content fetch failed: ${res.status} ${res.statusText} ${text}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // 嘗試直接下載影片（只適用於 mp4/mov 等「直連檔案」網址）
  async function downloadVideoFromDirectUrl(url) {
    try {
      const res = await fetch(url);

      if (!res.ok) {
        console.error("Direct video download failed:", res.status, res.statusText);
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      const isVideo = contentType.includes("video");

      if (!isVideo) {
        console.error("URL is not a video content-type:", contentType);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error("downloadVideoFromDirectUrl error:", err);
      return null;
    }
  }

  // 進階版影片分析與故事行銷腳本
  async function generateAdvancedReview(transcript) {
    const prompt = `
以下是一支影片的逐字稿，請你扮演「影片行銷總教練」，幫我做【專業評估＋故事行銷改寫】。

影片逐字稿如下：
---
${transcript}
---

請輸出【繁體中文】，格式固定為三個區塊：

一、🎬 影片快速定位（請精簡 3 行）
1. 影片類型：用一句話判斷（例如：商品開箱、房地產介紹、課程銷售、品牌故事、心得分享…）
2. 影片風格：用 1～2 個關鍵字描述（例如：生活感、專業感、輕鬆聊天、強銷廣告…）
3. 目標觀眾：用一句話描述最適合看的對象（例如：首次買房族、想學 AI 的小白、社區主委…）

二、✅ 專業評價與優化建議（3～5 點條列）
- 先說明目前這支影片「最值得保留的優點」
- 再指出「最影響成效的 2～3 個問題」（例如：開頭太慢、沒有明確 CTA、情緒不足…）
- 每一點都要給「具體可以怎麼改」的建議，而不是空泛的大原則

三、✍️ 故事行銷＋反差開場重寫腳本（約 180～220 字）
請幫我重寫一段【適合直式手機影片】的口說腳本，要求如下：
1. 第一句一定要是「強烈反差開場的對話」，像這種感覺（舉例）：
   - 「你可能以為這種影片只有大公司拍得出來，但其實一支手機就夠了。」
   - 「大家都說景氣不好，可是這間房子的看屋人數反而暴增。」
   - 「多數人錄完影片就放著不管，難怪流量會卡在原地。」
   （不要直接複製以上句子，請依照內容情境自己設計一個反差開場。）
2. 用【人物→情境→衝突→轉折→行動呼籲】的故事行銷結構寫。
3. 語氣自然、像跟朋友聊天，避免太官腔的廣告詞。
4. 最後一句要有明確 CTA（例如：「如果你也有這個困擾，可以留言給我，我用 AI 幫你一起調整。」），但不要太硬銷。
5. 全文控制在約 180～220 字，不要超過一則 LINE 文字訊息好讀的長度。

請務必依照上述三個區塊的標題與順序輸出，不要額外夾雜其他說明。
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是一位專業的影片行銷教練，熟悉短影音、銷售影片與故事行銷腳本，擅長用白話、具體、可執行的方式給建議。"
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    return text || "已完成分析，但沒有產出內容，請稍後再試一次。";
  }

  // LINE reply API
  async function replyText(replyToken, text) {
    const url = "https://api.line.me/v2/bot/message/reply";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }]
      })
    });

    if (!res.ok) {
      console.error("LINE reply error:", res.status, await res.text());
    }
  }

  // LINE push API
  async function pushText(toUserId, text) {
    const url = "https://api.line.me/v2/bot/message/push";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: toUserId,
        messages: [{ type: "text", text }]
      })
    });

    if (!res.ok) {
      console.error("LINE push error:", res.status, await res.text());
    }
  }
