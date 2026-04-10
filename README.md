# Roblox AI Backend

Deze backend draait op Express en is bedoeld als veilige serverlaag tussen Roblox Studio en de OpenAI API.

## Endpoints

- `GET /`
  Retourneert basisinformatie over de server.
- `GET /health`
  Laat zien of de server draait en of `OPENAI_API_KEY` aanwezig is.
- `POST /roblox-ai`
  Stuurt een bericht door naar OpenAI en retourneert een antwoord als JSON.

## Vereiste Railway variabelen

- `OPENAI_API_KEY`
  Je OpenAI API key.
- `OPENAI_MODEL`
  Optioneel. Standaard: `gpt-4.1-mini`

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

## Lokaal starten

```bash
cp .env.example .env
npm start
```

De server gebruikt automatisch `PORT` van Railway of lokaal poort `3000`.
