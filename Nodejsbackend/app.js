const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = 3000;

// Create a Registry
const register = new client.Registry();

// Collect default metrics
client.collectDefaultMetrics({ register });

// Custom metric: total HTTP requests
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

register.registerMetric(httpRequestsTotal);

// Middleware to count requests
app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
  });
  next();
});

// Main route
app.get("/", (req, res) => {
  res.send("Node.js app is running");
});

// Metrics route for Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
