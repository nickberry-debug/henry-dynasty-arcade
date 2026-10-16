extends Node3D

var camera: Camera3D
var motes: Array = []
var impacts: Array = []
var shake: float = 0
var clock: float = 0
var stage_nodes: Array = []
var display_nodes: Array = []

func mat(color: Color, unshaded: bool = false) -> StandardMaterial3D:
	var m: StandardMaterial3D = StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.87
	if unshaded: m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func box(size: Vector3, pos: Vector3, color: Color) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var mesh: BoxMesh = BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = mat(color)
	node.position = pos
	add_child(node)
	return node

func sphere(pos: Vector3, radius: float, color: Color) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var mesh: SphereMesh = SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2
	mesh.radial_segments = 12
	mesh.rings = 6
	node.mesh = mesh
	node.material_override = mat(color)
	node.position = pos
	add_child(node)
	return node

func _ready() -> void:
	var env: WorldEnvironment = WorldEnvironment.new()
	var e: Environment = Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("173744")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("c9e8dc")
	e.ambient_light_energy = 0.40
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.environment = e
	add_child(env)
	var sun: DirectionalLight3D = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-45, -30, 0)
	sun.light_color = Color("fff0c6")
	sun.light_energy = 0.75
	sun.shadow_enabled = true
	add_child(sun)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 19.7
	camera.position = Vector3(0, 7.4, 21)
	add_child(camera)
	camera.look_at(Vector3(0, 2.1, 0))
	camera.current = true
	# Layered low-poly mountains and moon, all original geometry.
	sphere(Vector3(5.8, 6.8, -12), 1.6, Color("ffe6a9"))
	for i in range(13):
		var cone: MeshInstance3D = MeshInstance3D.new()
		var mesh: CylinderMesh = CylinderMesh.new()
		mesh.top_radius = 0
		mesh.bottom_radius = 3.8
		mesh.height = 5.0 + float(i % 4)
		mesh.radial_segments = 5
		cone.mesh = mesh
		cone.position = Vector3(-20 + i * 3.5, -0.5, -10 - (i % 3) * 2)
		cone.material_override = mat(Color("28535c") if i % 2 else Color("35686c"))
		add_child(cone)
	var start_count: int = get_child_count()
	for p: Vector3 in [Vector3(-6, 6, 0), Vector3(-4, -1, 2.3), Vector3(1, 4, 3.6)]:
		var width: float = p.y - p.x
		box(Vector3(width, 0.32, 2.0), Vector3((p.x + p.y) / 2, p.z - 0.17, 0), Color("8cb854"))
		box(Vector3(width - 0.2, 0.55, 1.75), Vector3((p.x + p.y) / 2, p.z - 0.58, 0), Color("726053"))
		box(Vector3(width - 0.5, 0.12, 1.78), Vector3((p.x + p.y) / 2, p.z - 0.88, 0), Color("3c4b49"))
		box(Vector3(width, 0.055, 0.10), Vector3((p.x + p.y) / 2, p.z + 0.015, 1.0), Color("d2db8b"))
		for x in range(int(p.x), int(p.y)):
			if x % 2 == 0:
				box(Vector3(0.05, 0.6, 0.05), Vector3(x + 0.3, p.z - 1.0, 0.7), Color("4b8053")).rotation.z = 0.1
	for x in [-5.6, 5.5]:
		box(Vector3(0.13, 1.7, 0.13), Vector3(x, 0.8, -0.5), Color("67564b"))
		box(Vector3(0.7, 0.5, 0.05), Vector3(x + 0.3, 1.4, -0.5), Color("e9bd65"))
	for i in range(26):
		var x: float = -5.8 + i * 0.45
		var sprout: MeshInstance3D = sphere(Vector3(x, 0.12, -0.7), 0.12, Color("b6c866") if i % 3 else Color("edac9a"))
		sprout.scale = Vector3(0.6, 1.6, 0.6)
	stage_nodes = get_children().slice(start_count)
	for x in [2.0, 9.0]:
		display_nodes.append(box(Vector3(3.2, 0.22, 1.8), Vector3(x, -0.15, 0), Color("789a68")))
		display_nodes.append(box(Vector3(2.8, 0.4, 1.55), Vector3(x, -0.46, 0), Color("4f6562")))
	for i in range(24):
		var mote: MeshInstance3D = sphere(Vector3(-9 + i * 0.77, 1 + (i % 7), -3.0), 0.025, Color("f5dfa0"))
		motes.append(mote)

func set_menu(enabled: bool) -> void:
	for node in stage_nodes: node.visible = not enabled
	for node in display_nodes: node.visible = enabled

func impact(pos: Vector2, type: String) -> void:
	var color: Color = Color("fff1b7") if type == "hit" else Color("82dcd0")
	if type == "ko": color = Color("ed9e84")
	for i in range(10 if type == "hit" else 6):
		var node: MeshInstance3D = sphere(Vector3(pos.x, pos.y, 0.5), 0.085, color)
		var angle: float = i * TAU / 10
		impacts.append({"node": node, "vel": Vector3(cos(angle), sin(angle), 0) * 5, "life": 0.35})
	if type == "hit" or type == "ko": shake = 0.14 if type == "hit" else 0.3

func _process(delta: float) -> void:
	clock += delta
	for i in range(motes.size()): motes[i].position.y += sin(clock + i) * delta * 0.14
	for effect in impacts:
		effect.life -= delta
		effect.node.position += effect.vel * delta
		effect.node.scale *= 0.93
		if effect.life <= 0: effect.node.queue_free()
	impacts = impacts.filter(func(item: Dictionary) -> bool: return item.life > 0)
	shake = maxf(0, shake - delta)
	if camera:
		camera.h_offset = sin(clock * 93) * shake * 0.3
		camera.v_offset = cos(clock * 77) * shake * 0.2
