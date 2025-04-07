// Import configuration
import config from "./config.js";
import WeatherChatbot from "./chatbot.js";

// API Keys (In production, these should be stored securely)
const WEATHER_API_KEY = config.WEATHER_API_KEY;
const AQI_API_KEY = config.AQI_API_KEY;

// AQI Level Information
const AQI_LEVELS = {
  GOOD: {
    min: 0,
    max: 50,
    label: "Good",
    description:
      "Air quality is considered satisfactory, and air pollution poses little or no risk",
  },
  MODERATE: {
    min: 51,
    max: 100,
    label: "Moderate",
    description:
      "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
  },
  UNHEALTHY_SENSITIVE: {
    min: 101,
    max: 150,
    label: "Unhealthy for Sensitive Groups",
    description:
      "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
  },
  UNHEALTHY: {
    min: 151,
    max: 200,
    label: "Unhealthy",
    description:
      "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects",
  },
  VERY_UNHEALTHY: {
    min: 201,
    max: 300,
    label: "Very Unhealthy",
    description:
      "Health warnings of emergency conditions. The entire population is more likely to be affected.",
  },
  HAZARDOUS: {
    min: 301,
    max: 500,
    label: "Hazardous",
    description:
      "Health alert: everyone may experience more serious health effects",
  },
};

// DOM Elements
const usernameElement = document.getElementById("username");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("search-btn");
const tempElement = document.getElementById("temp");
const weatherDescElement = document.getElementById("weather-desc");
const weatherIconElement = document.getElementById("weather-icon");
const humidityElement = document.getElementById("humidity");
const windElement = document.getElementById("wind");
const aqiElement = document.getElementById("aqi");
const aqiStatusElement = document.getElementById("aqi-status");
const currentTimeElement = document.getElementById("current-time");
const currentLocationElement = document.getElementById("current-location");
const locationIconElement = document.getElementById("location-icon");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// Initialize map
let map;
let waqiMapOverlay;

// Initialize chatbot
const chatbot = new WeatherChatbot();

// Store current weather and AQI data
let currentWeatherData = null;
let currentAQIData = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: new google.maps.LatLng(51.505, -0.09),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 11,
  });

  // Only create WAQI map overlay if API key is available
  if (AQI_API_KEY) {
    waqiMapOverlay = new google.maps.ImageMapType({
      getTileUrl: function (coord, zoom) {
        return (
          "https://tiles.aqicn.org/tiles/usepa-aqi/" +
          zoom +
          "/" +
          coord.x +
          "/" +
          coord.y +
          ".png?token=" +
          AQI_API_KEY
        );
      },
      name: "Air Quality",
      opacity: 0.7,
    });

    map.overlayMapTypes.insertAt(0, waqiMapOverlay);
  }

  // Add a legend for the AQI colors
  const legend = document.createElement("div");
  legend.className = "bg-white dark:bg-card-dark p-2 rounded shadow-md text-xs";
  legend.innerHTML = `
    <div class="font-medium mb-1">Air Quality Index</div>
    <div class="flex items-center mb-1"><div class="w-3 h-3 mr-1" style="background-color: #009966"></div>Good (0-50)</div>
    <div class="flex items-center mb-1"><div class="w-3 h-3 mr-1" style="background-color: #ffde33"></div>Moderate (51-100)</div>
    <div class="flex items-center mb-1"><div class="w-3 h-3 mr-1" style="background-color: #ff9933"></div>Unhealthy for Sensitive Groups (101-150)</div>
    <div class="flex items-center mb-1"><div class="w-3 h-3 mr-1" style="background-color: #cc0033"></div>Unhealthy (151-200)</div>
    <div class="flex items-center mb-1"><div class="w-3 h-3 mr-1" style="background-color: #660099"></div>Very Unhealthy (201-300)</div>
    <div class="flex items-center"><div class="w-3 h-3 mr-1" style="background-color: #7e0023"></div>Hazardous (300+)</div>
  `;

  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
}

// Update map location when user location is obtained
async function updateMapLocation(lat, lon) {
  if (map) {
    map.setCenter(new google.maps.LatLng(lat, lon));
  }
}

// Theme Toggle Functionality
function initTheme() {
  // Check for saved theme preference or use device preference
  const savedTheme = localStorage.getItem("theme");
  const htmlElement = document.documentElement;

  if (savedTheme === "dark") {
    htmlElement.classList.add("dark");
  } else if (savedTheme === "light") {
    htmlElement.classList.remove("dark");
  } else {
    // Check if user has dark mode enabled on their device
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (prefersDarkMode) {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.setItem("theme", "light");
    }
  }
}

function toggleTheme(e) {
  e.preventDefault();
  const htmlElement = document.documentElement;

  // Toggle dark class
  if (htmlElement.classList.contains("dark")) {
    htmlElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  } else {
    htmlElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }
}

// Update current time
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  currentTimeElement.textContent = timeString;
}

