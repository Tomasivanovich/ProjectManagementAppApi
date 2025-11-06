const express = require("express");
const { body } = require("express-validator");
const TaskController = require("../controllers/taskController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { requireProjectRole } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Validaciones
const taskValidation = [
  body("titulo").notEmpty().withMessage("El título es requerido"),
  body("id_proyecto").isInt().withMessage("ID de proyecto inválido"),
  body("descripcion").optional(),
  body("id_asignado")
    .optional()
    .isInt()
    .withMessage("ID de usuario asignado inválido"),
  body("fecha_vencimiento")
    .optional()
    .isDate()
    .withMessage("Fecha de vencimiento inválida"),
];

const statusValidation = [
  body("estado")
    .isIn(["pendiente", "en progreso", "completada"])
    .withMessage("Estado inválido"),
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Crear una nueva tarea (Creador o Líder)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - id_proyecto
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "Implementar funcionalidad de login"
 *               descripcion:
 *                 type: string
 *                 example: "Desarrollar el sistema de autenticación JWT"
 *               id_proyecto:
 *                 type: integer
 *                 example: 1
 *               id_asignado:
 *                 type: integer
 *                 example: 2
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *     responses:
 *       201:
 *         description: Tarea creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Error de validación
 *       403:
 *         description: No tiene permisos para crear tareas
 */
router.post(
  "/",
  requireProjectRole(["creador", "lider"]),
  taskValidation,
  TaskController.createTask
);

/**
 * @swagger
 * /api/tasks/proyecto/{id}:
 *   get:
 *     summary: Obtener todas las tareas de un proyecto
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     responses:
 *       200:
 *         description: Lista de tareas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       403:
 *         description: No tiene acceso a este proyecto
 */
router.get(
  "/proyecto/:id",
  requireProjectRole(["creador", "lider", "colaborador"]),
  TaskController.getProjectTasks
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Actualizar una tarea (Creador o Líder)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarea
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en progreso, completada]
 *               id_asignado:
 *                 type: integer
 *               fecha_vencimiento:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Tarea actualizada exitosamente
 *       403:
 *         description: No tiene permisos para editar esta tarea
 *       404:
 *         description: Tarea no encontrada
 */
router.put(
  "/:id",
  requireProjectRole(["creador", "lider"]),
  taskValidation,
  TaskController.updateTask
);

/**
 * @swagger
 * /api/tasks/{id}/completar:
 *   patch:
 *     summary: Cambiar estado de una tarea (Todos los miembros)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarea
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, en progreso, completada]
 *                 example: "en progreso"
 *     responses:
 *       200:
 *         description: Estado de tarea actualizado exitosamente
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Tarea no encontrada
 */
router.patch(
  "/:id/completar",
  requireProjectRole(["creador", "lider", "colaborador"]),
  statusValidation,
  TaskController.completeTask
);

/**
 * @swagger
 * /api/tasks/{id}/upload:
 *   post:
 *     summary: Subir archivo adjunto a una tarea (Todos los miembros)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarea
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: No se subió ningún archivo o archivo inválido
 *       404:
 *         description: Tarea no encontrada
 */
router.post(
  "/:id/upload",
  requireProjectRole(["creador", "lider", "colaborador"]),
  TaskController.uploadFile
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Eliminar una tarea (Solo Creador)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarea
 *     responses:
 *       200:
 *         description: Tarea eliminada exitosamente
 *       403:
 *         description: No tiene permisos para eliminar esta tarea
 *       404:
 *         description: Tarea no encontrada
 */
router.delete(
  "/:id",
  requireProjectRole(["creador"]),
  TaskController.deleteTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Obtener una tarea específica por ID
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarea
 *     responses:
 *       200:
 *         description: Tarea obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         description: Tarea no encontrada
 *       403:
 *         description: No tiene acceso a esta tarea
 */
router.get(
  "/:id",
  requireProjectRole(["creador", "lider", "colaborador"]),
  TaskController.getTaskById
);

module.exports = router;
