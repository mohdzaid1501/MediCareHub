const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAdmin() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@hms.com' }
        });

        if (!user) {
            console.log('ADMIN USER NOT FOUND');
            return;
        }

        console.log('User found:', user.email);
        console.log('Stored Hash:', user.password);

        const isMatch = await bcrypt.compare('admin123', user.password);
        console.log('Password "admin123" matches hash?', isMatch);

        if (!isMatch) {
            console.log('RE-HASHING AND UPDATING...');
            const newHash = await bcrypt.hash('admin123', 10);
            await prisma.user.update({
                where: { email: 'admin@hms.com' },
                data: { password: newHash }
            });
            console.log('Update successful.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();
