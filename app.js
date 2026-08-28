/**
 * app.js - Punto de entrada de la aplicación para GoDaddy cPanel (Phusion Passenger)
 * Portal ARVIC v1.1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auto-instalación de paquetes si node_modules no existe en el servidor de GoDaddy
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath) || !fs.existsSync(path.join(nodeModulesPath, 'express'))) {
    console.log('📦 Detectado entorno nuevo en GoDaddy. Instalando paquetes de Node.js...');
    try {
        execSync('npm install --production', { cwd: __dirname, stdio: 'inherit' });
        console.log('✅ Paquetes instalados correctamente.');
    } catch (err) {
        console.error('⚠️ Advertencia en npm install:', err.message);
    }
}

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Servidor Portal ARVIC ejecutándose en el puerto ${PORT} (https://app.grupoitarvic.com)`);
});

module.exports = app;
