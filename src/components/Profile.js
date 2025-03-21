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
        const userDoc = await getDoc(doc(db, "users", userId));
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
  
  // Handle profile picture upload
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
    try {
      const storageRef = ref(storage, `users/${userId}/profile`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      await updateDoc(doc(db, "users", userId), {
        photoURL: downloadURL
      });
      
      // Update Auth profile
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        photoURL: downloadURL
      }));
      
      // Update parent component
      if (updateProfilePic) {
        updateProfilePic(downloadURL);
      }
      
      setSuccess("Profile picture updated successfully");
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image");
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
        bio: formData.bio || ""
      });
      
      // Update Auth profile if display name changed
      if (formData.displayName !== userData.displayName) {
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
      setError("Failed to update profile");
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
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Profile Card */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
            <CardTitle className="flex items-center">
              <User className="mr-2" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-4">
                    {userData?.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-4 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={updating}
                    />
                  </label>
                </div>
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userData?.role === 'pro' ? 'Pro Member' : 'Free User'}
                  </p>
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border flex items-center gap-4 ${
                    achievement.unlocked 
                      ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30" 
                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                  }`}
                >
                  <div className={`p-3 rounded-full ${
                    achievement.unlocked 
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-200" 
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {achievement.icon}
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      achievement.unlocked 
                        ? "text-indigo-900 dark:text-indigo-100" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {achievement.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  </div>
                </div>
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
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
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
                  <Button variant="outline">
                    Export Data
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