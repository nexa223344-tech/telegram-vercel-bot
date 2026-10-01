// api/webhook.js

export default async function handler(req, res) {
  console.log("📩 Webhook received");

  // GET request test
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "Telegram webhook is running"
    });
  }

  try {
    const update = req.body;

    if (!update) {
      return res.status(200).json({ ok: true });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHANNEL_ID_1 = process.env.CHANNEL_ID_1;
    const CHANNEL_ID_2 = process.env.CHANNEL_ID_2;

    // Original message details
    const SOURCE_CHAT_ID = process.env.SOURCE_CHAT_ID;
    const SOURCE_MESSAGE_ID = process.env.SOURCE_MESSAGE_ID;

    // Check environment variables
    if (
      !BOT_TOKEN ||
      !CHANNEL_ID_1 ||
      !CHANNEL_ID_2 ||
      !SOURCE_CHAT_ID ||
      !SOURCE_MESSAGE_ID
    ) {
      console.error("❌ Missing environment variables");

      return res.status(200).json({
        ok: false,
        error: "Missing environment variables"
      });
    }

    // Telegram API helper
    async function telegram(method, data = {}) {
      const url =
        `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!result.ok) {
          console.error(
            `❌ Telegram API Error [${method}]:`,
            result.description
          );
        }

        return result;

      } catch (error) {
        console.error(
          `❌ Telegram Request Error [${method}]:`,
          error.message
        );

        return {
          ok: false,
          description: error.message
        };
      }
    }

    // Get Telegram message
    const message = update.message;

    if (!message || !message.chat) {
      return res.status(200).json({ ok: true });
    }

    // Only private chat
    if (message.chat.type !== "private") {
      return res.status(200).json({ ok: true });
    }

    const userId = message.from?.id;
    const chatId = message.chat.id;
    const text = message.text || "";

    if (!userId) {
      return res.status(200).json({ ok: true });
    }

    // Only /start
    if (!text.startsWith("/start")) {
      return res.status(200).json({ ok: true });
    }

    console.log(`🚀 /start received → ${userId}`);

    // ==================================================
    // CHECK CHANNEL 1
    // ==================================================

    const channel1Result = await telegram(
      "getChatMember",
      {
        chat_id: CHANNEL_ID_1,
        user_id: userId
      }
    );

    let channel1Member = false;

    if (channel1Result.ok) {
      const status1 = channel1Result.result?.status;

      channel1Member =
        status1 === "member" ||
        status1 === "administrator" ||
        status1 === "creator" ||
        (
          status1 === "restricted" &&
          channel1Result.result?.is_member === true
        );

      console.log(
        `📢 Channel 1: ${status1} → ${
          channel1Member
            ? "MEMBER ✅"
            : "NOT MEMBER ❌"
        }`
      );
    }

    // ==================================================
    // CHECK CHANNEL 2
    // ==================================================

    const channel2Result = await telegram(
      "getChatMember",
      {
        chat_id: CHANNEL_ID_2,
        user_id: userId
      }
    );

    let channel2Member = false;

    if (channel2Result.ok) {
      const status2 = channel2Result.result?.status;

      channel2Member =
        status2 === "member" ||
        status2 === "administrator" ||
        status2 === "creator" ||
        (
          status2 === "restricted" &&
          channel2Result.result?.is_member === true
        );

      console.log(
        `📢 Channel 2: ${status2} → ${
          channel2Member
            ? "MEMBER ✅"
            : "NOT MEMBER ❌"
        }`
      );
    }

    // ==================================================
    // USER MUST BE IN AT LEAST ONE CHANNEL
    // ==================================================

    if (!channel1Member && !channel2Member) {

      console.log(
        `❌ User ${userId} is not in either channel`
      );

      await telegram(
        "sendMessage",
        {
          chat_id: chatId,
          text:
            "🚨 ACCESS REQUIRED\n\n" +
            "📢 Please join at least one of our channels first.\n\n" +
            "✅ After joining, send /start again."
        }
      );

      return res.status(200).json({
        ok: true
      });
    }

    // ==================================================
    // VERIFIED
    // ==================================================

    console.log(
      `✅ USER VERIFIED → ${userId}`
    );

    // ==================================================
    // COPY ORIGINAL MESSAGE
    // ==================================================

    const copyResult = await telegram(
      "copyMessage",
      {
        chat_id: chatId,

        from_chat_id: SOURCE_CHAT_ID,

        message_id: Number(SOURCE_MESSAGE_ID)
      }
    );

    // ==================================================
    // RESULT
    // ==================================================

    if (copyResult.ok) {

      console.log(
        `✅ ORIGINAL MESSAGE COPIED → ${userId}`
      );

    } else {

      console.error(
        `❌ COPY MESSAGE FAILED → ${userId}`
      );

      console.error(
        `❌ Telegram Error: ${copyResult.description}`
      );

      // Send error only if copy failed
      await telegram(
        "sendMessage",
        {
          chat_id: chatId,
          text:
            "⚠️ Message send failed.\n\n" +
            "Please try /start again."
        }
      );
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {

    console.error(
      "❌ WEBHOOK ERROR:",
      error
    );

    // IMPORTANT:
    // Always return 200 to Telegram
    return res.status(200).json({
      ok: false,
      error: "Internal processing error"
    });
  }
}
