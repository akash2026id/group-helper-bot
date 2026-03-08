require("dotenv").config();
const express = require("express");
const { processCommand } = require("../src/commandHandler");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get("/", (req, res) => {
  res.json({ status: "✅ চালু আছে", bot: "Group Helper Bot" });
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
  for (const entry of body.entry) {
    for (const event of (entry.messaging || [])) {
      if (event.message && !event.message.is_echo && event.message.text) {
        await processCommand(event.sender?.id, event.recipient?.id, event.message.text);
      }
    }
  }
});

module.exports = app;
