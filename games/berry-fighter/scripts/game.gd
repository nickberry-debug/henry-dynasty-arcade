extends Node3D

const Simulation: Script = preload("res://scripts/simulation.gd")
const Inputs: Script = preload("res://scripts/input_router.gd")
const Arena: Script = preload("res://scripts/arena_view.gd")
const Fighter: Script = preload("res://scripts/fighter_view.gd")
const GameUI: Script = preload("res://scripts/game_ui.gd")

var sim: RefCounted = Simulation.new()
var inputs: RefCounted = Inputs.new()
var arena: Node3D
var ui: CanvasLayer
var views: Array = []
var screen: String = "menu"
var selected: int = 0
var paused_match: bool = false
var cpu: bool = true
var touch_enabled: bool = false
var clock: float = 0
var pause_held: bool = false
var sounds: Dictionary = {}
var capture_frames: int = 0

func _ready() -> void:
	arena = Arena.new()
	add_child(arena)
	ui = GameUI.new()
	add_child(ui)
	ui.action.connect(handle_action)
	ui.touch_action.connect(func(value: String, down: bool) -> void: inputs.set_touch(value, down))
	Input.joy_connection_changed.connect(controller_connection_changed)
	touch_enabled = DisplayServer.is_touchscreen_available()
	for name in ["hit", "jump", "block", "ko", "click"]:
		var player: AudioStreamPlayer = AudioStreamPlayer.new()
		player.stream = load("res://assets/" + name + ".wav")
		player.volume_db = -13 if name != "hit" else -8
		add_child(player)
		sounds[name] = player
	show_menu()
	for argument in OS.get_cmdline_user_args():
		if argument == "--demo": start_match("spar")
		if argument == "--auto": cpu = true

func rebuild_fighters() -> void:
	for view in views: view.queue_free()
	views.clear()
	for f in sim.fighters:
		var view: Node3D = Fighter.new()
		add_child(view)
		view.setup(f.kind)
		views.append(view)

func show_menu() -> void:
	screen = "menu"
	paused_match = false
	inputs.reset(true)
	sim.reset("training", 0)
	sim.fighters[0].pos = Vector2(2.0, 0)
	sim.fighters[1].pos = Vector2(9.0, 0)
	rebuild_fighters()
	for view in views: view.model.scale = Vector3.ONE * 2.2
	arena.camera.size = 19.7
	arena.set_menu(true)
	ui.show_menu(selected, touch_enabled, Input.get_connected_joypads())

func start_match(mode: String) -> void:
	sim.reset(mode, selected)
	screen = "match"
	paused_match = false
	cpu = mode != "versus"
	inputs.reset(true)
	inputs.read(0)
	inputs.read(1)
	rebuild_fighters()
	arena.camera.size = 11.5
	arena.set_menu(false)
	ui.show_hud(sim, touch_enabled)

func toggle_pause() -> void:
	if screen != "match": return
	paused_match = not paused_match
	inputs.reset()
	if paused_match: ui.show_pause()
	else:
		inputs.read(0)
		inputs.read(1)
		ui.show_hud(sim, touch_enabled)

func handle_action(value: String) -> void:
	sounds.click.play()
	match value:
		"pip", "bramble":
			selected = 0 if value == "pip" else 1
			ui.show_menu(selected, touch_enabled, Input.get_connected_joypads())
		"touch":
			touch_enabled = not touch_enabled
			ui.show_menu(selected, touch_enabled, Input.get_connected_joypads())
		"menu": show_menu()
		"controls": ui.show_controls()
		"pause": toggle_pause()
		"restart": start_match(sim.mode)
		"spar": start_match("spar")
		"versus", "training": start_match(value)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and screen == "match" and not paused_match:
		toggle_pause()

func controller_connection_changed(device: int, connected: bool) -> void:
	if not connected and device in inputs.assigned_pads and screen == "match" and not paused_match:
		toggle_pause()
	if screen == "menu": ui.show_menu(selected, touch_enabled, Input.get_connected_joypads())

func _input(event: InputEvent) -> void:
	inputs.capture(event)
	if event is InputEventKey and event.physical_keycode == KEY_ESCAPE and event.pressed and not event.echo:
		toggle_pause()
	if event is InputEventJoypadButton and event.button_index == JOY_BUTTON_START and event.pressed:
		toggle_pause()

func _physics_process(_delta: float) -> void:
	if screen != "match" or paused_match: return
	if sim.finished:
		screen = "result"
		ui.show_result(sim)
		return
	if sim.hitstop > 0:
		sim.step([{}, {}])
		return
	var one: Dictionary = inputs.read(0)
	var two: Dictionary = sim.cpu_input(1) if cpu else inputs.read(1)
	if sim.mode == "training": two = {}
	if OS.get_cmdline_user_args().has("--auto"): one = sim.cpu_input(0)
	sim.step([one, two])
	for event in sim.events:
		arena.impact(event.pos, event.type)
		if sounds.has(event.type): sounds[event.type].play()
	ui.update_hud(sim)

func _process(delta: float) -> void:
	if not paused_match: clock += delta
	for i in range(views.size()):
		views[i].sync(sim.fighters[i], clock)
		if screen == "menu": views[i].model.scale = Vector3.ONE * 2.2
	capture_frames += 1
	if capture_frames == 100:
		for argument in OS.get_cmdline_user_args():
			if argument.begins_with("--capture="):
				get_viewport().get_texture().get_image().save_png(argument.trim_prefix("--capture="))
				get_tree().quit()
