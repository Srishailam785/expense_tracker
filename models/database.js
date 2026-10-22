const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "project2",
  password: process.env.DB_PASSWORD,
});

module.exports = db.promise();
