const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/error');

const authRoutes = require('./routes/auth.routes');
const flatsRoutes = require('./routes/flats.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const paymentsRoutes = require('./routes/payments.routes');
const duesRoutes = require('./routes/dues.routes');
const expensesRoutes = require('./routes/expenses.routes');
const staffRoutes = require('./routes/staff.routes');
const cashbookRoutes = require('./routes/cashbook.routes');
const bankRoutes = require('./routes/bank.routes');
const noticesRoutes = require('./routes/notices.routes');
const complaintsRoutes = require('./routes/complaints.routes');
const reportsRoutes = require('./routes/reports.routes');
const receiptsRoutes = require('./routes/receipts.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const publicRoutes = require('./routes/public.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/flats', flatsRoutes);
app.use('/api/maintenance-bills', maintenanceRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
