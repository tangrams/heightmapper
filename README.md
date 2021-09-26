# heightmapper

http://tangrams.github.io/heightmapper

Heightmapper is an interactive grayscale heightmap browser, which can generate heightmaps for use in 3D applications. By default, it "auto-exposes" the display so that the highest visible elevation in the current view will be white, and the lowest will be black.

Uses [Mapzen's](http://mapzen.com/tangrams/tangram) global [elevation service](https://mapzen.com/blog/elevation).

<img width="900" alt="screen shot 2016-07-19 at 11 17 17 am" src="https://cloud.githubusercontent.com/assets/459970/16955404/6e9ec51e-4da2-11e6-97e1-d43d2682e07b.png">

### Usage

- Uncheck "auto-expose" to set min and max height levels manually.
- Check "show lines" and "show labels" to see more map data.
- Click "export" to open the current view as an image in a new tab - "Save As" to save the image to disk.
- Import the resulting image as a "displacement map" in a 3D application to generate a 3D model of the terrain. ([Here's a tutorial for doing this in Blender.](https://github.com/tangrams/heightmapper/blob/master/exporting_to_blender.md))
- The "z:x scale factor" describes how "high" the current view is, on the z-axis, in terms of how wide the current view is on the x-axis. Multiplying this scale factor by the width of a 3D mesh in units x will tell you how high in units z your mesh should be after displacement in order to be true-scale.
- Press the "h" key to toggle UI visibility.

### Rendering

- Render Multiplier (1 - 8) will split the view up into that number of cells on the x and y axis. i.e., a Render Multiplier of 4 will render a 4x4 grid.
- Render Name is the name of the output file you want.
- render will automatically zoom to each area and stitch together a high quality render, then save the render as `{render name}.png` to your downloads.

> This comes with a gotcha: the map must take up the entire view (no whitespace above or below) for the renderer to work properly.
>
> Do not resize the view or move the map during render as this will interfere with the render process.

### Todo

- add a GeoTIFF export option which includes metadata
- fix Render Multiplier issue when the view bounds exceeds the tile latitude limit.
- **Super Extra Credit:** further export options including lat/lon bounding boxes, country/boundary masking using OSM vector tiles

### To run locally:

Start a web server in the repo's directory:

    python -m SimpleHTTPServer 8000
    
If that doesn't work, try:

    python -m http.server 8000

If running this produces CORS errors on your local machine, try:

    python run-server.py

or

    python3 run-server.py (on mac)
    
Then navigate to: [http://localhost:8000](http://localhost:8000)
