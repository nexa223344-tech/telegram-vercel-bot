// api/webhook.js

export default async function handler(req, res) {
  console.log("📩 Webhook received");

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
    const PHOTO_FILE_ID = process.env.PHOTO_FILE_ID;

    if (
      !BOT_TOKEN ||
      !CHANNEL_ID_1 ||
      !CHANNEL_ID_2 ||
      !PHOTO_FILE_ID
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

    const message = update.message;

    // Ignore non-message updates
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

    console.log(`🚀 /start received → User: ${userId}`);

    // =====================================================
    // CHECK CHANNEL 1
    // =====================================================

    console.log(
      `🔍 Checking Channel 1 → User ${userId}`
    );

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
        status1 === "creator";

      console.log(
        `📢 Channel 1 status: ${status1} → ${
          channel1Member ? "MEMBER ✅" : "NOT MEMBER ❌"
        }`
      );
    }

    // =====================================================
    // CHECK CHANNEL 2
    // =====================================================

    console.log(
      `🔍 Checking Channel 2 → User ${userId}`
    );

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
        status2 === "creator";

      console.log(
        `📢 Channel 2 status: ${status2} → ${
          channel2Member ? "MEMBER ✅" : "NOT MEMBER ❌"
        }`
      );
    }

    // =====================================================
    // USER MUST BE IN AT LEAST ONE CHANNEL
    // =====================================================

    const isMember =
      channel1Member || channel2Member;

    if (!isMember) {
      console.log(
        `❌ User ${userId} is not a member of either channel`
      );

      await telegram("sendMessage", {
        chat_id: chatId,
        text:
          "🚨 ACCESS REQUIRED\n\n" +
          "📢 Please join at least one of our channels first.\n\n" +
          "✅ After joining, send /start again."
      });

      return res.status(200).json({ ok: true });
    }

    // =====================================================
    // MEMBER FOUND
    // =====================================================

    console.log(
      `✅ User ${userId} verified successfully`
    );

    if (channel1Member) {
      console.log(
        `🎯 Verified through Channel 1`
      );
    }

    if (channel2Member) {
      console.log(
        `🎯 Verified through Channel 2`
      );
    }

    // =====================================================
    // SEND PHOTO + CAPTION
    // =====================================================

    const caption =
      "🎉✨ WELCOME! ✨🎉\n\n" +
      "🔥 You are successfully verified!\n" +
      "✅ Channel membership confirmed.\n\n" +
      "🚀 Your access is now ready!\n" +
      "💎 Enjoy the content!\n\n" +
      "⚡️ Stay Active • Stay Updated ⚡️";

    const photoResult = await telegram(
      "sendPhoto",
      {
        chat_id: chatId,
        photo: PHOTO_FILE_ID,
        caption: caption
      }
    );

    if (photoResult.ok) {
      console.log(
        `🖼️ PHOTO SENT SUCCESSFULLY → User ${userId}`
      );
    } else {
      console.error(
        `❌ PHOTO SEND FAILED → User ${userId}`
      );
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error(
      "❌ Webhook error:",
      error
    );

    return res.status(200).json({
      ok: false,
      error: "Internal processing error"
    });
  }
}
