extends Node3D

var model: Node3D
var shadow: MeshInstance3D
var shield: MeshInstance3D
var glow: MeshInstance3D
var body_parts: Array = []
var kind: int = 0
var base_positions: Dictionary = {}

func setup(character: int) -> void:
	kind = character
	var paths: Array = ["pip", "bramble"]
	var asset: PackedScene = load("res://assets/" + paths[kind] + ".glb")
	model = asset.instantiate()
	add_child(model)
	for child in model.find_children("*", "MeshInstance3D", true, false):
		body_parts.append(child)
		base_positions[child.name] = child.position
	shadow = MeshInstance3D.new()
	var disc: CylinderMesh = CylinderMesh.new()
	disc.top_radius = 0.57 if kind < 2 else 0.85
	disc.bottom_radius = disc.top_radius
	disc.height = 0.008
	shadow.mesh = disc
	var sm: StandardMaterial3D = StandardMaterial3D.new()
	sm.albedo_color = Color(0.03, 0.12, 0.14, 0.28)
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	shadow.material_override = sm
	add_child(shadow)
	shield = MeshInstance3D.new()
	var sphere: SphereMesh = SphereMesh.new()
	sphere.radius = 1.05
	sphere.height = 2.1
	shield.mesh = sphere
	var mat: StandardMaterial3D = StandardMaterial3D.new()
	mat.albedo_color = Color(0.45, 0.85, 1, 0.24)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shield.material_override = mat
	shield.position.y = 1
	add_child(shield)
	shield.visible = false

func sync(f: Dictionary, clock: float) -> void:
	position = Vector3(f.pos.x, f.pos.y, 0)
	visible = f.stocks > 0
	model.visible = f.invuln <= 0 or f.invuln % 10 < 6
	model.rotation.y = lerp_angle(model.rotation.y, f.face * 0.30, 0.2)
	var running: float = minf(1, absf(f.vel.x) / 4)
	var stride: float = sin(clock * 18) * running
	model.position.y = absf(sin(clock * 18)) * 0.045 * running
	model.rotation.z = -f.vel.x * 0.018
	if not f.grounded: model.rotation.z += f.face * 0.10
	var swinging: bool = f.attack != ""
	var attack_time: float = float(f.attack_frame) / 60
	for part in body_parts:
		part.position = base_positions[part.name]
		part.rotation = Vector3.ZERO
		if "Leg" in part.name or "Boot" in part.name:
			var side: float = -1 if "L" in part.name or "-1" in part.name else 1
			part.position.y += stride * side * 0.12
			part.position.z += stride * side * 0.12
		if "Arm" in part.name or "Fist" in part.name:
			part.position.y -= stride * 0.06
			if swinging:
				var pulse: float = sin(minf(1, attack_time * 4) * PI)
				part.position.x += f.face * pulse * (0.8 if f.attack == "heavy" else 0.5)
				part.position.y += pulse * 0.20
		if "Head" in part.name: part.rotation.z = sin(clock * 3) * 0.025
	shield.visible = f.guard
	shield.scale = Vector3.ONE * (0.7 + f.shield / 330)
	shadow.position.y = -f.pos.y + 0.015
	shadow.visible = f.pos.y >= 0 and absf(f.pos.x) < 6
	if f.flash > 0: model.scale = Vector3(1.1, 0.88, 1.1)
	else: model.scale = model.scale.lerp(Vector3.ONE, 0.3)
