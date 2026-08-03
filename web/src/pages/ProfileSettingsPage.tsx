import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";
import { Check, Copy, Share2, Link as LinkIcon, Bell, BellOff } from "lucide-react";
import { createApiClient, apiBaseUrl } from "../lib/api";
import { getToken as getFcmToken } from "firebase/messaging";
import { messaging } from "../notification/firebase";

type Connection = { platform: "codeforces" | "leetcode" | "github"; username: string; verified: boolean; };
type Cache = { platform: "codeforces" | "leetcode" | "github"; data: unknown; fetchedAt: string; };
type ProfileData = { username: string; memberSince: string; connections: Connection[]; caches: Cache[]; };
type CFData = { rating?: number; maxRating?: number; rank?: string; maxRank?: string; };
type LCData = { totalSolved?: number; easySolved?: number; mediumSolved?: number; hardSolved?: number; };
type GHData = { username?: string; publicRepos?: number; contributionsLast24h?: number; public_repos?: number; };

function getCacheData<T>(caches: Cache[], platform: string): T | null {
  const cache = caches.find((c) => c.platform === platform);
  return cache ? (cache.data as T) : null;
}

export function ProfileSettingsPage() {
  usePageTitle("My Profile | SquadCode");
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  
  // We'll store both the basic DB user info and the full stats profile
  const [dbUsername, setDbUsername] = useState<string>("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState<boolean>(true);
  const [togglingInApp, setTogglingInApp] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [savingPfp, setSavingPfp] = useState(false);

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        const api = createApiClient(() => getToken());
        
        // 1. Get the real database username (since Clerk's user.username might be null for OAuth users)
        const meRes = await api.get("/me");
        const realUsername = meRes.data?.user?.username;
        if (!realUsername) return;
        
        setDbUsername(realUsername);
        setInAppNotificationsEnabled(meRes.data?.user?.inAppNotificationsEnabled ?? true);
        setProfileImageUrl(meRes.data?.user?.profileImageUrl || "");

        // 2. Fetch the stats for this username
        const profileRes = await api.get(`/me/profile/${realUsername}`);
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Failed to load profile stats", err);
      }
    };
    fetchEverything();
  }, [getToken]);

  async function toggleInAppNotifications() {
    if (togglingInApp) return;
    setTogglingInApp(true);
    try {
      const api = createApiClient(() => getToken());
      const next = !inAppNotificationsEnabled;
      await api.patch("/me/notifications", { inAppNotificationsEnabled: next });
      setInAppNotificationsEnabled(next);
    } catch (err) {
      console.error("Failed to toggle in-app notifications", err);
    } finally {
      setTogglingInApp(false);
    }
  }

  async function saveProfileImage() {
    if (savingPfp) return;
    setSavingPfp(true);
    try {
      const api = createApiClient(() => getToken());
      await api.patch("/me/profile", { profileImageUrl: profileImageUrl || null });
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Failed to update profile picture", err);
      alert("Failed to update profile picture");
    } finally {
      setSavingPfp(false);
    }
  }

  async function requestPushPermission() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const result = await Notification.requestPermission();
    setPushPermission(result);
    if (result !== "granted") return;

    // Permission granted — immediately obtain the FCM token and register it
    // with the backend so push works without requiring a page reload.
    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
      if (!vapidKey) return;

      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      if (!messaging) {
        throw new Error("Firebase Messaging is not supported in this browser.");
      }
      const fcmToken = await getFcmToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!fcmToken) return;

      const clerkToken = await getToken();
      if (!clerkToken) return;

      await fetch(`${apiBaseUrl()}/api/notifications/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ token: fcmToken }),
      });
    } catch (err) {
      console.error("[push] FCM registration failed", err);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file.");
      return;
    }

    // Limit file size to 5MB to avoid overwhelming the server
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large (max 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setProfileImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!clerkUser) return null;

  // Use the fetched db username, or fallback to Clerk username if still loading
  const displayUsername = dbUsername || clerkUser.username || "";
  const profileUrl = displayUsername ? `${window.location.origin}/u/${displayUsername}` : "";
  
  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out my SquadCode profile! I'm grinding Data Structures & Algorithms. 🚀🔥`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(profileUrl)}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out my SquadCode profile! 🚀 ${profileUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black tracking-tight text-ink-900">My Profile</h1>
        <p className="mt-1 text-ink-500 font-medium">Manage your public presence and share your coding stats.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Col: The Beautiful Card */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="group relative overflow-hidden rounded-3xl border-2 border-ink-900 bg-surface-0 shadow-card transition-all hover:shadow-pop hover:-translate-y-1">
            {/* SquadCode watermark background */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] z-0"
              aria-hidden="true"
            >
              <img src="/logo.png" alt="" className="h-64 w-64 object-contain" />
            </div>

            {/* Awesome Background Banner */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-brand-400 via-brand-500 to-coral-500 opacity-90 group-hover:opacity-100 transition-opacity z-0">
              <div className="absolute inset-0 bg-[url('/cubes.png')] mix-blend-overlay opacity-30"></div>
            </div>
            
            <div className="relative pt-16 px-8 pb-8 flex flex-col items-center text-center z-10">
              {/* Avatar */}
              <div className="rounded-full border-4 border-surface-0 bg-surface-0 shadow-pop-sm p-1">
                <img 
                  src={profileImageUrl || clerkUser.imageUrl} 
                  alt={displayUsername} 
                  className="h-24 w-24 rounded-full object-cover"
                />
              </div>
              
              <h2 className="mt-4 font-display text-2xl font-black text-ink-900">
                {displayUsername ? `@${displayUsername}` : "Loading..."}
              </h2>
              <p className="text-sm font-bold text-ink-500 mt-1 uppercase tracking-widest">
                SquadCode Member
              </p>

              {/* Stats Area */}
              {profile && (
                <div className="mt-6 flex flex-wrap justify-center gap-4 w-full">
                  {getCacheData<CFData>(profile.caches, "codeforces") && (
                    <div className="flex-1 min-w-[120px] rounded-2xl border-2 border-ink-900 bg-surface-1 p-3 shadow-pop-sm flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Codeforces</span>
                      <span className="mt-1 font-display text-xl font-black text-ink-900">
                        {getCacheData<CFData>(profile.caches, "codeforces")?.rating ?? "—"}
                      </span>
                    </div>
                  )}
                  {getCacheData<LCData>(profile.caches, "leetcode") && (
                    <div className="flex-1 min-w-[120px] rounded-2xl border-2 border-ink-900 bg-surface-1 p-3 shadow-pop-sm flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">LeetCode</span>
                      <span className="mt-1 font-display text-xl font-black text-[#FFA116]">
                        {getCacheData<LCData>(profile.caches, "leetcode")?.totalSolved ?? "—"}
                      </span>
                    </div>
                  )}
                  {getCacheData<GHData>(profile.caches, "github") && (
                    <div className="flex-1 min-w-[120px] rounded-2xl border-2 border-ink-900 bg-surface-1 p-3 shadow-pop-sm flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">GitHub Repos</span>
                      <span className="mt-1 font-display text-xl font-black text-ink-900">
                        {getCacheData<GHData>(profile.caches, "github")?.publicRepos ?? getCacheData<GHData>(profile.caches, "github")?.public_repos ?? "—"}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-8 w-full flex flex-col gap-2">
                <div className="flex items-center justify-center gap-1.5 opacity-50 mb-2">
                  <img src="/logo.png" className="h-4 w-4 rounded-md grayscale" />
                  <span className="font-display text-[10px] font-black uppercase tracking-widest text-ink-900">Powered by SquadCode</span>
                </div>
                <Link 
                  to={displayUsername ? `/u/${displayUsername}` : "#"}
                  className="block text-center w-full rounded-xl border-2 border-ink-900 bg-surface-0 px-4 py-3 text-sm font-black text-ink-900 shadow-pop-sm transition-all hover:bg-ink-900 hover:text-surface-0"
                  onClick={(e) => {
                    if (!displayUsername) e.preventDefault();
                  }}
                >
                  View Full Public Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Share Options + Notification Prefs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Share2 size={20} />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-900">Share Profile</h3>
            </div>
            
            <p className="text-sm text-ink-500 mb-4">
              Show off your LeetCode, Codeforces, and GitHub stats to the world.
            </p>

            {/* Link Copy Box */}
            <div className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-surface-1 p-1 pl-3 shadow-pop-sm mb-6">
              <LinkIcon size={16} className="text-ink-400 shrink-0" />
              <input 
                type="text" 
                readOnly 
                value={profileUrl} 
                className="flex-1 bg-transparent text-sm font-mono font-bold text-ink-800 outline-none truncate"
              />
              <button 
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-400"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleTwitterShare}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-ink-900 bg-[#000000] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-pop-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X (Twitter)
              </button>
              
              <button 
                onClick={handleWhatsAppShare}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-ink-900 bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-pop-sm"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Share on WhatsApp
              </button>
            </div>
          </div>

          {/* Profile Picture Card */}
          <div className="rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card">
            <h3 className="font-display text-lg font-bold text-ink-900 mb-2">Profile Picture</h3>
            <p className="text-sm text-ink-500 mb-4">
              Upload an image to customize your profile picture across SquadCode. Max size: 5MB.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview */}
              {profileImageUrl && (
                <img src={profileImageUrl} alt="Preview" className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-ink-900" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full sm:flex-1 text-sm text-ink-800 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-ink-900 file:text-sm file:font-bold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200"
              />
              <button
                onClick={saveProfileImage}
                disabled={savingPfp}
                className="w-full sm:w-auto shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-50"
              >
                {savingPfp ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="rounded-2xl border-2 border-border bg-surface-0 p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900">Notifications</h3>
                <p className="text-xs text-ink-400">Control how SquadCode reaches you</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* In-App Notifications Toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-1 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    inAppNotificationsEnabled ? "bg-brand-100 text-brand-600" : "bg-surface-2 text-ink-400"
                  }`}>
                    {inAppNotificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-900">In-App Notifications</p>
                    <p className="text-xs text-ink-400">Bell icon, mentions &amp; contest reminders</p>
                  </div>
                </div>
                <button
                  id="toggle-inapp-notifications"
                  onClick={toggleInAppNotifications}
                  disabled={togglingInApp}
                  aria-pressed={inAppNotificationsEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                    inAppNotificationsEnabled ? "bg-brand-500" : "bg-ink-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      inAppNotificationsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Browser Push Notifications */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-1 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    pushPermission === "granted" ? "bg-brand-100 text-brand-600" : "bg-surface-2 text-ink-400"
                  }`}>
                    {pushPermission === "granted" ? <Bell size={16} /> : <BellOff size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-900">Browser Push</p>
                    <p className="text-xs text-ink-400">
                      {pushPermission === "granted"
                        ? "Enabled — you'll receive real-time alerts"
                        : pushPermission === "denied"
                        ? "Blocked in browser — allow in site settings"
                        : pushPermission === "unsupported"
                        ? "Not supported in this browser"
                        : "Not yet enabled"}
                    </p>
                  </div>
                </div>
                {pushPermission === "default" && (
                  <button
                    id="enable-push-notifications"
                    onClick={requestPushPermission}
                    className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-400"
                  >
                    Enable
                  </button>
                )}
                {pushPermission === "granted" && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                    Active
                  </span>
                )}
                {pushPermission === "denied" && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">
                    Blocked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
