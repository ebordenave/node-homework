function requireAuth(req, res, next) {
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  next();
}

module.exports = requireAuth;

//! Alternative way to do the the same thing (anonymous)
// module.exports = (req, res, next) => {
//   if (!global.user_id) {
//     return res.status(401).json({
//       message: "Unauthorized",
//     });
//   }

//   next();
// };
