const express = require('express');
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo admin puede listar todos los usuarios
router.get('/', requireAdmin, UserController.getAllUsers);

// Cualquier usuario autenticado puede ver su perfil, pero se verifica en el controlador si es el propio usuario o admin
router.get('/:id', UserController.getUserProfile);

// Actualizar usuario (el propio usuario o admin)
router.put('/:id', UserController.updateUser);

// Eliminar usuario (solo admin)
router.delete('/:id', requireAdmin, UserController.deleteUser);

module.exports = router;