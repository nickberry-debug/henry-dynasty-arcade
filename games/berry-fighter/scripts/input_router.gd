extends RefCounted

var previous: Array = [{}, {}]
var touch: Dictionary = {}
var pad_names: String = "Keyboard ready"
var queued: Array = [{}, {}]

func capture(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var keysets: Array = [
			{KEY_SPACE: "jump", KEY_J: "light", KEY_K: "heavy", KEY_L: "special", KEY_E: "dodge"},
			{KEY_UP: "jump", KEY_M: "light", KEY_COMMA: "heavy", KEY_PERIOD: "special", KEY_SLASH: "dodge"}]
		for player in range(2):
			if keysets[player].has(event.physical_keycode): queued[player][keysets[player][event.physical_keycode]] = true
	if event is InputEventJoypadButton and event.pressed:
		var pads: Array[int] = Input.get_connected_joypads()
		var player: int = pads.find(event.device)
		var mapping: Dictionary = {JOY_BUTTON_A: "jump", JOY_BUTTON_X: "light", JOY_BUTTON_Y: "heavy", JOY_BUTTON_B: "special", JOY_BUTTON_RIGHT_SHOULDER: "dodge"}
		if player >= 0 and player < 2 and mapping.has(event.button_index): queued[player][mapping[event.button_index]] = true

func set_touch(action: String, down: bool) -> void:
	touch[action] = down
	if down: queued[0][action] = true

func reset() -> void:
	previous = [{}, {}]
	queued = [{}, {}]
	touch.clear()

func read(player: int) -> Dictionary:
	var keys: Dictionary = {"left": KEY_A, "right": KEY_D, "jump": KEY_SPACE, "down": KEY_S,
		"light": KEY_J, "heavy": KEY_K, "special": KEY_L, "shield": KEY_SHIFT, "dodge": KEY_E}
	if player == 1:
		keys = {"left": KEY_LEFT, "right": KEY_RIGHT, "jump": KEY_UP, "down": KEY_DOWN,
			"light": KEY_M, "heavy": KEY_COMMA, "special": KEY_PERIOD, "shield": KEY_N, "dodge": KEY_SLASH}
	var raw: Dictionary = {}
	for action in keys:
		raw[action] = Input.is_physical_key_pressed(keys[action]) or (player == 0 and touch.get(action, false))
	var pads: Array[int] = Input.get_connected_joypads()
	if pads.size() > player:
		var device: int = pads[player]
		var axis: float = Input.get_joy_axis(device, JOY_AXIS_LEFT_X)
		raw.left = raw.left or axis < -0.22 or Input.is_joy_button_pressed(device, JOY_BUTTON_DPAD_LEFT)
		raw.right = raw.right or axis > 0.22 or Input.is_joy_button_pressed(device, JOY_BUTTON_DPAD_RIGHT)
		raw.down = raw.down or Input.get_joy_axis(device, JOY_AXIS_LEFT_Y) > 0.6
		for action in {"jump": JOY_BUTTON_A, "light": JOY_BUTTON_X, "heavy": JOY_BUTTON_Y, "special": JOY_BUTTON_B, "shield": JOY_BUTTON_LEFT_SHOULDER, "dodge": JOY_BUTTON_RIGHT_SHOULDER}:
			var button: int = {"jump": JOY_BUTTON_A, "light": JOY_BUTTON_X, "heavy": JOY_BUTTON_Y, "special": JOY_BUTTON_B, "shield": JOY_BUTTON_LEFT_SHOULDER, "dodge": JOY_BUTTON_RIGHT_SHOULDER}[action]
			raw[action] = raw[action] or Input.is_joy_button_pressed(device, button)
	var command: Dictionary = {"x": float(raw.right) - float(raw.left), "shield": raw.shield, "down": raw.down}
	for action in ["jump", "light", "heavy", "special", "dodge"]:
		command[action] = queued[player].get(action, false) or (raw[action] and not previous[player].get(action, false))
	queued[player].clear()
	previous[player] = raw
	return command
