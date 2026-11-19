# 風格化（Blender 低多邊形、立體透視模型「diorama」）臺灣車站場景共用函式
import bpy, math, random
from mathutils import Vector, Euler

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'AgX - Medium High Contrast'
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.82, 0.88, 0.95, 1); bg.inputs[1].default_value = 0.9
    return s

_mats = {}
def hexc(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), 1)

def mat(color, rough=0.6, metal=0.0, emit=0.0):
    key = (color, rough, metal, emit)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(color); m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexc(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = hexc(color); p.inputs['Emission Strength'].default_value = emit
    _mats[key] = m; return m

def _finish(o, m, bevel=0.0, smooth=False, seg=3):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def box(loc, size, color, bevel=0.04, rough=0.6, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    return _finish(o, mat(color, rough), bevel)

def prism(loc, base, height, top, color, bevel=0.03, rough=0.55):
    """四角錐台（廡殿頂／四坡屋頂）：base=(寬,深)、top=(頂寬,頂深)；top 深 0 ＝屋脊"""
    bw, bd = base[0] / 2, base[1] / 2; tw, td = top[0] / 2, max(top[1], 0.02) / 2
    v = [(-bw, -bd, 0), (bw, -bd, 0), (bw, bd, 0), (-bw, bd, 0), (-tw, -td, height), (tw, -td, height), (tw, td, height), (-tw, td, height)]
    f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new('pr'); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new('pr', me); bpy.context.scene.collection.objects.link(o); o.location = loc
    return _finish(o, mat(color, rough), bevel)

def curved_roof(loc, base, height, top, color, lift=0.25, rough=0.55):
    """屋簷四角上翹的屋頂（中式／日式）：四坡屋頂＋簷角抬高"""
    o = prism(loc, base, height, top, color, bevel=0.02, rough=rough)
    me = o.data
    for i in range(4):
        me.vertices[i].co.z += lift
    # 中段略凹，屋面呈弧形
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 0
    return o

def cyl(loc, r, h, color, verts=24, rough=0.6, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    return _finish(bpy.context.object, mat(color, rough), bevel, smooth=verts > 8)

def cone(loc, r1, r2, h, color, verts=8, rough=0.7, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    return _finish(bpy.context.object, mat(color, rough))

def ico(loc, r, color, sub=1, rough=0.75, scale=(1, 1, 1), smooth=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale
    return _finish(o, mat(color, rough), smooth=smooth)

# ── 共用景物 ──
GREENS = ['#7DBE5E', '#6AAE52', '#8FCB6B', '#5E9E4A']
def tree(x, y, z=0.0, s=1.0, color=None, kind='round'):
    cyl((x, y, z + 0.25 * s), 0.07 * s, 0.5 * s, '#8A6040', verts=6)
    c = color or random.choice(GREENS)
    if kind == 'cone':
        cone((x, y, z + 0.95 * s), 0.42 * s, 0.0, 1.1 * s, c, verts=7)
    else:
        ico((x, y, z + 0.78 * s), 0.42 * s, c, sub=1)
        ico((x + 0.18 * s, y - 0.1 * s, z + 0.62 * s), 0.28 * s, c, sub=1)

def palm(x, y, z=0.0, s=1.0, lean=0.12):
    segs = 6
    for i in range(segs):
        t = i / segs
        cyl((x + lean * t * t * 3 * s, y, z + (0.18 + 0.32 * i) * s), 0.075 * s * (1 - 0.3 * t), 0.34 * s, '#9C7A55', verts=7)
    tx, tz = x + lean * 3 * s, z + 2.0 * s
    ico((tx, y, tz), 0.12 * s, '#7A6A3A', sub=1)
    for k in range(8):
        a = k * 2 * math.pi / 8
        bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
        o = bpy.context.object; o.scale = (0.45 * s, 0.11 * s, 0.025 * s)
        bpy.ops.object.transform_apply(scale=True)
        o.location = (tx + math.cos(a) * 0.4 * s, y + math.sin(a) * 0.4 * s, tz - 0.12 * s)
        o.rotation_euler = Euler((0, 0.42, a), 'XYZ')
        _finish(o, mat('#4F9A4A', 0.7), 0.02)

def cloud(x, y, z, s=1.0):
    for dx, dz, r in [(0, 0, 0.55), (0.55, -0.08, 0.42), (-0.55, -0.1, 0.4), (0.25, 0.25, 0.42)]:
        ico((x + dx * s, y, z + dz * s), r * s, '#FFFFFF', sub=2, rough=0.9, smooth=True)

def lamp(x, y, z=0.0):
    cyl((x, y, z + 0.45), 0.03, 0.9, '#3D4650', verts=8)
    ico((x, y, z + 0.93), 0.08, '#FFF4C8', sub=2, smooth=True)

def track(y, x0, x1, z=0.0):
    box(((x0 + x1) / 2, y, z + 0.04), (x1 - x0, 1.1, 0.08), '#B9AD9C', bevel=0.02)
    n = int((x1 - x0) / 0.32)
    for i in range(n):
        box((x0 + 0.16 + i * 0.32, y, z + 0.1), (0.12, 0.9, 0.05), '#7A5A44', bevel=0.01)
    for dy in (-0.28, 0.28):
        box(((x0 + x1) / 2, y + dy, z + 0.15), (x1 - x0, 0.05, 0.06), '#8E949A', bevel=0.0, rough=0.35)

def train(x, y, z=0.0, cars=2, body='#F4F4F2', stripe='#1E5BB0', accent='#E8853A', L=2.6):
    for c in range(cars):
        cx = x + c * (L + 0.12)
        box((cx, y, z + 0.6), (L, 0.8, 0.8), body, bevel=0.14)
        box((cx, y - 0.405, z + 0.5), (L - 0.3, 0.02, 0.1), stripe, bevel=0.0)
        box((cx, y - 0.405, z + 0.38), (L - 0.3, 0.02, 0.05), accent, bevel=0.0)
        box((cx, y - 0.405, z + 0.74), (L - 0.5, 0.02, 0.2), '#2C3440', bevel=0.0, rough=0.2)
        box((cx, y, z + 0.17), (L - 0.4, 0.6, 0.14), '#3A3F45', bevel=0.03)

def base(w=18, d=11, grass='#8CC66A', earth='#B98A5E'):
    box((0, 0, -0.45), (w, d, 0.7), earth, bevel=0.35, rough=0.85)
    box((0, 0, -0.06), (w - 0.05, d - 0.05, 0.14), grass, bevel=0.3, rough=0.9)

def windows(x0, x1, y, z, n, w, h, color='#3B4A5A', depth=0.06, face='-y'):
    step = (x1 - x0) / n
    for i in range(n):
        cx = x0 + step * (i + 0.5)
        if face == '-y': box((cx, y, z), (w, depth, h), color, bevel=0.0, rough=0.25)
        else: box((y, cx, z), (depth, w, h), color, bevel=0.0, rough=0.25)

def setup(s, res=(2400, 960), samples=48, ortho=46.0, shift=(-0.17, 0.05), rot=(68, 0, 34), target=(0, 0, 1.0), sun_rot=(50, 10, -38), sun=4.2, sky=(0.82, 0.88, 0.95)):
    s.render.resolution_x, s.render.resolution_y = res
    s.cycles.samples = samples
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = ortho; cd.shift_x, cd.shift_y = shift
    cam = bpy.data.objects.new('cam', cd); s.collection.objects.link(cam); s.camera = cam
    e = Euler([math.radians(a) for a in rot], 'XYZ'); cam.rotation_euler = e
    v = Vector((0, 0, 40)); v.rotate(e); cam.location = Vector(target) + v
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = sun; ld.angle = math.radians(12)
    lo = bpy.data.objects.new('sun', ld); s.collection.objects.link(lo); lo.rotation_euler = Euler([math.radians(a) for a in sun_rot], 'XYZ')
    s.world.node_tree.nodes['Background'].inputs[0].default_value = (*sky, 1)

def render(s, path):
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
