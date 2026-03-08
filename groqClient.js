/**
 * Groq API Client - API Key রোটেশন সহ
 * যখন একটি key এর লিমিট শেষ হয়, স্বয়ংক্রিয়ভাবে পরেরটা ব্যবহার করে
 */

const axios = require("axios");

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
].filter(Boolean);

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

// কোন key টা এখন ব্যবহার হচ্ছে
let currentKeyIndex = 0;

// ব্যর্থ key গুলো ট্র্যাক করা
const exhaustedKeys = new Set();

function getCurrentKey() {
  return GROQ_API_KEYS[currentKeyIndex];
}

function rotateKey() {
  // পরের available key তে যাও
  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
    if (!exhaustedKeys.has(currentKeyIndex)) {
      console.log(`🔄 Groq API Key রোটেট হলো → Key #${currentKeyIndex + 1}`);
      return true;
    }
  }
  return false; // সব key শেষ
}

/**
 * Groq API তে মেসেজ পাঠাও
 * @param {string} userMessage - ইউজারের মেসেজ
 * @param {Array} conversationHistory - আগের কথোপকথন
 */
async function sendToGroq(userMessage, conversationHistory = []) {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error("কোনো Groq API Key কনফিগার করা নেই।");
  }

  const messages = [
    {
      role: "system",
      content: `তুমি "Group Helper Bot" এর AI সহকারী। তুমি সবসময় বাংলায় উত্তর দেবে। 
তুমি বন্ধুত্বপূর্ণ, সহায়ক এবং সংক্ষিপ্ত উত্তর দেবে। 
যেকোনো প্রশ্নের উত্তর বাংলায় দাও। ইমোজি ব্যবহার করো যাতে উত্তর আকর্ষণীয় হয়।`,
    },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  // সব available key দিয়ে চেষ্টা করো
  let attempts = 0;
  const maxAttempts = GROQ_API_KEYS.length;

  while (attempts < maxAttempts) {
    const apiKey = getCurrentKey();

    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const reply = response.data.choices[0]?.message?.content;
      if (!reply) throw new Error("Groq থেকে কোনো উত্তর আসেনি।");

      return reply;
    } catch (error) {
      const status = error.response?.status;
      const errMsg = error.response?.data?.error?.message || error.message;

      console.error(`❌ Groq Key #${currentKeyIndex + 1} ব্যর্থ: ${errMsg}`);

      // Rate limit বা quota শেষ হলে পরের key তে যাও
      if (status === 429 || status === 402 || errMsg.includes("quota")) {
        exhaustedKeys.add(currentKeyIndex);
        const rotated = rotateKey();

        if (!rotated) {
          throw new Error(
            "সকল Groq API Key এর লিমিট শেষ। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
          );
        }
      } else {
        throw new Error(`AI সার্ভার সমস্যা: ${errMsg}`);
      }
    }

    attempts++;
  }

  throw new Error("Groq API তে সংযোগ করা সম্ভব হয়নি।");
}

module.exports = { sendToGroq };
