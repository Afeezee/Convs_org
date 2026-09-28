import React, { createContext, useContext, useEffect } from "react";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/clerk-react";
import { api, setTokenGetter } from "@/api/client";

// Clerk-backed auth provider. Exposes { user, isAuthenticated, isLoadingAuth,
// isLoadingPublicSettings (always false), authError, logout, navigateToLogin,
// checkAppState (no-op) } — the same shape the rest of the app already reads.

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const [user, setUser] = React.useState(null);
  const [authError, setAuthError] = React.useState(null);

  // Register the token getter used by the fetch client so every request
  // carries a fresh Clerk JWT.
  useEffect(() => {
    setTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => setTokenGetter(null);
  }, [isSignedIn, getToken]);

  // Hydrate the merged user record from /api/auth/me (creates or claims the
  // internal users row on first sign-in) and expose it as `user`.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!authLoaded || !userLoaded) return;
      if (!isSignedIn) {
        setUser(null);
        setAuthError(null);
        return;
      }
      try {
        const me = await api.auth.me();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("auth/me failed", err);
        setAuthError({ type: "unknown", message: err.message ?? "Auth failed" });
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, userLoaded, isSignedIn, clerkUser?.id]);

  const logout = (redirectUrl) => {
    clerk.signOut({ redirectUrl: redirectUrl ?? "/Landing" });
  };

  const navigateToLogin = (returnUrl) => {
    const back = returnUrl ?? (typeof window !== "undefined" ? window.location.href : "/");
    if (typeof window !== "undefined") {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(back)}`;
    }
  };

  const isLoadingAuth = !authLoaded || !userLoaded || (isSignedIn && !user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isSignedIn && !!user,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
