const BACKEND_URL = "http://localhost:5000";

function updateDisplay(container, content, isError = false) {
  if (!container) {
    console.error("Container element not found");
    return;
  }

  container.innerHTML = isError
    ? `<div class="text-red-500 p-2">${content}</div>`
    : content;
}

async function updateWeatherDisplay(position) {
  const cityAqiContainer = document.getElementById("city-aqi-container");
  const analysisContainer = document.getElementById("llm-analysis-container");

  if (!cityAqiContainer || !analysisContainer) {
    console.error("Required DOM elements not found");
    return;
  }

  try {
    // Get weather and LLM analysis from Python backend
    const response = await fetch(`${BACKEND_URL}/api/weather`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch weather data");
    }

    const data = await response.json();

    // Update AQI display
    updateDisplay(
      cityAqiContainer,
      `
      <div class="flex items-center justify-between p-2">
        <div class="text-sm text-secondary dark:text-secondary-dark">${data.location}</div>
        <div class="flex items-center gap-2">
          <div style="font-size: 24px; font-weight: bold; color: ${data.color};">${data.aqi}</div>
          <div style="color: ${data.color}; font-size: 14px;">${data.status}</div>
        </div>
      </div>
    `
    );

    // Update LLM analysis display
    updateDisplay(
      analysisContainer,
      `
      <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 class="text-lg font-semibold mb-2">AI Analysis</h3>
        <p class="text-sm">${data.analysis}</p>
      </div>
    `
    );
  } catch (error) {
    console.error("Error updating display:", error);
    updateDisplay(cityAqiContainer, "Unable to load weather data", true);
    updateDisplay(analysisContainer, `Error: ${error.message}`, true);
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      updateWeatherDisplay,
      (error) => {
        console.error("Geolocation error:", error);
        const container = document.getElementById("city-aqi-container");
        if (container) {
          updateDisplay(
            container,
            "Error: Unable to get your location. Please enable location services.",
            true
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    const container = document.getElementById("city-aqi-container");
    if (container) {
      updateDisplay(
        container,
        "Geolocation is not supported in your browser",
        true
      );
    }
  }
});
