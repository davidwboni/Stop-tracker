import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../services/firebase";
import { useTheme } from "../contexts/ThemeContext";
import { getAnalyticsConsent, setAnalyticsConsent } from "../services/productAnalytics";
import {
  User,
  Camera,
  Save,
  Award,
  Crown,
  MapPin,
  ScanLine,
  LogOut,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Monitor,
  DollarSign,
  ChevronRight,
  Trash2,
  BarChart3,
} from "lucide-react";

const Profile = ({ userId, user, onLogout }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formData, setFormData] = useState({ displayName: "", email: "", bio: "" });
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getAnalyticsConsent() === true);

  const storage = getStorage();
  const navigate = useNavigate();
  const { themePreference, setThemePreference } = useTheme();
  const isGuest = !!user?.isGuest;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (isGuest) {
          const guestData = {
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            photoURL: user.photoURL,
          };
          setUserData(guestData);
          setFormData({ displayName: guestData.displayName || "", email: guestData.email || "", bio: "" });
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData({ displayName: data.displayName || "", email: data.email || "", bio: data.bio || "" });
        } else {
          throw new Error("User data not found");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId, isGuest, user]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleAnalyticsToggle = async () => {
    const next = !analyticsEnabled;
    await setAnalyticsConsent(next);
    setAnalyticsEnabled(next);
    setSuccess(next ? "Usage analytics enabled" : "Usage analytics disabled");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Please select a JPG, PNG or WEBP image");
    if (file.size > 2 * 1024 * 1024) return setError("Image size must be less than 2MB");

    setUpdating(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${userId}/profile`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", userId), { photoURL: downloadURL, photoUpdatedAt: timestamp });
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: downloadURL });
      setUserData((prev) => ({ ...prev, photoURL: `${downloadURL}?t=${timestamp}` }));
      setSuccess("Profile picture updated");
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.displayName) return setError("Display name is required");
    setUpdating(true);
    setError(null);
    try {
      if (!isGuest) {
        await updateDoc(doc(db, "users", userId), {
          displayName: formData.displayName,
          bio: formData.bio || "",
          updatedAt: new Date().toISOString(),
        });
        if (formData.displayName !== userData.displayName && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: formData.displayName });
        }
      }
      setUserData((prev) => ({ ...prev, displayName: formData.displayName, bio: formData.bio || "" }));
      setSuccess(isGuest ? "Demo profile updated (sign in to save it)" : "Profile updated");
      setEditMode(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isGuest) {
      onLogout();
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "users", userId));
      if (auth.currentUser) await auth.currentUser.delete();
      onLogout();
      window.location.href = "/";
    } catch (err) {
      console.error("Error deleting account:", err);
      if (err.code === "auth/requires-recent-login") {
        setError("For security, please sign out and sign back in, then delete your account.");
      } else {
        setError("Could not delete account. Please try again.");
      }
      setConfirmDelete(false);
    } finally {
      setUpdating(false);
    }
  };

  const isPro = userData?.role === "pro";
  const initial = (userData?.displayName || "U").charAt(0).toUpperCase();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  const rowBase =
    "w-full flex items-center justify-between px-4 py-3.5 text-left touch-manipulation";

  return (
    <motion.div
      className="max-w-md mx-auto px-4 py-6 pb-24 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Identity, photo + name at the very top */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-2xl font-semibold ring-4 ring-border">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" key={userData.photoURL} />
            ) : (
              initial
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer shadow-lg touch-manipulation">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={updating} />
          </label>
          {updating && (
            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold">{userData?.displayName || "Driver"}</h1>
        {userData?.email && <p className="text-sm text-muted-foreground">{userData.email}</p>}
        <div className="inline-flex items-center gap-1.5 mt-2 bg-card border border-border rounded-full px-3 py-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isPro ? "bg-primary" : "bg-gray-400"}`} />
          <span className="text-xs font-medium text-muted-foreground">{isPro ? "Pro plan" : "Free plan"}</span>
        </div>
      </div>

      {/* Guest → sign in to save data */}
      {isGuest && (
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center justify-center gap-2 h-11 border border-border rounded-[12px] text-sm font-medium hover:border-primary/40 active:scale-[0.99] transition-all touch-manipulation"
        >
          <span className="font-bold" style={{ fontFamily: "sans-serif" }}>
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
          Sign in to save your data
        </button>
      )}

      {/* Edit form (inline) */}
      {editMode && (
        <div className="rounded-[14px] border border-border bg-card p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <Input name="displayName" value={formData.displayName} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio || ""}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-[12px] border border-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={updating}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateProfile} disabled={updating}>
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Account settings */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Account settings
        </div>
        <div className="bg-card border border-border rounded-[14px] overflow-hidden divide-y divide-border">
          <button onClick={() => navigate("/app/settings")} className={`${rowBase} hover:bg-muted/40`}>
            <span className="flex items-center gap-3 text-sm">
              <DollarSign className="w-5 h-5 text-primary" />
              Pay Structure
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className={rowBase}>
            <span className="flex items-center gap-3 text-sm">
              <Monitor className="w-5 h-5 text-muted-foreground" />
              Appearance
            </span>
            <div className="flex gap-1 bg-muted rounded-[10px] p-1">
              {[
                { k: "system", I: Monitor, l: "System" },
                { k: "light", I: Sun, l: "Light" },
                { k: "dark", I: Moon, l: "Dark" },
              ].map(({ k, I, l }) => (
                <button
                  key={k}
                  onClick={() => setThemePreference(k)}
                  className={`p-1.5 rounded-md transition-colors ${themePreference === k ? "bg-card shadow-sm" : ""}`}
                  aria-label={l}
                  aria-pressed={themePreference === k}
                >
                  <I className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div className={rowBase}>
            <span className="flex items-center gap-3 text-sm">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span>
                <span className="block">Usage analytics</span>
                <span className="block text-[11px] text-muted-foreground">No pay, invoice, address or note contents</span>
              </span>
            </span>
            <button
              type="button"
              onClick={handleAnalyticsToggle}
              aria-pressed={analyticsEnabled}
              className={`relative h-7 w-12 rounded-full transition-colors ${analyticsEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  analyticsEnabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button onClick={() => setEditMode((v) => !v)} className={`${rowBase} hover:bg-muted/40`}>
            <span className="flex items-center gap-3 text-sm">
              <User className="w-5 h-5 text-muted-foreground" />
              Edit profile
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Account actions */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Account</div>
        <div className="bg-card border border-border rounded-[14px] overflow-hidden divide-y divide-border">
          <button onClick={onLogout} className={`${rowBase} hover:bg-muted/40`}>
            <span className="flex items-center gap-3 text-sm">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              Sign out
            </span>
          </button>
          {confirmDelete ? (
            <div className="px-4 py-3.5 space-y-3">
              <p className="text-sm text-destructive font-medium">
                Delete your account and data? This can't be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={updating}>
                  {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete forever
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={updating}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className={`${rowBase} hover:bg-muted/40`}>
              <span className="flex items-center gap-3 text-sm text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete account
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Monetisation preview - no fake checkout until billing is connected. */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Stop Tracker Pro
        </div>
        <div className="rounded-[14px] border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">{isPro ? "Pro plan active" : "Premium features"}</span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Route optimisation
            </div>
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              AI statement scanning
            </div>
          </div>
          {!isPro && (
            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground mb-3">
                Manual work tracking and Check Pay stay free. Pro adds protected paid-API features and removes ads.
              </p>
              <Button
                type="button"
                onClick={() => navigate("/app/upgrade")}
                className="w-full h-10"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Award className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
};

export default Profile;
