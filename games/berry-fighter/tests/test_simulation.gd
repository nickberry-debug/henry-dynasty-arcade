extends SceneTree

var checks: int = 0
var failures: int = 0

func expect(value: bool, description: String) -> void:
	checks += 1
	if not value:
		failures += 1
		printerr("FAIL: ", description)

func _initialize() -> void:
	if not ResourceLoader.exists("res://scripts/simulation.gd"):
		expect(false, "Combat simulation must exist")
		quit(1)
		return
	var script: Script = load("res://scripts/simulation.gd")
	var sim = script.new()
	sim.reset("versus", 0)
	expect(sim.fighters.size() == 2, "two fighters spawn")
	expect(sim.fighters[0].stocks == 3, "three starting stocks")
	sim.step([{"jump": true}, {}])
	expect(sim.fighters[0].vel.y > 0, "ground jump rises")
	sim.step([{"jump": true}, {}])
	expect(sim.fighters[0].jumps == 2, "double jump consumes second jump")
	var v: float = sim.fighters[0].vel.y
	sim.step([{"jump": true}, {}])
	expect(sim.fighters[0].vel.y < v, "third jump is rejected")
	sim.reset("versus", 0)
	sim.fighters[0].pos = Vector2(-0.7, 0)
	sim.fighters[1].pos = Vector2(0.7, 0)
	sim.step([{"light": true}, {}])
	expect(sim.fighters[1].damage == 0, "windup cannot hit early")
	for frame in range(12): sim.step([{}, {}])
	var damage: float = sim.fighters[1].damage
	expect(damage > 0, "active attack connects")
	for frame in range(10): sim.step([{}, {}])
	expect(sim.fighters[1].damage == damage, "one hit per swing")
	sim.reset("versus", 0)
	sim.fighters[0].pos = Vector2(-0.7, 0)
	sim.fighters[1].pos = Vector2(0.7, 0)
	sim.step([{"heavy": true}, {"shield": true}])
	for frame in range(30): sim.step([{}, {"shield": true}])
	expect(sim.fighters[1].damage == 0, "shield blocks damage")
	expect(sim.fighters[1].shield < 100, "shield absorbs at a cost")
	sim.reset("versus", 0)
	sim.hit(1, 10.0, 7.0, 1.0)
	var low: float = sim.fighters[1].vel.length()
	sim.fighters[1].damage = 100
	sim.fighters[1].invuln = 0
	sim.hit(1, 10.0, 7.0, 1.0)
	expect(sim.fighters[1].vel.length() > low, "percentage increases launch strength")
	sim.reset("versus", 0)
	sim.fighters[0].pos = Vector2(0, -7)
	sim.step([{}, {}])
	expect(sim.fighters[0].stocks == 2, "ring-out consumes stock")
	expect(sim.fighters[0].invuln > 0, "respawn invulnerability")
	sim.fighters[0].stocks = 1
	sim.fighters[0].pos = Vector2(0, -7)
	sim.step([{}, {}])
	expect(sim.finished and sim.winner == 1, "last stock ends match")
	sim.reset("versus", 0)
	sim.time_left = 0.001
	sim.fighters[0].damage = 50
	sim.step([{}, {}])
	expect(sim.finished and sim.winner == 1, "timeout uses stocks then damage")
	sim.reset("versus", 0)
	sim.time_left = 0.001
	sim.step([{}, {}])
	expect(sim.finished and sim.winner == -1, "exact timeout tie is draw")
	sim.reset("training", 0)
	sim.fighters[0].pos = Vector2(-2.5, 1.2)
	sim.fighters[0].vel = Vector2(0, 10)
	for frame in range(90): sim.step([{}, {}])
	expect(is_equal_approx(sim.fighters[0].pos.y, 2.3), "jump passes through and lands on upper platform")
	sim.reset("versus", 1)
	expect(sim.fighters[0].kind == 1 and sim.fighters[1].kind == 0, "selected fighter controls player one")
	sim.reset("training", 0)
	sim.time_left = 0.001
	sim.fighters[0].pos = Vector2(0, -7)
	sim.step([{}, {}])
	expect(not sim.finished and sim.fighters[0].stocks == 3, "training is untimed with unlimited stocks")
	sim.reset("versus", 0)
	sim.fighters[1].invuln = 120
	sim.hit(1, 10, 7, 1)
	expect(sim.fighters[1].damage == 0, "respawn protection blocks damage")
	sim.fighters[1].invuln = 0
	sim.hit(1, 10, 7, 1)
	expect(sim.hitstop > 0, "impact briefly freezes simulation for hit feedback")
	var frozen: Vector2 = sim.fighters[1].pos
	sim.step([{}, {}])
	expect(sim.fighters[1].pos == frozen, "hitstop freezes movement")
	print("SIMULATION: %d checks, %d failures" % [checks, failures])
	quit(1 if failures else 0)
