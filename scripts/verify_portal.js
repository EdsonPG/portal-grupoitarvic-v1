const http = require('http');

function checkUrl(path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    path,
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    bytes: data.length,
                    ok: res.statusCode === 200
                });
            });
        });
        req.on('error', (err) => {
            resolve({ path, error: err.message, ok: false });
        });
    });
}

async function runTests() {
    console.log('🧪 Iniciando verificación de rutas y archivos estáticos...\n');
    
    const endpoints = [
        '/',
        '/index.html',
        '/css/shared.css',
        '/css/login.css',
        '/css/admin.css',
        '/css/consultor.css',
        '/admin/dashboard.html',
        '/consultor/dashboard.html',
        '/js/login.js',
        '/admin/admin.js',
        '/consultor/consultor.js',
        '/api/health'
    ];

    let allOk = true;
    for (const ep of endpoints) {
        const result = await checkUrl(ep);
        if (result.ok) {
            console.log(`✅ [${result.statusCode}] ${result.path.padEnd(28)} (${result.bytes} bytes) - ${result.contentType}`);
        } else {
            allOk = false;
            console.error(`❌ [${result.statusCode || 'ERR'}] ${result.path.padEnd(28)} Error: ${result.error || 'Status not 200'}`);
        }
    }

    console.log('\n----------------------------------------');
    if (allOk) {
        console.log('🎉 Todas las rutas y componentes de interfaz cargaron correctamente al 100%!');
    } else {
        console.log('⚠️ Algunos endpoints fallaron.');
    }
}

runTests();
