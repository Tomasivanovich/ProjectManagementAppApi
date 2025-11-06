const { pool } = require('../config/db');
const TaskModel = require('../models/taskModel');

const requireAdmin = (req, res, next) => {
  if (req.user.rol_global !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Se requieren privilegios de administrador' 
    });
  }
  next();
};

const requireProjectRole = (roles) => {
  return async (req, res, next) => {
    try {
      let projectId = req.params.projectId || req.body.id_proyecto;
      
      console.log('🔍 ===== MIDDLEWARE requireProjectRole INICIO =====');
      console.log('📋 Ruta completa:', req.method, req.originalUrl);
      console.log('👤 Usuario:', {
        id: req.user.id_usuario,
        rol_global: req.user.rol_global,
        email: req.user.email
      });
      console.log('📍 ProjectId inicial:', projectId);

      // Si estamos en una ruta de tarea individual (/tasks/:id) y no tenemos projectId, obtenerlo de la tarea
      if (!projectId && req.params.id && req.baseUrl.includes('/tasks')) {
        console.log('🔄 Buscando projectId desde la tarea con ID:', req.params.id);
        const task = await TaskModel.findById(req.params.id);
        
        if (!task) {
          console.log('❌ Tarea no encontrada');
          return res.status(404).json({
            success: false,
            message: 'Tarea no encontrada'
          });
        }
        
        projectId = task.id_proyecto;
        console.log('✅ Tarea encontrada:', {
          id_tarea: task.id_tarea,
          titulo: task.titulo,
          id_proyecto: task.id_proyecto,
          id_creador: task.id_creador,
          id_asignado: task.id_asignado
        });
        // Guardar la tarea en el request para reutilizarla
        req.task = task;
      }

      if (!projectId) {
        console.log('❌ ProjectId no encontrado');
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

      console.log('📊 Resultado de la consulta:', {
        filasEncontradas: projectRoles.length,
        datos: projectRoles
      });

      if (projectRoles.length === 0) {
        console.log('❌ USUARIO NO ES MIEMBRO DEL PROYECTO - Bloqueando acceso');
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