/**
 * Command Handler - সব কমান্ড প্রসেস করে
 * Group Helper Bot এর মূল লজিক
 */

const { isAdmin, getAdminList } = require("./adminManager");
const { sendMessage, kickUserFromGroup, getUserProfile } = require("./messengerApi");
const { checkRateLimit, getRemainingMessages, HOURLY_LIMIT } = require("./chatRateLimiter");
const { sendToGroq } = require("./groqClient");

// চ্যাটবট কনভার্সেশন হিস্ট্রি (প্রতি ইউজারের জন্য)
const chatHistory = new Map();

// =============================================
// কমান্ড হ্যান্ডলার ফাংশনগুলো
// =============================================

/**
 * /help - সব কমান্ডের তালিকা দেখাও
 */
async function handleHelp(senderId, threadId) {
  const helpText = `📜 *বট কমান্ড তালিকা*

/help - সব কমান্ড দেখাবে

/kickuser @mention - গ্রুপ থেকে ইউজার কিক করবে (শুধু এডমিন)

/adminstatus - সব এডমিনের তালিকা দেখাবে

/chatbot [বার্তা] - AI চ্যাটবটের সাথে কথা বলো (প্রতি ঘন্টায় ${HOURLY_LIMIT}টি মেসেজ)

/lovepartner - লাভ পার্টনার লিংক

/support - সাপোর্ট WhatsApp

━━━━━━━━━━━━━━━━━━
🤖 Group Helper Bot`;

  await sendMessage(threadId, helpText);
}

/**
 * /kickuser - গ্রুপ থেকে ইউজার কিক করো (শুধু এডমিন)
 */
async function handleKickUser(senderId, threadId, args) {
  // এডমিন চেক
  if (!isAdmin(senderId)) {
    await sendMessage(
      threadId,
      "❌ দুঃখিত, এই কমান্ড শুধু এডমিন ব্যবহার করতে পারে।"
    );
    return;
  }

  // Target ID পার্স করো
  // আর্গুমেন্ট: /kickuser USER_ID বা /kickuser @mention
  const targetArg = args[0];

  if (!targetArg) {
    await sendMessage(
      threadId,
      "⚠️ সঠিকভাবে লিখুন:\n/kickuser [ইউজার ID]\n\nউদাহরণ:\n/kickuser 1234567890"
    );
    return;
  }

  // @ চিহ্ন থাকলে সরিয়ে দাও
  const targetUserId = targetArg.replace(/[@<>]/g, "").trim();

  if (!targetUserId || isNaN(targetUserId)) {
    await sendMessage(
      threadId,
      "❌ অবৈধ ইউজার ID। সঠিক Facebook User ID দিন।"
    );
    return;
  }

  // নিজেকে কিক করা যাবে না
  if (targetUserId === senderId) {
    await sendMessage(threadId, "❌ আপনি নিজেকে কিক করতে পারবেন না!");
    return;
  }

  try {
    // টার্গেটের প্রোফাইল নিন
    const profile = await getUserProfile(targetUserId);
    const targetName = profile.name || "ইউজার";

    // গ্রুপ থেকে রিমুভ করো
    await kickUserFromGroup(threadId, targetUserId);

    await sendMessage(
      threadId,
      `✅ *${targetName}* (ID: ${targetUserId}) কে সফলভাবে গ্রুপ থেকে বের করা হয়েছে।\n\n👮 এডমিন কর্তৃক পরিচালিত।`
    );
  } catch (error) {
    console.error("Kick error:", error.message);
    await sendMessage(
      threadId,
      `❌ ইউজার কিক করতে সমস্যা হয়েছে।\n\nসম্ভাব্য কারণ:\n• বটের এডমিন পারমিশন নেই\n• ইউজার ইতিমধ্যে গ্রুপে নেই\n• ইউজার নিজেও এডমিন`
    );
  }
}

/**
 * /adminstatus - গ্রুপের এডমিন তালিকা দেখাও
 */
async function handleAdminStatus(senderId, threadId) {
  const adminList = getAdminList();
  await sendMessage(threadId, adminList);
}

/**
 * /chatbot - AI চ্যাটবটের সাথে কথা বলো
 */
