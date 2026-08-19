const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");

const analyticsController = require("../controllers/analyticsController");
// this is added scope and not according to the assignment
router.use(jwtMiddleware);

router.get("/users/:id", analyticsController.getUserAnalytics);
router.get("/users", analyticsController.getUsersWithStats);
router.get("/tasks/search", analyticsController.searchTasks);

module.exports = router;
