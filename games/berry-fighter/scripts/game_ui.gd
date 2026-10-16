extends CanvasLayer

signal action(value: String)
signal touch_action(value: String, down: bool)

const INK: Color = Color("0d252e")
const CREAM: Color = Color("f7efd6")
const LIME: Color = Color("d0eb84")
const MUTED: Color = Color("a8c9c6")
var root: Control
var page: Control
var hud: Control
var touch_root: Node2D
var damage_labels: Array = []
var stock_labels: Array = []
var shield_bars: Array = []
var timer: Label

func _ready() -> void:
	root = Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	page = Control.new()
	page.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(page)
	touch_root = Node2D.new()
	root.add_child(touch_root)
	make_touch_controls()

func _process(_delta: float) -> void:
	root.scale = get_viewport().get_visible_rect().size / Vector2(1280, 720)

func clear() -> void:
	for child in page.get_children():
		page.remove_child(child)
		child.queue_free()
	damage_labels.clear()
	stock_labels.clear()
	shield_bars.clear()

func label(text: String, rect: Rect2, size: int = 20, color: Color = CREAM, parent: Node = null) -> Label:
	var node: Label = Label.new()
	node.text = text
	node.position = rect.position
	node.size = rect.size
	node.add_theme_font_size_override("font_size", size)
	node.add_theme_color_override("font_color", color)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	(parent if parent else page).add_child(node)
	return node

func panel(rect: Rect2, color: Color = INK, parent: Node = null) -> Panel:
	var node: Panel = Panel.new()
	node.position = rect.position
	node.size = rect.size
	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_left = 14
	style.corner_radius_bottom_right = 14
	style.border_width_top = 1
	style.border_color = Color(0.8, 0.93, 0.81, 0.2)
	node.add_theme_stylebox_override("panel", style)
	(parent if parent else page).add_child(node)
	return node

func button(text: String, rect: Rect2, value: String, primary: bool = false) -> Button:
	var node: Button = Button.new()
	node.text = text
	node.position = rect.position
	node.size = rect.size
	node.add_theme_font_size_override("font_size", 19)
	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = LIME if primary else Color("234750")
	style.set_corner_radius_all(10)
	style.set_border_width_all(1)
	style.border_color = LIME if primary else Color("49656a")
	node.add_theme_stylebox_override("normal", style)
	var hover: StyleBoxFlat = style.duplicate()
	hover.bg_color = Color("e6f6b4") if primary else Color("36616a")
	node.add_theme_stylebox_override("hover", hover)
	node.add_theme_stylebox_override("focus", hover)
	node.add_theme_stylebox_override("pressed", hover)
	node.add_theme_color_override("font_color", INK if primary else CREAM)
	node.add_theme_color_override("font_hover_color", INK if primary else CREAM)
	node.add_theme_color_override("font_focus_color", INK if primary else CREAM)
	node.add_theme_color_override("font_pressed_color", INK if primary else CREAM)
	node.pressed.connect(func() -> void: action.emit(value))
	page.add_child(node)
	return node

func show_menu(selected: int, touch_enabled: bool, pads: Array[int]) -> void:
	clear()
	touch_root.visible = false
	panel(Rect2(24, 22, 1232, 54), Color(0.04, 0.12, 0.16, 0.88))
	label("BERRY ARCADE   /   ORIGINALS", Rect2(44, 34, 650, 30), 18, LIME)
	label("BASE ENGINE DEMO  ·  01", Rect2(966, 34, 270, 30), 15, MUTED)
	panel(Rect2(24, 98, 488, 540), Color(0.035, 0.10, 0.13, 0.94))
	label("SMALL HEROES. BIG KNOCKBACK.", Rect2(48, 116, 450, 30), 15, LIME)
	label("BERRY\nFIGHTER", Rect2(44, 153, 460, 165), 67)
	label("Two fighters. One floating garden.\nFind your footing. Make your impact.", Rect2(48, 337, 435, 65), 19, MUTED)
	button("Spar with CPU   >", Rect2(48, 425, 438, 51), "spar", true).grab_focus()
	button("Local versus", Rect2(48, 492, 213, 48), "versus")
	button("Training", Rect2(273, 492, 213, 48), "training")
	button("Controls", Rect2(48, 555, 438, 48), "controls")
	label("CHOOSE YOUR FIGHTER", Rect2(560, 108, 560, 32), 20, LIME)
	button(("[ PIP ]" if selected == 0 else "PIP") + "   /   quick & light", Rect2(554, 496, 305, 57), "pip", selected == 0)
	button(("[ BRAMBLE ]" if selected == 1 else "BRAMBLE") + "   /   heavy hands", Rect2(879, 496, 350, 57), "bramble", selected == 1)
	label("Berry scout · Fast feet, rising strikes", Rect2(561, 564, 320, 30), 15, MUTED)
	label("Stone guardian · More weight, more force", Rect2(886, 564, 360, 30), 15, MUTED)
	label("Provisional characters · We'll design the final roster together.", Rect2(560, 610, 670, 30), 16, MUTED)
	panel(Rect2(24, 656, 1232, 44), Color(0.04, 0.12, 0.16, 0.88))
	label("%d controller(s) connected  ·  Keyboard ready  ·  60 Hz combat" % pads.size(), Rect2(43, 665, 880, 28), 15, MUTED)
	button("Touch: " + ("ON" if touch_enabled else "OFF"), Rect2(1070, 659, 170, 37), "touch")