async function handleChatbot(senderId, threadId, args) {
  const userMessage = args.join(" ").trim();

  // মেসেজ না থাকলে নির্দেশনা দাও
  if (!userMessage) {
    const remaining = getRemainingMessages(senderId);
    await sendMessage(
      threadId,
      `🤖 *AI চ্যাটবট*\n\nআমার সাথে কথা বলতে লিখুন:\n/chatbot [আপনার বার্তা]\n\nউদাহরণ:\n/chatbot বাংলাদেশের রাজধানী কোথায়?\n\n⏰ আপনার বাকি মেসেজ এই ঘন্টায়: ${remaining}/${HOURLY_LIMIT}টি`
    );
    return;
  }

  // রেট লিমিট চেক করো
  const rateCheck = checkRateLimit(senderId);

  if (!rateCheck.allowed) {
    await sendMessage(
      threadId,
      `⏳ দুঃখিত! আপনি এই ঘন্টায় ${HOURLY_LIMIT}টি মেসেজের সীমা পার করেছেন।\n\n🕐 ${rateCheck.resetMinutes} মিনিট পরে আবার চেষ্টা করুন।\n\nপ্রতি ঘন্টায় ${HOURLY_LIMIT}টি মেসেজ পাঠানো যাবে।`
    );
    return;
  }

  try {
    // টাইপিং ইন্ডিকেটর (ঐচ্ছিক - ব্যবহারকারীকে জানাই)
    await sendMessage(threadId, "⏳ উত্তর তৈরি হচ্ছে...");

    // ইউজারের কনভার্সেশন হিস্ট্রি নাও
    const history = chatHistory.get(senderId) || [];

    // Groq API তে পাঠাও
    const aiReply = await sendToGroq(userMessage, history);

    // কনভার্সেশন হিস্ট্রি আপডেট করো (সর্বোচ্চ ৬টি মেসেজ রাখো)
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: aiReply });

    // সর্বোচ্চ ১০টি এন্ট্রি রাখো (৫ জোড়া)
    if (history.length > 10) {
      history.splice(0, 2);
    }
    chatHistory.set(senderId, history);

    const remaining = getRemainingMessages(senderId);
    const finalReply = `🤖 *AI চ্যাটবট*\n\n${aiReply}\n\n━━━━━━━━━━━━\n⏰ বাকি মেসেজ: ${remaining}/${HOURLY_LIMIT}টি`;

    await sendMessage(threadId, finalReply);
  } catch (error) {
    console.error("Chatbot error:", error.message);
    await sendMessage(
      threadId,
      `❌ AI সার্ভারে সমস্যা হচ্ছে।\n\nবিবরণ: ${error.message}\n\nকিছুক্ষণ পরে আবার চেষ্টা করুন।`
    );
  }
}

/**
 * /lovepartner - লাভ পার্টনার লিংক পাঠাও
 */
async function handleLovePartner(senderId, threadId) {
  const message = `❤️ *Love Partner সিস্টেম*

আপনার পার্ফেক্ট লাভ পার্টনার খুঁজতে এখানে যান:

🔗 https://singel-c-bot.page.gd

━━━━━━━━━━━━━━━━━━
💕 ভালোবাসা খুঁজে পান!`;

  await sendMessage(threadId, message);
}

/**
 * /support - WhatsApp সাপোর্ট লিংক পাঠাও
 */
async function handleSupport(senderId, threadId) {
  const message = `📞 *সাপোর্ট সেন্টার*

যেকোনো সমস্যায় WhatsApp এ যোগাযোগ করুন:

🔗 https://wa.me/8801966061084

⏰ সাপোর্ট সময়: সকাল ৯টা - রাত ১১টা
━━━━━━━━━━━━━━━━━━
আমরা সাহায্য করতে সদা প্রস্তুত! 🤝`;

  await sendMessage(threadId, message);
}

// =============================================
// মূল কমান্ড প্রসেসর
// =============================================

/**
 * মেসেজ পার্স করে সঠিক কমান্ড হ্যান্ডলারে পাঠায়
 * @param {string} senderId - যে পাঠিয়েছে তার ID
 * @param {string} threadId - গ্রুপ Thread ID
 * @param {string} messageText - মেসেজের টেক্সট
 */
async function processCommand(senderId, threadId, messageText) {
  // শুধু কমান্ড (/ দিয়ে শুরু) প্রসেস করো
  if (!messageText || !messageText.startsWith("/")) {
    return false; // কমান্ড নয়
  }

  const parts = messageText.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  console.log(`📨 কমান্ড: ${command} | Sender: ${senderId} | Thread: ${threadId}`);

  try {
    switch (command) {
      case "/help":
        await handleHelp(senderId, threadId);
        break;

      case "/kickuser":
        await handleKickUser(senderId, threadId, args);
        break;

      case "/adminstatus":
        await handleAdminStatus(senderId, threadId);
        break;

      case "/chatbot":
        await handleChatbot(senderId, threadId, args);
        break;

      case "/lovepartner":
        await handleLovePartner(senderId, threadId);
        break;

      case "/support":
        await handleSupport(senderId, threadId);
        break;

      default:
        // অজানা কমান্ড
        await sendMessage(
          threadId,
          `❓ "${command}" কমান্ডটি চেনা যাচ্ছে না।\n\nসব কমান্ড দেখতে লিখুন: /help`
        );
    }
  } catch (error) {
    console.error(`❌ কমান্ড প্রসেস করতে সমস্যা (${command}):`, error.message);
    await sendMessage(
      threadId,
      "⚠️ একটি সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
    );
  }

  return true; // কমান্ড প্রসেস হয়েছে
}

module.exports = { processCommand };
