/**
 * === MENÚ DE AJUSTES PARA PORTAL ARVIC ===
 * Dropdown con: foto de perfil, editar nombre, cambiar contraseña,
 * modo oscuro y cerrar sesión.
 * Compartido entre admin y consultor dashboards.
 */

// ============================================
// TOGGLE DROPDOWN
// ============================================
function toggleSettingsDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('settingsDropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('active');

    // Cerrar otros paneles abiertos
    closeOtherPanels();

    if (isOpen) {
        dropdown.classList.remove('active');
    } else {
        dropdown.classList.add('active');
        // Resetear vistas internas
        showSettingsMain();
    }
}

function closeSettingsDropdown() {
    const dropdown = document.getElementById('settingsDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function closeOtherPanels() {
    // Cerrar panel de notificaciones si está abierto
    const notifPanel = document.getElementById('notificationsPanel');
    if (notifPanel && notifPanel.classList.contains('active')) {
        notifPanel.classList.remove('active');
    }
    // Cerrar panel de ayuda si está abierto
    const helpPanel = document.getElementById('helpPanel');
    if (helpPanel && helpPanel.classList.contains('active')) {
        helpPanel.classList.remove('active');
    }
}

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('settingsDropdown');
    const badge = document.querySelector('.avatar-settings-badge');
    const avatarWrapper = document.querySelector('.user-avatar-wrapper');

    if (dropdown && dropdown.classList.contains('active')) {
        if (!dropdown.contains(e.target) && !badge?.contains(e.target) && !avatarWrapper?.contains(e.target)) {
            closeSettingsDropdown();
        }
    }
});

// Cerrar con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSettingsDropdown();
});

// ============================================
// NAVEGACIÓN INTERNA DEL DROPDOWN
// ============================================

