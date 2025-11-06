const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const UserModel = require("../models/userModel");
const jwtConfig = require("../config/jwt");
const { OAuth2Client } = require("google-auth-library");
const axios = require('axios'); 

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

class AuthController {
  // Registro normal
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });

      const { nombre, email, password } = req.body;
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser)
        return res
          .status(400)
          .json({ success: false, message: "El email ya está registrado" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await UserModel.create({
        nombre,
        email,
        password: hashedPassword,
      });

      const token = jwt.sign({ id: userId, email }, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
      });

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          token,
          user: { id: userId, nombre, email, rol_global: "usuario" },
        },
      });
    } catch (error) {
      console.error("Error en registro:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Login normal
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({
          success: false,
          message: "Errores de validación",
          errors: errors.array(),
        });

      const { email, password } = req.body;
      const user = await UserModel.findByEmail(email);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "Credenciales inválidas" });

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        return res
          .status(401)
          .json({ success: false, message: "Credenciales inválidas" });

      const token = jwt.sign(
        { id: user.id_usuario, email: user.email },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      res.json({
        success: true,
        message: "Login exitoso",
        data: { token, user },
      });
    } catch (error) {
      console.error("Error en login:", error);
      res
        .status(500)
        .json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token)
        return res
          .status(401)
          .json({ success: false, message: "Token requerido" });

      const decoded = jwt.verify(token, jwtConfig.secret);
      const user = await UserModel.findById(decoded.id);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "Usuario no encontrado" });

      const newToken = jwt.sign(
        { id: user.id_usuario, email: user.email },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
      );

      res.json({ success: true, data: { token: newToken, user } });
    } catch (error) {
      console.error("Error refreshToken:", error);
      res.status(403).json({ success: false, message: "Token inválido" });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res
          .status(400)
          .json({ success: false, message: "Access token es requerido" });
      }

      console.log(
        "Google access_token recibido:",
        access_token.substring(0, 20) + "..."
      );

      // Verificar el token con Google usando access_token
      const userInfoResponse = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      console.log("Respuesta de Google:", userInfoResponse.data);

      const { email, name: nombre, picture } = userInfoResponse.data;

      if (!email) {
        return res
          .status(400)
          .json({
            success: false,
            message: "No se pudo obtener el email de Google",
          });
      }

      let user = await UserModel.findByEmail(email);

      if (!user) {
        const userId = await UserModel.create({
          nombre: nombre || email.split("@")[0],
          email,
          password: null,
          avatar: picture,
        });
        user = await UserModel.findById(userId);
      }

      const token = jwt.sign(
        { id: user.id_usuario, email: user.email },
        jwtConfig.secret,
        {
          expiresIn: jwtConfig.expiresIn,
        }
      );

      res.json({
        success: true,
        message: "Login con Google exitoso",
        data: { token, user },
      });
    } catch (error) {
      console.error("Error login Google:", error);

      // Error más específico
      if (error.response?.status === 401) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Token de Google inválido o expirado",
          });
      }

      if (error.response?.data) {
        console.error("Error de Google API:", error.response.data);
      }

      res
        .status(500)
        .json({
          success: false,
          message: "Error en login Google: " + error.message,
        });
    }
  }

  // Login con Discord
  static async discordLogin(req, res) {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res
          .status(400)
          .json({ success: false, message: "Access token es requerido" });
      }

      // Obtener información del usuario de Discord
      const userInfoResponse = await axios.get(
        "https://discord.com/api/users/@me",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const { id, username, email, avatar } = userInfoResponse.data;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "No se pudo obtener el email de Discord",
        });
      }

      let user = await UserModel.findByEmail(email);

      if (!user) {
        const nombre = username;
        const discordAvatar = avatar
          ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
          : null;

        const userId = await UserModel.create({
          nombre,
          email,
          password: null,
          avatar: discordAvatar,
        });
        user = await UserModel.findById(userId);
      }

      const token = jwt.sign(
        { id: user.id_usuario, email: user.email },
        jwtConfig.secret,
        {
          expiresIn: jwtConfig.expiresIn,
        }
      );

      res.json({
        success: true,
        message: "Login con Discord exitoso",
        data: { token, user },
      });
    } catch (error) {
      console.error("Error login Discord:", error);
      res
        .status(500)
        .json({ success: false, message: "Error en login Discord" });
    }
  }
}

module.exports = AuthController;
