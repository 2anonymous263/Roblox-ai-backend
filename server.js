import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Roblox AI backend draait."
  });
});

app.post("/roblox-ai", async (req, res) => {
  try {
    const { playerName, message } = req.body;

    res.json({
      reply: `Hallo ${playerName || "speler"}, jij zei: ${message || "niks"}`
    });
  } catch (error) {
    console.error("Fout in /roblox-ai:", error);
    res.status(500).json({ reply: "Serverfout." });
  }
});

app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});