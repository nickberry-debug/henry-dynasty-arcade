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
	print("INPUT: quick tap, one-shot delivery, keyboard repeat PASS")
	quit(0)
