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

    // PSA list
    d3.csv("../data/psa_crime.csv").then(data => {
      const psaList = Array.from(new Set(data.map(d => d.psa)))
        .map(psa => parseInt(psa))
        .sort((a, b) => a - b);
    
      const psaContainer = document.getElementById("psa-list");
  
      const psaElements = psaList.map(psa => {
        const div = document.createElement("div");
        div.className = "draggable";
        div.draggable = true;
        div.textContent = `PSA ${psa}`;
        div.setAttribute("data-psa", psa);
        div.setAttribute("data-type", "psa");
      
        div.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text", div.textContent.trim());
          e.dataTransfer.setData("type", div.dataset.type || "psa");
        });
      
        return div;
      });
      
      
      psaElements.slice(0, 5).forEach(el => psaContainer.appendChild(el));
  
      const searchInput = document.getElementById("psa-search");
  
      searchInput.addEventListener("input", function () {
        const searchValue = this.value.trim().toLowerCase();
        psaContainer.innerHTML = ""; 
  
        const filtered = psaElements.filter(el =>
          el.textContent.toLowerCase().includes(searchValue)
        );
  
        filtered.slice(0, 10).forEach(el => psaContainer.appendChild(el)); 
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
              barPercentage: 0.6,        
              categoryPercentage: 0.6    
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
  
    //  drag
    function refreshDraggables() {
      document.querySelectorAll(".draggable").forEach(el => {
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text", el.textContent.trim());
          e.dataTransfer.setData("type", el.dataset.type || "psa");
        });
      });
    }
    refreshDraggables(); 
  
    // Drag + drop 
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
      
          // set labels 
          let xLabels = [];
      
          if (selectedX.toLowerCase() === "shift") {
            xLabels = ["Day", "Evening", "Midnight"];
          } else if (selectedX.toLowerCase() === "method") {
            xLabels = ["Gun", "Knife", "Others"]; 
          } else if (selectedX.toLowerCase() === "month") {
            xLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          } else if (selectedX.toLowerCase() === "day of week") {
            xLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          } else if (selectedX.toLowerCase() === "year") {
            xLabels = ["2020", "2021", "2022", "2023", "2024"]; 
          } else {
            xLabels = selectedPSAs;
          }
      
          psaChart.data.labels = xLabels;
      
          psaChart.options.scales.x.title.text = selectedX;
          psaChart.options.scales.y.title.text = selectedY;
      
          //dummy data
          psaChart.data.datasets = selectedPSAs.map((psa, i) => ({
            label: `PSA ${psa}`,
            data: xLabels.map(() => Math.floor(Math.random() * 100)), 
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

  /* --------------------------------------------------------------------------------------------------------------------------------- */


  d3.csv("../data/crime_daily_counts.csv").then(data => {
    // Data Parsing, date conversion, and type conversion because the data is in string format
    data.forEach(d => {
      d.date = new Date(d.date);
      d.day_of_week = d.date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      d.count = +d.count;
    });
  
    // Function to dynamically populate a filter dropdown
    function populateFilter(selectId, attribute) {
      const uniqueValues = Array.from(new Set(data.map(d => d[attribute]))).sort();
      const select = d3.select(`#${selectId}`);
      select.append("option").attr("value", "all").text(`All ${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`);
      uniqueValues.forEach(value => {
        select.append("option").attr("value", value).text(value);
      });
    }
  
    // Populate filters of the charts with unique values from the dataset
    populateFilter("offense-monthly-select", "offense_group");
    populateFilter("method-monthly-select", "method");
    populateFilter("shift-monthly-select", "shift");
    populateFilter("district-monthly-select", "district");
    populateFilter("ward-monthly-select", "ward");
  
    // Functions to filter chart data based on selected filters and returns the filtered data
    // Returned dataset only contains the data that matches the selected filters
    function getFilteredBarChartData() {
      const selectedFilters = {
        offense_group: d3.select("#offense-monthly-select").property("value"),
        method: d3.select("#method-monthly-select").property("value"),
        shift: d3.select("#shift-monthly-select").property("value"),
        district: d3.select("#district-monthly-select").property("value"),
        ward: d3.select("#ward-monthly-select").property("value"),
      };
  
      return data.filter(d => {
        return (
          (selectedFilters.offense_group === "all" || d.offense_group === selectedFilters.offense_group) &&
          (selectedFilters.method === "all" || d.method === selectedFilters.method) &&
          (selectedFilters.shift === "all" || d.shift === selectedFilters.shift) &&
          (selectedFilters.district === "all" || d.district === selectedFilters.district) &&
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
  
    /*
    function highlightHeatCalendar(months) {
      const svg = d3.select("#daily-crime-chart-svg");
    
      svg.selectAll(".cell")
        .attr("stroke", d => (months.includes(d.date.getMonth()) ? "#000" : null))
        .attr("stroke-width", d => (months.includes(d.date.getMonth()) ? 2 : 0));
    }*/
  
  function drawBarChart(filteredData) {
    const monthlyData = calculateMonthlyData(filteredData);
  
    // Select or create the SVG element
    const svg = d3.select("#timeline-chart-svg")
      .attr("width", "100%")
      .attr("height", 400);
  
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
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      });
  
      /*
      // Add brushing
    const brush = d3.brushX()
    .extent([[margin.left, margin.top], [margin.left + width, margin.top + height]])
    .on("brush end", event => {
      const selection = event.selection;
      if (selection) {
        const [x0, x1] = selection;
        const brushedMonths = monthlyData.filter(d => {
          const x = xScale(d.date) + xScale.bandwidth() / 2;
          return x >= x0 && x <= x1;
        }).map(d => d.date.getMonth());
        highlightHeatCalendar(brushedMonths);
      } else {
        highlightHeatCalendar([]); // Clear highlights if no selection
      }
    });
  
    svg.append("g")
      .attr("class", "brush")
      .call(brush);
      */
  }

  function openPieChartModal(date, filteredData) {
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
    const pieData = offenseCounts.map(([_, count]) => count);
  
    // Aggregate data by shift for the bar chart
    const shiftCounts = d3.rollups(
      dayData,
      v => d3.sum(v, d => d.count),
      d => d.shift
    );
  
    const barLabels = shiftCounts.map(([shift]) => shift);
    const barData = shiftCounts.map(([_, count]) => count);
  
    // Open the modal
    const modal = document.getElementById("piechart-modal");
    modal.style.display = "block";
  
    // Clear previous charts
    d3.select("#piechart-svg").selectAll("*").remove();
    d3.select("#barchart-svg").selectAll("*").remove();
  
    // Draw the pie chart
    const pieSvg = d3.select("#piechart-svg");
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
  
    // Draw the bar chart
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
      .data(barData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(barLabels[i]))
      .attr("y", d => yScale(d))
      .attr("width", xScale.bandwidth())
      .attr("height", d => barHeight - yScale(d))
      .attr("fill", "#44c2ff");
  
    // Close modal on click
    document.getElementById("close-modal").onclick = () => {
      modal.style.display = "none";
    };
  }
  
  
  function drawHeatCalendar(filteredData) {
    const dailyData = calculateDailyData(filteredData);
  
    // Select or create the SVG element
    const svg = d3.select("#daily-crime-chart-svg")
      .attr("width", "100%")
      .attr("height", 400);
  
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
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
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

  const dayMapping = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };

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
    const margin = { top: 40, right: 20, bottom: 60, left: 50 };
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
      })
      .on("mouseout", () => {
        d3.select("#timeline-tooltip").style("visibility", "hidden").style("opacity", 0);
      })
      .on("click", (event, d) => {
        console.log("Clicked day:", days[d.day]); // human-readable string
        console.log(d.day)
        openDayOfWeekModal(d.day, filteredData); // string like "Monday"
      });
  }
  
    // Main Drawing Function for Heat Calendar
    function drawHeatCalendarWithFilters() {
      const filteredData = getFilteredBarChartData();
      drawHeatCalendar(filteredData);
    }
  
    // Main Drawing Function for bar chart
    function drawBarChartWithFilters() {
      const filteredData = getFilteredBarChartData();
      drawBarChart(filteredData);
    }
    
    // Add event listeners for heat calendar filters
  d3.selectAll(".timeline-filter-panel select").on("change", () => {
    drawBarChartWithFilters();
    drawHeatCalendarWithFilters(); // Update heat calendar only
  });

  
    // Initial draw pf charts 
    drawBarChartWithFilters(); // Draw bar chart
    drawHeatCalendarWithFilters(); // Draw heat calendar
    drawDayOfWeekChart(data); // New day-of-week bar chart
    
  });
  


  
  
  