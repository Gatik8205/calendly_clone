import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#006BFF" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-lg font-medium text-gray-700 mb-1">Page not found</p>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
