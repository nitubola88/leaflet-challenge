console.log('Logic script is loaded');
let usgsURL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

// Fetch the earthquake data
d3.json(usgsURL).then(function (usgsData) {
    createFeatures(usgsData.features);
});

// Function to handle the features and create the map layers
function createFeatures(eqData) {
    // Define the point-to-layer function to assign markers based on magnitude and depth
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

    // Define the function to bind a popup for each earthquake
    function onEachFeature(feature, layer) {
        // Get the necessary details from the earthquake feature
        const magnitude = feature.properties.mag;
        const location = feature.properties.place;
        const depth = feature.geometry.coordinates[2];
        
        // Bind a popup to the feature with details
        layer.bindPopup(`
            <h3>Location: ${location}</h3>
            <p>Magnitude: ${magnitude}</p>
            <p>Depth: ${depth} km</p>
        `);
    }

    // Create the earthquake layer
    let eqs = L.geoJSON(eqData, {
        pointToLayer: pointToLayer,
        onEachFeature: onEachFeature // Bind the popups to the features
    });

    createMap(eqs); // Pass earthquake data to createMap function
}

// Function to create the map
function createMap(eqs) {
    // Base Layer (grayscale)
    let grayscaleLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", 
        { attribution: '© OpenStreetMap contributors, © CartoDB' }
    );
    
    // Create the map and set default layers
    let eqMap = L.map("map", {
        center: [37.09, -95.71], // Center of the map
        zoom: 5,
        layers: [grayscaleLayer, eqs] // Default layers
    });
   
    // Layer control (only grayscale layer)
    let baseMaps = {
        "Grayscale": grayscaleLayer
    };

    let overlayMaps = {
        "Earthquakes": eqs
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