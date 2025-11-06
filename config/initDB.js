const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Connect sin selecccionar database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      multipleStatements: true 
    });

    console.log('Conectado al servidor MySQL');

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Base de datos '${process.env.DB_NAME}' creada/verificada`);

    // Cerrar conexión inicial y reconectar a la base de datos específica
    await connection.end();

    // Reconectar a la base de datos específica
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log(`Conectado a la base de datos '${process.env.DB_NAME}'`);

    console.log('Creando tablas...');

    // Tabla usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol_global ENUM('admin', 'usuario') DEFAULT 'usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla "usuarios" creada/verificada');

    // Tabla proyectos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS proyectos (
        id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        id_creador INT,
        FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
      )
    `);
    console.log('Tabla "proyectos" creada/verificada');

    // Tabla usuarios_proyectos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios_proyectos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT,
        id_proyecto INT,
        rol_proyecto ENUM('creador', 'lider', 'colaborador') DEFAULT 'colaborador',
        fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_project (id_usuario, id_proyecto),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto) ON DELETE CASCADE
      )
    `);
    console.log('Tabla "usuarios_proyectos" creada/verificada');

    // Tabla tareas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tareas (
        id_tarea INT AUTO_INCREMENT PRIMARY KEY,
        id_proyecto INT,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('pendiente', 'en progreso', 'completada') DEFAULT 'pendiente',
        id_asignado INT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento DATE,
        FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto) ON DELETE CASCADE,
        FOREIGN KEY (id_asignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      )
    `);
    console.log('Tabla "tareas" creada/verificada');

    console.log('Todas las tablas creadas exitosamente');

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    try {
      const [result] = await connection.execute(
        'INSERT IGNORE INTO usuarios (nombre, email, password, rol_global) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin@example.com', hashedPassword, 'admin']
      );

      if (result.affectedRows > 0) {
        console.log('Usuario administrador creado: admin@example.com / admin123');
      } else {
        console.log('ℹUsuario administrador ya existe');
      }

    } catch (error) {
      console.log('ℹUsuario administrador ya existe o error al crearlo:', error.message);
    }

    const testHashedPassword = await bcrypt.hash('usuario123', 10);
    try {
      const [result] = await connection.execute(
        'INSERT IGNORE INTO usuarios (nombre, email, password, rol_global) VALUES (?, ?, ?, ?)',
        ['Usuario de Prueba', 'usuario@example.com', testHashedPassword, 'usuario']
      );

      if (result.affectedRows > 0) {
        console.log('Usuario de prueba creado: usuario@example.com / usuario123');
      } else {
        console.log('ℹUsuario de prueba ya existe');
      }

    } catch (error) {
      console.log('ℹUsuario de prueba ya existe o error al crearlo:', error.message);
    }

    console.log('\nBase de datos inicializada exitosamente!');
    console.log('\nCredenciales de acceso:');
    console.log('   Admin: admin@example.com / admin123');
    console.log('   Usuario: usuario@example.com / usuario123');

  } catch (error) {
    console.error('Error inicializando la base de datos:', error.message);
    console.error('Detalles:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexión a la base de datos cerrada');
    }
    process.exit();
  }
};

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('Error no manejado:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
  process.exit(1);
});

initDatabase();