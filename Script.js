const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-73.1235, 40.9126]), // Stony Brook University
        zoom: 15
    })
});


const studySpots = {
    "library": { lat: 40.9153, lon: -73.1230, name: "Frank Melville Jr. Memorial Library" },
    "union": { lat: 40.917342, lon: -73.122295, name: "Stony Brook Union" }
};


if (!localStorage.getItem("libraryStatus")) localStorage.setItem("libraryStatus", "Vacant");
if (!localStorage.getItem("unionStatus")) localStorage.setItem("unionStatus", "Busy");


function updateSidebarStatus() {
    Object.keys(studySpots).forEach(spot => {
        const status = localStorage.getItem(`${spot}Status`);
        const statusElement = document.querySelector(`.${spot}-status`);
        if (statusElement) {
            statusElement.innerText = status;
            statusElement.className = `status ${status.toLowerCase().replace(" ", "-")}`; // Update CSS class for color
        }
    });
}


function addMarker(lat, lon, title) {
    let marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: title
    });

    let vectorSource = new ol.source.Vector({
        features: [marker]
    });

    let vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 1],
                src: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png" // Default marker
            }),
            text: new ol.style.Text({
                text: title,
                offsetY: -25,
                fill: new ol.style.Fill({ color: "#fff" }),
                stroke: new ol.style.Stroke({ color: "#000", width: 2 })
            })
        })
    });

    map.addLayer(vectorLayer);
}


addMarker(studySpots.library.lat, studySpots.library.lon, "Frank Melville Jr. Memorial Library");
addMarker(studySpots.union.lat, studySpots.union.lon, "Stony Brook Union");


let userMarkerLayer = new ol.layer.Vector({ source: new ol.source.Vector() });
map.addLayer(userMarkerLayer);


function updateUserLocation(lat, lon) {
    userMarkerLayer.getSource().clear(); 

    let userMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: "You are here"
    });

    userMarker.setStyle(new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 1],
            src: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png" 
        }),
        text: new ol.style.Text({
            text: "You are here",
            offsetY: -25,
            fill: new ol.style.Fill({ color: "#fff" }),
            stroke: new ol.style.Stroke({ color: "#000", width: 2 })
        })
    }));

    userMarkerLayer.getSource().addFeature(userMarker);

    checkProximity(lat, lon);
}


function checkProximity(userLat, userLon) {
    const proximityThreshold = 0.0008;

    Object.keys(studySpots).forEach(spot => {
        const { lat, lon, name } = studySpots[spot];
        if (Math.abs(userLat - lat) < proximityThreshold && Math.abs(userLon - lon) < proximityThreshold) {
            showStatusUpdateOption(spot, name);
        } else {
            hideStatusUpdateOption(spot);
        }
    });
}


function showStatusUpdateOption(spot, name) {
    let existingDiv = document.getElementById(`${spot}-status-update`);
    if (!existingDiv) {
        let div = document.createElement("div");
        div.id = `${spot}-status-update`;
        div.innerHTML = `
            <h3>${name} - Update Status</h3>
            <select id="${spot}-status-select">
                <option value="Vacant">Vacant</option>
                <option value="Little Busy">Little Busy</option>
                <option value="Busy">Busy</option>
            </select>
            <button onclick="updateSpotStatus('${spot}')">Update</button>
        `;
        div.style.position = "fixed";
        div.style.bottom = "20px";
        div.style.right = "20px";
        div.style.padding = "15px";
        div.style.background = "#0D253F";
        div.style.color = "#F5E6C4";
        div.style.borderRadius = "10px";
        div.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
        document.body.appendChild(div);
    }
}


function hideStatusUpdateOption(spot) {
    let div = document.getElementById(`${spot}-status-update`);
    if (div) {
        div.remove();
    }
}


function updateSpotStatus(spot) {
    let newStatus = document.getElementById(`${spot}-status-select`).value;
    localStorage.setItem(`${spot}Status`, newStatus);
    updateSidebarStatus(); 
    hideStatusUpdateOption(spot);
}


if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            updateUserLocation(lat, lon);
        },
        (error) => {
            console.error("Error getting location: ", error);
        },
        {
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 10000 
        }
    );
} else {
    console.log("Geolocation is not supported by this browser.");
}


document.addEventListener("DOMContentLoaded", updateSidebarStatus);
