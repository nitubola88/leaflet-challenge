console.log('Logic script is loaded');
let usgsURL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

// Fetch the earthquake data
d3.json(usgsURL).then(function (usgsData) {
    createFeatures(usgsData.features);
});

// Function to handle the features and create the map layers
function createFeatures(eqData) {
    // Define the point-to-layer function to assign markers based on depth
    function pointToLayer(feature, coords) {
        let depth = feature.geometry.coordinates[2]; // Depth of the earthquake
        let size = feature.properties.mag * 4; // Size based on magnitude
        let color = getColorByDepth(depth); // Get color based on depth
        
        // Create the circle marker with corresponding properties
        return L.circleMarker(coords, {
            radius: size,
            fillColor: color,
            color: "#000", // Border color for the circle marker
            weight: 1, // Border weight
            opacity: 1, // Border opacity
            fillOpacity: 0.7, // Fill opacity
        });
    }

    // Define color scale based on depth
    function getColorByDepth(depth) {
        return depth >= 90 ? "#e60000" :
               depth >= 70 ? "#ff6600" :
               depth >= 50 ? "#ffc266" :
               depth >= 30 ? "#ffff80" :
               depth >= 10 ? "#ddff99" :
                             "#b3f0ff"; // Default color for depths < 10 km
    }

    // Define the function to bind a popup and tooltip for each earthquake
    function onEachFeature(feature, layer) {
        // Get the necessary details from the earthquake feature
        const magnitude = feature.properties.mag;
        const location = feature.properties.place;
        const depth = feature.geometry.coordinates[2];
        
        // Bind a tooltip to the feature with details
        layer.bindTooltip(`
            <strong>Location:</strong> ${location}<br>
            <strong>Magnitude:</strong> ${magnitude}<br>
            <strong>Depth:</strong> ${depth} km
        `, { permanent: false, direction: "top", offset: [0, -5] });
        
        // Optionally, bind a popup to show more details when clicked (can be removed if not needed)
        layer.bindPopup(`
            <h3>Location: ${location}</h3>
            <p>Magnitude: ${magnitude}</p>
            <p>Depth: ${depth} km</p>
        `);
    }

    // Create the earthquake layer
    let eqs = L.geoJSON(eqData, {
        pointToLayer: pointToLayer,
        onEachFeature: onEachFeature // Bind the tooltips and popups to the features
    });

    // Fetch tectonic plates data
    let platesDataUrl = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json';
    d3.json(platesDataUrl).then(function (platesData) {
        createMap(eqs, platesData); // Pass both earthquake and tectonic plate data to the map
    });
}

// Function to create the map
function createMap(eqs, platesData) {
    // Base Layers (satellite, grayscale, outdoors)
    let satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
        {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    );
    let grayscaleLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", 
        { attribution: '© OpenStreetMap contributors, © CartoDB' }
    );
    
    // Use OpenTopoMap as a reliable Outdoors layer
    let outdoorsLayer = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", 
        { attribution: 'Map style by OpenTopoMap, under CC BY-SA 3.0' }
    );

    // Create the map and set default layers
    let eqMap = L.map("map", {
        center: [37.09, -95.71], // Center of the map
        zoom: 5,
        layers: [satelliteLayer, eqs] // Default layers
    });
   
    // Layer control
    let baseMaps = {
        "Satellite": satelliteLayer,
        "Grayscale": grayscaleLayer,
        "Outdoors": outdoorsLayer
    };
    let tectonicLayer = L.geoJSON(platesData, {
        color: "#ff6600",  // Set the color of tectonic plates lines to orange
        weight: 2,         // Set the thickness of the tectonic plate lines
        opacity: 0.7,      // Set the opacity of the tectonic plate lines
        fillOpacity: 0     // Set the fill opacity to 0 to ensure there is no fill
    });

    let overlayMaps = {
        "Earthquakes": eqs,
        "Tectonic Plates": tectonicLayer
    };

    // Add layer control to the map
    L.control.layers(baseMaps, overlayMaps, {
        collapsed: false
    }).addTo(eqMap);

    // Add legend to the map
    let legend = L.control({ position: "bottomright" });

    legend.onAdd = function (map) {
        let div = L.DomUtil.create("div", "legend");

        // Set background color to white and add padding
        div.style.backgroundColor = "white";
        div.style.padding = "10px";
        div.style.borderRadius = "5px";

        let grades = ["-10", "10", "30", "50", "70", "90"];  // Depth intervals
        let colors = ["#b3f0ff", "#ddff99", "#ffff80", "#ffc266", "#ff6600", "#e60000"];  // Corresponding colors
        
        // Loop through the depth intervals to associate a color with each interval.
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + colors[i] + '; width: 20px; height: 20px; display: inline-block;"></i>' + 
                grades[i] + 
                (grades[i + 1] ? "&ndash;" + grades[i + 1] + " km" + "<br>" : "+ km");
        }

        return div;
    };

    // Add the legend to the map
    legend.addTo(eqMap);
}