
// === CLUSTER NAME MAPPING ===
// Maps internal cluster identifiers to neighborhood names
const clusterNames = {
  "cluster 1": "Kalorama Heights, Adams Morgan",
  "cluster 2": "Columbia Heights, Mt. Pleasant, Pleasant Plains, Park View",
  "cluster 3": "Howard University, Le Droit Park, Cardozo/Shaw",
  "cluster 4": "Georgetown, Burleith/Hillandale",
  "cluster 5": "West End, Foggy Bottom, GWU",
  "cluster 6": "Dupont Circle, Connecticut Avenue/K Street",
  "cluster 7": "Shaw, Logan Circle",
  "cluster 8": "Downtown, Chinatown, Penn Quarter",
  "cluster 9": "Southwest Employment Area, Southwest Waterfront",
  "cluster 10": "Hawthorne, Barnaby Woods, Chevy Chase",
  "cluster 11": "Friendship Heights, American University Park, Tenleytown",
  "cluster 12": "North Cleveland Park, Forest Hills, Van Ness",
  "cluster 13": "Spring Valley, Palisades, Wesley Heights, Foxhall Village, Georgetown Reservoir",
  "cluster 14": "Cathedral Heights, McLean Gardens, Glover Park",
  "cluster 15": "Cleveland Park, Woodley Park, Massachusetts Avenue Heights, Woodland-Normanstone",
  "cluster 16": "Colonial Village, Shepherd Park, North Portal Estates",
  "cluster 17": "Takoma, Brightwood, Manor Park",
  "cluster 18": "Brightwood Park, Crestwood, Petworth",
  "cluster 19": "Lamont Riggs, Queens Chapel, Fort Totten",
  "cluster 20": "North Michigan Park, Michigan Park, University Heights",
  "cluster 21": "Edgewood, Bloomingdale, Truxton Circle, Eckington",
  "cluster 22": "Brookland, Brentwood, Langdon",
  "cluster 23": "Ivy City, Arboretum, Trinidad, Carver Langston",
  "cluster 24": "Woodridge, Fort Lincoln, Gateway",
  "cluster 25": "Union Station, Stanton Park, Kingman Park",
  "cluster 26": "Capitol Hill, Lincoln Park",
  "cluster 27": "Near Southeast, Navy Yard",
  "cluster 28": "Historic Anacostia",
  "cluster 29": "Eastland Gardens, Kenilworth",
  "cluster 30": "Mayfair, Hillbrook, Mahaning Heights",
  "cluster 31": "Deanwood, Burrville, Grant Park, Lincoln Heights, Fairmont Heights",
  "cluster 32": "River Terrace, Benning, Greenway, Dupont Park, Fort Davis Park, Twining",
  "cluster 33": "Capitol View, Marshall Heights, Benning Heights",
  "cluster 34": "Twining, Fairlawn, Randle Highlands, Penn Branch, Fort Davis, Fort Dupont",
  "cluster 35": "Fairfax Village, Naylor Gardens, Hillcrest, Summit Park",
  "cluster 36": "Woodland/Fort Stanton, Garfield Heights, Knox Hill",
  "cluster 37": "Sheridan, Barry Farm, Buena Vista",
  "cluster 38": "Douglas, Shipley Terrace",
  "cluster 39": "Congress Heights, Bellevue, Washington Highlands",
  "cluster 40": "Walter Reed",
  "cluster 41": "Rock Creek Park",
  "cluster 42": "Observatory Circle",
  "cluster 43": "Saint Elizabeths",
  "cluster 44": "Joint Base Anacostia-Bolling",
  "cluster 45": "National Mall, Potomac River",
  "cluster 46": "Arboretum, Anacostia River",
};

let activeClusterId = null;
let activeChartType = null;   

