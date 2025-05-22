// community lens.js
d3.csv("../data/crime_clean.csv").then(data => {
  data.forEach(d => {
    const rawDate = d.start_date?.slice(0, 7);
    d.month = rawDate && /^\d{4}-\d{2}$/.test(rawDate) ? rawDate : null;
  });

  const ancList = Array.from(new Set(data.map(d => d.anc).filter(Boolean))).sort();

  // Bar + Grid
  const ancSelect1 = d3.select("#anc-select-1");
  const ancSelect2 = d3.select("#anc-select-2");

  ancList.forEach(anc => {
    ancSelect1.append("option").attr("value", anc).text(anc);
    ancSelect2.append("option").attr("value", anc).text(anc);
  });

  ancSelect1.property("value", ancList[0]);
  ancSelect2.property("value", ancList[1] || ancList[0]);

  //  update functions
  function updateBarAndGrid() {
    const ancA = ancSelect1.property("value");
    const ancB = ancSelect2.property("value");

    updateChart(data, ancA, "#bar-chart-a");
    updateChart(data, ancB, "#bar-chart-b");

    drawSeverityGrid(data, ancA, "#severity-grid-a");
    drawSeverityGrid(data, ancB, "#severity-grid-b");

    d3.select("#label-bar-a").text(ancA);
    d3.select("#label-bar-b").text(ancB);
    d3.select("#label-grid-a").text(ancA);
    d3.select("#label-grid-b").text(ancB);
  }

  function updateLineAndMethod() {
    const ancA = timeSelect1.property("value");
    const ancB = timeSelect2.property("value");

    drawCombinedLineChart(data, ancA, ancB, "#line-chart-combined");


    drawMethodChart(data, ancA, "method-chart-a");
    drawMethodChart(data, ancB, "method-chart-b");

    d3.select("#label-line-a").text(ancA);
    d3.select("#label-line-b").text(ancB);
    d3.select("#label-method-a").text(ancA);
    d3.select("#label-method-b").text(ancB);
  }

  function updateAllCharts() {
    const ancA = ancSelect1.property("value");
    const ancB = ancSelect2.property("value");

    
    updateCombinedBarChart(data, ancA, ancB, "#bar-chart-combined");


    drawSeverityGrid(data, ancA, "#severity-grid-a");
    drawSeverityGrid(data, ancB, "#severity-grid-b");

    drawCombinedLineChart(data, ancA, ancB, "#line-chart-combined");


    drawMethodChart(data, ancA, "method-chart-a");
    drawMethodChart(data, ancB, "method-chart-b");

    d3.select("#label-bar-a").text(ancA);
    d3.select("#label-bar-b").text(ancB);
    d3.select("#label-grid-a").text(ancA);
    d3.select("#label-grid-b").text(ancB);
    d3.select("#label-line-a").text(ancA);
    d3.select("#label-line-b").text(ancB);
    d3.select("#label-method-a").text(ancA);
    d3.select("#label-method-b").text(ancB);
  }

  ancSelect1.on("change", updateAllCharts);
  ancSelect2.on("change", updateAllCharts);

  // init  
  updateAllCharts();
});


// bar
function updateCombinedBarChart(data, ancA, ancB, svgId) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  const filteredA = data.filter(d => d.anc === ancA);
  const filteredB = data.filter(d => d.anc === ancB);

  function countOffenses(filtered) {
    return d3.rollup(
      filtered,
      v => v.length,
      d => d.offensekey?.split("|")[1]?.trim() || "Unknown"
    );
  }

  const countsA = countOffenses(filteredA);
  const countsB = countOffenses(filteredB);

  const offenses = Array.from(new Set([...countsA.keys(), ...countsB.keys()]));
  const topOffenses = offenses
    .map(offense => ({
      offense,
      countA: countsA.get(offense) || 0,
      countB: countsB.get(offense) || 0
    }))
    .sort((a, b) => (b.countA + b.countB) - (a.countA + a.countB))
    .slice(0, 8);

  const margin = { top: 60, right: 20, bottom: 125, left: 40 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(topOffenses.map(d => d.offense))
    .range([0, width])
    .paddingInner(0.2);

  const x1 = d3.scaleBand()
    .domain(["A", "B"])
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topOffenses, d => Math.max(d.countA, d.countB))])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(["A", "B"])
    .range(["#ff4444", "#44c2ff"]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .style("fill", "#ccc");

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "#ccc");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "bar-tooltip")
    .style("position", "absolute")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

  // Bars
  g.selectAll("g.bar-group")
    .data(topOffenses)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${x0(d.offense)}, 0)`)
    .selectAll("rect")
    .data(d => [
      { key: "A", value: d.countA },
      { key: "B", value: d.countB }
    ])
    .enter()
    .append("rect")
    .attr("x", d => x1(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.value))
    .attr("fill", d => color(d.key))
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", d3.color(color(d.key)).brighter(1));
      tooltip.transition().duration(150).style("opacity", 0.9);
      tooltip.html(`<strong>ANC ${d.key}</strong><br/>${d.value} incidents`)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("fill", color(d.key));
      tooltip.transition().duration(150).style("opacity", 0);
    });

  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 120}, 10)`);

  legend.selectAll("rect")
    .data(["A", "B"])
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(["A", "B"])
    .enter()
    .append("text")
    .attr("x", 18)
    .attr("y", (d, i) => i * 20 + 10)
    .style("fill", "#ccc")
    .text(d => `ANC ${d === "A" ? ancA : ancB}`);
}



