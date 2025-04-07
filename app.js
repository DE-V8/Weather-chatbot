// API Keys (In production, these should be stored securely)
const WEATHER_API_KEY = "3f252142bca70e75edc67515d88073d0";
const AQI_API_KEY = "YOUR_AIRQUALITY_API_KEY";

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

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: new google.maps.LatLng(51.505, -0.09),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 11,
  });

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
  });

  map.overlayMapTypes.insertAt(0, waqiMapOverlay);
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

    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQI_API_KEY}`
    );
    const data = await response.json();
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
  let status;

  if (aqi <= 50) status = "Good";
  else if (aqi <= 100) status = "Moderate";
  else if (aqi <= 150) status = "Unhealthy for Sensitive Groups";
  else if (aqi <= 200) status = "Unhealthy";
  else status = "Very Unhealthy";

  // Animate AQI number
  setTimeout(() => {
    animateNumber(aqiElement, aqi, 1500);
    setTimeout(() => {
      aqiElement.textContent = `${aqi} (${status})`;
    }, 1500);
  }, 500);
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

// Handle chatbot responses
function handleChatbotResponse(message) {
  const lowerMessage = message.toLowerCase();
  let response;

  if (lowerMessage.includes("weather")) {
    response = `The current temperature is ${tempElement.textContent}°C and it's ${weatherDescElement.textContent}.`;
  } else if (
    lowerMessage.includes("aqi") ||
    lowerMessage.includes("air quality")
  ) {
    response = `The current Air Quality Index (AQI) is ${aqiElement.textContent}.`;
  } else if (lowerMessage.includes("time")) {
    response = `The current time is ${currentTimeElement.textContent}.`;
  } else if (lowerMessage.includes("location")) {
    response = `You are currently in ${currentLocationElement.textContent}.`;
  } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    response =
      "Hello! I'm your AI weather assistant. How can I help you today? You can ask me about the weather, air quality, time, or your location.";
  } else {
    response =
      "I'm an AI-powered weather assistant. I can help you with information about weather, air quality, time, and location. What would you like to know?";
  }

  setTimeout(() => addChatMessage(response), 500);
}

// Event listeners
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message) {
      addChatMessage(message, true);
      handleChatbotResponse(message);
      chatInput.value = "";
    }
  });
}

if (chatInput) {
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });
}

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
