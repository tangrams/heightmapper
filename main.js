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
        // attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

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
