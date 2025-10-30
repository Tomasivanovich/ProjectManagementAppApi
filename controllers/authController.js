const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/userModel');
const jwtConfig = require('../config/jwt');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

class AuthController {
  // Registro normal
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Errores de validación', errors: errors.array() });

      const { nombre, email, password } = req.body;
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) return res.status(400).json({ success: false, message: 'El email ya está registrado' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await UserModel.create({ nombre, email, password: hashedPassword });

      const token = jwt.sign({ id: userId, email }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: { token, user: { id: userId, nombre, email, rol_global: 'usuario' } }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Login normal
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Errores de validación', errors: errors.array() });

      const { email, password } = req.body;
      const user = await UserModel.findByEmail(email);
      if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

      const token = jwt.sign({ id: user.id_usuario, email: user.email }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

      res.json({ success: true, message: 'Login exitoso', data: { token, user } });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'Token requerido' });

      const decoded = jwt.verify(token, jwtConfig.secret);
      const user = await UserModel.findById(decoded.id);
      if (!user) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

      const newToken = jwt.sign({ id: user.id_usuario, email: user.email }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

      res.json({ success: true, data: { token: newToken, user } });
    } catch (error) {
      console.error('Error refreshToken:', error);
      res.status(403).json({ success: false, message: 'Token inválido' });
    }
  }

  // Login con Google
  static async googleLogin(req, res) {
    try {
      const { id_token } = req.body;
      if (!id_token) return res.status(400).json({ success: false, message: 'ID token es requerido' });

      const ticket = await client.verifyIdToken({ idToken: id_token, audience: CLIENT_ID });
      const payload = ticket.getPayload();
      const email = payload.email;
      const nombre = payload.name;

      let user = await UserModel.findByEmail(email);

      if (!user) {
        const userId = await UserModel.create({ nombre, email, password: null });
        user = { id_usuario: userId, nombre, email, rol_global: 'usuario' };
      }

      const token = jwt.sign({ id: user.id_usuario, email: user.email }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

      res.json({ success: true, message: 'Login con Google exitoso', data: { token, user } });
    } catch (error) {
      console.error('Error login Google:', error);
      res.status(500).json({ success: false, message: 'Error en login Google' });
    }
  }
}

module.exports = AuthController;
