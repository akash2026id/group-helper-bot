/**
 * Admin ম্যানেজার
 * JSON ফাইল থেকে admin তালিকা লোড করে এবং permission চেক করে
 */

const fs = require("fs");
const path = require("path");

const ADMINS_FILE = path.join(__dirname, "../data/admins.json");

/**
 * JSON ফাইল থেকে admin তালিকা লোড করে
 */
function loadAdmins() {
  try {
    const data = fs.readFileSync(ADMINS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.admins || [];
  } catch (err) {
    console.error("❌ admins.json লোড করতে সমস্যা:", err.message);
    return [];
  }
}

/**
 * কোনো ইউজার admin কিনা চেক করে
 * @param {string} userId - Facebook User ID
 */
function isAdmin(userId) {
  const admins = loadAdmins();
  return admins.some((admin) => admin.id === String(userId));
}

/**
 * সব admin এর তালিকা ফরম্যাট করে ফেরত দেয়
 */
function getAdminList() {
  const admins = loadAdmins();

  if (admins.length === 0) {
    return "👑 গ্রুপ এডমিন তালিকা:\n\n(কোনো এডমিন পাওয়া যায়নি)";
  }

  let list = "👑 গ্রুপ এডমিন তালিকা:\n\n";
  admins.forEach((admin, index) => {
    list += `${index + 1}. ${admin.name}\n`;
  });

  return list.trim();
}

module.exports = { isAdmin, getAdminList, loadAdmins };
