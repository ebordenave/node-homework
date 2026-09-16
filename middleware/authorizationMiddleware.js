const prisma = require("../db/prisma");

/**
 * Creates authorization middleware that restricts access
 * to users with one of the allowed roles.
 *
 * @param {string[]} allowedRoles - Roles permitted to access the route.
 * @returns {Function} Express middleware function.
 */
function authorizeRoles(allowedRoles) {
  async function authorize(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        select: {
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "404 Not Found",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: "403 Forbidden",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: "unexpected database/server problem",
      });
    }
  }
  return authorize;
}

module.exports = {
  authorizeRoles,
};
