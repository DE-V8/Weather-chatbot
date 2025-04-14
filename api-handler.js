import config from "./config.js";

class AQIHandler {
  constructor() {
    this.API_KEY = config.AQI_API_KEY;
    this.container = document.getElementById("city-aqi-container");
    this.updateInterval = 10 * 60 * 1000; // 10 minutes
    this.retryDelay = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  async initialize() {
    try {
      // Try to load cached data first
      this.loadCachedData();
      // Then fetch fresh data
      await this.updateAQIData();
      // Set up periodic updates
      setInterval(() => this.updateAQIData(), this.updateInterval);
    } catch (error) {
      console.error("Failed to initialize AQI handler:", error);
      this.showError("Unable to initialize AQI monitoring");
    }
  }

  loadCachedData() {
    const cached = localStorage.getItem("aqi_data");
    if (cached) {
      const data = JSON.parse(cached);
      const cacheAge = Date.now() - data.timestamp;
      if (cacheAge < this.updateInterval) {
        this.displayAQI(data);
      }
    }
  }

  async updateAQIData(retryCount = 0) {
    try {
      this.showLoading();
      const position = await this.getCurrentPosition();
      const data = await this.fetchAQIData(
        position.coords.latitude,
        position.coords.longitude
      );

      if (data && data.status === "ok") {
        const aqiData = {
          aqi: data.data.aqi,
          timestamp: Date.now(),
          location: data.data.city.name,
          pollutants: data.data.iaqi,
        };

        localStorage.setItem("aqi_data", JSON.stringify(aqiData));
        this.displayAQI(aqiData);
      } else {
        throw new Error("Invalid AQI data received");
      }
    } catch (error) {
      console.error("Error updating AQI:", error);
      if (retryCount < this.maxRetries) {
        setTimeout(() => this.updateAQIData(retryCount + 1), this.retryDelay);
      } else {
        this.showError("Unable to fetch AQI data");
      }
    }
  }

  async fetchAQIData(lat, lon) {
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${this.API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`AQI API error: ${response.status}`);
    }

    return await response.json();
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    });
  }

  getAQIColor(aqi) {
    if (aqi <= 50) return "#009966"; // Good
    if (aqi <= 100) return "#ffde33"; // Moderate
    if (aqi <= 150) return "#ff9933"; // Unhealthy for Sensitive Groups
    if (aqi <= 200) return "#cc0033"; // Unhealthy
    if (aqi <= 300) return "#660099"; // Very Unhealthy
    return "#7e0023"; // Hazardous
  }

  getAQIStatus(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  displayAQI(data) {
    if (!this.container) return;

    const color = this.getAQIColor(data.aqi);
    const status = this.getAQIStatus(data.aqi);

    this.container.innerHTML = `
            <div class="relative p-4">
                <div class="flex items-center justify-between mb-4">
                    <div class="text-4xl font-bold" style="color: ${color}">${
      data.aqi
    }</div>
                    <div class="text-right">
                        <div class="text-sm font-medium" style="color: ${color}">${status}</div>
                        <div class="text-xs text-secondary dark:text-secondary-dark">
                            ${new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    ${this.renderPollutants(data.pollutants)}
                </div>

                <div class="mt-4 text-xs text-secondary dark:text-secondary-dark">
                    Location: ${data.location || "Current Location"}
                </div>

                <button onclick="window.aqiHandler.updateAQIData()" 
                        class="absolute top-2 right-2 text-accent hover:text-accent-dark transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        `;
  }

  renderPollutants(pollutants) {
    if (!pollutants) return "";

    const pollutantNames = {
      pm25: "PM2.5",
      pm10: "PM10",
      o3: "Ozone",
      no2: "NO₂",
      so2: "SO₂",
      co: "CO",
    };

    return Object.entries(pollutants)
      .filter(([key]) => pollutantNames[key])
      .map(
        ([key, value]) => `
                <div class="flex justify-between items-center text-sm">
                    <span class="text-secondary dark:text-secondary-dark">${pollutantNames[key]}</span>
                    <span class="font-medium">${value.v}</span>
                </div>
            `
      )
      .join("");
  }

  showLoading() {
    if (!this.container) return;

    this.container.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        `;
  }

  showError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
            <div class="p-4 text-center">
                <div class="text-red-500 dark:text-red-400 mb-2">${message}</div>
                <button onclick="window.aqiHandler.updateAQIData()" 
                        class="text-sm text-accent hover:text-accent-dark transition-colors">
                    Try Again
                </button>
            </div>
        `;
  }
}

// Initialize and export the AQI handler
const aqiHandler = new AQIHandler();
window.aqiHandler = aqiHandler; // Make it available globally
export default aqiHandler;
