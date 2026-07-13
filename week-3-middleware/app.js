const express = require("express");
const path = require("path");
const { randomUUID } = require("crypto");

const dogsRouter = require("./routes/dogs");

const app = express();

function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
}

function echoBody(req, res) {
  res.status(201).json({
    weReceived: req.body,
    message:
      "Adoption request received. We will contact you at ellen@codethedream.com for further details.",
  });
}

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(requestLogger);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.post("/adopt", echoBody);

app.get("/error", (req, res, next) => {
  next(new Error("This route failed."));
});

app.all("/{*splat}", (req, res) => {
  res.status(404).json({
    error: `Route not found`,
    requestId: req.requestId,
  });
});
//! This is the same as, this is anonymouse
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal Server Error",
    requestId: req.requestId,
  });
});
//! This function down here, this one is named
// function errorHandler(err, req, res, next) {
//   console.error(err);
//   res.status(500).json({
//     message: "Internal Server Error",
//     requestId: req.requestId,
//   });
// }

// app.use(errorHandler);

app.use("/", dogsRouter); // Do not remove this line

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;
