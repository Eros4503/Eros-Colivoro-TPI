// Importar módulos necesarios
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const multer = require('multer'); // <--- AÑADIR ESTA LÍNEA
const fs = require('fs'); // <--- AÑADIR ESTA LÍNEA para manejo de sistema de archivos

const app = express();
const port = 2890;

app.use(cors());
// app.use(bodyParser.json()); // Comentar o quitar si multer va a manejar todos los request bodies
// app.use(bodyParser.urlencoded({ extended: true })); // Comentar o quitar
app.use(express.static('publica')); // Esto ya sirve archivos estáticos de la carpeta 'publica'

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bd_colegioguevara',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos establecida');
});

// --- Configuración de Multer para la subida de fotos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'publica', 'uploads', 'fotos_perfil');
        // Asegúrate de que la carpeta exista. En un entorno de producción, es mejor crearla si no existe.
        // Para desarrollo, a menudo la creas manualmente una vez.
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Genera un nombre de archivo único para evitar colisiones
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, req.params.id + '-' + uniqueSuffix + fileExtension); // Ejemplo: 7-167888888-123.jpg
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, GIF.'), false);
        }
    }
});


// Middleware para parsear JSON y URL-encoded (solo donde no se use multer.single o .array)
// Es crucial que bodyParser.json() y bodyParser.urlencoded() NO se usen para rutas que manejan 'multipart/form-data'
// Usaremos app.use(express.json()) y app.use(express.urlencoded({ extended: true }))
// para evitar conflictos con Multer en otras rutas.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Rutas para servir archivos HTML (Mantener como están)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'login.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'registro.html'));
});

app.get('/alumno', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'alumno.html'));
});

// **Añade esta línea para servir perfil.html**
app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'perfil.html'));
});

app.get('/profesor', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'dashboard_profesor.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'dashboard.html'));
});

app.get('/sitio', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'sitio.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'publica', 'admin_dashboard.html'));
});

