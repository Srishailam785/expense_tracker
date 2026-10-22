require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

const shop = require("./routes/shop");
const transactions = require("./routes/transactions");
const users = require("./routes/users");
const err = require("./middleware/errorhandling");

const app = express();

// Trust reverse proxy (required for Render / cloud deployments to handle HTTPS session cookies)
app.set("trust proxy", 1);

if (!process.env.SESSION_SECRET) {
  console.warn(
    "Warning: SESSION_SECRET is not set. Set it in your .env file before deploying.",
  );
}

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-only-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: false }));

app.use(shop);
app.use(transactions);
app.use(users);

// 404 handler — must come after all routes, before the error handler
app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page not found.",
  });
});

app.use(err);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
