const express = require('express');
const { body, validationResult } = require('express-validator');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const router = express.Router();

// ── Slot Generation Helper ───────────────────────────────────────────────────
/**
 * Generates available time slots for a given date and event type.
 *
 * Algorithm:
 * 1. Determine the day of week for the requested date in the host's timezone
 * 2. Fetch the availability config for that day
 * 3. Generate all candidate slots (start→end, step = event duration)
 * 4. Filter out slots that overlap with confirmed bookings
 * 5. Filter out past slots (if date is today)
 * Returns array of { startTime, endTime } ISO strings in UTC
 */
async function getAvailableSlots(prisma, eventType, dateStr, schedule) {
  // Parse date in host timezone to get day of week correctly
  const tz = schedule.timezone;
  const requestedDate = dayjs.tz(dateStr, 'YYYY-MM-DD', tz);
  const dayOfWeek = requestedDate.day(); // 0=Sun

  const dayConfig = schedule.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.isActive) return [];

  // Parse availability window in host timezone
  const [startH, startM] = dayConfig.startTime.split(':').map(Number);
  const [endH, endM] = dayConfig.endTime.split(':').map(Number);

  const windowStart = requestedDate.hour(startH).minute(startM).second(0).millisecond(0);
  const windowEnd = requestedDate.hour(endH).minute(endM).second(0).millisecond(0);

  // Fetch existing confirmed bookings for this date + event type
  const dayStart = requestedDate.startOf('day').utc().toDate();
  const dayEnd = requestedDate.endOf('day').utc().toDate();

  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId: eventType.id,
      status: 'confirmed',
      startTime: { gte: dayStart, lte: dayEnd },
    },
  });

  // Generate slots
  const slots = [];
  const now = dayjs().utc();
  let slotStart = windowStart.clone();

  while (slotStart.isBefore(windowEnd)) {
    const slotEnd = slotStart.add(eventType.duration, 'minute');
    if (slotEnd.isAfter(windowEnd)) break;

    // Skip slots in the past
    if (slotStart.utc().isBefore(now.add(30, 'minute'))) {
      slotStart = slotEnd;
      continue;
    }

    // Check overlap with existing bookings
    const hasConflict = existingBookings.some((booking) => {
      const bStart = dayjs(booking.startTime);
      const bEnd = dayjs(booking.endTime);
      // Overlap condition: not (slotEnd <= bStart OR slotStart >= bEnd)
      return !(slotEnd.utc().isBefore(bStart) || slotStart.utc().isAfter(bEnd) || slotStart.utc().isSame(bEnd));
    });

    if (!hasConflict) {
      slots.push({
        startTime: slotStart.utc().toISOString(),
        endTime: slotEnd.utc().toISOString(),
        // Also include host-timezone display times
        displayStart: slotStart.format('HH:mm'),
        displayEnd: slotEnd.format('HH:mm'),
      });
    }

    slotStart = slotEnd;
  }

  return slots;
}

// ── GET /api/public/event-types/:slug ─────────────────────────────────────────
// Fetch event type by slug for the public booking page
router.get('/event-types/:slug', async (req, res, next) => {
  try {
    const eventType = await req.prisma.eventType.findUnique({
      where: { slug: req.params.slug },
    });
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: 'Event type not found or inactive' });
    }
    res.json(eventType);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/public/slots/:slug?date=YYYY-MM-DD ──────────────────────────────
// Get available time slots for a specific date
router.get('/slots/:slug', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }

    const eventType = await req.prisma.eventType.findUnique({
      where: { slug: req.params.slug },
    });
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    const schedule = await req.prisma.availabilitySchedule.findFirst({
      where: { isDefault: true },
      include: { days: true },
    });
    if (!schedule) return res.json({ slots: [], timezone: 'UTC' });

    const slots = await getAvailableSlots(req.prisma, eventType, date, schedule);
    res.json({ slots, timezone: schedule.timezone });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/public/available-dates/:slug?month=YYYY-MM ──────────────────────
