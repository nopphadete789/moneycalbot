const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// เก็บยอดชั่วคราว (in-memory)
let trip = [];

function replyMessage(replyToken, text) {
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.LINE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });
}

app.post("/webhook", async (req, res) => {
  const event = req.body.events[0];
  const msg = event.message.text.trim();
  let reply = "❓ ไม่เข้าใจคำสั่ง";

  // 1️⃣ หารเท่ากัน
  if (msg.match(/^หาร\s\d+\s\d+$/)) {
    const [, total, people] = msg.split(" ");
    reply = `💸 คนละ ${(total / people).toFixed(2)} บาท`;
  }

  // 2️⃣ มีคนจ่ายก่อน
  else if (msg.match(/^\w+\sจ่าย\s\d+\sหาร\s\d+$/)) {
    const parts = msg.split(" ");
    const name = parts[0];
    const total = Number(parts[2]);
    const people = Number(parts[4]);
    const per = total / people;

    trip.push({ name, paid: total, share: per });

    reply =
      `🧾 ${name} จ่าย ${total} บาท\n` +
      `👥 ${people} คน → คนละ ${per.toFixed(2)} บาท`;
  }

  // 3️⃣ หารไม่เท่ากัน
  else if (msg.match(/^(\w+\s\d+\s?)+$/)) {
    trip = [];
    const parts = msg.split(" ");
    let sum = 0;

    for (let i = 0; i < parts.length; i += 2) {
      trip.push({ name: parts[i], paid: Number(parts[i + 1]) });
      sum += Number(parts[i + 1]);
    }

    reply = "📊 หารไม่เท่ากัน\nรวม " + sum + " บาท";
  }

  // 4️⃣ สรุปทั้งทริป
  else if (msg === "สรุป") {
    if (trip.length === 0) {
      reply = "ยังไม่มีข้อมูลทริป ❌";
    } else {
      reply = "📌 สรุปทริป\n";
      trip.forEach(p => {
        reply += `- ${p.name}: ${p.paid} บาท\n`;
      });
    }
  }

  // 5️⃣ ภาษาไทยธรรมชาติ
  else if (msg.match(/^กินข้าว\s\d+\s\d+\sคน$/)) {
    const parts = msg.split(" ");
    const total = Number(parts[1]);
    const people = Number(parts[2]);
    reply = `🍽️ กินข้าว\nคนละ ${(total / people).toFixed(2)} บาท`;
  }

  await replyMessage(event.replyToken, reply);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