// Create location icon
function createLocationIcon() {
  if (!locationIconElement) return;

  locationIconElement.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
      <circle cx="12" cy="9" r="2.5"></circle>
    </svg>
  `;
}

// Get user's location
async function getUserLocation() {
  try {
    // Show loading state
    currentLocationElement.innerHTML = `
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div> Detecting location...`;

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    // Get city name from coordinates
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${WEATHER_API_KEY}`
    );
    const data = await response.json();
    const locationName = `${data[0].name}, ${data[0].country}`;

    // Animate location text
    animateText(currentLocationElement, locationName);

    createLocationIcon();

    // Update map location
    await updateMapLocation(
      position.coords.latitude,
      position.coords.longitude
    );

    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    currentLocationElement.textContent = "Location unavailable";
    return null;
  }
}

// Fetch weather data
async function getWeatherData(lat, lon) {
  try {
    // Show loading state
    tempElement.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    weatherDescElement.textContent = "Fetching weather...";

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
    );
    const data = await response.json();
    currentWeatherData = data; // Store the weather data
    return data;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

// Fetch AQI data
async function getAQIData(lat, lon) {
  try {
    // Show loading state
    aqiElement.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;

    if (!AQI_API_KEY) {
      // Return mock data if API key is not available
      return {
        status: "ok",
        data: {
          aqi: 50,
          iaqi: {
            pm25: { v: 25 },
            pm10: { v: 30 },
            no2: { v: 15 },
            so2: { v: 5 },
            co: { v: 0.8 },
            o3: { v: 45 },
          },
          city: {
            name: "Your City",
            url: "https://aqicn.org/city/your-city",
            geo: ["0", "0"],
          },
          dominentpol: "pm25",
          time: {
            s: new Date().toISOString(),
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      };
    }

    // First get the nearest station
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQI_API_KEY}`
    );
    const data = await response.json();
    currentAQIData = data; // Store the AQI data
    return data;
  } catch (error) {
    console.error("Error fetching AQI:", error);
    return null;
  }
}

// Animation for counting up numbers
function animateNumber(element, targetNumber, duration = 1000) {
  const startTime = performance.now();
  const startValue = 0;

  function updateNumber(currentTime) {
    const elapsedTime = currentTime - startTime;
    if (elapsedTime < duration) {
      const value = Math.floor(
        startValue + (targetNumber - startValue) * (elapsedTime / duration)
      );
      element.textContent = value;
      requestAnimationFrame(updateNumber);
    } else {
      element.textContent = targetNumber;
    }
  }

  requestAnimationFrame(updateNumber);
}

// Animation for typing text
function animateText(element, text, speed = 30) {
  let index = 0;
  element.textContent = "";

  function type() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      setTimeout(type, speed);
    }
  }

  type();
}

// Update UI with weather data
function updateWeatherUI(data) {
  if (!data) return;

  // Animate temperature number counting up
  animateNumber(tempElement, Math.round(data.main.temp));

  // Update weather description
  setTimeout(() => {
    animateText(weatherDescElement, data.weather[0].description);
  }, 500);

  // Update weather icon
  if (weatherIconElement) {
    weatherIconElement.style.backgroundImage = `url(http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png)`;
    weatherIconElement.style.backgroundSize = "contain";
    weatherIconElement.style.backgroundRepeat = "no-repeat";
    weatherIconElement.style.backgroundPosition = "center";

    // Add a little animation to the icon
    weatherIconElement.animate(
      [
        { transform: "scale(0.8)", opacity: 0 },
        { transform: "scale(1.05)", opacity: 0.7 },
        { transform: "scale(1)", opacity: 1 },
      ],
      {
        duration: 800,
        easing: "ease-out",
        fill: "forwards",
      }
    );
  }
}

// Update UI with AQI data
function updateAQIUI(data) {
  if (!data || data.status !== "ok") return;
  const aqi = data.data.aqi;
  const pollutants = data.data.iaqi || {};
  const dominentpol = data.data.dominentpol || "pm25";

  // Determine AQI level
  let aqiLevel;
  for (const [key, level] of Object.entries(AQI_LEVELS)) {
    if (aqi >= level.min && aqi <= level.max) {
      aqiLevel = level;
      break;
    }
  }

  // If AQI is above 500, use the HAZARDOUS level
  if (!aqiLevel) {
    aqiLevel = AQI_LEVELS.HAZARDOUS;
  }

  // Format pollutant values
  const pollutantHTML = Object.entries(pollutants)
    .map(([key, value]) => {
      const label = getPollutantLabel(key);
      const isMain = key === dominentpol;
      return `
        <div class="flex items-center justify-between ${
          isMain ? "font-bold" : ""
        } mb-1">
          <span>${label}:</span>
          <span>${value.v.toFixed(1)}</span>
        </div>
      `;
    })
    .join("");

  // Create AQI status element with color coding and pollutant details
  const aqiStatusHTML = `
    <div class="flex flex-col items-center">
      <div class="text-3xl font-bold mb-2" style="color: ${getAQIColor(
        aqi
      )}">${aqi}</div>
      <div class="text-lg font-medium mb-1">${aqiLevel.label}</div>
      <div class="text-sm text-secondary dark:text-secondary-dark text-center max-w-xs mb-4">${
        aqiLevel.description
      }</div>
      <div class="w-full max-w-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div class="text-sm font-medium mb-2">Pollutant Levels:</div>
        ${pollutantHTML}
      </div>
      ${
        data.data.city
          ? `
        <div class="mt-3 text-xs text-secondary dark:text-secondary-dark">
          <a href="${data.data.city.url}" target="_blank" class="hover:text-accent dark:hover:text-accent-dark">
            View detailed report for ${data.data.city.name}
          </a>
        </div>
      `
          : ""
      }
    </div>
  `;

  // Update AQI element with the new HTML
  aqiElement.innerHTML = aqiStatusHTML;

  // Add animation
  aqiElement.animate(
    [
      { transform: "scale(0.8)", opacity: 0 },
      { transform: "scale(1.05)", opacity: 0.7 },
      { transform: "scale(1)", opacity: 1 },
    ],
    {
      duration: 800,
      easing: "ease-out",
      fill: "forwards",
    }
  );
}

// Helper function to get color based on AQI value
function getAQIColor(aqi) {
  if (aqi <= 50) return "#009966"; // Good - Green
  if (aqi <= 100) return "#ffde33"; // Moderate - Yellow
  if (aqi <= 150) return "#ff9933"; // Unhealthy for Sensitive Groups - Orange
  if (aqi <= 200) return "#cc0033"; // Unhealthy - Red
  if (aqi <= 300) return "#660099"; // Very Unhealthy - Purple
  return "#7e0023"; // Hazardous - Maroon
}

// Helper function to get pollutant labels
function getPollutantLabel(key) {
  const labels = {
    pm25: "PM2.5",
    pm10: "PM10",
    no2: "NO₂",
    so2: "SO₂",
    co: "CO",
    o3: "O₃",
  };
  return labels[key] || key.toUpperCase();
}

// Add a chat message with typing animation
function addChatMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isUser ? "message-user" : "message-bot";

  if (isUser) {
    messageDiv.textContent = `User: ${message}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    // For bot messages, first show typing indicator
    messageDiv.innerHTML = `Cloudify: <div class="typing-dots inline-flex items-center mx-2"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Then replace with actual message with typing effect
    setTimeout(() => {
      messageDiv.textContent = `Cloudify: `;
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < message.length) {
          messageDiv.textContent += message.charAt(i);
          i++;
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
          clearInterval(typingInterval);
        }
      }, 20);
    }, 1000);
  }
}

// Update the chat message handling
async function handleChatMessage(message) {
  // Add user message to chat
  addChatMessage(message, true);

  // Show typing indicator
  const typingMessage = document.createElement("div");
  typingMessage.className = "message-bot mb-4";
  typingMessage.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  chatMessages.appendChild(typingMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Get response from chatbot
  const response = await chatbot.sendMessage(
    message,
    currentWeatherData,
    currentAQIData
  );

  // Remove typing indicator
  chatMessages.removeChild(typingMessage);

  // Add bot response
  addChatMessage(response, false);
}

// Add event listeners for chat
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
      handleChatMessage(message);
      chatInput.value = "";
    }
  }
});

sendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (message) {
    handleChatMessage(message);
    chatInput.value = "";
  }
});

// Add subtle animation to cards
function addCardAnimations() {
  const cards = document.querySelectorAll(".card");

  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";

      setTimeout(() => {
        card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, 100);
    }, index * 150);
  });
}

// Initialize
async function init() {
  // Initialize theme
  initTheme();

  // Add event listener to theme toggle button
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Start card animations
  addCardAnimations();

  // Add welcome message
  setTimeout(() => {
    addChatMessage(
      "Welcome to Cloudify! I'm your AI weather assistant. How can I help you today?"
    );
  }, 800);

  // Start updating time
  updateTime();
  setInterval(updateTime, 60000); // Update every minute

  const location = await getUserLocation();
  if (location) {
    const [weatherData, aqiData] = await Promise.all([
      getWeatherData(location.lat, location.lon),
      getAQIData(location.lat, location.lon),
    ]);

    updateWeatherUI(weatherData);
    updateAQIUI(aqiData);
  }
}

// Initialize everything when the page loads
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initMap();
  const location = await getUserLocation();
  if (location) {
    const weatherData = await getWeatherData(location.lat, location.lon);
    const aqiData = await getAQIData(location.lat, location.lon);
    updateWeatherUI(weatherData);
    updateAQIUI(aqiData);
  }
  setInterval(updateTime, 1000);
});

init();
