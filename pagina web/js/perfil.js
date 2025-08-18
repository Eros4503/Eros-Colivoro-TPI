// perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los campos del formulario
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const profileForm = document.getElementById('profileForm');

    // Referencias a los elementos de la foto de perfil (¡!)
    const profilePicture = document.getElementById('profilePicture');
    const photoUploadInput = document.getElementById('photoUploadInput');
    const changePhotoButton = document.getElementById('changePhotoButton');
    const uploadPhotoButton = document.getElementById('uploadPhotoButton');
    const cancelUploadButton = document.getElementById('cancelUploadButton');

    const logoutButton = document.getElementById('logoutButton'); // Botón de cerrar sesión

    let originalProfilePicUrl = './uploads/fotos_perfil/default_profile.png'; // Guardará la URL de la foto original o por defecto

    const alumnoId = localStorage.getItem('userId');
    const tipoUsuario = localStorage.getItem('userTipo');

    // Referencia al div de mensaje personalizado para esta página
    const customMessageDiv = document.getElementById('custom-message');

    // Función para mostrar mensajes personalizados
    function showCustomMessage(message, type = 'error') { // 'error', 'success', 'warning'
        if (customMessageDiv) {
            customMessageDiv.textContent = message;
            customMessageDiv.className = '';
            customMessageDiv.classList.add(type);
            customMessageDiv.classList.add('show');

            setTimeout(() => {
                customMessageDiv.classList.remove('show');
                customMessageDiv.classList.add('hidden');
            }, 3000);
        } else {
            console.warn('Elemento con ID "custom-message" no encontrado en perfil.html. Usando alert().');
            alert(message);
        }
    }

    // Verificar si el usuario es un alumno válido
    if (!alumnoId || tipoUsuario !== 'alumno') {
        console.error('Error: No se pudo identificar al alumno o el tipo de usuario no es correcto');
        showCustomMessage('Error: No se pudo identificar al alumno. Por favor, inicie sesión nuevamente.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }

    // --- DEBUG INICIAL (al cargar la página) ---
    console.log('--- DEBUG INICIAL (al cargar la página) ---');
    console.log('alumnoId cargado del localStorage:', alumnoId); // Verifica este valor al cargar la página
    console.log('tipoUsuario cargado del localStorage:', tipoUsuario);
    console.log('-------------------------------------------');


    // --- Función para cargar los datos existentes del perfil desde el backend (MODIFICADA para foto) ---
    function loadProfileData() {
        fetch(`/api/usuarios/${alumnoId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || `HTTP error! status: ${response.status}`); });
                }
                return response.json();
            })
            .then(data => {
                if (data.usuario) {
                    fullNameInput.value = data.usuario.nombre_completo || '';
                    emailInput.value = data.usuario.email || '';
                    usernameInput.value = data.usuario.nombre_usuario || '';
                    // No precargar la contraseña por seguridad

                    // Cargar la foto de perfil si existe, de lo contrario usar la por defecto
                    if (data.usuario.foto_perfil_url) {
                        profilePicture.src = data.usuario.foto_perfil_url;
                        originalProfilePicUrl = data.usuario.foto_perfil_url; // Guarda la URL original
                    } else {
                        profilePicture.src = './uploads/fotos_perfil/default_profile.png';
                        originalProfilePicUrl = './uploads/fotos_perfil/default_profile.png';
                    }
                } else {
                    console.warn('No se encontraron datos de usuario en la respuesta:', data);
                    showCustomMessage('No se encontraron datos del perfil.', 'warning');
                }
            })
            .catch(error => {
                console.error('Error al cargar datos del perfil:', error);
                showCustomMessage(`Error al cargar los datos del perfil: ${error.message}`, 'error');
                // Fallback: Si el fetch falla, intentar cargar desde localStorage (datos menos recientes)
                fullNameInput.value = localStorage.getItem('userNombre') || '';
                emailInput.value = localStorage.getItem('userEmail') || '';
                usernameInput.value = localStorage.getItem('userUsername') || '';
                // También establecer la URL de la foto de perfil en caso de error si no se obtuvo del backend
                profilePicture.src = localStorage.getItem('userFotoPerfilUrl') || './uploads/fotos_perfil/default_profile.png';
                originalProfilePicUrl = profilePicture.src;
            });
    }

    // Llamar a la función para cargar los datos al inicio
    loadProfileData();


   // --- LÓGICA PARA LA SUBIDA DE FOTOS ---

    // 1. Al hacer clic en "Cambiar Foto", dispara el input de tipo file oculto
    changePhotoButton.addEventListener('click', () => {
        photoUploadInput.click();
    });

    // 2. Cuando se selecciona un archivo en el input de tipo file
    photoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0]; // Obtiene el primer archivo seleccionado

        if (file) {
            // Previsualiza la imagen seleccionada
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicture.src = e.target.result; // Muestra la previsualización
            };
            reader.readAsDataURL(file); // Lee el archivo como una URL de datos

            // Muestra los botones de 'Subir' y 'Cancelar', oculta 'Cambiar Foto'
            changePhotoButton.style.display = 'none';
            uploadPhotoButton.style.display = 'inline-block';
            cancelUploadButton.style.display = 'inline-block';
        } else {
            // Si no se seleccionó ningún archivo (ej. el usuario cerró el diálogo sin seleccionar)
            // Asegúrate de que los botones estén en su estado inicial
            changePhotoButton.style.display = 'inline-block';
            uploadPhotoButton.style.display = 'none';
            cancelUploadButton.style.display = 'none';
            profilePicture.src = originalProfilePicUrl; // Vuelve a la foto original/por defecto
        }
    });

    // 3. Al hacer clic en "Cancelar" la subida de foto
    cancelUploadButton.addEventListener('click', () => {
        // Restaura la imagen a la original/por defecto
        profilePicture.src = originalProfilePicUrl;
        photoUploadInput.value = ''; // Limpia el input de archivo para que se pueda seleccionar la misma imagen de nuevo

        // Restaura la visibilidad de los botones
        changePhotoButton.style.display = 'inline-block';
        uploadPhotoButton.style.display = 'none';
        cancelUploadButton.style.display = 'none';
    });

    // --- Lógica para SUBIR LA FOTO al servidor ---
    uploadPhotoButton.addEventListener('click', () => {
        const file = photoUploadInput.files[0];

        if (!file) {
            showCustomMessage('Por favor, selecciona una foto para subir.', 'warning');
            return;
        }

        // Crear un objeto FormData para enviar el archivo
        const formData = new FormData();
        formData.append('profilePhoto', file); // 'profilePhoto' debe coincidir con el nombre del campo en Multer en server.js

        showCustomMessage('Subiendo foto...', 'warning');

        console.log('--- DEBUG SUBIDA DE FOTO ---');
        console.log('alumnoId ANTES del FETCH de subida:', alumnoId); // <-- ¡MIRA ESTE VALOR!
        console.log('----------------------------');

        fetch(`/api/usuarios/${alumnoId}/upload-photo`, {
            method: 'PUT', // Usamos PUT para actualizar la foto de perfil
            body: formData, // FormData se envía directamente, sin Content-Type
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Foto subida con éxito:', data);
            showCustomMessage('¡Foto de perfil actualizada con éxito!', 'success');

            // Actualiza la URL de la foto de perfil para que la imagen se muestre inmediatamente
            if (data.foto_perfil_url) {
                profilePicture.src = data.foto_perfil_url;
                originalProfilePicUrl = data.foto_perfil_url; // Actualiza la URL original
                localStorage.setItem('userFotoPerfilUrl', data.foto_perfil_url); // Guarda en localStorage
            }

            // Restaura la visibilidad de los botones y limpia el input de archivo
            changePhotoButton.style.display = 'inline-block';
            uploadPhotoButton.style.display = 'none';
            cancelUploadButton.style.display = 'none';
            photoUploadInput.value = ''; // Limpia el input de archivo
        })
        .catch(error => {
            console.error('Error al subir la foto:', error);
            showCustomMessage(`Error al subir la foto: ${error.message}`, 'error');

            // En caso de error, también restaurar la imagen original y los botones
            profilePicture.src = originalProfilePicUrl;
            changePhotoButton.style.display = 'inline-block';
            uploadPhotoButton.style.display = 'none';
            cancelUploadButton.style.display = 'none';
            photoUploadInput.value = '';
        });
    });
    // --- FIN LÓGICA PARA LA SUBIDA DE FOTOS ---


    // Manejar el envío del formulario (Mantener como está, para datos de texto)
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const updatedProfile = {
            nombre_completo: fullNameInput.value,
            email: emailInput.value,
            nombre_usuario: usernameInput.value
        };

        if (passwordInput.value !== '') {
            updatedProfile.contrasena = passwordInput.value;
        }

        console.log('Enviando datos de perfil al backend:', updatedProfile);

        fetch(`/api/usuarios/${alumnoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProfile)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.message || `HTTP error! status: ${response.status}`); });
            }
            return response.json();
        })
        .then(data => {
            console.log('Perfil actualizado con éxito:', data);
            showCustomMessage('¡Perfil actualizado con éxito!', 'success');
            // Actualizar localStorage si los datos cambiados son relevantes
            localStorage.setItem('userNombre', updatedProfile.nombre_completo);
            localStorage.setItem('userEmail', updatedProfile.email);
            localStorage.setItem('userUsername', updatedProfile.nombre_usuario);
            // La contraseña NO debe guardarse en localStorage
            console.log('Foto subida con éxito:', data); // Este console.log parece ser un duplicado de la subida de foto.
            showCustomMessage('¡Foto de perfil actualizada con éxito!', 'success'); // Este showCustomMessage también parece un duplicado.

            // Estas líneas también parecen estar fuera de lugar, deberian estar en la lógica de subida de foto.
            if (data.foto_perfil_url) {
                profilePicture.src = data.foto_perfil_url;
                originalProfilePicUrl = data.foto_perfil_url; // Actualiza la URL original
                localStorage.setItem('userFotoPerfilUrl', data.foto_perfil_url); // Guarda en localStorage
            }

            changePhotoButton.style.display = 'inline-block';
            uploadPhotoButton.style.display = 'none';
            cancelUploadButton.style.display = 'none';
            photoUploadInput.value = ''; // Limpia el input de archivo
        })
        .catch(error => {
            console.error('Error al actualizar el perfil:', error);
            showCustomMessage(`Error al actualizar el perfil: ${error.message}`, 'error');
        });
    });
    // --- Lógica para el botón "Cerrar Sesión" ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Limpiar datos del localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userTipo');
            localStorage.removeItem('userNombre');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userUsername');
            localStorage.removeItem('userFotoPerfilUrl'); // Limpiar también la URL de la foto

            showCustomMessage('Cerrando sesión...', 'warning');

            // Redirigir a la página de inicio de sesión después de un breve retraso
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        });
    }

    // --- Lógica para el menú de hamburguesa ---
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    let overlay = document.querySelector('.overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('overlay');
        document.body.appendChild(overlay);
    }

    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    });
    // --- FIN Lógica para el menú de hamburguesa ---
});