const requireProjectRole = (roles) => {
  return async (req, res, next) => {
    try {
      let projectId;
      
      console.log('🔍 Middleware requireProjectRole ejecutándose');
      console.log('📋 Ruta:', req.method, req.originalUrl);
      console.log('👤 Usuario:', req.user.id_usuario);

      // DIFERENCIAR CLARAMENTE ENTRE RUTAS DE PROYECTO Y TAREAS
      
      // Caso 1: Rutas de proyecto (tienen projectId en params) - baseUrl incluye '/projects'
      if (req.baseUrl.includes('/projects') && req.params.id) {
        projectId = req.params.id;
        console.log('🏢 Usando projectId de parámetros de ruta de proyecto:', projectId);
      }
      // Caso 2: Ruta de tareas por proyecto (ruta específica: /api/tasks/proyecto/:id)
      else if (req.baseUrl.includes('/tasks') && req.originalUrl.includes('/tasks/proyecto/') && req.params.id) {
        projectId = req.params.id;
        console.log('📁 Ruta de tareas por proyecto, projectId:', projectId);
      }
      // Caso 3: Rutas de tareas individuales (necesitan buscar el projectId)
      else if (req.baseUrl.includes('/tasks') && req.params.id) {
        console.log('📝 Ruta de tarea individual, buscando projectId para taskId:', req.params.id);
        const task = await TaskModel.findById(req.params.id);
        
        if (!task) {
          console.log('❌ Tarea no encontrada');
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }
        
        projectId = task.id_proyecto;
        console.log('✅ ProjectId encontrado desde tarea:', projectId);
        req.task = task; // Guardar para reutilizar en el controlador
      }
      // Caso 4: ProjectId en el body (para crear tareas, etc.)
      else if (req.body.id_proyecto) {
        projectId = req.body.id_proyecto;
        console.log('📦 Usando projectId del body:', projectId);
      }
      else {
        console.log('❌ No se pudo determinar el projectId');
        return res.status(400).json({
          success: false,
          message: 'ID de proyecto no proporcionado'
        });
      }

      console.log('🎯 ProjectId final para verificación:', projectId);
      console.log('👤 Verificando permisos para usuario:', req.user.id_usuario, 'en proyecto:', projectId);

      const [projectRoles] = await pool.execute(
        `SELECT up.rol_proyecto 
         FROM usuarios_proyectos up 
         WHERE up.id_usuario = ? AND up.id_proyecto = ?`,
        [req.user.id_usuario, projectId]
      );

      console.log('📊 Roles encontrados:', projectRoles);

      if (projectRoles.length === 0) {
        console.log('❌ Usuario no es miembro del proyecto');
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes acceso a este proyecto' 
        });
      }

      const userRole = projectRoles[0].rol_proyecto;
      
      if (!roles.includes(userRole) && req.user.rol_global !== 'admin') {
        console.log('❌ Rol insuficiente. Rol del usuario:', userRole, 'Roles requeridos:', roles);
        return res.status(403).json({ 
          success: false, 
          message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}` 
        });
      }

      console.log('✅ Permisos verificados. Rol del usuario:', userRole);
      
      req.user.projectRole = userRole;
      req.projectId = projectId;
      next();
    } catch (error) {
      console.error('❌ Error en middleware requireProjectRole:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verificando roles del proyecto' 
      });
    }
  };
};

module.exports = { requireAdmin, requireProjectRole };