document.addEventListener('DOMContentLoaded', function() {
    // Selectores para elementos HTML
    const editNombreCompleto = document.getElementById('editNombreCompleto');
    const editUsuario = document.getElementById('editUsuario');
    const editEmail = document.getElementById('editEmail');
    const editPassword = document.getElementById('editPassword');
    // Referencias a los elementos de la foto de perfil
    const profilePicture = document.getElementById('profilePicture');
    const photoUploadInput = document.getElementById('photoUploadInput');
    const changePhotoButton = document.getElementById('changePhotoButton');
    const uploadPhotoButton = document.getElementById('uploadPhotoButton');
    const cancelUploadButton = document.getElementById('cancelUploadButton');
    const deletePhotoButton = document.getElementById('deletePhotoButton'); // NUEVA REFERENCIA
    // Nuevos selectores para el menú de hamburguesa
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');
    const logoutButton = document.getElementById('logout-button');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn'); // NUEVO selector para el botón de cierre

    let originalProfilePicUrl = './uploads/fotos_perfil/default_profile.png'; // URL por defecto o si no hay foto

    // ************ INICIO DE CÓDIGO DE DEPURACIÓN ************
    console.log('Depuración de Selectores HTML:');
    console.log('editNombreCompleto:', editNombreCompleto);
    console.log('editUsuario:', editUsuario);
    console.log('editEmail:', editEmail);
    console.log('editPassword:', editPassword);
    // ************ FIN DE CÓDIGO DE DEPURACIÓN ************

    const editProfileForm = document.getElementById('editProfileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const notificationMessage = document.getElementById('notificationMessage');

    // Lógica del menú de hamburguesa (MODIFICADA)
   // Lógica para abrir el menú con el ícono de hamburguesa
if (hamburgerMenu && sidebar) {
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.add('open');
    });
}
// Lógica para cerrar el menú con el botón 'x'
if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
}

    // Lógica del botón de cerrar sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // Eliminar los datos del usuario del localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userTipo');
            // Redirigir a la página de inicio de sesión
            window.location.href = 'index.html';
        });
    } else {
        console.error('El botón de cerrar sesión no se encontró.');
    }

    // --- Funciones de Utilidad (para notificaciones) ---
    function showNotification(message, isError = false, isSuccess = false) {
        if (notificationMessage) { // Asegurarse de que el elemento existe antes de usarlo
            notificationMessage.textContent = message;
            notificationMessage.className = 'notification-message'; // Restablece las clases
            notificationMessage.classList.add('show');
            if (isError) {
                notificationMessage.classList.add('error');
            } else if (isSuccess) { // Nueva clase para éxito
                notificationMessage.classList.add('success');
            }

            setTimeout(() => {
                notificationMessage.classList.remove('show');
                notificationMessage.classList.remove('error'); // Limpiar clases
                notificationMessage.classList.remove('success'); // Limpiar clases
            }, 3000);
        } else {
            console.error('Elemento notificationMessage no encontrado.');
        }
    }

    // --- Cargar datos del perfil ---
    async function cargarDatosPerfil() {
        const userId = localStorage.getItem('userId');
        const userTipo = localStorage.getItem('userTipo');

        if (!userId || userTipo !== 'profesor') {
            console.error('Error: No se pudo identificar al profesor o el tipo de usuario no es correcto');
            showNotification('Error: No se pudo identificar al profesor. Por favor, inicie sesión nuevamente.', true);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }

        try {
            const response = await fetch(`/api/profesor-perfil/${userId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    showNotification('Profesor no encontrado.', true);
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al cargar el perfil del profesor.');
                }
            }
            const data = await response.json();
            // Cargar la foto de perfil
            if (profilePicture && deletePhotoButton) { // Asegúrate de que deletePhotoButton exista
                if (data.foto_perfil_url && data.foto_perfil_url !== './uploads/fotos_perfil/default_profile.png') {
                    profilePicture.src = data.foto_perfil_url;
                    originalProfilePicUrl = data.foto_perfil_url; // Guarda la URL original
                    deletePhotoButton.style.display = 'inline-block'; // Mostrar botón de eliminar
                } else {
                    profilePicture.src = './uploads/fotos_perfil/default_profile.png';
                    originalProfilePicUrl = './uploads/fotos_perfil/default_profile.png';
                    deletePhotoButton.style.display = 'none'; // Ocultar si es la por defecto
                }
            }

            // Llenar los campos de input con los datos actuales
            // Asegurarse de que los elementos no sean null antes de intentar asignarles un valor
            if (editNombreCompleto) {
                editNombreCompleto.value = data.nombre_completo || '';
            } else {
                console.error('Error: editNombreCompleto es null en cargarDatosPerfil');
            }
            if (editUsuario) {
                editUsuario.value = data.nombre_usuario || '';
            } else {
                console.error('Error: editUsuario es null en cargarDatosPerfil');
            }
            if (editEmail) {
                editEmail.value = data.email || '';
            } else {
                console.error('Error: editEmail es null en cargarDatosPerfil');
            }
        } catch (error) {
            console.error('Error al cargar datos del perfil:', error);
            showNotification(`Error al cargar datos del perfil: ${error.message}`, true);
        }
    }

    // --- Lógica para la subida y eliminación de foto de perfil ---
    if (profilePicture && photoUploadInput && changePhotoButton && uploadPhotoButton && cancelUploadButton && deletePhotoButton) { // AHORA INCLUYE deletePhotoButton en la comprobación

        // Al hacer clic en la imagen, simular clic en el input de archivo
        profilePicture.addEventListener('click', () => {
            photoUploadInput.click();
        });

        // Al hacer clic en el botón "Cambiar Foto", simular clic en el input de archivo
        changePhotoButton.addEventListener('click', () => {
            photoUploadInput.click();
        });

        // Cuando se selecciona un archivo en el input
        photoUploadInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePicture.src = e.target.result; // Previsualiza la imagen
                };
                reader.readAsDataURL(file);

                // Ocultar "Cambiar Foto" y "Eliminar Foto", mostrar "Subir Foto" y "Cancelar"
                changePhotoButton.style.display = 'none';
                deletePhotoButton.style.display = 'none'; // Oculta el botón de eliminar
                uploadPhotoButton.style.display = 'inline-block';
                cancelUploadButton.style.display = 'inline-block';
            }
        });

        // Al hacer clic en "Cancelar"
        cancelUploadButton.addEventListener('click', () => {
            // Restablecer la imagen original y ocultar botones de subida/cancelación
            profilePicture.src = originalProfilePicUrl;
            photoUploadInput.value = ''; // Limpiar el input de archivo
            changePhotoButton.style.display = 'inline-block';
            uploadPhotoButton.style.display = 'none';
            cancelUploadButton.style.display = 'none';
            // Vuelve a mostrar el botón de eliminar si la foto original no era la por defecto
            if (originalProfilePicUrl !== './uploads/fotos_perfil/default_profile.png') {
                deletePhotoButton.style.display = 'inline-block';
            }
        });

        // Al hacer clic en "Subir Foto"
        uploadPhotoButton.addEventListener('click', async () => {
            const userId = localStorage.getItem('userId');
            const file = photoUploadInput.files[0];

            if (!userId) {
                showNotification('Error: Usuario no identificado para subir foto.', true);
                return;
            }
            if (!file) {
                showNotification('Por favor, selecciona una foto para subir.', true);
                return;
            }

            const formData = new FormData();
            formData.append('profilePicture', file); // 'profilePicture' debe coincidir con el nombre de campo en el servidor

            try {
                const response = await fetch(`/api/profesor-perfil/${userId}/upload-photo`, {
                    method: 'POST',
                    body: formData // FormData se envía directamente, sin 'Content-Type'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al subir la foto de perfil.');
                }

                const result = await response.json();
                showNotification(result.message || 'Foto de perfil actualizada con éxito.', false, true);

                // Actualizar la URL de la foto original y restablecer botones
                originalProfilePicUrl = result.foto_perfil_url; // Guarda la nueva URL
                profilePicture.src = originalProfilePicUrl; // Asegúrate de que la imagen mostrada es la final
                photoUploadInput.value = '';
                changePhotoButton.style.display = 'inline-block';
                uploadPhotoButton.style.display = 'none';
                cancelUploadButton.style.display = 'none';
                deletePhotoButton.style.display = 'inline-block'; // Muestra el botón de eliminar después de una subida exitosa

            } catch (error) {
                console.error('Error en la subida de foto:', error);
                showNotification(`Error al subir la foto: ${error.message}`, true);
                // Si hay un error, restablecer a la foto original o por defecto
                profilePicture.src = originalProfilePicUrl;
                photoUploadInput.value = '';
                changePhotoButton.style.display = 'inline-block';
                uploadPhotoButton.style.display = 'none';
                cancelUploadButton.style.display = 'none';
                // Asegúrate de que el botón de eliminar se muestre si la foto original no era la por defecto
                if (originalProfilePicUrl !== './uploads/fotos_perfil/default_profile.png') {
                    deletePhotoButton.style.display = 'inline-block';
                }
            }
        });

        // Al hacer clic en "Eliminar Foto"
        deletePhotoButton.addEventListener('click', async () => {

            const userId = localStorage.getItem('userId');
            if (!userId) {
                showNotification('Error: Usuario no identificado para eliminar foto.', true);
                return;
            }

            try {
                const response = await fetch(`/api/profesor-perfil/${userId}/delete-photo`, {
                    method: 'DELETE', // Usamos el método DELETE para eliminar un recurso
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al eliminar la foto de perfil.');
                }

                const result = await response.json();
                showNotification(result.message || 'Foto de perfil eliminada con éxito.', false, true);

                // Restablecer a la foto por defecto y ocultar el botón de eliminar
                profilePicture.src = './uploads/fotos_perfil/default_profile.png';
                originalProfilePicUrl = './uploads/fotos_perfil/default_profile.png'; // Actualiza la URL original
                deletePhotoButton.style.display = 'none'; // Ocultar el botón de eliminar
                photoUploadInput.value = ''; // Limpia el input de archivo por si acaso

            } catch (error) {
                console.error('Error al eliminar foto:', error);
                showNotification(`Error al eliminar la foto: ${error.message}`, true);
            }
        });

    } else {
        console.error('Alguno de los elementos de la sección de foto de perfil no se encontró. Revisa los IDs en el HTML.');
    }

    // --- Manejador de Eventos para Guardar Perfil ---
    if (editProfileForm) { // Asegurarse de que el formulario existe antes de añadir el listener
        editProfileForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const userId = localStorage.getItem('userId');
            if (!userId) {
                showNotification('Error: Usuario no identificado. Inicie sesión nuevamente.', true);
                return;
            }

            // Asegurarse de que los elementos existen antes de intentar acceder a sus valores
            const updatedData = {
                nombre_completo: editNombreCompleto ? editNombreCompleto.value : '',
                nombre_usuario: editUsuario ? editUsuario.value : '',
                email: editEmail ? editEmail.value : ''
            };

            if (editPassword && editPassword.value) {
                updatedData.password = editPassword.value;
            }

            try {
                const response = await fetch(`/api/profesor-perfil/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al actualizar el perfil.');
                }

                const result = await response.json();
                showNotification(result.message || 'Perfil actualizado con éxito.', false, true); // Añadido isSuccess

                cargarDatosPerfil(); // Recargar los datos después de guardar

            } catch (error) {
                console.error('Error al actualizar el perfil:', error);
                showNotification(`Error al actualizar el perfil: ${error.message}`, true);
            }
        });
    } else {
        console.error('Elemento editProfileForm no encontrado.');
    }

    // Cargar los datos del perfil al cargar la página
    cargarDatosPerfil();
});