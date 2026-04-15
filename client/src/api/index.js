import axios from 'axios';

// Use environment variable if available (Vercel)
// Otherwise fallback to local backend
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Event Types ──────────────────────────────────────────────
export const eventTypesApi = {
  list: () => api.get("/event-types").then(r => r.data),
  get: (id) => api.get(`/event-types/${id}`).then(r => r.data),
  create: (data) => api.post("/event-types", data).then(r => r.data),
  update: (id, data) => api.put(`/event-types/${id}`, data).then(r => r.data),
  toggle: (id) => api.patch(`/event-types/${id}/toggle`).then(r => r.data),
  delete: (id) => api.delete(`/event-types/${id}`),
};

// ── Availability ─────────────────────────────────────────────
export const availabilityApi = {
  get: () => api.get("/availability").then(r => r.data),
  update: (data) => api.put("/availability", data).then(r => r.data),
};

// ── Bookings (admin) ─────────────────────────────────────────
export const bookingsApi = {
  list: (params = {}) =>
    api.get("/bookings", { params }).then(r => r.data),

  get: (id) =>
    api.get(`/bookings/${id}`).then(r => r.data),

  cancel: (id, reason) =>
    api.patch(`/bookings/${id}/cancel`, { reason }).then(r => r.data),
};

// ── Public ───────────────────────────────────────────────────
export const publicApi = {
  getEventType: (slug) =>
    api.get(`/public/event-types/${slug}`).then(r => r.data),

  getSlots: (slug, date) =>
    api.get(`/public/slots/${slug}`, {
      params: { date },
    }).then(r => r.data),

  getAvailableDates: (slug, month) =>
    api.get(`/public/available-dates/${slug}`, {
      params: { month },
    }).then(r => r.data),

  book: (data) =>
    api.post("/public/book", data).then(r => r.data),

  getBooking: (id) =>
    api.get(`/public/bookings/${id}`).then(r => r.data),
};

export default api;