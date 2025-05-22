/* PATROL VIEW --------------------------------------------------------------------------------------------------------------- */
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

// update markers/heatmap
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

  // filter 
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

  //dropdowns
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

  // heatmap
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

  //  map
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

window.addEventListener("DOMContentLoaded", () => {
  d3.csv("../data/psa_crime.csv").then(data => {
    data.forEach(d => {
      d.psa = parseInt(d.psa);
      d.month = parseInt(d.month);
      d.year = parseInt(d.year);
      d.ward = parseInt(d.ward);
      d.district = parseInt(d.district);
    });

    
    





    const ctx = document.getElementById("psa-chart").getContext("2d");
    let psaChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [] },
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
            grid: { color: '#444' }
          },
          y: {
            title: { display: true, text: 'Number of Crimes', color: '#eee' },
            ticks: { color: '#ccc' },
            grid: { color: '#444' }
          }
        }
      }
    });

    const xSelect = document.getElementById("x-axis-select");
    const updateBtn = document.getElementById("update-chart-btn");
    const psaSearch = document.getElementById("psa-search");
    const psaDropdown = document.getElementById("psa-dropdown");
    const psaTags = document.getElementById("psa-selected");
    const stepHint = document.getElementById("step-hint");

    let selectedPSAs = [];

    const allPSAs = Array.from(new Set(data.map(d => parseInt(d.psa)))).sort((a, b) => a - b);

    function renderDropdown(filteredList) {
      psaDropdown.innerHTML = "";
      filteredList.slice(0, 5).forEach(psa => {
        const item = document.createElement("div");
        item.textContent = `PSA ${psa}`;
        item.className = "psa-option";
        item.addEventListener("click", () => {
          if (!selectedPSAs.includes(psa)) {
            selectedPSAs.push(psa);
            renderTags();
            stepHint.textContent = "Step 3: Click 'Update Chart' to visualize.";
          }
        });
        psaDropdown.appendChild(item);
      });
    }

    function renderTags() {
      psaTags.innerHTML = "";
      selectedPSAs.forEach((psa, i) => {
        const tag = document.createElement("div");
        tag.className = "psa-tag";
        tag.textContent = `PSA ${psa}`;
        const close = document.createElement("span");
        close.textContent = "×";
        close.onclick = () => {
          selectedPSAs.splice(i, 1);
          renderTags();
        };
        tag.appendChild(close);
        psaTags.appendChild(tag);
      });
    }

    psaSearch.addEventListener("input", () => {
      const val = psaSearch.value.trim();
      const filtered = allPSAs.filter(psa => psa.toString().includes(val));
      renderDropdown(filtered);
    });

    renderDropdown(allPSAs);

    xSelect.addEventListener("change", () => {
      stepHint.textContent = "Step 2: Add one or more PSA numbers.";
    });

    updateBtn.addEventListener("click", () => {
      const selectedX = xSelect.value;
      const allGroups = new Set();

      selectedPSAs.forEach(psa => {
        const filtered = data.filter(d => +d.psa === psa);
        filtered.forEach(d => {
          let key;
          if (selectedX === "shift") key = d.shift;
          else if (selectedX === "method") key = d.method;
          else if (selectedX === "month" && d.month !== null)
            key = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.month];
          else if (selectedX === "day_of_week") key = d.day_of_week;
          else if (selectedX === "hour") key = d.hour;
          else key = null;

          if (key !== null && key !== undefined && key !== "") {
            allGroups.add(key);
          }
        });
      });

      const xLabels = Array.from(allGroups).sort((a, b) => {
        if (selectedX === "month") {
          const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return order.indexOf(a) - order.indexOf(b);
        }
        if (selectedX === "day_of_week") {
          const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          return order.indexOf(a) - order.indexOf(b);
        }
        return a - b;
      });

      psaChart.data.labels = xLabels;

      psaChart.data.datasets = selectedPSAs.map((psa, index) => {
        const filtered = data.filter(d => +d.psa === psa);
        const counts = {};
        xLabels.forEach(label => counts[label] = 0);

        filtered.forEach(d => {
          let key;
          if (selectedX === "shift") key = d.shift;
          else if (selectedX === "method") key = d.method;
          else if (selectedX === "month" && d.month !== null)
            key = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.month];
          else if (selectedX === "day_of_week") key = d.day_of_week;
          else if (selectedX === "hour") key = d.hour;
          else key = null;

          if (key in counts) {
            counts[key]++;
          }
        });

        return {
          label: `PSA ${psa}`,
          data: xLabels.map(label => counts[label] || 0),
          backgroundColor: getColor(index)
        };
      });

      psaChart.options.scales.x.title.text = xSelect.options[xSelect.selectedIndex].text;
      psaChart.update();
    });

    function getColor(index) {
      const colors = ["#ff4444", "#44c2ff", "#44ff88", "#ff8844", "#bb66ff"];
      return colors[index % colors.length];
    }
  });
});


