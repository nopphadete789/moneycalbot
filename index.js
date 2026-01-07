const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// ===== DATA =====
let trips = {}; // แยกตาม groupId

function getTrip(groupId) {
  if (!trips[groupId]) {
    trips[groupId] = [];
  }
  return trips[groupId];
}

// ===== REPLY =====
async function replyMessage(replyToken, text) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
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

// ===== WEBHOOK =====
app.post("/webhook", async (req, res) => {
  const event = req.body.events?.[0];
  if (!event) return res.sendStatus(200);

  const groupId =
    event.source.groupId ||
    event.source.roomId ||
    event.source.userId;

  const trip = getTrip(groupId);
  let reply = "❓ ไม่เข้าใจคำสั่ง";

  // ===== STAGE 4: รับรูปสลิป =====
  if (event.message.type === "image") {
    reply = "📸 รับสลิปแล้ว (กำลังเตรียมสแกน)";
    await replyMessage(event.replyToken, reply);
    return res.sendStatus(200);
  }

  if (event.message.type !== "text") {
    return res.sendStatus(200);
  }

  const msg = event.message.text.trim();

  // ===== STAGE 1: ควบคุมทริป =====
  if (msg === "เริ่มทริป" || msg === "ล้างทริป") {
    trips[groupId] = [];
    reply = "✅ เริ่มทริปใหม่แล้ว";
  }

  else if (msg === "สถานะ") {
    if (trip.length === 0) {
      reply = "📭 ยังไม่มีข้อมูลในทริป";
    } else {
      let sum = 0;
      reply = "📊 สถานะทริป\n";
      trip.forEach(p => {
        reply += `- ${p.name}: ${p.paid} บาท\n`;
        sum += p.paid;
      });
      reply += `รวม ${sum} บาท`;
    }
  }

  // ===== STAGE 2: มีคนจ่ายก่อน =====
  else if (msg.match(/^\w+\sจ่าย\s\d+\sหาร\s\d+$/)) {
    const [name,, total,, people] = msg.split(" ");
    const per = total / people;

    trip.push({ name, paid: Number(total) });

    reply =
      `🧾 ${name} จ่าย ${total} บาท\n` +
      `👥 ${people} คน → คนละ ${per.toFixed(2)} บาท`;
  }

  // ===== STAGE 2: หารไม่เท่ากัน =====
  else if (msg.match(/^(\w+\s\d+\s?)+$/)) {
    trip.length = 0;
    const parts = msg.split(" ");

    for (let i = 0; i < parts.length; i += 2) {
      trip.push({
        name: parts[i],
        paid: Number(parts[i + 1])
      });
    }

    reply = "📊 บันทึกยอดแต่ละคนแล้ว";
  }

  // ===== STAGE 2: สรุปโอนเงินจริง =====
  else if (msg === "สรุป") {
    if (trip.length === 0) {
      reply = "ยังไม่มีข้อมูล ❌";
    } else {
      const total = trip.reduce((s, p) => s + p.paid, 0);
      const avg = total / trip.length;

      let creditors = [];
      let debtors = [];

      trip.forEach(p => {
        const diff = p.paid - avg;
        if (diff > 0) creditors.push({ name: p.name, amt: diff });
        else if (diff < 0) debtors.push({ name: p.name, amt: -diff });
      });

      reply = "💸 สรุปการโอน\n";
      debtors.forEach(d => {
        let remaining = d.amt;
        creditors.forEach(c => {
          if (c.amt > 0 && remaining > 0) {
            const pay = Math.min(c.amt, remaining);
            reply += `${d.name} → โอนให้ ${c.name} ${pay.toFixed(2)} บาท\n`;
            c.amt -= pay;
            remaining -= pay;
          }
        });
      });
    }
  }

  await replyMessage(event.replyToken, reply);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("MoneycalBot running");
});

