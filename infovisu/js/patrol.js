const offenseSelect = document.getElementById("offense-select");
const shiftSelect = document.getElementById("shift-select");
const monthSlider = document.getElementById("month-slider");
const monthLabel = document.getElementById("month-label");
const heatButton = document.getElementById("toggle-heatmap");
const methodSelect = document.getElementById("method-select");
const districtSelect = document.getElementById("district-select");
const wardSelect = document.getElementById("ward-select");
const resetMonthButton = document.getElementById("reset-month");

let map;
let allData = [];
let markers = [];
let heatLayer = null;
let isHeatmapVisible = false;

function initMap() {
  map = L.map("map").setView([38.9072, -77.0369], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);
}

function populateDropdown(selectElement, values) {
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function updateMap() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }

  const selectedOffense = offenseSelect.value;
  const selectedShift = shiftSelect.value;
  const selectedMonth = parseInt(monthSlider.value);
  const selectedMethod = methodSelect.value;
  const selectedDistrict = districtSelect.value;
  const selectedWard = wardSelect.value;

  const filtered = allData.filter(d => {
    return (
      (selectedOffense === "all" || d.offense_group === selectedOffense) &&
      (selectedShift === "all" || d.shift === selectedShift) &&
      (selectedMonth === 0 || d.month === selectedMonth) &&
      (selectedMethod === "all" || d.method === selectedMethod) &&
      (selectedDistrict === "all" || d.district === selectedDistrict) &&
      (selectedWard === "all" || d.ward === selectedWard)
    );
  });

  if (isHeatmapVisible) {
    const heatData = filtered
      .filter(d => !isNaN(d.latitude) && !isNaN(d.longitude))
      .map(d => [d.latitude, d.longitude, 1]);
    heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      minOpacity: 0.4
    }).addTo(map);
  } else {
    filtered.forEach(d => {
      if (!isNaN(d.latitude) && !isNaN(d.longitude)) {
        const marker = L.circleMarker([d.latitude, d.longitude], {
          radius: 5,
          color: "#ff4444",
          fillColor: "#ff4444",
          fillOpacity: 0.7,
          weight: 1
        }).bindPopup(`
          <strong>${d.offense_text}</strong><br>
          ${d.method} – ${d.shift}<br>
          Year: ${d.year}<br>
          District: ${d.district}
        `);
        marker.addTo(map);
        markers.push(marker);
      }
    });
  }
}

// Init map
initMap();

d3.csv("../data/crime_clean.csv").then(data => {
  data.forEach(d => {
    d.latitude = +d.latitude;
    d.longitude = +d.longitude;
    d.start_date = new Date(d.start_date);
    d.month = d.start_date.getMonth() + 1;
    d.shift = d.shift?.trim();
    d.offense_group = d.offense_group?.trim();
  });

  allData = data;

  const offenses = Array.from(new Set(data.map(d => d.offense_group))).sort();
  const shifts = Array.from(new Set(data.map(d => d.shift))).sort();
  const methods = Array.from(new Set(data.map(d => d.method))).sort();
  const districts = Array.from(new Set(data.map(d => d.district))).sort();
  const wards = Array.from(new Set(data.map(d => d.ward))).sort();

  populateDropdown(methodSelect, methods);
  populateDropdown(districtSelect, districts);
  populateDropdown(wardSelect, wards);
  populateDropdown(offenseSelect, offenses);
  populateDropdown(shiftSelect, shifts);

  updateMap();

  offenseSelect.addEventListener("change", updateMap);
  shiftSelect.addEventListener("change", updateMap);
  methodSelect.addEventListener("change", updateMap);
  districtSelect.addEventListener("change", updateMap);
  wardSelect.addEventListener("change", updateMap);

  heatButton.addEventListener("click", () => {
    isHeatmapVisible = !isHeatmapVisible;
    heatButton.textContent = isHeatmapVisible ? "Show Pins" : "Show Heatmap";
    updateMap();
  });

  monthSlider.addEventListener("input", () => {
    const monthNames = ["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
                        "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthLabel.textContent = monthNames[monthSlider.value];
    updateMap();
  });

  resetMonthButton.addEventListener("click", () => {
    monthSlider.value = 0;
    monthLabel.textContent = "All";
    updateMap();
  });

  // Static little maps
  function createStaticMap(containerId, lat, lon) {
    const mini = L.map(containerId, {
      center: [lat, lon],
      zoom: 12,
      dragging: false,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      attributionControl: false
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mini);
    L.circle([lat, lon], {
      color: "#ff4444",
      fillColor: "#ff8888",
      fillOpacity: 0.3,
      radius: 1500
    }).addTo(mini);
  }

  createStaticMap("map-most", 38.92, -76.99);
  createStaticMap("map-least", 38.83, -76.99);
});
