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

// === LOAD AND PROCESS CSV DATA ===
d3.csv("../data/crime_clean.csv").then(data => {
  window.originalCrimeData = data; // Store raw data globally to reuse for filtering
  buildLeaderboard(data); // Initial leaderboard render using full dataset

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
    Object.entries(monthlyDelays).forEach(([cluster, monthData]) => {
      const form = last5Months.map(month => {
        const hours = monthData[month];
        if (!hours || hours.length === 0) return "🟩"; 
        const avg = d3.mean(hours);
        if (avg < 20) return "🟩";
        if (avg < 30) return "🟨";
        return "🟥";
      });
      formDict[cluster] = form.join("");
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

    function getTrendFromRanking(cluster, ranks, lastTwoMonths) {
      const [prevMonth, currMonth] = lastTwoMonths;
      const prevRank = ranks[prevMonth]?.[cluster];
      const currRank = ranks[currMonth]?.[cluster];

      if (!prevRank || !currRank) return "➖";

      if (currRank < prevRank) return "🔼";
      if (currRank > prevRank) return "🔽";
      return "➖";
    }

    
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
    const top10 = averages.slice(0, 10);

    // === STEP 6: Render top 10 in HTML leaderboard ===
    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";
    let actualRank = 1;

    top10.forEach(entry => {
      const clusterName = clusterNames[entry.cluster];
      if (!clusterName) return;

      const rank = actualRank === 1 ? "🥇" : actualRank === 2 ? "🥈" : actualRank === 3 ? "🥉" : `#${actualRank}`;
      const hours = entry.avg.toFixed(2);
      const form = entry.form;
      const trend = entry.trend;
      const crimes = entry.total_crimes;

      const li = document.createElement("li");
      li.classList.add("leaderboard-row");
      li.innerHTML = `
          <div class="rank">${rank}</div>
          <div class="neighborhood">${clusterName}</div>
          <div class="time">${hours}h</div>
          <div class="form">${form} <span class="neutral">◽</span></div>
          <div class="trend">${trend}</div>
          <div class="crimes">📝 ${crimes}</div>
      `;
      leaderboard.appendChild(li);
      actualRank++;
    });
  }

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

});