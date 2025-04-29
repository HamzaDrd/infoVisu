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

// Wait for page DOM to fully load before running
window.addEventListener("DOMContentLoaded", () => {

    // Load PSA list
    d3.csv("../data/psa_crime.csv").then(data => {
      const psaList = Array.from(new Set(data.map(d => d.psa)))
        .map(psa => parseInt(psa))
        .sort((a, b) => a - b);
    
      const psaContainer = document.getElementById("psa-list");
  
      // Create buttons but don't append yet
      const psaElements = psaList.map(psa => {
        const div = document.createElement("div");
        div.className = "draggable";
        div.draggable = true;
        div.textContent = `PSA ${psa}`;
        div.setAttribute("data-psa", psa);
        div.setAttribute("data-type", "psa");
      
        // ADD THIS:
        div.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text", div.textContent.trim());
          e.dataTransfer.setData("type", div.dataset.type || "psa");
        });
      
        return div;
      });
      
      
  
      // Append only first 5 initially
      psaElements.slice(0, 5).forEach(el => psaContainer.appendChild(el));
  
      const searchInput = document.getElementById("psa-search");
  
      searchInput.addEventListener("input", function () {
        const searchValue = this.value.trim().toLowerCase();
        psaContainer.innerHTML = ""; // Clear all
  
        const filtered = psaElements.filter(el =>
          el.textContent.toLowerCase().includes(searchValue)
        );
  
        filtered.slice(0, 10).forEach(el => psaContainer.appendChild(el)); // Max 10 visible
      });
    });
  
    // Initialize Chart.js
    const ctx = document.getElementById("psa-chart").getContext("2d");
  
    let psaChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
            title: { display: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'X Axis', color: '#eee' },
              ticks: { color: '#ccc' },
              grid: { color: '#444' },
              stacked: false,
              barPercentage: 0.6,        // <-- make bars narrower
              categoryPercentage: 0.6    // <-- leave space between groups
            },
            y: {
              title: { display: true, text: 'Y Axis', color: '#eee' },
              ticks: { color: '#ccc' },
              grid: { color: '#444' },
              stacked: false
            }
          }
        }
      });
      
  
    const dropArea = document.querySelector(".chart-center-area");
    let selectedX = null;
    let selectedY = null;
    let selectedPSAs = [];
  
    // Make everything draggable
    function refreshDraggables() {
      document.querySelectorAll(".draggable").forEach(el => {
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text", el.textContent.trim());
          e.dataTransfer.setData("type", el.dataset.type || "psa");
        });
      });
    }
    refreshDraggables(); // initial
  
    // Drag and Drop handling
    dropArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropArea.style.border = "2px dashed #ff4444";
    });
  
    dropArea.addEventListener("dragleave", () => {
      dropArea.style.border = "none";
    });
  
    dropArea.addEventListener("drop", (e) => {
      e.preventDefault();
      dropArea.style.border = "none";
  
      const value = e.dataTransfer.getData("text");
      const type = e.dataTransfer.getData("type");
  
      console.log("Dropped:", value, type);
  
      if (type === "x") {
        selectedX = value;
      } else if (type === "y") {
        selectedY = value;
      } else if (value.startsWith("PSA")) {
        const psa = value.replace("PSA ", "");
        if (!selectedPSAs.includes(psa) && selectedPSAs.length < 5) {
          selectedPSAs.push(psa);
        }
      }
  
      console.log("Selected X:", selectedX);
      console.log("Selected Y:", selectedY);
      console.log("Selected PSAs:", selectedPSAs);
  
      updateInteractiveChart();
    });
  
    function updateInteractiveChart() {
        const hint = document.getElementById("chart-hint");
      
        if (selectedX && selectedY && selectedPSAs.length > 0) {
          hint.style.display = "none";
      
          // Set labels depending on selectedX
          let xLabels = [];
      
          if (selectedX.toLowerCase() === "shift") {
            xLabels = ["Day", "Evening", "Midnight"];
          } else if (selectedX.toLowerCase() === "method") {
            xLabels = ["Gun", "Knife", "Others"]; // adjust based on your data
          } else if (selectedX.toLowerCase() === "month") {
            xLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          } else if (selectedX.toLowerCase() === "day of week") {
            xLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          } else if (selectedX.toLowerCase() === "year") {
            xLabels = ["2020", "2021", "2022", "2023", "2024"]; // or extract dynamically
          } else {
            xLabels = selectedPSAs; // fallback
          }
      
          psaChart.data.labels = xLabels;
      
          psaChart.options.scales.x.title.text = selectedX;
          psaChart.options.scales.y.title.text = selectedY;
      
          // Dummy data
          psaChart.data.datasets = selectedPSAs.map((psa, i) => ({
            label: `PSA ${psa}`,
            data: xLabels.map(() => Math.floor(Math.random() * 100)), // Replace with real filtered logic
            backgroundColor: ["#ff4444", "#ff8844", "#44c2ff", "#44ff88", "#ff44dd"][i % 5]
          }));
      
          psaChart.update();
      
        } else {
          hint.style.display = "block";
        }
      }
      
  });

  function getColor(index) {
    const colors = ["#ff4444", "#44c2ff", "#44ff88", "#ff8844", "#bb66ff"];
    return colors[index % colors.length];
  }


  
  
  