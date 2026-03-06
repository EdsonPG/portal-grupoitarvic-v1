/**
 * === LÓGICA DE LA PÁGINA DE RESET DE CONTRASEÑA ===
 * Maneja el restablecimiento de contraseña con token
 */

document.addEventListener('DOMContentLoaded', function() {
    // Detectar API URL
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    const API_URL = isDevelopment 
        ? 'http://localhost:3000/api'
        : `${window.location.origin}/api`;

    // Obtener token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const resetForm = document.getElementById('resetPasswordForm');
    const tokenErrorView = document.getElementById('tokenErrorView');
    const successView = document.getElementById('successView');
    const forgotSection = document.querySelector('.forgot-password-section');

    // Si no hay token, mostrar error
    if (!token) {
        resetForm.style.display = 'none';
        tokenErrorView.style.display = 'block';
        if (forgotSection) forgotSection.style.display = 'none';
        return;
    }

    // Password strength check
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }

    // Manejar el formulario
    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const resetBtn = document.getElementById('resetBtn');

        // Limpiar mensajes
        hideMessages();

        // Validaciones
        if (newPassword.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('Las contraseñas no coinciden.');
            document.getElementById('confirmPassword').focus();
            return;
        }

        // Mostrar estado de carga
        resetBtn.classList.add('loading');
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span>Restableciendo...</span>';

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (data.success) {
                // Mostrar vista de éxito
                resetForm.style.display = 'none';
                if (forgotSection) forgotSection.style.display = 'none';
                document.querySelector('.password-strength').style.display = 'none';
                successView.style.display = 'block';
            } else {
                // Si token expirado, mostrar vista de error
                if (response.status === 400 && data.message.includes('expirado')) {
                    resetForm.style.display = 'none';
                    if (forgotSection) forgotSection.style.display = 'none';
                    tokenErrorView.style.display = 'block';
                } else {
                    showError(data.message || 'Error al restablecer la contraseña.');
                    resetBtn.classList.remove('loading');
                    resetBtn.disabled = false;
                    resetBtn.innerHTML = '<i class="fas fa-key"></i> Restablecer Contraseña';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión. Intente nuevamente.');
            resetBtn.classList.remove('loading');
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-key"></i> Restablecer Contraseña';
        }
    });
});

// === Funciones de UI ===

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function updatePasswordStrength(password) {
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const strengthContainer = document.getElementById('passwordStrength');

    if (!password) {
        strengthContainer.style.display = 'none';
        return;
    }

    strengthContainer.style.display = 'flex';

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { text: 'Muy débil', color: '#ef4444', width: '20%' },
        { text: 'Débil', color: '#f97316', width: '40%' },
        { text: 'Media', color: '#eab308', width: '60%' },
        { text: 'Buena', color: '#22c55e', width: '80%' },
        { text: 'Excelente', color: '#059669', width: '100%' }
    ];

    const level = levels[Math.min(score, 4)];
    strengthFill.style.width = level.width;
    strengthFill.style.backgroundColor = level.color;
    strengthText.textContent = level.text;
    strengthText.style.color = level.color;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'flex';
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'flex';
    }
}

function hideMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}
