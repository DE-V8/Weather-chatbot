// Simple proxy server for LLM API to avoid CORS issues
// Save this as proxy.js and run with: node proxy.js

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static("./"));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple proxy endpoint for the LLM
app.post("/api/llm", async (req, res) => {
  try {
    console.log("Received request for LLM:", JSON.stringify(req.body));

    // Use exact URL format for LM Studio - verified working in test-llm.js
    const llmUrl = "http://192.168.195.138:1234/v1/chat/completions";
    console.log("Sending request to LLM at:", llmUrl);

    // Using the exact same format that works in test-llm.js
    const response = await axios.post(
      llmUrl,
      {
        model: req.body.model || "llama-3.2-1b-instruct",
        messages: req.body.messages || [{ role: "user", content: "Hello" }],
        temperature: req.body.temperature || 0.7,
        max_tokens: req.body.max_tokens || 150,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    console.log("LLM response status:", response.status);
    if (response.data) {
      console.log(
        "LLM response data (partial):",
        JSON.stringify(response.data).substring(0, 100)
      );
    }

    // Return the exact response we got from LM Studio
    res.json(response.data);
  } catch (error) {
    console.error("Error proxying to LLM:", error.message);
    if (error.response) {
      console.error("LLM error response status:", error.response.status);
      console.error("LLM error response data:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      console.error("Cannot connect to LLM server. Make sure it's running.");
      res.status(503).json({
        error:
          "Cannot connect to LLM server. Please make sure the LM Studio is running at 192.168.195.138:1234",
      });
    } else {
      res.status(500).json({ error: `Proxy error: ${error.message}` });
    }
  }
});

// Add a test endpoint that mirrors what the test script does
app.get("/api/test-llm", async (req, res) => {
  try {
    // Use the same test call that worked in test-llm.js
    const chatResponse = await axios.post(
      "http://192.168.195.138:1234/v1/chat/completions",
      {
        model: "llama-3.2-1b-instruct",
        messages: [{ role: "user", content: "Hello, are you working?" }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    res.json({
      status: "ok",
      message: "LLM connection test successful",
      llm_response: chatResponse.data,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: `LLM connection test failed: ${error.message}`,
    });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
  console.log(
    `Proxy will forward LLM requests to: http://192.168.195.138:1234/v1/chat/completions`
  );
});
