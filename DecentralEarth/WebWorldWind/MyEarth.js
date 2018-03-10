var userBalance, selectedCountry, wwd, highlightedItems = [];

function updateSelectedCountry(countryOwner, countryValue) {
    var redrawRequired = false;
    for (var h = 0; h < highlightedItems.length; h++) {
        var label = highlightedItems[h].label;
        if (label.indexOf("\n") > 0) label = label.substr(0, label.indexOf("\n"));
        highlightedItems[h].label = label + "\nOwned by " + countryOwner
                                  + "\nPrice: " + countryValue + "eth";
        highlightedItems[h].highlighted = true;
        redrawRequired = true;
    }
    if (redrawRequired) wwd.redraw();
}

requirejs(['./examples/WorldWindShim', './examples/LayerManager'],
function(WorldWind, LayerManager) {
    "use strict";
    WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
    wwd = new WorldWind.WorldWindow("canvasOne");
    wwd.deepPicking = true;
    
    // Handle picking
    var handlePick = function (o) {
        var x = o.clientX, y = o.clientY;
        var redrawRequired = highlightedItems.length > 0;
        for (var h = 0; h < highlightedItems.length; h++) {
            var label = highlightedItems[h].label;
            if (label.indexOf("\n") > 0)
              highlightedItems[h].label = label.substr(0, label.indexOf("\n"));
            highlightedItems[h].highlighted = false;
        }
        highlightedItems = [];
        selectedCountry = 0;

        var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
        if (pickList.objects.length > 0) {
            for (var p = 0; p < pickList.objects.length; p++) {
                selectedCountry = parseInt(pickList.objects[p].userObject.userProperties);
                if (isNaN(selectedCountry)) continue;
                App.showCountryOwner(selectedCountry);
                highlightedItems.push(pickList.objects[p].userObject);
            }
        }
        if (redrawRequired) wwd.redraw();
    };
    var tapRecognizer = new WorldWind.TapRecognizer(wwd, handlePick);
    wwd.addEventListener("click", handlePick);
    
    // Add layers
    var layers = [
        {layer: new WorldWind.BMNGLayer(), enabled: true},
        {layer: new WorldWind.AtmosphereLayer(), enabled: true},
        {layer: new WorldWind.StarFieldLayer(), enabled: true},
        {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: false},
        {layer: new WorldWind.ViewControlsLayer(wwd), enabled: false}
    ];

    for (var l = 0; l < layers.length; l++) {
        layers[l].layer.enabled = layers[l].enabled;
        wwd.addLayer(layers[l].layer);
    }
    
    // Load shapefiles & pickable pins
    var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
    placemarkAttributes.imageScale = 1.0;
    placemarkAttributes.imageOffset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.3, WorldWind.OFFSET_FRACTION, 0.0);
    placemarkAttributes.imageColor = WorldWind.Color.WHITE;
    placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 1.0);
    placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
    placemarkAttributes.drawLeaderLine = true;
    placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;
    placemarkAttributes.imageSource = WorldWind.WWUtil.currentUrlSansFilePart()
                                    + "/images/pushpins/plain-red.png";
    
    var placemarkLayer = new WorldWind.RenderableLayer("Placemarks");
    wwd.addLayer(placemarkLayer);
    
    var shapeConfigurationCallback = function(attributes, record) {
        var configuration = {};
        configuration.name = attributes.values.name || attributes.values.Name || attributes.values.NAME;
        if (record.isPointType()) {
            configuration.name = attributes.values.name || attributes.values.Name || attributes.values.NAME;
            configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            if (attributes.values.pop_max) {
                var population = attributes.values.pop_max;
                configuration.attributes.imageScale = 0.01 * Math.log(population);
            }
        } else if (record.isPolygonType()) {
            configuration.attributes = new WorldWind.ShapeAttributes(null);
            configuration.attributes.interiorColor = new WorldWind.Color(0.0, 0.0, 0.0, 0.1);
            configuration.attributes.outlineColor = new WorldWind.Color(
                0.375 + 0.5 * Math.random(), 0.375 + 0.5 * Math.random(),
                0.375 + 0.5 * Math.random(), 1.0);
            configuration.attributes.outlineWidth = 2.5;
            
            var latitude = (record.boundingRectangle[0] + record.boundingRectangle[1]) / 2;
            var longitude = (record.boundingRectangle[2] + record.boundingRectangle[3]) / 2;
            var placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, 1e2), false, null);
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
            placemark.eyeDistanceScaling = true;
            placemark.eyeDistanceScalingThreshold = 20000000;
            placemark.eyeDistanceScalingLabelThreshold = 10000000;
            placemark.label = record.attributes.values.name;
            placemark.userProperties = record.attributes.recordNumber;
            
            var placemarkAttributes2 = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            var highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 1.2;
            placemark.attributes = placemarkAttributes2;
            placemark.highlightAttributes = highlightAttributes;
            placemarkLayer.addRenderable(placemark);
        }
        return configuration;
    };
    
    var worldLayer = new WorldWind.RenderableLayer("Countries");
    var worldShapefile = new WorldWind.Shapefile("./shp/ne_110m_admin_0_countries.shp");
    worldShapefile.load(null, shapeConfigurationCallback, worldLayer);
    wwd.addLayer(worldLayer);

    // Create a layer manager for controlling layer visibility.
    var layerManager = new LayerManager(wwd);
    wwd.redraw();
});
