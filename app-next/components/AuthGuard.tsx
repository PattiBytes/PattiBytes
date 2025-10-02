import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthGuardProps {
  children: ReactNode;
  requireUsername?: boolean;
  requireVerification?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

// Loading Spinner Component (embedded to fix import issue)
export function LoadingSpinner({ 
  message = "Loading...",
  size = "default" 
}: { 
  message?: string;
  size?: "small" | "default" | "large";
}) {
  const sizeClasses = {
    small: "w-6 h-6",
    default: "w-10 h-10", 
    large: "w-16 h-16"
  };

  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <motion.div
          className={`spinner ${sizeClasses[size]}`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

export default function AuthGuard({ 
  children, 
  requireUsername = false,
  requireVerification = false,
  redirectTo = '/auth/login',
  fallback
}: AuthGuardProps) {
  const { user, userProfile, loading, error } = useAuth();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.replace(redirectTo);
      } else if (requireUsername && (!userProfile || !userProfile.username)) {
        // Authenticated but no username, redirect to setup
        router.replace('/auth/setup-username');
      } else if (requireVerification && !user.emailVerified) {
        // Authenticated but email not verified
        router.replace('/auth/verify-email');
      } else {
        // All checks passed
        setShouldRender(true);
      }
    }
  }, [user, userProfile, loading, router, requireUsername, requireVerification, redirectTo]);

  // Show loading while checking auth
  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  // Show error if there's an auth error
  if (error) {
    return (
      <div className="auth-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/auth/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  // Don't render children if conditions not met
  if (!shouldRender) {
    return fallback || null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Redirect Guard for already authenticated users
interface RedirectIfAuthenticatedProps {
  children: ReactNode;
  redirectTo?: string;
  checkProfile?: boolean;
}

export function RedirectIfAuthenticated({ 
  children, 
  redirectTo = '/dashboard',
  checkProfile = false
}: RedirectIfAuthenticatedProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (checkProfile && userProfile?.username) {
        router.replace(redirectTo);
      } else if (!checkProfile) {
        router.replace(redirectTo);
      }
    }
  }, [user, userProfile, loading, router, redirectTo, checkProfile]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user && (!checkProfile || userProfile?.username)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Role-based guard for admin features
interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { userProfile } = useAuth();
  
  // Check if user has admin role (implement based on your admin system)
  const isAdmin = userProfile?.isVerified && userProfile?.username === 'admin'; // Simplified check
  
  if (!isAdmin) {
    return fallback || (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access this area.</p>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Email verification guard
export function VerificationGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (user && !user.emailVerified) {
      router.replace('/auth/verify-email');
    }
  }, [user, router]);
  
  if (!user?.emailVerified) {
    return <LoadingSpinner message="Checking email verification..." />;
  }
  
  return <>{children}</>;
}
