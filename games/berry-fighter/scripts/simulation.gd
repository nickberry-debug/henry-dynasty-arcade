extends RefCounted
## Original fixed-step platform-fighter rules. Coordinates: x right, y up.

const DT: float = 1.0 / 60.0
const PLATFORMS: Array = [Vector3(-6, 6, 0), Vector3(-4, -1, 2.3), Vector3(1, 4, 3.6)]
const ATTACKS: Dictionary = {
	"light": {"wind": 5, "active": 5, "end": 22, "damage": 7.0, "power": 5.5, "reach": 1.7},
	"heavy": {"wind": 17, "active": 7, "end": 46, "damage": 16.0, "power": 9.0, "reach": 2.1},
	"special": {"wind": 11, "active": 12, "end": 42, "damage": 11.0, "power": 7.5, "reach": 2.5},
	"aerial": {"wind": 4, "active": 9, "end": 27, "damage": 9.0, "power": 6.5, "reach": 1.8}
}

var fighters: Array = []
var mode: String = "versus"
var time_left: float = 180
var finished: bool = false
var winner: int = -1
var frame: int = 0
var hitstop: int = 0
var events: Array = []

func reset(next_mode: String, character: int = 0) -> void:
	mode = next_mode
	time_left = 180
	finished = false
	winner = -1
	frame = 0
	hitstop = 0
	fighters = [make_fighter(character, -3, 1), make_fighter(1 - character, 3, -1)]
	events.clear()

func make_fighter(kind: int, x: float, facing: int) -> Dictionary:
	return {"kind": kind, "pos": Vector2(x, 0), "vel": Vector2.ZERO,
		"face": facing, "grounded": true, "jumps": 0, "coyote": 6, "buffer": 0,
		"damage": 0.0, "stocks": 3, "shield": 100.0, "guard": false,
		"stun": 0, "invuln": 0, "attack": "", "attack_frame": 0, "hit_ids": [],
		"flash": 0,
		"dodge": 0, "dodge_cd": 0, "drop": 0}

func step(inputs: Array) -> void:
	events.clear()
	if finished: return
	if hitstop > 0:
		hitstop -= 1
		return
	frame += 1
	if mode != "training":
		time_left = maxf(0, time_left - DT)
		if time_left <= 0:
			var a: Dictionary = fighters[0]
			var b: Dictionary = fighters[1]
			winner = 0 if a.stocks > b.stocks or (a.stocks == b.stocks and a.damage < b.damage) else 1
			if a.stocks == b.stocks and is_equal_approx(a.damage, b.damage): winner = -1
			finished = true
			return
	for i in range(fighters.size()):
		var command: Dictionary = inputs[i] if i < inputs.size() else {}
		update_fighter(i, command)
	for i in range(fighters.size()):
		var f: Dictionary = fighters[i]
		if f.attack == "" or f.stocks <= 0: continue
		var move: Dictionary = ATTACKS[f.attack]
		if f.attack_frame < move.wind or f.attack_frame >= move.wind + move.active: continue
		for j in range(fighters.size()):
			if i == j or j in f.hit_ids: continue
			var target: Dictionary = fighters[j]
			var diff: Vector2 = target.pos - f.pos
			var reach: float = move.reach
			if absf(diff.x) <= reach and absf(diff.y) < 1.6 and diff.x * f.face > -0.35:
				f.hit_ids.append(j)
				hit(j, move.damage * (1.15 if f.kind == 1 else 1.0), move.power, f.face)

