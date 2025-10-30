const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const { testConnection } = require("./config/db");

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de seguridad
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:19006",
      "http://192.168.100.30:3000",
      "http://192.168.100.30:19006",
      "exp://192.168.100.30:19000",
      'http://localhost:8081',
      "https://nlnrgs0-el_gordo_dev-8081.exp.direct",
    ],
    credentials: true,
  })
);
// Middlewares generales
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuración de Swagger
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Project Management API",
      version: "1.0.0",
      description:
        "API para sistema de gestión de proyectos con autenticación JWT",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id_usuario: { type: "integer" },
            nombre: { type: "string" },
            email: { type: "string" },
            rol_global: { type: "string", enum: ["admin", "usuario"] },
            fecha_creacion: { type: "string", format: "date-time" },
          },
        },
        Project: {
          type: "object",
          properties: {
            id_proyecto: { type: "integer" },
            nombre: { type: "string" },
            descripcion: { type: "string" },
            fecha_creacion: { type: "string", format: "date-time" },
            id_creador: { type: "integer" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id_tarea: { type: "integer" },
            id_proyecto: { type: "integer" },
            titulo: { type: "string" },
            descripcion: { type: "string" },
            estado: {
              type: "string",
              enum: ["pendiente", "en progreso", "completada"],
            },
            archivo: { type: "string" },
            id_asignado: { type: "integer" },
            fecha_creacion: { type: "string", format: "date-time" },
            fecha_vencimiento: { type: "string", format: "date" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                token: { type: "string" },
                user: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // archivos que contienen la documentación
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

// Documentación Swagger
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta de bienvenida
app.get("/", (req, res) => {
  res.json({
    message: "Bienvenido a la API de Gestión de Proyectos",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// Manejo de errores 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

// Inicializar servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    await testConnection();

    // Crear carpeta uploads si no existe
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    app.listen(PORT, () => {
      console.log(` Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(
        ` Documentación disponible en http://localhost:${PORT}/api/docs`
      );
    });
  } catch (error) {
    console.error(" No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();
