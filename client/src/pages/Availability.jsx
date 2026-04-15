import { useState, useEffect } from 'react';
import { availabilityApi } from '../api';
import { Button, Spinner, PageHeader, ToastProvider, useToast, Toggle, Select } from '../components/ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Generate time options in 30-minute increments
function generateTimeOptions() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const ampm = h < 12 ? 'AM' : 'PM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${mm} ${ampm}`;
      times.push({ value, label });
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

// Common timezone list
const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Australia/Sydney',
];

function AvailabilityContent() {
  const toast = useToast();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchSchedule(); }, []);

  async function fetchSchedule() {
    try {
      const data = await availabilityApi.get();
      setSchedule(data);
    } catch {
      toast('Failed to load availability', 'error');
    } finally {
      setLoading(false);
    }
  }

  function updateDay(idx, field, value) {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayOfWeek === idx ? { ...d, [field]: value } : d
      ),
    }));
    setDirty(true);
  }

  function updateTimezone(tz) {
    setSchedule((prev) => ({ ...prev, timezone: tz }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await availabilityApi.update({
        timezone: schedule.timezone,
        days: schedule.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          isActive: d.isActive,
        })),
      });
      setSchedule(updated);
      setDirty(false);
      toast('Availability saved');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    );
  }

  const activeDays = schedule?.days.filter((d) => d.isActive).length ?? 0;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <PageHeader
        title="Availability"
        description="Set the times you're available for bookings."
        action={
          dirty && (
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* ── Timezone ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Timezone</h3>
              <p className="text-xs text-gray-500 mt-0.5">All time slots will be shown in this timezone</p>
            </div>
            <select
              value={schedule.timezone}
              onChange={(e) => updateTimezone(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white hover:border-gray-300 transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Weekly Hours ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Weekly hours</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeDays === 0
                  ? 'No days active — you won\'t receive any bookings'
                  : `${activeDays} day${activeDays > 1 ? 's' : ''} active per week`}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              onClick={() => {
                setSchedule((prev) => ({
                  ...prev,
                  days: prev.days.map((d) => ({
                    ...d,
                    isActive: d.dayOfWeek >= 1 && d.dayOfWeek <= 5,
                  })),
                }));
                setDirty(true);
              }}
            >
              Reset to Mon–Fri
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {schedule.days.map((day) => (
              <DayRow
                key={day.dayOfWeek}
                day={day}
                onToggle={(val) => updateDay(day.dayOfWeek, 'isActive', val)}
                onStartChange={(val) => updateDay(day.dayOfWeek, 'startTime', val)}
                onEndChange={(val) => updateDay(day.dayOfWeek, 'endTime', val)}
              />
            ))}
          </div>
        </div>

        {/* ── Save Footer (always visible on mobile) ── */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
            className={!dirty ? 'opacity-40' : ''}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayRow({ day, onToggle, onStartChange, onEndChange }) {
  const name = DAY_NAMES[day.dayOfWeek];

  return (
    <div className={`flex items-center gap-4 px-5 py-4 transition-colors ${day.isActive ? '' : 'bg-gray-50/50'}`}>
      {/* Toggle + Day name */}
      <div className="w-32 flex items-center gap-3 flex-shrink-0">
        <Toggle checked={day.isActive} onChange={onToggle} />
        <span className={`text-sm font-medium ${day.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
          {name.slice(0, 3)}
        </span>
        <span className={`text-sm ${day.isActive ? 'text-gray-800' : 'text-gray-400'} hidden sm:inline`}>
          {name.slice(3)}
        </span>
      </div>

      {/* Time pickers or Unavailable label */}
      {day.isActive ? (
        <div className="flex items-center gap-2 flex-1">
          <select
            value={day.startTime}
            onChange={(e) => onStartChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white hover:border-gray-300 transition-colors flex-1 max-w-[130px]"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 flex-shrink-0">–</span>
          <select
            value={day.endTime}
            onChange={(e) => onEndChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white hover:border-gray-300 transition-colors flex-1 max-w-[130px]"
          >
            {TIME_OPTIONS.filter((t) => t.value > day.startTime).map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Duration indicator */}
          <span className="text-xs text-gray-400 hidden md:inline flex-shrink-0">
            {computeHours(day.startTime, day.endTime)}
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-400 flex-1">Unavailable</span>
      )}
    </div>
  );
}

function computeHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return '';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function Availability() {
  return (
    <ToastProvider>
      <AvailabilityContent />
    </ToastProvider>
  );
}
