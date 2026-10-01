// api/webhook.js

export default async function handler(req, res) {
  console.log("📩 Webhook received");

  // Telegram should use POST
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
      return res.status(200).json({ ok: true });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHANNEL_ID_1 = process.env.CHANNEL_ID_1;
    const CHANNEL_ID_2 = process.env.CHANNEL_ID_2;
    const PHOTO_FILE_ID = process.env.PHOTO_FILE_ID;

    if (!BOT_TOKEN || !CHANNEL_ID_1 || !CHANNEL_ID_2 || !PHOTO_FILE_ID) {
      console.error("❌ Missing environment variables");
      return res.status(200).json({ ok: false });
    }

    // --------------------------------------------------
    // Telegram API helper
    // --------------------------------------------------

    async function telegram(method, data = {}) {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

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

    // --------------------------------------------------
    // Only process private chat messages
    // --------------------------------------------------

    const message = update.message;

    if (!message || !message.chat) {
      return res.status(200).json({ ok: true });
    }

    // Ignore groups/channels
    if (message.chat.type !== "private") {
      return res.status(200).json({ ok: true });
    }

    const userId = message.from?.id;
    const chatId = message.chat.id;
    const text = message.text || "";

    if (!userId) {
      return res.status(200).json({ ok: true });
    }

    // --------------------------------------------------
    // /start
    // --------------------------------------------------

    if (text.startsWith("/start")) {
      console.log(`🚀 /start received from user: ${userId}`);

      /*
        Supported start commands:

        /start channel1
        /start channel2

        Or:

        /start
      */

      const parts = text.trim().split(/\s+/);
      const startParameter = parts[1] || "";

      let selectedChannel = null;
      let channelName = "";

      if (
        startParameter === "channel1" ||
        startParameter === "ch1"
      ) {
        selectedChannel = CHANNEL_ID_1;
        channelName = "Channel 1";
      }

      if (
        startParameter === "channel2" ||
        startParameter === "ch2"
      ) {
        selectedChannel = CHANNEL_ID_2;
        channelName = "Channel 2";
      }

      // --------------------------------------------------
      // If no channel parameter
      // --------------------------------------------------

      if (!selectedChannel) {
        console.log(
          `⚠️ No channel parameter for user: ${userId}`
        );

        await telegram("sendMessage", {
          chat_id: chatId,
          text:
            "👋 Welcome!\n\n" +
            "Please use the correct channel start link.\n\n" +
            "🔹 Channel 1 → /start channel1\n" +
            "🔹 Channel 2 → /start channel2"
        });

        return res.status(200).json({ ok: true });
      }

      // --------------------------------------------------
      // Check membership
      // --------------------------------------------------

      console.log(
        `🔍 Checking membership: User ${userId} → ${channelName}`
      );

      const memberResult = await telegram(
        "getChatMember",
        {
          chat_id: selectedChannel,
          user_id: userId
        }
      );

      if (!memberResult.ok) {
        console.error(
          `❌ Membership check failed for user ${userId}`
        );

        await telegram("sendMessage", {
          chat_id: chatId,
          text:
            "⚠️ I couldn't verify your channel membership.\n\n" +
            "Please join the channel and try /start again."
        });

        return res.status(200).json({ ok: true });
      }

      const memberStatus = memberResult.result?.status;

      const isMember =
        memberStatus === "member" ||
        memberStatus === "administrator" ||
        memberStatus === "creator";

      console.log(
        `👤 Membership result: ${memberStatus} → ${
          isMember ? "MEMBER ✅" : "NOT MEMBER ❌"
        }`
      );

      // --------------------------------------------------
      // User is NOT member
      // --------------------------------------------------

      if (!isMember) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text:
            "🚨 ACCESS REQUIRED\n\n" +
            `📢 Please join ${channelName} first.\n\n` +
            "✅ After joining, come back and send /start again."
        });

        return res.status(200).json({ ok: true });
      }

      // --------------------------------------------------
      // User IS member
      // --------------------------------------------------

      console.log(
        `✅ User ${userId} is a member of ${channelName}`
      );

      // --------------------------------------------------
      // Prevent duplicate content for the same update
      // --------------------------------------------------

      const updateId = update.update_id;

      if (!globalThis.processedUpdates) {
        globalThis.processedUpdates = new Set();
      }

      if (processedUpdates.has(updateId)) {
        console.log(
          `♻️ Duplicate update ignored: ${updateId}`
        );

        return res.status(200).json({ ok: true });
      }

      processedUpdates.add(updateId);

      // Keep memory small
      if (processedUpdates.size > 1000) {
        const first = processedUpdates.values().next().value;
        processedUpdates.delete(first);
      }

      // --------------------------------------------------
      // Send Photo + Caption
      // --------------------------------------------------

      const caption =
        "🎉✨ WELCOME! ✨🎉\n\n" +
        "🔥 You are successfully verified!\n" +
        "✅ Channel membership confirmed.\n\n" +
        "🚀 Your access is now ready!\n" +
        "💎 Enjoy the content!\n\n" +
        "⚡️ Stay Active • Stay Updated ⚡️";

      const photoResult = await telegram("sendPhoto", {
        chat_id: chatId,
        photo: PHOTO_FILE_ID,
        caption: caption
      });

      if (photoResult.ok) {
        console.log(
          `🖼️ Photo + caption sent successfully → User ${userId}`
        );
      } else {
        console.error(
          `❌ Failed to send photo → User ${userId}`
        );
      }

      return res.status(200).json({ ok: true });
    }

    // --------------------------------------------------
    // Ignore other messages
    // --------------------------------------------------

    console.log(
      `ℹ️ Non-/start message received from user: ${userId}`
    );

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Webhook error:", error);

    // Always return 200 to Telegram
    return res.status(200).json({
      ok: false,
      error: "Internal processing error"
    });
  }
}
