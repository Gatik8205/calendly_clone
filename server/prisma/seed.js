const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters for FK constraints)
  await prisma.booking.deleteMany();
  await prisma.availabilityDay.deleteMany();
  await prisma.availabilitySchedule.deleteMany();
  await prisma.eventType.deleteMany();

  // ── 1. Create Event Types ──────────────────────────────────────────────────
  const eventTypes = await Promise.all([
    prisma.eventType.create({
      data: {
        name: '15 Minute Meeting',
        slug: '15min',
        duration: 15,
        description: 'A quick chat to connect and get to know each other.',
        color: '#006BFF',
        location: 'Google Meet',
      },
    }),
    prisma.eventType.create({
      data: {
        name: '30 Minute Meeting',
        slug: '30min',
        duration: 30,
        description: 'A standard meeting to discuss your needs and how I can help.',
        color: '#10B981',
        location: 'Zoom',
      },
    }),
    prisma.eventType.create({
      data: {
        name: '60 Minute Meeting',
        slug: '60min',
        duration: 60,
        description: 'An in-depth session for detailed discussions and problem solving.',
        color: '#8B5CF6',
        location: 'Zoom',
      },
    }),
    prisma.eventType.create({
      data: {
        name: 'Technical Interview',
        slug: 'tech-interview',
        duration: 45,
        description: 'A technical screening session with coding and system design questions.',
        color: '#F59E0B',
        location: 'Google Meet',
      },
    }),
  ]);

  console.log(`✅ Created ${eventTypes.length} event types`);

  // ── 2. Create Default Availability Schedule ─────────────────────────────────
  const schedule = await prisma.availabilitySchedule.create({
    data: {
      name: 'Working Hours',
      timezone: 'Asia/Kolkata',
      isDefault: true,
    },
  });

  // Mon–Fri: 9 AM – 5 PM active; Sat/Sun inactive
  const dayConfigs = [
    { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isActive: false }, // Sun
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },  // Mon
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },  // Tue
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },  // Wed
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },  // Thu
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },  // Fri
    { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isActive: false }, // Sat
  ];

  await prisma.availabilityDay.createMany({
    data: dayConfigs.map((d) => ({ ...d, scheduleId: schedule.id })),
  });

  console.log('✅ Created availability schedule with 7 days');

  // ── 3. Create Sample Bookings ──────────────────────────────────────────────
  // We'll create upcoming and past bookings across different event types
  const tz = 'Asia/Kolkata';
  const now = dayjs().tz(tz);

  const bookingsData = [
    // Upcoming bookings
    {
      eventTypeId: eventTypes[1].id, // 30 min
      inviteeName: 'Arjun Sharma',
      inviteeEmail: 'arjun.sharma@gmail.com',
      startTime: now.add(1, 'day').hour(10).minute(0).second(0).toDate(),
      endTime: now.add(1, 'day').hour(10).minute(30).second(0).toDate(),
      status: 'confirmed',
      notes: 'Looking forward to discussing the project.',
    },
    {
      eventTypeId: eventTypes[0].id, // 15 min
      inviteeName: 'Priya Nair',
      inviteeEmail: 'priya.nair@techcorp.in',
      startTime: now.add(2, 'day').hour(14).minute(0).second(0).toDate(),
      endTime: now.add(2, 'day').hour(14).minute(15).second(0).toDate(),
      status: 'confirmed',
      notes: null,
    },
    {
      eventTypeId: eventTypes[3].id, // tech interview
      inviteeName: 'Rohan Mehta',
      inviteeEmail: 'rohan.mehta@startup.io',
      startTime: now.add(3, 'day').hour(11).minute(0).second(0).toDate(),
      endTime: now.add(3, 'day').hour(11).minute(45).second(0).toDate(),
      status: 'confirmed',
      notes: 'Interested in the SDE role.',
    },
    {
      eventTypeId: eventTypes[2].id, // 60 min
      inviteeName: 'Kavya Reddy',
      inviteeEmail: 'kavya.reddy@design.co',
      startTime: now.add(5, 'day').hour(15).minute(0).second(0).toDate(),
      endTime: now.add(5, 'day').hour(16).minute(0).second(0).toDate(),
      status: 'confirmed',
      notes: 'Deep dive on the product roadmap.',
    },
    // Past bookings
    {
      eventTypeId: eventTypes[1].id,
      inviteeName: 'Siddharth Jain',
      inviteeEmail: 'sid.jain@college.edu',
      startTime: now.subtract(3, 'day').hour(10).minute(0).second(0).toDate(),
      endTime: now.subtract(3, 'day').hour(10).minute(30).second(0).toDate(),
      status: 'confirmed',
      notes: 'Discussion about internship opportunities.',
    },
    {
      eventTypeId: eventTypes[0].id,
      inviteeName: 'Ananya Krishnan',
      inviteeEmail: 'ananya.k@gmail.com',
      startTime: now.subtract(5, 'day').hour(13).minute(0).second(0).toDate(),
      endTime: now.subtract(5, 'day').hour(13).minute(15).second(0).toDate(),
      status: 'cancelled',
      notes: null,
      cancelReason: 'Schedule conflict',
    },
    {
      eventTypeId: eventTypes[3].id,
      inviteeName: 'Vikram Singh',
      inviteeEmail: 'vikram.s@techfirm.com',
      startTime: now.subtract(7, 'day').hour(11).minute(0).second(0).toDate(),
      endTime: now.subtract(7, 'day').hour(11).minute(45).second(0).toDate(),
      status: 'confirmed',
      notes: 'Follow-up tech interview.',
    },
  ];

  await prisma.booking.createMany({ data: bookingsData });

  console.log(`✅ Created ${bookingsData.length} sample bookings`);
  console.log('\n🎉 Seeding complete!\n');
  console.log('Sample event type links:');
  eventTypes.forEach((et) => {
    console.log(`  → /book/${et.slug}  (${et.name})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