func show_controls() -> void:
	clear()
	panel(Rect2(190, 55, 900, 610), Color(0.035, 0.10, 0.13, 0.98))
	label("MAKE EVERY HIT COUNT", Rect2(226, 80, 800, 45), 32, LIME)
	label("Build damage, then launch your opponent beyond the garden.", Rect2(226, 140, 830, 40), 20)
	label("PLAYER 1\nA / D    Move\nSpace    Jump / double jump\nJ / K / L    Light / heavy / special\nShift    Shield     E    Dodge\nS    Drop through upper platforms", Rect2(226, 205, 420, 260), 20)
	label("CONTROLLER\nLeft stick / D-pad    Move\nA / Cross    Jump\nX / Square    Light\nY / Triangle    Heavy\nB / Circle    Special\nLB / L1    Shield     RB / R1    Dodge", Rect2(665, 205, 410, 270), 20)
	label("Player 2: arrows + Up jump · M / , / . attacks · N shield · / dodge\nEsc or Start pauses. Touch controls support multiple fingers.\nTraining: unlimited stocks. Sparring: CPU opponent. Versus: two humans.", Rect2(226, 490, 820, 95), 17, MUTED)
	button("Back to garden", Rect2(226, 599, 270, 46), "menu", true)

func show_hud(sim: RefCounted, touch_enabled: bool) -> void:
	clear()
	panel(Rect2(466, 20, 348, 61), Color(0.04, 0.12, 0.16, 0.85))
	label("FLOATING GARDEN", Rect2(488, 27, 210, 28), 16, LIME)
	timer = label("3:00", Rect2(698, 26, 110, 35), 27)
	button("Pause", Rect2(1136, 22, 117, 45), "pause")
	if sim.mode == "training": label("TRAINING · Unlimited stocks", Rect2(32, 30, 420, 35), 18)
	else: label(("CPU SPARRING" if sim.mode == "spar" else "LOCAL VERSUS") + " · 3 stocks", Rect2(32, 30, 420, 35), 18)
	for i in range(2):
		var f: Dictionary = sim.fighters[i]
		var x: float = 32 if i == 0 else 958
		panel(Rect2(x, 557, 290, 122), Color(0.04, 0.12, 0.16, 0.93))
		label(["PIP", "BRAMBLE"][f.kind], Rect2(x + 18, 567, 240, 30), 18, Color("f5a8ad") if f.kind == 0 else LIME)
		damage_labels.append(label("0%", Rect2(x + 16, 593, 240, 59), 43))
		stock_labels.append(label("3 stocks", Rect2(x + 153, 607, 118, 30), 17, MUTED))
		var bar: ProgressBar = ProgressBar.new()
		bar.position = Vector2(x + 18, 654)
		bar.size = Vector2(253, 7)
		bar.show_percentage = false
		var track: StyleBoxFlat = StyleBoxFlat.new()
		track.bg_color = Color("34545b")
		track.set_corner_radius_all(3)
		var fill: StyleBoxFlat = StyleBoxFlat.new()
		fill.bg_color = Color("80cbb9")
		fill.set_corner_radius_all(3)
		bar.add_theme_stylebox_override("background", track)
		bar.add_theme_stylebox_override("fill", fill)
		page.add_child(bar)
		shield_bars.append(bar)
	if not touch_enabled:
		label("A D  MOVE    SPACE  JUMP    J K L  ATTACK    SHIFT  SHIELD    E  DODGE", Rect2(343, 674, 660, 25), 12, MUTED)
	touch_root.visible = touch_enabled

