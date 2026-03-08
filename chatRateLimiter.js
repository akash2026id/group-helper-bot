/**
 * চ্যাটবট রেট লিমিটার
 * প্রতিটি ইউজার প্রতি ঘন্টায় সর্বোচ্চ ৫টি মেসেজ পাঠাতে পারবে
 */

const userMessageCounts = new Map(); // { userId: { count, resetTime } }

const HOURLY_LIMIT = 5;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * ইউজার মেসেজ পাঠাতে পারবে কিনা চেক করে
 * @param {string} userId 
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userData = userMessageCounts.get(userId);

  // নতুন ইউজার বা রিসেট টাইম পার হয়ে গেছে
  if (!userData || now >= userData.resetTime) {
    userMessageCounts.set(userId, {
      count: 1,
      resetTime: now + ONE_HOUR_MS,
    });
    return {
      allowed: true,
      remaining: HOURLY_LIMIT - 1,
      resetIn: ONE_HOUR_MS,
    };
  }

  // লিমিট পার হয়ে গেছে
  if (userData.count >= HOURLY_LIMIT) {
    const resetIn = userData.resetTime - now;
    const resetMinutes = Math.ceil(resetIn / 60000);
    return {
      allowed: false,
      remaining: 0,
      resetIn: resetIn,
      resetMinutes: resetMinutes,
    };
  }

  // কাউন্ট বাড়াও
  userData.count += 1;
  userMessageCounts.set(userId, userData);

  return {
    allowed: true,
    remaining: HOURLY_LIMIT - userData.count,
    resetIn: userData.resetTime - now,
  };
}

/**
 * ইউজারের বাকি মেসেজ কতটা আছে দেখাও
 */
function getRemainingMessages(userId) {
  const now = Date.now();
  const userData = userMessageCounts.get(userId);

  if (!userData || now >= userData.resetTime) {
    return HOURLY_LIMIT;
  }

  return Math.max(0, HOURLY_LIMIT - userData.count);
}

module.exports = { checkRateLimit, getRemainingMessages, HOURLY_LIMIT };
