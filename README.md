# heightmapper

An easy way to export a grayscale heightmap, eg for use in 3D applications.

Uses [Mapzen's](http://mapzen.com/tangrams/tangram) global [elevation service](https://mapzen.com/blog/elevation).

Live demo: http://tangrams.github.io/heightmapper

<img width="900" alt="screen shot 2016-07-19 at 11 17 17 am" src="https://cloud.githubusercontent.com/assets/459970/16955404/6e9ec51e-4da2-11e6-97e1-d43d2682e07b.png">

### To run locally:

Start a web server in the repo's directory:

    python -m SimpleHTTPServer 8000
    
If that doesn't work, try:

    python -m http.server 8000
    
Then navigate to: [http://localhost:8000](http://localhost:8000)

### Note

The slider numbers aren't quite right, I don't think the scaling is correct – I'm not sure of the min and max values in the encoded data, I just assumed they would be Challenger Deep and Everest, which is *mostly* right... but 0m winds up being a couple of hundred meters below sea level.

### Todo

- fix the scale issue mentioned above
- add a 'hide all UI' toggle key, maybe use 'H' because dat.gui is already using it
- auto-exposure toggle button to set min and max values based on lowest and highest values in current view
- add an 'export' button
- **Extra Credit:** add an 'export zoom level' slider, to export at a higher resolution by fetching the appropriate tiles and stitching them together, maybe with a max_width (or max_filesize) parameter so you can export an array of Very Large Files
- **Super Extra Credit:** further export options including lat/lon bounding boxes, country/boundary masking using OSM vector tiles