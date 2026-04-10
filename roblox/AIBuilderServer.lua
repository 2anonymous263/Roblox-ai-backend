local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Lighting = game:GetService("Lighting")
local StarterGui = game:GetService("StarterGui")

local BuildWithAI = ReplicatedStorage:WaitForChild("BuildWithAI")
local BUILD_URL = "https://YOUR-RAILWAY-URL.up.railway.app/roblox-build"
local BUILD_ROOT_NAME = "AIBuilderOutput"

local roots = {
	Workspace = workspace,
	ReplicatedStorage = ReplicatedStorage,
	StarterGui = StarterGui,
	Lighting = Lighting,
}

local supportedClasses = {
	Folder = true,
	Model = true,
	Part = true,
	SpawnLocation = true,
	PointLight = true,
	SurfaceLight = true,
	SpotLight = true,
	ScreenGui = true,
	Frame = true,
	TextLabel = true,
	TextButton = true,
	TextBox = true,
	UIPadding = true,
	UIListLayout = true,
	BoolValue = true,
	NumberValue = true,
	StringValue = true,
}

local materialMap = {
	Plastic = Enum.Material.Plastic,
	SmoothPlastic = Enum.Material.SmoothPlastic,
	Wood = Enum.Material.Wood,
	WoodPlanks = Enum.Material.WoodPlanks,
	Slate = Enum.Material.Slate,
	Concrete = Enum.Material.Concrete,
	CorrodedMetal = Enum.Material.CorrodedMetal,
	DiamondPlate = Enum.Material.DiamondPlate,
	Foil = Enum.Material.Foil,
	Grass = Enum.Material.Grass,
	Ice = Enum.Material.Ice,
	Marble = Enum.Material.Marble,
	Granite = Enum.Material.Granite,
	Brick = Enum.Material.Brick,
	Pebble = Enum.Material.Pebble,
	Sand = Enum.Material.Sand,
	Fabric = Enum.Material.Fabric,
	Glass = Enum.Material.Glass,
	Metal = Enum.Material.Metal,
	Neon = Enum.Material.Neon,
}

local normalIdMap = {
	Top = Enum.NormalId.Top,
	Bottom = Enum.NormalId.Bottom,
	Front = Enum.NormalId.Front,
	Back = Enum.NormalId.Back,
	Left = Enum.NormalId.Left,
	Right = Enum.NormalId.Right,
}

local function ensureBuildRoot()
	local existing = workspace:FindFirstChild(BUILD_ROOT_NAME)
	if existing then
		return existing
	end

	local folder = Instance.new("Folder")
	folder.Name = BUILD_ROOT_NAME
	folder.Parent = workspace
	return folder
end

local function colorFromArray(values)
	return Color3.fromRGB(values[1], values[2], values[3])
end

local function vector3FromArray(values)
	return Vector3.new(values[1], values[2], values[3])
end

local function uDim2FromArray(values)
	return UDim2.new(values[1], values[2], values[3], values[4])
end

local function resolveParent(parentKey, createdById)
	if parentKey == "Workspace" then
		return ensureBuildRoot()
	end

	if roots[parentKey] then
		return roots[parentKey]
	end

	return createdById[parentKey]
end

