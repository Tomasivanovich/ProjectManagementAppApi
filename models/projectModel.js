const { pool } = require('../config/db');

class ProjectModel {
  static async create(projectData) {
    const { nombre, descripcion, id_creador } = projectData;
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Crear proyecto
      const [projectResult] = await connection.execute(
        'INSERT INTO proyectos (nombre, descripcion, id_creador) VALUES (?, ?, ?)',
        [nombre, descripcion, id_creador]
      );

      const projectId = projectResult.insertId;

      // Agregar creador a la tabla usuarios_proyectos
      await connection.execute(
        'INSERT INTO usuarios_proyectos (id_usuario, id_proyecto, rol_proyecto) VALUES (?, ?, ?)',
        [id_creador, projectId, 'creador']
      );

      await connection.commit();
      return projectId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [projects] = await pool.execute(
      `SELECT p.*, u.nombre as creador_nombre 
       FROM proyectos p 
       JOIN usuarios u ON p.id_creador = u.id_usuario 
       WHERE p.id_proyecto = ?`,
      [id]
    );
    
    return projects[0];
  }

  static async findByUserId(userId) {
    const [projects] = await pool.execute(
      `SELECT p.*, up.rol_proyecto, u.nombre as creador_nombre 
       FROM proyectos p 
       JOIN usuarios_proyectos up ON p.id_proyecto = up.id_proyecto 
       JOIN usuarios u ON p.id_creador = u.id_usuario 
       WHERE up.id_usuario = ? 
       ORDER BY p.fecha_creacion DESC`,
      [userId]
    );
    
    return projects;
  }

  static async update(id, projectData) {
    const { nombre, descripcion } = projectData;
    
    const [result] = await pool.execute(
      'UPDATE proyectos SET nombre = ?, descripcion = ? WHERE id_proyecto = ?',
      [nombre, descripcion, id]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM proyectos WHERE id_proyecto = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = ProjectModel;