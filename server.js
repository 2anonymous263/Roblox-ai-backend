import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_BUILDER_MODEL = process.env.OPENAI_BUILDER_MODEL || OPENAI_MODEL;
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_SYSTEM_PROMPT = [
  "You are an AI assistant for a Roblox Studio building tool.",
  "Help users build Roblox games, scripts, UI, mechanics, and debugging workflows.",
  "Give practical answers that are safe, concise, and directly usable inside Roblox Studio.",
  "When useful, provide Lua examples for Roblox Studio."
].join(" ");
const DEFAULT_BUILDER_PROMPT = [
  "You are an AI Roblox builder planner that returns only structured build actions.",
  "Design practical Roblox scenes and UI from natural language prompts.",
  "Use only the supported classes and properties from the schema.",
  "Prefer small, reliable plans over ambitious unsupported ones.",
  "If a request needs custom Lua behavior, explain that briefly in warnings instead of inventing unsupported actions."
].join(" ");
const MATERIAL_ENUM = [
  "Plastic",
  "SmoothPlastic",
  "Wood",
  "WoodPlanks",
  "Slate",
  "Concrete",
  "CorrodedMetal",
  "DiamondPlate",
  "Foil",
  "Grass",
  "Ice",
  "Marble",
  "Granite",
  "Brick",
  "Pebble",
  "Sand",
  "Fabric",
  "Glass",
  "Metal",
  "Neon"
];
const SUPPORTED_BUILDER_CLASSES = [
  "Folder",
  "Model",
  "Part",
  "SpawnLocation",
  "PointLight",
  "SurfaceLight",
  "SpotLight",
  "ScreenGui",
  "Frame",
  "TextLabel",
  "TextButton",
  "TextBox",
  "UIPadding",
  "UIListLayout",
  "BoolValue",
  "NumberValue",
  "StringValue"
];
const BUILDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions", "warnings"],
  properties: {
    summary: { type: "string" },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actionType", "id", "parent", "className", "name"],
        properties: {
          actionType: {
            type: "string",
            enum: ["create_instance"]
          },
          id: { type: "string" },
          parent: { type: "string" },
          className: {
            type: "string",
            enum: SUPPORTED_BUILDER_CLASSES
          },
          name: { type: "string" },
          anchored: { type: "boolean" },
          canCollide: { type: "boolean" },
          transparency: { type: "number" },
          material: {
            type: "string",
            enum: MATERIAL_ENUM
          },
          shape: {
            type: "string",
            enum: ["Ball", "Block", "Cylinder"]
          },
          position: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "number" }
          },
          size: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "number" }
          },
          color: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "integer",
              minimum: 0,
              maximum: 255
            }
          },
          brightness: { type: "number" },
          range: { type: "number" },
          angle: { type: "number" },
          face: {
            type: "string",
            enum: ["Top", "Bottom", "Front", "Back", "Left", "Right"]
          },
          text: { type: "string" },
          placeholderText: { type: "string" },
          textSize: { type: "number" },
          backgroundTransparency: { type: "number" },
          backgroundColor3: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "integer",
              minimum: 0,
              maximum: 255
            }
          },
          textColor3: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "integer",
              minimum: 0,
              maximum: 255
            }
          },
          uiPosition: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number" }
          },
          uiSize: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number" }
          },
          anchorPoint: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "number" }
          },
          padding: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number" }
          },
          fillDirection: {
            type: "string",
            enum: ["Horizontal", "Vertical"]
          },
          spacing: { type: "number" },
          valueString: { type: "string" },
          valueNumber: { type: "number" },
          valueBool: { type: "boolean" }
        }
      }
    }
  }
};

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

async function createOpenAIResponse(body) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiError =
      data?.error?.message ||
      data?.message ||
      "Onbekende fout van de AI-provider.";

    throw new Error(apiError);
  }

  return data;
}

async function generateRobloxReply({
  playerName,
  message,
  context,
  systemPrompt
}) {
  const data = await createOpenAIResponse({
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
  });

  const reply = getReplyText(data);

  if (!reply) {
    throw new Error("De AI gaf geen bruikbare tekst terug.");
  }

  return reply;
}

async function generateRobloxBuildPlan({
  playerName,
  message,
  context,
  systemPrompt
}) {
  const data = await createOpenAIResponse({
    model: OPENAI_BUILDER_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemPrompt || DEFAULT_BUILDER_PROMPT
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
              "Goal: build Roblox objects and UI directly from this prompt.",
              "Allowed roots: Workspace, StarterGui, ReplicatedStorage, Lighting.",
              "Allowed references: previous action ids as parent values.",
              "Allowed classes: " + SUPPORTED_BUILDER_CLASSES.join(", "),
              "Return only supported actions.",
              context ? `Context: ${context}` : null,
              `Build request: ${message}`
            ]
              .filter(Boolean)
              .join("\n")
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "roblox_builder_plan",
        strict: true,
        schema: BUILDER_SCHEMA
      }
    },
    max_output_tokens: 1200
  });

  const rawPlan = getReplyText(data);

  if (!rawPlan) {
    throw new Error("De builder gaf geen JSON-plan terug.");
  }

  let parsedPlan;

  try {
    parsedPlan = JSON.parse(rawPlan);
  } catch (error) {
    throw new Error("Kon builder JSON niet parsen.");
  }

  return parsedPlan;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Roblox AI backend draait.",
    endpoint: "/roblox-ai",
    builderEndpoint: "/roblox-build",
    model: OPENAI_MODEL,
    builderModel: OPENAI_BUILDER_MODEL
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL,
    builderModel: OPENAI_BUILDER_MODEL
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

app.post("/roblox-build", async (req, res) => {
  try {
    const {
      playerName,
      message,
      context,
      systemPrompt
    } = req.body ?? {};

    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        summary: "Builder niet beschikbaar.",
        warnings: ["OPENAI_API_KEY ontbreekt op de server."],
        actions: []
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        summary: "Ongeldige invoer.",
        warnings: ["Het veld 'message' is verplicht."],
        actions: []
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        summary: "Ongeldige invoer.",
        warnings: [`Het bericht is te lang. Maximum is ${MAX_MESSAGE_LENGTH} tekens.`],
        actions: []
      });
    }

    const plan = await generateRobloxBuildPlan({
      playerName,
      message: message.trim(),
      context: typeof context === "string" ? context.trim() : "",
      systemPrompt: typeof systemPrompt === "string" ? systemPrompt.trim() : ""
    });

    res.json(plan);
  } catch (error) {
    console.error("Fout in /roblox-build:", error);
    res.status(500).json({
      summary: "Builderfout.",
      warnings: [
        error instanceof Error ? error.message : "Onbekende fout"
      ],
      actions: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});
