const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");

router.post("/register", userController.register);
router.post("/logon", userController.logon);

router.post("/googleLogon", userController.googleLogon);

router.use(jwtMiddleware);

router.post("/logoff", userController.logoff);

module.exports = router;
