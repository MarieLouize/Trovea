import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/auth.store';

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  const supabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase not configured: skip auth gate (dev fallback)
  if (!supabaseConfigured) return <>{children}</>;

  // While session is being checked, show nothing
  if (isLoading) return null;

  // Check if authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check for admin role in app_metadata or user_metadata
  // (In Supabase, roles are often stored in a custom 'profiles' table,
  // but for the guard we check the JWT claims / metadata if synced)
  const role = user.app_metadata?.role || user.user_metadata?.role;
  const isAdmin = role === 'admin';

  if (!isAdmin) {
    // If not an admin, redirect to dashboard or show unauthorized
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
