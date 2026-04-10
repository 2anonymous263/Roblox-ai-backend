import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_SYSTEM_PROMPT = [
  "You are an AI assistant for a Roblox Studio building tool.",
  "Help users build Roblox games, scripts, UI, mechanics, and debugging workflows.",
  "Give practical answers that are safe, concise, and directly usable inside Roblox Studio.",
  "When useful, provide Lua examples for Roblox Studio."
].join(" ");

app.use(cors());
app.use(express.json());

function getReplyText(apiResponse) {
  if (typeof apiResponse?.output_text === "string" && apiResponse.output_text.trim()) {
    return apiResponse.output_text.trim();
  }

  const output = Array.isArray(apiResponse?.output) ? apiResponse.output : [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      const text = contentItem?.text;

      if (typeof text === "string" && text.trim()) {
        return text.trim();
      }
    }
  }

  return "";
}

async function generateRobloxReply({
  playerName,
  message,
  context,
  systemPrompt
}) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt || DEFAULT_SYSTEM_PROMPT
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Player: ${playerName || "Onbekende speler"}`,
                context ? `Context: ${context}` : null,
                `Vraag: ${message}`
              ]
                .filter(Boolean)
                .join("\n")
            }
          ]
        }
      ],
      max_output_tokens: 500
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiError =
      data?.error?.message ||
      data?.message ||
      "Onbekende fout van de AI-provider.";

    throw new Error(apiError);
  }

  const reply = getReplyText(data);

  if (!reply) {
    throw new Error("De AI gaf geen bruikbare tekst terug.");
  }

  return reply;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Roblox AI backend draait.",
    endpoint: "/roblox-ai",
    model: OPENAI_MODEL
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL
  });
});

app.post("/roblox-ai", async (req, res) => {
  try {
    const {
      playerName,
      message,
      context,
      systemPrompt
    } = req.body ?? {};

    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        reply: "OPENAI_API_KEY ontbreekt op de server."
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        reply: "Het veld 'message' is verplicht."
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        reply: `Het bericht is te lang. Maximum is ${MAX_MESSAGE_LENGTH} tekens.`
      });
    }

    const reply = await generateRobloxReply({
      playerName,
      message: message.trim(),
      context: typeof context === "string" ? context.trim() : "",
      systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : ""
    });

    res.json({
      reply
    });
  } catch (error) {
    console.error("Fout in /roblox-ai:", error);
    res.status(500).json({
      reply: "Serverfout bij het ophalen van AI-output.",
      error: error instanceof Error ? error.message : "Onbekende fout"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});
