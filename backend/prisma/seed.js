const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding HMS RBAC data with secure passwords...');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Create Admin User
    await prisma.user.upsert({
        where: { email: 'admin@hms.com' },
        update: { password: hashedPassword },
        create: {
            email: 'admin@hms.com',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    // 2. Create Doctors
    const doctorCount = await prisma.doctor.count();
    if (doctorCount === 0) {
        await prisma.doctor.createMany({
            data: [
                { name: 'Dr. Sarah Wilson', specialization: 'Cardiology', contact: '555-0101', experience: 12, salary: 150000 },
                { name: 'Dr. James Miller', specialization: 'Neurology', contact: '555-0102', experience: 8, salary: 135000 },
                { name: 'Dr. Elena Rodriguez', specialization: 'Pediatrics', contact: '555-0103', experience: 15, salary: 145000 }
            ]
        });
    }

    // 3. Create Lab Tests
    const testCount = await prisma.labtest.count();
    if (testCount === 0) {
        await prisma.labtest.createMany({
            data: [
                { name: 'Complete Blood Count (CBC)', price: 45.0, description: 'General health checkup' },
                { name: 'Lipid Profile', price: 65.0, description: 'Cholesterol levels' },
                { name: 'MRI Scan', price: 450.0, description: 'Brain imaging' },
                { name: 'ECG', price: 120.0, description: 'Heart rhythm monitoring' }
            ]
        });
    }

    // 4. Create a Patient
    const patientCount = await prisma.patient.count();
    if (patientCount === 0) {
        const patientPass = await bcrypt.hash('patient123', 10);
        await prisma.user.create({
            data: {
                email: 'patient@example.com',
                password: patientPass,
                role: 'PATIENT',
                patient: {
                    create: {
                        name: 'John Doe',
                        age: 30,
                        gender: 'Male',
                        contact: '555-1234',
                        address: '123 Main St'
                    }
                }
            }
        });
    }

    // 4. Create Initial Medicines
    const medCount = await prisma.medicine.count();
    if (medCount === 0) {
        await prisma.medicine.createMany({
            data: [
                { name: 'Paracetamol', category: 'General', stock: 100, unitPrice: 5.5, expiryDate: new Date('2026-12-31'), description: 'Pain relief' },
                { name: 'Amoxicillin', category: 'Antibiotics', stock: 50, unitPrice: 12.0, expiryDate: new Date('2025-06-30'), description: 'Bacterial infections' },
                { name: 'Cetirizine', category: 'Allergy', stock: 15, unitPrice: 8.0, expiryDate: new Date('2025-10-15'), description: 'Antihistamine (Low Stock)' },
                { name: 'Ibuprofen', category: 'Painkiller', stock: 80, unitPrice: 6.0, expiryDate: new Date('2026-03-20'), description: 'Anti-inflammatory' }
            ]
        });
    }

    console.log('RBAC Seed successful including Medicines!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
