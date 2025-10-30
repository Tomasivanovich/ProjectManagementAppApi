const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(' Conectado a la base de datos MySQL');
    connection.release();
  } catch (error) {
    console.error(' Error conectando a la base de datos:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };