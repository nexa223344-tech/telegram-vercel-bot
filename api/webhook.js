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

    if (!message || !message.chat) {
      return res.status(200).json({ ok: true });
    }

    if (message.chat.type !== "private") {
      return res.status(200).json({ ok: true });
    }

    const userId = message.from?.id;
    const chatId = message.chat.id;
    const text = message.text || "";

    if (!userId) {
      return res.status(200).json({ ok: true });
    }

    if (!text.startsWith("/start")) {
      return res.status(200).json({ ok: true });
    }

    console.log(`🚀 /start received → ${userId}`);

    // ==================================================
    // CHANNEL 1
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
          channel1Member ? "MEMBER ✅" : "NOT MEMBER ❌"
        }`
      );
    } else {
      console.error(
        "❌ Channel 1 check:",
        channel1Result.description
      );
    }

    // ==================================================
    // CHANNEL 2
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
          channel2Member ? "MEMBER ✅" : "NOT MEMBER ❌"
        }`
      );
    } else {
      console.error(
        "❌ Channel 2 check:",
        channel2Result.description
      );
    }

    // ==================================================
    // AT LEAST ONE CHANNEL
    // ==================================================

    if (!channel1Member && !channel2Member) {
      console.log(
        `❌ User ${userId} is not in either channel`
      );

      await telegram("sendMessage", {
        chat_id: chatId,
        text:
          "🚨 ACCESS REQUIRED\n\n" +
          "📢 Please join at least one of our channels first.\n\n" +
          "✅ After joining, send /start again."
      });

      return res.status(200).json({
        ok: true
      });
    }

    console.log(
      `✅ USER VERIFIED → ${userId}`
    );

    // ==================================================
    // EXACT CAPTION
    // ==================================================

    const caption =
      "🔥If anyone needs a VIP Admin Panel, 🕺\n\n" +
      "DM me FAST! 💌 @wingohacker007\n\n" +
      "⚡ Super Working & Ready to Use!";

    // ==================================================
    // SEND PHOTO
    // ==================================================

    const photoResult = await telegram(
      "sendPhoto",
      {
        chat_id: chatId,
        photo: PHOTO_FILE_ID,
        caption: caption,

        caption_entities: [

          // 🔥 custom emoji
          {
            offset: 0,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "6264785189394717307"
          },

          // If anyone needs a VIP Admin Panel,
          {
            offset: 2,
            length: 34,
            type: "bold"
          },

          // 🕺 custom emoji
          {
            offset: 37,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "5474546696245496182"
          },

          // DM me FAST!
          {
            offset: 41,
            length: 11,
            type: "bold"
          },

          // 💌 custom emoji
          {
            offset: 53,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "5253742260054409879"
          },

          // @wingohacker007
          {
            offset: 56,
            length: 15,
            type: "text_link",
            url:
              "https://t.me/m/jHTUCQLUN2M1"
          },

          // ⚡ custom emoji
          {
            offset: 73,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "YOUR_ELECTRIC_EMOJI_ID"
          },

          // Super Working & Ready to Use!
          {
            offset: 75,
            length: 29,
            type: "bold"
          }
        ]
      }
    );

    // ==================================================
    // RESULT
    // ==================================================

    if (photoResult.ok) {
      console.log(
        `✅ PHOTO + CAPTION SENT → ${userId}`
      );
    } else {
      console.error(
        `❌ PHOTO SEND FAILED → ${userId}`
      );

      console.error(
        `❌ Telegram Error: ${photoResult.description}`
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

    return res.status(200).json({
      ok: false,
      error: "Internal processing error"
    });
  }
}
