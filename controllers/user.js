const user = require("../models/user");
const bcrypt = require("bcrypt");

const check = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

exports.register = (req, res, next) => {
  res.render("register", { error: null, formData: {} });
};

exports.addregister = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();

    if (!name || !email || !password) {
      return res.render("register", {
        error: "Please fill in all fields.",
        formData: { name, email },
      });
    }

    if (password.length < 8) {
      return res.render("register", {
        error: "Password must be at least 8 characters long.",
        formData: { name, email },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const User = new user(name, email, hashedPassword);

    await User.register();

    res.redirect("/login");
  } catch (err) {
    // MySQL duplicate-key error when the email column has a UNIQUE constraint
    if (err.code === "ER_DUP_ENTRY") {
      return res.render("register", {
        error: "An account with that email already exists.",
        formData: { name: req.body.name, email: req.body.email },
      });
    }
    next(err);
  }
};

exports.login = (req, res, next) => {
  res.render("login", { error: null });
};

exports.addlogin = async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();

    if (!email || !password) {
      return res.render("login", {
        error: "Please enter your email and password.",
      });
    }

    const hashed_pass = await user.checkPass(email);

    if (hashed_pass[0].length === 0) {
      return res.render("login", {
        error: "Invalid email or password.",
      });
    }

    const id = hashed_pass[0][0].id;
    const result = await check(password, hashed_pass[0][0].password);

    if (!result) {
      return res.render("login", {
        error: "Invalid email or password.",
      });
    }

    req.session.isLoggedIn = true;
    req.session.userId = id;
    res.redirect("/transactions");
  } catch (err) {
    next(err);
  }
};
