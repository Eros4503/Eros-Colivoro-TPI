    document.addEventListener('DOMContentLoaded', () => {
        const registroForm = document.getElementById('registro-form');
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

        registroForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombreCompleto = document.getElementById('nombre-completo').value;
            const email = document.getElementById('email').value;
            const nombreUsuario = document.getElementById('nombre-usuario').value;
            const password = document.getElementById('password').value;
            const curso = document.getElementById('curso-selector').value; // Obtener el valor del selector de curso

            // Simple validación de que el curso fue seleccionado
            if (!curso) {
                showCustomMessage('Por favor, selecciona tu curso.', 'error');
                return;
            }

            fetch('/api/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombre_completo: nombreCompleto,
                    email: email,
                    nombre_usuario: nombreUsuario,
                    contrasena: password,
                    tipo_usuario: 'alumno', // Asumimos que los registros son para alumnos por defecto
                    curso: curso // Enviar el curso seleccionado
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showCustomMessage(data.error, 'error');
                } else {
                    showCustomMessage(data.message, 'success');
                    // Opcional: limpiar el formulario o redirigir
                    registroForm.reset();
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Redirigir al login después de un registro exitoso
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showCustomMessage('Error al registrar usuario. Intente nuevamente.', 'error');
            });
        });
    });