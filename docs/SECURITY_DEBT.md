# Deuda Tecnica de Seguridad

## Endpoint `/api/users/passwords`

Estado: pendiente

El endpoint `GET /api/users/passwords` sigue activo para no romper el modulo actual de gestion de usuarios. Actualmente lo consume `js/modules/users/UserRepository.js` para validar datos que el frontend no puede resolver con `GET /api/users`, porque esa ruta excluye `password`.

Riesgo: aunque el endpoint requiere token de administrador, devuelve hashes de contrasenas al navegador. Ese dato no deberia salir del backend.

Correccion recomendada:

1. Reemplazar las validaciones del frontend por endpoints de validacion del lado servidor.
2. Evitar devolver hashes o contrasenas, incluso a usuarios administradores.
3. Mantener respuestas booleanas o mensajes de validacion especificos.
4. Eliminar `PortalDatabase.getPasswordsForValidation()` cuando el modulo de usuarios ya no lo necesite.

Nota: las credenciales de prueba se movieron fuera de `/js` para que no se carguen desde el portal publico. Si esas credenciales fueron usadas en una base real, deben rotarse.