// heatmap 
function drawSeverityGrid(data, selectedANC, svgId) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  const filtered = selectedANC === "all"
    ? data
    : data.filter(d => d.anc === selectedANC);

  const ucrRanks = ["1", "2", "3", "4", "5"];
  const severityByTract = d3.rollups(
    filtered,
    v => d3.rollup(v, group => group.length, d => d.ucr_rank),
    d => String(d.census_tract)
  );

  const topTracts = severityByTract
    .sort((a, b) => d3.sum(b[1].values()) - d3.sum(a[1].values()))
    .slice(0, 10);

  const margin = { top: 30, right: 20, bottom: 85, left: 80 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  svg.append("text")
    .attr("transform", `translate(20, ${margin.top + height / 2}) rotate(-90)`)
    .attr("class", "axis-label")
    .style("text-anchor", "middle")
    .text("Census Tract");

  svg.append("text")
    .attr("transform", `translate(${margin.left + width / 2}, ${margin.top + height + 50})`)
    .attr("class", "axis-label")
    .style("text-anchor", "middle")
    .text("UCR Rank (Severity)");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(topTracts.map(d => d[0]))
    .range([0, height])
    .padding(0.1);

  const x = d3.scaleBand()
    .domain(ucrRanks)
    .range([0, width])
    .padding(0.1);

  const maxVal = d3.max(topTracts, d => d3.max(ucrRanks, r => d[1].get(r) || 0));
  const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, maxVal]);

  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")
    .style("fill", "#ccc");

  g.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "#ccc");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "heatmap-tooltip")
    .style("position", "absolute")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

  topTracts.forEach(row => {
    const tract = row[0];
    const counts = row[1];

    ucrRanks.forEach(rank => {
      const value = counts.get(rank) || 0;
      const fill = colorScale(value);

      const rect = g.append("rect")
        .attr("x", x(rank))
        .attr("y", y(tract))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", fill)
        .on("mouseover", function (event) {
          d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
          tooltip.transition().duration(150).style("opacity", 0.9);
          tooltip.html(
            `<strong>Tract:</strong> ${tract}<br/>
             <strong>UCR Rank:</strong> ${rank}<br/>
             <strong>Crimes:</strong> ${value}`
          )
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("stroke", null);
          tooltip.transition().duration(150).style("opacity", 0);
        });

      if (value > 0) {
        g.append("text")
          .attr("x", x(rank) + x.bandwidth() / 2)
          .attr("y", y(tract) + y.bandwidth() / 2 + 4)
          .attr("text-anchor", "middle")
          .style("fill", getTextColor(fill))
          .style("font-size", "11px")
          .text(value);
      }
    });
  });
}


// Helpers
function getTextColor(bgColor) {
  try {
    const c = d3.color(bgColor);
    if (!c || typeof c.luminance !== "function") return "#000";
    return c.luminance() < 0.5 ? "#fff" : "#000";
  } catch {
    return "#000";
  }
}



d3.csv("../data/crime_clean.csv").then(data => {
  const parseDate = d3.timeParse("%Y-%m");
  data.forEach(d => {
    d.month = d.start_date.slice(0, 7); 
  });

  const ancA = "2D";
  const ancB = "6C";
  drawCombinedLineChart(data, ancA, ancB, "#line-chart-combined");

  drawMethodChart(data, ancA, "method-chart-a");
  drawMethodChart(data, ancB, "method-chart-b");
});

