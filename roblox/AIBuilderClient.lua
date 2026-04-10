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
		if #warnings > 0 then
			summary = summary .. "\nWaarschuwing: " .. warnings[1]
		end
		responseLabel.Text = string.format("%s\nGemaakte objecten: %d", summary, result.createdCount or 0)
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
