// plan-visit.js - FINAL updated version

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

  if (insideDC) {
    // Nearest recent crime (2km)
    let nearbyCrimes = crimeData.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const dist = haversine(place.latitude, place.longitude, +d.latitude, +d.longitude);
      return dist < 2.0;
    });

    if (ward) {
      nearbyCrimes = nearbyCrimes.filter(d => d.ward === ward);
    }

    nearbyCrimes.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
    const closestRecentCrime = nearbyCrimes[0];

    if (closestRecentCrime) {
      cautionHtml += `
        <h4 class="warning-text">⚠️ Nearest Recent Crime (red dot on map):</h4>
        <p><strong>${closestRecentCrime.offense}</strong>${closestRecentCrime.block_site_address ? ` at ${closestRecentCrime.block_site_address}` : ''} (${new Date(closestRecentCrime.report_date).toLocaleDateString()})</p>
      `;

      crimeMarker = {
        lat: +closestRecentCrime.latitude,
        lng: +closestRecentCrime.longitude,
      };
    } else {
      cautionHtml += `
        <h4 class="safe-text">✅ No recent incidents nearby</h4>
        <p style="font-size: 14px;">Stay alert and enjoy your visit safely!</p>
      `;
    }

    // Most common crime (3km)
    let crimes3km = crimeData.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const dist = haversine(place.latitude, place.longitude, +d.latitude, +d.longitude);
      return dist < 3.0;
    });

    if (ward) {
      crimes3km = crimes3km.filter(d => d.ward === ward);
    }

    const offenseCounts = {};
    crimes3km.forEach(d => {
      const offense = d.offense_group || d.offense || "Other";
      if (!offenseCounts[offense]) {
        offenseCounts[offense] = 0;
      }
      offenseCounts[offense]++;
    });

    const sortedOffenses = Object.entries(offenseCounts).sort((a, b) => b[1] - a[1]);

    if (sortedOffenses.length > 0) {
      const topOffenseGroup = sortedOffenses[0][0];
      const topGroupCount = sortedOffenses[0][1];

      // Find most common offense_text (inside the same 3km)
      const offenseTypeCounts = {};
      crimes3km.forEach(d => {
        if (d.offense_group === topOffenseGroup) {
          const offenseText = d.offense_text || d.offense || "Other";
          if (!offenseTypeCounts[offenseText]) {
            offenseTypeCounts[offenseText] = 0;
          }
          offenseTypeCounts[offenseText]++;
        }
      });

      const sortedTypes = Object.entries(offenseTypeCounts).sort((a, b) => b[1] - a[1]);
      const topType = sortedTypes.length > 0 ? sortedTypes[0][0] : "";

      mostCommonCrimeText = `
        <h4 class="warning-text">🔎 Most Common Crime Nearby:</h4>
        <p><strong>${topOffenseGroup}</strong> — ${topGroupCount} cases within 3km (mostly <strong>${topType}</strong>)</p>
      `;
    }


  } else {
    cautionHtml = `
      <h4 style="color: orange; margin-top: 15px;">⚠️ This location is outside DC crime coverage.</h4>
      <p style="font-size: 14px;">Stay alert and contact local authorities if needed.</p>
    `;
  }

  text.innerHTML = `
    <h3>${place.name}</h3>
    <p><strong>Address:</strong> ${place.address}</p>
    <p><strong>Category:</strong> ${place.category}</p>
    ${ward ? `<p><strong>Police District for Ward ${ward}:</strong> Call 911 or nearest station</p>` : ""}
    ${cautionHtml}
    ${mostCommonCrimeText}
  `;

  const mapDiv = document.createElement("div");
  mapDiv.className = "result-map";
  mapDiv.setAttribute("data-aos", "zoom-in");

  block.appendChild(text);
  block.appendChild(mapDiv);

  const miniMap = L.map(mapDiv, {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    attributionControl: false,
    doubleClickZoom: false,
    keyboard: false,
    tap: false,
  });
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(miniMap);

  L.marker([place.latitude, place.longitude]).addTo(miniMap);

  if (crimeMarker) {
    const redIcon = L.icon({
      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    L.marker([crimeMarker.lat, crimeMarker.lng], { icon: redIcon }).addTo(miniMap);

    const distance = haversine(place.latitude, place.longitude, crimeMarker.lat, crimeMarker.lng);

    const midLat = (place.latitude + crimeMarker.lat) / 2;
    const midLng = (place.longitude + crimeMarker.lng) / 2;

    if (distance < 0.3) {
      miniMap.setView([place.latitude, place.longitude], 16);
    } else if (distance < 1) {
      miniMap.setView([midLat, midLng], 14);
    } else {
      miniMap.setView([midLat, midLng], 13);
    }
  } else {
    miniMap.setView([place.latitude, place.longitude], 15);
  }

  setTimeout(() => {
    miniMap.invalidateSize();
  }, 300);

  return block;
}




function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
