To use a heightmap from Heightmapper as a displacement map in Blender:

Make sure cursor is over the main viewport before you begin. Start with a new scene.

Delete the startup cube:
 - x
 - return

Create a grid:
 - shift-a
 - m
 - g

Enter # of divisions (click nowhere! just start typing):
 - enter number of x pixels - 2
 - tab
 - enter number of y pixels - 2

Scale to match image:
 - s
 - enter the number of x pixels
 - tab
 - enter y pixels
 - tab
 - enter 1 (for z-scale)
 - return

Add displacement modifier:
 - tools menu (wrench)
 - "add modifier"
 - deform > displace
 - texture: new
 - "show texture in texture tab" - far right button
 - "open"
 - select file

Scale displacement:
 - select displacement modifier
 - edit scale
 - set scale to be x-scale * "z:x scale factor"

When preparing a model for 3D printing I like to fade the edges out, to ensure that the edges will be the lowest part of the model. You can do this with the square gradient tool in Photoshop.
