import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

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

// Middleware för att parsa JSON
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const wilmaInfo = process.env.WILMA_BOT_INFO;
if (!wilmaInfo) {
  console.error("WILMA_BOT_INFO är inte definierad i .env-filen!");
  process.exit(1);
}

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

    res.json({ reply: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Oj, något gick fel på servern!" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servern körs på http://localhost:${PORT}`);
});
