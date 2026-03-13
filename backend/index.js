const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-hms-secret-key';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Middleware: Auth ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access only' });
    next();
};

app.get('/', (req, res) => {
    res.json({ message: "HMS Backend is Running", status: "OK", time: new Date() });
});

// --- Authentication ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { patient: true }
        });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, patientId: user.patient?.id },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    patientId: user.patient?.id
                },
                token
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { email, password, name, age, gender, contact, address } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'PATIENT',
                patient: {
                    create: {
                        name,
                        age: parseInt(age),
                        gender,
                        contact,
                        address
                    }
                }
            },
            include: { patient: true }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, patientId: user.patient?.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                patientId: user.patient?.id
            },
            token
        });
    } catch (error) {

        res.status(500).json({ error: error.message });
    }
});

// --- Admin: Patients ---

app.get('/api/patients', authenticateToken, adminOnly, async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: { user: true }
        });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Doctors & Availability ---

app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            include: { doctoravailability: true }
        });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors', authenticateToken, adminOnly, async (req, res) => {
    try {
        const doctor = await prisma.doctor.create({ data: req.body });
        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctor-availability', authenticateToken, adminOnly, async (req, res) => {
    try {
        const availability = await prisma.doctoravailability.create({ data: req.body });
        res.status(201).json(availability);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Appointments ---

app.get('/api/appointments', authenticateToken, async (req, res) => {
    const { patientId } = req.query;
    try {
        // Patients can only see their own appointments
        if (req.user.role === 'PATIENT' && parseInt(patientId) !== req.user.patientId) {
            return res.status(403).json({ error: 'Unauthorized view' });
        }

        const where = patientId ? { patientId: parseInt(patientId) } : {};
        const appointments = await prisma.appointment.findMany({
            where,
            include: { patient: true, doctor: true },
            orderBy: { date: 'asc' }
        });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
    console.log('New Appointment Data:', req.body);
    try {
        const appointment = await prisma.appointment.create({
            data: {
                ...req.body,
                patientId: parseInt(req.body.patientId),
                doctorId: parseInt(req.body.doctorId),
                date: new Date(req.body.date)
            }
        });
        res.status(201).json(appointment);
    } catch (error) {
        console.error('Appointment Creation Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


app.patch('/api/appointments/:id', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const appointment = await prisma.appointment.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Lab Services ---

app.get('/api/lab-tests', authenticateToken, async (req, res) => {
    try {
        const tests = await prisma.labtest.findMany();
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/lab-reports', authenticateToken, async (req, res) => {
    const { patientId } = req.query;
    try {
        if (req.user.role === 'PATIENT' && parseInt(patientId) !== req.user.patientId) {
            return res.status(403).json({ error: 'Unauthorized view' });
        }
        const where = patientId ? { patientId: parseInt(patientId) } : {};
        const reports = await prisma.labreport.findMany({
            where,
            include: { patient: true, labtest: true }
        });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/lab-bookings', authenticateToken, async (req, res) => {
    try {
        const booking = await prisma.labreport.create({ data: req.body });
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/lab-reports', authenticateToken, adminOnly, async (req, res) => {
    try {
        const report = await prisma.labreport.create({
            data: { ...req.body, date: new Date() }
        });
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Pharmacy & Inventory ---

app.get('/api/inventory', authenticateToken, async (req, res) => {
    try {
        const medicines = await prisma.medicine.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inventory', authenticateToken, adminOnly, async (req, res) => {
    try {
        const { expiryDate, stock, unitPrice } = req.body;
        const medicine = await prisma.medicine.create({
            data: {
                ...req.body,
                stock: parseInt(stock),
                unitPrice: parseFloat(unitPrice),
                expiryDate: new Date(expiryDate)
            }
        });
        res.status(201).json(medicine);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/prescriptions', authenticateToken, async (req, res) => {
    const { patientId } = req.query;
    try {
        if (req.user.role === 'PATIENT' && parseInt(patientId) !== req.user.patientId) {
            return res.status(403).json({ error: 'Unauthorized view' });
        }
        const where = patientId ? { patientId: parseInt(patientId) } : {};
        const prescriptions = await prisma.prescription.findMany({
            where,
            include: {
                patient: true,
                items: {
                    include: { medicine: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prescriptions', authenticateToken, async (req, res) => {
    const { patientId, appointmentId, notes, items } = req.body;
    try {
        const prescription = await prisma.prescription.create({
            data: {
                patientId: parseInt(patientId),
                appointmentId: appointmentId ? parseInt(appointmentId) : null,
                notes,
                items: {
                    create: items.map(item => ({
                        medicineId: parseInt(item.medicineId),
                        dosage: item.dosage,
                        duration: item.duration,
                        quantity: parseInt(item.quantity)
                    }))
                }
            },
            include: { items: true }
        });
        res.status(201).json(prescription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/prescriptions/:id/dispense', authenticateToken, adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const prescription = await prisma.prescription.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
        if (prescription.status === 'Dispensed') return res.status(400).json({ error: 'Already dispensed' });

        // Check stock and update
        await prisma.$transaction(async (tx) => {
            for (const item of prescription.items) {
                const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
                if (!med || med.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${med?.name || 'Unknown medicine'}`);
                }
                await tx.medicine.update({
                    where: { id: item.medicineId },
                    data: { stock: { decrement: item.quantity } }
                });
            }
            await tx.prescription.update({
                where: { id: parseInt(id) },
                data: { status: 'Dispensed' }
            });
        });

        res.json({ message: 'Prescription dispensed and stock updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Billing ---

app.get('/api/bills', authenticateToken, async (req, res) => {
    const { patientId } = req.query;
    try {
        if (req.user.role === 'PATIENT' && parseInt(patientId) !== req.user.patientId) {
            return res.status(403).json({ error: 'Unauthorized view' });
        }
        const where = patientId ? { patientId: parseInt(patientId) } : {};
        const bills = await prisma.bill.findMany({
            where,
            include: { patient: true },
            orderBy: { date: 'desc' }
        });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bills', authenticateToken, adminOnly, async (req, res) => {
    const { patientId, amount, description, items } = req.body;
    try {
        const bill = await prisma.bill.create({
            data: {
                patientId: parseInt(patientId),
                amount: parseFloat(amount),
                description,
                items: items // Json items
            }
        });
        res.status(201).json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/bills/:id/pay', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const bill = await prisma.bill.update({
            where: { id: parseInt(id) },
            data: { status: 'Paid' }
        });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Dashboard Stats ---

app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const [patientCount, doctorCount, pendingApps, pendingLabs, medicineCount, lowStockCount, unpaidBills] = await Promise.all([
            prisma.patient.count(),
            prisma.doctor.count(),
            prisma.appointment.count({ where: { status: 'Pending' } }),
            prisma.labreport.count({ where: { status: 'Pending' } }),
            prisma.medicine.count(),
            prisma.medicine.count({ where: { stock: { lt: 20 } } }),
            prisma.bill.count({ where: { status: 'Unpaid' } })
        ]);

        res.json({
            totalPatients: patientCount,
            totalDoctors: doctorCount,
            pendingAppointments: pendingApps,
            pendingLabTests: pendingLabs,
            totalMedicines: medicineCount,
            lowStockMedicines: lowStockCount,
            pendingBills: unpaidBills
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
