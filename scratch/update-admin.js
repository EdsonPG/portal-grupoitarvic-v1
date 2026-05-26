const mongoose = require('mongoose');
const User = require('../api/models/User');
require('dotenv').config({ path: './.env' });

async function updateAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await User.findOne({ userId: 'admin' });
        if (admin) {
            admin.password = 'hperez1402.';
            await admin.save();
            console.log('Admin password updated successfully.');
        } else {
            console.log('Admin not found. Creating...');
            const newAdmin = new User({
                userId: 'admin',
                name: 'Administrador',
                email: 'admin@arvic.com',
                password: 'hperez1402.',
                role: 'admin',
                isActive: true
            });
            await newAdmin.save();
            console.log('Admin created successfully.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateAdmin();
