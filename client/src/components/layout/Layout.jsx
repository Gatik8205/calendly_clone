import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';

const NAV_ITEMS = [
  {
    to: '/',
    exact: true,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
    label: 'Event Types',
  },
  {
    to: '/availability',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Availability',
  },
  {
    to: '/meetings',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
    label: 'Meetings',
  },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-100
          flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="4" width="18" height="18" rx="2.5" />
              <path d="M16 2v4M8 2v4M3 10h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="8" cy="15" r="1.5" fill="white" />
              <circle cx="12" cy="15" r="1.5" fill="white" />
              <circle cx="16" cy="15" r="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">Calendly</span>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 px-4 py-3 mx-3 mt-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white rounded-full w-9 h-9 bg-primary-500">
            GY
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Gatik Yadav</p>
            <p className="text-xs text-gray-500 truncate">gatik.yadav</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-primary-500' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer links */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
            </svg>
            View Public Page
          </a>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
              <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
              <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-base font-semibold">Calendly</span>
          <div className="flex items-center justify-center text-sm font-semibold text-white rounded-full w-9 h-9 bg-primary-500">
            GY
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
