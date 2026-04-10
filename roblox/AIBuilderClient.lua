local ReplicatedStorage = game:GetService("ReplicatedStorage")

local BuildWithAI = ReplicatedStorage:WaitForChild("BuildWithAI")

local screenGui = script.Parent
local inputBox = screenGui:WaitForChild("InputBox")
local buildButton = screenGui:WaitForChild("SendButton")
local responseLabel = screenGui:WaitForChild("ResponseLabel")

local busy = false

local function sendBuildRequest()
	if busy then
		return
	end

	local message = inputBox.Text
	if typeof(message) ~= "string" or message:gsub("%s+", "") == "" then
		responseLabel.Text = "Typ eerst wat de builder moet maken."
		return
	end

	busy = true
	buildButton.Text = "Bouwen..."
	responseLabel.Text = "AI maakt een build-plan..."

	local success, result = pcall(function()
		return BuildWithAI:InvokeServer(message)
	end)

	if not success then
		responseLabel.Text = "Builder call mislukte."
		warn("BuildWithAI fout:", result)
	else
		local summary = result.summary or "Build afgerond."
		local warnings = result.warnings or {}
		local details = {
			summary,
			string.format("Bron: %s", result.source or "onbekend"),
			string.format("Acties: %d", result.actionCount or 0),
			string.format("Gemaakte objecten: %d", result.createdCount or 0),
		}

		if #warnings > 0 then
			table.insert(details, "Waarschuwingen:")
			for index, warning in ipairs(warnings) do
				if index > 3 then
					break
				end
				table.insert(details, "- " .. warning)
			end
		end

		if (result.createdCount or 0) == 0 then
			table.insert(details, "Geen objecten gemaakt. Check de Output voor backend details.")
		end

		responseLabel.Text = table.concat(details, "\n")
	end

	buildButton.Text = "Bouw"
	busy = false
end

buildButton.MouseButton1Click:Connect(sendBuildRequest)

inputBox.FocusLost:Connect(function(enterPressed)
	if enterPressed then
		sendBuildRequest()
	end
end)
