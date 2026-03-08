# 🤖 Group Helper Bot

**Facebook Messenger গ্রুপ কমান্ড বট সিস্টেম**

একটি Node.js ভিত্তিক Messenger Bot যা গ্রুপে কমান্ডের মাধ্যমে বিভিন্ন কাজ করে।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
group-helper-bot/
├── src/
│   ├── index.js            ← মূল সার্ভার (Express + Webhook)
│   ├── commandHandler.js   ← সব কমান্ড প্রসেস করে
│   ├── adminManager.js     ← Admin চেক এবং তালিকা
│   ├── messengerApi.js     ← Facebook API (মেসেজ, কিক)
│   ├── groqClient.js       ← Groq AI API (key রোটেশন সহ)
│   └── chatRateLimiter.js  ← প্রতি ঘন্টা ৫ মেসেজ লিমিট
├── data/
│   └── admins.json         ← Admin তালিকা (JSON)
├── .env.example            ← Environment variables নমুনা
├── .gitignore
├── package.json
├── vercel.json             ← Vercel deployment কনফিগ
└── README.md
```

---

## ⚡ কমান্ড তালিকা

| কমান্ড | কাজ | অনুমতি |
|--------|-----|---------|
| `/help` | সব কমান্ড দেখাবে | সবাই |
| `/kickuser [ID]` | গ্রুপ থেকে ইউজার কিক | শুধু এডমিন |
| `/adminstatus` | এডমিন তালিকা দেখাবে | সবাই |
| `/chatbot [বার্তা]` | AI চ্যাটবটে কথা বলো | সবাই (ঘণ্টায় ৫টি) |
| `/lovepartner` | লাভ পার্টনার লিংক | সবাই |
| `/support` | WhatsApp সাপোর্ট | সবাই |

---

## 🚀 সেটআপ গাইড (ধাপে ধাপে)

### ধাপ ১: Facebook Developer Account সেটআপ

1. **https://developers.facebook.com** এ যান
2. "My Apps" → "Create App" ক্লিক করুন
3. App Type: **"Business"** বা **"Consumer"** বেছে নিন
4. App তৈরি হলে Dashboard এ যান

### ধাপ ২: Messenger Product যোগ করুন

1. Dashboard এ **"Add Product"** ক্লিক করুন
2. **"Messenger"** খুঁজে "Set Up" ক্লিক করুন
3. বাম মেনুতে **"Messenger"** → **"Settings"** যান

### ধাপ ৩: Page Access Token তৈরি করুন

```
Messenger Settings → Access Tokens → "Add or Remove Pages"
→ আপনার Page বেছে নিন → Token জেনারেট করুন
```

> ⚠️ এই Token টি কপি করে রাখুন! এটি `.env` ফাইলে লাগবে।

### ধাপ ৪: প্রজেক্ট ইনস্টল করুন

```bash
# রিপো ক্লোন করুন
git clone <আপনার-রিপো-url>
cd group-helper-bot

# Dependencies ইনস্টল করুন
npm install

