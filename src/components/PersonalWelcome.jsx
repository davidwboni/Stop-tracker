import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Edit, Save, X } from 'lucide-react';

const PersonalWelcome = () => {
  const { user } = useAuth();
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchMessage = async () => {
      if (!user?.uid) return;
      
      try {
        const docRef = doc(db, `users/${user.uid}/settings/welcome`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setWelcomeMessage(docSnap.data().message || '');
          setCustomMessage(docSnap.data().message || '');
        } else {
          // Create default welcome message
          const defaultMessage = "Welcome to your Stop Tracker dashboard!";
          await setDoc(docRef, { message: defaultMessage });
          setWelcomeMessage(defaultMessage);
          setCustomMessage(defaultMessage);
        }
      } catch (err) {
        console.error("Error fetching welcome message:", err);
      }
    };
    
    fetchMessage();
  }, [user]);
  
  const saveMessage = async () => {
    if (!user?.uid) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, `users/${user.uid}/settings/welcome`);
      await setDoc(docRef, { 
        message: customMessage,
        updatedAt: new Date().toISOString()
      });
      
      setWelcomeMessage(customMessage);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving welcome message:", err);
    } finally {
      setSaving(false);
    }
  };
  
  if (!welcomeMessage) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6"
    >
      {isEditing ? (
        <div>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-2 rounded-lg text-black dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
            placeholder="Enter your custom welcome message"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={saveMessage}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full text-sm font-medium flex items-center"
            >
              {saving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={() => {
                setCustomMessage(welcomeMessage);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <p className="text-lg text-black dark:text-white font-medium">{welcomeMessage}</p>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors flex items-center text-sm"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default PersonalWelcome;