function drawCombinedLineChart(data, ancA, ancB, svgId) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  const parseMonth = d3.timeParse("%Y-%m");
  const minDate = new Date(2022, 11);

  function prepSeries(anc) {
    return Array.from(
      d3.rollup(
        data.filter(d => d.anc === anc),
        v => v.length,
        d => d.month
      ),
      ([month, count]) => {
        const parsed = parseMonth(month);
        return parsed && parsed >= minDate ? { month: parsed, count } : null;
      }
    ).filter(d => d !== null).sort((a, b) => a.month - b.month);
  }

  const seriesA = prepSeries(ancA);
  const seriesB = prepSeries(ancB);
  const allDates = [...seriesA, ...seriesB].map(d => d.month);

  const margin = { top: 40, right: 30, bottom: 60, left: 60 },
        width = svg.node().getBoundingClientRect().width - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain([d3.min(allDates), d3.max(allDates)])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max([...seriesA, ...seriesB], d => d.count)]).nice()
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.month))
    .y(d => y(d.count));

  const color = d3.scaleOrdinal()
    .domain(["A", "B"])
    .range(["#ff4444", "#44c2ff"]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
    .selectAll("text")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end")
    .style("fill", "#ccc");

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "#ccc");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "line-tooltip")
    .style("position", "absolute")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

  function drawDotsAndPath(series, key) {
    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", color(key))
      .attr("stroke-width", 2.5)
      .attr("d", line);

    g.selectAll(`.dot-${key}`)
      .data(series)
      .enter()
      .append("circle")
      .attr("class", `dot-${key}`)
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.count))
      .attr("r", 4)
      .attr("fill", color(key))
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 6).attr("fill", d3.color(color(key)).brighter(1));
        tooltip.transition().duration(150).style("opacity", 0.9);
        tooltip.html(`<strong>ANC ${key}</strong><br/>${d3.timeFormat("%B %Y")(d.month)}<br/>${d.count} incidents`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 4).attr("fill", color(key));
        tooltip.transition().duration(150).style("opacity", 0);
      });
  }

  drawDotsAndPath(seriesA, "A");
  drawDotsAndPath(seriesB, "B");

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 150}, 10)`);

  ["A", "B"].forEach((key, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(key));

    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 20 + 10)
      .text(`ANC ${key === "A" ? ancA : ancB}`)
      .style("fill", "#ccc");
  });
}

function drawMethodChart(data, anc, elementId) {
  const svg = d3.select(`#${elementId}`);
  svg.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 90, left: 60 },
    width = svg.node().getBoundingClientRect().width - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = data.filter(d => d.anc === anc);

  const offenseMethodCounts = d3.rollups(
    filtered,
    v => v.length,
    d => d.offensekey.split("|")[1],
    d => d.method
  ).map(([offense, methodArray]) => [offense, new Map(methodArray)]);

  const offenses = offenseMethodCounts.map(d => d[0]);
  const methods = Array.from(new Set(filtered.map(d => d.method))).filter(Boolean);

  const x = d3.scaleBand().domain(offenses).range([0, width]).padding(0.2);
  const y = d3.scaleLinear()
    .domain([0, d3.max(offenseMethodCounts, d => d3.sum(methods.map(m => d[1].get(m) || 0)))])
    .range([height, 0]);

  const color = d3.scaleOrdinal().domain(methods).range(d3.schemeSet2);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .style("fill", "#ccc");

  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "#ccc");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "method-tooltip")
    .style("position", "absolute")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "6px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "13px")
    .style("opacity", 0);

  let offset = {};
  offenses.forEach(o => offset[o] = 0);

  methods.forEach(method => {
    g.selectAll(`.bar-${method}`)
      .data(offenseMethodCounts)
      .enter()
      .append("rect")
      .attr("class", `bar-${method}`)
      .attr("x", d => x(d[0]))
      .attr("y", d => {
        const val = d[1].get(method) || 0;
        const yPos = y(offset[d[0]] + val);
        offset[d[0]] += val;
        return yPos;
      })
      .attr("height", d => {
        const val = d[1].get(method) || 0;
        return height - y(val);
      })
      .attr("width", x.bandwidth())
      .attr("fill", color(method))
      .on("mouseover", function (event, d) {
        const val = d[1].get(method) || 0;
        if (val === 0) return;

        d3.select(this).attr("fill", d3.color(color(method)).darker(1));

        tooltip.transition().duration(150).style("opacity", 0.9);
        tooltip.html(`<strong>${d[0]}</strong><br/>Method: ${method}<br/>${val} incidents`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", color(method));
        tooltip.transition().duration(150).style("opacity", 0);
      });
  });

  // draw legend
  if (elementId === "method-chart-a") {
    const legendContainer = d3.select("#method-legend");
    legendContainer.selectAll("*").remove();

    methods.forEach(method => {
      const item = legendContainer.append("div").attr("class", "method-legend-item");
      item.append("div")
        .attr("class", "method-legend-color")
        .style("background-color", color(method));
      item.append("span").text(method || "Unknown");
    });
  }
}

