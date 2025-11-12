const express = require("express");
const { notificationAlert , contactMessageAlert } = require("../controllers/notificationController");

const router = express.Router();

router.post("/", notificationAlert);
router.post('/contactusAlert', contactMessageAlert)


module.exports = router;
