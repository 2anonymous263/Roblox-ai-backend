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
  "Always return a useful plan with at least 4 create_instance actions unless the user explicitly asks for something tiny.",
  "Prefer reliable concrete builds over vague summaries.",
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
  "UICorner",
  "UIStroke",
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
          cornerRadius: { type: "number" },
          strokeThickness: { type: "number" },
          strokeTransparency: { type: "number" },
          strokeColor3: {
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

function createAction(action) {
  return {
    actionType: "create_instance",
    ...action
  };
}

function buildLobbyFallbackPlan() {
  return {
    summary: "Ik heb een stevige starter lobby gebouwd met spawnplatform, vloer, pilaren en verlichting.",
    warnings: [
      "Fallback-plan gebruikt om te voorkomen dat de builder leeg terugkomt."
    ],
    actions: [
      createAction({
        id: "lobby_model",
        parent: "Workspace",
        className: "Model",
        name: "AILobby"
      }),
      createAction({
        id: "spawn_pad",
        parent: "lobby_model",
        className: "SpawnLocation",
        name: "SpawnPad",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [85, 170, 255],
        size: [14, 1, 14],
        position: [0, 3, 0]
      }),
      createAction({
        id: "main_floor",
        parent: "lobby_model",
        className: "Part",
        name: "MainFloor",
        anchored: true,
        canCollide: true,
        material: "SmoothPlastic",
        color: [45, 45, 55],
        size: [42, 1, 42],
        position: [0, 2, 0]
      }),
      createAction({
        id: "pillar_1",
        parent: "lobby_model",
        className: "Part",
        name: "Pillar1",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [0, 255, 255],
        size: [2, 16, 2],
        position: [16, 10, 16]
      }),
      createAction({
        id: "pillar_2",
        parent: "lobby_model",
        className: "Part",
        name: "Pillar2",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [0, 255, 255],
        size: [2, 16, 2],
        position: [-16, 10, 16]
      }),
      createAction({
        id: "pillar_3",
        parent: "lobby_model",
        className: "Part",
        name: "Pillar3",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [0, 255, 255],
        size: [2, 16, 2],
        position: [16, 10, -16]
      }),
      createAction({
        id: "pillar_4",
        parent: "lobby_model",
        className: "Part",
        name: "Pillar4",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [0, 255, 255],
        size: [2, 16, 2],
        position: [-16, 10, -16]
      }),
      createAction({
        id: "lobby_light",
        parent: "spawn_pad",
        className: "PointLight",
        name: "SpawnGlow",
        brightness: 3,
        range: 24,
        color: [170, 255, 255]
      })
    ]
  };
}

function buildShopUiFallbackPlan() {
  return {
    summary: "Ik heb een eenvoudige shop UI gebouwd met titel en twee knoppen.",
    warnings: [
      "Fallback-plan gebruikt om te voorkomen dat de builder leeg terugkomt."
    ],
    actions: [
      createAction({
        id: "shop_gui",
        parent: "StarterGui",
        className: "ScreenGui",
        name: "AIShopGui"
      }),
      createAction({
        id: "shop_frame",
        parent: "shop_gui",
        className: "Frame",
        name: "ShopFrame",
        uiPosition: [0.5, -180, 0.5, -140],
        uiSize: [0, 360, 0, 280],
        anchorPoint: [0.5, 0.5],
        backgroundColor3: [20, 24, 35],
        backgroundTransparency: 0.08
      }),
      createAction({
        id: "shop_corner",
        parent: "shop_frame",
        className: "UICorner",
        name: "Corner",
        cornerRadius: 14
      }),
      createAction({
        id: "shop_stroke",
        parent: "shop_frame",
        className: "UIStroke",
        name: "Stroke",
        strokeThickness: 2,
        strokeTransparency: 0.15,
        strokeColor3: [0, 200, 255]
      }),
      createAction({
        id: "shop_title",
        parent: "shop_frame",
        className: "TextLabel",
        name: "Title",
        text: "AI Shop",
        textSize: 28,
        textColor3: [255, 255, 255],
        backgroundTransparency: 1,
        uiPosition: [0, 20, 0, 18],
        uiSize: [1, -40, 0, 40]
      }),
      createAction({
        id: "buy_button",
        parent: "shop_frame",
        className: "TextButton",
        name: "BuyButton",
        text: "Koop Upgrade",
        textSize: 22,
        textColor3: [255, 255, 255],
        backgroundColor3: [0, 170, 255],
        uiPosition: [0, 20, 0, 90],
        uiSize: [1, -40, 0, 56]
      }),
      createAction({
        id: "buy_button_corner",
        parent: "buy_button",
        className: "UICorner",
        name: "Corner",
        cornerRadius: 10
      }),
      createAction({
        id: "close_button",
        parent: "shop_frame",
        className: "TextButton",
        name: "CloseButton",
        text: "Sluiten",
        textSize: 20,
        textColor3: [255, 255, 255],
        backgroundColor3: [60, 70, 90],
        uiPosition: [0, 20, 0, 160],
        uiSize: [1, -40, 0, 50]
      })
    ]
  };
}

function buildObbyFallbackPlan() {
  const actions = [
    createAction({
      id: "obby_model",
      parent: "Workspace",
      className: "Model",
      name: "AIObby"
    }),
    createAction({
      id: "obby_spawn",
      parent: "obby_model",
      className: "SpawnLocation",
      name: "ObbySpawn",
      anchored: true,
      canCollide: true,
      material: "Neon",
      color: [85, 255, 127],
      size: [10, 1, 10],
      position: [0, 5, 0]
    })
  ];

  const platformPositions = [
    [0, 5, 16],
    [10, 7, 30],
    [-10, 9, 44],
    [10, 11, 58],
    [-10, 13, 72],
    [0, 15, 86]
  ];

  for (let index = 0; index < platformPositions.length; index += 1) {
    actions.push(
      createAction({
        id: `obby_platform_${index + 1}`,
        parent: "obby_model",
        className: "Part",
        name: `Platform${index + 1}`,
        anchored: true,
        canCollide: true,
        material: index % 2 === 0 ? "Neon" : "SmoothPlastic",
        color: index % 2 === 0 ? [255, 170, 0] : [255, 255, 255],
        size: [8, 1, 8],
        position: platformPositions[index]
      })
    );
  }

  return {
    summary: "Ik heb een starter obby gebouwd met spawn en meerdere platforms.",
    warnings: [
      "Fallback-plan gebruikt om te voorkomen dat de builder leeg terugkomt."
    ],
    actions
  };
}

function buildTycoonFallbackPlan() {
  return {
    summary: "Ik heb een eenvoudige tycoon startzone gebouwd met claim pad en stations.",
    warnings: [
      "Fallback-plan gebruikt om te voorkomen dat de builder leeg terugkomt."
    ],
    actions: [
      createAction({
        id: "tycoon_model",
        parent: "Workspace",
        className: "Model",
        name: "AITycoon"
      }),
      createAction({
        id: "tycoon_floor",
        parent: "tycoon_model",
        className: "Part",
        name: "TycoonFloor",
        anchored: true,
        canCollide: true,
        material: "Concrete",
        color: [80, 80, 80],
        size: [36, 1, 36],
        position: [0, 2, 0]
      }),
      createAction({
        id: "claim_pad",
        parent: "tycoon_model",
        className: "Part",
        name: "ClaimPad",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [0, 255, 127],
        size: [8, 1, 8],
        position: [0, 3, -10]
      }),
      createAction({
        id: "collector",
        parent: "tycoon_model",
        className: "Part",
        name: "Collector",
        anchored: true,
        canCollide: true,
        material: "Metal",
        color: [100, 100, 110],
        size: [6, 4, 6],
        position: [-10, 4, 8]
      }),
      createAction({
        id: "upgrader",
        parent: "tycoon_model",
        className: "Part",
        name: "Upgrader",
        anchored: true,
        canCollide: true,
        material: "Metal",
        color: [85, 170, 255],
        size: [6, 6, 6],
        position: [10, 5, 8]
      }),
      createAction({
        id: "dropper",
        parent: "tycoon_model",
        className: "Part",
        name: "Dropper",
        anchored: true,
        canCollide: true,
        material: "Metal",
        color: [255, 170, 0],
        size: [5, 5, 5],
        position: [0, 4, 14]
      })
    ]
  };
}

function buildGenericFallbackPlan() {
  return {
    summary: "Ik heb een veilige starter build gemaakt met vloer, spawn en verlichting.",
    warnings: [
      "Fallback-plan gebruikt omdat de AI geen bruikbaar build-plan teruggaf."
    ],
    actions: [
      createAction({
        id: "generic_model",
        parent: "Workspace",
        className: "Model",
        name: "AIStarterBuild"
      }),
      createAction({
        id: "generic_floor",
        parent: "generic_model",
        className: "Part",
        name: "Floor",
        anchored: true,
        canCollide: true,
        material: "SmoothPlastic",
        color: [70, 70, 80],
        size: [32, 1, 32],
        position: [0, 2, 0]
      }),
      createAction({
        id: "generic_spawn",
        parent: "generic_model",
        className: "SpawnLocation",
        name: "Spawn",
        anchored: true,
        canCollide: true,
        material: "Neon",
        color: [85, 170, 255],
        size: [10, 1, 10],
        position: [0, 3, 0]
      }),
      createAction({
        id: "generic_light",
        parent: "generic_spawn",
        className: "PointLight",
        name: "SpawnLight",
        brightness: 2.5,
        range: 20,
        color: [170, 220, 255]
      })
    ]
  };
}

function buildFallbackPlan(message) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("shop") ||
    normalized.includes("winkel") ||
    normalized.includes("store") ||
    normalized.includes("ui")
  ) {
    return buildShopUiFallbackPlan();
  }

  if (
    normalized.includes("obby") ||
    normalized.includes("parkour") ||
    normalized.includes("platform")
  ) {
    return buildObbyFallbackPlan();
  }

  if (
    normalized.includes("tycoon") ||
    normalized.includes("factory") ||
    normalized.includes("collector")
  ) {
    return buildTycoonFallbackPlan();
  }

  if (
    normalized.includes("lobby") ||
    normalized.includes("spawn") ||
    normalized.includes("hub")
  ) {
    return buildLobbyFallbackPlan();
  }

  return buildGenericFallbackPlan();
}

