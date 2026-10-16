extends SceneTree

func _initialize() -> void:
	if not ResourceLoader.exists("res://main.tscn"):
		printerr("FAIL: playable scene must exist")
		quit(1)
		return
	call_deferred("verify_scene")

func verify_scene() -> void:
	var scene: PackedScene = load("res://main.tscn")
	var game = scene.instantiate()
	root.add_child(game)
	await process_frame
	assert(game.screen == "menu", "initial menu")
	game.start_match("training")
	await process_frame
	assert(game.screen == "match", "training starts")
	assert(game.sim.fighters.size() == 2, "views use two fighters")
	game.toggle_pause()
	assert(game.paused_match, "pause toggles on")
	var before: int = game.sim.frame
	for i in range(3): await physics_frame
	assert(game.sim.frame == before, "pause freezes simulation")
	game.toggle_pause()
	game.sim.finished = true
	game.sim.winner = 0
	await physics_frame
	await physics_frame
	assert(game.screen == "result", "result screen appears")
	game.show_menu()
	game.handle_action("bramble")
	game.start_match("versus")
	assert(game.sim.fighters[0].kind == 1, "selection reaches match")
	assert(not game.cpu, "local versus uses human second player")
	game.handle_action("restart")
	assert(game.sim.fighters[0].stocks == 3, "restart resets stocks")
	print("SCENE: menu, match, pause, results, selection, rematch PASS")
	for player in game.sounds.values(): player.stop()
	await create_timer(0.15).timeout
	game.queue_free()
	await process_frame
	await process_frame
	quit(0)
