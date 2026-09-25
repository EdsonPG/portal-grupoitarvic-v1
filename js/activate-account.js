/**
 * === LÓGICA DE ACTIVACIÓN DE CUENTA Y ONBOARDING ===
 * Valida el token de activación, permite al usuario fijar su contraseña y acceder directamente.
 */

document.addEventListener('DOMContentLoaded', async function() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    const API_URL = isDevelopment 
        ? 'http://localhost:3000/api'
        : `${window.location.origin}/api`;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const loadingView = document.getElementById('loadingView');
    const activationForm = document.getElementById('activationForm');
    const tokenErrorView = document.getElementById('tokenErrorView');
    const successView = document.getElementById('successView');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    if (!token) {
        loadingView.style.display = 'none';
        tokenErrorView.style.display = 'block';
        return;
    }

    // Verificar token en el backend
    try {
        const verifyRes = await fetch(`${API_URL}/auth/verify-activation-token/${token}`);
        const verifyData = await verifyRes.json();

        loadingView.style.display = 'none';

        if (!verifyData.success || !verifyData.user) {
            tokenErrorView.style.display = 'block';
            return;
        }

        const user = verifyData.user;
        const roleNames = {
            admin: 'Administrador',
            consultor: 'Consultor Profesional',
            cliente: 'Cliente / Empresa'
        };

        // Mostrar datos en el formulario
        document.getElementById('roleBadge').textContent = roleNames[user.role] || user.role;
        document.getElementById('userGreeting').textContent = `¡Hola, ${user.name || 'Usuario'}!`;
        document.getElementById('userEmailDisplay').textContent = user.email;
        document.getElementById('userNameInput').value = user.name || '';

        activationForm.style.display = 'block';

    } catch (err) {
        console.error('Error verificando token:', err);
        loadingView.style.display = 'none';
        tokenErrorView.style.display = 'block';
        return;
    }

    // Medidor de fuerza de contraseña
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }

    // Enviar formulario de activación
    activationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('userNameInput').value.trim();
        const phone = document.getElementById('userPhoneInput').value.trim();
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsChecked = document.getElementById('termsCheck').checked;
        const activateBtn = document.getElementById('activateBtn');

        hideMessages();

        if (!termsChecked) {
            showError('Debes aceptar el Aviso de Privacidad para continuar.');
            return;
        }

        if (password.length < 10) {
            showError('La contraseña debe tener al menos 10 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Las contraseñas no coinciden.');
            document.getElementById('confirmPassword').focus();
            return;
        }

        activateBtn.classList.add('loading');
        activateBtn.disabled = true;
        activateBtn.innerHTML = '<span>Activando cuenta...</span>';

        try {
            const response = await fetch(`${API_URL}/auth/activate-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, name, phone })
            });

            const data = await response.json();

            if (data.success && data.token) {
                // Guardar token y sesión de usuario
                localStorage.setItem('arvic_token', data.token);
                localStorage.setItem('arvic_user', JSON.stringify(data.user));
                localStorage.setItem('arvic_current_session', JSON.stringify({
                    token: data.token,
                    user: data.user,
                    role: data.user.role,
                    userId: data.user.userId,
                    loginTime: new Date().toISOString()
                }));

                activationForm.style.display = 'none';
                successView.style.display = 'block';

                let targetDashboard = '/consultor/dashboard.html';
                if (data.user.role === 'admin') {
                    targetDashboard = '/admin/dashboard.html';
                } else if (data.user.role === 'cliente') {
                    targetDashboard = '/cliente/dashboard.html';
                }

                const link = document.getElementById('successDashboardLink');
                if (link) link.href = targetDashboard;

                // Redirigir automáticamente en 2 segundos
                setTimeout(() => {
                    window.location.href = targetDashboard;
                }, 2000);


            } else {
                showError(data.message || 'Error al activar la cuenta.');
                activateBtn.classList.remove('loading');
                activateBtn.disabled = false;
                activateBtn.innerHTML = '<i class="fas fa-shield-check"></i> Activar mi Cuenta y Entrar';
            }
        } catch (error) {
            console.error('Error en activación:', error);
            showError('Error de conexión. Intente nuevamente.');
            activateBtn.classList.remove('loading');
            activateBtn.disabled = false;
            activateBtn.innerHTML = '<i class="fas fa-shield-check"></i> Activar mi Cuenta y Entrar';
        }
    });
});

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function updatePasswordStrength(password) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;

    if (!password) {
        fill.style.width = '0%';
        fill.style.backgroundColor = 'transparent';
        text.textContent = 'Seguridad de la contraseña';
        text.style.color = '#94a3b8';
        return;
    }

    let score = 0;
    if (password.length >= 10) score += 25;
    if (password.length >= 14) score += 15;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    let color = '#ef4444';
    let label = 'Débil (mínimo 10 caracteres)';

    if (score >= 75) {
        color = '#10b981';
        label = 'Muy Fuerte';
    } else if (score >= 50) {
        color = '#0284c7';
        label = 'Fuerte';
    } else if (score >= 35) {
        color = '#f59e0b';
        label = 'Media';
    }

    fill.style.width = Math.min(score, 100) + '%';
    fill.style.backgroundColor = color;
    text.textContent = label;
    text.style.color = color;
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
    }
}

function hideMessages() {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
}
