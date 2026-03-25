// src/app.js
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import doctorRoutes from './routes/doctors.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import cookieParser from 'cookie-parser';

const app = express();

// global middleware
app.use(express.json());
app.use(cookieParser());

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);

// 404
app.use(notFoundHandler);

// final error handler
app.use(errorHandler);

export default app;