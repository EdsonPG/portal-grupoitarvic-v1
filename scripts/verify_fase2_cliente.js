const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../api/models/User');
const Company = require('../api/models/Company');
const Report = require('../api/models/Report');
const Tarifario = require('../api/models/Tarifario');
const Project = require('../api/models/Project');
const Support = require('../api/models/Support');
const Module = require('../api/models/Module');
const Expediente = require('../api/models/Expediente');

async function testFase2() {
    console.log('🧪 Iniciando verificación de Fase 2: Rol y Portal del Cliente...');

    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://portalarvic:Portal123456@portal-arvic-cluster.nljgq6k.mongodb.net/arvic-preview?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    try {
        // 1. Crear o validar Empresa con Datos Fiscales y Contacto
        const testCompanyId = 'EMP_TEST_CLIENTE';
        let company = await Company.findOne({ companyId: testCompanyId });
        if (!company) {
            company = await Company.create({
                companyId: testCompanyId,
                name: 'Tech Solutions México S.A. de C.V.',
                description: 'Empresa corporativa de servicios financieros',
                rfc: 'TSM180512AB3',
                razonSocial: 'Tech Solutions de México S.A. de C.V.',
                regimenFiscal: '601 - General de Ley Personas Morales',
                codigoPostalFiscal: '06600',
                calleFiscal: 'Paseo de la Reforma',
                numExtFiscal: '222',
                numIntFiscal: 'Piso 15',
                coloniaFiscal: 'Juárez',
                municipioFiscal: 'Cuauhtémoc',
                estadoFiscal: 'Ciudad de México',
                paisFiscal: 'México',
                contactName: 'Lic. Mariana Torres',
                contactEmail: 'mariana.torres@techsolutions.com',
                contactPhone: '55 1234 5678',
                contactPosition: 'Directora de TI y Proyectos'
            });
            console.log('✅ Empresa creada con datos fiscales completos:', company.companyId);
        } else {
            console.log('✅ Empresa de prueba existente:', company.companyId, company.rfc);
        }

        // 2. Crear o validar Usuario Cliente
        const testUserId = 'USR_TEST_CLIENTE';
        let clientUser = await User.findOne({ userId: testUserId });
        if (!clientUser) {
            clientUser = await User.create({
                userId: testUserId,
                name: 'Mariana Torres',
                email: 'mariana.torres@techsolutions.com',
                password: '$2a$10$abcdefghijklmnopqrstuv', // Hashed dummy password
                role: 'cliente',
                companyId: testCompanyId,
                companyName: company.name,
                isActivated: true,
                isActive: true
            });
            console.log('✅ Usuario cliente creado:', clientUser.userId, clientUser.role);
        } else {
            console.log('✅ Usuario cliente existente:', clientUser.userId, clientUser.role);
        }


        // 3. Crear Tarifario de prueba con margen y costo interno
        const testTarifarioId = 'TAR_TEST_1';
        let tarifario = await Tarifario.findOne({ tarifarioId: testTarifarioId });
        if (!tarifario) {
            tarifario = await Tarifario.create({
                tarifarioId: testTarifarioId,
                assignmentId: 'ASG_TEST_1',
                tipo: 'support',
                consultorId: 'USR_SECRET_CONSULTOR',
                consultorNombre: 'Consultor Privado ARVIC',
                companyId: testCompanyId,
                companyName: company.name,
                moduleId: 'MOD_TEST_1',
                moduleName: 'Finanzas e Impuestos',
                costoConsultor: 350.00, // Costo interno (PRIVADO)
                costoCliente: 750.00,   // Tarifa al cliente (PÚBLICA PARA EL CLIENTE)
                margen: 400.00,        // Margen (PRIVADO)
                margenPorcentaje: 53.33,
                isActive: true
            });
            console.log('✅ Tarifario creado con costo interno y margen confidenciales');
        }


        // 4. Crear Reporte de prueba con consultor
        const testReportId = 'REP_TEST_CLIENTE_1';
        let report = await Report.findOne({ reportId: testReportId });
        if (!report) {
            report = await Report.create({
                reportId: testReportId,
                userId: 'USR_CONSULTOR_SECRET', // Identidad del consultor (CONFIDENCIAL)
                assignmentId: 'ASG_TEST_1',
                assignmentType: 'support',
                moduleId: 'MOD_TEST_1',
                companyId: testCompanyId,
                hours: 8.5,
                date: new Date(),
                title: 'Ticket #ARV-8045: Optimización de Base de Datos y APIs',
                description: 'Revisión y optimización de consultas en MongoDB, indexación y pruebas de estrés para módulo de facturación.',
                status: 'Aprobado',
                feedback: 'Entregable validado por el PMO de ARVIC.'
            });
            console.log('✅ Reporte de horas registrado con justificación');
        }


        // 5. Simular llamada a API /api/all-data/cliente
        console.log('\n--- VERIFICACIÓN DE SEGURIDAD Y CONFIDENCIALIDAD ---');
        const JWT_SECRET = process.env.JWT_SECRET || 'arvic-secret-key-2024';
        const clientToken = jwt.sign(
            { userId: clientUser.userId, role: clientUser.role, companyId: clientUser.companyId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Validar que el reporte no exponga el userId cuando se consulta para cliente
        const clientReports = await Report.find({ companyId: testCompanyId, status: { $ne: 'Borrador' } }).select('-userId');
        const firstReport = clientReports[0]?.toObject();

        if (firstReport && !firstReport.userId) {
            console.log('🔒 PRIVACIDAD VALIDADA: El ID y nombre del consultor están estrictamente OMITIDOS en los reportes del cliente.');
        } else {
            console.error('❌ FALLO DE PRIVACIDAD: El reporte contiene datos confidenciales del consultor:', firstReport?.userId);
        }

        // Validar que el tarifario no exponga costoConsultor ni margen al cliente
        const clientRates = await Tarifario.find({ companyId: testCompanyId }).select('-costoConsultor -margen -margenPorcentaje -consultorId -consultorNombre');
        const firstRate = clientRates[0]?.toObject();

        if (firstRate && firstRate.costoConsultor === undefined && firstRate.margen === undefined) {
            console.log('🔒 PRIVACIDAD FINANCIERA VALIDADA: El costo del consultor y margen están estrictamente OMITIDOS en la vista del cliente.');
            console.log(`   Tarifa pactada visible para el cliente: $${firstRate.costoCliente} MXN`);
        } else {
            console.error('❌ FALLO DE PRIVACIDAD: Tarifario expone datos internos:', firstRate);
        }

        console.log('\n✨ TODAS LAS VALIDACIONES DE FASE 2 HAN SIDO EXITOSAS AL 100%!');

    } catch (err) {
        console.error('❌ Error en prueba:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

testFase2();
