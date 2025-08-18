document.addEventListener('DOMContentLoaded', function() {
    const usuariosTable = document.getElementById('usuariosTable').getElementsByTagName('tbody')[0];
    const notasTable = document.getElementById('notasTable').getElementsByTagName('tbody')[0];
    const eliminarTodasNotasBtn = document.getElementById('eliminarTodasNotasBtn'); // NUEVO: Selector para el botón

    // Elementos del modal
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    // Elemento de notificación principal (para acciones de tabla)
    const notificationMessage = document.getElementById('notificationMessage');
    // NUEVO: Elemento de notificación específico para el formulario de admin
    const adminNotificationMessage = document.getElementById('admin-notification-message');

    // NUEVO: Formulario de registro de profesor
    const registroProfesorForm = document.getElementById('registroProfesorForm');

    // --- Funciones de Utilidad ---

    // Muestra un mensaje de notificación (éxito o error)
    function showNotification(message, isError = false, targetElement = notificationMessage) {
        targetElement.textContent = message;
        targetElement.className = 'notification-message show';
        if (isError) {
            targetElement.classList.add('error');
        } else {
            targetElement.classList.remove('error');
        }
        setTimeout(() => {
            targetElement.classList.remove('show');
        }, 3000); // El mensaje desaparece después de 3 segundos
    }

    // Abre el modal con contenido y botones configurables
    function openModal(title, bodyHtml, confirmText, onConfirm, isDelete = false) {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modalConfirmBtn.textContent = confirmText;
        modalConfirmBtn.onclick = onConfirm;
        modalConfirmBtn.className = isDelete ? 'confirm-btn delete-btn' : 'confirm-btn'; // Estilo para botón de eliminar
        modalCancelBtn.onclick = closeModal; // Siempre cierra el modal
        modalOverlay.classList.add('active');
    }

    // Cierra el modal
    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    // --- Carga de Datos (Reales desde la API) ---

    // Cargar usuarios desde la API
    async function cargarUsuarios() {
        try {
            const response = await fetch('/api/usuarios'); // Endpoint para obtener TODOS los usuarios
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const usuarios = data.usuarios; // Asumo que la API devuelve { usuarios: [...] }

            usuariosTable.innerHTML = ''; // Limpiar tabla existente

            usuarios.forEach(usuario => {
                const row = usuariosTable.insertRow();
                row.insertCell().textContent = usuario.id;
                row.insertCell().textContent = usuario.nombre_completo;
                row.insertCell().textContent = usuario.email;
                row.insertCell().textContent = usuario.nombre_usuario;
                row.insertCell().textContent = usuario.tipo_usuario;
                row.insertCell().textContent = usuario.curso || '-'; // Mostrar '-' si no tiene curso
                const accionesCell = row.insertCell();
                accionesCell.className = 'acciones-cell'; // Para aplicar estilos a los botones
                accionesCell.innerHTML = `
                    <button onclick="editarUsuario(${usuario.id})">Editar</button>
                    <button onclick="eliminarUsuario(${usuario.id})" class="delete-btn">Eliminar</button>
                `;
            });
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            showNotification('Error al cargar usuarios.', true);
        }
    }

    // Cargar notas desde la API (admin)
    async function cargarNotas() {
        try {
            const response = await fetch('/api/all-notas'); // Usamos el endpoint para todas las notas
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const notas = data.notas;

            notasTable.innerHTML = ''; // Limpiar tabla existente

            if (notas.length === 0) {
                const row = notasTable.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 7; // Ajusta el colspan según el número de columnas de tu tabla
                cell.textContent = 'No hay notas registradas.';
                cell.style.textAlign = 'center';
                showNotification('No hay notas registradas.', false);
                return;
            }

            notas.forEach(nota => {
                const row = notasTable.insertRow();
                row.insertCell().textContent = nota.id;
                row.insertCell().textContent = nota.alumno;
                row.insertCell().textContent = nota.materia;
                row.insertCell().textContent = nota.profesor;
                row.insertCell().textContent = nota.nota !== null ? nota.nota : 'N/A';
                row.insertCell().textContent = nota.periodo;
                const accionesCell = row.insertCell();
                accionesCell.className = 'acciones-cell';
                accionesCell.innerHTML = `
                    <button onclick="editarNota(${nota.id})">Editar</button>
                    <button onclick="eliminarNota(${nota.id})" class="delete-btn">Eliminar</button>
                `;
            });
            showNotification('Notas cargadas exitosamente.');
        } catch (error) {
            console.error('Error al cargar notas:', error);
            showNotification('Error al cargar notas.', true);
        }
    }

    // --- Funciones de Acción (Editar/Eliminar) ---

    // Editar Usuario
    window.editarUsuario = async function(id) {
        try {
            const response = await fetch(`/api/usuarios/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const usuario = data.usuario;

            if (!usuario) {
                showNotification('Usuario no encontrado para edición.', true);
                return;
            }

            const tiposUsuario = ['alumno', 'profesor', 'admin'];
            const cursosResponse = await fetch('/api/cursos');
            const cursosData = await cursosResponse.json();
            const cursos = cursosData.cursos;

            let cursoOptions = '<option value="">---</option>';
            cursos.forEach(c => {
                cursoOptions += `<option value="${c.nombre}" ${usuario.curso === c.nombre ? 'selected' : ''}>${c.nombre}</option>`;
            });

            let tipoOptions = '';
            tiposUsuario.forEach(tipo => {
                tipoOptions += `<option value="${tipo}" ${usuario.tipo_usuario === tipo ? 'selected' : ''}>${tipo}</option>`;
            });

            const bodyHtml = `
                <div class="form-group">
                    <label for="editNombreCompleto">Nombre Completo:</label>
                    <input type="text" id="editNombreCompleto" value="${usuario.nombre_completo}" required>
                </div>
                <div class="form-group">
                    <label for="editEmail">Email:</label>
                    <input type="email" id="editEmail" value="${usuario.email}" required>
                </div>
                <div class="form-group">
                    <label for="editNombreUsuario">Nombre Usuario:</label>
                    <input type="text" id="editNombreUsuario" value="${usuario.nombre_usuario}" required>
                </div>
                <div class="form-group">
                    <label for="editTipoUsuario">Tipo Usuario:</label>
                    <select id="editTipoUsuario" required>${tipoOptions}</select>
                </div>
                <div class="form-group">
                    <label for="editCurso">Curso:</label>
                    <select id="editCurso">${cursoOptions}</select>
                </div>
                <div class="form-group">
                    <label for="editContrasena">Nueva Contraseña (dejar vacío para no cambiar):</label>
                    <input type="password" id="editContrasena">
                </div>
            `;

            openModal('Editar Usuario', bodyHtml, 'Guardar Cambios', async () => {
                const nombreCompleto = document.getElementById('editNombreCompleto').value;
                const email = document.getElementById('editEmail').value;
                const nombreUsuario = document.getElementById('editNombreUsuario').value;
                const tipoUsuario = document.getElementById('editTipoUsuario').value;
                const curso = document.getElementById('editCurso').value;
                const contrasena = document.getElementById('editContrasena').value;

                try {
                    const updateResponse = await fetch(`/api/usuarios/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nombre_completo: nombreCompleto, email, nombre_usuario: nombreUsuario, tipo_usuario: tipoUsuario, curso, contrasena })
                    });

                    if (!updateResponse.ok) {
                        const errorData = await updateResponse.json();
                        throw new Error(errorData.error || `HTTP error! status: ${updateResponse.status}`);
                    }

                    showNotification('Usuario actualizado exitosamente.');
                    cargarUsuarios();
                    closeModal();
                } catch (updateError) {
                    console.error('Error al guardar usuario:', updateError);
                    showNotification(`Error al guardar usuario: ${updateError.message}`, true);
                }
            });

        } catch (error) {
            console.error('Error al obtener datos del usuario para edición:', error);
            showNotification('Error al obtener datos del usuario para edición.', true);
        }
    };

    // Eliminar Usuario
    window.eliminarUsuario = function(id) {
        openModal('Confirmar Eliminación', '¿Estás seguro de que quieres eliminar este usuario?', 'Eliminar', async () => {
            try {
                const response = await fetch(`/api/usuarios/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                showNotification('Usuario eliminado exitosamente.');
                cargarUsuarios();
                closeModal();
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                showNotification(`Error al eliminar usuario: ${error.message}`, true);
            }
        }, true);
    };

    // Editar Nota
    window.editarNota = async function(id) {
        try {
            const response = await fetch(`/api/notas/${id}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('DEBUG: Respuesta de error RAW:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const nota = data.nota;

            if (!nota) {
                showNotification('Nota no encontrada para edición.', true);
                return;
            }

            const bodyHtml = `
                <div class="form-group">
                    <label>Alumno:</label>
                    <input type="text" value="${nota.alumno}" disabled>
                </div>
                <div class="form-group">
                    <label>Materia:</label>
                    <input type="text" value="${nota.materia}" disabled>
                </div>
                <div class="form-group">
                    <label>Profesor:</label>
                    <input type="text" value="${nota.profesor}" disabled>
                </div>
                <div class="form-group">
                    <label for="editNota">Nota:</label>
                    <input type="number" id="editNota" value="${nota.nota !== null ? nota.nota : ''}" min="0" max="10" step="0.01">
                </div>
                <div class="form-group">
                    <label>Período:</label>
                    <input type="text" value="${nota.periodo}" disabled>
                </div>
            `;

            openModal('Editar Nota', bodyHtml, 'Guardar Cambios', async () => {
                const nuevaNota = document.getElementById('editNota').value;
                const parsedNota = nuevaNota === '' ? null : parseFloat(nuevaNota);

                if (parsedNota !== null && (isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10)) {
                    showNotification('Nota inválida: Debe ser un número entre 0 y 10 o estar vacía.', true);
                    return;
                }

                try {
                    const updateResponse = await fetch(`/api/notas/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nota: parsedNota })
                    });

                    if (!updateResponse.ok) {
                        const errorData = await updateResponse.json();
                        throw new Error(errorData.error || `HTTP error! status: ${updateResponse.status}`);
                    }

                    showNotification('Nota actualizada exitosamente.');
                    cargarNotas();
                    closeModal();
                } catch (updateError) {
                    console.error('Error al guardar nota:', updateError);
                    showNotification(`Error al guardar nota: ${updateError.message}`, true);
                }
            });

        } catch (error) {
            console.error('Error al obtener datos de la nota para edición:', error);
            showNotification('Error al obtener datos de la nota para edición.', true);
        }
    };

    // Eliminar Nota individual
    window.eliminarNota = function(id) {
        openModal('Confirmar Eliminación', '¿Estás seguro de que quieres eliminar esta nota?', 'Eliminar', async () => {
            try {
                const response = await fetch(`/api/notas/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                showNotification('Nota eliminada exitosamente.');
                cargarNotas();
                closeModal();
            } catch (error) {
                    console.error('Error al eliminar nota:', error);
                showNotification(`Error al eliminar nota: ${error.message}`, true);
            }
        }, true);
    };

    // Lógica para el botón "Eliminar Todas las Notas"
    eliminarTodasNotasBtn.addEventListener('click', function() {
        openModal(
            'Confirmar Eliminación Masiva',
            '¡ADVERTENCIA! Estás a punto de eliminar TODAS las notas registradas. Esta acción es irreversible. ¿Estás absolutamente seguro?',
            'Sí, Eliminar Todas',
            async () => {
                try {
                    const response = await fetch('/api/notas/all', { // Nuevo endpoint para eliminar todas las notas
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                    }

                    showNotification('Todas las notas han sido eliminadas exitosamente.');
                    cargarNotas(); // Recargar la tabla de notas para que se vea vacía
                    closeModal();
                } catch (error) {
                    console.error('Error al eliminar todas las notas:', error);
                    showNotification(`Error al eliminar todas las notas: ${error.message}`, true);
                }
            },
            true // Indica que es un botón de eliminación para aplicar el estilo rojo
        );
    });

    // NUEVO: Manejar el envío del formulario de registro de profesor
    registroProfesorForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevenir el envío por defecto del formulario

        const nombre_completo = document.getElementById('regProfesorNombreCompleto').value;
        const email = document.getElementById('regProfesorEmail').value;
        const nombre_usuario = document.getElementById('regProfesorNombreUsuario').value;
        const contrasena = document.getElementById('regProfesorContrasena').value;

        try {
            const response = await fetch('/api/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre_completo,
                    email,
                    nombre_usuario,
                    contrasena,
                    tipo_usuario: 'profesor' // Siempre se registra como profesor
                })
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Profesor registrado exitosamente.', false, adminNotificationMessage);
                registroProfesorForm.reset(); // Limpiar el formulario
                cargarUsuarios(); // Recargar la tabla de usuarios para mostrar el nuevo profesor
            } else {
                showNotification(`Error al registrar profesor: ${data.error}`, true, adminNotificationMessage);
            }
        } catch (error) {
            console.error('Error en la solicitud de registro de profesor:', error);
            showNotification('Error de conexión al intentar registrar profesor.', true, adminNotificationMessage);
        }
    });


    // --- Inicialización ---
    cargarUsuarios();
    cargarNotas();

    // Opcional: Integración WebSocket para actualización en tiempo real (si lo necesitas en el admin)
    // const ws = new WebSocket('ws://localhost:2890');
    // ws.onmessage = (event) => {
    //     const message = JSON.parse(event.data);
    //     if (message.type === 'notesUpdated' || message.type === 'usersUpdated') {
    //         console.log('Mensaje WebSocket recibido: Actualizando tablas...');
    //         cargarUsuarios();
    //         cargarNotas();
    //     }
    // };
});