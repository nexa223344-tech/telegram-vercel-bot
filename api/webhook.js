// api/webhook.js

export default async function handler(req, res) {
  console.log("📩 Webhook received");

  // ==================================================
  // GET REQUEST
  // ==================================================

  if (req.method !== "POST") {
    return res.status(200).json({
      ok: true,
      message: "Telegram webhook is running"
    });
  }

  try {
    const update = req.body;

    if (!update) {
      console.log("⚠️ Empty update");

      return res.status(200).json({
        ok: true
      });
    }

    // ==================================================
    // ENV VARIABLES
    // ==================================================

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

    // ==================================================
    // TELEGRAM API FUNCTION
    // ==================================================

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

    // ==================================================
    // GET MESSAGE
    // ==================================================

    const message = update.message;

    // Ignore other updates
    if (!message || !message.chat) {
      console.log("ℹ️ Non-message update ignored");

      return res.status(200).json({
        ok: true
      });
    }

    // Only private chat
    if (message.chat.type !== "private") {
      console.log("ℹ️ Non-private message ignored");

      return res.status(200).json({
        ok: true
      });
    }

    const userId = message.from?.id;
    const chatId = message.chat.id;
    const text = message.text || "";

    if (!userId) {
      console.log("⚠️ User ID not found");

      return res.status(200).json({
        ok: true
      });
    }

    // ==================================================
    // ONLY /START
    // ==================================================

    if (!text.startsWith("/start")) {
      console.log(
        `ℹ️ Non-start message → User ${userId}`
      );

      return res.status(200).json({
        ok: true
      });
    }

    console.log(
      `🚀 /start received → User ${userId}`
    );

    // ==================================================
    // CHANNEL 1 CHECK
    // ==================================================

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
      const status1 =
        channel1Result.result?.status;

      const isMember1 =
        channel1Result.result?.is_member === true;

      channel1Member =
        status1 === "member" ||
        status1 === "administrator" ||
        status1 === "creator" ||
        (
          status1 === "restricted" &&
          isMember1
        );

      console.log(
        `📢 Channel 1 status: ${status1}`
      );

      console.log(
        `📢 Channel 1 member: ${
          channel1Member
            ? "YES ✅"
            : "NO ❌"
        }`
      );

    } else {
      console.error(
        "❌ Channel 1 membership check failed:",
        channel1Result.description
      );
    }

    // ==================================================
    // CHANNEL 2 CHECK
    // ==================================================

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
      const status2 =
        channel2Result.result?.status;

      const isMember2 =
        channel2Result.result?.is_member === true;

      channel2Member =
        status2 === "member" ||
        status2 === "administrator" ||
        status2 === "creator" ||
        (
          status2 === "restricted" &&
          isMember2
        );

      console.log(
        `📢 Channel 2 status: ${status2}`
      );

      console.log(
        `📢 Channel 2 member: ${
          channel2Member
            ? "YES ✅"
            : "NO ❌"
        }`;

    } else {
      console.error(
        "❌ Channel 2 membership check failed:",
        channel2Result.description
      );
    }

    // ==================================================
    // AT LEAST ONE CHANNEL
    // ==================================================

    const isMember =
      channel1Member ||
      channel2Member;

    if (!isMember) {
      console.log(
        `❌ User ${userId} is NOT a member of either channel`
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
      `========================================`
    );

    console.log(
      `✅ USER VERIFIED → ${userId}`
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

    console.log(
      `========================================`
    );

    // ==================================================
    // EXACT ORIGINAL CAPTION
    // ==================================================

    const caption =
      "🔥If anyone needs a VIP Admin Panel, 🕺\n\n" +
      "DM me FAST! 💌 @wingohacker007\n\n" +
      "⚡ Super Working & Ready to Use!";

    // ==================================================
    // SEND PHOTO + CUSTOM EMOJIS + USERNAME
    // ==================================================

    console.log(
      `🖼️ Sending original photo + caption → User ${userId}`
    );

    const photoResult = await telegram(
      "sendPhoto",
      {
        chat_id: chatId,

        photo: PHOTO_FILE_ID,

        caption: caption,

        caption_entities: [

          // ------------------------------------------
          // 🔥 CUSTOM EMOJI
          // ------------------------------------------

          {
            offset: 0,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "6264785189394717307"
          },

          // ------------------------------------------
          // IF ANYONE NEEDS A VIP ADMIN PANEL,
          // ------------------------------------------

          {
            offset: 2,
            length: 35,
            type: "bold"
          },

          // ------------------------------------------
          // 🕺 CUSTOM EMOJI
          // ------------------------------------------

          {
            offset: 37,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "5474546696245496182"
          },

          // ------------------------------------------
          // DM me FAST!
          // ------------------------------------------

          {
            offset: 41,
            length: 12,
            type: "bold"
          },

          // ------------------------------------------
          // 💌 CUSTOM EMOJI
          // ------------------------------------------

          {
            offset: 53,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id:
              "5253742260054409879"
          },

          // ------------------------------------------
          // SPACE / BOLD
          // ------------------------------------------

          {
            offset: 55,
            length: 1,
            type: "bold"
          },

          // ------------------------------------------
          // @wingohacker007
          // ------------------------------------------

          {
            offset: 57,
            length: 14,
            type: "text_link",
            url:
              "https://t.me/m/jHTUCQLUN2M1"
          },

          // ------------------------------------------
          // ⚡ SUPER WORKING & READY TO USE!
          // ------------------------------------------

          {
            offset: 73,
            length: 31,
            type: "bold"
          }
        ]
      }
    );

    // ==================================================
    // PHOTO RESULT
    // ==================================================

    if (photoResult.ok) {

      console.log(
        `========================================`
      );

      console.log(
        `✅ PHOTO SENT SUCCESSFULLY`
      );

      console.log(
        `👤 User: ${userId}`
      );

      console.log(
        `📸 Animated caption: YES`
      );

      console.log(
        `👤 Username link: YES`
      );

      console.log(
        `========================================`
      );

    } else {

      console.error(
        `========================================`
      );

      console.error(
        `❌ PHOTO SEND FAILED`
      );

      console.error(
        `👤 User: ${userId}`
      );

      console.error(
        `❌ Telegram Error:`,
        photoResult.description
      );

      console.error(
        `========================================`
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
