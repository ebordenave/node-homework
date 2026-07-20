const express = require("express");
const path = require("path");
const { randomUUID } = require("crypto");

const dogsRouter = require("./routes/dogs");

const app = express();

// =====================================================
// MIDDLEWARE
// Defines functions that run during the request pipeline
// =====================================================

// Adds a unique request ID and security headers
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Logs every incoming request
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
}

app.use(requestLogger);

// Parses JSON request bodies
app.use(express.json({ limit: "1mb" }));

// Rejects POST requests that are not application/json
function requireJSON(req, res, next) {
  if (req.method === "POST" && !req.is("application/json")) {
    return res.status(400).json({
      error: "Content-Type must be application/json",
      requestId: req.requestId,
    });
  }

  next();
}

app.use(requireJSON);

// Serves static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// ROUTER MOUNTING
// Hands matching requests to other routers
// =====================================================

app.use("/", dogsRouter); // Do not remove this line

// =====================================================
// ROUTE HANDLERS
// Endpoints defined directly on the application
// =====================================================

// app.get("/adopt", (req, res) => {
//   res.status(200).json({
//     message: req.message,
//   });
// });

// (Currently has middleware but no route handler)
// app.post("/adopt", express.json({ limit: "1mb" }));

app.get("/error", (req, res, next) => {
  next(new Error("This route failed."));
}); // confirmed this runs

// Catch-all for any route that wasn't matched (the issue might be here)
app.all("/{*splat}", (req, res) => {
  res.status(404).json({
    error: `Route not found`,
    requestId: req.requestId,
  });
});

// =====================================================
// ERROR HANDLING
// Runs only when next(err) is called
// =====================================================

app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} - ${err.message}`);
  } else {
    console.error(`ERROR: ${err.name} - ${err.message}`);
  }

  const message = err.statusCode ? err.message : "Internal Server Error";
  // console.error(err);
  res.status(statusCode).json({
    error: message,
    requestId: req.requestId,
  });
});

// =====================================================
// START SERVER
// =====================================================

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;