// Ruta para el login de usuarios (Mantener como está)
app.post('/api/login', (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
        return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos' });
    }

    const query = `SELECT id, nombre_completo, email, tipo_usuario, contrasena, curso, nombre_usuario, foto_perfil_url FROM usuarios WHERE nombre_usuario = ?`; // Añadido 'foto_perfil_url'
    db.query(query, [nombre_usuario], async (err, results) => {
        if (err) {
            console.error('Error al buscar usuario:', err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = results[0];

        if (!user.contrasena) {
            console.error('Error: Hash de contraseña no encontrado para el usuario');
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        try {
            const match = await bcrypt.compare(contrasena, user.contrasena);

            if (match) {
                res.json({
                    message: 'Login exitoso',
                    id: user.id,
                    nombre_completo: user.nombre_completo,
                    email: user.email,
                    nombre_usuario: nombre_usuario,
                    tipo_usuario: user.tipo_usuario,
                    curso: user.curso,
                    foto_perfil_url: user.foto_perfil_url // Incluye la URL de la foto
                });
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } catch (error) {
            console.error('Error al comparar contraseñas:', error);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    });
});

// Ruta para el registro de nuevos usuarios (Mantener como está, puedes añadir foto_perfil_url si quieres en el registro)
app.post('/api/registro', async (req, res) => {
    const { nombre_completo, email, nombre_usuario, contrasena, tipo_usuario, curso } = req.body;

    if (!nombre_completo || !email || !nombre_usuario || !contrasena || !tipo_usuario) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    try {
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        // Asegúrate de que la columna foto_perfil_url tiene un DEFAULT en la DB o aquí
        const query = 'INSERT INTO usuarios (nombre_completo, email, nombre_usuario, contrasena, tipo_usuario, curso) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(query, [nombre_completo, email, nombre_usuario, hashedPassword, tipo_usuario, curso], (err, result) => {
            if (err) {
                console.error('Error al registrar usuario:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    if (err.sqlMessage.includes('email')) {
                        return res.status(409).json({ error: 'El email ya está registrado.' });
                    }
                    if (err.sqlMessage.includes('nombre_usuario')) {
                        return res.status(409).json({ error: 'El nombre de usuario ya está en uso.' });
                    }
                }
                res.status(500).json({ error: 'Error al registrar usuario' });
                return;
            }
            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    } catch (error) {
        console.error('Error al hashear la contraseña:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// Ruta para obtener todos los cursos (Mantener como está)
app.get('/api/cursos', (req, res) => {
    const query = 'SELECT * FROM cursos';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener cursos:', err);
            res.status(500).json({ error: 'Error al obtener cursos' });
            return;
        }
        res.json({ cursos: results });
    });
});

// --- ENDPOINTS PARA ADMINISTRACIÓN DE USUARIOS Y GESTIÓN DE PERFIL ---

// Ruta para obtener UN usuario por ID
// Modificada para incluir foto_perfil_url
app.get('/api/usuarios/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'SELECT id, nombre_completo, email, nombre_usuario, tipo_usuario, curso, foto_perfil_url FROM usuarios WHERE id = ?'; // <--- AÑADIR foto_perfil_url
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener usuario por ID:', err);
            return res.status(500).json({ error: 'Error al obtener usuario.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.json({ usuario: results[0] });
    });
});

// Ruta para actualizar datos de texto de un usuario (PUT) - Mantenemos esta para datos no-archivo
app.put('/api/usuarios/:id', async (req, res) => {
    const userId = req.params.id;
    const { nombre_completo, email, nombre_usuario, tipo_usuario, curso, contrasena } = req.body;

    let updateFields = [];
    let updateParams = [];

    if (nombre_completo !== undefined) { updateFields.push('nombre_completo = ?'); updateParams.push(nombre_completo); }
    if (email !== undefined) { updateFields.push('email = ?'); updateParams.push(email); }
    if (nombre_usuario !== undefined) { updateFields.push('nombre_usuario = ?'); updateParams.push(nombre_usuario); }
    if (tipo_usuario !== undefined) { updateFields.push('tipo_usuario = ?'); updateParams.push(tipo_usuario); }
    if (curso !== undefined) { updateFields.push('curso = ?'); updateParams.push(curso); }

    if (contrasena) {
        try {
            const hashedPassword = await bcrypt.hash(contrasena, 10);
            updateFields.push('contrasena = ?');
            updateParams.push(hashedPassword);
        } catch (hashError) {
            console.error('Error al hashear la nueva contraseña:', hashError);
            return res.status(500).json({ error: 'Error al procesar la contraseña.' });
        }
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    const query = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`;
    updateParams.push(userId);

    db.query(query, updateParams, (err, result) => {
        if (err) {
            console.error('Error al actualizar usuario:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.sqlMessage.includes('email')) {
                    return res.status(409).json({ error: 'El email ya está en uso por otro usuario.' });
                }
                if (err.sqlMessage.includes('nombre_usuario')) {
                    return res.status(409).json({ error: 'El nombre de usuario ya está tomado.' });
                }
            }
            return res.status(500).json({ error: 'Error al actualizar usuario.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado o no se realizaron cambios.' });
        }
        res.json({ message: 'Usuario actualizado exitosamente.' });
    });
});


// --- NUEVO ENDPOINT PARA SUBIR/ACTUALIZAR FOTO DE PERFIL ---
app.put('/api/usuarios/:id/upload-photo', upload.single('profilePhoto'), (req, res) => {
    const userId = req.params.id;
    const foto_perfil_url = `/uploads/fotos_perfil/${req.file.filename}`;

    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    // Antes de actualizar la URL, podemos eliminar la foto antigua si existe
    // Primero, obtener la URL de la foto antigua del usuario
    const getOldPhotoQuery = 'SELECT foto_perfil_url FROM usuarios WHERE id = ?';
    db.query(getOldPhotoQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener URL de foto antigua:', err);
            // Continuar de todos modos para actualizar la nueva foto
        } else if (results.length > 0 && results[0].foto_perfil_url) {
            const oldPhotoPath = path.join(__dirname, 'publica', results[0].foto_perfil_url);
            // Evitar eliminar la foto por defecto si alguien la estableció como tal
            if (path.basename(oldPhotoPath) !== 'default_profile.png' && require('fs').existsSync(oldPhotoPath)) {
                require('fs').unlink(oldPhotoPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar foto antigua:', unlinkErr);
                    else console.log('Foto antigua eliminada:', oldPhotoPath);
                });
            }
        }

        // Actualizar la base de datos con la nueva URL de la foto
        const updatePhotoQuery = 'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ?';
        db.query(updatePhotoQuery, [foto_perfil_url, userId], (updateErr, result) => {
            if (updateErr) {
                console.error('Error al actualizar la URL de la foto en la DB:', updateErr);
                // Si falla la DB, eliminar la foto recién subida para limpiar
                require('fs').unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar foto recién subida tras fallo en DB:', unlinkErr);
                });
                return res.status(500).json({ error: 'Error al actualizar la foto de perfil en la base de datos.' });
            }
            if (result.affectedRows === 0) {
                // Esto podría pasar si el usuario no existe, o si la URL ya era la misma (poco probable con nombres únicos)
                // Eliminar la foto recién subida ya que no se asoció a ningún usuario
                require('fs').unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar foto recién subida:', unlinkErr);
                });
                return res.status(404).json({ error: 'Usuario no encontrado para actualizar la foto.' });
            }
            res.json({ message: 'Foto de perfil subida y actualizada con éxito.', foto_perfil_url: foto_perfil_url });
        });
    });
});

// Actualizar datos del perfil del profesor
app.put('/api/profesor-perfil/:id', async (req, res) => {
    const userId = req.params.id;
    const { nombre_completo, nombre_usuario, email, password } = req.body;

    let query = 'UPDATE usuarios SET nombre_completo = ?, nombre_usuario = ?, email = ?';
    let params = [nombre_completo, nombre_usuario, email];

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += ', contrasena = ?';
        params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error al actualizar el perfil:', err);
            return res.status(500).json({ error: 'Error al actualizar el perfil.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado o no se realizaron cambios.' });
        }
        res.json({ message: 'Perfil actualizado con éxito.' });
    });
});

// --- ENDPOINT PARA SUBIR FOTO DE PERFIL DE PROFESOR ---
app.post('/api/profesor-perfil/:id/upload-photo', upload.single('profilePicture'), async (req, res) => {
    const { id } = req.params;
    // req.file contiene la información del archivo subido por multer
    const fotoUrl = req.file ? `/uploads/fotos_perfil/${req.file.filename}` : null;

    if (!fotoUrl) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo o el archivo es inválido.' });
    }

    try {
        // Obtener la URL de la foto antigua para eliminarla si no es la por defecto
        const getOldPhotoQuery = 'SELECT foto_perfil_url FROM usuarios WHERE id = ? AND tipo_usuario = "profesor"';
        db.query(getOldPhotoQuery, [id], (err, results) => {
            if (err) {
                console.error('Error al obtener foto antigua:', err);
                // No bloquear la subida si falla la consulta de la foto antigua
            } else if (results.length > 0 && results[0].foto_perfil_url) {
                const oldPhotoUrl = results[0].foto_perfil_url;
                // Asegurarse de no borrar la foto por defecto
                if (oldPhotoUrl && !oldPhotoUrl.includes('default_profile.png')) {
                    const oldPhotoPath = path.join(__dirname, 'publica', oldPhotoUrl);
                    fs.unlink(oldPhotoPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Error al eliminar foto antigua:', unlinkErr);
                        } else {
                            console.log('Foto antigua eliminada:', oldPhotoPath);
                        }
                    });
                }
            }
            // Actualizar la base de datos con la nueva URL de la foto
            const updateQuery = 'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ? AND tipo_usuario = "profesor"';
            db.query(updateQuery, [fotoUrl, id], (updateErr, result) => {
                if (updateErr) {
                    console.error('Error al actualizar la URL de la foto en la DB:', updateErr);
                    // Si falla la DB, intentar eliminar la foto recién subida para evitar basura
                    fs.unlink(path.join(__dirname, 'publica', fotoUrl), (deleteErr) => {
                        if (deleteErr) console.error('Error al eliminar nueva foto por fallo en DB:', deleteErr);
                    });
                    return res.status(500).json({ error: 'Error al guardar la foto de perfil.' });
                }

                if (result.affectedRows === 0) {
                    // Si no se actualizó, es porque el ID no existe o no es profesor
                    // Eliminar la foto recién subida
                    fs.unlink(path.join(__dirname, 'publica', fotoUrl), (deleteErr) => {
                        if (deleteErr) console.error('Error al eliminar nueva foto por profesor no encontrado:', deleteErr);
                    });
                    return res.status(404).json({ error: 'Profesor no encontrado o no autorizado.' });
                }

                res.json({ message: 'Foto de perfil actualizada con éxito', foto_perfil_url: fotoUrl });
            });
        });

    } catch (error) {
        console.error('Error general en la subida de foto:', error);
        if (req.file) { // Si ya se subió el archivo al disco pero falló algo después
            fs.unlink(req.file.path, (unlinkErr) => { // Elimina el archivo subido
                if (unlinkErr) console.error('Error al eliminar archivo tras fallo:', unlinkErr);
            });
        }
        res.status(500).json({ error: error.message || 'Error interno del servidor al subir la foto.' });
    }
});
// --- FIN NUEVO ENDPOINT PARA SUBIR/ACTUALIZAR FOTO DE PERFIL ---

// NUEVO: Endpoint para eliminar la foto de perfil del profesor
app.delete('/api/profesor-perfil/:id/delete-photo', (req, res) => {
    const profesorId = req.params.id;
    // Paso 1: Obtener la URL de la foto de perfil actual de la base de datos
    const getPhotoQuery = 'SELECT foto_perfil_url FROM usuarios WHERE id = ? AND tipo_usuario = "profesor"';
    db.query(getPhotoQuery, [profesorId], (err, results) => {
        if (err) {
            console.error('Error al obtener URL de foto para eliminar:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Profesor no encontrado o no autorizado.' });
        }

        const currentPhotoUrl = results[0].foto_perfil_url;

        // Paso 2: Verificar si es la foto por defecto para no eliminarla
        if (currentPhotoUrl === './uploads/fotos_perfil/default_profile.png' || !currentPhotoUrl) {
            // Ya es la foto por defecto o no hay foto, solo actualizamos la DB por si acaso
            const updateQuery = 'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ? AND tipo_usuario = "profesor"';
            db.query(updateQuery, ['./uploads/fotos_perfil/default_profile.png', profesorId], (updateErr) => {
                if (updateErr) {
                    console.error('Error al asegurar default_profile.png en DB:', updateErr);
                    return res.status(500).json({ error: 'Error al eliminar la foto de perfil.' });
                }
                res.json({ message: 'No hay foto de perfil personalizada para eliminar (ya es la por defecto).', foto_perfil_url: './uploads/fotos_perfil/default_profile.png' });
            });
            return;
        }

        // Construir la ruta física del archivo
        const photoPath = path.join(__dirname, 'publica', currentPhotoUrl);

        // Paso 3: Eliminar el archivo físico del sistema de archivos
        fs.unlink(photoPath, (unlinkErr) => {
            if (unlinkErr) {
                console.error('Error al eliminar archivo de foto de perfil:', unlinkErr);
                // Si el archivo no se puede eliminar (quizás ya no existe), aún así actualizamos la DB
                // para que el usuario pueda tener la foto por defecto.
                // Podríamos considerar devolver un 500 aquí si la eliminación es crítica.
            } else {
                console.log('Foto de perfil eliminada del servidor:', photoPath);
            }

            // Paso 4: Actualizar la base de datos para que apunte a la foto por defecto
            const updateQuery = 'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ? AND tipo_usuario = "profesor"';
            db.query(updateQuery, ['./uploads/fotos_perfil/default_profile.png', profesorId], (updateErr, result) => {
                if (updateErr) {
                    console.error('Error al actualizar la URL de la foto a por defecto en la DB:', updateErr);
                    return res.status(500).json({ error: 'Error al actualizar la foto de perfil en la base de datos.' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Profesor no encontrado o no autorizado para actualizar.' });
                }
                res.json({ message: 'Foto de perfil eliminada con éxito.', foto_perfil_url: './uploads/fotos_perfil/default_profile.png' });
            });
        });
    });
});


// Ruta para eliminar un usuario (DELETE) - Mantener como está
app.delete('/api/usuarios/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'DELETE FROM usuarios WHERE id = ?';
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error al eliminar usuario:', err);
            return res.status(500).json({ error: 'Error al eliminar usuario.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado para eliminar.' });
        }
        res.json({ message: 'Usuario eliminado exitosamente.' });
    });
});

// Opcional: Ruta para obtener usuarios por tipo (ya existía y podría generar conflicto si /:id no es primero)
// Mejor mover /api/usuarios/:tipo debajo de /api/usuarios/:id si esperas que ambos puedan coincidir
// Pero con Express, el orden de las rutas importa y /api/usuarios/:id será matched primero si se le pasa un número.
app.get('/api/usuarios', (req, res) => { // Ruta para obtener TODOS los usuarios (para admin)
    const query = 'SELECT id, nombre_completo, email, nombre_usuario, tipo_usuario, curso, foto_perfil_url FROM usuarios'; // <--- AÑADIR foto_perfil_url
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener usuarios:', err);
            return res.status(500).json({ error: 'Error al obtener usuarios' });
        }
        res.json({ usuarios: results });
    });
});

// Ruta para obtener usuarios por tipo (ej. /api/usuarios/alumno, /api/usuarios/profesor)
app.get('/api/usuarios/:tipo', (req, res) => {
    const tipo = req.params.tipo;
    const allowedTypes = ['alumno', 'profesor', 'admin']; // Define tus tipos de usuario permitidos
    if (!allowedTypes.includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de usuario inválido.' });
    }
    const query = 'SELECT id, nombre_completo, email, nombre_usuario, tipo_usuario, curso, foto_perfil_url FROM usuarios WHERE tipo_usuario = ?'; // <--- AÑADIR foto_perfil_url
    db.query(query, [tipo], (err, results) => {
        if (err) {
            console.error(`Error al obtener usuarios de tipo ${tipo}:`, err);
            return res.status(500).json({ error: `Error al obtener usuarios de tipo ${tipo}` });
        }
        res.json({ usuarios: results });
    });
});


// --- FIN ENDPOINTS PARA ADMINISTRACIÓN DE USUARIOS Y GESTIÓN DE PERFIL ---


// Ruta para obtener alumnos por curso (ya existía)
app.get('/api/alumnos/:curso', (req, res) => {
    const curso = req.params.curso;
    const query = 'SELECT id, nombre_completo, foto_perfil_url FROM usuarios WHERE tipo_usuario = "alumno" AND curso = ?'; // <--- AÑADIR foto_perfil_url
    db.query(query, [curso], (err, results) => {
        if (err) {
            console.error('Error al obtener alumnos:', err);
            res.status(500).json({ error: 'Error al obtener alumnos' });
            return;
        }
        res.json({ alumnos: results });
    });
});

// Endpoint para guardar/actualizar notas (ya existía)
app.post('/api/notas', (req, res) => {
    const { notas } = req.body;

    if (!Array.isArray(notas) || notas.length === 0) {
        console.error('Datos de notas inválidos: El cuerpo de la solicitud debe contener un array de notas.');
        return res.status(400).json({ error: 'Datos de notas inválidos: El cuerpo de la solicitud debe contener un array de notas.' });
    }

    for (const nota of notas) {
        if (nota.nota !== null) {
            const parsedNota = parseFloat(nota.nota);
            if (isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10) {
                console.error('Error de validación: Nota inválida', { notaRecibida: nota.nota, alumno: nota.id_alumno, materia: nota.id_materia, periodo: nota.periodo });
                return res.status(400).json({ error: 'Nota inválida: Debe ser un número entre 0 y 10 o estar vacía.', detalle: nota });
            }
            nota.nota = parsedNota;
        }

        if (!nota.id_alumno || !nota.id_materia || !nota.id_profesor || !nota.periodo) {
            console.error('Error de validación: Faltan datos obligatorios para la nota', { nota });
            return res.status(400).json({ error: 'Faltan datos de la nota (id_alumno, id_materia, id_profesor, o periodo).' });
        }
    }

    const inserts = [];
    const updates = [];

    notas.forEach(nota => {
        if (nota.id) {
            updates.push({ ...nota });
        } else {
            inserts.push({ ...nota });
        }
    });

    db.beginTransaction(err => {
        if (err) {
            console.error('Error al iniciar la transacción para guardar notas:', err);
            return res.status(500).json({ error: 'Error del servidor al iniciar la transacción.' });
        }

        Promise.all([
            ...inserts.map(nota => {
                return new Promise((resolve, reject) => {
                    const query = 'INSERT INTO notas (id_alumno, id_materia, id_profesor, nota, periodo) VALUES (?, ?, ?, ?, ?)';
                    db.query(query, [nota.id_alumno, nota.id_materia, nota.id_profesor, nota.nota, nota.periodo], (err, result) => {
                        if (err) {
                            console.error('Error al insertar nota:', err, { nota });
                            return reject(err);
                        }
                        console.log('Nota insertada con ID:', result.insertId);
                        resolve(result);
                    });
                });
            }),
            ...updates.map(nota => {
                return new Promise((resolve, reject) => {
                    const query = 'UPDATE notas SET nota = ?, id_profesor = ? WHERE id = ?';
                    db.query(query, [nota.nota, nota.id_profesor, nota.id], (err, result) => {
                        if (err) {
                            console.error('Error al actualizar nota:', err, { nota });
                            return reject(err);
                        }
                        if (result.affectedRows === 0) {
                            console.warn(`Advertencia: No se actualizó ninguna fila para nota ID ${nota.id}. Puede que el ID no exista o el valor sea el mismo.`);
                        } else {
                            console.log('Nota actualizada:', nota.id, 'Filas afectadas:', result.affectedRows);
                        }
                        resolve(result);
                    });
                });
            })
        ])
        .then(() => {
            db.commit(err => {
                if (err) {
                    db.rollback(() => { });
                    console.error('Error al hacer commit de la transacción de notas:', err);
                    return res.status(500).json({ error: 'Error del servidor al finalizar la transacción (commit).' });
                }
                res.status(200).json({ message: 'Notas guardadas/actualizadas exitosamente.' });

                if (typeof wss !== 'undefined') {
                    wss.clients.forEach(client => {
                        if (client.readyState === require('ws').OPEN) {
                            client.send(JSON.stringify({ type: 'notesUpdated' }));
                        }
                    });
                    console.log('Notificación de notas actualizadas enviada a los clientes WebSocket.');
                } else {
                    console.warn('Advertencia: wss no está definido. La notificación WebSocket no se pudo enviar.');
                }
            });
        })
        .catch(err => {
            db.rollback(() => { });
            console.error('Error durante la ejecución de consultas de notas (rollback):', err);
            res.status(500).json({ error: 'Error al guardar/actualizar notas.', details: err.message || 'Error desconocido en la base de datos.' });
        });
    });
});

// Endpoint para subir foto de perfil de un profesor
app.post('/api/profesor-perfil/:id/upload-photo', upload.single('profilePicture'), (req, res) => {
    const userId = req.params.id;
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    // La URL que se guardará en la base de datos
    // Asegúrate de que el path a 'uploads' sea accesible estáticamente
    const fotoPerfilUrl = `/uploads/fotos_perfil/${req.file.filename}`;

    const query = 'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ?';
    db.query(query, [fotoPerfilUrl, userId], (err, result) => {
        if (err) {
            console.error('Error al actualizar la URL de la foto de perfil en la base de datos:', err);
            // Si hay un error en DB, intentar borrar el archivo subido para evitar basura
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error al eliminar archivo subido tras fallo de DB:', unlinkErr);
            });
            return res.status(500).json({ error: 'Error al guardar la foto de perfil.' });
        }
        res.json({ message: 'Foto de perfil subida y actualizada con éxito.', fotoPerfilUrl: fotoPerfilUrl });
    });
});

// Endpoint para eliminar foto de perfil de un profesor
app.delete('/api/profesor-perfil/:id/delete-photo', (req, res) => {
    const userId = req.params.id;

    // Primero, obtener la URL de la foto actual de la base de datos
    const selectQuery = 'SELECT foto_perfil_url FROM usuarios WHERE id = ?';
    db.query(selectQuery, [userId], (selectErr, selectResults) => {
        if (selectErr) {
            console.error('Error al obtener la URL de la foto de perfil:', selectErr);
            return res.status(500).json({ error: 'Error al eliminar la foto de perfil.' });
        }

        if (selectResults.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const oldPhotoUrl = selectResults[0].foto_perfil_url;

        // Eliminar la referencia de la foto en la base de datos (establecer a NULL)
        const updateQuery = 'UPDATE usuarios SET foto_perfil_url = NULL WHERE id = ?';
        db.query(updateQuery, [userId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error al actualizar la URL de la foto a NULL en la base de datos:', updateErr);
                return res.status(500).json({ error: 'Error al eliminar la foto de perfil.' });
            }

            // Si hay una foto antigua y no es la por defecto, intentar borrarla del sistema de archivos
            // Asegúrate de que '/uploads/fotos_perfil/default_profile.png' es la ruta correcta de tu imagen por defecto
            if (oldPhotoUrl && oldPhotoUrl !== '/uploads/fotos_perfil/default_profile.png' && oldPhotoUrl.startsWith('/uploads/fotos_perfil/')) {
                const oldPhotoPath = path.join(__dirname, 'publica', oldPhotoUrl);
                fs.unlink(oldPhotoPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error al eliminar archivo de foto de perfil del sistema de archivos:', unlinkErr);
                        // No devolver error aquí, ya que la DB se actualizó correctamente
                    }
                });
            }

            res.json({ message: 'Foto de perfil eliminada con éxito.' });
        });
    });
});

// Ruta para obtener las notas de un alumno específico (ya existía)
app.get('/api/materias-notas/:alumnoId', (req, res) => {
    const alumnoId = req.params.alumnoId;
    const query = `
        SELECT
            m.id AS materia_id,
            m.nombre AS materia_nombre,
            n.id AS nota_id,
            n.nota,
            n.periodo
        FROM materias m
        LEFT JOIN notas n ON m.id = n.id_materia AND n.id_alumno = ?
        ORDER BY m.nombre, n.periodo;
    `;

    db.query(query, [alumnoId], (err, results) => {
        if (err) {
            console.error('Error al obtener notas del alumno:', err);
            return res.status(500).json({ error: 'Error al obtener notas del alumno' });
        }
        res.json({ materiasNotas: results });
    });
});

// Nuevos endpoints para obtener nombres de materia y curso (ya existían)
app.get('/api/materias/:materiaId', (req, res) => {
    const materiaId = req.params.materiaId;
    const query = 'SELECT id, nombre FROM materias WHERE id = ?';
    db.query(query, [materiaId], (err, results) => {
        if (err) {
            console.error('Error al obtener materia:', err);
            return res.status(500).json({ error: 'Error al obtener materia' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        res.json({ materia: results[0] });
    });
});

app.get('/api/materias', (req, res) => {
    const query = 'SELECT id, nombre FROM materias';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener materias:', err);
            return res.status(500).json({ error: 'Error al obtener materias' });
        }
        res.json({ materias: results });
    });
});

app.get('/api/cursos/:cursoId', (req, res) => {
    const cursoId = req.params.cursoId;
    const query = 'SELECT id, nombre FROM cursos WHERE id = ?';
    db.query(query, [cursoId], (err, results) => {
        if (err) {
            console.error('Error al obtener curso:', err);
            return res.status(500).json({ error: 'Error al obtener curso' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }
        res.json({ curso: results[0] });
    });
});

// Nuevo endpoint para obtener las notas de un curso y materia (¡Optimizado!, ya existía)
app.get('/api/notas/:cursoId/:materiaId', (req, res) => {
    const { cursoId, materiaId } = req.params;
    const query = `
        SELECT
            u.id AS id_alumno,
            u.nombre_completo,
            n.id AS id_nota,
            n.nota,
            n.periodo
        FROM usuarios u
        LEFT JOIN notas n ON u.id = n.id_alumno AND n.id_materia = ?
        WHERE u.curso = ? AND u.tipo_usuario = 'alumno'
        ORDER BY u.nombre_completo;
    `;

    db.query(query, [materiaId, cursoId], (err, results) => {
        if (err) {
            console.error('Error al obtener alumnos y notas:', err);
            return res.status(500).json({ error: 'Error al obtener alumnos y notas' });
        }
        res.json(results);
    });
});

// --- ENDPOINT PARA OBTENER DATOS DE PERFIL DE PROFESOR ---
// Obtener datos del perfil del profesor
app.get('/api/profesor-perfil/:id', (req, res) => {
    const userId = req.params.id;
    // ¡Asegúrate de incluir 'foto_perfil_url' aquí!
    const query = 'SELECT id, nombre_completo, email, nombre_usuario, curso, foto_perfil_url FROM usuarios WHERE id = ?'; // <-- LÍNEA CORREGIDA
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener datos del perfil:', err);
            return res.status(500).json({ error: 'Error al obtener datos del perfil.' });
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Perfil no encontrado.' });
        }
    });
});

// --- ENDPOINT PARA ACTUALIZAR DATOS DE PERFIL DE PROFESOR ---
app.put('/api/profesor-perfil/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, nombre_usuario, email, password } = req.body;

    // Verificar si el ID del profesor es válido
    if (!id) {
        return res.status(400).json({ error: 'ID de profesor no proporcionado.' });
    }

    let updateFields = [];
    let queryParams = [];

    if (nombre_completo) {
        updateFields.push('nombre_completo = ?');
        queryParams.push(nombre_completo);
    }
    if (nombre_usuario) {
        updateFields.push('nombre_usuario = ?');
        queryParams.push(nombre_usuario);
    }
    if (email) {
        updateFields.push('email = ?');
        queryParams.push(email);
    }
    if (password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('contrasena = ?'); // Asegúrate de que tu columna se llama 'contrasena'
            queryParams.push(hashedPassword);
        } catch (hashError) {
            console.error('Error al hashear la contraseña:', hashError);
            return res.status(500).json({ error: 'Error al procesar la contraseña.' });
        }
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No hay datos para actualizar.' });
    }

    queryParams.push(id); // El ID del profesor va al final de los parámetros

    const query = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ? AND tipo_usuario = 'profesor'`;

    db.query(query, queryParams, (err, result) => {
        if (err) {
            console.error('Error al actualizar perfil del profesor:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'El nombre de usuario o el email ya existen.' });
            }
            return res.status(500).json({ error: 'Error interno del servidor al actualizar el perfil.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Profesor no encontrado o no autorizado para actualizar.' });
        }

        res.json({ message: 'Perfil actualizado con éxito.' });
    });
});

// --- FIN ENDPOINTS DE PERFIL DE PROFESOR ---

// --- ENDPOINTS PARA ADMINISTRACIÓN DE NOTAS (Mantener como están) ---

// NUEVO ENDPOINT: Eliminar TODAS las notas
app.delete('/api/notas/all', (req, res) => {
    const query = 'DELETE FROM notas'; // Consulta para eliminar todas las filas de la tabla 'notas'
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error al eliminar todas las notas:', err);
            return res.status(500).json({ error: 'Error al eliminar todas las notas.' });
        }
        // Mensaje más apropiado si no se eliminaron filas (tabla vacía)
        if (result.affectedRows === 0) {
            return res.json({ message: 'No se encontraron notas para eliminar.' });
        }
        res.json({ message: `Se eliminaron ${result.affectedRows} notas exitosamente.` });
    });
});

// Ruta para obtener UNA nota por ID
app.get('/api/notas/:id', (req, res) => {
    const notaId = req.params.id;
    const query = `
        SELECT
            n.id,
            n.nota,
            n.periodo,
            u.nombre_completo AS alumno,
            m.nombre AS materia,
            p.nombre_completo AS profesor
        FROM notas n
        JOIN usuarios u ON n.id_alumno = u.id
        JOIN materias m ON n.id_materia = m.id
        JOIN usuarios p ON n.id_profesor = p.id
        WHERE n.id = ?;
    `;
    db.query(query, [notaId], (err, results) => {
        if (err) {
            console.error('Error al obtener nota por ID:', err);
            return res.status(500).json({ error: 'Error al obtener nota.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Nota no encontrada para eliminar.' });
        }
        res.json({ nota: results[0] });
    });
});

// Ruta para actualizar una nota (PUT)
app.put('/api/notas/:id', (req, res) => {
    const notaId = req.params.id;
    const { nota } = req.body;

    let parsedNota = null;
    if (nota !== null && nota !== '') {
        parsedNota = parseFloat(nota);
        if (isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10) {
            return res.status(400).json({ error: 'Nota inválida: Debe ser un número entre 0 y 10 o estar vacía.' });
        }
    }

    const query = 'UPDATE notas SET nota = ? WHERE id = ?';
    db.query(query, [parsedNota, notaId], (err, result) => {
        if (err) {
            console.error('Error al actualizar nota:', err);
            return res.status(500).json({ error: 'Error al actualizar nota.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nota no encontrada o no se realizaron cambios.' });
        }
        res.json({ message: 'Nota actualizada exitosamente.' });
    });
});

// Ruta para eliminar una nota (DELETE)
app.delete('/api/notas/:id', (req, res) => {
    const notaId = req.params.id;
    const query = 'DELETE FROM notas WHERE id = ?';
    db.query(query, [notaId], (err, result) => {
        if (err) {
            console.error('Error al eliminar nota:', err);
            return res.status(500).json({ error: 'Error al eliminar nota.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nota no encontrada para eliminar.' });
        }
        res.json({ message: 'Nota eliminada exitosamente.' });
    });
});

// Opcional: Nuevo endpoint para obtener TODAS las notas (para cargar todas en el admin)
app.get('/api/all-notas', (req, res) => {
    const query = `
        SELECT
            n.id,
            n.nota,
            n.periodo,
            u.nombre_completo AS alumno,
            m.nombre AS materia,
            p.nombre_completo AS profesor
        FROM notas n
        JOIN usuarios u ON n.id_alumno = u.id
        JOIN materias m ON n.id_materia = m.id
        JOIN usuarios p ON n.id_profesor = p.id
        ORDER BY n.id DESC;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener todas las notas:', err);
            return res.status(500).json({ error: 'Error al obtener todas las notas.' });
        }
        res.json({ notas: results });
    });
});


// --- FIN ENDPOINTS PARA ADMINISTRACIÓN DE NOTAS ---


// Iniciar el servidor Express y el servidor WebSocket
const server = app.listen(port, () => {
    console.log(`Servidor Express corriendo en http://localhost:${port}`);
});

// Configurar el servidor WebSocket (Mantener como está)
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    console.log('Cliente WebSocket conectado.');

    ws.on('message', message => {
        console.log(`Mensaje recibido del cliente: ${message}`);
        try {
            const parsedMessage = JSON.parse(message);
            if (parsedMessage.type === 'init' && parsedMessage.userId) {
                console.log(`Cliente inicializado con ID: ${parsedMessage.userId}`);
                ws.userId = parsedMessage.userId;
            }
        } catch (e) {
            console.error('Error al parsear mensaje WebSocket:', e);
        }
    });

    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado.');
    });

    ws.on('error', error => {
        console.error('Error en WebSocket del cliente:', error);
    });
});

console.log('Servidor WebSocket iniciado.');
