const express = require("express");

const shop = require("../controllers/shop.js");

const router = express.Router();

router.get("/", shop.firstpage);

module.exports = router;
