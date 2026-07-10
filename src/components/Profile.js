import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../services/firebase";
import { useTheme } from "../contexts/ThemeContext";
import {
  User,
  Camera,
  Save,
  Clock,
  Truck,
  Award,
  Settings,
  LogOut,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

const Profile = ({ userId, user, onLogout, onHome, updateProfilePic }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    bio: ""
  });
  
  const storage = getStorage();
  const { themePreference, setThemePreference } = useTheme();
  
  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Handle guest users
        if (user?.isGuest) {
          const guestData = {
            displayName: user.displayName,
            email: user.email,
            bio: "Demo user - experience Stop Tracker's full features!",
            role: user.role,
            photoURL: user.photoURL,
            createdAt: new Date(),
            isDemo: true
          };
          setUserData(guestData);
          setFormData({
            displayName: guestData.displayName || "",
            email: guestData.email || "",
            bio: guestData.bio || ""
          });
          setLoading(false);
          return;
        }
        
        // Regular Firebase users
        // Force a fresh read from server to get latest data
        const userDoc = await getDoc(doc(db, "users", userId), { source: 'server' });
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData({
            displayName: data.displayName || "",
            email: data.email || "",
            bio: data.bio || ""
          });
        } else {
          throw new Error("User data not found");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data");
        
        // Fallback to cache if server read fails
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setFormData({
              displayName: data.displayName || "",
              email: data.email || "",
              bio: data.bio || ""
            });
          }
        } catch (fallbackErr) {
          console.error("Fallback error:", fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle profile picture upload with improved error handling and caching
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }
    
    setUpdating(true);
    setError(null);
    
    try {
      // Create a unique file name to prevent caching issues
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `users/${userId}/profile_${timestamp}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Force a pre-fetch of the image to ensure it's cached
      const img = new Image();
      img.src = downloadURL;
      
      // Wait a moment to ensure image is processed before updating DB
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update Firestore with timestamp to ensure update is tracked
      await updateDoc(doc(db, "users", userId), {
        photoURL: downloadURL,
        photoUpdatedAt: timestamp
      });
      
      // Update Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadURL
        });
      }
      
      // Update local state with fresh URL to avoid caching
      const cachedURL = `${downloadURL}?t=${timestamp}`;
      setUserData(prev => ({
        ...prev,
        photoURL: cachedURL
      }));
      
      // Update parent component with cache-busting URL
      if (updateProfilePic) {
        updateProfilePic(cachedURL);
      }
      
      setSuccess("Profile picture updated successfully");
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image: " + (err.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle data export
  const handleExportData = async () => {
    try {
      setUpdating(true);
      
      // Get user's delivery data
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        throw new Error("No user data found");
      }
      
      const userData = userDoc.data();
      const exportData = {
        profile: {
          displayName: userData.displayName || '',
          email: userData.email || '',
          bio: userData.bio || '',
          createdAt: userData.createdAt || ''
        },
        deliveryLogs: userData.logs || [],
        paymentConfig: userData.paymentConfig || {},
        exportedAt: new Date().toISOString()
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `stop-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setSuccess("Data exported successfully!");
      
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Failed to export data: " + (err.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!formData.displayName) {
      setError("Display name is required");
      return;
    }
    
    setUpdating(true);
    setError(null);
    
    try {
      if (user?.isGuest) {
        // For guest users, just update local state
        setUserData(prev => ({
          ...prev,
          displayName: formData.displayName,
          bio: formData.bio || ""
        }));
        
        setSuccess("Demo profile updated! Create a real account to save permanently.");
        setEditMode(false);
      } else {
        // Update Firestore for real users
        await updateDoc(doc(db, "users", userId), {
          displayName: formData.displayName,
          bio: formData.bio || "",
          updatedAt: new Date().toISOString()
        });
        
        // Update Auth profile if display name changed
        if (formData.displayName !== userData.displayName && auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: formData.displayName
          });
        }
        
        // Update local state
        setUserData(prev => ({
          ...prev,
          displayName: formData.displayName,
          bio: formData.bio || ""
        }));
        
        setSuccess("Profile updated successfully");
        setEditMode(false);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile: " + (err.message || "Unknown error"));
    } finally {
      setUpdating(false);
    }
  };
  
  // Achievement badges
  const achievements = [
    { 
      name: "Delivery Expert", 
      description: "Completed over 1,000 deliveries", 
      unlocked: true, 
      icon: <Award className="w-5 h-5" /> 
    },
    { 
      name: "Perfect Week", 
      description: "Logged stops every day for a week", 
      unlocked: true,
      icon: <Clock className="w-5 h-5" /> 
    },
    { 
      name: "Top Performer", 
      description: "Exceeded 150 stops in a single day", 
      unlocked: false,
      icon: <Truck className="w-5 h-5" /> 
    },
    { 
      name: "Invoice Master", 
      description: "Compared 10 invoices successfully", 
      unlocked: false,
      icon: <Save className="w-5 h-5" /> 
    }
  ];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }
  
  if (error && !userData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
        <p className="text-muted-foreground">Manage your account and settings</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-6"
      >
        {/* Profile Card */}
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border/50 py-6">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="p-3 bg-primary/10 rounded-[14px] mr-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              Your Profile
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-sm font-medium">Manage your account and achievements</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-6 items-center">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative group mb-4">
                  <div className="w-24 h-24 rounded-[18px] overflow-hidden bg-muted shadow-lg ring-4 ring-border group-hover:ring-primary/50 transition-all duration-300">
                    {userData?.photoURL ? (
                      <img
                        src={userData.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        key={userData.photoURL}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <label
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                    }}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-2 rounded-[14px] cursor-pointer hover:opacity-90 transition-all duration-300 transform hover:scale-110 shadow-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={updating}
                    />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 bg-black/20 rounded-[18px] flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Award className="w-3 h-3 mr-2 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {userData?.role === 'pro' ? 'Pro Member' : 'Free User'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="w-full">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Display Name
                      </label>
                      <Input
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <Input
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-[14px] border border-border bg-input px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setFormData({
                            displayName: userData?.displayName || '',
                            email: userData?.email || '',
                            bio: userData?.bio || ''
                          });
                        }}
                        disabled={updating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={updating}
                      >
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 text-center">
                      <h2 className="text-xl font-bold">
                        {userData?.displayName || 'User'}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {userData?.email}
                      </p>
                      {userData?.bio && (
                        <p className="text-muted-foreground mt-3 text-sm">
                          {userData.bio}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={() => {
                          setEditMode(true);
                          if (navigator.vibrate) navigator.vibrate(5);
                        }}
                        className="px-8 min-h-[48px] touch-manipulation"
                        size="sm"
                      >
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status messages */}
            {error && (
              <Alert className="mt-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mt-6 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Achievements Card */}
        <Card className="border-border/50 rounded-[18px]">
          <CardHeader className="pb-4">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-[14px] mr-3">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold">
                Achievements
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-1 gap-3">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className={`group p-4 rounded-[14px] border flex items-center gap-4 transition-all duration-300 ${
                    achievement.unlocked
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <div className={`p-3 rounded-[14px] transition-all duration-300 ${
                    achievement.unlocked
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-base mb-1 ${
                      achievement.unlocked
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Demo User Upgrade Card */}
        {userData?.isDemo && (
          <Card className="border-primary/20 bg-primary/5 rounded-[18px]">
            <CardHeader className="pb-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-[14px] mr-3">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    Ready to Save Your Progress?
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create a real account to keep your delivery data forever!
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="bg-card p-4 rounded-[14px] border border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      🚀 Upgrade to Full Account
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      You're currently using a demo account. Create a real account to:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Save your delivery data permanently
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Sync across all your devices
                      </li>
                      <li className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                        Access premium features
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        // Navigate to sign up page
                        onLogout(); // This will clear the guest session
                        setTimeout(() => {
                          window.location.href = '/';
                        }, 100);
                      }}
                      className="px-8 py-3 rounded-[14px]"
                    >
                      Create Account
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Keep all your demo data!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Account Actions */}
        <Card className="border-border/50 rounded-[18px]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Settings className="mr-2 w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-[14px] border border-border/50">
                <div>
                  <h3 className="font-medium">Appearance</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how Stop Tracker looks on this device
                  </p>
                </div>
                <div className="flex gap-1 bg-muted rounded-[14px] p-1">
                  <button
                    onClick={() => setThemePreference('system')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'system' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Match system theme"
                    aria-pressed={themePreference === 'system'}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setThemePreference('light')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'light' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Light theme"
                    aria-pressed={themePreference === 'light'}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setThemePreference('dark')}
                    className={`p-2 rounded-lg transition-colors ${
                      themePreference === 'dark' ? 'bg-card shadow-sm' : ''
                    }`}
                    aria-label="Dark theme"
                    aria-pressed={themePreference === 'dark'}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-[14px] border border-border/50">
                <div>
                  <h3 className="font-medium">Account Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Data export and account management
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleExportData}
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Export Data'
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onLogout}
                  >
                    <LogOut className="mr-2 w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Profile;