// home.js - for dashboard homepage

let map = L.map('danger-map').setView([38.91, -77.02], 12);


// OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

d3.json("../data/DC_Ward.geojson").then(geoData => {
    const topWards = [5, 1, 6]; // Top 3 wards as numbers

    L.geoJSON(geoData, {
        filter: d => {
            const name = d.properties.NAME || "";
            const wardMatch = name.match(/Ward\s(\d+)/);
            if (!wardMatch) return false;
            const wardNum = +wardMatch[1];
            return topWards.includes(wardNum);
        },
        style: d => {
            const name = d.properties.NAME || "";
            const wardMatch = name.match(/Ward\s(\d+)/);
            const wardNum = wardMatch ? +wardMatch[1] : null;
            const rank = topWards.indexOf(wardNum);
            return {
                color: rank === 0 ? "red" : (rank === 1 ? "orange" : "yellow"),
                fillOpacity: 0.3,
                weight: 2
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.NAME || "";
            const wardMatch = name.match(/Ward\s(\d+)/);
            const wardNum = wardMatch ? +wardMatch[1] : null;
            const rank = topWards.indexOf(wardNum);
            const labels = ["Most Dangerous", "2nd Most Dangerous", "3rd Most Dangerous"];
            if (rank >= 0) {
                layer.bindPopup(`<b>Ward ${wardNum}</b><br>${labels[rank]}`);
            }
        }
    }).addTo(map);
});

// Create custom legend
const legend = L.control({ position: "bottomright" });

legend.onAdd = function(map) {
  const div = L.DomUtil.create("div", "info-legend");
  div.innerHTML += "<strong>Danger Level</strong><br>";
  div.innerHTML += '<i style="background: red; width: 12px; height: 12px; display: inline-block; margin-right: 6px; border-radius: 2px;"></i> Most Dangerous<br>';
  div.innerHTML += '<i style="background: orange; width: 12px; height: 12px; display: inline-block; margin-right: 6px; border-radius: 2px;"></i> 2nd Most Dangerous<br>';
  div.innerHTML += '<i style="background: yellow; width: 12px; height: 12px; display: inline-block; margin-right: 6px; border-radius: 2px;"></i> 3rd Most Dangerous<br>';
  return div;
};

legend.addTo(map);



// Bar Chart
let ctx = document.getElementById('district-chart').getContext('2d');

d3.csv("../data/crime_clean.csv").then(data => {
    const districtCounts = {};

    data.forEach(d => {
        if (!districtCounts[d.district]) {
            districtCounts[d.district] = 0;
        }
        districtCounts[d.district]++;
    });

    const sortedDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = sortedDistricts.map(d => `District ${d[0]}`);
    const counts = sortedDistricts.map(d => d[1]);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: "Crimes",
                data: counts,
                backgroundColor: "#ff4444",
                borderRadius: 5,
                barPercentage: 0.5,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#eee', font: { size: 14 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#eee', font: { size: 14 } },
                    grid: { display: false }
                }
            }
        }
    });

    // Cards at bottom
    const totalCrimes = d3.sum(data, d => 1);
    document.getElementById("total-crimes").textContent = totalCrimes.toLocaleString();

    const wardCounts = {};
    const offenseCounts = {};

    data.forEach(d => {
        if (!wardCounts[d.ward]) wardCounts[d.ward] = 0;
        wardCounts[d.ward]++;
        if (!offenseCounts[d.offense_group]) offenseCounts[d.offense_group] = 0;
        offenseCounts[d.offense_group]++;
    });

    const mostDangerousWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0][0];
    const topOffense = Object.entries(offenseCounts).sort((a, b) => b[1] - a[1])[0][0];

    document.getElementById("top-ward").textContent = `Ward ${mostDangerousWard}`;
    document.getElementById("top-offense").textContent = topOffense;
});
