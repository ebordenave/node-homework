function notFound(req, res, next) {
  res.status(404).json({
    error: "Route not found",
  });
  // console.log(`${req.method} ${req.path}`);
  // next();
}

module.exports = notFound;
