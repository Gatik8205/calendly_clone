import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import EventTypes from './pages/EventTypes';
import Availability from './pages/Availability';
import Meetings from './pages/Meetings';
import BookingPage from './pages/BookingPage';
import BookingConfirmation from './pages/BookingConfirmation';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* ── Admin Routes (sidebar layout) ─────────────────────────── */}
      <Route element={<Layout />}>
        <Route path="/" element={<EventTypes />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/meetings" element={<Meetings />} />
      </Route>

      {/* ── Public Routes (no sidebar) ──────────────────────────────── */}
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/confirmed" element={<BookingConfirmation />} />

      {/* ── 404 ─────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
