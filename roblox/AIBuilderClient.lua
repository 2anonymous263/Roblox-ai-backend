local ReplicatedStorage = game:GetService("ReplicatedStorage")

local BuildWithAI = ReplicatedStorage:WaitForChild("BuildWithAI")

local screenGui = script.Parent
local inputBox = screenGui:WaitForChild("InputBox")
local buildButton = screenGui:WaitForChild("SendButton")
local responseLabel = screenGui:WaitForChild("ResponseLabel")

local busy = false

local function ensureCorner(parent, radius)
	local corner = parent:FindFirstChildOfClass("UICorner") or Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = parent
	return corner
end

local function ensureStroke(parent, color, transparency, thickness)
	local stroke = parent:FindFirstChildOfClass("UIStroke") or Instance.new("UIStroke")
	stroke.Color = color
	stroke.Transparency = transparency
	stroke.Thickness = thickness
	stroke.Parent = parent
	return stroke
end

local function ensurePadding(parent, left, right, top, bottom)
	local padding = parent:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0, left)
	padding.PaddingRight = UDim.new(0, right)
	padding.PaddingTop = UDim.new(0, top)
	padding.PaddingBottom = UDim.new(0, bottom)
	padding.Parent = parent
	return padding
end

local function buildPrettyLayout()
	screenGui.ResetOnSpawn = false
	screenGui.IgnoreGuiInset = true

	local backdrop = screenGui:FindFirstChild("AIBuilderBackdrop")
	if not backdrop then
		backdrop = Instance.new("Frame")
		backdrop.Name = "AIBuilderBackdrop"
		backdrop.BackgroundColor3 = Color3.fromRGB(7, 11, 20)
		backdrop.BorderSizePixel = 0
		backdrop.Size = UDim2.fromScale(1, 1)
		backdrop.Position = UDim2.fromScale(0, 0)
		backdrop.BackgroundTransparency = 1
		backdrop.Visible = false
		backdrop.ZIndex = 0
		backdrop.Parent = screenGui
	end

	local panel = screenGui:FindFirstChild("AIBuilderPanel")
	if not panel then
		panel = Instance.new("Frame")
		panel.Name = "AIBuilderPanel"
		panel.AnchorPoint = Vector2.new(1, 1)
		panel.Position = UDim2.new(1, -28, 1, -28)
		panel.Size = UDim2.new(0, 500, 0, 340)
		panel.BackgroundColor3 = Color3.fromRGB(12, 18, 31)
		panel.BackgroundTransparency = 0.08
		panel.BorderSizePixel = 0
		panel.ZIndex = 10
		panel.Parent = screenGui

		local panelGradient = Instance.new("UIGradient")
		panelGradient.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(20, 31, 53)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(10, 15, 26))
		})
		panelGradient.Rotation = 90
		panelGradient.Parent = panel

		ensureCorner(panel, 24)
		ensureStroke(panel, Color3.fromRGB(74, 190, 255), 0.2, 2)
		ensurePadding(panel, 18, 18, 18, 18)

		local glow = Instance.new("Frame")
		glow.Name = "Glow"
		glow.AnchorPoint = Vector2.new(1, 0)
		glow.Position = UDim2.new(1, 20, 0, -16)
		glow.Size = UDim2.new(0, 220, 0, 90)
		glow.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
		glow.BackgroundTransparency = 0.82
		glow.BorderSizePixel = 0
		glow.ZIndex = 10
		glow.Parent = panel
		ensureCorner(glow, 999)

		local title = Instance.new("TextLabel")
		title.Name = "Title"
		title.BackgroundTransparency = 1
		title.Position = UDim2.new(0, 0, 0, 0)
		title.Size = UDim2.new(1, -140, 0, 36)
		title.Font = Enum.Font.GothamBold
		title.Text = "Roblox AI Builder"
		title.TextColor3 = Color3.fromRGB(244, 248, 255)
		title.TextSize = 24
		title.TextXAlignment = Enum.TextXAlignment.Left
		title.ZIndex = 12
		title.Parent = panel

		local badge = Instance.new("TextLabel")
		badge.Name = "Badge"
		badge.AnchorPoint = Vector2.new(1, 0)
		badge.Position = UDim2.new(1, -36, 0, 0)
		badge.Size = UDim2.new(0, 96, 0, 30)
		badge.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
		badge.BackgroundTransparency = 0.12
		badge.BorderSizePixel = 0
		badge.Font = Enum.Font.GothamBold
		badge.Text = "LIVE BUILD"
		badge.TextColor3 = Color3.fromRGB(255, 255, 255)
		badge.TextSize = 12
		badge.ZIndex = 12
		badge.Parent = panel
		ensureCorner(badge, 12)

		local closeButton = Instance.new("TextButton")
		closeButton.Name = "CloseButton"
		closeButton.AnchorPoint = Vector2.new(1, 0)
		closeButton.Position = UDim2.new(1, 0, 0, 0)
		closeButton.Size = UDim2.new(0, 28, 0, 28)
		closeButton.BackgroundTransparency = 1
		closeButton.BorderSizePixel = 0
		closeButton.Font = Enum.Font.GothamBold
		closeButton.Text = "X"
		closeButton.TextColor3 = Color3.fromRGB(170, 182, 205)
		closeButton.TextSize = 16
		closeButton.ZIndex = 12
		closeButton.Parent = panel

		local subtitle = Instance.new("TextLabel")
		subtitle.Name = "Subtitle"
		subtitle.BackgroundTransparency = 1
		subtitle.Position = UDim2.new(0, 0, 0, 36)
		subtitle.Size = UDim2.new(1, 0, 0, 24)
		subtitle.Font = Enum.Font.Gotham
		subtitle.Text = "Beschrijf wat je wilt bouwen en laat de AI direct objecten maken."
		subtitle.TextColor3 = Color3.fromRGB(152, 168, 193)
		subtitle.TextSize = 13
		subtitle.TextXAlignment = Enum.TextXAlignment.Left
		subtitle.ZIndex = 12
		subtitle.Parent = panel
	end

	local reopenButton = screenGui:FindFirstChild("AIBuilderOpenButton")
	if not reopenButton then
		reopenButton = Instance.new("TextButton")
		reopenButton.Name = "AIBuilderOpenButton"
		reopenButton.AnchorPoint = Vector2.new(1, 1)
		reopenButton.Position = UDim2.new(1, -28, 1, -28)
		reopenButton.Size = UDim2.new(0, 150, 0, 50)
		reopenButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
		reopenButton.BackgroundTransparency = 0.08
		reopenButton.BorderSizePixel = 0
		reopenButton.Font = Enum.Font.GothamBold
		reopenButton.Text = "Open AI Builder"
		reopenButton.TextColor3 = Color3.fromRGB(255, 255, 255)
		reopenButton.TextSize = 16
		reopenButton.Visible = false
		reopenButton.ZIndex = 20
		reopenButton.Parent = screenGui
		ensureCorner(reopenButton, 14)
		ensureStroke(reopenButton, Color3.fromRGB(190, 240, 255), 0.45, 1.5)
	end

	inputBox.Parent = panel
	buildButton.Parent = panel
	responseLabel.Parent = panel

	inputBox.ClearTextOnFocus = false
	inputBox.MultiLine = true
	inputBox.TextWrapped = true
	inputBox.TextScaled = false
	inputBox.TextXAlignment = Enum.TextXAlignment.Left
	inputBox.TextYAlignment = Enum.TextYAlignment.Top
	inputBox.Font = Enum.Font.Code
	inputBox.PlaceholderText = "Bijvoorbeeld: maak een futuristische lobby met spawnpad, neon pilaren en een shop UI..."
	inputBox.PlaceholderColor3 = Color3.fromRGB(117, 133, 160)
	inputBox.TextColor3 = Color3.fromRGB(240, 246, 255)
	inputBox.TextStrokeTransparency = 1
	inputBox.TextSize = 16
	inputBox.BackgroundColor3 = Color3.fromRGB(16, 25, 42)
	inputBox.BorderSizePixel = 0
	inputBox.Position = UDim2.new(0, 0, 0, 78)
	inputBox.Size = UDim2.new(1, -130, 0, 92)
	inputBox.ZIndex = 12
	ensureCorner(inputBox, 18)
	ensureStroke(inputBox, Color3.fromRGB(75, 114, 165), 0.38, 1.5)
	ensurePadding(inputBox, 18, 18, 16, 16)

	buildButton.Font = Enum.Font.GothamBold
	buildButton.Text = "Bouw"
	buildButton.TextColor3 = Color3.fromRGB(255, 255, 255)
	buildButton.TextSize = 20
	buildButton.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
	buildButton.BorderSizePixel = 0
	buildButton.AutoButtonColor = true
	buildButton.Position = UDim2.new(1, -112, 0, 78)
	buildButton.Size = UDim2.new(0, 112, 0, 92)
	buildButton.ZIndex = 12
	ensureCorner(buildButton, 20)
	ensureStroke(buildButton, Color3.fromRGB(190, 240, 255), 0.45, 1.5)

	responseLabel.BackgroundColor3 = Color3.fromRGB(10, 15, 26)
	responseLabel.BackgroundTransparency = 0.18
	responseLabel.BorderSizePixel = 0
	responseLabel.Position = UDim2.new(0, 0, 0, 186)
	responseLabel.Size = UDim2.new(1, 0, 1, -186)
	responseLabel.Font = Enum.Font.GothamMedium
	responseLabel.TextColor3 = Color3.fromRGB(231, 238, 250)
	responseLabel.TextSize = 13
	responseLabel.TextScaled = false
	responseLabel.TextStrokeTransparency = 1
	responseLabel.TextTransparency = 0
	responseLabel.TextWrapped = true
	responseLabel.TextXAlignment = Enum.TextXAlignment.Left
	responseLabel.TextYAlignment = Enum.TextYAlignment.Top
	responseLabel.RichText = false
	responseLabel.Text = "Klaar voor een nieuwe build."
	responseLabel.ZIndex = 12
	ensureCorner(responseLabel, 20)
	ensureStroke(responseLabel, Color3.fromRGB(69, 88, 122), 0.45, 1.5)
	ensurePadding(responseLabel, 18, 18, 18, 18)

	local closeButton = panel:FindFirstChild("CloseButton")
	if closeButton and closeButton:IsA("TextButton") then
		closeButton.MouseButton1Click:Connect(function()
			panel.Visible = false
			reopenButton.Visible = true
		end)
	end

	reopenButton.MouseButton1Click:Connect(function()
		panel.Visible = true
		reopenButton.Visible = false
	end)
end

buildPrettyLayout()

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
