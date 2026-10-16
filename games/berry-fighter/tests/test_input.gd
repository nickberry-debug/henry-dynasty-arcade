extends SceneTree

func _initialize() -> void:
	var router = load("res://scripts/input_router.gd").new()
	var press: InputEventKey = InputEventKey.new()
	press.physical_keycode = KEY_SPACE
	press.pressed = true
	var release: InputEventKey = InputEventKey.new()
	release.physical_keycode = KEY_SPACE
	release.pressed = false
	router.capture(press)
	router.capture(release)
	assert(router.read(0).jump, "quick press between physics frames must be retained")
	assert(not router.read(0).jump, "queued jump fires once")
	press.echo = true
	router.capture(press)
	assert(not router.read(0).jump, "keyboard repeat cannot add jumps")
	router.bind_controllers([3, 8])
	assert(router.controller_for(1, [8]) == 8, "player two keeps their controller when player one disconnects")
	assert(router.controller_for(0, [8]) == -1, "player one cannot steal player two controller")
	router.reset()
	assert(router.controller_for(1, [8]) == 8, "pause input reset preserves assignments")
	var pad_press: InputEventJoypadButton = InputEventJoypadButton.new()
	pad_press.device = 8
	pad_press.button_index = JOY_BUTTON_A
	pad_press.pressed = true
	router.capture(pad_press)
	assert(router.read(1).jump and not router.read(0).jump, "queued pad input retains player two ownership")
	router.set_touch("light", true)
	router.set_touch("light", false)
	assert(router.read(0).light, "short touch tap is retained")
	print("INPUT: quick tap, one-shot, repeat, stable controller slots PASS")
	quit(0)
