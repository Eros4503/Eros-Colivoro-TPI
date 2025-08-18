document.addEventListener('DOMContentLoaded', function() {
    // Selectores para elementos HTML
    const materiaSelect = document.getElementById('materiaSelect');
    const cursoSelect = document.getElementById('cursoSelect');
    const cargarTablaBtn = document.getElementById('cargarTablaBtn');
    const tablaNotasContainer = document.getElementById('tablaNotasContainer'); // Usamos el ID del contenedor de la tabla
    const notasTable = document.getElementById('notasTable'); // Esta es la tabla <table> en sí
    const tablaTitle = document.getElementById('tablaTitle');
    const guardarNotasBtn = document.getElementById('guardarNotasBtn');
    const notificationMessage = document.getElementById('notificationMessage'); // Selector para el mensaje de notificación
    const profesorNombreDisplay = document.getElementById('profesorNombreDisplay'); // Selector para el nombre del profesor
    const logoutButton = document.getElementById('logoutButton');



    // --- Cargar Nombre del Profesor ---
    function cargarNombreProfesor() {
        const userId = localStorage.getItem('userId');

        if (!userId) {
            console.warn('ID de usuario no encontrado en localStorage. No se puede cargar el nombre del profesor.');
            // Aquí podrías redirigir al login o mostrar un mensaje al usuario
            profesorNombreDisplay.textContent = 'Profesor'; // O un texto por defecto
            return;
        }

        fetch(`/api/profesor-perfil/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo obtener el nombre del profesor.');
                }
                return response.json();
            })
            .then(data => {
                if (profesorNombreDisplay) {
                    profesorNombreDisplay.textContent = data.nombre_completo || 'Profesor';
                }
            })
            .catch(error => {
                console.error('Error al cargar el nombre del profesor:', error);
                if (profesorNombreDisplay) {
                    profesorNombreDisplay.textContent = 'Error al cargar nombre'; // Muestra un error en la interfaz
                }
            });
    }

    // Llama a esta función para cargar el nombre cuando el DOM esté listo
    cargarNombreProfesor(); 

    // --- Funciones de Utilidad (para notificaciones) ---
    function showNotification(message, isError = false) {
        notificationMessage.textContent = message;
        notificationMessage.className = 'notification-message'; // Resetear clases
        notificationMessage.classList.add('show');
        if (isError) {
            notificationMessage.classList.add('error');
        }

        setTimeout(() => {
            notificationMessage.classList.remove('show');
            // Opcional: Quitar la clase 'error' después de la transición de salida
            // setTimeout(() => {
            //     notificationMessage.classList.remove('error');
            // }, 500);
        }, 3000); // El mensaje desaparece después de 3 segundos
    }

    // --- Validación inicial de elementos ---
    if (!materiaSelect || !cursoSelect || !cargarTablaBtn || !tablaNotasContainer || !notasTable || !tablaTitle || !guardarNotasBtn || !notificationMessage) {
        console.error('Error: No se encontraron todos los elementos HTML necesarios. Revisa tus IDs.');
        showNotification('Error: No se encontraron todos los elementos HTML necesarios. Revisa tus IDs.', true);
        return;
    }

    // Función para cargar las materias desde la base de datos
    function cargarMaterias() {
        fetch('/api/materias')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                materiaSelect.innerHTML = '<option value="">Seleccione una materia</option>';
                if (data.materias && Array.isArray(data.materias)) {
                    data.materias.forEach(materia => {
                        const option = document.createElement('option');
                        option.value = materia.id;
                        option.textContent = materia.nombre;
                        materiaSelect.appendChild(option);
                    });
                } else {
                    console.warn('Advertencia: La respuesta de /api/materias no contiene un array "materias".', data);
                }
            })
            .catch(error => {
                console.error('Error al cargar materias:', error);
                showNotification('Error al cargar materias.', true);
            });
    }

    // Función para cargar los cursos desde la base de datos
    function cargarCursos() {
        fetch('/api/cursos')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                cursoSelect.innerHTML = '<option value="">Seleccione un curso</option>';
                if (data.cursos && Array.isArray(data.cursos)) {
                    data.cursos.forEach(curso => {
                        const option = document.createElement('option');
                        option.value = curso.id;
                        option.textContent = curso.nombre;
                        cursoSelect.appendChild(option);
                    });
                } else {
                    console.warn('Advertencia: La respuesta de /api/cursos no contiene un array "cursos".', data);
                }
            })
            .catch(error => {
                console.error('Error al cargar cursos:', error);
                showNotification('Error al cargar cursos.', true);
            });
    }

    // --- Sección para cargar usuarios (si esta tabla es para el profesor, puede que no sea necesaria) ---
    // Si usuariosTable es una tabla HTML (<table>), esta es la lógica correcta.
    // Asegúrate de que el ID 'usuariosTable' exista en tu HTML como una tabla.
    // Si esta funcionalidad no es para el profesor, puedes eliminarla.
    const usuariosTable = document.getElementById('usuariosTable'); // Asumo que esta tabla existe en el HTML del profesor

    function cargarUsuarios() {
        if (!usuariosTable) {
            console.warn('Advertencia: El elemento con ID "usuariosTable" no se encontró en el HTML del profesor. Si no es necesario, ignora este mensaje.');
            // showNotification('Error: El elemento de tabla de usuarios no se encontró.', true); // No mostrar error si no es relevante para el profesor
            return;
        }

        fetch('/api/usuarios')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Limpiar la tabla antes de añadir nuevos datos
                usuariosTable.innerHTML = '';

                // Crear el thead (encabezado de la tabla)
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                ['ID', 'Nombre Completo', 'Email', 'Tipo Usuario', 'Curso'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                usuariosTable.appendChild(thead);

                // Crear el tbody (cuerpo de la tabla)
                const tbody = document.createElement('tbody');
                if (data.usuarios && Array.isArray(data.usuarios)) {
                    data.usuarios.forEach(usuario => {
                        const row = document.createElement('tr');
                        row.insertCell().textContent = usuario.id;
                        row.insertCell().textContent = usuario.nombre_completo;
                        row.insertCell().textContent = usuario.email;
                        row.insertCell().textContent = usuario.tipo_usuario;
                        row.insertCell().textContent = usuario.curso || '-'; // Usa '-' si el curso es nulo
                        tbody.appendChild(row);
                    });
                } else {
                    console.warn('Advertencia: La respuesta de /api/usuarios no contiene un array "usuarios".', data);
                }
                usuariosTable.appendChild(tbody);
            })
            .catch(error => {
                console.error('Error al cargar usuarios:', error);
                showNotification('Error al cargar usuarios.', true);
            });
    }

    // --- Fin de la sección para cargar usuarios ---


    // Función optimizada para cargar alumnos y notas
    function cargarAlumnosYNotas(cursoId, materiaId) {
        return fetch(`/api/notas/${cursoId}/${materiaId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Mapear los datos para agrupar notas por alumno
                const alumnosMap = new Map();
                data.forEach(item => {
                    if (!alumnosMap.has(item.id_alumno)) {
                        alumnosMap.set(item.id_alumno, {
                            id: item.id_alumno,
                            nombre_completo: item.nombre_completo,
                            notas: []
                        });
                    }
                    alumnosMap.get(item.id_alumno).notas.push({
                        id: item.id_nota, // Correcto: ID de la nota específica del servidor
                        nota: item.nota,
                        periodo: item.periodo
                    });
                });
                return Array.from(alumnosMap.values());
            })
            .catch(error => {
                console.error('Error al cargar alumnos y notas:', error);
                showNotification('Error al cargar alumnos y notas. Consulta la consola para más detalles.', true);
                return []; // Devuelve un array vacío en caso de error
            });
    }

    // Función para validar un valor de nota individual (0-10)
    function validarNota(nota) {
        if (nota === '') return true;
        const numNota = parseFloat(nota);
        return !isNaN(numNota) && numNota >= 0 && numNota <= 10;
    }

    // Función para validar todos los datos de la nota antes de enviar al servidor
    function validarDatosNota(nota) {
        if (typeof nota !== 'object' || nota === null) return false;

        if (typeof nota.id_alumno !== 'number' || isNaN(nota.id_alumno) || nota.id_alumno <= 0) {
            console.error('Validación fallida: id_alumno', nota.id_alumno);
            return false;
        }
        if (typeof nota.id_materia !== 'number' || isNaN(nota.id_materia) || nota.id_materia <= 0) {
            console.error('Validación fallida: id_materia', nota.id_materia);
            return false;
        }
        if (typeof nota.id_profesor !== 'number' || isNaN(nota.id_profesor) || nota.id_profesor <= 0) {
            console.error('Validación fallida: id_profesor', nota.id_profesor);
            return false;
        }
        if (!validarNota(nota.nota)) {
            console.error('Validación fallida: nota', nota.nota);
            return false;
        }
        if (typeof nota.periodo !== 'string' || nota.periodo.trim() === '') {
            console.error('Validación fallida: periodo', nota.periodo);
            return false;
        }

        if (nota.id !== undefined && (typeof nota.id !== 'number' || isNaN(nota.id) || nota.id <= 0)) {
            console.error('Validación fallida: id (nota existente)', nota.id);
            return false;
        }

        return true;
    }
    

     // **NUEVO: Lógica para el botón de Cerrar Sesión**
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Limpiar datos de la sesión del usuario en localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userNombre');
            localStorage.removeItem('userTipo'); // Si usas un tipo de usuario

            // Redirigir a la página de inicio de sesión
            window.location.href = 'index.html';
        });
    }


    // --- Carga inicial de datos ---
    cargarMaterias();
    cargarCursos();
    cargarUsuarios(); // Llama a la función para cargar los usuarios cuando la página cargue

    // Evento para cargar la tabla de notas
    cargarTablaBtn.addEventListener('click', function() {
        const materiaId = materiaSelect.value;
        const cursoId = cursoSelect.value;

        if (materiaId && cursoId) {
            Promise.all([
                    fetch(`/api/materias/${materiaId}`).then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for materia`);
                        return response.json();
                    }),
                    fetch(`/api/cursos/${cursoId}`).then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for curso`);
                        return response.json();
                    }),
                    cargarAlumnosYNotas(cursoId, materiaId)
                ])
                .then(async ([materiaResponse, cursoResponse, alumnosNotas]) => {
                    const materiaNombre = materiaResponse.materia.nombre;
                    const cursoNombre = cursoResponse.curso.nombre;

                    tablaTitle.textContent = `Notas de ${materiaNombre} - ${cursoNombre}`;

                    const tbody = notasTable.querySelector('tbody');
                    if (!tbody) {
                        console.error('Error: No se encontró el tbody en la tabla de notas.');
                        showNotification('Error interno: Faltan elementos de la tabla.', true);
                        return;
                    }
                    tbody.innerHTML = '';

                    // Generar las filas de la tabla
                    alumnosNotas.forEach(alumno => {
                        const row = tbody.insertRow();
                        const cellNombre = row.insertCell();
                        cellNombre.textContent = alumno.nombre_completo;
                        cellNombre.dataset.alumnoId = alumno.id;

                        const periodos = ['1er Informe', '2do Informe', '1er Cuatrimestre', '3er Informe', '4to Informe', '2do Cuatrimestre', 'Nota Final'];
                        periodos.forEach((periodo, index) => {
                            const cell = row.insertCell();
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.min = '0';
                            input.max = '10';
                            input.step = '0.01';

                            const notaExistente = alumno.notas.find(n => n.periodo === periodo);
                            if (notaExistente) {
                                input.value = notaExistente.nota;
                                input.dataset.notaId = notaExistente.id;
                            }
                            cell.appendChild(input);
                        });
                    });

                    // Mostrar el contenedor de la tabla
                    tablaNotasContainer.style.display = 'block'; // Asegúrate de que este ID se refiera al contenedor correcto
                    showNotification('Tabla de notas cargada exitosamente.');
                })
                .catch(error => {
                    console.error('Error al cargar datos:', error);
                    showNotification('Error al cargar datos. Consulta la consola para más detalles.', true);
                });
        } else {
            showNotification('Por favor, seleccione una materia y un curso.', true);
        }
    });

    // Evento para guardar las notas (actualizar o insertar)
    guardarNotasBtn.addEventListener('click', function() {
        const materiaId = parseInt(materiaSelect.value, 10);
        const notasParaGuardar = [];
        const filas = notasTable.querySelectorAll('tbody tr');
        const profesorId = parseInt(localStorage.getItem('userId'), 10); // Asumiendo que userId está en localStorage

        if (isNaN(profesorId) || profesorId <= 0) {
            showNotification('Error: No se pudo identificar al profesor. Asegúrese de haber iniciado sesión.', true);
            return;
        }

        try {
            filas.forEach(fila => {
                const alumnoId = parseInt(fila.cells[0].dataset.alumnoId, 10);
                if (isNaN(alumnoId) || alumnoId <= 0) {
                    console.error('Error: ID de alumno inválido en la fila:', fila);
                    showNotification('Error: ID de alumno no encontrado en la tabla. Recargue la página.', true);
                    throw new Error("ID de alumno inválido");
                }

                const inputs = fila.querySelectorAll('input[type="number"]');
                const periodos = ['1er Informe', '2do Informe', '1er Cuatrimestre', '3er Informe', '4to Informe', '2do Cuatrimestre', 'Nota Final'];

                inputs.forEach((input, index) => {
                    const periodo = periodos[index];
                    const valorNota = input.value.trim();
                    
                    let nota;
                    if (valorNota === '') {
                        nota = null;
                    } else {
                        nota = parseFloat(valorNota);
                        if (!validarNota(nota)) {
                            console.error("Dato de nota inválido en el input:", valorNota, "para alumno:", alumnoId, "periodo:", periodo);
                            showNotification(`Error: La nota '${valorNota}' para ${fila.cells[0].textContent} en ${periodo} es inválida. Debe ser un número entre 0 y 10.`, true);
                            throw new Error("Nota inválida");
                        }
                    }
                    
                    const notaId = input.dataset.notaId ? parseInt(input.dataset.notaId, 10) : undefined;

                    const notaObjeto = {
                        id_alumno: alumnoId,
                        id_materia: materiaId,
                        id_profesor: profesorId,
                        nota: nota,
                        periodo: periodo,
                        id: notaId
                    };

                    notasParaGuardar.push(notaObjeto);
                });
            });
        } catch (error) {
            console.error("Error de validación durante la recolección de notas:", error);
            if (error.message !== "Nota inválida" && error.message !== "ID de alumno inválido") {
                showNotification("Ocurrió un error al procesar las notas. Consulta la consola.", true);
            }
            return;
        }
        
        if (notasParaGuardar.length === 0) {
            showNotification('No hay notas para guardar o los datos son incompletos.', true);
            return;
        }

        fetch('/api/notas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notas: notasParaGuardar
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || `Error del servidor: ${response.status}`);
                    }).catch(() => {
                        throw new Error(`Error de red o del servidor: ${response.statusText || response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Notas guardadas/actualizadas:', data);
                showNotification('Notas guardadas/actualizadas con éxito');
                cargarTablaBtn.click();
            })
            .catch(error => {
                console.error('Error al guardar/actualizar notas:', error);
                showNotification(`Error al guardar las notas: ${error.message || 'Error desconocido'}`, true);
            });
    });
});