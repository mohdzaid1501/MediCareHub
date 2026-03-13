import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, TestTube, FileText, LayoutDashboard,
  Plus, Search, LogOut, Shield, User,
  HeartPulse, Microscope, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, ThumbsUp, Pill, ShoppingCart, AlertTriangle, ClipboardList, Receipt, Download, CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import api, {
  getStats, getPatients, getDoctors, getAppointments,
  getLabReports, login, register, addDoctor,
  bookAppointment, createLabReport, getLabTests, updateAppointmentStatus,
  setDoctorAvailability, getInventory, addMedicine, getPrescriptions,
  createPrescription, dispensePrescription, getBills, createBill, markBillAsPaid
} from './api';

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalPatients: 0, totalDoctors: 0, pendingAppointments: 0, pendingLabTests: 0
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [bills, setBills] = useState([]);

  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '', password: '', name: '', age: '', gender: 'Male', contact: '', address: ''
  });

  // Action Modals
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isPrescModalOpen, setIsPrescModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  // Forms
  const [newDoctor, setNewDoctor] = useState({ name: '', specialization: '', contact: '', experience: '', salary: '' });
  const [newAppt, setNewAppt] = useState({ doctorId: '', date: '', time: '', reason: '' });
  const [newReport, setNewReport] = useState({ patientId: '', testId: '', result: '', status: 'Completed' });
  const [newAvail, setNewAvail] = useState({ doctorId: '', dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' });
  const [newMed, setNewMed] = useState({ name: '', category: 'General', stock: 0, unitPrice: 0, expiryDate: '', description: '' });
  const [newPresc, setNewPresc] = useState({ patientId: '', notes: '', items: [] });
  const [newBill, setNewBill] = useState({ patientId: '', amount: 0, description: '', items: [] });

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('hms_user');
    const token = localStorage.getItem('hms_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setIsAuthModalOpen(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: statsData } = await getStats();
      setStats(statsData);

      const { data: docData } = await getDoctors();
      setDoctors(docData);

      const { data: testData } = await getLabTests();
      setLabTests(testData);

      if (user.role === 'ADMIN') {
        const { data: patData } = await getPatients();
        setPatients(patData);
        const { data: appData } = await getAppointments();
        setAppointments(appData);
        const { data: reportData } = await getLabReports();
        setLabReports(reportData);
      } else {
        const { data: appData } = await getAppointments(user.patientId);
        setAppointments(appData);
        const { data: reportData } = await getLabReports(user.patientId);
        setLabReports(reportData);
        const { data: prescData } = await getPrescriptions(user.patientId);
        setPrescriptions(prescData);
        const { data: billData } = await getBills(user.patientId);
        setBills(billData);
      }

      const { data: invData } = await getInventory();
      setInventory(invData);

      if (user.role === 'ADMIN') {
        const { data: allPrescData } = await getPrescriptions();
        setPrescriptions(allPrescData);
        const { data: allBillData } = await getBills();
        setBills(allBillData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const response = await login({ email: authForm.email, password: authForm.password });
        const { user: userData, token } = response.data;
        setUser(userData);
        localStorage.setItem('hms_token', token);
        localStorage.setItem('hms_user', JSON.stringify(userData));
        setIsAuthModalOpen(false);
      } else {
        const response = await register(authForm);
        setAuthMode('login');
        alert("Registration successful! Please login.");
      }
    } catch (err) {
      alert("Auth failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleAction = async (actionFn, closeModals) => {
    try {
      await actionFn();
      closeModals();
      fetchData();
    } catch (err) {
      alert("Action failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setIsAuthModalOpen(true);
    setAuthMode('login');
  };

  // Helper for generating time slots (simplified)
  const generateTimeSlots = (start, end) => {
    const slots = [];
    let current = new Date(`2024-01-01T${start}:00`);
    const limit = new Date(`2024-01-01T${end}:00`);
    while (current < limit) {
      slots.push(current.toTimeString().substring(0, 5));
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  };

  const exportBillToPDF = async (bill) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Primary blue
    doc.text('MEDICARE HUB INVOICE', margin, y);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice ID: #INV-${bill.id}`, margin, y + 10);
    doc.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, margin, y + 15);

    y += 40;

    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text('Bill To:', margin, y);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(bill.patient?.name || 'Valued Patient', margin, y + 7);
    
    y += 30;

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, 170, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Description', margin + 5, y + 7);
    doc.text('Amount', margin + 140, y + 7);

    y += 15;

    // Items
    doc.setTextColor(0);
    if (bill.items && bill.items.length > 0) {
      bill.items.forEach(item => {
        doc.text(item.name || 'Item', margin + 5, y);
        doc.text(`$${item.price?.toFixed(2) || '0.00'}`, margin + 140, y);
        y += 10;
      });
    } else {
      doc.text(bill.description || 'Medical Services', margin + 5, y);
      doc.text(`$${bill.amount.toFixed(2)}`, margin + 140, y);
      y += 10;
    }

    // Total
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + 170, y);
    y += 10;
    doc.setFontSize(16);
    doc.text('Total Amount:', margin + 100, y);
    doc.text(`$${bill.amount.toFixed(2)}`, margin + 140, y);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for choosing MediCare Hub Management System.', margin, 280);

    doc.save(`Invoice_#${bill.id}.pdf`);
  };

  if (!user && isAuthModalOpen) {
    return (
      <div className="modal-overlay">
        <div className="modal-content auth-modal">
          <div className="auth-header">
            <HeartPulse className="icon-blue" size={48} />
            <h2>MediCare Hub Portal</h2>
            <p>{authMode === 'login' ? 'Welcome back! Please login.' : 'Create your patient account.'}</p>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <input
              type="email" placeholder="Email" required
              value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              type="password" placeholder="Password" required
              value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            {authMode === 'register' && (
              <>
                <input type="text" placeholder="Full Name" required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
                <input type="number" placeholder="Age" required value={authForm.age} onChange={(e) => setAuthForm({ ...authForm, age: e.target.value })} />
                <select value={authForm.gender} onChange={(e) => setAuthForm({ ...authForm, gender: e.target.value })}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                <input type="text" placeholder="Contact" required value={authForm.contact} onChange={(e) => setAuthForm({ ...authForm, contact: e.target.value })} />
                <textarea placeholder="Address" required value={authForm.address} onChange={(e) => setAuthForm({ ...authForm, address: e.target.value })} />
              </>
            )}
            <button type="submit" className="btn-primary">
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <p className="auth-toggle">
            {authMode === 'login' ? "New patient?" : "Already have an account?"}
            <span onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? ' Create Account' : ' Login'}
            </span>
          </p>
          {authMode === 'login' && <div className="demo-hint"><small>Admin: admin@medicarehub.com / admin123</small></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Dynamic by Role */}
      <aside className="sidebar">
        <div className="logo-container">
          <Shield size={24} />
          <h1>{user.role === 'ADMIN' ? 'MediCare Hub Admin' : 'My Health'}</h1>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>

          {user.role === 'ADMIN' ? (
            <>
              <button className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
                <Users size={20} /> Patients
              </button>
              <button className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`} onClick={() => setActiveTab('doctors')}>
                <User size={20} /> Manage Doctors
              </button>
              <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
                <Calendar size={20} /> Hospital Calendar
              </button>
              <button className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
                <TestTube size={20} /> Lab Reports
              </button>
              <button className={`nav-item ${activeTab === 'pharmacy' ? 'active' : ''}`} onClick={() => setActiveTab('pharmacy')}>
                <ShoppingCart size={20} /> Pharmacy & Stock
              </button>
              <button className={`nav-item ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
                <ClipboardList size={20} /> Prescriptions
              </button>
              <button className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                <Receipt size={20} /> Billing & Invoices
              </button>
            </>
          ) : (
            <>
              <button className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
                <Calendar size={20} /> My Appointments
              </button>
              <button className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}>
                <FileText size={20} /> My Reports
              </button>
              <button className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`} onClick={() => setActiveTab('doctors')}>
                <Search size={20} /> Search Doctors
              </button>
              <button className={`nav-item ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
                <ClipboardList size={20} /> My Prescriptions
              </button>
              <button className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
                <Receipt size={20} /> My Invoices
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.email[0].toUpperCase()}</div>
            <div>
              <p className="user-name">{user.email.split('@')[0]}</p>
              <p className="user-role">{user.role}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <h2>{activeTab.toUpperCase()}</h2>
          <div className="search-bar">
            <Search size={18} />
            <input type="text" placeholder="Quick search..." />
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            {user.role === 'ADMIN' ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-bg bg-blue"><Users /></div>
                  <div className="stat-info"><h3>{stats.totalPatients}</h3><p>Total Patients</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg bg-green"><User /></div>
                  <div className="stat-info"><h3>{stats.totalDoctors}</h3><p>Total Doctors</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg bg-purple"><Calendar /></div>
                  <div className="stat-info"><h3>{stats.pendingAppointments}</h3><p>Pending Apps</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg bg-red"><Microscope /></div>
                  <div className="stat-info"><h3>{stats.pendingLabTests}</h3><p>Pending Labs</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg bg-orange"><Pill /></div>
                  <div className="stat-info"><h3>{stats.totalMedicines}</h3><p>Total Medicines</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-bg bg-yellow"><AlertTriangle /></div>
                  <div className="stat-info"><h3>{stats.lowStockMedicines}</h3><p>Low Stock Items</p></div>
                </div>
              </div>
            ) : (
              <div className="welcome-banner">
                <h1>Hello, {user.email.split('@')[0]}!</h1>
                <p>Welcome to your health dashboard. Stay updated with your upcoming care.</p>
                <div className="stats-grid" style={{ marginTop: '2rem' }}>
                  <div className="stat-card">
                    <div className="stat-icon-bg bg-blue"><Calendar /></div>
                    <div className="stat-info"><h3>{appointments.length}</h3><p>My Appointments</p></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon-bg bg-purple"><FileText /></div>
                    <div className="stat-info"><h3>{labReports.length}</h3><p>My Lab Reports</p></div>
                  </div>
                </div>
              </div>
            )}

            <div className="recent-section" style={{ marginTop: '2rem' }}>
              <div className="section-header">
                <h3>{user.role === 'ADMIN' ? 'Recent Appointments' : 'Upcoming Appointments'}</h3>
                {user.role === 'PATIENT' && <button className="btn-primary" onClick={() => setIsApptModalOpen(true)}>Book New</button>}
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Time</th>
                      <th>{user.role === 'ADMIN' ? 'Patient' : 'Doctor'}</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 5).map(app => (
                      <tr key={app.id}>
                        <td>{new Date(app.date).toLocaleDateString()}</td>
                        <td>{app.time}</td>
                        <td>{user.role === 'ADMIN' ? app.patient.name : app.doctor.name}</td>
                        <td><span className={`status-pill ${app.status.toLowerCase()}`}>{app.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Patients View (Admin Only) */}
        {activeTab === 'patients' && user.role === 'ADMIN' && (
          <div className="data-table">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Contact</th><th>Email</th></tr></thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}><td>#{p.id}</td><td>{p.name}</td><td>{p.age}</td><td>{p.contact}</td><td>{p.user.email}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Doctors View */}
        {activeTab === 'doctors' && (
          <div className="doctors-section">
            <div className="section-header">
              <h3>{user.role === 'ADMIN' ? 'Manage Doctors' : 'Our Specialists'}</h3>
              {user.role === 'ADMIN' && <button className="btn-primary" onClick={() => setIsDocModalOpen(true)}>Add Doctor</button>}
            </div>
            <div className="doctors-grid">
              {doctors.map(doc => (
                <div key={doc.id} className="doctor-card">
                  <div className="doc-avatar"><User size={30} /></div>
                  <h4>{doc.name}</h4>
                  <p className="specialization">{doc.specialization}</p>
                  <p className="experience">{doc.experience} Years Exp.</p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                    {user.role === 'ADMIN' && (
                      <button className="btn-icon" title="Set Availability" onClick={() => { setNewAvail({ ...newAvail, doctorId: doc.id }); setIsAvailModalOpen(true); }}>
                        <Clock size={18} />
                      </button>
                    )}
                    {user.role === 'PATIENT' && (
                      <button className="btn-primary" onClick={() => { setNewAppt({ ...newAppt, doctorId: doc.id }); setIsApptModalOpen(true); }}>
                        Book Appointment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appointments View / Calendar for Admin */}
        {activeTab === 'appointments' && (
          <div className="calendar-view">
            {user.role === 'ADMIN' ? (
              <div className="admin-calendar-container">
                <div className="section-header" style={{ marginBottom: '1rem' }}>
                  <h3>Hospital Appointment Grid</h3>
                  <div className="calendar-nav">
                    <button className="btn-icon"><ChevronLeft /></button>
                    <span>March 2026</span>
                    <button className="btn-icon"><ChevronRight /></button>
                  </div>
                </div>
                <div className="calendar-grid">
                  {/* Very simple visual grid placeholder */}
                  <div className="calendar-day-header">Mon</div>
                  <div className="calendar-day-header">Tue</div>
                  <div className="calendar-day-header">Wed</div>
                  <div className="calendar-day-header">Thu</div>
                  <div className="calendar-day-header">Fri</div>
                  <div className="calendar-day-header">Sat</div>
                  <div className="calendar-day-header">Sun</div>
                  {[...Array(31)].map((_, i) => (
                    <div key={i} className="calendar-cell">
                      <span className="day-num">{i + 1}</span>
                      {appointments.filter(a => new Date(a.date).getDate() === i + 1).map(a => (
                        <div key={a.id} className={`appt-mini-pill ${a.status.toLowerCase()}`}>
                          {a.time} - {a.doctor.name.split(' ')[1]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="data-table" style={{ marginTop: '2rem' }}>
                  <div className="section-header" style={{ padding: '1.5rem' }}>
                    <h3>Manage All Appointments</h3>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Time</th><th>Doctor</th><th>Patient</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map(app => (
                        <tr key={app.id}>
                          <td>{new Date(app.date).toLocaleDateString()}</td>
                          <td>{app.time}</td>
                          <td>{app.doctor.name}</td>
                          <td>{app.patient.name}</td>
                          <td><span className={`status-pill ${app.status.toLowerCase()}`}>{app.status}</span></td>
                          <td>
                            {app.status === 'Pending' && (
                              <button className="btn-icon" title="Approve" onClick={() => handleAction(() => updateAppointmentStatus(app.id, 'Approved'), () => { })}>
                                <ThumbsUp className="text-blue" size={20} />
                              </button>
                            )}
                            {(app.status === 'Pending' || app.status === 'Approved') && (
                              <>
                                <button className="btn-icon" title="Complete" onClick={() => handleAction(() => updateAppointmentStatus(app.id, 'Completed'), () => { })}>
                                  <CheckCircle className="text-green" size={20} />
                                </button>
                                <button className="btn-icon" title="Cancel" onClick={() => handleAction(() => updateAppointmentStatus(app.id, 'Cancelled'), () => { })}>
                                  <XCircle className="text-red" size={20} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (

              <div className="data-table">
                <div className="section-header" style={{ padding: '1.5rem' }}>
                  <h3>My Appointment History</h3>
                  <button className="btn-primary" onClick={() => setIsApptModalOpen(true)}>Request New</button>
                </div>
                <table>
                  <thead>
                    <tr><th>Date</th><th>Time</th><th>Doctor</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {appointments.map(app => (
                      <tr key={app.id}>
                        <td>{new Date(app.date).toLocaleDateString()}</td><td>{app.time}</td><td>{app.doctor.name}</td>
                        <td><span className={`status-pill ${app.status.toLowerCase()}`}>{app.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lab View */}
        {activeTab === 'lab' && (
          <div className="lab-section">
            <div className="section-header">
              <h3>{user.role === 'ADMIN' ? 'Manage Lab Reports' : 'My Health Reports'}</h3>
              {user.role === 'ADMIN' && <button className="btn-primary" onClick={() => setIsReportModalOpen(true)}>Create New Report</button>}
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Test</th>
                    {user.role === 'ADMIN' && <th>Patient</th>}
                    <th>Result</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {labReports.map(report => (
                    <tr key={report.id}>
                      <td>{new Date(report.date).toLocaleDateString()}</td>
                      <td>{report.test?.name || report.testId}</td>
                      {user.role === 'ADMIN' && <td>{report.patient?.name}</td>}
                      <td>{report.result || 'Pending'}</td>
                      <td><span className={`status-pill ${report.status.toLowerCase()}`}>{report.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pharmacy Inventory View (Admin Only) */}
        {activeTab === 'pharmacy' && user.role === 'ADMIN' && (
          <div className="pharmacy-section">
            <div className="section-header">
              <h3>Medicine Inventory</h3>
              <button className="btn-primary" onClick={() => setIsMedModalOpen(true)}>Add Medicine</button>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Expiry</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(med => (
                    <tr key={med.id}>
                      <td>{med.name}</td>
                      <td>{med.category}</td>
                      <td><span className={med.stock < 20 ? 'text-red bold' : ''}>{med.stock}</span></td>
                      <td>${med.unitPrice}</td>
                      <td>{new Date(med.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-pill ${med.stock < 20 ? 'cancelled' : 'approved'}`}>
                          {med.stock < 20 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prescriptions View */}
        {activeTab === 'prescriptions' && (
          <div className="prescriptions-section">
            <div className="section-header">
              <h3>{user.role === 'ADMIN' ? 'All Prescriptions' : 'My Prescriptions'}</h3>
              {user.role === 'ADMIN' && <button className="btn-primary" onClick={() => setIsPrescModalOpen(true)}>Create New Prescription</button>}
            </div>
            <div className="prescriptions-list">
              {prescriptions.map(presc => (
                <div key={presc.id} className="prescription-card">
                  <div className="presc-header">
                    <h4>Prescription #{presc.id}</h4>
                    <span>{new Date(presc.date).toLocaleDateString()}</span>
                  </div>
                  <div className="presc-body">
                    {user.role === 'ADMIN' && <p><strong>Patient:</strong> {presc.patient?.name}</p>}
                    <p><strong>Notes:</strong> {presc.notes || 'No notes'}</p>
                    <ul className="med-list">
                      {presc.items.map(item => (
                        <li key={item.id}>
                          {item.medicine?.name} - {item.dosage} ({item.duration}) x {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="presc-footer">
                    <span className={`status-pill ${presc.status.toLowerCase()}`}>{presc.status}</span>
                    {user.role === 'ADMIN' && presc.status === 'Pending' && (
                      <button className="btn-primary btn-sm" onClick={() => handleAction(() => dispensePrescription(presc.id), () => {})}>
                        Dispense Medicines
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing & Invoices View */}
        {activeTab === 'billing' && (
          <div className="billing-section">
            <div className="section-header">
              <h3>{user.role === 'ADMIN' ? 'All Invoices' : 'My Invoices'}</h3>
              {user.role === 'ADMIN' && <button className="btn-primary" onClick={() => setIsBillModalOpen(true)}>Generate New Bill</button>}
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th>
                    {user.role === 'ADMIN' && <th>Patient</th>}
                    <th>Amount</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => (
                    <tr key={bill.id}>
                      <td>{new Date(bill.date).toLocaleDateString()}</td>
                      <td>{bill.description || 'Medical Services'}</td>
                      {user.role === 'ADMIN' && <td>{bill.patient?.name}</td>}
                      <td className="bold">${bill.amount.toFixed(2)}</td>
                      <td><span className={`status-pill ${bill.status.toLowerCase()}`}>{bill.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon" title="Download PDF" onClick={() => exportBillToPDF(bill)}>
                            <Download size={18} />
                          </button>
                          {bill.status === 'Unpaid' && (
                            <button className="btn-primary btn-sm" onClick={() => handleAction(() => markBillAsPaid(bill.id), () => {})}>
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bills.length === 0 && <tr><td colSpan={user.role === 'ADMIN' ? 6 : 5} style={{ textAlign: 'center' }}>No invoices found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}

      {/* Medicine Modal */}
      {isMedModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Medicine</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <input type="text" placeholder="Medicine Name" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
              <input type="text" placeholder="Category" value={newMed.category} onChange={e => setNewMed({ ...newMed, category: e.target.value })} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" placeholder="Initial Stock" value={newMed.stock} onChange={e => setNewMed({ ...newMed, stock: e.target.value })} />
                <input type="number" placeholder="Unit Price" value={newMed.unitPrice} onChange={e => setNewMed({ ...newMed, unitPrice: e.target.value })} />
              </div>
              <input type="date" value={newMed.expiryDate} onChange={e => setNewMed({ ...newMed, expiryDate: e.target.value })} />
              <textarea placeholder="Description" value={newMed.description} onChange={e => setNewMed({ ...newMed, description: e.target.value })} />
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsMedModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => addMedicine(newMed), () => setIsMedModalOpen(false))}>Save Medicine</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {isPrescModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>Create New Prescription</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <select value={newPresc.patientId} onChange={e => setNewPresc({ ...newPresc, patientId: e.target.value })}>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <textarea placeholder="Doctor's Notes" value={newPresc.notes} onChange={e => setNewPresc({ ...newPresc, notes: e.target.value })} />
              
              <div className="presc-items-section" style={{ marginTop: '1rem' }}>
                <p><strong>Add Medicines:</strong></p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select id="medSelect" style={{ flex: 2 }}>
                    <option value="">Medicine</option>
                    {inventory.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock})</option>)}
                  </select>
                  <input type="text" id="dosageInput" placeholder="Dosage" style={{ flex: 1 }} />
                  <input type="number" id="qtyInput" placeholder="Qty" style={{ flex: 0.5 }} />
                  <button className="btn-primary" onClick={() => {
                    const mId = document.getElementById('medSelect').value;
                    const d = document.getElementById('dosageInput').value;
                    const q = document.getElementById('qtyInput').value;
                    if (mId && d && q) {
                      setNewPresc({
                        ...newPresc,
                        items: [...newPresc.items, { medicineId: mId, dosage: d, quantity: q, duration: 'As directed', name: inventory.find(i => i.id == mId).name }]
                      });
                    }
                  }}>Add</button>
                </div>
                <ul className="presc-temp-list">
                  {newPresc.items.map((item, idx) => (
                    <li key={idx}>
                      {item.name} - {item.dosage} x {item.quantity}
                      <span className="text-red pointer" style={{ marginLeft: '1rem' }} onClick={() => {
                        const updated = [...newPresc.items];
                        updated.splice(idx, 1);
                        setNewPresc({ ...newPresc, items: updated });
                      }}>Remove</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsPrescModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => createPrescription(newPresc), () => setIsPrescModalOpen(false))}>Issue Prescription</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {isBillModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>Generate New Invoice</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <select value={newBill.patientId} onChange={e => setNewBill({ ...newBill, patientId: e.target.value })}>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <textarea placeholder="Bill Description (e.g., General Treatment)" value={newBill.description} onChange={e => setNewBill({ ...newBill, description: e.target.value })} />
              
              <div className="bill-items-section" style={{ marginTop: '1rem' }}>
                <p><strong>Bill Items:</strong></p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" id="itemName" placeholder="Item Name" style={{ flex: 2 }} />
                  <input type="number" id="itemPrice" placeholder="Price" style={{ flex: 1 }} />
                  <button className="btn-primary" onClick={() => {
                    const name = document.getElementById('itemName').value;
                    const price = parseFloat(document.getElementById('itemPrice').value);
                    if (name && price) {
                      const updatedItems = [...newBill.items, { name, price }];
                      const totalAmount = updatedItems.reduce((acc, curr) => acc + curr.price, 0);
                      setNewBill({ ...newBill, items: updatedItems, amount: totalAmount });
                      document.getElementById('itemName').value = '';
                      document.getElementById('itemPrice').value = '';
                    }
                  }}>Add</button>
                </div>
                <ul className="presc-temp-list">
                  {newBill.items.map((item, idx) => (
                    <li key={idx}>
                      {item.name}
                      <span>${item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  Total: ${newBill.amount.toFixed(2)}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsBillModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => createBill(newBill), () => setIsBillModalOpen(false))}>Generate Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal with Time Slots */}
      {isApptModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Book Appointment</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <select value={newAppt.doctorId} onChange={e => setNewAppt({ ...newAppt, doctorId: parseInt(e.target.value) })}>
                <option value="">Select Doctor</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>)}
              </select>
              <input type="date" value={newAppt.date} onChange={e => setNewAppt({ ...newAppt, date: e.target.value })} />
              <div className="slot-picker">
                <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#666' }}>Available Time Slots (Every 30 mins):</p>
                <div className="slot-grid">
                  {generateTimeSlots('09:00', '17:00').map(slot => (
                    <button
                      key={slot}
                      className={`slot-btn ${newAppt.time === slot ? 'selected' : ''}`}
                      onClick={() => setNewAppt({ ...newAppt, time: slot })}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" placeholder="Reason" value={newAppt.reason} onChange={e => setNewAppt({ ...newAppt, reason: e.target.value })} />
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsApptModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => bookAppointment({ ...newAppt, patientId: user.patientId }), () => setIsApptModalOpen(false))}>Confirm Booking</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal (Admin) */}
      {isAvailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Set Doctor Availability</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <select onChange={e => setNewAvail({ ...newAvail, dayOfWeek: e.target.value })}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day}>{day}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="time" label="Start" value={newAvail.startTime} onChange={e => setNewAvail({ ...newAvail, startTime: e.target.value })} />
                <input type="time" label="End" value={newAvail.endTime} onChange={e => setNewAvail({ ...newAvail, endTime: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsAvailModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => setDoctorAvailability(newAvail), () => setIsAvailModalOpen(false))}>Save Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Report Modal (Admin) */}
      {isReportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Generate Lab Report</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <select onChange={e => setNewReport({ ...newReport, patientId: parseInt(e.target.value) })}>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select onChange={e => setNewReport({ ...newReport, testId: parseInt(e.target.value) })}>
                <option value="">Select Test</option>
                {labTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input type="text" placeholder="Result/Findings" onChange={e => setNewReport({ ...newReport, result: e.target.value })} />
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsReportModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => createLabReport(newReport), () => setIsReportModalOpen(false))}>Generate Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Modal (Admin) */}
      {isDocModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add New Doctor</h3>
            <div className="auth-form" style={{ marginTop: '1.5rem' }}>
              <input type="text" placeholder="Doctor Name" onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })} />
              <input type="text" placeholder="Specialization" onChange={e => setNewDoctor({ ...newDoctor, specialization: e.target.value })} />
              <input type="text" placeholder="Contact" onChange={e => setNewDoctor({ ...newDoctor, contact: e.target.value })} />
              <input type="number" placeholder="Experience (Years)" onChange={e => setNewDoctor({ ...newDoctor, experience: parseInt(e.target.value) })} />
              <input type="number" placeholder="Salary" onChange={e => setNewDoctor({ ...newDoctor, salary: parseFloat(e.target.value) })} />
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-logout" style={{ background: '#eee', color: '#333' }} onClick={() => setIsDocModalOpen(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleAction(() => addDoctor(newDoctor), () => setIsDocModalOpen(false))}>Save Specialist</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
