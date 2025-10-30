const { validationResult } = require('express-validator');
const UserModel = require('../models/userModel');

class UserController {
  static async getAllUsers(req, res) {
    try {
      const users = await UserModel.findAll();
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async getUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const user = await UserModel.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const userId = req.params.id;
      
      // Verificar permisos (solo admin o el propio usuario)
      if (req.user.rol_global !== 'admin' && req.user.id_usuario != userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este usuario'
        });
      }

      const { nombre, email } = req.body;
      const updated = await UserModel.update(userId, { nombre, email });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const updatedUser = await UserModel.findById(userId);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;

      // Solo admin puede eliminar usuarios
      if (req.user.rol_global !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Se requieren privilegios de administrador'
        });
      }

      // No permitir auto-eliminación
      if (req.user.id_usuario == userId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta'
        });
      }

      const deleted = await UserModel.delete(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = UserController;