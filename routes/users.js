const express = require("express");
const route = express.Router();
const user = require("../controllers/user");

route.get("/register", user.register);
route.post("/register", user.addregister);

route.get("/login", user.login);
route.post("/login", user.addlogin);

module.exports = route;
