import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { publicApi } from '../api';
import { Spinner, Button } from '../components/ui';

function formatFull(dt, timezone) {
  try {
    return new Date(dt).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    return dayjs(dt).format('dddd, MMMM D, YYYY [at] h:mm A');
  }
}

export default function BookingConfirmation() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);
  const timezone = booking?.eventType?.location ? 'Asia/Kolkata' : 'Asia/Kolkata';

  // If navigated directly (no state), try to extract booking ID from query string
  useEffect(() => {
    if (booking) return;
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      publicApi.getBooking(id)
        .then(setBooking)
        .catch(() => navigate(`/book/${slug}`, { replace: true }))
        .finally(() => setLoading(false));
    } else {
      navigate(`/book/${slug}`, { replace: true });
    }
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!booking) return null;

  const startDisplay = formatFull(booking.startTime, 'Asia/Kolkata');
  const endDisplay = new Date(booking.endTime).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal border border-gray-100 max-w-md w-full p-8 text-center animate-slide-up">
        {/* Success icon */}
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill="#D1FAE5" />
            <path d="M7 12l3.5 3.5L17 9" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">You're scheduled!</h1>
        <p className="text-sm text-gray-500 mb-8">
          A calendar invitation has been sent to <span className="font-medium text-gray-700">{booking.inviteeEmail}</span>
        </p>

        {/* Meeting details card */}
        <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3.5 mb-8">
          <DetailRow
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
            }
            label="Event"
            value={booking.eventType?.name}
          />
          <DetailRow
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" />
              </svg>
            }
            label="Date & Time"
            value={`${startDisplay} – ${endDisplay}`}
          />
          <DetailRow
            icon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
            label="Invitee"
            value={`${booking.inviteeName} (${booking.inviteeEmail})`}
          />
          {booking.eventType?.location && (
            <DetailRow
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                </svg>
              }
              label="Location"
              value={booking.eventType.location}
            />
          )}
          {booking.notes && (
            <DetailRow
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              }
              label="Notes"
              value={booking.notes}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link to={`/book/${slug}`}>
            <Button variant="secondary" className="w-full">
              Book Another Time
            </Button>
          </Link>
        </div>

        {/* Booking reference */}
        <p className="text-xs text-gray-400 mt-6">
          Booking ID: <span className="font-mono">{booking.id.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
}
