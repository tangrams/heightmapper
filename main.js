/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
  'use strict';
  
  var map_start_location = [0, 0, 2];
  var global_min = 0;
  var global_max = 8900;
  var uminValue, umaxValue; // storage
  var scene_loaded = false;
  var moving = false;
  var analysing = false;
  var done = false;
  var tempCanvas;
  var spread = 1;
  var lastumax = null;
  var diff = null;
  var stopped = false; // emergency brake
  var widening = false;
  var tempFactor = 8; // size of tempCanvas relative to main canvas: 1/n
  
  // Renderer:
  // byte to mb factor:
  const mb_factor = 1.0 / (1024 * 1024);
  var zoomRender = 2;
  const min_zoomRender = 1;
  const max_zoomRender = 8; // if you need more, fork this repo and use your own api key!
  
  var renderName = {name: 'render'};
  
  /*** URL parsing ***/
  
  // leaflet-style URL hash pattern:
  // #[zoom],[lat],[lng]
  var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');
  
  if (url_hash.length == 3) {
    map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
    // convert from strings
    map_start_location = map_start_location.map(Number);
  }
  
  var query = splitQueryParams();
  // { language: 'en', this: 'no'}
  
  function splitQueryParams () {
    var str = window.location.search;
    
    var kvArray = str.slice(1).split('&');
    // ['language=en', 'this=no']
    
    var obj = {};
    
    for (var i = 0, j=kvArray.length; i<j; i++) {
      var value = kvArray[i].split('=');
      var k = window.decodeURIComponent(value[0]);
      var v = window.decodeURIComponent(value[1]);
      
      obj[k] = v;
    }
    
    return obj;
  }
  
  /*** Map ***/
  
  var map = L.map('map',
  {"keyboardZoomOffset" : .05,
  "inertiaDeceleration" : 10000,
  "zoomSnap" : .001}
  );
  
  var layer = Tangram.leafletLayer({
    scene: 'scene.yaml',
    attribution: 'Map by <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | <a href="https://github.com/tangrams/heightmapper" target="_blank">Fork This</a>',
    postUpdate: function() {
      if (gui.autoexpose && !stopped) {
        // three stages:
        // 1) start analysis
        if (!analysing && !done) { 
          expose();
        }
        // 2) continue analysis
        else if (analysing && !done) {
          start_analysis();
        }
        // 3) stop analysis and reset
        else if (done) {
          done = false;
        }
      }
    }
  });
  
  // from https://davidwalsh.name/javascript-debounce-function
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
  
  function expose() {
    analysing = true;
    if (typeof gui != 'undefined' && gui.autoexpose == false) return false;
    if (scene_loaded) {
      start_analysis();
    } else {
      // wait for scene to initialize first
      scene.initializing.then(function() {
        start_analysis();
      });
    }
  }
  
  function updateGUI() {
    // update dat.gui controllers
    for (var i in gui.__controllers) {
      gui.__controllers[i].updateDisplay();
    }
  }
  
  function start_analysis() {
    // set levels
    var levels = analyse();
    diff = levels.max - lastumax;
    if (typeof levels.max !== 'undefined') lastumax = levels.max;
    else diff = 1;
    // was the last change a widening or narrowing?
    widening = diff < 0 ? false : true;
    if (levels) {
      scene.styles.hillshade.shaders.uniforms.u_min = levels.min;
      scene.styles.hillshade.shaders.uniforms.u_max = levels.max;
    }
    scene.requestRedraw();
  }
  
  function analyse() {
    var ctx = tempCanvas.getContext("2d"); // Get canvas 2d context
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // redraw canvas smaller in testing canvas, for speed
    ctx.drawImage(scene.canvas,0,0,scene.canvas.width/tempFactor,scene.canvas.height/tempFactor);
    // get all the pixels
    var pixels = ctx.getImageData(0,0, tempCanvas.width, tempCanvas.height);
    
    var val;
    var counts = {};
    var empty = true;
    var max = 0, min = 255;
    // only check every nth pixel (vary with browser size)
    // var stride = Math.round(img.height * img.width / 1000000);
    // 4 = only sample the red value in [R, G, B, A]
    for (var i = 0; i < tempCanvas.height * tempCanvas.width * 4; i += 4) {
      val = pixels.data[i];
      var alpha = pixels.data[i+3];
      if (alpha === 0) { // empty pixel, skip to the next one
        continue;
      }
      // if we got this far, we found at least one non-empty pixel!
      empty = false;
      // update counts, to get a histogram
      counts[val] = counts[val] ? counts[val]+1 : 1;
      
      // update min and max so far
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
    
    if (empty) {
      // no pixels found, skip the analysis
      return false;
    }
    if (max > 253 && min < 4 && !widening ) {
      // looks good, done
      analysing = false;
      done = true;
      spread = 2;
      return false;
    }
    if (max > 252 && min < 4 && widening) {
      // over-exposed, widen the range
      spread *= 2;
      // cap spread
      spread = Math.min(spread, 512)
      // console.log("WIDEN >", spread, "   diff:", diff)
      max += spread;
      min -= spread;
    }
    
    // calculate adjusted elevation settings based on current pixel
    // values and elevation settings
    var range = (gui.u_max - gui.u_min);
    var minadj = (min / 255) * range + gui.u_min;
    var maxadj = (max / 255) * range + gui.u_min;
    
    // keep levels in range
    minadj = Math.max(minadj, -11000);
    maxadj = Math.min(maxadj, 8900);
    // only let the minimum value go below 0 if ocean data is included
    minadj = gui.include_oceans ? minadj : Math.max(minadj, 0);
    
    // keep min and max separated
    if (minadj === maxadj) maxadj += 10;
    
    // get the width of the current view in meters
    // compare to the current elevation range in meters
    // the ratio is the "height" of the current scene compared to its width –
    // multiply it by the width of your 3D mesh to get the height
    var zrange = (gui.u_max - gui.u_min);
    var xscale = zrange / scene.view.size.meters.x;
    gui.scaleFactor = xscale +''; // convert to string to make the display read-only
    
    scene.styles.hillshade.shaders.uniforms.u_min = minadj;
    scene.styles.hillshade.shaders.uniforms.u_max = maxadj;
    
    // update dat.gui controllers
    gui.u_min = minadj;
    gui.u_max = maxadj;
    updateGUI();
    
    return {max: maxadj, min: minadj}
  }
  
  window.layer = layer;
  var scene = layer.scene;
  window.scene = scene;
  
  // setView expects format ([lat, long], zoom)
  map.setView(map_start_location.slice(0, 3), map_start_location[2]);
  
  let hash = new L.Hash(map);

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
    // gui.u_min = -10916.;
    gui.u_min = 0.;
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
        // force widening value to trigger redraw
        lastumax = 0;
        expose();
      } else if (typeof uminValue != 'undefined') {
        // retrieve slider values
        scene.styles.hillshade.shaders.uniforms.u_min = uminValue;
        scene.styles.hillshade.shaders.uniforms.u_max = umaxValue;
        scene.requestRedraw();
        gui.u_min = uminValue;
        gui.u_max = umaxValue;
        updateGUI();
      }
    });
    
    gui.include_oceans = false;
    gui.add(gui, 'include_oceans').name("include ocean data").onChange(function(value) {
      if (value) global_min = -11000;
      else global_min = 0;
      gui.u_min = global_min;
      scene.styles.hillshade.shaders.uniforms.u_min = global_min;
      expose();
    });
    
    gui.map_lines = false;
    gui.add(gui, 'map_lines').name("map lines").onChange(function(value) {
      toggleLines(value);
    });
    
    gui.map_labels = false;
    gui.add(gui, 'map_labels').name("map labels").onChange(function(value) {
      toggleLabels(value);
    });
    
    // gui.API_KEY = query.api_key || 'mapzen-XXXXXX';
    // gui.add(gui, 'API_KEY').name("API KEY").onChange(function(value) {
    //   scene.config.sources["elevation-high"].url_params.api_key = value;
    //   scene.config.layers["terrain-high"].enabled = true;
    //   scene.updateConfig();
    // });
    
    gui.export = function () {
      return scene.screenshot().then(function(screenshot) {
        // if (gui.API_KEY === 'mapzen-XXXXXX') {
        //   alert('Please enter your API key!')
        //   scene.config.layers["terrain-high"].enabled = false;
        //   scene.updateConfig();
        // } else if (gui.API_KEY === scene.config.sources.elevation.url_params.api_key) {
        //   alert('Please enter your own API key!')
        //   scene.config.layers["terrain-high"].enabled = false;
        //   scene.updateConfig();
        // } else {
        // uses FileSaver.js: https://github.com/eligrey/FileSaver.js/
        saveAs(screenshot.blob, 'heightmapper-' + (+new Date()) + '.png');
        // }
      });
    }
    gui.add(gui, 'export');
    
    gui.zoomRender = zoomRender;
    gui.add(gui, 'zoomRender', min_zoomRender, max_zoomRender, 1).name("Render Multiplier").onChange(function(value) {
      zoomRender = Math.round(value);
      
    });
    
    gui.renderName = renderName.name;
    gui.add(gui, 'renderName').name('Render Name').onChange(function(value) {
      renderName.name = value;
    });
    
    gui.render = function () {
      renderView();
    }
    
    gui.add(gui, 'render');
    
    
    
    gui.help = function () {
      // show help screen and input blocker
      toggleHelp(true);
    }
    gui.add(gui, 'help');
    // set scale factor text field to be uneditable but still selectable (for copying)
    gui.__controllers[2].domElement.firstChild.setAttribute("readonly", true);
    
  }
  function stop() {
    console.log('stopping')
    stopped = true;
    console.log('stopping:', stopped)
    
  }
  function go() {
    stopped = false;
  }
  
  async function renderView() {
    // account for retina screens etc
    let zoomFactor = zoomRender * window.devicePixelRatio;
    const originalX = scene.canvas.width;
    const originalY = scene.canvas.height;
    const outputX = originalX * zoomRender;
    const outputY = originalY * zoomRender;
    const size_mb = Math.ceil(scene.canvas.width * scene.canvas.height * zoomFactor * mb_factor);
    const status = confirm(`Potential image size with ${zoomRender}x zoom render: ${size_mb} MB\nEstimated dimensions: ${outputX}X${outputY} pixels.\nAn Alert will display when the render is complete.\nThis will take some time, continue?`);
    
    if(!status) {
      return;
    }
    
    // Pre-redraw to make sure view is set:
    map.invalidateSize(true);
    
    // TODO: lock interaction.
    
    logRenderStep("Preparing render");
    
    // Store original bounds to return post render.
    const originalBounds = map.getBounds();
    
    // Turn off auto-exposure:
    const preRenderAutoExposureState = gui.autoexpose;
    gui.autoexpose = false;
    const widthPerCell = scene.canvas.width / zoomFactor;
    const heightPerCell = scene.canvas.height / zoomFactor;
    const captures = [];
    const captureOrigins = [];
    // Cache all the bounding box points before moving the map for each render.
    const cells = [];
    for(let i = 0; i < zoomRender; i++) {
      for(let j = 0; j < zoomRender; j++) {
        // Get a bounding box of the Points using northwest and southeast:
        const nwPoint = L.point(i * widthPerCell, j * heightPerCell, false);
        const sePoint = L.point(nwPoint.x + widthPerCell, nwPoint.y + heightPerCell, false);
        // Use the map container and not layer PointToLatLng for the most current position.
        const topLeftCoords = map.containerPointToLatLng(nwPoint);
        const bottomRightCoords = map.containerPointToLatLng(sePoint);
        // Coordinate bounding box of where we want to be:
        const bounds = L.latLngBounds(topLeftCoords, bottomRightCoords);
        // Cache the origin point of the cell for later (rounding errrors);
        captureOrigins.push(nwPoint);
        cells.push(bounds);
      }
    }
    
    logRenderStep("Rendering cells");
    
    // Render each cell:
    let count = 0;
    for(const bounds of cells) {
      // wait for Leaflet moveend + zoomend events
      await async function() {
        return new Promise(resolve => {
          map.once('moveend zoomend', resolve);
          map.fitBounds(bounds);
        });
      }();
      await awaitViewComplete().then(async () => {
        // Cache the screenshot
        const renderedCell = await scene.screenshot();
        captures[count] = renderedCell.url;
        // saveAs(renderedCell.blob, `render-cell-${count}.png`);
        console.log(`Cell ${count} rendered`);
        count++
      });
    }

    map.fitBounds(originalBounds);

    logRenderStep("Building final image");
    
    // Stitch the image together
    const renderCanvas = document.createElement('canvas');
    renderCanvas.id = "renderCanvas";
    renderCanvas.width = outputX;
    renderCanvas.height = outputY;
    const renderContext = renderCanvas.getContext("2d");
    
    for(let i = 0; i < captures.length; i++) {
      const xPixel = captureOrigins[i].x * zoomFactor;
      const yPixel = captureOrigins[i].y * zoomFactor;
      await addImageToCanvas(renderContext, captures[i], xPixel, yPixel);
      console.log("added image to canvas");
    }
    
    logRenderStep("Saving render");
    const blob = await getCanvasBlob(renderCanvas);
    saveAs(blob, `${renderName.name ?? 'render'}.png`);
    
    // Clean up:
    logRenderStep("Cleaning up");
    gui.autoexpose = preRenderAutoExposureState;
    alert("Render complete!");
  }
  
  function waitForSeconds(seconds) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, seconds*1000);
    });
  }
  
  
  function awaitViewComplete() {
    return new Promise((resolve, reject) => {
      scene.subscribe({
        view_complete: () => {resolve();}
      })
    });  
  }
  
  // Note: x and y on canvas start top left.
  function addImageToCanvas(ctx, src, x, y) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = function() {
        ctx.drawImage(img, x, y);
        resolve();
      }
    })
  }
  
  function getCanvasBlob(canvasElement) {
    return new Promise((resolve, reject) => {
      canvasElement.toBlob(function(blob) {
        resolve(blob);
      });
    });
  }
  
  function logRenderStep(title) {
    console.log("=========================");
    console.log(title);
    console.log("=========================");
  }
  
  window.stop = stop;
  window.go = go;
  
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
    // help-blocker prevents map interaction while help is visible
    document.getElementById('help-blocker').style.visibility = visibility;
  }
  
  // show and hide new alert
  function toggleNew(active) {
    var visibility = active ? "visible" : "hidden";
    document.getElementById('new').style.visibility = visibility;
    // help-blocker prevents map interaction while help is visible
    document.getElementById('help-blocker').style.visibility = visibility;
  }
  
  // draw boundary and water lines
  function toggleLines(active) {
    // scene.config.layers.water.visible = active;
    scene.styles.togglelines.shaders.uniforms.u_alpha = active ? 1. : 0.;
    scene.requestRedraw();
  }
  // draw labels
  function toggleLabels(active) {
    // scene.config.layers.water.visible = active;
    scene.styles.toggletext.shaders.uniforms.u_alpha = active ? 1. : 0.;
    scene.requestRedraw();
  }
  
  document.onkeydown = function (e) {
    e = e || window.event;
    // listen for 'h'
    if (e.which == 72 && document.activeElement != document.getElementsByClassName('leaflet-pelias-input')[0]) {
      // toggle UI
      var display = map._controlContainer.style.display;
      map._controlContainer.style.display = (display === "none") ? "block" : "none";
      document.getElementsByClassName('dg')[0].style.display = (display === "none") ? "block" : "none";
      // listen for 'esc'
    } else if (e.which == 27) {
      toggleHelp(false);
    }
  };
  
  /***** Render loop *****/
  window.addEventListener('load', function () {
    // Scene initialized
    layer.on('init', function() {
      gui = new dat.GUI({ autoPlace: true, hideable: true, width: 300 });
      addGUI();
      // resetViewComplete();
      scene.subscribe({
        // will be triggered when tiles are finished loading
        // and also manually by the moveend event
        view_complete: function() {
        }
      });
      scene_loaded = true;
      
      sliderState(false);
      tempCanvas = document.createElement("canvas");
      // document.body.appendChild(tempCanvas);
      // tempCanvas.style.position = "absolute";
      // tempCanvas.style.zIndex = 10000;
      
      tempCanvas.width = scene.canvas.width/tempFactor; 
      tempCanvas.height = scene.canvas.height/tempFactor;
      
    });
    layer.addTo(map);
    
    // bind help div onclicks
    document.getElementById('help').onclick = function(){toggleHelp(false)};
    document.getElementById('new').onclick = function(){toggleNew(false)};
    document.getElementById('help-blocker').onclick = function(){toggleHelp(false);toggleNew(false);};
    
    // debounce moveend event
    var moveend = debounce(function(e) {
      moving = false;
      // manually reset view_complete
      scene.resetViewComplete();
      scene.requestRedraw();
    }, 250);
    
    map.on("movestart", function (e) { moving = true; });
    map.on("moveend", function (e) { moveend(e) });
    
    // toggleNew(true);
  });
  
  return map;
  
}());
