import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { publicApi } from '../api';
import { Button, Input, Textarea, Spinner } from '../components/ui';

// ── Mini calendar component ────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate, availableDates, month, onMonthChange }) {
  const today = dayjs().startOf('day');
  const monthStart = dayjs(`${month}-01`).startOf('month');
  const daysInMonth = monthStart.daysInMonth();
  const startDow = monthStart.day(); // 0=Sun

  const availSet = new Set(availableDates);

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) cells.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function getDateStr(day) {
    return `${month}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange(-1)}
          disabled={monthStart.isBefore(today, 'month')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {monthStart.format('MMMM YYYY')}
        </span>
        <button
          onClick={() => onMonthChange(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = getDateStr(day);
          const isToday = dateStr === today.format('YYYY-MM-DD');
          const isAvailable = availSet.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isPast = dayjs(dateStr).isBefore(today);

          return (
            <div key={day} className="flex justify-center">
              <button
                type="button"
                disabled={!isAvailable || isPast}
                onClick={() => isAvailable && !isPast && onSelectDate(dateStr)}
                className={`cal-day
                  ${isSelected ? 'selected' : ''}
                  ${isAvailable && !isPast && !isSelected ? 'available' : ''}
                  ${!isAvailable || isPast ? 'disabled' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-primary-400 ring-offset-0' : ''}
                `}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Format display time ───────────────────────────────────────────────────────
function displayTime(isoStr, timezone) {
  // Show in the host's timezone
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return dayjs(isoStr).format('h:mm A');
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [eventType, setEventType] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Calendar state
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);

  // Slot state
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');

  // Load event type on mount
  useEffect(() => {
    publicApi.getEventType(slug)
      .then(setEventType)
      .catch(() => setNotFound(true))
      .finally(() => setLoadingEvent(false));
  }, [slug]);

  // Load available dates when month changes
  const fetchAvailableDates = useCallback(async () => {
    if (!slug) return;
    setLoadingDates(true);
    try {
      const data = await publicApi.getAvailableDates(slug, month);
      setAvailableDates(data.availableDates);
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, [slug, month]);

  useEffect(() => { fetchAvailableDates(); }, [fetchAvailableDates]);

  // Load slots when date is selected
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    setShowForm(false);
    publicApi.getSlots(slug, selectedDate)
      .then((data) => {
        setSlots(data.slots);
        setTimezone(data.timezone || 'Asia/Kolkata');
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, slug]);

  function handleMonthChange(delta) {
    setMonth((prev) => dayjs(`${prev}-01`).add(delta, 'month').format('YYYY-MM'));
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setShowForm(false);
  }

  function handleSlotClick(slot) {
    setSelectedSlot(slot);
    setShowForm(true);
    setBookError('');
    setFormErrors({});
  }

  function validateForm() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  }

  async function handleBook() {
    const e = validateForm();
    if (Object.keys(e).length) return setFormErrors(e);
    setBooking(true);
    setBookError('');
    try {
      const result = await publicApi.book({
        slug,
        startTime: selectedSlot.startTime,
        inviteeName: form.name,
        inviteeEmail: form.email,
        notes: form.notes || undefined,
      });
      navigate(`/book/${slug}/confirmed`, { state: { booking: result } });
    } catch (err) {
      setBookError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Event Not Found</h1>
        <p className="text-gray-500">This event type doesn't exist or has been deactivated.</p>
      </div>
    );
  }

  const selectedSlotDisplay = selectedSlot
    ? `${displayTime(selectedSlot.startTime, timezone)} – ${displayTime(selectedSlot.endTime, timezone)}`
    : null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl shadow-modal rounded-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">

        {/* ── Left Panel: Event Details ── */}
        <div className="w-full md:w-72 lg:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-100 p-7 flex-shrink-0">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold mb-4">
              GY
            </div>
            <p className="text-sm text-gray-500 font-medium">Gatik Yadav</p>
            <h1 className="text-xl font-bold text-gray-900 mt-1 mb-3">{eventType.name}</h1>

            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" strokeLinecap="round" />
                </svg>
                {eventType.duration} minutes
              </div>
              {eventType.location && (
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                  </svg>
                  {eventType.location}
                </div>
              )}
              {selectedDate && (
                <div className="flex items-start gap-2 mt-1 text-gray-800 font-medium">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="mt-0.5 flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                  </svg>
                  <span>
                    {selectedSlotDisplay && <>{selectedSlotDisplay}<br /></>}
                    {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {eventType.description && (
            <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">{eventType.description}</p>
          )}
        </div>

        {/* ── Right Panel: Calendar / Slots / Form ── */}
        <div className="flex-1 p-7 overflow-y-auto">
          {!showForm ? (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Calendar */}
              <div className="flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Select a Date</h2>
                <MiniCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  availableDates={availableDates}
                  month={month}
                  onMonthChange={handleMonthChange}
                />
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    {dayjs(selectedDate).format('ddd, MMM D')}
                    <span className="text-gray-400 font-normal ml-2 text-xs">{timezone}</span>
                  </h2>

                  {loadingSlots ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No available slots on this day.</p>
                      <p className="text-xs text-gray-400 mt-1">Please choose another date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                      {slots.map((slot) => (
                        <button
                          key={slot.startTime}
                          className="time-slot-btn"
                          onClick={() => handleSlotClick(slot)}
                        >
                          {displayTime(slot.startTime, timezone)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedDate && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-400">← Select a date to see available times</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Booking Form ── */
            <div className="max-w-sm mx-auto">
              <button
                onClick={() => { setShowForm(false); setSelectedSlot(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>

              <h2 className="text-lg font-bold text-gray-900 mb-1">Enter Details</h2>
              <p className="text-sm text-gray-500 mb-6">
                {selectedSlotDisplay} · {dayjs(selectedDate).format('MMMM D, YYYY')}
              </p>

              <div className="space-y-4">
                <Input
                  label="Your name"
                  required
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={formErrors.name}
                />
                <Input
                  label="Email address"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={formErrors.email}
                />
                <Textarea
                  label="Additional notes"
                  placeholder="Anything you'd like to share before the meeting?"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />

                {bookError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                    {bookError}
                  </div>
                )}

                <Button className="w-full" size="lg" onClick={handleBook} loading={booking}>
                  Confirm Booking
                </Button>

                <p className="text-xs text-center text-gray-400">
                  By booking, you agree to receive a calendar invite at the provided email.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