window.addEventListener("scroll", () => {
    const indicator = document.getElementById("scroll-indicator");
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    if (scrollY + windowHeight >= docHeight - 50) {
      indicator.classList.add("hidden");
    } else {
      indicator.classList.remove("hidden");
    }
});


/* TREND VIEW --------------------------------------------------------------------------------------------------------------- */

// Load the data for the charts
d3.csv("../data/crime_daily_counts.csv").then(data => {

  // Data Parsing, date conversion, and type conversion because the data is in string format
  data.forEach(d => {
    d.date = new Date(d.date);
    d.day_of_week = d.date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    d.count = +d.count;
  });

  /// Function to dynamically populate a filter dropdown
function populateFilter(selectId, attribute, removeAllOption = false) {
  const uniqueValues = Array.from(new Set(data.map(d => d[attribute]))).sort();
  const select = d3.select(`#${selectId}`);
  
  if (!removeAllOption) {
    select.append("option").attr("value", "all").text(`All ${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`);
  }
  
  uniqueValues.forEach(value => {
    select.append("option").attr("value", value).text(value);
  });
}

  // Populate filters of the charts with unique values from the dataset
  populateFilter("offense-monthly-select", "offense_group", true);
  populateFilter("shift-monthly-select", "shift", true);
  populateFilter("ward-monthly-select", "ward", true);

  // Functions to filter chart data based on selected filters and returns the filtered data, returned dataset only contains the data that matches the selected filters
  function getFilteredData() {
    const selectedFilters = {
      offense_group: d3.select("#offense-monthly-select").property("value"),
      shift: d3.select("#shift-monthly-select").property("value"),
      ward: d3.select("#ward-monthly-select").property("value"),
    };

    return data.filter(d => {
      return (
        (selectedFilters.offense_group === "all" || d.offense_group === selectedFilters.offense_group) &&
        (selectedFilters.shift === "all" || d.shift === selectedFilters.shift) &&
        (selectedFilters.ward === "all" || d.ward === selectedFilters.ward)
      );
    });
  }

  // Function to calculate monthly counts, will be used on filtered data
  function calculateMonthlyData(filteredData) {
    return d3.rollups(
      filteredData.filter(d => d.date.getFullYear() === 2023), // only keep 2023 entries
      v => d3.sum(v, d => d.count),
      d => d3.timeMonth(d.date)
    ).map(([date, count]) => ({ date, count }));
  }

  // Function to calculate daily counts for heat calendar
  function calculateDailyData(filteredData) {
    return d3.rollups(
      filteredData.filter(d => d.date.getFullYear() === 2023),
      v => d3.sum(v, d => d.count),
      d => `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}`
    ).map(([key, count]) => {
      const [year, month, day] = key.split("-").map(Number);
      return { date: new Date(year, month, day), count };
    });
  }

  // Function to highlight the heat calendar cells based on selected months
  function highlightHeatCalendar(months) {
    const svg = d3.select("#daily-crime-chart-svg");

    // Define the color scale for restoring original colors
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(svg.selectAll(".cell").data(), d => d.count)]);

    svg.selectAll(".cell")
      .attr("fill", d => {
        // If the current cell's month is in the highlighted months, apply the highlight color
        if (months.includes(d.date.getMonth())) {
          const originalColor = d3.color(colorScale(d.count));
          return originalColor.brighter(1); // Brighten the original color
        }
        // Otherwise, restore the original color based on the count
        return colorScale(d.count);
      });
  }

  // Function to highlight the heat calendar cells based on selected weekday
  function highlightHeatCalendarByWeekday(weekday) {
    const svg = d3.select("#daily-crime-chart-svg");
  
    // Define the color scale for restoring original colors
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(svg.selectAll(".cell").data(), d => d.count)]);
  
    svg.selectAll(".cell")
      .attr("fill", d => {
        if (d.date.getDay() === weekday) {
          const originalColor = d3.color(colorScale(d.count));
          return originalColor.brighter(1); // Brighten the original color for the selected weekday
        }
        // Restore the original color based on the count
        return colorScale(d.count);
      });
  }
  
  // Function to highlight the bar chart based on selected month
  function highlightBarChart(month) {
    const svg = d3.select("#timeline-chart-svg");

    svg.selectAll(".bar")
      .attr("fill", d => (d.date.getMonth() === month ? "#ff8844" : "#ff0000"));
  }

  // Function to highlight the bar chart based on selected weekday
  function highlightDayOfWeekChart(day) {
    const svg = d3.select("#day-of-week-chart-svg");
  
    svg.selectAll(".bar")
      .attr("fill", (d, i) => (i === day ? "#ff8844" : "#ff0000")); // Highlight the bar for the selected day
  }

  // Function to draw detailed view for the selected month of barchart
  function openCrimeTypeModal(date, filteredData) {
    // Get the month name
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[date.getMonth()];
  
    // Set the modal title with the month name
    document.getElementById("modal-month-title").textContent = monthName;
  
    // Filter data for the selected month
    const monthData = filteredData.filter(d =>
      d.date.getFullYear() === date.getFullYear() &&
      d.date.getMonth() === date.getMonth()
    );

    // Aggregate data for violent vs. property crimes
    const crimeTypeCounts = d3.rollups(
      monthData,
      v => d3.sum(v, d => d.count),
      d => d.offense_group
    );

    const labels = crimeTypeCounts.map(([type]) => type);
    const data = crimeTypeCounts.map(([_, count]) => count);

    // Aggregate data by shift
    const shiftCounts = d3.rollups(
      monthData,
      v => d3.sum(v, d => d.count),
      d => d.shift
    );

    const shiftLabels = shiftCounts.map(([shift]) => shift);
    const shiftData = shiftCounts.map(([_, count]) => count);

    // Aggregate weekly data for the sparkline
    const weeklyCounts = d3.rollups(
      monthData,
      v => d3.sum(v, d => d.count),
      d => Math.floor(d.date.getDate() / 7) // Group by week (0 = first week, 1 = second week, etc.)
    );

    const weeklyData = weeklyCounts.map(([week, count]) => count);

    // Aggregate data by ward and sort to get the top 5 wards
    const wardCounts = d3.rollups(
      monthData,
      v => d3.sum(v, d => d.count),
      d => d.ward
    ).sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 5); // Take the top 5

    const wardLabels = wardCounts.map(([ward]) => `Ward ${ward}`);
    const wardData = wardCounts.map(([_, count]) => count);

    // Open the modal
    const modal = document.getElementById("crime-type-modal");
    modal.style.display = "block";

    // Clear previous charts
    d3.select("#crime-type-piechart-svg").selectAll("*").remove();
    d3.select("#shift-barchart-svg").selectAll("*").remove();
    d3.select("#weekly-trend-svg").selectAll("*").remove();
    d3.select("#top-wards-svg").selectAll("*").remove();

    // Draw the pie chart
    const pieSvg = d3.select("#crime-type-piechart-svg");
    const pieWidth = +pieSvg.attr("width");
    const pieHeight = +pieSvg.attr("height");
    const pieRadius = Math.min(pieWidth, pieHeight) / 2;

    const pieGroup = pieSvg.append("g")
      .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);
  
    const pie = d3.pie().value(d => d.value)(data.map((value, i) => ({ label: labels[i], value })));
  
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(pieRadius);

    const color = d3.scaleOrdinal()
      .domain(labels)
      .range(["#ff4444", "#ffaa00"]); // Colors for violent and property crimes
  
    pieGroup.selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(labels[i]))
      .attr("stroke", "#fff")
      .attr("stroke-width", "2px")
      .on("mouseover", (event, d, i) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.data.label}: ${d.data.value}`)
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Draw the shift distribution bar chart
    const shiftSvg = d3.select("#shift-barchart-svg");
    const shiftWidth = +shiftSvg.attr("width") - 50; // Add margin
    const shiftHeight = +shiftSvg.attr("height") - 50; // Add margin
    const shiftMargin = { top: 20, right: 20, bottom: 40, left: 50 };

    const xScaleShift = d3.scaleBand()
      .domain(shiftLabels) // Ensure shiftLabels is used here
      .range([shiftMargin.left, shiftWidth])
      .padding(0.2);

    const yScaleShift = d3.scaleLinear()
      .domain([0, d3.max(shiftData)]) // Use shiftData for the y-axis
      .range([shiftHeight, shiftMargin.top]);

    shiftSvg.append("g")
      .attr("transform", `translate(0, ${shiftHeight})`)
      .call(d3.axisBottom(xScaleShift));

    shiftSvg.append("g")
      .attr("transform", `translate(${shiftMargin.left}, 0)`)
      .call(d3.axisLeft(yScaleShift));

    shiftSvg.selectAll(".bar")
      .data(shiftData.map((value, i) => ({ label: shiftLabels[i], value }))) // Bind both label and value
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScaleShift(d.label)) // Use the label for positioning
      .attr("y", d => yScaleShift(d.value)) // Use the value for positioning
      .attr("width", xScaleShift.bandwidth())
      .attr("height", d => shiftHeight - yScaleShift(d.value))
      .attr("fill", "#ff4444") // Change bar color to red
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.label}: ${d.value}`) // Use the label and value from the bound data
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Draw the weekly trend sparkline
    const sparklineSvg = d3.select("#weekly-trend-svg");
    const sparklineWidth = +sparklineSvg.attr("width") - 50; // Add margin
    const sparklineHeight = +sparklineSvg.attr("height") - 50; // Add margin
    const sparklineMargin = { top: 20, right: 20, bottom: 40, left: 50 };

    const xScaleSparkline = d3.scaleLinear()
      .domain([0, weeklyData.length - 1])
      .range([sparklineMargin.left, sparklineWidth - sparklineMargin.right]);

    const yScaleSparkline = d3.scaleLinear()
      .domain([0, d3.max(weeklyData)]) // Use weeklyData for the y-axis
      .range([sparklineHeight - sparklineMargin.bottom, sparklineMargin.top]);

    sparklineSvg.append("g")
      .attr("transform", `translate(0, ${sparklineHeight - sparklineMargin.bottom})`)
      .call(d3.axisBottom(xScaleSparkline).ticks(weeklyData.length).tickFormat((d, i) => `Week ${i + 1}`))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("fill", "#eee");

    sparklineSvg.append("g")
      .attr("transform", `translate(${sparklineMargin.left}, 0)`)
      .call(d3.axisLeft(yScaleSparkline))
      .selectAll("text")
      .style("fill", "#eee");

    const line = d3.line()
      .x((d, i) => xScaleSparkline(i))
      .y(d => yScaleSparkline(d.value)) // Use the value for positioning
      .curve(d3.curveMonotoneX);

    sparklineSvg.append("path")
      .datum(weeklyData.map((value, i) => ({ week: `Week ${i + 1}`, value }))) // Bind both week and value
      .attr("fill", "none")
      .attr("stroke", "#ff4444") // Change line color to red
      .attr("stroke-width", 2)
      .attr("d", line);

    sparklineSvg.selectAll("circle")
      .data(weeklyData.map((value, i) => ({ week: `Week ${i + 1}`, value }))) // Bind both week and value
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScaleSparkline(i))
      .attr("cy", d => yScaleSparkline(d.value))
      .attr("r", 3)
      .attr("fill", "#ff4444")
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.week}: ${d.value}`) // Use the week and value from the bound data
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Draw the horizontal bar chart for top wards
    const wardSvg = d3.select("#top-wards-svg");
    const wardWidth = +wardSvg.attr("width") - 50; // Add margin
    const wardHeight = +wardSvg.attr("height") - 50; // Add margin
    const wardMargin = { top: 20, right: 20, bottom: 40, left: 100 };

    const xScaleWard = d3.scaleLinear()
      .domain([0, d3.max(wardData)]) // Use wardData for the x-axis
      .range([wardMargin.left, wardWidth]);

    const yScaleWard = d3.scaleBand()
      .domain(wardLabels) // Use wardLabels for the y-axis
      .range([wardMargin.top, wardHeight])
      .padding(0.2);

    wardSvg.append("g")
      .attr("transform", `translate(0, ${wardHeight})`)
      .call(d3.axisBottom(xScaleWard).ticks(5));

    wardSvg.append("g")
      .attr("transform", `translate(${wardMargin.left}, 0)`)
      .call(d3.axisLeft(yScaleWard));

    wardSvg.selectAll(".bar")
      .data(wardData.map((value, i) => ({ label: wardLabels[i], value }))) // Bind both label and value
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", xScaleWard(0)) // Start from the x-axis origin
      .attr("y", d => yScaleWard(d.label)) // Use the label for positioning
      .attr("width", d => xScaleWard(d.value) - xScaleWard(0)) // Use the value for width
      .attr("height", yScaleWard.bandwidth())
      .attr("fill", "#ff4444") // Change bar color to red
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.label}: ${d.value}`) // Use the label and value from the bound data
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Close modal on click
    document.getElementById("close-crime-type-modal").onclick = () => {
      modal.style.display = "none";
    };
  }

  // Function to draw the bar chart
  function drawBarChart(filteredData) {
    const monthlyData = calculateMonthlyData(filteredData);

    // Select or create the SVG element
    const svg = d3.select("#timeline-chart-svg")
      .attr("width", 400)
      .attr("height", 300);

    const margin = { top: 40, right: 40, bottom: 60, left: 70 };
    const width = parseInt(svg.style("width")) - margin.left - margin.right;
    const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create scales
    const xScale = d3.scaleBand()
      .domain(monthlyData.map(d => d.date))
      .range([margin.left, margin.left + width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(monthlyData, d => d.count)])
      .range([margin.top + height, margin.top]);

    // Add axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b"));
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0, ${margin.top + height})`)
      .call(xAxis);

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

    // Add a separate layer for the brush
    const brushLayer = svg.append("g").attr("class", "brush");

    // Add bars
    svg.selectAll(".bar")
      .data(monthlyData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.date))
      .attr("y", d => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height + margin.top - yScale(d.count))
      .attr("fill", "#ff0000")
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d3.timeFormat("%B %Y")(d.date)}<br>Crimes: ${d.count}`)
          .style("opacity", 1) // make tooltip visible
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
        // Highlight corresponding days in heat-calendar
        highlightHeatCalendar([d.date.getMonth()]);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
        // Clear highlights in the heat calendar
        highlightHeatCalendar([]);
      })
      .on("click", (event, d) => {
        // Open modal and draw pie chart
        openCrimeTypeModal(d.date, filteredData);
      });

    // Add brush
    const brush = d3.brushX()
      .extent([[margin.left, margin.top], [margin.left + width, margin.top + height]])
      .on("end", ({ selection }) => {
        if (selection) {
          const [x0, x1] = selection;
          const selectedMonths = monthlyData.filter(d => {
            const x = xScale(d.date) + xScale.bandwidth() / 2; // Center of the bar
            return x >= x0 && x <= x1;
          });
        
          // Update the Weekly Bar Chart with the filtered data
          const selectedMonthData = filteredData.filter(data =>
            selectedMonths.some(month => 
              data.date.getFullYear() === month.date.getFullYear() &&
              data.date.getMonth() === month.date.getMonth()
            )
          );
          drawDayOfWeekChart(selectedMonthData);
      }
    });

    brushLayer.call(brush);

    // Add a click listener to clear the brush when clicking outside the chart
    d3.select("body").on("click", (event) => {
      if (!event.target.closest("#timeline-chart-svg")) {
        brushLayer.call(brush.move, null); // Clear the brush selection
        drawDayOfWeekChart(filteredData); // Reset the Weekly Bar Chart
      }
    });
  }

  // Function to draw the pie chart and bar chart in the detailed view of a day in the heat calendar
  function openPieChartModal(date, filteredData) {
    // Get the day name and date
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[date.getDay()];
    const formattedDate = d3.timeFormat("%B %d, %Y")(date);
  
    // Set the modal title with the day name and date
    document.getElementById("modal-day-title").textContent = `${dayName}, ${formattedDate}`;
  
    // Filter data for the selected day
    const dayData = filteredData.filter(d =>
      d.date.getFullYear() === date.getFullYear() &&
      d.date.getMonth() === date.getMonth() &&
      d.date.getDate() === date.getDate()
    );
  
    // Aggregate data by offense group for the pie chart
    const offenseCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.offense_group
    );
  
    const pieLabels = offenseCounts.map(([offense]) => offense);
    const offensePieData = offenseCounts.map(([_, count]) => count);
  
    // Aggregate data by shift for the bar chart
    const shiftCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.shift
    );
  
    const barLabels = shiftCounts.map(([shift]) => shift);
    const barData = shiftCounts.map(([_, count]) => count);
  
    // Aggregate data by offense key for the offense key distribution bar chart
    const offenseKeyCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.offensekey
    );
  
    const offenseKeyLabels = offenseKeyCounts.map(([offensekey]) => offensekey);
    const offenseKeyData = offenseKeyCounts.map(([_, count]) => count);
  
    // Open the modal
    const modal = document.getElementById("piechart-modal");
    modal.style.display = "block";
  
    // Clear previous charts
    d3.select("#piechart-svg").selectAll("*").remove();
    d3.select("#barchart-svg").selectAll("*").remove();
    d3.select("#method-barchart-svg").selectAll("*").remove();
  
    // Draw the pie chart
    const pieSvg = d3.select("#piechart-svg");
    const pieWidth = +pieSvg.attr("width");
    const pieHeight = +pieSvg.attr("height");
    const pieRadius = Math.min(pieWidth, pieHeight) / 2;

    const pieGroup = pieSvg.append("g")
      .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

    const pieColor = d3.scaleOrdinal()
      .domain(pieLabels)
      .range(["#ff4444", "#ffaa00"]); // Colors for violent and property crimes

    // Map the data to include both label and value
    const pieData = pieLabels.map((label, i) => ({ label, value: offensePieData[i] }));

    // Generate the pie chart
    const pie = d3.pie().value(d => d.value)(pieData);

    const pieArc = d3.arc()
      .innerRadius(0)
      .outerRadius(pieRadius);

    pieGroup.selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("d", pieArc)
      .attr("fill", d => pieColor(d.data.label))
      .attr("stroke", "#fff")
      .attr("stroke-width", "2px")
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.data.label}: ${d.data.value}`)
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Draw the shift distribution bar chart
    const barSvg = d3.select("#barchart-svg");
    const barWidth = +barSvg.attr("width") - 50; // Add margin
    const barHeight = +barSvg.attr("height") - 50; // Add margin
    const barMargin = { top: 20, right: 20, bottom: 40, left: 50 };
  
    const xScale = d3.scaleBand()
      .domain(barLabels)
      .range([barMargin.left, barWidth])
      .padding(0.2);
  
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(barData)])
      .range([barHeight, barMargin.top]);
  
    // Add axes
    barSvg.append("g")
      .attr("transform", `translate(0, ${barHeight})`)
      .call(d3.axisBottom(xScale));
  
    barSvg.append("g")
      .attr("transform", `translate(${barMargin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  
    // Add bars
    barSvg.selectAll(".bar")
      .data(barData.map((value, i) => ({ label: barLabels[i], value }))) // Bind both label and value
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.label)) // Use the label for positioning
      .attr("y", d => yScale(d.value)) // Use the value for positioning
      .attr("width", xScale.bandwidth())
      .attr("height", d => barHeight - yScale(d.value))
      .attr("fill", "#ff4444")
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.label}: ${d.value}`) // Use the label and value from the bound data
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Draw the offense key distribution bar chart
    const offenseKeySvg = d3.select("#method-barchart-svg");
    const offenseKeyWidth = +offenseKeySvg.attr("width") - 50; // Add margin
    const offenseKeyHeight = +offenseKeySvg.attr("height") - 50; // Add margin
    const offenseKeyMargin = { top: 20, right: 20, bottom: 60, left: 50 };
  
    const xScaleOffenseKey = d3.scaleBand()
      .domain(offenseKeyLabels)
      .range([offenseKeyMargin.left, offenseKeyWidth])
      .padding(0.2);
  
    const yScaleOffenseKey = d3.scaleLinear()
      .domain([0, d3.max(offenseKeyData)])
      .range([offenseKeyHeight, offenseKeyMargin.top]);
  
    // Add axes
    offenseKeySvg.append("g")
      .attr("transform", `translate(0, ${offenseKeyHeight})`)
      .call(d3.axisBottom(xScaleOffenseKey))
      .selectAll("text")
      .attr("transform", "rotate(-15)") // Rotate labels by -15 degrees
      .style("text-anchor", "end")
      .style("fill", "#eee");
  
    offenseKeySvg.append("g")
      .attr("transform", `translate(${offenseKeyMargin.left}, 0)`)
      .call(d3.axisLeft(yScaleOffenseKey));
  
    // Add bars
    offenseKeySvg.selectAll(".bar")
      .data(offenseKeyData.map((value, i) => ({ label: offenseKeyLabels[i], value }))) // Bind both label and value
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScaleOffenseKey(d.label)) // Use the label for positioning
      .attr("y", d => yScaleOffenseKey(d.value)) // Use the value for positioning
      .attr("width", xScaleOffenseKey.bandwidth())
      .attr("height", d => offenseKeyHeight - yScaleOffenseKey(d.value))
      .attr("fill", "#ff4444")
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${d.label}: ${d.value}`) // Use the label and value from the bound data
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
    // Close modal on click
    document.getElementById("close-modal").onclick = () => {
      modal.style.display = "none";
    };
  }


  // Function to draw the heat calendar
  function drawHeatCalendar(filteredData) {
    const dailyData = calculateDailyData(filteredData);

    // Select or create the SVG element
    const svg = d3.select("#daily-crime-chart-svg")
      .attr("width", 400)
      .attr("height", 300);

    const margin = { top: 40, right: 40, bottom: 60, left: 70 };
    const width = parseInt(svg.style("width")) - margin.left - margin.right;
    const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll("*").remove();

    // Define grid dimensions
    const cols = 31; // Maximum number of days in a month
    const rows = 12; // Number of months in a year
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    const xScale = d3.scaleLinear()
      .domain([1, cols + 1]) // Days of the month
      .range([margin.left, margin.left + width]);

    const yScale = d3.scaleLinear()
      .domain([0, rows]) // Months
      .range([margin.top, margin.top + height]);

    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(dailyData, d => d.count)]);

    // Add cells
    svg.selectAll(".cell")
      .data(dailyData)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => xScale(d.date.getDate()))
      .attr("y", d => yScale(d.date.getMonth()))
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", d => colorScale(d.count))
      .on("mouseover", (event, d) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .style("opacity", 1) // make tooltip visible
          .html(`${d3.timeFormat("%B %d, %Y")(d.date)}<br>Crimes: ${d.count}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);

        // Highlight corresponding month in the bar chart
        highlightBarChart(d.date.getMonth()); 
        
        // Highlight corresponding weekday in the weekly bar chart
        highlightDayOfWeekChart(d.date.getDay());
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
        // Clear highlights
        highlightBarChart([]);
        highlightDayOfWeekChart([]);
      })
      .on("click", (event, d) => {
        // Open modal and draw pie chart
        openPieChartModal(d.date, filteredData);
      });

    // Add y-axis (months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    svg.selectAll(".month-label")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "month-label")
      .attr("x", margin.left - 10)
      .attr("y", (d, i) => yScale(i) + cellHeight / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => d)
      .attr("fill", "#ffffff");
  }

  // Function to draw the detailed view for the day of the week
  function openDayOfWeekModal(day, filteredData) {
    // Filter data for the selected day of the week
    console.log("Filtered data:", filteredData); // debugging
    console.log("Selected day:", day); // Debugging
    const dayData = filteredData.filter(d => d.date.getDay() === day);
    console.log("Filtered Data for Day:", day, dayData); // Debugging

    // Aggregate data by shift for the bar chart
    const shiftCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.shift
    );

    const barLabels = shiftCounts.map(([shift]) => shift);
    const barData = shiftCounts.map(([_, count]) => count);

    // Aggregate data by offense group for the pie chart
    const offenseCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.offense_group
    );

    const pieLabels = offenseCounts.map(([offense]) => offense);
    const pieData = offenseCounts.map(([_, count]) => count);

    // Open the modal
    const modal = document.getElementById("day-of-week-modal");
    modal.style.display = "block";

    // Set the modal title
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    document.getElementById("day-of-week-title").textContent = days[day];

    // Clear previous charts
    d3.select("#shift-barchart-svg").selectAll("*").remove();
    d3.select("#offense-piechart-svg").selectAll("*").remove();

    // Draw the bar chart (Average Crimes by Shift)
    const barSvg = d3.select("#shift-barchart-svg");
    const barWidth = +barSvg.attr("width") - 50; // Add margin
    const barHeight = +barSvg.attr("height") - 50; // Add margin
    const barMargin = { top: 20, right: 20, bottom: 40, left: 50 };

    const xScale = d3.scaleBand()
      .domain(barLabels)
      .range([barMargin.left, barWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(barData)])
      .range([barHeight, barMargin.top]);

    // Add axes
    barSvg.append("g")
      .attr("transform", `translate(0, ${barHeight})`)
      .call(d3.axisBottom(xScale));

    barSvg.append("g")
      .attr("transform", `translate(${barMargin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    // Add bars
    barSvg.selectAll(".bar")
      .data(barData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(barLabels[i]))
      .attr("y", d => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => barHeight - yScale(d))
      .attr("fill", "#44c2ff");

    // Draw the pie chart (Offense Group Distribution)
    const pieSvg = d3.select("#offense-piechart-svg");
    const pieWidth = +pieSvg.attr("width");
    const pieHeight = +pieSvg.attr("height");
    const pieRadius = Math.min(pieWidth, pieHeight) / 2;

    const pieGroup = pieSvg.append("g")
      .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

    const pieColor = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie().value(d => d)(pieData);

    const pieArc = d3.arc()
      .innerRadius(0)
      .outerRadius(pieRadius);

    pieGroup.selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("d", pieArc)
      .attr("fill", (d, i) => pieColor(i))
      .attr("stroke", "#fff")
      .attr("stroke-width", "2px");

    pieGroup.selectAll("text")
      .data(pie)
      .enter()
      .append("text")
      .attr("transform", d => `translate(${pieArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#fff")
      .text((d, i) => `${pieLabels[i]} (${pieData[i]})`);

    // Close modal on click
    document.getElementById("close-day-modal").onclick = () => {
      modal.style.display = "none";
    };
  }

  // Function to draw the day-of-week bar chart
  function drawDayOfWeekChart(filteredData) {
    // Calculate average crimes per weekday
    const dayOfWeekCounts = d3.rollups(
      filteredData,
      v => d3.sum(v, d => d.count),
      d => d.date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    );

    const totalDays = d3.rollups(
      filteredData,
      v => new Set(v.map(d => d.date.toDateString())).size,
      d => d.date.getDay()
    );

    const averages = dayOfWeekCounts.map(([day, totalCrimes]) => {
      const daysCount = totalDays.find(([d]) => d === day)?.[1] || 1;
      return { day, average: totalCrimes / daysCount };
    });

    // Sort by day of the week (Sunday to Saturday)
    averages.sort((a, b) => a.day - b.day);

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const labels = averages.map(d => days[d.day]);
    const data = averages.map(d => d.average);

    // Select or create the SVG element
    const svg = d3.select("#day-of-week-chart-svg");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 40, right: 20, bottom: 80, left: 60 }; // Increased bottom margin for x-axis labels
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create scales
    const xScale = d3.scaleBand()
      .domain(labels)
      .range([margin.left, margin.left + chartWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .range([margin.top + chartHeight, margin.top]);

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0, ${margin.top + chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("fill", "#eee");

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#eee");

    // Add bars
    svg.selectAll(".bar")
      .data(averages)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(days[d.day]))
      .attr("y", d => yScale(d.average))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight + margin.top - yScale(d.average))
      .attr("fill", "#ff0000")
      .on("mouseover", (event, d, i) => {
        const tooltip = d3.select("#timeline-tooltip");
        tooltip.style("visibility", "visible")
          .html(`${days[d.day]}<br>Average Crimes: ${d.average.toFixed(2)}`)
          .style("opacity", 1)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);

        // Highlight corresponding cells in the heat-calendar
        highlightHeatCalendarByWeekday(d.day);  
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);

        // Clear highlights in the heat-calendar
        highlightHeatCalendarByWeekday(null);
      })
      .on("click", (event, d) => {
        console.log("Clicked day:", days[d.day]); // human-readable string
        console.log(d.day)
        openDayOfWeekModal(d.day, filteredData); // string like "Monday"
      });
  }

  // Main Drawing Function for Heat Calendar
  function drawHeatCalendarWithFilters() {
    const filteredData = getFilteredData();
    drawHeatCalendar(filteredData);
  }

  // Main Drawing Function for bar chart
  function drawBarChartWithFilters() {
    const filteredData = getFilteredData();
    drawBarChart(filteredData);
  }

  // Add event listeners for heat calendar filters
  d3.selectAll(".timeline-filter-panel select").on("change", () => {
    const filteredData = getFilteredData();
    drawBarChartWithFilters();
    drawHeatCalendarWithFilters(); // Update heat calendar only
    drawDayOfWeekChart(filteredData); // Update day-of-week chart only
  });

  // Initial draw pf charts 
  drawBarChartWithFilters(); // Draw bar chart
  drawHeatCalendarWithFilters(); // Draw heat calendar
  drawDayOfWeekChart(data); // New day-of-week bar chart

});