// ============================================
// STATUS INDICATOR
// ============================================
function setUserStatus(status) {
    const badge = document.getElementById('userStatusBadge');
    if (badge) {
        badge.classList.remove('status-away', 'status-dnd');
        if (status === 'away') badge.classList.add('status-away');
        if (status === 'dnd') badge.classList.add('status-dnd');

        const titles = { online: 'En línea', away: 'Ausente', dnd: 'No molestar' };
        badge.title = titles[status] || 'En línea';
    }

    // Update active button in status bar
    document.querySelectorAll('.settings-status-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    localStorage.setItem('arvic_user_status', status);
}

function loadUserStatus() {
    const status = localStorage.getItem('arvic_user_status') || 'online';
    setUserStatus(status);
}

// ============================================
// NAVIGATION
// ============================================
function showSettingsMain() {
    document.querySelectorAll('.settings-view').forEach(v => v.style.display = 'none');
    const main = document.getElementById('settingsMainView');
    if (main) main.style.display = 'block';
}

function showEditProfile() {
    document.querySelectorAll('.settings-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById('settingsEditProfileView');
    if (view) {
        view.style.display = 'block';
        // Pre-rellenar nombre actual
        const user = window.AuthSys?.getCurrentUser();
        if (user) {
            const input = document.getElementById('settingsEditName');
            if (input) input.value = user.name || '';
        }
    }
}

function showChangePassword() {
    document.querySelectorAll('.settings-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById('settingsChangePasswordView');
    if (view) {
        view.style.display = 'block';
        // Limpiar campos
        const form = view.querySelectorAll('input');
        form.forEach(i => i.value = '');
        // Limpiar mensajes
        const msg = document.getElementById('settingsPwdMsg');
        if (msg) { msg.textContent = ''; msg.className = 'settings-msg'; }
    }
}

// ============================================
// FOTO DE PERFIL
// ============================================
function triggerPhotoUpload() {
    const input = document.getElementById('settingsPhotoInput');
    if (input) input.click();
}

async function handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showSettingsToast('Por favor selecciona una imagen válida', 'error');
        return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showSettingsToast('La imagen es demasiado grande (máximo 2MB)', 'error');
        return;
    }

    try {
        const base64 = await fileToBase64(file);
        const resized = await resizeImage(base64, 200, 200);

        const user = window.AuthSys?.getCurrentUser();
        if (!user) return;

        const userId = user.userId || user.id;
        const API_URL = window.PortalDB?.API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('arvic_token');

        const response = await fetch(`${API_URL}/users/${userId}/profile-photo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ profilePhoto: resized })
        });

        const result = await response.json();

        if (result.success) {
            updateAvatarDisplay(resized);
            updateDropdownPhotoPreview(resized);
            showSettingsToast('Foto actualizada correctamente', 'success');
        } else {
            showSettingsToast(result.message || 'Error al subir foto', 'error');
        }
    } catch (error) {
        console.error('Error subiendo foto:', error);
        showSettingsToast('Error al procesar la imagen', 'error');
    }

    // Resetear input
    event.target.value = '';
}

async function removeProfilePhoto() {
    try {
        const user = window.AuthSys?.getCurrentUser();
        if (!user) return;

        const userId = user.userId || user.id;
        const API_URL = window.PortalDB?.API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('arvic_token');

        const response = await fetch(`${API_URL}/users/${userId}/profile-photo`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        const result = await response.json();

        if (result.success) {
            updateAvatarDisplay(null);
            updateDropdownPhotoPreview(null);
            showSettingsToast('Foto eliminada', 'success');
        } else {
            showSettingsToast(result.message || 'Error al eliminar foto', 'error');
        }
    } catch (error) {
        console.error('Error eliminando foto:', error);
        showSettingsToast('Error al eliminar la foto', 'error');
    }
}

// ============================================
// EDITAR NOMBRE
// ============================================
async function saveProfileName() {
    const input = document.getElementById('settingsEditName');
    if (!input) return;

    const newName = input.value.trim();
    if (!newName) {
        showSettingsToast('El nombre no puede estar vacío', 'error');
        return;
    }

    try {
        const user = window.AuthSys?.getCurrentUser();
        if (!user) return;

        const userId = user.userId || user.id;
        const result = await window.PortalDB.updateUser(userId, { name: newName });

        if (result.success) {
            // Actualizar la sesión
            user.name = newName;
            window.AuthSys.saveCurrentSession(user);

            // Actualizar UI
            const nameEl = document.getElementById('adminUserName') || document.getElementById('consultorUserName');
            if (nameEl) nameEl.textContent = newName;

            const dropdownName = document.getElementById('settingsUserName');
            if (dropdownName) dropdownName.textContent = newName;

            showSettingsToast('Nombre actualizado correctamente', 'success');
            showSettingsMain();
        } else {
            showSettingsToast(result.message || 'Error al actualizar nombre', 'error');
        }
    } catch (error) {
        console.error('Error actualizando nombre:', error);
        showSettingsToast('Error al actualizar nombre', 'error');
    }
}

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================
async function saveNewPassword() {
    const currentPwd = document.getElementById('settingsCurrentPwd')?.value;
    const newPwd = document.getElementById('settingsNewPwd')?.value;
    const confirmPwd = document.getElementById('settingsConfirmPwd')?.value;
    const msgEl = document.getElementById('settingsPwdMsg');

    if (!currentPwd || !newPwd || !confirmPwd) {
        if (msgEl) { msgEl.textContent = 'Completa todos los campos'; msgEl.className = 'settings-msg error'; }
        return;
    }

    if (newPwd !== confirmPwd) {
        if (msgEl) { msgEl.textContent = 'Las contraseñas no coinciden'; msgEl.className = 'settings-msg error'; }
        return;
    }

    if (newPwd.length < 4) {
        if (msgEl) { msgEl.textContent = 'La contraseña debe tener al menos 4 caracteres'; msgEl.className = 'settings-msg error'; }
        return;
    }

    try {
        const user = window.AuthSys?.getCurrentUser();
        if (!user) return;

        const userId = user.userId || user.id;
        const API_URL = window.PortalDB?.API_URL || 'http://localhost:3000/api';
        const token = localStorage.getItem('arvic_token');

        const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
        });

        const result = await response.json();

        if (result.success) {
            if (msgEl) { msgEl.textContent = '✓ Contraseña actualizada'; msgEl.className = 'settings-msg success'; }
            setTimeout(() => showSettingsMain(), 1500);
        } else {
            if (msgEl) { msgEl.textContent = result.message || 'Error al cambiar contraseña'; msgEl.className = 'settings-msg error'; }
        }
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        if (msgEl) { msgEl.textContent = 'Error de conexión'; msgEl.className = 'settings-msg error'; }
    }
}

// ============================================
// MODO OSCURO
// ============================================
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    localStorage.setItem('arvic_dark_mode', isDark ? 'true' : 'false');

    // Actualizar ícono del toggle
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        const icon = toggle.querySelector('.settings-toggle-track');
        if (icon) icon.classList.toggle('active', isDark);
    }
}

function loadDarkModePreference() {
    const pref = localStorage.getItem('arvic_dark_mode');
    if (pref === 'true') {
        document.body.classList.add('dark-mode');
        const track = document.querySelector('.settings-toggle-track');
        if (track) track.classList.add('active');
    }
}

// ============================================
// CARGAR FOTO DE PERFIL AL INICIAR
// ============================================
async function loadUserProfilePhoto() {
    try {
        const user = window.AuthSys?.getCurrentUser();
        if (!user) return;

        const userId = user.userId || user.id;
        const userData = await window.PortalDB?.getUser(userId);

        if (userData && userData.profilePhoto) {
            updateAvatarDisplay(userData.profilePhoto);
            updateDropdownPhotoPreview(userData.profilePhoto);
        }
    } catch (error) {
        console.error('Error cargando foto de perfil:', error);
    }
}

// ============================================
// UTILIDADES
// ============================================
function updateAvatarDisplay(photoUrl) {
    const avatar = document.querySelector('.user-avatar');
    if (!avatar) return;

    if (photoUrl) {
        avatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
    }
}

function updateDropdownPhotoPreview(photoUrl) {
    const preview = document.getElementById('settingsPhotoPreview');
    if (!preview) return;

    if (photoUrl) {
        preview.innerHTML = `<img src="${photoUrl}" alt="Avatar">`;
        // Mostrar botón de eliminar
        const removeBtn = document.getElementById('settingsRemovePhoto');
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
        preview.innerHTML = '<i class="fa-solid fa-user"></i>';
        const removeBtn = document.getElementById('settingsRemovePhoto');
        if (removeBtn) removeBtn.style.display = 'none';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function resizeImage(base64, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;

            if (w > maxWidth || h > maxHeight) {
                const ratio = Math.min(maxWidth / w, maxHeight / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = base64;
    });
}

function showSettingsToast(message, type = 'success') {
    // Remover toast existente
    const existing = document.getElementById('settingsToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'settingsToast';
    toast.className = `settings-toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remover después de 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Cargar preferencia de dark mode
    loadDarkModePreference();

    // Cargar estado del usuario
    loadUserStatus();

    // Cargar foto de perfil (con pequeño delay para asegurar que auth está listo)
    setTimeout(() => {
        loadUserProfilePhoto();

        // Rellenar datos del usuario en el dropdown
        const user = window.AuthSys?.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('settingsUserName');
            if (nameEl) nameEl.textContent = user.name || 'Usuario';

            const emailEl = document.getElementById('settingsUserEmail');
            if (emailEl) emailEl.textContent = user.email || '';

            const roleEl = document.getElementById('settingsUserRole');
            if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrador' : 'Consultor';
        }
    }, 500);
});
