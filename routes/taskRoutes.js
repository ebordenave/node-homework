const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskController");

router.get("/", taskController.index);
router.get("/:id", taskController.show);
router.post("/", taskController.create);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