# .env ফাইল তৈরি করুন
cp .env.example .env
```

### ধাপ ৫: .env ফাইল কনফিগার করুন

```env
PAGE_ACCESS_TOKEN=EAAxxxxxxxx...   ← ধাপ ৩ থেকে পাওয়া token
VERIFY_TOKEN=mySecretToken123      ← যেকোনো গোপন শব্দ (আপনি ঠিক করুন)
GROQ_API_KEY_1=gsk_O04NETum...    ← আগে থেকে দেওয়া আছে
GROQ_API_KEY_2=gsk_2Ur41qES...    ← আগে থেকে দেওয়া আছে
PORT=3000
```

### ধাপ ৬: Admin তালিকা কনফিগার করুন

`data/admins.json` ফাইল খুলুন এবং Admin এর Facebook User ID যোগ করুন:

```json
{
  "admins": [
    {
      "id": "123456789012345",
      "name": "আপনার নাম",
      "addedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

> **Facebook User ID বের করার উপায়:**
> - https://www.facebook.com/profile.php খুলুন
> - URL এ `id=` এর পরের নম্বরটি হলো আপনার ID
> - অথবা Graph API Explorer ব্যবহার করুন

---

## 🌐 Deployment গাইড

### Option A: Vercel (সবচেয়ে সহজ - বিনামূল্যে)

```bash
# Vercel CLI ইনস্টল করুন
npm install -g vercel

# Deploy করুন
vercel

# Production deploy
vercel --prod
```

**Vercel Dashboard এ Environment Variables যোগ করুন:**
- Settings → Environment Variables
- সব `.env` এর মান একে একে যোগ করুন

### Option B: Railway (খুব সহজ)

1. **https://railway.app** এ যান
2. "New Project" → "Deploy from GitHub"
3. আপনার রিপো বেছে নিন
4. Variables ট্যাবে `.env` এর সব মান দিন
5. Deploy হবে স্বয়ংক্রিয়ভাবে!

### Option C: Render (বিনামূল্যে)

1. **https://render.com** এ যান
2. "New" → "Web Service"
3. GitHub রিপো সংযুক্ত করুন
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
5. Environment Variables যোগ করুন

---

## 📡 Webhook সেটআপ গাইড

Deploy হওয়ার পর আপনার URL পাবেন। যেমন:
```
https://group-helper-bot.vercel.app
```

### Facebook এ Webhook রেজিস্টার করুন:

1. Facebook Developer Dashboard → **Messenger** → **Settings**
2. **"Webhooks"** সেকশনে "Add Callback URL" ক্লিক করুন
3. নিচের তথ্য দিন:

```
Callback URL: https://আপনার-ডোমেইন.com/webhook
Verify Token: mySecretToken123   ← .env এর VERIFY_TOKEN
```

4. **Subscription Fields** বেছে নিন:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `message_deliveries`
   - ✅ `message_reads`

5. "Verify and Save" ক্লিক করুন
6. আপনার Page এর Webhook Subscribe করুন

### ✅ Webhook যাচাই করুন:

```bash
# Browser এ এই URL খুলুন:
https://আপনার-ডোমেইন.com/webhook?hub.mode=subscribe&hub.verify_token=mySecretToken123&hub.challenge=test123

# উত্তর: test123 দেখালে সফল!
```

---

## 🧪 লোকালি টেস্ট করুন (ngrok দিয়ে)

```bash
# ngrok ইনস্টল করুন: https://ngrok.com
ngrok http 3000

# Forwarding URL পাবেন:
# https://abc123.ngrok.io → এটা Webhook URL হিসেবে দিন
```

---

## 🔧 Admin যোগ/বাদ দেওয়া

`data/admins.json` ফাইল সরাসরি এডিট করুন:

```json
{
  "admins": [
    { "id": "111111111111111", "name": "Admin রহিম", "addedAt": "2025-01-01T00:00:00.000Z" },
    { "id": "222222222222222", "name": "Admin করিম", "addedAt": "2025-01-15T00:00:00.000Z" }
  ]
}
```

> ⚠️ পরিবর্তনের পর সার্ভার রিস্টার্ট করুন।

---

## ❓ সমস্যা সমাধান

### বট রেসপন্ড করছে না?
- PAGE_ACCESS_TOKEN সঠিক কিনা চেক করুন
- Webhook subscribe হয়েছে কিনা দেখুন
- Server logs চেক করুন

### /chatbot কাজ করছে না?
- GROQ_API_KEY_1 এবং GROQ_API_KEY_2 সেট আছে কিনা দেখুন
- Groq Dashboard এ quota চেক করুন

### /kickuser কাজ করছে না?
- বটের Page টি গ্রুপের Admin হতে হবে
- Page Access Token এ `groups_access_member_info` permission লাগবে

---

## 📞 সাপোর্ট

WhatsApp: https://wa.me/8801966061084

---

*Group Helper Bot v1.0 — Made with ' Mr Abuhurira ' in Bangladesh*🤝💋😎
