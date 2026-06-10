# Deuda Tecnica de Seguridad

## Endpoint `/api/users/passwords`

Estado: resuelto en `codex/seguridad-estabilidad-produccion`

El endpoint `GET /api/users/passwords` quedo deshabilitado con respuesta `410 Gone`. El modulo actual de gestion de usuarios ya no consulta hashes para validar unicidad de contrasenas.

Riesgo anterior: aunque el endpoint requeria token de administrador, devolvia hashes de contrasenas al navegador. Ese dato no debe salir del backend.

Correccion aplicada:

1. Deshabilitar `/api/users/passwords`.
2. Evitar que `UserRepository` consulte hashes de contrasenas.
3. Quitar la validacion de unicidad de contrasenas desde el frontend.
4. Mantener validaciones de formato y longitud minima.

Nota: las credenciales de prueba se movieron fuera de `/js` para que no se carguen desde el portal publico. Si esas credenciales fueron usadas en una base real, deben rotarse.
