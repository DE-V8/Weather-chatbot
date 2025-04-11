// Test script to check connectivity with LM Studio
const axios = require("axios");

async function testLLMConnection() {
  console.log("Testing connection to LM Studio...");

  try {
    // First test - check if the server is reachable
    console.log("1. Testing if server is reachable...");
    const pingResponse = await axios.get(
      "http://192.168.215.138:1234/v1/models",
      {
        timeout: 5000,
      }
    );
    console.log(
      "Server is reachable! Available models:",
      pingResponse.data.data.map((model) => model.id).join(", ")
    );

    // Second test - test chat completions
    console.log("\n2. Testing chat completions API...");
    const chatResponse = await axios.post(
      "http://192.168.215.138:1234/v1/chat/completions",
      {
        model: "llama-3.2-1b-instruct",
        messages: [{ role: "user", content: "Hello, are you working?" }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    console.log("Chat API works! Response:");
    console.log(JSON.stringify(chatResponse.data, null, 2));
    console.log("\nLM Studio is properly configured and accessible.");
  } catch (error) {
    console.error("Error connecting to LM Studio:");
    if (error.code === "ECONNREFUSED") {
      console.error(
        "Connection refused - LM Studio is not running or not accessible at 192.168.195.138:1234"
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error("Connection timed out - LM Studio is not responding");
    } else if (error.response) {
      console.error(`Server responded with status ${error.response.status}`);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }
    console.error("\nPlease make sure:");
    console.error("1. LM Studio is running");
    console.error("2. The IP address 192.168.195.138 is correct");
    console.error("3. LM Studio is listening on port 1234");
    console.error("4. Your firewall allows connections to this IP and port");
  }
}

testLLMConnection();
