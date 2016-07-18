# heightmapper

An easy way to export a grayscale heightmap, eg for use in 3D applications.

Uses [Mapzen's](http://mapzen.com/tangrams/tangram) global [elevation service](https://mapzen.com/blog/elevation).

Live demo: http://tangrams.github.io/heightmapper

### To run locally:

Start a web server in the repo's directory:

    python -m SimpleHTTPServer 8000
    
If that doesn't work, try:

    python -m http.server 8000
    
Then navigate to: [http://localhost:8000](http://localhost:8000)
