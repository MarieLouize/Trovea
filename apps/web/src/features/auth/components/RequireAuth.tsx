import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/auth.store';

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  const supabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase not configured: skip auth gate entirely (dev fallback)
  if (!supabaseConfigured) return <>{children}</>;

  // While session is being checked, show nothing (App.tsx handles loading state)
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
