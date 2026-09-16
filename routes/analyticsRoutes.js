const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { authorizeRoles } = require("../middleware/authorizationMiddleware");

const analyticsController = require("../controllers/analyticsController");
router.use(jwtMiddleware);

router.get(
  "/users/:id",
  authorizeRoles(["USER", "MANAGER", "ADMIN"]),
  analyticsController.getUserAnalytics,
);
router.get(
  "/users",
  authorizeRoles(["MANAGER", "ADMIN"]),
  analyticsController.getUsersWithStats,
);
router.get(
  "/tasks/search",
  authorizeRoles(["MANAGER", "ADMIN"]),
  analyticsController.searchTasks,
);

module.exports = router;
