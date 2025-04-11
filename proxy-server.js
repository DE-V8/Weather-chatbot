const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;
const LLM_SERVER = "http://192.168.215.138:1234";

// Enable CORS for all routes with specific configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Test LLM connection
app.get("/test-llm", async (req, res) => {
  try {
    const response = await axios.get(`${LLM_SERVER}/v1/models`);
    res.json({ status: "ok", models: response.data });
  } catch (error) {
    console.error("LLM connection test failed:", error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to connect to LLM server",
      error: error.message,
    });
  }
});

// Proxy endpoint for LLM chat completions
app.post("/api/chat", async (req, res) => {
  console.log("Received chat request:", {
    model: req.body.model,
    messages: req.body.messages,
  });

  try {
    const response = await axios({
      method: "post",
      url: `${LLM_SERVER}/v1/chat/completions`,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    console.log("LLM response received:", {
      status: response.status,
      model: response.data.model,
      content: response.data.choices?.[0]?.message?.content,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });

    res.status(error.response?.status || 500).json({
      status: "error",
      message: error.message,
      details: error.response?.data || "No additional details available",
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    error: err.message,
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying requests to LLM server at ${LLM_SERVER}`);
});
