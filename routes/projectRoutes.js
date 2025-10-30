const express = require('express');
const { body } = require('express-validator');
const ProjectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireProjectRole } = require('../middlewares/roleMiddleware');
const { pool } = require('../config/db');

const router = express.Router();

// Validaciones
const projectValidation = [
  body('nombre').notEmpty().withMessage('El nombre del proyecto es requerido'),
  body('descripcion').optional()
];

const inviteValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('rol_proyecto').isIn(['creador', 'lider', 'colaborador']).withMessage('Rol inválido')
];

const roleValidation = [
  body('id_usuario').isInt().withMessage('ID de usuario inválido'),
  body('rol_proyecto').isIn(['creador', 'lider', 'colaborador']).withMessage('Rol inválido')
];

const removeUserValidation = [
  body('id_usuario').isInt().withMessage('ID de usuario inválido')
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Crear un nuevo proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Mi Proyecto"
 *               descripcion:
 *                 type: string
 *                 example: "Descripción del proyecto"
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
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
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Error de validación
 */
router.post('/', projectValidation, ProjectController.createProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Obtener todos los proyectos del usuario
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proyectos obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/', ProjectController.getUserProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Obtener detalles de un proyecto específico
 *     tags: [Proyectos]
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
 *         description: Detalles del proyecto obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_proyecto:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     descripcion:
 *                       type: string
 *                     fecha_creacion:
 *                       type: string
 *                       format: date-time
 *                     id_creador:
 *                       type: integer
 *                     creador_nombre:
 *                       type: string
 *                     usuarios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_usuario:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           email:
 *                             type: string
 *                           rol_proyecto:
 *                             type: string
 *                     estadisticas:
 *                       type: object
 *                       properties:
 *                         total_usuarios:
 *                           type: integer
 *                         total_tareas:
 *                           type: integer
 *                         tareas_completadas:
 *                           type: integer
 *                         tareas_en_progreso:
 *                           type: integer
 *                         tareas_pendientes:
 *                           type: integer
 *       403:
 *         description: No tiene acceso a este proyecto
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/:id', ProjectController.getProjectById);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Actualizar un proyecto (Solo Creador)
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proyecto actualizado exitosamente
 *       403:
 *         description: No tiene permisos para editar este proyecto
 */
router.put('/:id', requireProjectRole(['creador']), projectValidation, ProjectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Eliminar un proyecto (Solo Creador)
 *     tags: [Proyectos]
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
 *         description: Proyecto eliminado exitosamente
 *       403:
 *         description: No tiene permisos para eliminar este proyecto
 */
router.delete('/:id', requireProjectRole(['creador']), ProjectController.deleteProject);

/**
 * @swagger
 * /api/projects/{id}/invite:
 *   post:
 *     summary: Invitar usuario a un proyecto (Creador o Líder)
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@example.com"
 *               rol_proyecto:
 *                 type: string
 *                 enum: [creador, lider, colaborador]
 *                 default: colaborador
 *     responses:
 *       200:
 *         description: Usuario invitado exitosamente
 *       400:
 *         description: El usuario ya está en el proyecto o no puedes invitarte a ti mismo
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/:id/invite', requireProjectRole(['creador', 'lider']), inviteValidation, ProjectController.inviteUser);

/**
 * @swagger
 * /api/projects/{id}/role:
 *   patch:
 *     summary: Asignar rol a usuario en el proyecto (Solo Creador)
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *               - rol_proyecto
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *               rol_proyecto:
 *                 type: string
 *                 enum: [creador, lider, colaborador]
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *       400:
 *         description: No puedes cambiar el rol del creador del proyecto
 *       403:
 *         description: Solo el creador del proyecto puede asignar roles
 *       404:
 *         description: Usuario no encontrado en el proyecto
 */
router.patch('/:id/role', requireProjectRole(['creador']), roleValidation, ProjectController.assignRole);

/**
 * @swagger
 * /api/projects/{id}/members:
 *   delete:
 *     summary: Remover usuario del proyecto (Solo Creador)
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Usuario removido exitosamente
 *       400:
 *         description: No se puede remover al creador del proyecto
 *       404:
 *         description: Usuario no encontrado en el proyecto
 */
router.delete('/:id/members', requireProjectRole(['creador']), removeUserValidation, ProjectController.removeUserFromProject);

/**
 * @swagger
 * /api/projects/{id}/users/search:
 *   get:
 *     summary: Buscar usuarios para invitar al proyecto
 *     tags: [Proyectos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del proyecto
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre o email)
 *     responses:
 *       200:
 *         description: Lista de usuarios encontrados
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
 *                     type: object
 *                     properties:
 *                       id_usuario:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       email:
 *                         type: string
 */
router.get('/:id/users/search', requireProjectRole(['creador', 'lider']), ProjectController.searchUsersToInvite);

/**
 * @swagger
 * /api/projects/{id}/tasks:
 *   get:
 *     summary: Obtener todas las tareas relacionadas con un proyecto
 *     tags: [Proyectos]
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
 *                     type: object
 *                     properties:
 *                       id_tarea:
 *                         type: integer
 *                       titulo:
 *                         type: string
 *                       descripcion:
 *                         type: string
 *                       estado:
 *                         type: string
 *                         enum: [pendiente, en_progreso, completada]
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       asignado_a:
 *                         type: integer
 *                         description: ID del usuario asignado
 *       404:
 *         description: No se encontraron tareas para este proyecto
 */
router.get('/:id/tasks', async (req, res) => {
  const { id } = req.params;

  try {
    const [tareas] = await pool.query(
      `
      SELECT 
        t.id_tarea,
        t.titulo,
        t.descripcion,
        t.estado,
        t.fecha_creacion,
        t.id_proyecto,
        t.id_asignado AS asignado_a,
        u.nombre AS asignado_nombre
      FROM tareas t
      LEFT JOIN usuarios u ON t.id_asignado = u.id_usuario
      WHERE t.id_proyecto = ?
      ORDER BY t.fecha_creacion DESC
      `,
      [id]
    );

    if (!tareas.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.json({ success: true, data: tareas });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ success: false, message: 'Error del servidor al obtener tareas' });
  }
});

router.get('/:id/debug/user/:userId', ProjectController.debugProjectAssignment);

module.exports = router;