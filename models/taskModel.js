const { pool } = require('../config/db');

class TaskModel {
  static async create(taskData) {
    const { id_proyecto, titulo, descripcion, id_asignado, fecha_vencimiento } = taskData;
    
    const [result] = await pool.execute(
      `INSERT INTO tareas (id_proyecto, titulo, descripcion, id_asignado, fecha_vencimiento) 
       VALUES (?, ?, ?, ?, ?)`,
      [id_proyecto, titulo, descripcion, id_asignado, fecha_vencimiento]
    );
    
    return result.insertId;
  }

  static async findByProjectId(projectId) {
    const [tasks] = await pool.execute(
      `SELECT t.*, u.nombre as asignado_nombre, u2.nombre as creador_nombre 
       FROM tareas t 
       LEFT JOIN usuarios u ON t.id_asignado = u.id_usuario 
       JOIN proyectos p ON t.id_proyecto = p.id_proyecto 
       JOIN usuarios u2 ON p.id_creador = u2.id_usuario 
       WHERE t.id_proyecto = ? 
       ORDER BY t.fecha_creacion DESC`,
      [projectId]
    );
    
    return tasks;
  }

  static async findById(id) {
    const [tasks] = await pool.execute(
      `SELECT t.*, p.nombre as proyecto_nombre, u.nombre as asignado_nombre 
       FROM tareas t 
       JOIN proyectos p ON t.id_proyecto = p.id_proyecto 
       LEFT JOIN usuarios u ON t.id_asignado = u.id_usuario 
       WHERE t.id_tarea = ?`,
      [id]
    );
    
    return tasks[0];
  }

  static async update(id, taskData) {
    const { titulo, descripcion, estado, id_asignado, fecha_vencimiento } = taskData;
    
    const [result] = await pool.execute(
      `UPDATE tareas SET titulo = ?, descripcion = ?, estado = ?, id_asignado = ?, fecha_vencimiento = ? 
       WHERE id_tarea = ?`,
      [titulo, descripcion, estado, id_asignado, fecha_vencimiento, id]
    );
    
    return result.affectedRows > 0;
  }

  static async updateStatus(id, estado) {
    const [result] = await pool.execute(
      'UPDATE tareas SET estado = ? WHERE id_tarea = ?',
      [estado, id]
    );
    
    return result.affectedRows > 0;
  }

  static async updateFile(id, archivo) {
    const [result] = await pool.execute(
      'UPDATE tareas SET archivo = ? WHERE id_tarea = ?',
      [archivo, id]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM tareas WHERE id_tarea = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = TaskModel;