# heightmapper

An easy way to export a grayscale heightmap, eg for use in 3D applications. "Auto-exposes" the display so that the highest and lowest visible points in the current view will be white and black, respectively.

Uses [Mapzen's](http://mapzen.com/tangrams/tangram) global [elevation service](https://mapzen.com/blog/elevation).

Live demo: http://tangrams.github.io/heightmapper

<img width="900" alt="screen shot 2016-07-19 at 11 17 17 am" src="https://cloud.githubusercontent.com/assets/459970/16955404/6e9ec51e-4da2-11e6-97e1-d43d2682e07b.png">

### Usage

- Uncheck "auto-expose" to set min and max height levels manually.
- Click "export" to open the current view as an image in a new tab - "Save As" to save the image to disk.
- Import the resulting image as a "displacement map" in a 3D application to generate a 3D model of the terrain.
- The "z:x scale factor" describes how "high" the current view is, on the z-axis, in terms of how wide the current view is on the x-axis. Multiplying this scale factor by the width of a 3D mesh in units x will tell you how high in units z your mesh should be after displacement in order to be true-scale.
- Press the "h" ey to toggle UI visibility.

### Note

The slider numbers aren't quite right, I don't think the scaling is correct – I'm not sure of the min and max values in the encoded data, I just assumed they would be Challenger Deep and Everest, which is *mostly* right... but 0m winds up being a couple of hundred meters below sea level.

### Todo

- fix the scale issue mentioned above
- add a GeoTIFF export option which includes metadata
- add a toggle to show borders, labels, rivers, etc
- **Extra Credit:** add an 'export zoom level' slider, to export at a higher resolution by fetching the appropriate tiles and stitching them together, maybe with a max_width (or max_filesize) parameter so you can export an array of Very Large Files
- **Super Extra Credit:** further export options including lat/lon bounding boxes, country/boundary masking using OSM vector tiles

### To run locally:

Start a web server in the repo's directory:

    python -m SimpleHTTPServer 8000
    
If that doesn't work, try:

    python -m http.server 8000
    
Then navigate to: [http://localhost:8000](http://localhost:8000)

