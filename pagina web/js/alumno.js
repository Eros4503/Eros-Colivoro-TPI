// alumno.js

// Esperamos a que todo el DOM esté cargado para ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    // Seleccionamos la tabla donde se van a cargar las notas
    const notasTable = document.getElementById('notasTable').getElementsByTagName('tbody')[0];
    // Seleccionamos el título donde mostramos el nombre del alumno
    const nombreAlumno = document.querySelector('h1');
    // Seleccionamos el botón de hamburguesa
    const menuToggle = document.getElementById('menuToggle');
    // Seleccionamos el menú lateral
    const sideMenu = document.getElementById('sideMenu');
    // Creamos una capa de overlay que se oscurece
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);
    // Seleccionamos el nuevo botón de cerrar sesión
    const logoutButton = document.getElementById('logoutButton');

    // Obtenemos los datos del alumno guardados en el "almacenamiento local" del navegador
    const alumnoId = localStorage.getItem('userId');
    const alumnoNombre = localStorage.getItem('userNombre');
    const tipoUsuario = localStorage.getItem('userTipo');

    // Verificamos si el usuario es un alumno válido, si no, lo echamos
    if (!alumnoId || tipoUsuario !== 'alumno') {
        console.error('Error: No se pudo identificar al alumno o el tipo de usuario no es correcto');
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error: No se pudo identificar al alumno. Por favor, inicie sesión nuevamente.';
        errorMessage.style.cssText = 'background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
        document.body.prepend(errorMessage);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }

    // Si todo está ok, mostramos el nombre del alumno
    if (alumnoNombre) {
        nombreAlumno.textContent = ` Bienvenido,  ${alumnoNombre}`;
    }

    // Llamamos a la función para cargar las materias y notas del alumno
    cargarMateriasYNotas();

    // Lógica para abrir y cerrar el menú hamburguesa
    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // Si hacés clic en el overlay, se cierra el menú
    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Lógica para cerrar la sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Borramos los datos de sesión
            localStorage.removeItem('userId');
            localStorage.removeItem('userNombre');
            localStorage.removeItem('userTipo');
            console.log('Sesión cerrada. Redirigiendo a index.html...');
            // Y lo mandamos a la página principal
            window.location.href = 'index.html';
        });
    }

    // --- Configuración de WebSocket para actualizaciones en tiempo real ---
    const ws = new WebSocket('ws://localhost:2890');

    // Cuando se conecta, mandamos un mensaje al servidor
    ws.onopen = () => {
        console.log('Conexión WebSocket establecida con el servidor.');
        ws.send(JSON.stringify({ type: 'init', userId: alumnoId }));
    };

    // Cuando llega un mensaje, si es de notas actualizadas, recargamos la tabla
    ws.onmessage = (event) => {
        console.log('Datos RAW de WebSocket recibidos:', event.data);
        try {
            const message = JSON.parse(event.data);
            console.log('Mensaje WebSocket parseado:', message);

            if (message && message.type === 'notesUpdated') {
                console.log('Mensaje WebSocket recibido: Notas actualizadas. Recargando...');
                cargarMateriasYNotas();
            }

        } catch (error) {
            console.error('Error al parsear o procesar mensaje WebSocket:', error, 'Datos recibidos:', event.data);
        }
    };

    // Mensaje si la conexión se cierra
    ws.onclose = () => {
        console.log('Conexión WebSocket cerrada.');
    };

    // Mensaje si hay un error en la conexión
    ws.onerror = (error) => {
        console.error('Error en la conexión WebSocket:', error);
        const wsErrorMessage = document.createElement('div');
        wsErrorMessage.textContent = 'Error de conexión en tiempo real. Las notas podrían no actualizarse al instante.';
        wsErrorMessage.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
        document.body.prepend(wsErrorMessage);
    };
    // --- FIN Configuración de WebSocket ---

    // Función para hacer el "fetch" (la llamada) a la API para traer las notas
    function cargarMateriasYNotas() {
        fetch(`/api/materias-notas/${alumnoId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Materias y notas cargadas:', data);
                mostrarMateriasYNotas(data.materiasNotas);
            })
            .catch(error => {
                console.error('Error:', error);
                const fetchErrorMessage = document.createElement('div');
                fetchErrorMessage.textContent = `Error al cargar las materias y notas: ${error.message}`;
                fetchErrorMessage.style.cssText = 'background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
                document.body.prepend(fetchErrorMessage);
            });
    }

    // Función para renderizar (dibujar) las notas en la tabla
    function mostrarMateriasYNotas(materiasNotas) {
        notasTable.innerHTML = ''; // Limpiamos la tabla antes de cargar datos

        const materias = {};
        materiasNotas.forEach(item => {
            if (!materias[item.materia_id]) {
                materias[item.materia_id] = {
                    nombre: item.materia_nombre,
                    notas: {}
                };
            }
            if (item.periodo) {
                materias[item.materia_id].notas[item.periodo] = item.nota;
            }
        });

        Object.values(materias).forEach(materia => {
            const row = notasTable.insertRow();
            row.insertCell().textContent = materia.nombre;

            const periodos = ['1er Informe', '2do Informe', '1er Cuatrimestre', '3er Informe', '4to Informe', '2do Cuatrimestre', 'Nota Final'];

            periodos.forEach(periodo => {
                row.insertCell().textContent = materia.notas[periodo] !== null ? materia.notas[periodo] : 'N/A';
            });
        });

        // Si no hay materias, mostramos un mensaje en la tabla
        if (Object.keys(materias).length === 0) {
            const row = notasTable.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 8;
            cell.textContent = 'No hay materias o notas disponibles.';
        }
    }
});