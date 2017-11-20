To use a heightmap from Heightmapper as a displacement map in Blender on MacOS, using the export_with_blender_script.py:

1. Note the "z:x scale factor" in the Heightmapper.

2. Export the current image from heightmapper, and save it in the same location as export_to_blender.py.

For the next command, you will need the paths of three things:
- your blender install
- the export_to_blender.py script
- your exported heightmap

If you navigate in a terminal window to the location of any of these things, you can just use the filename in the command.

3. Enter the blender command: `BLENDER_PATH --python SCRIPT_PATH -- HEIGHTMAP_PATH Z:X_SCALE_FACTOR`

Some examples:

Assuming:
- Blender path is `/Applications/Blender.app/Contents/MacOS/blender`
- script path is `~/work/heightmapper/export_to_blender.py`
- heightmap path is `~/downloads/heightmapper-1507306626578.png`
- z:x scale factor is `.000008993847`

The full command would be:

`/Applications/Blender.app/Contents/MacOS/blender --python ~/work/blender-tests/export_to_blender.py -- ~/downloads/heightmapper-1507306626578.png .000008993847`

If you're already in the heightmapper directory and moved the exported image there as well:

`/Applications/Blender.app/Contents/MacOS/blender --python export_to_blender.py -- heightmapper-1507306626578.png .000008993847`

You can also add an alias to your terminal profile to make things even cleaner.

`echo "alias blender=/Applications/Blender.app/Contents/MacOS/blender" >> ~/.bash_profile`

Then your command would be:

`blender --python export_to_blender.py -- heightmapper-1507306626578.png .000008993847`

So tidy! 💅

### Handy tips

You can drag a file directly from a finder window into a terminal window to insert the filepath at the current cursor position.

If after importing your plane appears flat, click the tools menu (wrench icon)<br><img width="338" alt="tools" src="https://cloud.githubusercontent.com/assets/459970/18403007/5e8dfcee-76b0-11e6-8990-5628e0e58a20.png"> and increase "Strength"

This also works with [Bforartists](https://www.bforartists.de/), the Blender fork for humans.

