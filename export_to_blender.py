import bpy
import sys

try:
    args = list(reversed(sys.argv))
    idx = args.index("--")

except ValueError:
    params = []

else:
    params = args[:idx][::-1]

print("Script params:", params)

path=params[0]
bpy.ops.image.open(filepath=path, relative_path=True)

texture=bpy.data.textures.new('my_texture', 'IMAGE')
texture.image = bpy.data.images[0]
texture.extension = 'EXTEND'

w=texture.image.size[0]
h=texture.image.size[1]

bpy.ops.object.delete(use_global=False)
# bpy.ops.mesh.primitive_grid_add(x_subdivisions=w, y_subdivisions=h, location=(0,0,0))
bpy.ops.mesh.primitive_grid_add(x_subdivisions=w/1.5, y_subdivisions=h/1.5, location=(0,0,0))
grid=bpy.context.selected_objects[0]

grid.scale[0] = w/100
grid.scale[1] = h/100

bpy.ops.object.modifier_add(type='DISPLACE')

grid.modifiers["Displace"].texture = texture

grid.modifiers["Displace"].mid_level = 0
grid.modifiers["Displace"].strength = float(params[1])