// Returns which dates in a month have at least one available slot
// Used to highlight dates on the calendar picker
router.get('/available-dates/:slug', async (req, res, next) => {
  try {
    const { month } = req.query; // "2024-03"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month query param required (YYYY-MM)' });
    }

    const eventType = await req.prisma.eventType.findUnique({
      where: { slug: req.params.slug },
    });
    if (!eventType || !eventType.isActive) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    const schedule = await req.prisma.availabilitySchedule.findFirst({
      where: { isDefault: true },
      include: { days: true },
    });
    if (!schedule) return res.json({ availableDates: [] });

    const tz = schedule.timezone;
    const monthStart = dayjs.tz(`${month}-01`, tz).startOf('month');
    const monthEnd = monthStart.endOf('month');
    const today = dayjs().tz(tz);

    // Get active days of week from schedule
    const activeDaysOfWeek = new Set(
      schedule.days.filter((d) => d.isActive).map((d) => d.dayOfWeek)
    );

    // For each day of month, check if it's active and in the future
    const availableDates = [];
    let current = monthStart.clone();

    while (current.isBefore(monthEnd) || current.isSame(monthEnd, 'day')) {
      const dayOfWeek = current.day();
      if (activeDaysOfWeek.has(dayOfWeek) && !current.isBefore(today, 'day')) {
        // Quick check: does this day have any non-booked slots?
        // For performance, just check if the day is active (full slot check on demand)
        availableDates.push(current.format('YYYY-MM-DD'));
      }
      current = current.add(1, 'day');
    }

    res.json({ availableDates, timezone: tz });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/public/book ─────────────────────────────────────────────────────
// Create a booking (public facing - invitee submits this)
router.post(
  '/book',
  [
    body('slug').notEmpty().withMessage('Event type slug is required'),
    body('startTime').isISO8601().withMessage('Valid ISO8601 startTime is required'),
    body('inviteeName').notEmpty().trim().withMessage('Name is required'),
    body('inviteeEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { slug, startTime: startTimeStr, inviteeName, inviteeEmail, notes } = req.body;

      // Fetch event type
      const eventType = await req.prisma.eventType.findUnique({ where: { slug } });
      if (!eventType || !eventType.isActive) {
        return res.status(404).json({ error: 'Event type not found or inactive' });
      }

      const startTime = new Date(startTimeStr);
      const endTime = new Date(startTime.getTime() + eventType.duration * 60000);

      // Validate start time is in the future
      if (startTime <= new Date()) {
        return res.status(400).json({ error: 'Cannot book a slot in the past' });
      }

      // ── Double-booking Prevention ────────────────────────────────────────
      // Check if there's any confirmed booking that overlaps with this slot
      const conflict = await req.prisma.booking.findFirst({
        where: {
          eventTypeId: eventType.id,
          status: 'confirmed',
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      });

      if (conflict) {
        return res.status(409).json({ error: 'This time slot is no longer available. Please choose another.' });
      }

      // ── Validate slot is within availability ─────────────────────────────
      const schedule = await req.prisma.availabilitySchedule.findFirst({
        where: { isDefault: true },
        include: { days: true },
      });

      if (schedule) {
        const tz = schedule.timezone;
        const slotDay = dayjs(startTime).tz(tz);
        const dayConfig = schedule.days.find((d) => d.dayOfWeek === slotDay.day());

        if (!dayConfig || !dayConfig.isActive) {
          return res.status(400).json({ error: 'Selected day is not available for booking' });
        }

        const [sh, sm] = dayConfig.startTime.split(':').map(Number);
        const [eh, em] = dayConfig.endTime.split(':').map(Number);
        const windowStart = slotDay.clone().hour(sh).minute(sm).second(0);
        const windowEnd = slotDay.clone().hour(eh).minute(em).second(0);
        const slotEnd = dayjs(endTime).tz(tz);

        if (slotDay.isBefore(windowStart) || slotEnd.isAfter(windowEnd)) {
          return res.status(400).json({ error: 'Selected time is outside availability hours' });
        }
      }

      // ── Create Booking ───────────────────────────────────────────────────
      const booking = await req.prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          inviteeName,
          inviteeEmail,
          startTime,
          endTime,
          status: 'confirmed',
          notes: notes || null,
        },
        include: { eventType: true },
      });

      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/public/bookings/:id ──────────────────────────────────────────────
// Fetch booking details for confirmation page
router.get('/bookings/:id', async (req, res, next) => {
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

module.exports = router;
