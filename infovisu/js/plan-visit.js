// plan-visit.js 

let places = [];
let crimeData = [];

Promise.all([
  d3.json("../data/tourist.json"),
  d3.csv("../data/crime_clean.csv")
]).then(([placesData, crimeCsv]) => {
  places = placesData;
  crimeData = crimeCsv;
  
  populateDropdowns();
});

// fill ward + place dropdowns
function populateDropdowns() {
  const wardSet = new Set(crimeData.map(d => d.ward));
  const wardSelect = document.getElementById("ward-select");
  const placeSelect = document.getElementById("place-select");

  [...wardSet].sort().forEach(ward => {
    const option = document.createElement("option");
    option.value = ward;
    option.textContent = `Ward ${ward}`;
    wardSelect.appendChild(option);
  });

  places.forEach(place => {
    const option = document.createElement("option");
    option.value = place.name;
    option.textContent = place.name;
    placeSelect.appendChild(option);
  });

  wardSelect.addEventListener("change", showWardInfo);
  placeSelect.addEventListener("change", showPlaceInfo);
}

// ward selected
function showWardInfo() {
  const ward = document.getElementById("ward-select").value;
  if (!ward) return;
  
  const results = document.getElementById("results");
  results.innerHTML = "";

  let foundAny = false;

  places.forEach(place => {
    const wardCrimes = crimeData.filter(d => d.ward === ward);

    const nearbyCrimes = wardCrimes.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const dist = haversine(place.latitude, place.longitude, +d.latitude, +d.longitude);
      return dist < 2.0;
    });

    if (nearbyCrimes.length > 0) {
      const block = createResultBlock(place, ward);
      results.appendChild(block);
      foundAny = true;
    }
  });

    // no crime nearby
if (!foundAny) {
    const message = document.createElement("div");
    message.className = "no-data-message";
    message.innerHTML = `
      <h2>😕 Oops!</h2>
      <p>We don't have enough data for monuments near Ward ${ward} yet. Please try another area!</p>
    `;
    results.appendChild(message);
  }
}

// place selected
 function showPlaceInfo() {
  const placeName = document.getElementById("place-select").value;
  if (!placeName) return;

  const results = document.getElementById("results");
  results.innerHTML = "";

  const place = places.find(p => p.name === placeName);

  if (place) {
    const block = createResultBlock(place, null);
    results.appendChild(block);
  }
}

