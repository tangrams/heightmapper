/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var map_start_location = [0, 0, 2];
    var global_min = 0;
    var global_max = 8848;
    var uminValue, umaxValue; // storage

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
        {"keyboardZoomOffset" : .05,
        "inertiaDeceleration" : 10000}
    );

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: 'Map by <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | <a href="https://github.com/tangram/heightmapper" target="_blank">Fork This</a>'
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

    function linkFromBlob(blob) {
        var urlCreator = window.URL || window.webkitURL;
        return urlCreator.createObjectURL( blob );
    }

    var viewComplete, viewCompleteResolve, viewCompleteReject;

    function resetViewComplete(frame) {
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
        if (scene.dirty === false) {
	    	console.log('not dirty');
	    	viewCompleteResolve();
        	analyse();
        } else if (scene.initialized) {
    	    	console.log('expose1')
    	    	console.log(viewComplete)
            // wait for scene to draw
            Promise.all([scene.requestRedraw(), viewComplete]).then(function(){
    	    	console.log('expose1')
                analyse();
            });
        } else {
    	    	console.log('expose2?')
            // wait for scene to initialize, then
              scene.initializing.then(function() {
                // wait for scene to draw
                Promise.all([scene.requestRedraw(), viewComplete]).then(function(){
    				console.log('expose2')
                    analyse();
                });
            });
        }
    }
    window.expose = expose;
    function analyse() {
        var curtain = document.getElementById("curtain");
        var curtainimg = curtain.getElementsByTagName('img')[0];

        // save the current view to the curtain div and cover the canvas with it
        scene.screenshot().then(function(curtainscreenshot) {
            curtainimg.onload = function(){
                // lower curtain
                curtain.style.display = "block";
                curtain.style.opacity = 1;
            
                // set controls to max
                scene.styles.hillshade.shaders.uniforms.u_min = global_min;
                scene.styles.hillshade.shaders.uniforms.u_max = global_max;
                scene.screenshot().then(function(screenshot) {
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
                        var stride = 3; // check every nth pixel, to speed up process
                        // 4 = only sample the red value in [R, G, B, A]
                        for (var i = 0; i < img.height * img.width * 4; i += 4 * stride) {
                            pixel = pixels.data[i];
                            if (pixel == 0) zeros.push(i);
                            min = Math.min(min, pixel);
                            max = Math.max(max, pixel);
                        }
                        // set u_min to min = 0
                        var range = (global_max - global_min);
                        gui.u_min = (min / 255) * range + global_min;
                        gui.u_max = (max / 255) * range + global_min;

                        // get the width of the current view in meters
                        // compare to the current elevation range in meters
                        // the ratio is the "height" of the current scene compared to its width –
                        // multiply it by the width of your 3D mesh to get the height

                        var zrange = (gui.u_max - gui.u_min);
                        var xscale = zrange / scene.view.size.meters.x;
                        gui.scaleFactor = xscale +''; // convert to string to make the display read-only

                        // update dat.gui controllers
                        for (var i in gui.__controllers) {
                            gui.__controllers[i].updateDisplay();
                        }

                        scene.styles.hillshade.shaders.uniforms.u_min = gui.u_min;
                        scene.styles.hillshade.shaders.uniforms.u_max = gui.u_max;
                        // scene.requestRedraw();

                        resetViewComplete();
                    	console.log('viewcomplete:', viewComplete);
						// redraw with new settings
                        Promise.all([scene.requestRedraw(), viewComplete]).then(function(){
                            // raise curtain
                            fade(curtain);
                            resetViewComplete();

                        })

                    };

                    img.src = screenshot.url;

                });

            };

            curtainimg.src = curtainscreenshot.url;

        });
    }

    function fade(element) {
        var op = 1;  // initial opacity
        var timer = setInterval(function () {
            if (op <= 0.1){
                clearInterval(timer);
                curtain.style.display = "none";
            }
            element.style.opacity = op;
            op -= op * 0.5;
        }, 25);
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
        gui.add(gui, 'scaleFactor').name("z:x scale factor");
        gui.autoexpose = true;
        gui.add(gui, 'autoexpose').name("auto-exposure").onChange(function(value) {
            sliderState(!value);
            if (value) {
	        	// store slider values
	        	uminValue = gui.u_min;
	        	umaxValue = gui.u_max;
	        	resetViewComplete();
            	expose();
            } else if (typeof uminValue != 'undefined') {
	        	// retrieve slider values
	        	gui.u_min = uminValue;
	        	gui.u_max = umaxValue;
            }
        });
        gui.include_oceans = false;
        gui.add(gui, 'include_oceans').name("include ocean data").onChange(function(value) {
            if (value) global_min = -10916;
            else global_min = 0;
        });
        gui.export = function () {
            // button to open screenshot in a new tab – 'save as' to save to disk
            scene.screenshot().then(function(screenshot) { window.open(screenshot.url); });
        }
        gui.add(gui, 'export');
        gui.help = function () {
            // show help screen and input blocker
            toggleHelp(true);
        }
        gui.add(gui, 'help');
        // disable scale factor text field - it is output only
        gui.__controllers[2].domElement.parentElement.style.pointerEvents = "none"

    }

    // disable sliders when autoexpose is on
    function sliderState(active) {
        var pointerEvents = active ? "auto" : "none";
        var opacity = active ? 1. : .5;
        gui.__controllers[0].domElement.parentElement.style.pointerEvents = pointerEvents;
        gui.__controllers[0].domElement.parentElement.style.opacity = opacity;
        gui.__controllers[1].domElement.parentElement.style.pointerEvents = pointerEvents;
        gui.__controllers[1].domElement.parentElement.style.opacity = opacity;
    }

    // show and hide help screen
    function toggleHelp(active) {
        var visibility = active ? "visible" : "hidden";
        document.getElementById('help').style.visibility = visibility;
        document.getElementById('help-blocker').style.visibility = visibility;
    }


    document.onkeypress = function (e) {
        e = e || window.event;
        // listen for "h"
        if (e.which == 104) {
            // toggle UI
            var display = map._controlContainer.style.display;
            map._controlContainer.style.display = (display === "none") ? "block" : "none";
        }
    };

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
                    viewCompleteResolve();
                }
            });

            sliderState(false);

        });
        layer.addTo(map);
        // tuck curtain between leaflet controls and map
        map._container.insertBefore(curtain, map._container.firstChild);

        // bind help div onclicks
        document.getElementById('help').onclick = function(){toggleHelp(false)};
        document.getElementById('help-blocker').onclick = function(){toggleHelp(false)};

        // debounce moveend event
        var moveend = debounce(function(e) {
            expose();
        }, 100);

        map.on("moveend", function (e) { moveend(e) });

    });

    return map;

}());
