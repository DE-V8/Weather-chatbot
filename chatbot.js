import config from "./config.js";

class WeatherChatbot {
  constructor() {
    this.config = config.LOCAL_LLM_CONFIG;
    this.conversationHistory = [];
    console.log(
      "Chatbot initialized with direct LLM endpoint:",
      this.config.endpoint
    );

    // Check if CORS might be an issue
    this.checkCorsStatus();
  }

  async checkCorsStatus() {
    try {
      console.log("Testing connection to LLM...");
      const response = await fetch(this.config.endpoint, {
        method: "OPTIONS",
        mode: "cors",
      });
      console.log("LLM connection pre-flight check response:", response.status);
    } catch (error) {
      console.warn(
        "CORS pre-flight check failed. This may cause issues:",
        error.message
      );
      console.warn(
        "If chat doesn't work, you may need to enable CORS in LM Studio or use a proxy server."
      );
    }
  }

  async sendMessage(userMessage, weatherData, aqiData) {
    try {
      console.log("Chatbot sendMessage called with:", userMessage);

      // Prepare context with current weather and AQI data
      const context = this.prepareContext(weatherData, aqiData);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Prepare messages array
      const messages = [
        {
          role: "system",
          content:
            this.config.system_prompt + "\n\nCurrent conditions: " + context,
        },
        ...this.conversationHistory,
      ];

      console.log("Sending request to:", this.config.endpoint);
      const requestBody = {
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
      };
      console.log("Request payload:", JSON.stringify(requestBody));

      // Prepare the API request
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors", // Explicitly request CORS
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error(
          "Invalid response from LLM server: " + responseText.substring(0, 100)
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Unexpected response format:", data);
        throw new Error("Unexpected response format from LLM server");
      }

      const botResponse =
        data.choices[0].message.content || "No response received from model";
      console.log("Bot response received:", botResponse);

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
      console.error("Chatbot error:", error);

      // Provide more specific error messages
      if (
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch")
      ) {
        return `I apologize, but I'm having trouble connecting to the local LLM due to CORS restrictions. You'll need to either:
        1. Enable CORS in LM Studio, or
        2. Use a proxy server to handle the requests.
        
        Error details: ${error.message}`;
      }

      return `I apologize, but I'm having trouble connecting to the local LLM. Error: ${error.message}. Please make sure the local LLM server is running.`;
    }
  }

  prepareContext(weatherData, aqiData) {
    let context = "";

    if (weatherData) {
      context += `Weather: ${weatherData.weather[0].description}, Temperature: ${weatherData.main.temp}°C, `;
      context += `Humidity: ${weatherData.main.humidity}%, Wind: ${weatherData.wind.speed} m/s. `;
    }

    if (aqiData && aqiData.data) {
      context += `Air Quality Index: ${aqiData.data.aqi}, `;
      if (aqiData.data.iaqi) {
        const pollutants = aqiData.data.iaqi;
        if (pollutants.pm25) context += `PM2.5: ${pollutants.pm25.v}, `;
        if (pollutants.pm10) context += `PM10: ${pollutants.pm10.v}, `;
        if (pollutants.o3) context += `Ozone: ${pollutants.o3.v}, `;
      }
    }

    return context;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export default WeatherChatbot;
