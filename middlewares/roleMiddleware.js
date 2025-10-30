const { pool } = require('../config/db');

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
      const projectId = req.params.id || req.body.id_proyecto;
      
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
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error verificando roles del proyecto' 
      });
    }
  };
};

module.exports = { requireAdmin, requireProjectRole };