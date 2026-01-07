const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;

// webhook
app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      await axios.post(
        "https://api.line.me/v2/bot/message/reply",
        {
          replyToken: event.replyToken,
          messages: [{ type: "text", text: `รับแล้ว: ${event.message.text}` }]
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Bot running"));
