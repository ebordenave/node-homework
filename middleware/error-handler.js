function errorHandler(err, req, res, next) {
  if (err.name === "PrismaClientInitializationError") {
    console.error("Couldn't connect to the database. Is it running?");
  }

  console.error(err);
  res.status(500).json({
    error: "Something went wrong",
  });
}

module.exports = errorHandler;
