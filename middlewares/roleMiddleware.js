const requireProjectRole = (roles) => {
  return async (req, res, next) => {
    try {
      let projectId;

      // Caso 1: Rutas de proyecto (baseUrl incluye '/projects')
      if (req.baseUrl.includes('/projects')) {
        projectId = req.params.id;
        if (!projectId) {
          return res.status(400).json({
            success: false,
            message: 'ID de proyecto no proporcionado en la ruta'
          });
        }
      }
      // Caso 2: Rutas de tareas que tienen projectId en la URL (como /tasks/proyecto/:id)
      else if (req.baseUrl.includes('/tasks') && req.originalUrl.includes('/proyecto/')) {
        projectId = req.params.id;
      }
      // Caso 3: Rutas de tareas individuales (necesitan buscar el projectId de la tarea)
      else if (req.baseUrl.includes('/tasks') && req.params.id && !req.originalUrl.includes('/proyecto/')) {
        const taskId = req.params.id;
        const task = await TaskModel.findById(taskId);
        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }
        projectId = task.id_proyecto;
        req.task = task; // Guardar la tarea para reutilizar en el controlador
      }
      // Caso 4: ProjectId en el body (para crear tareas, etc.)
      else if (req.body.id_proyecto) {
        projectId = req.body.id_proyecto;
      }
      else {
        return res.status(400).json({
          success: false,
          message: 'ID de proyecto no proporcionado'
        });
      }

      // Verificar que el usuario tiene acceso al proyecto y el rol requerido
      const [projectRoles] = await pool.execute(
        `SELECT up.rol_proyecto 
         FROM usuarios_proyectos up 
         WHERE up.id_usuario = ? AND up.id_proyecto = ?`,
        [req.user.id_usuario, projectId]
      );

      if (projectRoles.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes acceso a este proyecto' 
        });
      }

      const userRole = projectRoles[0].rol_proyecto;
      
      if (!roles.includes(userRole) && req.user.rol_global !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}` 
        });
      }

      req.user.projectRole = userRole;
      req.projectId = projectId;
      next();
    } catch (error) {
      console.error('Error en middleware requireProjectRole:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verificando roles del proyecto' 
      });
    }
  };
};

module.exports = { requireProjectRole };