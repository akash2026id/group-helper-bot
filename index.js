/**
 * ╔═══════════════════════════════════════════════╗
 * ║        Group Helper Bot - Main Server         ║
 * ║   Facebook Messenger Group Command Bot        ║
 * ╚═══════════════════════════════════════════════╝
 * 
 * সার্ভার চালু করতে: node src/index.js
 */

require("dotenv").config();
const express = require("express");
const { processCommand } = require("./commandHandler");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// =============================================
// স্বাস্থ্য পরীক্ষা রুট
// =============================================
app.get("/", (req, res) => {
  res.json({
    status: "✅ চালু আছে",
    bot: "Group Helper Bot",
    version: "1.0.0",
    time: new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" }),
  });
});

// =============================================
// Facebook Webhook Verification (GET)
// Facebook প্রথমবার Webhook যাচাই করে এভাবে
// =============================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`📡 Webhook যাচাই অনুরোধ আসছে...`);
  console.log(`   Mode: ${mode}, Token: ${token}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook সফলভাবে যাচাই হয়েছে!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook যাচাই ব্যর্থ! Token মিলছে না।");
    res.sendStatus(403);
  }
});

// =============================================
// Facebook Webhook Events (POST)
// এখানে সব মেসেজ ইভেন্ট আসে
// =============================================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  // Facebook এর ping চেক
  if (body.object !== "page") {
    console.log("⚠️ অপরিচিত webhook object:", body.object);
    return res.sendStatus(404);
  }

  // Facebook কে দ্রুত ২০০ রিসপন্স দাও (টাইমআউট এড়াতে)
  res.sendStatus(200);

  // সব entry প্রসেস করো
  for (const entry of body.entry) {
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      await handleMessagingEvent(event);
    }

    // Group Thread Events (Messenger Rooms/Groups)
    const standbyEvents = entry.standby || [];
    for (const event of standbyEvents) {
      console.log("📌 Standby event:", JSON.stringify(event).substring(0, 100));
    }
  }
});

// =============================================
// মেসেজিং ইভেন্ট হ্যান্ডলার
// =============================================
async function handleMessagingEvent(event) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;

  // মেসেজ ইভেন্ট
  if (event.message && !event.message.is_echo) {
    const messageText = event.message.text;

    if (!messageText) {
      console.log("📎 টেক্সট ছাড়া মেসেজ (ছবি/ফাইল) - স্কিপ করছি");
      return;
    }

    console.log(`\n📩 নতুন মেসেজ:`);
    console.log(`   Sender: ${senderId}`);
    console.log(`   Thread: ${recipientId}`);
    console.log(`   Text: ${messageText.substring(0, 50)}`);

    // গ্রুপ Thread ID নির্ধারণ করো
    // Messenger গ্রুপে recipient ID হলো Thread ID
    const threadId = recipientId;

    // কমান্ড প্রসেস করো
    await processCommand(senderId, threadId, messageText);
  }

  // Delivery receipt
  else if (event.delivery) {
    // মেসেজ ডেলিভারি কনফার্মেশন - লগ করো
    console.log(`📬 ডেলিভারি নিশ্চিত`);
  }

  // Read receipt
  else if (event.read) {
    console.log(`👁️ মেসেজ পড়া হয়েছে`);
  }
}

// =============================================
// এনভায়রনমেন্ট ভেরিফিকেশন
// =============================================
function checkEnvironment() {
  const required = ["PAGE_ACCESS_TOKEN", "VERIFY_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n❌ নিচের এনভায়রনমেন্ট ভেরিয়েবল সেট করুন:");
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error("\n.env.example ফাইল দেখুন।\n");
    process.exit(1);
  }

  // Groq API Keys
  const groqKeys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2].filter(Boolean);
  if (groqKeys.length === 0) {
    console.warn("⚠️  কোনো Groq API Key নেই। /chatbot কমান্ড কাজ করবে না।");
  } else {
    console.log(`✅ ${groqKeys.length}টি Groq API Key লোড হয়েছে`);
  }
}

// =============================================
// সার্ভার চালু করো
// =============================================
checkEnvironment();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        Group Helper Bot চালু!          ║
╠════════════════════════════════════════╣
║  🌐 Port    : ${PORT}                      ║
║  📡 Webhook : /webhook                 ║
║  🏥 Health  : /                        ║
╚════════════════════════════════════════╝

✅ বট সফলভাবে চালু হয়েছে!
📌 Webhook URL: https://আপনার-ডোমেইন.com/webhook
`);
});

// অপ্রত্যাশিত error হ্যান্ডল করো
process.on("uncaughtException", (err) => {
  console.error("🔴 Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔴 Unhandled Rejection:", reason);
});

module.exports = app;
