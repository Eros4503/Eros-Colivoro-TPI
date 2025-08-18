document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const loginButton = document.querySelector('#boton-iniciar-sesion');
    const customMessageDiv = document.getElementById('custom-message');

    function showCustomMessage(message, type = 'error') {
        customMessageDiv.textContent = message;
        customMessageDiv.className = '';
        customMessageDiv.classList.add(type);
        customMessageDiv.classList.add('show');

        setTimeout(() => {
            customMessageDiv.classList.remove('show');
            customMessageDiv.classList.add('hidden');
        }, 3000);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('nombre-usuario').value;
        const password = document.getElementById('contraseña').value;

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre_usuario: username, contrasena: password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showCustomMessage(data.error, 'error');
            } else {
                // Guarda la información del usuario en el almacenamiento local
                localStorage.setItem('userId', data.id);
                localStorage.setItem('userNombre', data.nombre_completo);
                localStorage.setItem('userTipo', data.tipo_usuario);
                localStorage.setItem('userEmail', data.email); // **Añade esta línea**
                localStorage.setItem('userUsername', data.nombre_usuario); // **Añade esta línea**
                
                showCustomMessage('Inicio de sesión exitoso', 'success');

                setTimeout(() => {
                    switch (data.tipo_usuario) {
                        case 'alumno':
                            window.location.href = 'alumno.html';
                            break;
                        case 'profesor':
                            window.location.href = 'profesor.html';
                            break;
                        case 'admin':
                            window.location.href = 'admin_dashboard.html';
                            break;
                        default:
                            showCustomMessage('Tipo de usuario no reconocido', 'error');
                    }
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showCustomMessage('Error al iniciar sesión. Intente nuevamente.', 'error');
        });
    });
    
    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.dispatchEvent(new Event('submit'));
    });
});