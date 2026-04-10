# Roblox AI Backend

Deze backend draait op Express en is bedoeld als veilige serverlaag tussen Roblox Studio en de OpenAI API.

## Endpoints

- `GET /`
  Retourneert basisinformatie over de server.
- `GET /health`
  Laat zien of de server draait en of `OPENAI_API_KEY` aanwezig is.
- `POST /roblox-ai`
  Stuurt een bericht door naar OpenAI en retourneert een antwoord als JSON.
- `POST /roblox-build`
  Retourneert een gestructureerd build-plan voor Roblox objecten en UI.

## Vereiste Railway variabelen

- `OPENAI_API_KEY`
  Je OpenAI API key.
- `OPENAI_MODEL`
  Optioneel. Standaard: `gpt-4.1-mini`
- `OPENAI_BUILDER_MODEL`
  Optioneel. Standaard: zelfde als `OPENAI_MODEL`

## Railway stappen

1. Push deze repository naar GitHub.
2. Koppel de GitHub repository in Railway.
3. Voeg in Railway bij Variables minimaal `OPENAI_API_KEY` toe.
4. Voeg optioneel `OPENAI_MODEL` toe als je een ander model wilt gebruiken.
5. Deploy de service opnieuw.
6. Controleer daarna `https://jouw-railway-url/health`

Als alles goed staat, krijg je daar JSON terug met `ok: true` en `hasOpenAIKey: true`.

## Voorbeeld request

```json
{
  "playerName": "Gebruiker123",
  "message": "Maak een Roblox Lua script voor een deur die opent bij proximity prompt.",
  "context": "Het spel is een horror map met meerdere deuren."
}
```

## Voorbeeld response

```json
{
  "reply": "Hier is een Roblox Lua voorbeeld ..."
}
```

## Builder request voorbeeld

```json
{
  "playerName": "Gebruiker123",
  "message": "Maak een kleine lobby met spawnplatform, 3 neon pilaren en een simpele build UI.",
  "context": "Houd het compact en plaats objecten veilig."
}
```

## Builder response voorbeeld

```json
{
  "summary": "Ik maak een kleine sci-fi lobby met een simpele UI.",
  "warnings": [],
  "actions": [
    {
      "actionType": "create_instance",
      "id": "spawn_pad",
      "parent": "Workspace",
      "className": "SpawnLocation",
      "name": "SpawnPad",
      "anchored": true,
      "size": [12, 1, 12],
      "position": [0, 3, 0],
      "color": [85, 170, 255],
      "material": "Neon"
    }
  ]
}
```

## Echte AI builder

De chat-endpoint geeft alleen tekst terug. De builder-endpoint geeft uitvoerbare acties terug die Roblox automatisch kan toepassen.

Voorbeeldbestanden in deze repo:

- `roblox/AIBuilderServer.lua`
- `roblox/AIBuilderClient.lua`

Gebruik hiervoor in `ReplicatedStorage` een `RemoteFunction` met naam `BuildWithAI`.

De builder kan nu automatisch:

- Parts en SpawnLocations maken
- Models en Folders opbouwen
- Lights toevoegen
- Simpele ScreenGui, Frames, Buttons, Labels en TextBoxes maken
- Values en layout-objecten maken

Belangrijke grens:

- Een normale game-script setup kan niet betrouwbaar scriptbroncode in Studio herschrijven.
- Voor volledig autonoom scripts aanmaken en aanpassen heb je uiteindelijk een Roblox Studio plugin nodig.
- Deze versie is dus een echte object/UI builder, nog geen volledige plugin-agent voor Studio zelf.

## Roblox Studio voorbeeld

Gebruik dit in een server-side Script met `HttpService` aan:

```lua
local HttpService = game:GetService("HttpService")

local RAILWAY_URL = "https://jouw-app.up.railway.app/roblox-ai"

local payload = {
	playerName = "Speler123",
	message = "Schrijf een script voor een leaderboard met coins.",
	context = "Gebruik Roblox Lua en leg kort uit hoe ik het plaats."
}

local success, response = pcall(function()
	return HttpService:PostAsync(
		RAILWAY_URL,
		HttpService:JSONEncode(payload),
		Enum.HttpContentType.ApplicationJson
	)
end)

if success then
	local data = HttpService:JSONDecode(response)
	print(data.reply)
else
	warn("Request mislukt:", response)
end
```

## Roblox AI builder setup

1. Maak in `ReplicatedStorage` een `RemoteFunction` genaamd `BuildWithAI`.
2. Zet `roblox/AIBuilderServer.lua` in `ServerScriptService`.
3. Zet `roblox/AIBuilderClient.lua` onder een `ScreenGui` met:
   - `InputBox`
   - `SendButton`
   - `ResponseLabel`
4. Vervang in `AIBuilderServer.lua`:

```lua
local BUILD_URL = "https://YOUR-RAILWAY-URL.up.railway.app/roblox-build"
```

met jouw echte Railway URL.
5. Zet in Roblox Studio `Game Settings > Security > Enable HTTP Requests` aan.

Daarna kun je prompts sturen zoals:

- `maak een kleine lobby met spawn pad en 4 pilaren`
- `maak een shop ui met titel en twee knoppen`
- `maak een spawn area met neon vloer en lampen`

## Lokaal starten

```bash
cp .env.example .env
npm start
```

De server gebruikt automatisch `PORT` van Railway of lokaal poort `3000`.
