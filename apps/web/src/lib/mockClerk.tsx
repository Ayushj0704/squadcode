/**
 * ⚠️ MOCK CLERK SHIM — FOR LOCAL TESTING ONLY
 * Replaces @clerk/clerk-react with stubs so the app runs without real auth.
 * All hooks return a fake "always signed-in" test user.
 */

import React, { useCallback } from "react";

const TEST_USER = {
  id: "test-user-id",
  username: "test_user",
  firstName: "Test",
  lastName: "User",
  fullName: "Test User",
  primaryEmailAddress: { emailAddress: "test@example.com" },
  imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
  publicMetadata: {},
  unsafeMetadata: {},
};

// Fake token — backend will reject it, but auth guards won't block the UI
const FAKE_TOKEN = "test-token-disabled-auth";

export function useAuth() {
  // useCallback ensures getToken is a stable reference — prevents infinite
  // re-render loops in components that use getToken as a useEffect dependency.
  const getToken = useCallback(async () => FAKE_TOKEN, []);
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: TEST_USER.id,
    sessionId: "test-session-id",
    getToken,
    signOut: async () => {},
  };
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: TEST_USER,
  };
}

export function useClerk() {
  return {
    signOut: async () => {},
    openSignIn: () => {},
    openSignUp: () => {},
    user: TEST_USER,
  };
}

export function useSession() {
  return {
    isLoaded: true,
    isSignedIn: true,
    session: { id: "test-session-id", getToken: async () => FAKE_TOKEN },
  };
}

// ─── Components ───────────────────────────────────────────────────────────────
// All provider/gate components simply pass through children (no auth checks).

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function ClerkLoaded({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function ClerkLoading() {
  return null;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function SignedOut() {
  return null;
}

export function RedirectToSignIn() {
  return null;
}

/** Renders children directly — clicking just navigates to /dashboard */
export function SignInButton({ children, mode: _mode }: { children?: React.ReactNode; mode?: string }) {
  return React.createElement(React.Fragment, null, children);
}

/** Renders children directly */
export function SignUpButton({ children, mode: _mode }: { children?: React.ReactNode; mode?: string }) {
  return React.createElement(React.Fragment, null, children);
}

/** Avatar placeholder for the signed-in test user */
export function UserButton({ afterSignOutUrl: _afterSignOutUrl }: { afterSignOutUrl?: string } = {}) {
  return React.createElement(
    "div",
    {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6e56ff, #a855f7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 12,
        fontWeight: 900,
        cursor: "default",
        flexShrink: 0,
        userSelect: "none",
      },
      title: "Test User (auth disabled)",
    },
    "T"
  );
}

export default {};
