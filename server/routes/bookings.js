const express = require('express');
const router = express.Router();

// ── GET /api/bookings ─────────────────────────────────────────────────────────
// List bookings with filters: ?view=upcoming|past|all&status=confirmed|cancelled
router.get('/', async (req, res, next) => {
  try {
    const { view = 'all', status, page = 1, limit = 50 } = req.query;
    const now = new Date();

    const where = {};

    if (view === 'upcoming') {
      where.startTime = { gte: now };
    } else if (view === 'past') {
      where.startTime = { lt: now };
    }

    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      req.prisma.booking.findMany({
        where,
        include: { eventType: { select: { name: true, color: true, duration: true, location: true } } },
        orderBy: view === 'past'
          ? { startTime: 'desc' }
          : { startTime: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      req.prisma.booking.count({ where }),
    ]);

    res.json({ bookings, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await req.prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { eventType: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/bookings/:id/cancel ────────────────────────────────────────────
// Cancel a booking (admin side)
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await req.prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const updated = await req.prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        cancelReason: req.body.reason || 'Cancelled by host',
      },
      include: { eventType: { select: { name: true } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
