/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var map_start_location = [0, 0, 2];

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');

    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05}
    );

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: 'Map by <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | <a href="https://github.com/tangram/heightmapper" target="_blank">Fork This</a>'
    });

    map.on("dragend", function (e) {
        // console.log("DRAGEND", e); 
        analyse();
    });
    
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    var zoomend = debounce(function(e) {
        // console.log('debounce?')
        // All the taxing stuff you do
        // console.log("ZOOMEND", e);
        analyse();
    }, 100);

    map.on("zoomend", function (e) { zoomend(e) });

    function linkFromBlob(blob) {
        var urlCreator = window.URL || window.webkitURL;
        return urlCreator.createObjectURL( blob );
    }

    function analyse() {
        scene.screenshot().then(function(screenshot) {
            // window.open(screenshot.url);
            console.log(screenshot)

            var img = new Image();
            // debugger;
            img.onload = function(){
                var myCanvas = document.createElement("canvas");
                // console.log('img:', img)
                myCanvas.width = img.width; 
                myCanvas.height = img.height;
                var ctx = myCanvas.getContext("2d"); // Get canvas 2d context
                ctx.drawImage(img,0,0);
                var min = 255;
                var max = 0;
                var pixel;
                for (var w = 0; w < img.width; w++) {
                    console.log(w);
                    for (var h = 0; h < img.height; h++) {
                    console.log(h);
                        pixel = ctx.getImageData(w,h, 1, 1); // Read the pixel
                        min = Math.min(min, pixel.data[0]);
                        max = Math.max(max, pixel.data[0]);
                    }

                }
                console.log('min, max:', min, max);
            };

            img.src = screenshot.url;

        });
    }

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);

    var hash = new L.Hash(map);

    // Create dat GUI
    var gui;
    function addGUI () {
        gui.domElement.parentNode.style.zIndex = 5; // make sure GUI is on top of map
        window.gui = gui;
        gui.u_max = 8848.;
        gui.add(gui, 'u_max', -10916., 8848).name("max elevation").onChange(function(value) {
            scene.styles.hillshade.shaders.uniforms.u_max = value;
            scene.requestRedraw();
        });
        gui.u_min = -10916.;
        gui.add(gui, 'u_min', -10916., 8848).name("min elevation").onChange(function(value) {
            scene.styles.hillshade.shaders.uniforms.u_min = value;
            scene.requestRedraw();
        });
    }

    /***** Render loop *****/

    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            gui = new dat.GUI({ autoPlace: true, hideable: true, width: 300 });
            addGUI();
        });
        layer.addTo(map);
    });

    return map;

}());
