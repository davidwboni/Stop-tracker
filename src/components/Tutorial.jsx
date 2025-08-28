import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  FileText,
  BarChart2,
  Settings,
  Target
} from 'lucide-react';
import { Button } from './ui/button';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const tutorialSteps = [
  {
    title: "Welcome to Stop Tracker!",
    content: "This app helps delivery drivers track their stops, verify pay, and maximize earnings. Let's take a quick tour to get started.",
    image: "welcome.svg",
    icon: <Target className="w-8 h-8 text-blue-500" />
  },
  {
    title: "Log Your Stops",
    content: "The first tab is for logging your daily stops. Add your stop count, date, and any extras. Your data will sync automatically.",
    image: "log-stops.svg",
    icon: <Plus className="w-8 h-8 text-green-500" />
  },
  {
    title: "View Your Entries",
    content: "Access all your delivery entries from the Entries tab. Filter, search, and export data to verify your pay against company records.",
    image: "entries.svg",
    icon: <FileText className="w-8 h-8 text-amber-500" />
  },
  {
    title: "Analyze Your Stats",
    content: "The Stats tab shows trends and patterns in your deliveries. Track your performance over time and identify your most profitable days.",
    image: "stats.svg",
    icon: <BarChart2 className="w-8 h-8 text-purple-500" />
  },
  {
    title: "Customize Payment Settings",
    content: "Set your payment thresholds and rates in Settings. Some drivers get paid more for the first set of stops, then a lower rate after.",
    image: "settings.svg",
    icon: <Settings className="w-8 h-8 text-gray-500" />
  }
];

const Tutorial = ({ onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialComplete, setTutorialComplete] = useState(false);

  // Check if user has completed tutorial before
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user?.uid) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().tutorialComplete) {
          setTutorialComplete(true);
          setShowTutorial(false);
        }
      } catch (err) {
        console.error("Error checking tutorial status:", err);
      }
    };

    checkTutorialStatus();
  }, [user]);

  // Handle tutorial navigation
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Mark tutorial as complete
  const completeTutorial = async () => {
    if (!user?.uid) {
      setShowTutorial(false);
      onClose();
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        tutorialComplete: true
      });
      setTutorialComplete(true);
      setShowTutorial(false);
      onClose();
    } catch (err) {
      console.error("Error updating tutorial status:", err);
      setShowTutorial(false);
      onClose();
    }
  };

  // Skip tutorial
  const skipTutorial = async () => {
    if (user?.uid) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          tutorialComplete: true
        });
        setTutorialComplete(true);
      } catch (err) {
        console.error("Error updating tutorial status:", err);
      }
    }
    
    setShowTutorial(false);
    onClose();
  };

  // Show tutorial button if previously completed
  if (tutorialComplete && !showTutorial) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setShowTutorial(true)}
          className="rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
          size="icon"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  // Hide if closed
  if (!showTutorial) {
    return null;
  }

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <HelpCircle className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">App Tutorial</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={skipTutorial}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
                {currentTutorialStep.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{currentTutorialStep.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{currentTutorialStep.content}</p>
            </div>

            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full mt-6 mb-4">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Button onClick={skipTutorial} variant="outline">
                Skip Tutorial
              </Button>
              
              <Button
                onClick={nextStep}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Tutorial;