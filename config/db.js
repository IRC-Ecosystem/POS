const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

db.on("error", (err) => {
  console.error("MySQL connection error:", err.code || err.message);
});

module.exports = db;
