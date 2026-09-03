import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}