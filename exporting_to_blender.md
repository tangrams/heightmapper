To use a heightmap from Heightmapper as a displacement map in Blender:

First, note the "z:x scale factor" in the Heightmapper. Then, enter the following keys, in order – make sure your cursor is over the main viewport before you begin.

1. Start with a new scene.

2. Delete the startup cube:
 - type `x`
 - type `return`

3. Create a grid:
 - type `shift-a`
 - type `m`
 - type `g`

4. Enter number of divisions (this can be any number, but these steps will make one vertex per pixel in the heightmap):
 - in the "Add Grid" pane on the left, click in the "X Subdivisions" field
 - enter number of x pixels in heightmap minus 2
 - enter `tab`
 - enter number of y pixels in heightmap minus 2

5. Scale to match image:
 - type `s`
 - enter the number of x pixels / 1000
 - enter `tab`
 - enter y pixels / 1000
 - enter `tab`
 - type `1` (for z-scale)
 - type `return`

6. Add displacement modifier:
 - in the right pane, click the tools menu (wrench icon)<br><img width="338" alt="tools" src="https://cloud.githubusercontent.com/assets/459970/18403007/5e8dfcee-76b0-11e6-8990-5628e0e58a20.png">
 - click "add modifier"
 - click Deform > Displace
 - click Texture > "New"<br><img width="317" alt="new texture" src="https://cloud.githubusercontent.com/assets/459970/18403044/95223112-76b0-11e6-96ed-076ae9ae6a1e.png">
 - click "Show texture in texture tab" (far right button)<br><img width="318" alt="show texture" src="https://cloud.githubusercontent.com/assets/459970/18403092/cf169cf0-76b0-11e6-83b2-5ed3354bda42.png">
 - click "Open"<br><img width="333" alt="open image" src="https://cloud.githubusercontent.com/assets/459970/18403105/ec1ecd86-76b0-11e6-8898-da727db14219.png">
 - select the heightmap file

7. Scale displacement:
 - Click the tools menu (wrench icon)
 - Set "Midlevel" to `0`<br><img width="315" alt="strength" src="https://cloud.githubusercontent.com/assets/459970/18403290/d71bc4e2-76b1-11e6-997f-fa76a4ade7bb.png">
 - Set "Strength" to be the x-scale multiplied by the "z:x scale factor"

### Printing

To print, export to `.obj` or `.stl`.

When preparing a model for 3D printing I like to fade the edges out, to ensure that the edges will be the lowest part of the model. You can do this with the square gradient tool in Photoshop.

### Tips

The first time you try this, it's convenient to make your heightmap 1000 pixels wide, which makes the math easier: then your mesh x-scale is just 1, and your displacement scale is the "z:x scale factor" value copied from Heightmapper.

Good luck!
