import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { bookingsApi } from '../api';
import {
  Badge, Spinner, EmptyState, PageHeader, ConfirmDialog, ToastProvider, useToast,
} from '../components/ui';

dayjs.extend(relativeTime);

function formatDate(dt) {
  return dayjs(dt).format('ddd, MMM D, YYYY');
}
function formatTime(dt) {
  return dayjs(dt).format('h:mm A');
}

const TAB_OPTIONS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

function MeetingsContent() {
  const toast = useToast();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchBookings(); }, [tab]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params =
        tab === 'upcoming'
          ? { view: 'upcoming', status: 'confirmed' }
          : tab === 'past'
          ? { view: 'past', status: 'confirmed' }
          : { status: 'cancelled' };
      const data = await bookingsApi.list(params);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch {
      toast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await bookingsApi.cancel(cancelTarget.id, 'Cancelled by host');
      setBookings((prev) => prev.filter((b) => b.id !== cancelTarget.id));
      setTotal((t) => t - 1);
      toast('Meeting cancelled');
      setCancelTarget(null);
    } catch {
      toast('Failed to cancel meeting', 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <PageHeader
        title="Meetings"
        description="View and manage your scheduled meetings."
      />

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {TAB_OPTIONS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          title={`No ${tab} meetings`}
          description={
            tab === 'upcoming'
              ? "You don't have any upcoming meetings scheduled."
              : tab === 'past'
              ? "No past meetings found."
              : "No cancelled meetings."
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Group upcoming by date */}
          {tab === 'upcoming'
            ? <GroupedMeetings bookings={bookings} onCancel={setCancelTarget} />
            : bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  showCancel={tab !== 'cancelled'}
                  onCancel={() => setCancelTarget(b)}
                />
              ))
          }
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel this meeting?"
        description={cancelTarget ? `Meeting with ${cancelTarget.inviteeName} on ${formatDate(cancelTarget.startTime)} at ${formatTime(cancelTarget.startTime)}` : ''}
        confirmLabel="Cancel Meeting"
        variant="danger"
      />
    </div>
  );
}

function GroupedMeetings({ bookings, onCancel }) {
  // Group by date
  const groups = bookings.reduce((acc, b) => {
    const date = dayjs(b.startTime).format('YYYY-MM-DD');
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {dayjs(date).isSame(dayjs(), 'day')
                ? 'Today'
                : dayjs(date).isSame(dayjs().add(1, 'day'), 'day')
                ? 'Tomorrow'
                : formatDate(date)}
            </div>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="space-y-2">
            {items.map((b) => (
              <BookingCard key={b.id} booking={b} showCancel onCancel={() => onCancel(b)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingCard({ booking: b, showCancel, onCancel }) {
  const isPast = dayjs(b.startTime).isBefore(dayjs());

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 transition-shadow hover:shadow-card`}>
      {/* Color dot from event type */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ background: b.eventType?.color || '#006BFF' }}
      />

      {/* Time block */}
      <div className="text-center flex-shrink-0 w-16">
        <p className="text-lg font-bold text-gray-900 leading-none">{formatTime(b.startTime)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatTime(b.endTime)}</p>
      </div>

      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900">{b.inviteeName}</p>
          {b.status === 'cancelled' && <Badge variant="danger">Cancelled</Badge>}
        </div>
        <p className="text-xs text-gray-500 mb-1">
          {b.inviteeEmail}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" strokeLinecap="round" />
            </svg>
            {b.eventType?.name}
          </span>
          <span className="flex items-center gap-1">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
            </svg>
            {b.eventType?.duration} min
          </span>
          {b.eventType?.location && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
              </svg>
              {b.eventType.location}
            </span>
          )}
        </div>
        {b.notes && (
          <p className="text-xs text-gray-400 mt-1.5 italic">"{b.notes}"</p>
        )}
        {b.cancelReason && (
          <p className="text-xs text-red-400 mt-1">Reason: {b.cancelReason}</p>
        )}
      </div>

      {/* Right: date + action */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-500 mb-3 hidden sm:block">{formatDate(b.startTime)}</p>
        {showCancel && !isPast && (
          <button
            onClick={onCancel}
            className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline transition-colors"
          >
            Cancel
          </button>
        )}
        {isPast && b.status === 'confirmed' && (
          <Badge variant="default">Completed</Badge>
        )}
      </div>
    </div>
  );
}

export default function Meetings() {
  return (
    <ToastProvider>
      <MeetingsContent />
    </ToastProvider>
  );
}
