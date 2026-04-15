const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Valid IANA timezones sample list (client sends full IANA string)
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM 24-hour

// ── GET /api/availability ─────────────────────────────────────────────────────
// Get the default schedule with all days
router.get('/', async (req, res, next) => {
  try {
    let schedule = await req.prisma.availabilitySchedule.findFirst({
      where: { isDefault: true },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    // Bootstrap default schedule if none exists
    if (!schedule) {
      schedule = await req.prisma.availabilitySchedule.create({
        data: {
          name: 'Working Hours',
          timezone: 'Asia/Kolkata',
          isDefault: true,
          days: {
            create: [
              { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isActive: false },
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
              { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
              { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
              { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
              { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },
              { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isActive: false },
            ],
          },
        },
        include: { days: { orderBy: { dayOfWeek: 'asc' } } },
      });
    }

    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/availability ─────────────────────────────────────────────────────
// Update the entire schedule (timezone + all day configs) in one request
router.put(
  '/',
  [
    body('timezone').notEmpty().withMessage('Timezone is required'),
    body('days').isArray({ min: 7, max: 7 }).withMessage('Must provide all 7 days'),
    body('days.*.dayOfWeek').isInt({ min: 0, max: 6 }),
    body('days.*.startTime')
      .matches(TIME_REGEX)
      .withMessage('Start time must be HH:MM format'),
    body('days.*.endTime')
      .matches(TIME_REGEX)
      .withMessage('End time must be HH:MM format'),
    body('days.*.isActive').isBoolean(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { timezone, name, days } = req.body;

      // Validate that startTime < endTime for active days
      for (const day of days) {
        if (day.isActive && day.startTime >= day.endTime) {
          return res.status(400).json({
            error: `Day ${day.dayOfWeek}: start time must be before end time`,
          });
        }
      }

      let schedule = await req.prisma.availabilitySchedule.findFirst({
        where: { isDefault: true },
        include: { days: true },
      });

      if (!schedule) {
        // Create from scratch
        schedule = await req.prisma.availabilitySchedule.create({
          data: {
            name: name || 'Working Hours',
            timezone,
            isDefault: true,
            days: { create: days },
          },
          include: { days: { orderBy: { dayOfWeek: 'asc' } } },
        });
      } else {
        // Update schedule metadata
        await req.prisma.availabilitySchedule.update({
          where: { id: schedule.id },
          data: { timezone, name: name || schedule.name },
        });

        // Upsert each day config
        for (const day of days) {
          await req.prisma.availabilityDay.upsert({
            where: { scheduleId_dayOfWeek: { scheduleId: schedule.id, dayOfWeek: day.dayOfWeek } },
            update: {
              startTime: day.startTime,
              endTime: day.endTime,
              isActive: day.isActive,
            },
            create: {
              scheduleId: schedule.id,
              dayOfWeek: day.dayOfWeek,
              startTime: day.startTime,
              endTime: day.endTime,
              isActive: day.isActive,
            },
          });
        }

        // Reload with updated days
        schedule = await req.prisma.availabilitySchedule.findUnique({
          where: { id: schedule.id },
          include: { days: { orderBy: { dayOfWeek: 'asc' } } },
        });
      }

      res.json(schedule);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
