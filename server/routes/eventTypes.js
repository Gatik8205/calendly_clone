const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Helper to generate a URL-safe slug from a name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ── Validation Rules ────────────────────────────────────────────────────────
const eventTypeValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('duration')
    .isInt({ min: 5, max: 480 })
    .withMessage('Duration must be between 5 and 480 minutes'),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must be lowercase letters, numbers and hyphens only'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex code'),
];

// ── GET /api/event-types ─────────────────────────────────────────────────────
// List all event types (admin view)
router.get('/', async (req, res, next) => {
  try {
    const eventTypes = await req.prisma.eventType.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { bookings: true } },
      },
    });
    res.json(eventTypes);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/event-types/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const eventType = await req.prisma.eventType.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });
    res.json(eventType);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/event-types ────────────────────────────────────────────────────
// Create a new event type
router.post('/', eventTypeValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, duration, description, color, location } = req.body;

    // Auto-generate slug from name if not provided
    let slug = req.body.slug ? req.body.slug.toLowerCase() : generateSlug(name);

    // Ensure slug uniqueness (append suffix if taken)
    let slugCandidate = slug;
    let counter = 1;
    while (await req.prisma.eventType.findUnique({ where: { slug: slugCandidate } })) {
      slugCandidate = `${slug}-${counter++}`;
    }

    const eventType = await req.prisma.eventType.create({
      data: {
        name,
        slug: slugCandidate,
        duration,
        description: description || null,
        color: color || '#006BFF',
        location: location || null,
      },
    });

    res.status(201).json(eventType);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/event-types/:id ─────────────────────────────────────────────────
// Update an event type
router.put('/:id', eventTypeValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, duration, description, color, location, isActive } = req.body;
    let updateData = { name, duration, color };

    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle slug update if provided and different
    if (req.body.slug) {
      const newSlug = req.body.slug.toLowerCase();
      const existing = await req.prisma.eventType.findUnique({ where: { slug: newSlug } });
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ error: 'Slug already in use' });
      }
      updateData.slug = newSlug;
    }

    const eventType = await req.prisma.eventType.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(eventType);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Event type not found' });
    next(err);
  }
});

// ── PATCH /api/event-types/:id/toggle ───────────────────────────────────────
// Toggle active/inactive
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const current = await req.prisma.eventType.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Event type not found' });

    const updated = await req.prisma.eventType.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/event-types/:id ──────────────────────────────────────────────
// Delete an event type (also cascades bookings if needed — handle carefully)
router.delete('/:id', async (req, res, next) => {
  try {
    // Cancel all related bookings first to preserve data integrity
    await req.prisma.booking.updateMany({
      where: { eventTypeId: req.params.id, status: 'confirmed' },
      data: { status: 'cancelled', cancelReason: 'Event type deleted' },
    });

    await req.prisma.eventType.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Event type not found' });
    next(err);
  }
});

module.exports = router;