// result card
function createResultBlock(place, ward) {
  const block = document.createElement("div");
  block.className = "result-block";
  block.setAttribute("data-aos", "fade-up");

  const text = document.createElement("div");
  text.className = "result-text";

  let cautionHtml = "";
  let mostCommonCrimeText = "";

  const insideDC = (place.latitude >= 38.8 && place.latitude <= 39.0) &&
                   (place.longitude >= -77.2 && place.longitude <= -76.9);

  let crimeMarker = null;

  let crimes3km = [];

if (insideDC) {
  // Filter crimes within 1.5km radius for charts
  crimes3km = crimeData.filter(d => {
    if (!d.latitude || !d.longitude) return false;
    const dist = haversine(place.latitude, place.longitude, +d.latitude, +d.longitude);
    return dist < 1.5;
  });


  cautionHtml += `
    <p style="font-size: 14px;">The following charts reflect crimes reported within <strong>1.5 km</strong> of this location.</p>
  `;
} else {
  cautionHtml = `
    <h4 style="color: orange; margin-top: 15px;">⚠️ This location is outside DC crime coverage.</h4>
    <p style="font-size: 14px;">Stay alert and contact local authorities if needed.</p>
  `;
}


  // 🔥 This is the corrected filtering
  crimes3km = crimeData.filter(d => {
    if (!d.latitude || !d.longitude) return false;
    const dist = haversine(place.latitude, place.longitude, +d.latitude, +d.longitude);
    return dist < 1.5;
  });



  const safeName = place.name.replace(/[^a-zA-Z0-9]/g, '-');  // replace everything not a-z, A-Z, 0-9
  const safeWard = (ward || 'any').toString().replace(/[^a-zA-Z0-9]/g, '-');
  const chartId = `chart-${safeName}-${safeWard}`;

  text.innerHTML = `
    <h3>${place.name}</h3>
    <p><strong>Address:</strong> ${place.address}</p>
    <p><strong>Category:</strong> ${place.category}</p>
    ${cautionHtml}
    ${mostCommonCrimeText}
  <div class="chart-container" id="${chartId}"></div>
  `;

  const mapDiv = document.createElement("div");
  mapDiv.className = "result-map";
  mapDiv.setAttribute("data-aos", "zoom-in");

  block.appendChild(text);
  block.appendChild(mapDiv);

  
    if (insideDC && crimes3km.length > 0) {
    setTimeout(() => createCharts(`#${chartId}`, crimes3km), 50);
  }

  const miniMap = L.map(mapDiv, {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    attributionControl: false, doubleClickZoom: false, keyboard: false, tap: false
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(miniMap);
  L.marker([place.latitude, place.longitude]).addTo(miniMap);

  miniMap.setView([place.latitude, place.longitude], 15);


  setTimeout(() => { miniMap.invalidateSize(); }, 300);
  return block;
}

const fixedPieColors = {
  property: "#ff7f0e",  
  violent: "#1f77b4",   
  other: "#2ca02c"      
};




// add this new helper function
function createCharts(containerId, data) {
  const container = d3.select(containerId);
  container.html("");

  if (!data || data.length === 0) {
    container.append("p").text("No crime data within 3km of this location.").style("color", "#888");
    return;
  }

  // === Tooltip ===
  const tooltip = container.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "#333")
    .style("color", "#fff")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", "10");

  // === Bar Chart ===
  const width = 320;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 30, left: 120 };

  const barData = Array.from(
    d3.rollup(data, v => v.length, d => d.offense),
    ([key, value]) => ({ key, value })
  ).sort((a, b) => b.value - a.value).slice(0, 5);

  const barSvg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.value)])
    .range([0, width - margin.left - margin.right]);

  const y = d3.scaleBand()
    .domain(barData.map(d => d.key))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  const barGroup = barSvg.append("g").attr("transform", `translate(${margin.left},0)`);

  // Bars
  barGroup.selectAll("rect")
    .data(barData)
    .enter()
    .append("rect")
    .attr("y", d => y(d.key))
    .attr("x", 0)
    .attr("width", d => x(d.value))
    .attr("height", y.bandwidth())
    .attr("fill", "#ff5c5c")
    .attr("rx", 4)
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(`<strong>${d.key}</strong>: ${d.value} cases`);
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // Labels on bars
  barGroup.selectAll("text.value")
  .data(barData)
  .enter()
  .append("text")
  .attr("x", d => {
    const barEnd = x(d.value);
    return d.value < 50 ? barEnd + 5 : barEnd - 10;
  })
  .attr("y", d => y(d.key) + y.bandwidth() / 2 + 4)
  .text(d => d.value)
  .style("fill", d => d.value < 50 ? "#fff" : "#fff") // can adjust for contrast
  .style("font-size", "12px")
  .style("text-anchor", d => d.value < 50 ? "start" : "end");


  // Y axis
  barGroup.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")
    .style("font-size", "12px");

  // X axis
  barSvg.append("g")
    .attr("transform", `translate(${margin.left},${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5))
    .selectAll("text")
    .style("font-size", "11px");

  // === Pie Chart ===
  // === PIE CHART ===
const pieData = Array.from(
  d3.rollup(data, v => v.length, d => d.offense_group || "other"),
  ([key, value]) => ({ key, value })
);

// Fixed color scale for consistent colors
const fixedPieColors = {
  property: "#ff7f0e",
  violent: "#1f77b4",
  other: "#2ca02c"
};

const pieWidth = 220;
const pieHeight = 220;
const radius = 80;

const pieSvg = container.append("svg")
  .attr("width", pieWidth)
  .attr("height", pieHeight)
  .append("g")
  .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

const pie = d3.pie().value(d => d.value)(pieData);
const arc = d3.arc().innerRadius(0).outerRadius(radius);

pieSvg.selectAll("path")
  .data(pie)
  .enter()
  .append("path")
  .attr("d", arc)
  .attr("fill", d => fixedPieColors[d.data.key] || fixedPieColors.other)
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.5)
  .on("mouseover", (event, d) => {
    tooltip.style("opacity", 1).html(`<strong>${d.data.key}</strong>: ${d.data.value} cases`);
  })
  .on("mousemove", event => {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
  });

// Center labels
pieSvg.selectAll("text")
  .data(pie)
  .enter()
  .append("text")
  .attr("transform", d => `translate(${arc.centroid(d)})`)
  .attr("text-anchor", "middle")
  .style("font-size", "11px")
  .style("fill", "#fff")
  .text(d => d.data.key);

}



function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
