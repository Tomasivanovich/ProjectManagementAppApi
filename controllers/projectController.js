const { validationResult } = require("express-validator");
const ProjectModel = require("../models/projectModel");
const ProjectUserModel = require("../models/projectUserModel");
const UserModel = require("../models/userModel");
const { pool } = require("../config/db");

class ProjectController {
  static async createProject(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const { nombre, descripcion } = req.body;
      const id_creador = req.user.id_usuario;

      const projectId = await ProjectModel.create({
        nombre,
        descripcion,
        id_creador,
      });

      const project = await ProjectModel.findById(projectId);

      res.status(201).json({
        success: true,
        message: "Proyecto creado exitosamente",
        data: project,
      });
    } catch (error) {
      console.error("Error creando proyecto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async getUserProjects(req, res) {
    try {
      const userId = req.user.id_usuario;
      const projects = await ProjectModel.findByUserId(userId);

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Error obteniendo proyectos:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async getProjectById(req, res) {
    try {
      const projectId = req.params.id;
      const project = await ProjectModel.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Proyecto no encontrado",
        });
      }

      // Verificar que el usuario tiene acceso al proyecto
      const hasAccess =
        (await ProjectUserModel.hasProjectAccess(
          req.user.id_usuario,
          projectId
        )) || req.user.rol_global === "admin";

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "No tienes acceso a este proyecto",
        });
      }

      const projectUsers = await ProjectUserModel.getProjectUsers(projectId);

      const projectStats = await ProjectUserModel.getProjectStats(projectId);

      res.json({
        success: true,
        data: {
          ...project,
          usuarios: projectUsers,
          estadisticas: projectStats,
        },
      });
    } catch (error) {
      console.error("Error obteniendo proyecto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async updateProject(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const projectId = req.params.id;
      const { nombre, descripcion } = req.body;

      const updated = await ProjectModel.update(projectId, {
        nombre,
        descripcion,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Proyecto no encontrado",
        });
      }

      const updatedProject = await ProjectModel.findById(projectId);

      res.json({
        success: true,
        message: "Proyecto actualizado exitosamente",
        data: updatedProject,
      });
    } catch (error) {
      console.error("Error actualizando proyecto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async deleteProject(req, res) {
    try {
      const projectId = req.params.id;
      const deleted = await ProjectModel.delete(projectId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Proyecto no encontrado",
        });
      }

      res.json({
        success: true,
        message: "Proyecto eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async inviteUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const projectId = req.params.id;
      const { email, rol_proyecto = "colaborador" } = req.body;

      console.log(
        `Invitar usuario: ${email} al proyecto: ${projectId} con rol: ${rol_proyecto}`
      );

      // Buscar usuario por email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      // Verificar que el usuario no sea el mismo que invita
      if (user.id_usuario === req.user.id_usuario) {
        return res.status(400).json({
          success: false,
          message: "No puedes invitarte a ti mismo",
        });
      }

      // Agregar usuario al proyecto 
      const result = await ProjectUserModel.addUserToProject(
        user.id_usuario,
        projectId,
        rol_proyecto
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.json({
        success: true,
        message: "Usuario invitado al proyecto exitosamente",
      });
    } catch (error) {
      console.error("Error invitando usuario:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async assignRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const projectId = req.params.id;
      const { id_usuario, rol_proyecto } = req.body;

      console.log("=== ASIGNAR ROL - INICIO ===");
      console.log("Project ID:", projectId);
      console.log("User ID a actualizar:", id_usuario);
      console.log("Nuevo rol:", rol_proyecto);
      console.log("Usuario que ejecuta:", req.user.id_usuario, req.user.nombre);

      // Verificar que el usuario que asigna el rol es creador o admin
      const project = await ProjectModel.findById(projectId);
      console.log("Proyecto encontrado:", project ? "SÍ" : "NO");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Proyecto no encontrado",
        });
      }

      console.log("Creador del proyecto:", project.id_creador);

      if (
        project.id_creador !== req.user.id_usuario &&
        req.user.rol_global !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Solo el creador del proyecto puede asignar roles",
        });
      }

      // No permitir cambiar el rol del creador
      if (id_usuario === project.id_creador) {
        return res.status(400).json({
          success: false,
          message: "No puedes cambiar el rol del creador del proyecto",
        });
      }

      // Verificar que el usuario existe en el proyecto
      const userRole = await ProjectUserModel.getUserRoleInProject(
        id_usuario,
        projectId
      );
      console.log("Rol actual del usuario en el proyecto:", userRole);

      if (!userRole) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado en el proyecto",
        });
      }

      console.log(`Actualizando rol de ${userRole} a ${rol_proyecto}`);

      // Actualizar el rol
      const updated = await ProjectUserModel.updateUserRole(
        id_usuario,
        projectId,
        rol_proyecto
      );

      if (!updated) {
        return res.status(500).json({
          success: false,
          message: "Error al actualizar el rol del usuario",
        });
      }

      console.log("Rol actualizado exitosamente");

      res.json({
        success: true,
        message: "Rol actualizado exitosamente",
        data: {
          usuario_id: id_usuario,
          proyecto_id: projectId,
          rol_anterior: userRole,
          rol_nuevo: rol_proyecto,
        },
      });
    } catch (error) {
      console.error("Error asignando rol:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  }

  static async searchUsersToInvite(req, res) {
    try {
      const projectId = req.params.id;
      const { search = "" } = req.query;

      console.log(
        `Buscando usuarios para proyecto: ${projectId}, término: ${search}`
      );

      const users = await ProjectUserModel.findUsersToInvite(projectId, search);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Error buscando usuarios:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async removeUserFromProject(req, res) {
    try {
      const projectId = req.params.id;
      const { id_usuario } = req.body;

      console.log(`Remover usuario: ${id_usuario} del proyecto: ${projectId}`);

      const result = await ProjectUserModel.removeUserFromProject(
        id_usuario,
        projectId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado en el proyecto",
        });
      }

      res.json({
        success: true,
        message: "Usuario removido del proyecto exitosamente",
      });
    } catch (error) {
      console.error("Error removiendo usuario:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async debugProjectAssignment(req, res) {
    try {
      const projectId = req.params.id;
      const userId = req.params.userId;

      console.log("=== DIAGNÓSTICO COMPLETO ===");
      console.log("Project ID:", projectId);
      console.log("User ID:", userId);

      // Verificar si el proyecto existe
      const project = await ProjectModel.findById(projectId);
      console.log("Proyecto encontrado:", project ? "SÍ" : "NO");
      if (project) {
        console.log(
          "Proyecto:",
          project.nombre,
          "Creador:",
          project.id_creador
        );
      }

      // Verificar si el usuario existe
      const user = await UserModel.findById(userId);
      console.log("Usuario encontrado:", user ? "SÍ" : "NO");
      if (user) {
        console.log("Usuario:", user.nombre, user.email);
      }

      // Verificar relación en usuarios_proyectos
      const [directRelation] = await pool.execute(
        "SELECT * FROM usuarios_proyectos WHERE id_proyecto = ? AND id_usuario = ?",
        [projectId, userId]
      );
      console.log("Relación directa encontrada:", directRelation.length > 0);
      if (directRelation.length > 0) {
        console.log("Relación:", directRelation[0]);
      }

      // Usar el método del modelo
      const userRole = await ProjectUserModel.getUserRoleInProject(
        userId,
        projectId
      );
      console.log("Rol del usuario (método modelo):", userRole);

      // Listar TODOS los usuarios del proyecto
      const allProjectUsers = await ProjectUserModel.getProjectUsers(projectId);
      console.log("Todos los usuarios del proyecto:", allProjectUsers);

      res.json({
        success: true,
        data: {
          proyecto: project,
          usuario: user,
          relacion_directa: directRelation[0] || null,
          rol_usuario: userRole,
          todos_los_usuarios: allProjectUsers,
          debug_info: {
            project_id: projectId,
            user_id: userId,
            project_exists: !!project,
            user_exists: !!user,
            relation_exists: directRelation.length > 0,
          },
        },
      });
    } catch (error) {
      console.error("Error en diagnóstico:", error);
      res.status(500).json({
        success: false,
        message: "Error en diagnóstico",
        error: error.message,
      });
    }
  }
}

module.exports = ProjectController;
