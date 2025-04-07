// API Keys Configuration
const config = {
  // Get your OpenWeather API key from: https://home.openweathermap.org/api_keys
  WEATHER_API_KEY: "3f252142bca70e75edc67515d88073d0",

  // Get your WAQI token from: https://aqicn.org/data-platform/token/
  // The token should be 32 characters long
  AQI_API_KEY: "c19f75ef061cb97e6ec372bb66b3abec7757db5f", // Make sure this is your complete token

  // Direct connection to LM Studio (no proxy)
  LOCAL_LLM_CONFIG: {
    endpoint: "http://192.168.195.138:1234/v1/chat/completions", // Direct connection to LM Studio
    model: "llama-3.2-1b-instruct", // Model name as shown in LM Studio
    temperature: 0.7,
    max_tokens: 150,
    system_prompt: `You are a helpful weather and air quality assistant. 
    You have access to current weather data and air quality information. 
    Provide concise, helpful responses about weather, air quality, and health recommendations. 
    Be friendly and conversational while maintaining professionalism.`,
  },
};

// Export the configuration
export default config;
