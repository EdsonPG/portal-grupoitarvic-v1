# Configuracion de Seguridad para Staging y Produccion

## Variables recomendadas

Estas variables deben definirse en el host antes de abrir el portal a usuarios reales:

```env
NODE_ENV=production
APP_URL=https://tu-dominio.com
CORS_ALLOWED_ORIGINS=https://tu-dominio.com
JWT_SECRET=<secreto-largo-y-unico>
REQUEST_BODY_LIMIT=10mb
API_RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_MAX=25
MIN_PASSWORD_LENGTH=10
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=0
MONGODB_MAX_IDLE_TIME_MS=30000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=8000
MONGODB_SOCKET_TIMEOUT_MS=45000
```

Para staging se puede usar:

```env
APP_URL=https://portal-arvic-staging.onrender.com
CORS_ALLOWED_ORIGINS=https://portal-arvic-staging.onrender.com
```

## CORS

En produccion ya no se permite cualquier dominio `*.vercel.app` por defecto. Si se necesita probar previews temporales, usar:

```env
ALLOW_VERCEL_PREVIEWS=true
```

No se recomienda mantener esa variable activa en produccion final.

## MongoDB Atlas

El backend limita el pool de conexiones con `MONGODB_MAX_POOL_SIZE`. Para el cluster gratuito o un despliegue inicial de bajo trafico, el valor recomendado es `10`.

Si Atlas sigue enviando alertas despues de limitar el pool, revisar:

1. Cantidad de instancias del servidor.
2. Procesos locales abiertos contra la misma base.
3. Conexiones desde Compass, Atlas UI o herramientas de prueba.
4. Necesidad real de subir el plan del cluster.

## Archivos y fotos

Las fotos de perfil siguen usando Base64 en MongoDB con limite de tamano. Para produccion es recomendable migrarlas despues a Cloudinary o almacenamiento equivalente y guardar en Mongo solo el identificador o URL.

Los PDFs/Excels de reportes no deben guardarse como binarios en MongoDB. Si se requiere historial descargable exacto, usar almacenamiento externo con acceso privado o URLs firmadas.

## Auditoria npm

`npm audit fix` sin `--force` fue aplicado. Queda una alerta moderada ligada a `exceljs -> uuid`. No se aplico `npm audit fix --force` porque npm propone un cambio rompedor sobre `exceljs`.
