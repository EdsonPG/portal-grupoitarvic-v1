const http = require('http');

function postJson(path, body) {
    return new Promise((resolve) => {
        const postData = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ statusCode: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', (err) => resolve({ error: err.message }));
        req.write(postData);
        req.end();
    });
}

async function testAuth() {
    console.log('🔑 Probando autenticación del backend...\n');
    
    // Probar login admin
    const adminRes = await postJson('/api/auth/login', { userId: 'admin', password: 'hperez1402.' });
    if (adminRes.statusCode === 200 && adminRes.data?.success) {
        console.log('✅ Login Administrador exitoso! Usuario:', adminRes.data.user.name, '| Rol:', adminRes.data.user.role);
    } else {
        console.log('❌ Login Administrador falló:', adminRes);
    }

    // Probar login con credenciales erróneas
    const badRes = await postJson('/api/auth/login', { userId: 'admin', password: 'wrongpassword' });
    if (badRes.statusCode === 401 || (badRes.data && !badRes.data.success)) {
        console.log('✅ Validación de contraseña incorrecta funcionando (401/Unauthorized)');
    } else {
        console.log('❌ Validación de contraseña incorrecta falló:', badRes);
    }
}

testAuth();
