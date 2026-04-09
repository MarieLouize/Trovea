import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const supabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!supabaseConfigured) {
        setIsAdmin(true);
        setCheckingRole(false);
        return;
      }

      if (!isAuthenticated || !user) {
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      try {
        // Use an endpoint that requires AdminGuard
        await apiClient.get('/admin/merchants', { params: { limit: 1 } });
        setIsAdmin(true);
      } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 401) {
          setIsAdmin(false);
        } else {
          console.error('Role check failed:', err);
          setIsAdmin(false);
        }
      } finally {
        setCheckingRole(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [isAuthenticated, user, authLoading, supabaseConfigured]);

  // If Supabase not configured: skip auth gate (dev fallback)
  if (!supabaseConfigured) return <>{children}</>;

  // While session or role is being checked
  if (authLoading || checkingRole) return null;

  // Check if authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    // If not an admin, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