local function applyActionProperties(instance, action)
	if instance:IsA("BasePart") then
		if action.anchored ~= nil then
			instance.Anchored = action.anchored
		end
		if action.canCollide ~= nil then
			instance.CanCollide = action.canCollide
		end
		if action.transparency ~= nil then
			instance.Transparency = action.transparency
		end
		if action.size then
			instance.Size = vector3FromArray(action.size)
		end
		if action.position then
			instance.Position = vector3FromArray(action.position)
		end
		if action.color then
			instance.Color = colorFromArray(action.color)
		end
		if action.material and materialMap[action.material] then
			instance.Material = materialMap[action.material]
		end
	end

	if instance:IsA("PointLight") or instance:IsA("SpotLight") or instance:IsA("SurfaceLight") then
		if action.brightness ~= nil then
			instance.Brightness = action.brightness
		end
		if action.range ~= nil then
			instance.Range = action.range
		end
		if action.angle ~= nil and instance:IsA("SpotLight") then
			instance.Angle = action.angle
		end
		if action.face and instance:IsA("SurfaceLight") and normalIdMap[action.face] then
			instance.Face = normalIdMap[action.face]
		end
		if action.color then
			instance.Color = colorFromArray(action.color)
		end
	end

	if instance:IsA("GuiObject") then
		if action.uiPosition then
			instance.Position = uDim2FromArray(action.uiPosition)
		end
		if action.uiSize then
			instance.Size = uDim2FromArray(action.uiSize)
		end
		if action.anchorPoint then
			instance.AnchorPoint = Vector2.new(action.anchorPoint[1], action.anchorPoint[2])
		end
		if action.backgroundTransparency ~= nil then
			instance.BackgroundTransparency = action.backgroundTransparency
		end
		if action.backgroundColor3 then
			instance.BackgroundColor3 = colorFromArray(action.backgroundColor3)
		end
	end

	if instance:IsA("TextLabel") or instance:IsA("TextButton") or instance:IsA("TextBox") then
		if action.text ~= nil then
			instance.Text = action.text
		end
		if action.textSize ~= nil then
			instance.TextSize = action.textSize
		end
		if action.textColor3 then
			instance.TextColor3 = colorFromArray(action.textColor3)
		end
		if action.placeholderText ~= nil and instance:IsA("TextBox") then
			instance.PlaceholderText = action.placeholderText
		end
	end

	if instance:IsA("UIPadding") and action.padding then
		instance.PaddingTop = UDim.new(0, action.padding[1])
		instance.PaddingRight = UDim.new(0, action.padding[2])
		instance.PaddingBottom = UDim.new(0, action.padding[3])
		instance.PaddingLeft = UDim.new(0, action.padding[4])
	end

	if instance:IsA("UIListLayout") then
		if action.fillDirection == "Horizontal" then
			instance.FillDirection = Enum.FillDirection.Horizontal
		elseif action.fillDirection == "Vertical" then
			instance.FillDirection = Enum.FillDirection.Vertical
		end
		if action.spacing ~= nil then
			instance.Padding = UDim.new(0, action.spacing)
		end
	end

	if instance:IsA("StringValue") and action.valueString ~= nil then
		instance.Value = action.valueString
	end
	if instance:IsA("NumberValue") and action.valueNumber ~= nil then
		instance.Value = action.valueNumber
	end
	if instance:IsA("BoolValue") and action.valueBool ~= nil then
		instance.Value = action.valueBool
	end
end

local function runBuildPlan(plan)
	local createdById = {}
	local createdCount = 0

	for _, action in ipairs(plan.actions or {}) do
		if action.actionType == "create_instance" and supportedClasses[action.className] then
			local parent = resolveParent(action.parent, createdById)
			if parent then
				local instance = Instance.new(action.className)
				instance.Name = action.name
				applyActionProperties(instance, action)
				instance.Parent = parent
				createdById[action.id] = instance
				createdCount += 1
			end
		end
	end

	return createdCount
end

local function requestBuildPlan(player, message)
	local payload = {
		playerName = player.Name,
		message = message,
		context = "Build Roblox objects directly. Prefer practical builds under Workspace or StarterGui."
	}

	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = BUILD_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
			},
			Body = HttpService:JSONEncode(payload),
		})
	end)

	if not success then
		return false, "HTTP fout: backend niet bereikbaar."
	end

	if not response.Success then
		warn("Builder status code:", response.StatusCode)
		warn("Builder body:", response.Body)
		return false, "Builder request mislukt."
	end

	local decodeSuccess, data = pcall(function()
		return HttpService:JSONDecode(response.Body)
	end)

	if not decodeSuccess then
		return false, "Builder gaf ongeldige JSON terug."
	end

	return true, data
end

BuildWithAI.OnServerInvoke = function(player, message)
	local ok, result = requestBuildPlan(player, message)
	if not ok then
		return {
			ok = false,
			summary = result,
			warnings = {},
			createdCount = 0,
		}
	end

	local createdCount = runBuildPlan(result)
	return {
		ok = true,
		summary = result.summary or "Build voltooid.",
		warnings = result.warnings or {},
		createdCount = createdCount,
	}
end
