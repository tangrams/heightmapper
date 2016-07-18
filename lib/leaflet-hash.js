(function(window) {

	L.Hash = function(map) {

		if (map) {
			this.init(map);
		}
	};

	L.Hash.parseHash = function(hash) {
		if(hash.indexOf('#') === 0) {
			hash = hash.substr(1);
		}
		var args = hash.split("/");
		if (args.length == 3) {
			var zoom = parseInt(args[0], 10),
			lat = parseFloat(args[1]),
			lon = parseFloat(args[2]);
			if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
				return false;
			} else {
				return {
					center: new L.LatLng(lat, lon),
					zoom: zoom
				};
			}
		} else {
			return false;
		}
	};

	L.Hash.formatHash = function(map) {
		var center = map.getCenter(),
		    zoom = map.getZoom(),
		    precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

		// cap zoom at 5 digits for beauty
		return "#" + [parseFloat(zoom.toFixed(5)),
			center.lat.toFixed(precision),
			center.lng.toFixed(precision)
		].join("/");
	},

	L.Hash.prototype = {
		map: null,
		lastHash: null,

		parseHash: L.Hash.parseHash,
		formatHash: L.Hash.formatHash,

		init: function(map) {
			this.map = map;

			// reset the hash
			this.lastHash = null;

			if (!this.isListening) {
				this.startListening();
			}
		},

		removeFrom: function(map) {
			if (this.changeTimeout) {
				clearTimeout(this.changeTimeout);
			}

			if (this.isListening) {
				this.stopListening();
			}

			this.map = null;
		},

		// defer hash change updates every changeDefer milliseconds
		changeDefer: 250,
		changeTimeout: null,
		onMapMove: function() {
			// bail if we're moving the map (updating from a hash),
			// or if the map is not yet loaded
			if (this.movingMap || !this.map._loaded) {
				return false;
			}

			var hash = this.formatHash(this.map);
			if (this.lastHash != hash) {
				this.lastHash = hash;
			}
			if (!this.changeTimeout) {
				var that = this;
				this.changeTimeout = setTimeout(function() {

					// update the hash
					window.location.replace(hash);

					that.changeTimeout = null;
				}, this.changeDefer);
			}
		},

		movingMap: false,

		isListening: false,
		startListening: function() {
			this.map.on("moveend", this.onMapMove, this);

			this.isListening = true;
		},

		stopListening: function() {
			this.map.off("moveend", this.onMapMove, this);

			this.isListening = false;
		}
	};
	L.hash = function(map) {
		return new L.Hash(map);
	};
	L.Map.prototype.addHash = function() {
		this._hash = L.hash(this);
	};
	L.Map.prototype.removeHash = function() {
		this._hash.removeFrom();
	};
})(window);
