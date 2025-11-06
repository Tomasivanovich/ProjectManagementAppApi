const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: 'gondola.proxy.rlwy.net',
  user: 'root',
  password: 'rPxggiXJcwhkVuCocTWxqLbKgmmNuweY',
  database: 'railway',
  port: 49110,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configuración específica para Railway
  ssl: false
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