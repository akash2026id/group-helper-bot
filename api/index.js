const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GROQ_API_KEY_1 = process.env.GROQ_API_KEY_1;
const GROQ_API_KEY_2 = process.env.GROQ_API_KEY_2;

// ===== RATE LIMITER =====
const userMessageCounts = new Map();
const HOURLY_LIMIT = 5;

function checkRateLimit(userId) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const userData = userMessageCounts.get(userId);
  if (!userData || now >= userData.resetTime) {
    userMessageCounts.set(userId, { count: 1, resetTime: now + ONE_HOUR });
    return { allowed: true, remaining: HOURLY_LIMIT - 1 };
  }
  if (userData.count >= HOURLY_LIMIT) {
    const resetMinutes = Math.ceil((userData.resetTime - now) / 60000);
    return { allowed: false, remaining: 0, resetMinutes };
  }
  userData.count += 1;
  return { allowed: true, remaining: HOURLY_LIMIT - userData.count };
}

// ===== ADMIN CHECK =====
const ADMINS = [
  { id: "100052951819398", name: "Cyber Akash Admin" }
];

function isAdmin(userId) {
  return ADMINS.some(a => a.id === String(userId));
}

// ===== SEND MESSAGE =====
async function sendMessage(threadId, text) {
  const fetch = require("node-fetch");
  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: threadId },
      message: { text },
      messaging_type: "RESPONSE"
    })
  });
}

// ===== GROQ AI =====
let currentGroqKey = 0;
const GROQ_KEYS = [GROQ_API_KEY_1, GROQ_API_KEY_2];

async function askGroq(message) {
  const fetch = require("node-fetch");
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const key = GROQ_KEYS[currentGroqKey];
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: "তুমি Group Helper Bot এর AI সহকারী। সবসময় বাংলায় উত্তর দাও। বন্ধুত্বপূর্ণ ও সংক্ষিপ্ত থাকো।" },
            { role: "user", content: message }
          ],
          max_tokens: 500
        })
      });
      const data = await res.json();
      if (data.error) {
        currentGroqKey = (currentGroqKey + 1) % GROQ_KEYS.length;
        continue;
      }
      return data.choices[0].message.content;
    } catch(e) {
      currentGroqKey = (currentGroqKey + 1) % GROQ_KEYS.length;
    }
  }
  throw new Error("Groq API কাজ করছে না");
}

// ===== COMMANDS =====
async function handleCommand(senderId, threadId, text) {
  if (!text.startsWith("/")) return;
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === "/help") {
    await sendMessage(threadId,
`📜 বট কমান্ড তালিকা

/help - সব কমান্ড দেখাবে
/kickuser [ID] - গ্রুপ থেকে ইউজার কিক করবে (শুধু এডমিন)
/adminstatus - সব এডমিনের তালিকা দেখাবে
/chatbot [বার্তা] - AI চ্যাটবটের সাথে কথা বলো (ঘণ্টায় ৫টি)
/lovepartner - লাভ পার্টনার লিংক
/support - সাপোর্ট WhatsApp

🤖 Group Helper Bot`);

  } else if (cmd === "/kickuser") {
    if (!isAdmin(senderId)) {
      await sendMessage(threadId, "❌ দুঃখিত, এই কমান্ড শুধু এডমিন ব্যবহার করতে পারে।");
      return;
    }
    if (!args[0]) {
      await sendMessage(threadId, "⚠️ সঠিকভাবে লিখুন:\n/kickuser [ইউজার ID]");
      return;
    }
    const targetId = args[0].replace(/[@<>]/g, "");
    const fetch = require("node-fetch");
    try {
      await fetch(`https://graph.facebook.com/v18.0/${threadId}/members?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: targetId })
      });
      await sendMessage(threadId, `✅ ইউজার (ID: ${targetId}) কে গ্রুপ থেকে বের করা হয়েছে।`);
    } catch(e) {
      await sendMessage(threadId, "❌ ইউজার কিক করতে সমস্যা হয়েছে। বটের এডমিন পারমিশন আছে কিনা দেখুন।");
    }

  } else if (cmd === "/adminstatus") {
    let list = "👑 গ্রুপ এডমিন তালিকা:\n\n";
    ADMINS.forEach((a, i) => { list += `${i+1}. ${a.name}\n`; });
    await sendMessage(threadId, list.trim());

  } else if (cmd === "/chatbot") {
    const userMsg = args.join(" ").trim();
    if (!userMsg) {
      await sendMessage(threadId, `🤖 AI চ্যাটবট\n\nব্যবহার করুন:\n/chatbot [আপনার প্রশ্ন]\n\nউদাহরণ:\n/chatbot বাংলাদেশের রাজধানী কোথায়?\n\n⏰ প্রতি ঘন্টায় ${HOURLY_LIMIT}টি মেসেজ পাঠাতে পারবেন।`);
      return;
    }
    const rate = checkRateLimit(senderId);
    if (!rate.allowed) {
      await sendMessage(threadId, `⏳ দুঃখিত! এই ঘন্টায় আপনার ${HOURLY_LIMIT}টি মেসেজের সীমা শেষ।\n\n🕐 ${rate.resetMinutes} মিনিট পরে আবার চেষ্টা করুন।`);
      return;
    }
    try {
      const reply = await askGroq(userMsg);
      await sendMessage(threadId, `🤖 AI চ্যাটবট\n\n${reply}\n\n⏰ বাকি মেসেজ: ${rate.remaining}/${HOURLY_LIMIT}টি`);
    } catch(e) {
      await sendMessage(threadId, "❌ AI সার্ভারে সমস্যা। কিছুক্ষণ পরে চেষ্টা করুন।");
    }

  } else if (cmd === "/lovepartner") {
    await sendMessage(threadId, `❤️ Love Partner সিস্টেম ব্যবহার করতে এখানে যান:\nhttps://singel-c-bot.page.gd`);

  } else if (cmd === "/support") {
    await sendMessage(threadId, `📞 সাপোর্ট নিতে WhatsApp এ যোগাযোগ করুন:\nhttps://wa.me/8801966061084`);

  } else {
    await sendMessage(threadId, `❓ "${cmd}" কমান্ড চেনা যাচ্ছে না।\nসব কমান্ড দেখতে লিখুন: /help`);
  }
}

// ===== ROUTES =====
app.get("/", (req, res) => {
  res.json({ status: "✅ চালু আছে", bot: "Group Helper Bot", version: "1.0.0" });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);
  res.sendStatus(200);
  try {
    for (const entry of (body.entry || [])) {
      for (const event of (entry.messaging || [])) {
        if (event.message && !event.message.is_echo && event.message.text) {
          await handleCommand(event.sender?.id, event.recipient?.id, event.message.text);
        }
      }
    }
  } catch(e) {
    console.error("Error:", e.message);
  }
});

module.exports = app;
