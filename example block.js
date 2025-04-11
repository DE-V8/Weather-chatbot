// AQI Data Fetcher and Display
const AQI_TOKEN = "9c19f75ef061cb97e6ec372bb66b3abec7757db5";

function getAQIColor(aqi) {
  if (aqi <= 50) return "#009966"; // Good
  if (aqi <= 100) return "#ffde33"; // Moderate
  if (aqi <= 150) return "#ff9933"; // Unhealthy for Sensitive Groups
  if (aqi <= 200) return "#cc0033"; // Unhealthy
  if (aqi <= 300) return "#660099"; // Very Unhealthy
  return "#7e0023"; // Hazardous
}

function getAQIStatus(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function updateLocations(location) {
  // Update Current Location display
  const currentLocationElement = document.getElementById("current-location");
  if (currentLocationElement) {
    currentLocationElement.textContent = location;
  }
}

function updateAQIDisplay(data, locationName) {
  const container = document.getElementById("city-aqi-container");
  if (!container) return;

  const aqi = data.aqi;
  const status = getAQIStatus(aqi);
  const color = getAQIColor(aqi);

  container.innerHTML = `
    <div class="flex items-center justify-between p-2">
      <div class="text-sm text-secondary dark:text-secondary-dark">${locationName}</div>
      <div class="flex items-center gap-2">
        <div style="font-size: 24px; font-weight: bold; color: ${color};">${aqi}</div>
        <div style="color: ${color}; font-size: 14px;">${status}</div>
      </div>
    </div>
  `;
}

function handleLocationError(error) {
  console.error("Geolocation error:", error);
  const errorMessage =
    {
      1: "Please allow location access to get accurate AQI data.",
      2: "Location unavailable. Please try again.",
      3: "Location request timed out. Please try again.",
    }[error.code] || "Unable to get location.";

  document.getElementById(
    "city-aqi-container"
  ).innerHTML = `<div class="text-center p-2 text-red-500 text-sm">${errorMessage}</div>`;

  document.getElementById("current-location").textContent =
    "Location access needed";
}

async function fetchAQIData(position) {
  try {
    // First get the location name
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
    );
    const geoData = await response.json();

    // Get the most specific location name available
    const locationName =
      geoData.city || geoData.locality || geoData.principalSubdivision;

    // Update both displays with the same location name
    updateLocations(locationName);

    // Then get the AQI data
    const aqiResponse = await fetch(
      `https://api.waqi.info/feed/geo:${position.coords.latitude};${position.coords.longitude}/?token=${AQI_TOKEN}`
    );
    const aqiData = await aqiResponse.json();

    if (aqiData.status === "ok") {
      // Pass the same location name to AQI display
      updateAQIDisplay(aqiData.data, locationName);
    } else {
      throw new Error("Failed to fetch AQI data");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("city-aqi-container").innerHTML =
      '<div class="text-center p-2 text-red-500 text-sm">Unable to load AQI data</div>';
  }
}

function getCurrentPosition() {
  if ("geolocation" in navigator) {
    // Show loading state
    document.getElementById("city-aqi-container").innerHTML =
      '<div class="text-center p-2 text-secondary dark:text-secondary-dark">Getting location...</div>';
    document.getElementById("current-location").textContent =
      "Detecting location...";

    navigator.geolocation.getCurrentPosition(
      // Success callback
      fetchAQIData,
      // Error callback
      handleLocationError,
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    document.getElementById("city-aqi-container").innerHTML =
      '<div class="text-center p-2 text-red-500 text-sm">Geolocation is not supported</div>';
    document.getElementById("current-location").textContent =
      "Location not available";
  }
}

// Initialize AQI display when page loads
window.onload = function () {
  getCurrentPosition();

  // Add a refresh button event listener if you have one
  const refreshButton = document.getElementById("refresh-location");
  if (refreshButton) {
    refreshButton.addEventListener("click", getCurrentPosition);
  }
};
