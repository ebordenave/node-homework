const express = require("express");
const router = express.Router();

const taskController = require("../controllers/taskController");

router.get("/", taskController.index);
router.post("/", taskController.create);

router.post("/bulk", taskController.bulkCreate);

router.get("/:id", taskController.show);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;
