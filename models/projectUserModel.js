const { pool } = require("../config/db");

class ProjectUserModel {
  /**
   * Obtener el rol de un usuario en un proyecto específico
   */
  static async getUserRoleInProject(userId, projectId) {
    const [roles] = await pool.execute(
      `SELECT rol_proyecto 
       FROM usuarios_proyectos 
       WHERE id_usuario = ? AND id_proyecto = ?`,
      [userId, projectId]
    );

    return roles.length > 0 ? roles[0].rol_proyecto : null;
  }

  /**
   * Verificar si un usuario tiene acceso a un proyecto
   */
  static async hasProjectAccess(userId, projectId) {
    const role = await this.getUserRoleInProject(userId, projectId);
    return role !== null;
  }

  /**
   * Obtener todos los usuarios de un proyecto con sus roles
   */
  static async getProjectUsers(projectId) {
    const [users] = await pool.execute(
      `SELECT u.id_usuario, u.nombre, u.email, up.rol_proyecto, up.fecha_union
       FROM usuarios u
       JOIN usuarios_proyectos up ON u.id_usuario = up.id_usuario
       WHERE up.id_proyecto = ?
       ORDER BY 
         CASE up.rol_proyecto 
           WHEN 'creador' THEN 1
           WHEN 'lider' THEN 2
           WHEN 'colaborador' THEN 3
         END, u.nombre`,
      [projectId]
    );

    return users;
  }

  /**
   * Obtener todos los proyectos de un usuario con sus roles
   */
  static async getUserProjects(userId) {
    const [projects] = await pool.execute(
      `SELECT p.*, up.rol_proyecto, up.fecha_union
       FROM proyectos p
       JOIN usuarios_proyectos up ON p.id_proyecto = up.id_proyecto
       WHERE up.id_usuario = ?
       ORDER BY p.fecha_creacion DESC`,
      [userId]
    );

    return projects;
  }

  /**
   * Agregar usuario a un proyecto
   */
  static async addUserToProject(userId, projectId, role = "colaborador") {
    try {
      const [result] = await pool.execute(
        `INSERT INTO usuarios_proyectos (id_usuario, id_proyecto, rol_proyecto) 
         VALUES (?, ?, ?)`,
        [userId, projectId, role]
      );

      return {
        success: true,
        insertId: result.insertId,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return {
          success: false,
          message: "El usuario ya está en el proyecto",
        };
      }
      throw error;
    }
  }

  /**
   * Actualizar rol de usuario en un proyecto
   */
  static async updateUserRole(userId, projectId, newRole) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      console.log(
        `Actualizando rol: usuario ${userId}, proyecto ${projectId}, nuevo rol: ${newRole}`
      );

      // Primero verificar que el usuario existe en el proyecto
      const [existing] = await connection.execute(
        `SELECT * FROM usuarios_proyectos 
       WHERE id_usuario = ? AND id_proyecto = ?`,
        [userId, projectId]
      );

      console.log(`Usuario encontrado en proyecto:`, existing.length > 0);

      if (existing.length === 0) {
        await connection.rollback();
        console.log("Usuario no encontrado en el proyecto");
        return false;
      }

      console.log(`Rol actual: ${existing[0].rol_proyecto}`);

      // Actualizar el rol
      const [result] = await connection.execute(
        `UPDATE usuarios_proyectos 
       SET rol_proyecto = ? 
       WHERE id_usuario = ? AND id_proyecto = ?`,
        [newRole, userId, projectId]
      );

      console.log(`Filas afectadas:`, result.affectedRows);
      console.log(`Cambio: ${existing[0].rol_proyecto} → ${newRole}`);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error("Error en updateUserRole:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Remover usuario de un proyecto
   */
  static async removeUserFromProject(userId, projectId) {
    // No permitir remover al creador del proyecto
    const [project] = await pool.execute(
      "SELECT id_creador FROM proyectos WHERE id_proyecto = ?",
      [projectId]
    );

    if (project.length > 0 && project[0].id_creador === userId) {
      return {
        success: false,
        message: "No se puede remover al creador del proyecto",
      };
    }

    const [result] = await pool.execute(
      "DELETE FROM usuarios_proyectos WHERE id_usuario = ? AND id_proyecto = ?",
      [userId, projectId]
    );

    return {
      success: result.affectedRows > 0,
      affectedRows: result.affectedRows,
    };
  }

  /**
   * Obtener estadísticas de proyecto
   */
  static async getProjectStats(projectId) {
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(DISTINCT up.id_usuario) as total_usuarios,
         COUNT(DISTINCT t.id_tarea) as total_tareas,
         SUM(CASE WHEN t.estado = 'completada' THEN 1 ELSE 0 END) as tareas_completadas,
         SUM(CASE WHEN t.estado = 'en progreso' THEN 1 ELSE 0 END) as tareas_en_progreso,
         SUM(CASE WHEN t.estado = 'pendiente' THEN 1 ELSE 0 END) as tareas_pendientes
       FROM usuarios_proyectos up
       LEFT JOIN tareas t ON up.id_proyecto = t.id_proyecto
       WHERE up.id_proyecto = ?`,
      [projectId]
    );

    return stats[0] || {};
  }

  /**
   * Buscar usuarios disponibles para invitar a un proyecto
   */
  static async findUsersToInvite(projectId, searchTerm = "") {
    const [users] = await pool.execute(
      `SELECT u.id_usuario, u.nombre, u.email
       FROM usuarios u
       WHERE u.id_usuario NOT IN (
         SELECT up.id_usuario 
         FROM usuarios_proyectos up 
         WHERE up.id_proyecto = ?
       )
       AND (u.nombre LIKE ? OR u.email LIKE ?)
       ORDER BY u.nombre
       LIMIT 20`,
      [projectId, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    return users;
  }

  /**
   * Verificar permisos para acciones en el proyecto
   */
  static async checkProjectPermissions(userId, projectId, requiredRole) {
    const userRole = await this.getUserRoleInProject(userId, projectId);

    if (!userRole) {
      return { hasAccess: false, reason: "Usuario no pertenece al proyecto" };
    }

    const roleHierarchy = {
      creador: 3,
      lider: 2,
      colaborador: 1,
    };

    const userRoleLevel = roleHierarchy[userRole];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel >= requiredRoleLevel) {
      return { hasAccess: true, userRole };
    } else {
      return {
        hasAccess: false,
        reason: `Se requiere rol ${requiredRole} o superior. Rol actual: ${userRole}`,
      };
    }
  }

  /**
   * Obtener proyectos recientes del usuario
   */
  static async getRecentUserProjects(userId, limit = 5) {
    const [projects] = await pool.execute(
      `SELECT p.*, up.rol_proyecto
       FROM proyectos p
       JOIN usuarios_proyectos up ON p.id_proyecto = up.id_proyecto
       WHERE up.id_usuario = ?
       ORDER BY p.fecha_creacion DESC
       LIMIT ?`,
      [userId, limit]
    );

    return projects;
  }

}

module.exports = ProjectUserModel;
