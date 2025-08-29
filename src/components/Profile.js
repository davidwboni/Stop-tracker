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
  Loader2
} from "lucide-react";

const Profile = ({ userId, onLogout, onHome, updateProfilePic }) => {
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
  
  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
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
      // Update Firestore
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
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-6 sm:space-y-8"
      >
        {/* Profile Card */}
        <Card className="overflow-hidden shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 border-0">
          <CardHeader className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white py-8 sm:py-12 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <CardTitle className="relative z-10 flex items-center text-2xl sm:text-3xl font-bold">
              <div className="p-3 sm:p-4 bg-white/20 rounded-2xl mr-3 sm:mr-4 backdrop-blur-sm">
                <User className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              Your Profile
            </CardTitle>
            <p className="relative z-10 text-blue-100 mt-2 sm:mt-3 text-base sm:text-lg font-medium">Manage your account settings and track your achievements</p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 lg:p-10 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 items-center lg:items-start">
              {/* Profile Picture */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative group mb-6">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-2xl ring-4 ring-white/50 dark:ring-gray-600/50 group-hover:ring-blue-300 dark:group-hover:ring-blue-600 transition-all duration-300">
                    {userData?.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        key={userData.photoURL}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-16 h-16 sm:w-20 sm:h-20" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 sm:p-3 rounded-2xl cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-110 shadow-lg">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={updating}
                    />
                  </label>
                  {updating && (
                    <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-700/50">
                    <Award className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {userData?.role === 'pro' ? 'Pro Member' : 'Free User'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <Input
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full bg-gray-100 dark:bg-gray-800"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-sm"
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
                        className="bg-blue-500 hover:bg-blue-600 text-white"
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
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {userData?.displayName || 'User'}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        {userData?.email}
                      </p>
                      {userData?.bio && (
                        <p className="text-gray-700 dark:text-gray-300 mt-4">
                          {userData.bio}
                        </p>
                      )}
                    </div>
                    <div>
                      <Button
                        onClick={() => setEditMode(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
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
              <Alert className="mt-6 bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:text-green-100">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Achievements Card */}
        <Card className="shadow-apple-card border-0 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
          <CardHeader className="pb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mr-4 shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Achievements
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {achievements.map((achievement, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className={`group p-6 rounded-3xl border-2 flex items-center gap-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    achievement.unlocked 
                      ? "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-700 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-blue-200/50" 
                      : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                    achievement.unlocked 
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg" 
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg mb-1 ${
                      achievement.unlocked 
                        ? "text-blue-900 dark:text-blue-100" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Subscription Plan</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData?.role === 'pro' 
                      ? 'You are currently on the Pro plan' 
                      : 'You are currently on the Free plan'}
                  </p>
                </div>
                <Button
                  variant={userData?.role === 'pro' ? 'outline' : 'default'}
                  className={userData?.role === 'pro' 
                    ? 'bg-gray-100 dark:bg-gray-800' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'}
                  disabled={userData?.role === 'pro'}
                >
                  {userData?.role === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Account Actions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
    </div>
  );
};

export default Profile;