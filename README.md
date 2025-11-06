# Project Management Backend

Backend completo para sistema de gestión de proyectos desarrollado con Node.js, Express y MySQL.

## Características

- Autenticación JWT
- Roles y permisos (Admin, Creador, Líder, Colaborador)
- Gestión de proyectos y tareas
- API RESTful documentada

## Prerrequisitos

- Node.js 14+
- MySQL 5.7+

## Instalación

1. **Clonar el proyecto**
   ```bash
   git clone <repository-url>
   cd backend
Instalar dependencias

      npm install
   
Configurar variables de entorno

      .env.example .env
      Editar .env con tus configuraciones:

      .env
      PORT=5000
      DB_HOST=localhost
      DB_USER=root
      DB_PASS=tu_password
      DB_NAME=project_management
      JWT_SECRET=tu_clave_jwt_key

Inicializar base de datos

      npm run init-db

Ejecutar servidor

# Desarrollo
      npm run dev

# Producción
      
      npm start
Estructura de Base de Datos

El script automáticamente crea las tablas:

usuarios - Gestión de usuarios

proyectos - Proyectos del sistema

usuarios_proyectos - Relación usuarios-proyectos con roles

tareas - Tareas de los proyectos

Documentación de API
Una vez ejecutado el servidor, accede a:
http://localhost:5000/api/docs

Autenticación
Incluye registro, login y refresh token. Usa JWT para autenticación.

Usuario por defecto:
Email: admin@example.com

Password: admin123

Rol: admin

Endpoints Principales

Autenticación
POST /api/auth/register - Registrar usuario

POST /api/auth/login - Iniciar sesión

POST /api/auth/refresh - Refrescar token

Usuarios
GET /api/users - Listar usuarios (admin)

GET /api/users/:id - Obtener perfil

PUT /api/users/:id - Actualizar usuario

DELETE /api/users/:id - Eliminar usuario (admin)

Proyectos
POST /api/projects - Crear proyecto

GET /api/projects - Listar proyectos del usuario

GET /api/projects/:id - Obtener proyecto específico

PUT /api/projects/:id - Actualizar proyecto

DELETE /api/projects/:id - Eliminar proyecto

POST /api/projects/:id/invitar - Invitar usuario

PATCH /api/projects/:id/asignar-rol - Asignar rol

Tareas
POST /api/tasks - Crear tarea

GET /api/tasks/proyecto/:id - Tareas de proyecto

PUT /api/tasks/:id - Actualizar tarea

PATCH /api/tasks/:id/completar - Cambiar estado

DELETE /api/tasks/:id - Eliminar tarea

Roles y Permisos
Roles Globales
admin: Acceso total al sistema

usuario: Acceso limitado a sus proyectos

Roles por Proyecto
creador: Control total del proyecto

lider: Crear y asignar tareas

colaborador: Completar tareas 

Ejemplos de Uso
Registro

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "123456"
  }'
  
Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "123456"
  }'
  
Crear Proyecto
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer <tu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Mi Proyecto",
    "descripcion": "Descripción del proyecto"
  }'
  
Solución de Problemas
Error de conexión a BD: Verificar credenciales en .env

Puerto en uso: Cambiar PORT en .env

Error JWT: Verificar JWT_SECRET en .env
