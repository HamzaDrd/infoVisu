d3.csv("../data/crime_daily_counts.csv").then(data => {
  // Data Parsing, date conversion, and type conversion because the data is in string format
  data.forEach(d => {
    d.date = new Date(d.date);
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
  populateFilter("offense-select", "offense_group");
  populateFilter("method-select", "method");
  populateFilter("shift-select", "shift");
  populateFilter("district-select", "district");
  populateFilter("ward-select", "ward");
  populateFilter("heatcalendar-offense-select", "offense_group");
  populateFilter("heatcalendar-method-select", "method");
  populateFilter("heatcalendar-shift-select", "shift");
  populateFilter("heatcalendar-district-select", "district");
  populateFilter("heatcalendar-ward-select", "ward");

  // Functions to filter chart data based on selected filters and returns the filtered data
  // Returned dataset only contains the data that matches the selected filters
  function getFilteredBarChartData() {
    const selectedFilters = {
      offense_group: d3.select("#offense-select").property("value"),
      method: d3.select("#method-select").property("value"),
      shift: d3.select("#shift-select").property("value"),
      district: d3.select("#district-select").property("value"),
      ward: d3.select("#ward-select").property("value"),
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

  function getFilteredHeatCalendarData() {
    const selectedFilters = {
      offense_group: d3.select("#heatcalendar-offense-select").property("value"),
      method: d3.select("#heatcalendar-method-select").property("value"),
      shift: d3.select("#heatcalendar-shift-select").property("value"),
      district: d3.select("#heatcalendar-district-select").property("value"),
      ward: d3.select("#heatcalendar-ward-select").property("value"),
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
      const tooltip = d3.select("#heatcalendar-tooltip");
      tooltip.style("visibility", "visible")
        .style("opacity", 1) // make tooltip visible
        .html(`${d3.timeFormat("%B %d, %Y")(d.date)}<br>Crimes: ${d.count}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`);
    })
    .on("mouseout", () => {
      d3.select("#heatcalendar-tooltip").style("visibility", "hidden").style("opacity", 0);
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

  // Main Drawing Function for Heat Calendar
  function drawHeatCalendarWithFilters() {
    const filteredData = getFilteredHeatCalendarData();
    drawHeatCalendar(filteredData);
  }

  // Main Drawing Function for bar chart
  function drawBarChartWithFilters() {
    const filteredData = getFilteredBarChartData();
    drawBarChart(filteredData);
  }
  
  // Add event listeners for heat calendar filters
d3.selectAll(".heatcalendar-filter-panel select").on("change", () => {
  drawHeatCalendarWithFilters(); // Update heat calendar only
});

// Add event listeners for bar chart filters
d3.selectAll(".timeline-filter-panel select").on("change", () => {
  drawBarChartWithFilters();// Update bar chart only
});

  // Initial draw pf charts 
  drawBarChartWithFilters(); // Draw bar chart
  drawHeatCalendarWithFilters(); // Draw heat calendar
  
});
