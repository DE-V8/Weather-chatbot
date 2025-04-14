import config from "./config.js";

class WeatherChatbot {
  constructor() {
    this.config = config.LOCAL_LLM_CONFIG;
    this.conversationHistory = [];
    this.isConnected = false;
    this.locationData = null;
    this.currentAQI = null;

    // Initialize location and AQI data
    this.initializeLocationAndAQI();
  }

  async initializeLocationAndAQI() {
    try {
      console.log("Initializing location and AQI data...");
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            console.log("Got location:", {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
            await this.updateLocationAndAQI(position);
          },
          (error) => {
            console.error("Geolocation error:", error.message);
            throw new Error(`Geolocation failed: ${error.message}`);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } else {
        throw new Error("Geolocation is not supported by your browser");
      }
    } catch (error) {
      console.error("Error initializing location and AQI:", error);
      throw error;
    }
  }

  async updateLocationAndAQI(position) {
    try {
      // Get location name
      console.log("Fetching location name...");
      const geoResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
      );

      if (!geoResponse.ok) {
        throw new Error(`Geocoding failed: ${geoResponse.status}`);
      }

      const geoData = await geoResponse.json();
      console.log("Location data received:", geoData);

      this.locationData = {
        city: geoData.city || geoData.locality || geoData.principalSubdivision,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Get AQI data
      console.log("Fetching AQI data...");
      console.log("Using AQI API token:", config.AQI_API_KEY);

      const aqiUrl = `https://api.waqi.info/feed/geo:${position.coords.latitude};${position.coords.longitude}/?token=${config.AQI_API_KEY}`;
      console.log("AQI API URL:", aqiUrl);

      const aqiResponse = await fetch(aqiUrl);

      if (!aqiResponse.ok) {
        throw new Error(`AQI API request failed: ${aqiResponse.status}`);
      }

      const aqiData = await aqiResponse.json();
      console.log("Raw AQI data received:", aqiData);

      if (aqiData.status === "ok") {
        this.currentAQI = {
          aqi: aqiData.data.aqi,
          status: this.getAQIStatus(aqiData.data.aqi),
          pollutants: aqiData.data.iaqi || {},
          time: new Date().toLocaleTimeString(),
          attribution: aqiData.data.attributions || [],
        };
        console.log("Processed AQI data:", this.currentAQI);
      } else {
        throw new Error(`AQI API error: ${aqiData.data}`);
      }
    } catch (error) {
      console.error("Error updating location and AQI:", error);
      // Store error in currentAQI for UI feedback
      this.currentAQI = {
        error: error.message,
        time: new Date().toLocaleTimeString(),
      };
      throw error;
    }
  }

  getAQIStatus(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  }

  async sendMessage(userMessage, weatherData = null) {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      // Prepare detailed context with location and AQI data
      const context = this.prepareDetailedContext(weatherData);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      const messages = [
        {
          role: "system",
          content: `${this.config.system_prompt}\n\nCurrent Location and Conditions:\n${context}`,
        },
        ...this.conversationHistory,
      ];

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `LLM request failed: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from LLM");
      }

      const botResponse = data.choices[0].message.content;

      // Add bot response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: botResponse,
      });

      // Keep conversation history manageable
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      return botResponse;
    } catch (error) {
      console.error("Error in sendMessage:", error);
      this.isConnected = false;
      throw error;
    }
  }

  formatDateTime() {
    const now = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return {
      day: days[now.getDay()],
      date: now.getDate(),
      month: months[now.getMonth()],
      year: now.getFullYear(),
      time: now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }

  prepareDetailedContext(weatherData) {
    const contextParts = [];
    const dateTime = this.formatDateTime();

    // Add date and time information
    contextParts.push(
      `Current Date: ${dateTime.day}, ${dateTime.month} ${dateTime.date}, ${dateTime.year}`,
      `Current Time: ${dateTime.time}`
    );

    // Add location information
    if (this.locationData) {
      contextParts.push(`Location: ${this.locationData.city}`);
    }

    // Add AQI information
    if (this.currentAQI) {
      contextParts.push(
        `Air Quality Index: ${this.currentAQI.aqi} (${this.currentAQI.status})`,
        `Last Updated: ${this.currentAQI.time}`
      );

      // Add detailed pollutant information
      if (Object.keys(this.currentAQI.pollutants).length > 0) {
        contextParts.push("\nPollutant Levels:");
        for (const [key, value] of Object.entries(this.currentAQI.pollutants)) {
          contextParts.push(`${key.toUpperCase()}: ${value.v}`);
        }
      }
    }

    // Add weather data if available
    if (weatherData) {
      contextParts.push(
        `\nWeather Conditions:`,
        `Temperature: ${Math.round(weatherData.main.temp)}°C`,
        `Humidity: ${weatherData.main.humidity}%`,
        `Wind Speed: ${weatherData.wind.speed} m/s`,
        `Conditions: ${weatherData.weather[0].description}`
      );
    }

    return contextParts.join("\n");
  }

  async checkConnection() {
    try {
      const modelResponse = await fetch(
        `${new URL(this.config.endpoint).origin}/v1/models`
      );
      if (!modelResponse.ok) {
        throw new Error(`Models endpoint failed: ${modelResponse.status}`);
      }
      this.isConnected = true;
      console.log("LLM connection successful");
    } catch (error) {
      this.isConnected = false;
      console.error("LLM connection failed:", error.message);
      throw new Error(`Failed to connect to LLM: ${error.message}`);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export default WeatherChatbot;
