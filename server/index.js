require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const eventTypesRouter = require('./routes/eventTypes');
const availabilityRouter = require('./routes/availability');
const bookingsRouter = require('./routes/bookings');
const publicRouter = require('./routes/public');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const prisma = new PrismaClient();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Attach prisma to every request (dependency injection via middleware)
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── API Routes ──────────────────────────────────────────────────────────────
// Admin routes (no auth — default user assumed logged in per spec)
app.use('/api/event-types', eventTypesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingsRouter);

// Public routes (invitee-facing, no auth required)
app.use('/api/public', publicRouter);

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
