import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import client from "./db/mongoClient.js";
import { logChat } from "./utils/logChat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const wilmaInfo = process.env.WILMA_BOT_INFO;

if (!wilmaInfo) {
  console.error("WILMA_BOT_INFO är inte definierad i .env-filen!");
  process.exit(1);
}

// --- Middleware ---
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(cors({
  origin: function(origin, callback){
    if (!origin) return callback(null, true); // tillåt Postman, curl osv utan origin
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS-policy: Denna origin är inte tillåten."));
    }
  }
}));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({ code: "RATE_LIMIT", message: "Too many requests" });
  },
});

app.use("/api/chat", limiter);
app.use(express.json());

// --- Din Chat-endpoint ---
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: wilmaInfo },
        { role: "user", content: userMessage },
      ],
    });

    const botReply = chatCompletion.choices[0].message.content;

    await logChat(userMessage, botReply); // logga till MongoDB

    res.json({ reply: botReply });
  } catch (error) {
    console.error("Fel i /api/chat:", error);
    res.status(500).json({ reply: "Oj, något gick fel på servern!" });
  }
});

// --- Starta servern och koppla till MongoDB ---
async function startServer() {
  try {
    await client.connect();
    console.log("✅ Ansluten till MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Servern körs på http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Kunde inte ansluta till MongoDB:", error);
    process.exit(1);
  }
}

startServer();
