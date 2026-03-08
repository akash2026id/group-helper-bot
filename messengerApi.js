/**
 * Facebook Messenger API Helper
 * মেসেজ পাঠানো এবং গ্রুপ অ্যাকশনের জন্য
 */

const axios = require("axios");

const FB_API_BASE = "https://graph.facebook.com/v18.0";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

/**
 * মেসেজ পাঠাও (গ্রুপ বা ব্যক্তিকে)
 * @param {string} recipientId - Thread ID (গ্রুপ বা ইউজার)
 * @param {string} messageText - পাঠানোর টেক্সট
 */
async function sendMessage(recipientId, messageText) {
  try {
    const response = await axios.post(
      `${FB_API_BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: "RESPONSE",
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(`✅ মেসেজ পাঠানো হয়েছে → ${recipientId}`);
    return response.data;
  } catch (error) {
    const errData = error.response?.data || error.message;
    console.error("❌ মেসেজ পাঠাতে সমস্যা:", JSON.stringify(errData));
    throw error;
  }
}

/**
 * গ্রুপ থেকে ইউজার কিক করো
 * @param {string} threadId - গ্রুপ Thread ID
 * @param {string} userId - কিক করার ইউজারের ID
 */
async function kickUserFromGroup(threadId, userId) {
  try {
    const response = await axios.delete(
      `${FB_API_BASE}/${threadId}/members`,
      {
        data: { member: userId },
        params: { access_token: PAGE_ACCESS_TOKEN },
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(`✅ ইউজার ${userId} কিক করা হয়েছে গ্রুপ ${threadId} থেকে`);
    return response.data;
  } catch (error) {
    const errData = error.response?.data?.error || error.message;
    console.error("❌ ইউজার কিক করতে সমস্যা:", JSON.stringify(errData));
    throw error;
  }
}

/**
 * ইউজারের প্রোফাইল তথ্য নেওয়া
 * @param {string} userId
 */
async function getUserProfile(userId) {
  try {
    const response = await axios.get(`${FB_API_BASE}/${userId}`, {
      params: {
        fields: "name,first_name",
        access_token: PAGE_ACCESS_TOKEN,
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ প্রোফাইল আনতে সমস্যা:", error.message);
    return { name: "অজানা ইউজার" };
  }
}

module.exports = { sendMessage, kickUserFromGroup, getUserProfile };
