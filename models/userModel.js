const { pool } = require('../config/db');

class UserModel {
  static async create(userData) {
    const { nombre, email, password, rol_global = 'usuario' } = userData;
    
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, email, password, rol_global) VALUES (?, ?, ?, ?)',
      [nombre, email, password, rol_global]
    );
    
    return result.insertId;
  }

  static async findByEmail(email) {
    const [users] = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    
    return users[0];
  }

  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id_usuario, nombre, email, rol_global, fecha_creacion FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    
    return users[0];
  }

  static async findAll() {
    const [users] = await pool.execute(
      'SELECT id_usuario, nombre, email, rol_global, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    
    return users;
  }

  static async update(id, userData) {
    const { nombre, email } = userData;
    
    const [result] = await pool.execute(
      'UPDATE usuarios SET nombre = ?, email = ? WHERE id_usuario = ?',
      [nombre, email, id]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = UserModel;