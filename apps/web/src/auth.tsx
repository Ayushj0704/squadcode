import React, { createContext, useContext, useEffect, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin, googleLogout } from "@react-oauth/google";

type User = {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  imageUrl?: string;
};

type AuthContextType = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  getToken: () => Promise<string | null>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isLoaded: false,
  isSignedIn: false,
  user: null,
  getToken: async () => null,
  signOut: () => {},
});

export const AuthProvider = ({ children, publishableKey }: { children: React.ReactNode, publishableKey: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("app_token"));

  useEffect(() => {
    const initAuth = async () => {
      // In a real app we might validate the token with the backend here.
      // For now, if we have a token and user data in localStorage, we assume signed in.
      const storedUser = localStorage.getItem("app_user");
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoaded(true);
    };
    initAuth();
  }, [token]);

  const signOut = () => {
    googleLogout();
    localStorage.removeItem("app_token");
    localStorage.removeItem("app_user");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  const getToken = async () => token;

  return (
    <GoogleOAuthProvider clientId={publishableKey}>
      <AuthContext.Provider value={{ isLoaded, isSignedIn: !!user, user, getToken, signOut }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const ClerkProvider = AuthProvider;

export const useAuth = () => useContext(AuthContext);
export const useUser = () => {
  const { isLoaded, isSignedIn, user } = useContext(AuthContext);
  return { isLoaded, isSignedIn, user };
};

export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuth();
  return !isSignedIn ? <>{children}</> : null;
};

export const UserButton = () => {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      {user.imageUrl ? (
        <img src={user.imageUrl} alt="Avatar" className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
          {user.username.charAt(0).toUpperCase()}
        </div>
      )}
      <button onClick={signOut} className="text-sm text-slate-400 hover:text-slate-200">Logout</button>
    </div>
  );
};

export const GoogleLoginButton = () => {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse.credential) return;
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: credentialResponse.credential }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("app_token", data.token);
          localStorage.setItem("app_user", JSON.stringify(data.user));
          window.location.href = "/onboarding";
        }
      }}
      onError={() => {
        console.error("Login Failed");
      }}
    />
  );
};

export const SignInButton = ({ children }: { children?: React.ReactNode, mode?: string }) => {
  if (children) {
    return <div className="relative group">
      {children}
      <div className="absolute top-full right-0 mt-2 z-50 bg-white p-4 shadow-lg rounded-xl hidden group-focus-within:block group-hover:block">
         <GoogleLoginButton />
      </div>
    </div>;
  }
  return <GoogleLoginButton />;
};

export const SignUpButton = SignInButton;
