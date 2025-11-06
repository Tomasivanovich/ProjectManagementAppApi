const { validationResult } = require("express-validator");
const TaskModel = require("../models/taskModel");
const ProjectModel = require("../models/projectModel");
const multer = require("multer");
const path = require("path");

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "task-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB límite
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes y documentos"));
    }
  },
}).single("archivo");

class TaskController {
  static async createTask(req, res) {
    console.log("🟢 createTask() ejecutado con body:", req.body);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const {
        id_proyecto,
        titulo,
        descripcion,
        id_asignado,
        fecha_vencimiento,
      } = req.body;

      console.log("📦 Intentando crear tarea con datos:", {
        id_proyecto,
        titulo,
        descripcion,
        id_asignado,
        fecha_vencimiento,
      });
      const taskId = await TaskModel.create({
        id_proyecto,
        titulo,
        descripcion,
        id_asignado,
        fecha_vencimiento,
      });

      const task = await TaskModel.findById(taskId);

      res.status(201).json({
        success: true,
        message: "Tarea creada exitosamente",
        data: task,
      });
    } catch (error) {
      console.error("Error creando tarea:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async getProjectTasks(req, res) {
    try {
      const projectId = req.params.id;
      const tasks = await TaskModel.findByProjectId(projectId);

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error("Error obteniendo tareas:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async updateTask(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });
      }

      const taskId = req.params.id;
      const { titulo, descripcion, estado, id_asignado, fecha_vencimiento } =
        req.body;

      const updated = await TaskModel.update(taskId, {
        titulo,
        descripcion,
        estado,
        id_asignado,
        fecha_vencimiento,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Tarea no encontrada",
        });
      }

      const updatedTask = await TaskModel.findById(taskId);

      // **AGREGAR EL ROL A LA RESPUESTA**
      const taskWithRole = {
        ...updatedTask,
        rol_proyecto: req.user.projectRole,
      };

      res.json({
        success: true,
        message: "Tarea actualizada exitosamente",
        data: taskWithRole,
      });
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async completeTask(req, res) {
    try {
      const taskId = req.params.id;
      const { estado } = req.body;

      if (!["pendiente", "en progreso", "completada"].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: "Estado inválido",
        });
      }

      const updated = await TaskModel.updateStatus(taskId, estado);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Tarea no encontrada",
        });
      }

      const updatedTask = await TaskModel.findById(taskId);

      // **AGREGAR EL ROL A LA RESPUESTA**
      const taskWithRole = {
        ...updatedTask,
        rol_proyecto: req.user.projectRole,
      };

      res.json({
        success: true,
        message: `Tarea marcada como ${estado}`,
        data: taskWithRole,
      });
    } catch (error) {
      console.error("Error completando tarea:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async uploadFile(req, res) {
    upload(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No se subió ningún archivo",
          });
        }

        const taskId = req.params.id;
        const archivo = req.file.filename;

        const updated = await TaskModel.updateFile(taskId, archivo);

        if (!updated) {
          return res.status(404).json({
            success: false,
            message: "Tarea no encontrada",
          });
        }

        const updatedTask = await TaskModel.findById(taskId);

        res.json({
          success: true,
          message: "Archivo subido exitosamente",
          data: updatedTask,
        });
      } catch (error) {
        console.error("Error subiendo archivo:", error);
        res.status(500).json({
          success: false,
          message: "Error interno del servidor",
        });
      }
    });
  }

  static async getTaskById(req, res) {
    try {
      console.log("getTaskById() ejecutado con ID:", req.params.id);
      console.log("👤 Usuario actual:", req.user.id_usuario);
      console.log("🎯 Rol en el proyecto:", req.user.projectRole);

      let task;

      if (req.task) {
        console.log("✅ Tarea ya cargada por middleware");
        task = req.task;
      } else {
        // Si no, búscala
        const taskId = req.params.id;
        task = await TaskModel.findById(taskId);

        if (!task) {
          return res.status(404).json({
            success: false,
            message: "Tarea no encontrada",
          });
        }
      }

      // **AGREGAR ESTA PARTE CRUCIAL: Incluir el rol del proyecto en la respuesta**
      const taskWithRole = {
        ...task,
        rol_proyecto: req.user.projectRole, // ← Esto es lo que necesita el frontend
      };

      console.log("📦 Tarea enviada con rol:", taskWithRole.rol_proyecto);

      res.json({
        success: true,
        data: taskWithRole,
      });
    } catch (error) {
      console.error("Error obteniendo tarea:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async deleteTask(req, res) {
    try {
      const taskId = req.params.id;
      const deleted = await TaskModel.delete(taskId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Tarea no encontrada",
        });
      }

      res.json({
        success: true,
        message: "Tarea eliminada exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
}

module.exports = TaskController;
