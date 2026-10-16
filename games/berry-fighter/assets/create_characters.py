"""Original provisional Berry Fighter meshes. Rebuild with Blender --background --python this file."""
import bpy
import math
import os
import wave
import struct

OUT = os.path.dirname(os.path.abspath(__file__))

def material(name, color, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = .68
    bs.inputs['Metallic'].default_value = metallic
    return m

def sphere(name, position, scale, mat, detail=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail, radius=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj

def tube(name, start, end, radius, mat):
    a, b = __import__('mathutils').Vector(start), __import__('mathutils').Vector(end)
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=radius, radius2=radius*.7, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    return obj

def character(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    berry = material('Mulberry', (.66, .09, .29))
    leaf = material('New growth', (.46, .76, .16))
    dark = material('Ink', (.035, .075, .10))
    cream = material('Warm ivory', (.98, .85, .58))
    teal = material('River stone', (.12, .44, .49))
    light = material('Stone highlight', (.29, .70, .66))
    wood = material('Old cedar', (.25, .16, .13))
    amber = material('Heartwood', (1, .58, .12))
    if kind < 2:
        wide = 1 if kind == 0 else 1.23
        bodymat = berry if kind == 0 else teal
        sphere('Body', (0, 0, .95), (.46*wide, .31, .55), bodymat, 3)
        sphere('Head', (0, -.015, 1.64), (.40*wide, .34, .38), bodymat, 3)
        for side in [-1, 1]:
            sphere('EyeWhite'+str(side), (side*.15, -.315, 1.7), (.095, .045, .12), cream)
            sphere('Eye'+str(side), (side*.15, -.35, 1.70), (.045, .025, .065), dark)
            sphere('Cheek'+str(side), (side*.28, -.27, 1.53), (.06, .025, .035), amber)
            sphere('Arm'+('L' if side < 0 else 'R'), (side*.54*wide, 0, 1.13), (.17, .19, .35), bodymat)
            sphere('Fist'+str(side), (side*.56*wide, -.09, .88), (.23, .23, .23), cream if kind == 0 else light)
            sphere('Leg'+('L' if side < 0 else 'R'), (side*.23, .015, .35), (.16, .17, .30), dark)
            sphere('Boot'+str(side), (side*.23, -.075, .14), (.21, .30, .15), cream if kind == 0 else teal)
        tube('Stem', (0, 0, 1.93), (.10, .02, 2.2), .07, wood)
        for i in range(5):
            a = i * math.tau / 5
            obj = sphere('Leaf'+str(i), (math.cos(a)*.23, math.sin(a)*.18, 2.02), (.27, .105, .075), leaf)
            obj.rotation_euler[2] = a
        sphere('Scarf', (0, -.03, 1.36), (.44*wide, .32, .12), cream if kind == 0 else leaf)
        if kind == 0:
            tube('ScarfTail', (.3, .1, 1.35), (.85, .15, 1.10), .12, cream)
            for z in [.85, 1.02, 1.18]:
                for x in [-.2, .06, .23]: sphere('Seed', (x, -.31, z), (.022, .015, .04), amber, 1)
        else:
            for x in [-.25, 0, .25]: sphere('ShoulderCrystal', (x, .1, 1.96), (.14, .15, .22), light, 1)
    else:
        sphere('Body', (0, .05, 1.12), (.74, .46, .90), wood, 2)
        sphere('Head', (0, -.05, 2.08), (.61, .40, .49), wood, 2)
        sphere('Heart', (0, -.41, 1.28), (.25, .09, .36), amber, 2)
        for side in [-1, 1]:
            sphere('Eye'+str(side), (side*.23, -.40, 2.17), (.12, .05, .075), leaf)
            tube('Arm'+('L' if side < 0 else 'R'), (side*.72, 0, 1.75), (side*.95, -.06, .75), .29, wood)
            sphere('Fist'+str(side), (side*.95, -.06, .72), (.34, .33, .39), wood)
            tube('Leg'+('L' if side < 0 else 'R'), (side*.4, 0, .63), (side*.48, -.06, .15), .25, wood)
            sphere('Boot'+str(side), (side*.48, -.13, .13), (.34, .40, .17), wood)
            tube('Antler', (side*.35, .02, 2.35), (side*.8, .03, 3.0), .105, wood)
            tube('AntlerFork', (side*.61, .03, 2.73), (side*.38, .03, 3.08), .06, wood)
            for j in range(3): sphere('Canopy', (side*(.4+j*.23), .10, 2.75+j*.06), (.33, .27, .25), leaf, 1)
    os.makedirs(os.path.join(OUT, 'source'), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'source', ['pip','bramble','rootwarden'][kind]+'.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ['pip','bramble','rootwarden'][kind]+'.glb'), export_format='GLB', export_yup=True)

for kind in range(2): character(kind)

# Short original synthesized effects, stored as WAV for browser sample playback.
for name, freq, duration in [('hit',180,.13), ('jump',540,.1), ('block',850,.09), ('ko',95,.45), ('click',650,.06)]:
    rate=22050
    with wave.open(os.path.join(OUT, name+'.wav'), 'wb') as w:
        w.setparams((1,2,rate,0,'NONE','not compressed'))
        values=[]
        for i in range(int(rate*duration)):
            t=i/rate
            env=(1-t/duration)**2
            f=freq*(1+(t/duration)*(.8 if name=='jump' else -.5))
            sample=math.sin(math.tau*f*t)+.25*math.sin(math.tau*f*2.01*t)
            values.append(struct.pack('<h',int(sample*env*11000)))
        w.writeframes(b''.join(values))