func update_hud(sim: RefCounted) -> void:
	if damage_labels.size() != 2: return
	for i in range(2):
		var f: Dictionary = sim.fighters[i]
		damage_labels[i].text = "%d%%" % f.damage
		damage_labels[i].modulate = Color("ff9b83") if f.damage > 80 else Color.WHITE
		stock_labels[i].text = "%d stocks" % f.stocks
		shield_bars[i].value = f.shield
	var seconds: int = int(ceil(sim.time_left))
	timer.text = "FREE" if sim.mode == "training" else "%d:%02d" % [seconds / 60, seconds % 60]

func show_pause() -> void:
	touch_root.visible = false
	panel(Rect2(410, 196, 460, 330), Color(0.035, 0.10, 0.13, 0.98))
	label("TAKE A BREATHER", Rect2(444, 220, 400, 50), 30, LIME)
	button("Resume", Rect2(446, 295, 388, 52), "pause", true).grab_focus()
	button("Restart encounter", Rect2(446, 362, 388, 52), "restart")
	button("Choose fighter", Rect2(446, 429, 388, 52), "menu")

func show_result(sim: RefCounted) -> void:
	clear()
	touch_root.visible = false
	panel(Rect2(330, 155, 620, 410), Color(0.035, 0.10, 0.13, 0.97))
	var title: String = "NICE FOOTWORK."
	if sim.winner == 1: title = "BACK TO YOUR ROOTS"
	if sim.winner == -1: title = "AN EVEN MATCH"
	label(title, Rect2(368, 190, 550, 42), 28, LIME)
	var body: String = "A little practice goes a long way. Ready for another round?"
	if sim.winner >= 0: body = "%s wins the encounter.\nEvery rematch is a chance to learn." % ["Pip", "Bramble"][sim.fighters[sim.winner].kind]
	label(body, Rect2(368, 263, 545, 110), 20, MUTED)
	button("Play again", Rect2(368, 405, 544, 54), "restart", true).grab_focus()
	button("Choose fighter", Rect2(368, 478, 544, 49), "menu")

func make_touch_controls() -> void:
	var defs: Array = [
		["left", "<", Vector2(382, 602)], ["right", ">", Vector2(477, 602)],
		["down", "v", Vector2(430, 678)], ["jump", "JUMP", Vector2(895, 524)],
		["light", "HIT", Vector2(799, 600)], ["heavy", "HEAVY", Vector2(897, 621)],
		["special", "SKILL", Vector2(993, 552)], ["shield", "GUARD", Vector2(611, 655)],
		["dodge", "DODGE", Vector2(713, 676)]]
	for d in defs:
		var node: TouchScreenButton = TouchScreenButton.new()
		node.position = d[2]
		var shape: CircleShape2D = CircleShape2D.new()
		shape.radius = 37
		node.shape = shape
		var image: Image = Image.create(80, 80, false, Image.FORMAT_RGBA8)
		image.fill(Color.TRANSPARENT)
		for x in range(80):
			for y in range(80):
				var distance: float = Vector2(x - 40, y - 40).length()
				if distance < 36: image.set_pixel(x, y, Color(0.08, 0.19, 0.22, 0.78) if distance < 33 else Color(0.75, 0.9, 0.7, 0.7))
		node.texture_normal = ImageTexture.create_from_image(image)
		node.texture_pressed = node.texture_normal
		node.shape_centered = false
		node.position -= Vector2(40, 40)
		node.shape_centered = true
		node.passby_press = true
		var name: String = d[0]
		node.pressed.connect(func() -> void: touch_action.emit(name, true))
		node.released.connect(func() -> void: touch_action.emit(name, false))
		touch_root.add_child(node)
		var caption: Label = Label.new()
		caption.text = d[1]
		caption.position = d[2] - Vector2(40, 13)
		caption.size = Vector2(80, 30)
		caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		caption.add_theme_font_size_override("font_size", 12)
		caption.add_theme_color_override("font_color", CREAM)
		caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
		touch_root.add_child(caption)
