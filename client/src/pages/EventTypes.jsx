import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventTypesApi } from '../api';
import {
  Button, Modal, Input, Textarea, Select, Badge, Toggle,
  EmptyState, Spinner, PageHeader, ConfirmDialog, ToastProvider, useToast,
} from '../components/ui';

const COLORS = [
  '#006BFF', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const defaultForm = {
  name: '',
  duration: 30,
  description: '',
  color: '#006BFF',
  location: '',
  slug: '',
};

function EventTypesContent() {
  const toast = useToast();
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create, else = eventType obj
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copyId, setCopyId] = useState(null);

  useEffect(() => { fetchEventTypes(); }, []);

  async function fetchEventTypes() {
    try {
      setLoading(true);
      const data = await eventTypesApi.list();
      setEventTypes(data);
    } catch {
      toast('Failed to load event types', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(et) {
    setEditTarget(et);
    setForm({
      name: et.name,
      duration: et.duration,
      description: et.description || '',
      color: et.color,
      location: et.location || '',
      slug: et.slug,
    });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.duration) e.duration = 'Duration is required';
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
      e.slug = 'Only lowercase letters, numbers, and hyphens';
    }
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) return setErrors(e);

    setSaving(true);
    try {
      if (editTarget) {
        const updated = await eventTypesApi.update(editTarget.id, form);
        setEventTypes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast('Event type updated');
      } else {
        const created = await eventTypesApi.create(form);
        setEventTypes((prev) => [...prev, created]);
        toast('Event type created');
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(et) {
    try {
      const updated = await eventTypesApi.toggle(et.id);
      setEventTypes((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    } catch {
      toast('Failed to update', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await eventTypesApi.delete(deleteTarget.id);
      setEventTypes((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast('Event type deleted');
      setDeleteTarget(null);
    } catch {
      toast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyId(slug);
      setTimeout(() => setCopyId(null), 2000);
    });
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Event Types"
        description="Create events and share links with people who can book time with you."
        action={
          <Button onClick={openCreate}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Event Type
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : eventTypes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
            </svg>
          }
          title="No event types yet"
          description="Create your first event type to start sharing your availability."
          action={<Button onClick={openCreate}>Create Event Type</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {eventTypes.map((et) => (
            <EventTypeCard
              key={et.id}
              et={et}
              onEdit={() => openEdit(et)}
              onDelete={() => setDeleteTarget(et)}
              onToggle={() => handleToggle(et)}
              onCopy={() => copyLink(et.slug)}
              copied={copyId === et.slug}
            />
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Event Type' : 'New Event Type'}
      >
        <div className="space-y-4">
          <Input
            label="Event name"
            required
            placeholder="e.g. 30 Minute Meeting"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Duration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>

            <Input
              label="Location / Link"
              placeholder="Zoom, Google Meet..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <Textarea
            label="Description"
            placeholder="What is this event about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />

          <Input
            label="URL slug"
            placeholder="auto-generated from name"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            error={errors.slug}
            hint="Leave blank to auto-generate"
          />

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-dot ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c, borderColor: form.color === c ? '#1f2937' : 'transparent' }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editTarget ? 'Save Changes' : 'Create Event Type'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete event type?"
        description={`"${deleteTarget?.name}" will be permanently deleted. Existing bookings will be cancelled.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function EventTypeCard({ et, onEdit, onDelete, onToggle, onCopy, copied }) {
  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 hover:shadow-card-hover
        ${et.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70'}
      `}
    >
      {/* Color stripe */}
      <div className="h-1 rounded-t-xl" style={{ background: et.color }} />

      <div className="flex items-center gap-4 p-5">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold text-gray-900 truncate">{et.name}</h3>
            {!et.isActive && <Badge variant="inactive">Inactive</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" />
              </svg>
              {et.duration} min
            </span>
            {et.location && (
              <span className="flex items-center gap-1 truncate">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                </svg>
                {et.location}
              </span>
            )}
            <Link
              to={`/book/${et.slug}`}
              target="_blank"
              className="text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5 hover:underline"
            >
              /book/{et.slug}
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          {et.description && (
            <p className="text-sm text-gray-400 mt-1 truncate">{et.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCopy}
            title="Copy booking link"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            {copied ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" strokeLinecap="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <Toggle checked={et.isActive} onChange={onToggle} />
        </div>
      </div>
    </div>
  );
}

export default function EventTypes() {
  return (
    <ToastProvider>
      <EventTypesContent />
    </ToastProvider>
  );
}