function isNonEmptyBuildPlan(plan) {
  return Boolean(plan && Array.isArray(plan.actions) && plan.actions.length > 0);
}

async function generateRobloxBuildPlan({
  playerName,
  message,
  context,
  systemPrompt
}) {
  const attemptPrompts = [
    systemPrompt || DEFAULT_BUILDER_PROMPT,
    [
      systemPrompt || DEFAULT_BUILDER_PROMPT,
      "This is a retry because the first answer was empty or too weak.",
      "You must return a concrete plan with multiple actions.",
      "Always include at least one visible Workspace build unless the request is clearly only UI.",
      "Do not leave actions empty."
    ].join(" ")
  ];

  for (const prompt of attemptPrompts) {
    const data = await createOpenAIResponse({
      model: OPENAI_BUILDER_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: prompt
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
                "Always prefer a build that the game can execute immediately.",
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
        strict: false,
        schema: BUILDER_SCHEMA
      }
    },
      max_output_tokens: 1200
    });

    const rawPlan = getReplyText(data);

    if (!rawPlan) {
      continue;
    }

    try {
      const parsedPlan = JSON.parse(rawPlan);

      if (isNonEmptyBuildPlan(parsedPlan)) {
        return {
          ...parsedPlan,
          source: "ai"
        };
      }
    } catch (error) {
      continue;
    }
  }

  return {
    ...buildFallbackPlan(message),
    source: "fallback"
  };
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
