import config from "./config.js";

async function testLLMConnection() {
  const LLM_URL = config.LOCAL_LLM_CONFIG.endpoint;
  const MODEL_URL = new URL(LLM_URL).origin + "/v1/models";

  console.log("Testing LLM connection...");
  console.log("LLM URL:", LLM_URL);
  console.log("Model URL:", MODEL_URL);

  try {
    // Test models endpoint
    console.log("\nTesting models endpoint...");
    const modelResponse = await fetch(MODEL_URL);
    const modelData = await modelResponse.json();
    console.log("Models available:", modelData);

    // Test chat completion
    console.log("\nTesting chat completion...");
    const response = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.LOCAL_LLM_CONFIG.model,
        messages: [{ role: "user", content: "Hello, are you working?" }],
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    console.log("Chat response:", data);

    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

// Run the test
testLLMConnection().then((success) => {
  if (success) {
    console.log("\nLLM connection test passed! ✅");
  } else {
    console.log("\nLLM connection test failed! ❌");
  }
});
