import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('hms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const login = (credentials) => api.post('/login', credentials);
export const register = (userData) => api.post('/register', userData);

export const getStats = () => api.get('/stats');
export const getPatients = () => api.get('/patients');
export const getDoctors = () => api.get('/doctors');

export const getAppointments = (patientId) =>
    api.get(`/appointments${patientId ? `?patientId=${patientId}` : ''}`);

export const bookAppointment = (data) => api.post('/appointments', data);
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}`, { status });

export const getLabTests = () => api.get('/lab-tests');
export const getLabReports = (patientId) =>
    api.get(`/lab-reports${patientId ? `?patientId=${patientId}` : ''}`);

export const bookLabTest = (data) => api.post('/lab-bookings', data);
export const createLabReport = (data) => api.post('/lab-reports', data);
export const addDoctor = (data) => api.post('/doctors', data);

// Scheduling & Availability
export const setDoctorAvailability = (data) => api.post('/doctor-availability', data);

// Pharmacy & Inventory
export const getInventory = () => api.get('/inventory');
export const addMedicine = (data) => api.post('/inventory', data);
export const getPrescriptions = (patientId) =>
    api.get(`/prescriptions${patientId ? `?patientId=${patientId}` : ''}`);
export const createPrescription = (data) => api.post('/prescriptions', data);
export const dispensePrescription = (id) => api.patch(`/prescriptions/${id}/dispense`);

// Billing
export const getBills = (patientId) =>
    api.get(`/bills${patientId ? `?patientId=${patientId}` : ''}`);
export const createBill = (data) => api.post('/bills', data);
export const markBillAsPaid = (id) => api.patch(`/bills/${id}/pay`);

export default api;