// === LOAD AND PROCESS CSV DATA ===
document.addEventListener("DOMContentLoaded", () => {

  d3.csv("../data/crime_clean.csv").then(data => {
    window.originalCrimeData = data; 
    buildLeaderboard(data); // Initial leaderboard using full dataset

    // === FILL IN DDL FOR COMPARING ===
    const dropdown1 = document.getElementById("neighborhood1");
    const dropdown2 = document.getElementById("neighborhood2");

    Object.entries(clusterNames).forEach(([id, name]) => {
      const option1 = document.createElement("option");
      option1.value = id;
      option1.textContent = name;

      const option2 = option1.cloneNode(true);

      dropdown1.appendChild(option1);
      dropdown2.appendChild(option2);
    });

    function updateBoxplots() {
      const cluster1 = dropdown1.value;
      const cluster2 = dropdown2.value;
      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");

      if (!cluster1 && !cluster2) return;

      const getTimes = cluster => window.originalCrimeData
        .filter(d => d.neighborhood_cluster === cluster)
        .map(d => {
          const start = parseTime(d.start_date);
          const report = parseTime(d.report_date);
          return (report - start) / (1000 * 60 * 60);
        })
        .filter(h => h >= 0 && h < 720);


      const times1 = cluster1 ? getTimes(cluster1) : [];
      const times2 = cluster2 ? getTimes(cluster2) : [];

      function filteredMax(times) {
        const sorted = [...times].sort((a, b) => a - b);
        const q1 = d3.quantileSorted(sorted, 0.25);
        const q3 = d3.quantileSorted(sorted, 0.75);
        const iqr = q3 - q1;
        return d3.max(sorted.filter(d => d <= q3 + 1.5 * iqr));
      }

      const max1 = times1.length ? filteredMax(times1) : 0;
      const max2 = times2.length ? filteredMax(times2) : 0;


      console.log("Max1:", max1);
      console.log("Max2:", max2);
      const sharedMax = Math.max(max1, max2);


      if (cluster1) drawBoxplot(cluster1, "boxplot1", sharedMax);
      if (cluster2) drawBoxplot(cluster2, "boxplot2", sharedMax);
    }

    dropdown1.addEventListener("change", updateBoxplots);
    dropdown2.addEventListener("change", updateBoxplots);



    // === MAIN FUNCTION TO BUILD THE LEADERBOARD ===
    function buildLeaderboard(data) {
      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
      const delays = {};
      const crimeCounts = {};
      const monthlyDelays = {};

      // === STEP 1: Organize data by cluster and compute reporting delays ===
      data.forEach(d => {
        const start = parseTime(d.start_date);
        const report = parseTime(d.report_date);
        const cluster = d.neighborhood_cluster;

        if (start && report && cluster && clusterNames[cluster]) {
          const diffHours = (report - start) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours < 720) {
            if (!delays[cluster]) delays[cluster] = [];
            if (!crimeCounts[cluster]) crimeCounts[cluster] = 0;
            delays[cluster].push(diffHours);
            crimeCounts[cluster]++;

            // Group by month for trend and form calculation
            const monthKey = `${report.getFullYear()}-${String(report.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyDelays[cluster]) monthlyDelays[cluster] = {};
            if (!monthlyDelays[cluster][monthKey]) monthlyDelays[cluster][monthKey] = [];
            monthlyDelays[cluster][monthKey].push(diffHours);
          }
        }
      });

      // === STEP 2: Determine recent months ===
      const allMonths = new Set();
      Object.values(monthlyDelays).forEach(clusterMonths => {
        Object.keys(clusterMonths).forEach(month => allMonths.add(month));
      });
      const sortedMonths = Array.from(allMonths).sort(); 
      const last5Months = sortedMonths.slice(-5);
      const lastTwoMonths = sortedMonths.slice(-2);

      // === STEP 3: Build "form" performance indicators per cluster ===
      const formDict = {};
      Object.keys(monthlyDelays).forEach(cluster => {
        formDict[cluster] = ""; // of eventueel "📈" als je wil
      });


      // === STEP 4: Compute rankings per month to determine trends ===
      const monthlyAvg = {};
      Object.entries(monthlyDelays).forEach(([cluster, monthData]) => {
        Object.entries(monthData).forEach(([month, values]) => {
          if (!monthlyAvg[month]) monthlyAvg[month] = [];
          const avg = d3.mean(values);
          monthlyAvg[month].push({ cluster, avg });
        });
      });

      const ranks = {};
      lastTwoMonths.forEach(month => {
        const list = monthlyAvg[month];
        if (!list) return;
        list.sort((a, b) => a.avg - b.avg);
        ranks[month] = {};
        list.forEach((item, index) => {
          ranks[month][item.cluster] = index + 1;
        });
      });
      
      // === STEP 5: Build summary statistics per cluster ===
      const averages = Object.entries(delays).map(([cluster, hours]) => {
        return {
          cluster,
          avg: d3.mean(hours),
          total_crimes: crimeCounts[cluster],
          trend: null,
          form: formDict[cluster] || "🟩🟩🟩🟩🟩"
        };
      });

      // Sort by average reporting time (ascending)
      averages.sort((a, b) => a.avg - b.avg);


      // Determine rank trends
      averages.forEach((entry, index) => {
        const cluster = entry.cluster;
        const [prevMonth, currMonth] = lastTwoMonths;
        const prevRank = ranks[prevMonth]?.[cluster];

        const currRank = index + 1;

        if (!prevRank) {
            entry.trend = "➖";
        } else if (currRank < prevRank) {
            entry.trend = "🔼";
        } else if (currRank > prevRank) {
            entry.trend = "🔽";
        } else {
            entry.trend = "➖";
        }
      });
      const top5 = averages.slice(0, 5);

      // === STEP 6: Render top 10 in HTML leaderboard ===
      const leaderboard = document.getElementById("leaderboard");
      leaderboard.innerHTML = "";
      let actualRank = 1;

      top5.forEach(entry => {
        const clusterName = clusterNames[entry.cluster];
        if (!clusterName) return;

        const rank = actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : actualRank === 3 ? "🥉" : `#${actualRank}`;
        const hours = formatHoursToHM(entry.avg);
        const form = entry.form;
        const trend = entry.trend;
        const crimes = entry.total_crimes;

        const li = document.createElement("li");
        li.classList.add("leaderboard-row");
        li.innerHTML = `
          <div class="rank">${rank}</div>
          <div class="neighborhood">${clusterName}</div>
          <div class="time">${formatHoursToHM(entry.avg)}</div>
          <div class="trend">${trend}</div>
          <div class="crimes">📝 ${crimes}</div>
          <div class="charts"><button class="chart-button full" data-cluster="${entry.cluster}">Check Charts</button></div>

        `;
        leaderboard.appendChild(li);
        actualRank++;
        li.querySelector(".chart-button.full").addEventListener("click", () => {
          const cluster = entry.cluster;
          showARTChart(cluster);
          showRecentTrendLine(cluster);
        });        
      });

    }

    document.getElementById("leaderboard-search").addEventListener("input", function () {
      const query = this.value.toLowerCase();

      document.querySelectorAll(".leaderboard-row").forEach(row => {
        const name = row.querySelector(".neighborhood")?.textContent?.toLowerCase() || "";
        if (name.includes(query)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });
   


    // === FILTER TILE INTERACTIES (Visual toggles) ===
    document.querySelectorAll(".filter-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        tile.classList.toggle("active");
      });
    });



    
    // === FILTER CONFIRM BUTTON ===
    document.getElementById("apply-filters").addEventListener("click", () => {
      const filters = {
        crime_type: [],
        shift: [],
        weapon: []
      };

      // Collect all selected filtered values
      document.querySelectorAll(".tile-group").forEach(group => {
        const category = group.dataset.filter;
        group.querySelectorAll(".filter-tile.active").forEach(tile => {
          filters[category].push(tile.dataset.value.toLowerCase());
        });
      });

      // === RELOAD LEADERBOARD WITH FILTERS ===
      applyFilters(filters);
    });

    
    // === FILTER CLEAR ALL BUTTON ===
    document.getElementById("clear-filters").addEventListener("click", () => {
      // Remove all filters
      document.querySelectorAll(".filter-tile.active").forEach(tile => {
        tile.classList.remove("active");
      });

      // Refresh leaderboards
      buildLeaderboard(window.originalCrimeData); 
    });



    // === VISUAL FEEDBACK ON CONFIRM BUTTON ===
    const applyButton = document.getElementById('apply-filters');
    applyButton.addEventListener('click', () => {
      applyButton.classList.add('active');
      setTimeout(() => {
        applyButton.classList.remove('active');
      }, 750); 

      
    });

    // === APPLY FILTERS ===
    function applyFilters(filters) {
      const filtered = window.originalCrimeData.filter(d => {
        const offenseGroup = d.offense_group?.toLowerCase();
        const shift = d.shift?.toLowerCase();
        const method = d.method?.toLowerCase();

        const matchType = filters.crime_type.length === 0 || filters.crime_type.includes(offenseGroup);
        const matchShift = filters.shift.length === 0 || filters.shift.includes(shift);
        const matchWeapon = filters.weapon.length === 0 || filters.weapon.includes(method);

        return matchType && matchShift && matchWeapon;
      });

      buildLeaderboard(filtered); // Rebuild Leaderboard with filtered data
    }

    // === Helper ===
    function formatHoursToHM(hoursFloat) {
      const totalMinutes = Math.round(hoursFloat * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h}h ${m}m`;
    }



    // === DRAW BOXPLOTS ===
    function drawBoxplot(clusterId, containerId, sharedMax = null) {
      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
      const container = d3.select(`#${containerId}`);
      container.selectAll("*").remove(); 

      const data = window.originalCrimeData
        .filter(d => d.neighborhood_cluster === clusterId)
        .map(d => {
          const start = parseTime(d.start_date);
          const report = parseTime(d.report_date);
          return (report - start) / (1000 * 60 * 60);
        })
        .filter(hours => hours >= 0 && hours < 720);

      if (!data.length) {
        container.append("p").text("No data available.");
        return;
      }

      const sorted = data.sort((a, b) => a - b);
      const q1 = d3.quantileSorted(sorted, 0.25);
      const median = d3.quantileSorted(sorted, 0.5);
      const q3 = d3.quantileSorted(sorted, 0.75);
      const iqr = q3 - q1;
      const min = d3.min(sorted.filter(d => d >= (q1 - 1.5 * iqr)));
      const max = d3.max(sorted.filter(d => d <= (q3 + 1.5 * iqr)));


      const width = 400;
      const height = 300;
      const margin = { top: 20, right: 30, bottom: 40, left: 50 };

      const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "300")
        .attr("viewBox", "0 0 400 300")
        .attr("preserveAspectRatio", "xMidYMid meet");



      const x = d3.scaleBand()
        .range([margin.left, width - margin.right])
        .domain([clusterNames[clusterId]])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, (sharedMax ?? max) * 1.1])
        .range([height - margin.bottom, margin.top]);


      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

      // vertical line between min and max (whisker)
      svg.append("line")
        .attr("x1", x(clusterNames[clusterId]) + x.bandwidth() / 2)
        .attr("x2", x(clusterNames[clusterId]) + x.bandwidth() / 2)
        .attr("y1", y(min))
        .attr("y2", y(max))
        .attr("stroke", "#888") 
        .attr("stroke-width", 2);

      // Box (between Q1 and Q3)
      svg.append("rect")
        .attr("x", x(clusterNames[clusterId]))
        .attr("y", y(q3))
        .attr("height", y(q1) - y(q3))
        .attr("width", x.bandwidth())
        .attr("fill", "#ff4444")
        .attr("stroke", "#ddd")        
        .attr("stroke-width", 1.5);

      // Median-line
      svg.append("line")
        .attr("x1", x(clusterNames[clusterId]))
        .attr("x2", x(clusterNames[clusterId]) + x.bandwidth())
        .attr("y1", y(median))
        .attr("y2", y(median))
        .attr("stroke", "#ffffff")     
        .attr("stroke-width", 2);

      // Min-line
      svg.append("line")
        .attr("x1", x(clusterNames[clusterId]) + x.bandwidth() * 0.25)
        .attr("x2", x(clusterNames[clusterId]) + x.bandwidth() * 0.75)
        .attr("y1", y(min))
        .attr("y2", y(min))
        .attr("stroke", "#aaa");       

      // Max-line
      svg.append("line")
        .attr("x1", x(clusterNames[clusterId]) + x.bandwidth() * 0.25)
        .attr("x2", x(clusterNames[clusterId]) + x.bandwidth() * 0.75)
        .attr("y1", y(max))
        .attr("y2", y(max))
        .attr("stroke", "#aaa");


      const statsBox = container.append("div")
        .attr("class", "boxplot-stats")
        .style("margin-top", "0.75rem")
        .style("font-size", "0.9rem")
        .style("color", "#ccc");

      statsBox.html(`
        <div><strong>Fastest Time:</strong> ${formatHoursToHM(min)}</div>
        <div><strong>Average Time:</strong> ${formatHoursToHM(d3.mean(data))}</div>
        <div><strong>Slowest Time:</strong> ${formatHoursToHM(max)}</div>
        <div><strong>Total Crimes:</strong> ${data.length}</div>

      `);

    }

    function showARTChart(clusterId, selector = "#trend-chart-container") {
      const safeId = clusterId.replace(/\s+/g, "-");

      if (activeClusterId && activeClusterId !== clusterId) {
        document.querySelectorAll(".trend-chart-box").forEach(box => box.remove());
        activeClusterId = clusterId;
        document.querySelectorAll(".leaderboard-row").forEach(row => {
          row.classList.remove("active-highlight");
        });

      } else if (!activeClusterId) {
        activeClusterId = clusterId;
      }
      

      if (document.querySelector(`#trend-chart-${safeId}-bar`)) return;

      const container = d3.select(selector);
      document.querySelectorAll(".leaderboard-row").forEach(row => {
        const cluster = row.querySelector(".time")?.dataset?.cluster;
        if (cluster === clusterId) {
          row.classList.add("active-highlight");
        } else {
          row.classList.remove("active-highlight");
        }
      });

      const box = container.append("div")
        .attr("class", "trend-chart-box")
        .attr("id", `trend-chart-${safeId}-bar`)
        .style("display", "inline-block")
        .style("margin-right", "2rem");

      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
      const formatMonth = d3.timeFormat("%b %Y");
      const data = window.originalCrimeData.filter(d => d.neighborhood_cluster === clusterId);
      const grouped = {};

      data.forEach(d => {
        const start = parseTime(d.start_date);
        const report = parseTime(d.report_date);
        if (!start || !report) return;
        const diff = (report - start) / (1000 * 60 * 60);
        if (diff < 0 || diff > 720) return;
        const monthKey = formatMonth(report);
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(diff);
      });

      const averages = Object.entries(grouped).map(([month, values]) => ({
        month,
        avg: d3.mean(values)
      })).sort((a, b) => d3.ascending(new Date(a.month), new Date(b.month)));

      const width = 600;
      const height = 400;
      const margin = { top: 30, right: 30, bottom: 40, left: 60 };

      const titleRow = box.append("div")
        .attr("class", "chart-title-row");

      titleRow.append("div")
        .attr("class", "chart-title")
        .text(`Monthly Avg. Reporting Time – ${clusterNames[clusterId]}`); 

      titleRow.append("div")
        .attr("class", "chart-close")
        .html("&#x2716;") 
        .on("click", () => {
          box.remove();
         
          const stillOpen = document.querySelectorAll(`.trend-chart-box[id*="${safeId}"]`);
          if (stillOpen.length === 0) {
            activeClusterId = null;
            document.querySelectorAll(".leaderboard-row").forEach(row => {
              row.classList.remove("active-highlight");
            });
          }
        });


      const svg = box.append("svg")
        .attr("width", "100%") 
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`) 
        .attr("preserveAspectRatio", "xMidYMid meet"); 




      const x = d3.scaleBand()
        .domain(averages.map(d => d.month))
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(averages, d => d.avg) * 1.1])
        .range([height - margin.bottom, margin.top]);

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

      const bars = svg.selectAll("rect")
        .data(averages)
        .enter()
        .append("rect")
        .attr("x", d => x(d.month))
        .attr("y", y(0))
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "#ff4444");

      bars.on("mouseover", function(event, d) {
          d3.select(this)
            .attr("fill", "#ff7777");

          svg.append("text")
            .attr("class", "bar-label")
            .attr("x", x(d.month) + x.bandwidth() / 2)
            .attr("y", y(d.avg) - 8)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "12px")
            .text(`${d.avg.toFixed(1)}h`);
        })
        .on("mouseout", function(event, d) {
          d3.select(this)
            .attr("fill", "#ff4444");

          svg.selectAll(".bar-label").remove();
        });

      // Transition
      bars.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr("y", d => y(d.avg))
        .attr("height", d => y(0) - y(d.avg));


    }


    function showRecentTrendLine(clusterId, selector = "#trend-chart-container") {
      console.log("showRecentTrendLine called for", clusterId);

      const safeId = clusterId.replace(/\s+/g, "-");

      if (activeClusterId && activeClusterId !== clusterId) {
        document.querySelectorAll(".trend-chart-box").forEach(box => box.remove());
        activeClusterId = clusterId;
        document.querySelectorAll(".leaderboard-row").forEach(row => {
          row.classList.remove("active-highlight");
        });

      }
      

      if (document.querySelector(`#trend-chart-${safeId}-line`)) return;

      const container = d3.select(selector);
      document.querySelectorAll(".leaderboard-row").forEach(row => {
        const cluster = row.querySelector(".time")?.dataset?.cluster;
        if (cluster === clusterId) {
          row.classList.add("active-highlight");
        } else {
          row.classList.remove("active-highlight");
        }
      });


      const box = container.append("div")
        .attr("class", "trend-chart-box")
        .attr("id", `trend-chart-${safeId}-line`)
        .style("display", "inline-block");   

      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
      const formatMonthKey = d3.timeFormat("%Y-%m");
      const formatLabel = d3.timeFormat("%b");

      const data = window.originalCrimeData.filter(d => d.neighborhood_cluster === clusterId);
      const monthly = {};

      data.forEach(d => {
        const start = parseTime(d.start_date);
        const report = parseTime(d.report_date);
        if (!start || !report) return;
        const diff = (report - start) / (1000 * 60 * 60);
        if (diff < 0 || diff > 720) return;
        const key = formatMonthKey(report);
        if (!monthly[key]) monthly[key] = [];
        monthly[key].push(diff);
      });

      const averages = Object.entries(monthly).map(([month, values]) => ({
        month,
        avg: d3.mean(values)
      })).sort((a, b) => a.month.localeCompare(b.month));

      const last5 = averages.slice(-5);
      const monthLabels = last5.map(d => formatLabel(new Date(d.month + "-01")));

      const width = 700;
      const height = 400;
      const margin = { top: 30, right: 30, bottom: 40, left: 60 };

      const titleRow = box.append("div")
        .attr("class", "chart-title-row");

      titleRow.append("div")
        .attr("class", "chart-title")
        .text(`ART trend (last 5 months) – ${clusterNames[clusterId]}`); 

      titleRow.append("div")
        .attr("class", "chart-close")
        .html("&#x2716;") 
        .on("click", () => {
          box.remove();
          const stillOpen = document.querySelectorAll(`.trend-chart-box[id*="${safeId}"]`);
          if (stillOpen.length === 0) {
            activeClusterId = null;
            document.querySelectorAll(".leaderboard-row").forEach(row => {
              row.classList.remove("active-highlight");
            });
          }
        });




      const svg = box.append("svg")
        .attr("width", "100%") 
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`) 
        .attr("preserveAspectRatio", "xMidYMid meet"); 


      const x = d3.scalePoint()
        .domain(monthLabels)
        .range([margin.left, width - margin.right]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(last5, d => d.avg) * 1.1])
        .range([height - margin.bottom, margin.top]);

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

  

      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

      const line = d3.line()
        .x((d, i) => x(monthLabels[i]))
        .y(d => y(d.avg));


      const path = svg.append("path")
        .datum(last5)
        .attr("fill", "none")
        .attr("stroke", "#00BFFF")
        .attr("stroke-width", 2)
        .attr("d", line);

      // === Animation
      const totalLength = path.node().getTotalLength();

      path
        .attr("stroke-dasharray", totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);



      svg.selectAll("circle")
        .data(last5)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => x(monthLabels[i]))
        .attr("cy", d => y(d.avg))
        .attr("r", 4)
        .attr("fill", "#00BFFF")

        .on("mouseover", function(event, d, i) {
          d3.select(this).transition().attr("r", 6);

          svg.append("text")
            .attr("class", "line-tooltip")
            .attr("x", d3.select(this).attr("cx"))
            .attr("y", d3.select(this).attr("cy") - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .attr("font-size", "12px")
            .text(`${d.avg.toFixed(1)}h`);
        })
        .on("mouseout", function() {
          d3.select(this).transition().attr("r", 4);
          svg.selectAll(".line-tooltip").remove();
        });
     
    }

  });
});
