const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const jwtConfig = require('../config/jwt');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acceso requerido' 
    });
  }
  console.log('AUTH HEADER:', authHeader);
  console.log('TOKEN:', token);

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Verificar que el usuario aún existe en la base de datos
    const [users] = await pool.execute(
      'SELECT id_usuario, nombre, email, rol_global FROM usuarios WHERE id_usuario = ?',
      [decoded.id]
    );

    console.log('DECODED JWT:', decoded);
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido o expirado' 
    });
  }
};

module.exports = { authenticateToken };