func update_fighter(i: int, command: Dictionary) -> void:
	var f: Dictionary = fighters[i]
	if f.stocks <= 0: return
	for key in ["stun", "invuln", "flash", "dodge", "dodge_cd", "drop", "buffer"]:
		f[key] = maxi(0, f[key] - 1)
	if command.get("jump", false): f.buffer = 7
	f.coyote = 6 if f.grounded else maxi(0, f.coyote - 1)
	if f.attack != "":
		f.attack_frame += 1
		if f.attack_frame >= ATTACKS[f.attack].end:
			f.attack = ""
			f.hit_ids = []
	f.guard = command.get("shield", false) and f.shield > 0 and f.stun == 0 and f.attack == "" and f.grounded
	f.shield = clampf(f.shield + (-0.55 if f.guard else 0.23), 0, 100)
	var axis: float = clampf(float(command.get("x", 0)), -1, 1)
	if f.stun == 0:
		if absf(axis) > 0.1 and f.attack == "": f.face = 1 if axis > 0 else -1
		if command.get("dodge", false) and f.dodge_cd == 0 and f.attack == "":
			f.dodge = 16
			f.invuln = maxi(f.invuln, 12)
			f.dodge_cd = 65
			f.vel.x = f.face * 11.0
		if f.dodge == 0:
			var speed: float = 6.5 if f.kind == 0 else 4.9
			var target_speed: float = axis * speed * (0.25 if f.guard else 1.0)
			if f.attack != "": target_speed *= 0.22
			f.vel.x = move_toward(f.vel.x, target_speed, (45.0 if f.grounded else 18.0) * DT)
		if f.buffer > 0 and not f.guard and f.attack == "" and (f.jumps < 2 or f.coyote > 0):
			if f.coyote > 0: f.jumps = 0
			f.jumps += 1
			f.vel.y = 10.8 if f.kind == 0 else 10.0
			f.grounded = false
			f.coyote = 0
			f.buffer = 0
			events.append({"type": "jump", "pos": f.pos})
		if command.get("down", false) and f.grounded and f.pos.y > 0.1:
			f.drop = 18
			f.pos.y -= 0.15
			f.grounded = false
		if not f.guard and f.attack == "" and f.dodge == 0:
			for action in ["light", "heavy", "special"]:
				if command.get(action, false):
					f.attack = "aerial" if action == "light" and not f.grounded else action
					f.attack_frame = 0
					f.hit_ids = []
					break
	var before: Vector2 = f.pos
	f.vel.y = maxf(-22, f.vel.y - 25.0 * DT)
	f.pos += f.vel * DT
	f.grounded = false
	if f.vel.y <= 0:
		for p: Vector3 in PLATFORMS:
			if f.drop > 0 and p.z > 0: continue
			if f.pos.x >= p.x - 0.12 and f.pos.x <= p.y + 0.12 and before.y >= p.z - 0.01 and f.pos.y <= p.z:
				f.pos.y = p.z
				f.vel.y = 0
				f.grounded = true
				f.jumps = 0
				break
	if absf(f.pos.x) > 12 or f.pos.y < -6 or f.pos.y > 15:
		ring_out(i)

func hit(target: int, damage: float, power: float, direction: float) -> void:
	var f: Dictionary = fighters[target]
	if f.invuln > 0 or f.stocks <= 0: return
	if f.guard:
		f.shield = maxf(0, f.shield - damage * 2.1)
		events.append({"type": "block", "pos": f.pos + Vector2(0, 1)})
		if f.shield <= 0:
			f.stun = 100
			f.guard = false
		return
	f.damage += damage
	var force: float = (power + f.damage * 0.075) * (0.78 if f.kind == 1 else 1.0)
	f.vel = Vector2(direction * force, force * 0.62 + 2)
	f.stun = int(12 + force * 1.3)
	f.grounded = false
	f.attack = ""
	f.flash = 9
	hitstop = 4
	events.append({"type": "hit", "pos": f.pos + Vector2(0, 1), "power": force})

func ring_out(index: int) -> void:
	var f: Dictionary = fighters[index]
	events.append({"type": "ko", "pos": Vector2(clampf(f.pos.x, -8, 8), maxf(-3, f.pos.y))})
	if mode != "training": f.stocks -= 1
	if f.stocks <= 0:
		finished = true
		winner = 1 - index
		return
	var stocks: int = f.stocks
	fighters[index] = make_fighter(f.kind, -2 if index == 0 else 2, 1 if index == 0 else -1)
	fighters[index].pos.y = 5
	fighters[index].grounded = false
	fighters[index].stocks = stocks
	fighters[index].invuln = 120

func cpu_input(index: int) -> Dictionary:
	var f: Dictionary = fighters[index]
	var target: Dictionary = fighters[1 - index]
	var diff: Vector2 = target.pos - f.pos
	var command: Dictionary = {"x": signf(diff.x) if absf(diff.x) > 1.3 else 0.0}
	if absf(f.pos.x) > 5.3:
		command.x = -signf(f.pos.x)
		if f.pos.y < 0: command.jump = frame % 18 == 0
	if diff.y > 1.0 and f.grounded: command.jump = frame % 24 == 0
	if f.pos.y < -0.4: command.jump = frame % 14 == 0
	command.light = absf(diff.x) < 1.8 and absf(diff.y) < 1.5 and frame % 31 == 0
	command.heavy = absf(diff.x) < 2 and frame % 89 == 0
	command.special = absf(diff.x) < 2.5 and frame % 117 == 0
	command.shield = target.attack != "" and absf(diff.x) < 2.2 and frame % 120 < 32
	return command
