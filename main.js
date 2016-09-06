/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var map_start_location = [0, 0, 2];
    var global_min = 0;
    var global_max = 8848;

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
        expose();
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
        expose();
    }, 500);

    map.on("zoomend", function (e) { zoomend(e) });

    function linkFromBlob(blob) {
        var urlCreator = window.URL || window.webkitURL;
        return urlCreator.createObjectURL( blob );
    }

    var viewComplete, viewCompleteResolve, viewCompleteReject;

    function resetViewComplete(frame) {
        // console.log('resetViewComplete')
        viewComplete = new Promise(function(resolve, reject){
                viewCompleteResolve = function(){
                    resolve();
                };
                viewCompleteReject = function(e){
                    reject();
                };
            });
    }

    function expose() {
        if (typeof gui != 'undefined' && gui.autoexpose == false) return false;
        if (scene.initialized) {
            // ask for a redraw
            resetViewComplete();
            Promise.all([scene.requestRedraw(), viewComplete]).then(function(){
                analyse();
            })
        } else {
            // wait for scene to initialize then
            scene.initializing.then(function() {
                // ask for a redraw
                Promise.all([scene.requestRedraw(), viewComplete]).then(function(){
                    analyse();
                })
            });
        }
    }

    function analyse() {
        // set controls to max
        scene.styles.hillshade.shaders.uniforms.u_min = global_min;
        scene.styles.hillshade.shaders.uniforms.u_max = global_max;
        scene.screenshot().then(function(screenshot) {
            // window.open(screenshot.url);
            var img = new Image();
            img.onload = function(){
                var tempCanvas = document.createElement("canvas");
                tempCanvas.width = img.width; 
                tempCanvas.height = img.height;
                var ctx = tempCanvas.getContext("2d"); // Get canvas 2d context
                ctx.drawImage(img,0,0);
                var min = 255;
                var max = 0;
                var pixel;
                var pixels = ctx.getImageData(0,0, img.width, img.height); // get all the pixels
                var zeros = [];
                // only sample the red value in [R, G, B, A]
                for (var i = 0; i < img.height * img.width * 4; i += 4) {
                    pixel = pixels.data[i];
                    if (pixel == 0) zeros.push(i);
                    min = Math.min(min, pixel);
                    max = Math.max(max, pixel);
                }
                // console.log('min, max:', min, max);
                // set u_min to min = 0
                var range = (global_max - global_min);
                gui.u_min = (min / 255) * range + global_min;
                gui.u_max = (max / 255) * range + global_min;
                // update scale factor

				// get the mercator meters per pixel for the current zoom level
				// multiply by the current vertical range to show how many vertical meters are represented
				// compared to the size of the current view – in other words, how many pixels tall would the scene
				// be – this must be taken into account when getting screengrabs – multiply the scale factor by the width
				// of the screengrab to get the ratio of z-height to width for the exported 3d scene

				var tile_size = 256;
				var half_circumference_meters = 20037508.342789244;
				var circumference_meters = half_circumference_meters * 2;

				var min_zoom_meters_per_pixel = circumference_meters / tile_size; // min zoom draws world as 2 tiles wide

				var meters_per_pixel = [];
				function metersPerPixel (z) {
				    meters_per_pixel[z] = meters_per_pixel[z] || min_zoom_meters_per_pixel / Math.pow(2, z);
				    return meters_per_pixel[z];
				};

				// scale factor = how many pixels high is this elevation given the current zoom and range settings?
				// multiply this by the width of your extract to get the z-height
				var mpp = metersPerPixel(scene.view.zoom);
				console.log('metersPerPixel:', mpp);
				var zrange = (gui.u_max - gui.u_min);
				console.log('zrange in meters:', zrange);
				var zpx = zrange / mpp;
				console.log('z in pixels:', zpx);
				console.log('current width in meters:', scene.view.size.meters.x)
				console.log('z in factors of x:', scene.view.size.meters.x / zrange)
				var xscale = zrange / scene.view.size.meters.x;
				// var zmeters = (gui.u_max - gui.u_min) / metersPerPixel(scene.view.zoom);
				// var scale = (gui.u_max - gui.u_min) / metersPerPixel(scene.view.zoom);
				gui.scaleFactor = xscale +''; // convert to string to make the display read-only

				// update dat.gui controllers
                for (var i in gui.__controllers) {
                    gui.__controllers[i].updateDisplay();
                }
                
                scene.styles.hillshade.shaders.uniforms.u_min = gui.u_min;
                scene.styles.hillshade.shaders.uniforms.u_max = gui.u_max;
                scene.requestRedraw();
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
        gui.scaleFactor = 1 +'';
        gui.add(gui, 'scaleFactor').name("x scale factor");
        gui.autoexpose = true;
        gui.add(gui, 'autoexpose').name("auto-exposure").onChange(function(value) {
            if (value) expose();
        });
        gui.include_oceans = false;
        gui.add(gui, 'include_oceans').name("include ocean data").onChange(function(value) {
            if (value) global_min = -10916;
            else global_min = 0;
        });
    }
    window.gui = gui;
    /***** Render loop *****/

    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            gui = new dat.GUI({ autoPlace: true, hideable: true, width: 300 });
            addGUI();
            resetViewComplete();
            scene.subscribe({
                // trigger promise resolution
                view_complete: function() {
                    // console.log('view_complete triggered');
                    viewCompleteResolve();
                }
            });


        });
        layer.addTo(map);
    });

    return map;

}());
