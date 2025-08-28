import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import { Loader2, Mail, Phone, AlertCircle } from "lucide-react";

const Auth = ({ onBack }) => {
  const [method, setMethod] = useState("email"); // 'email', 'phone', 'google', 'anonymous'
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    code: "",
  });

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    }
  };

  const handleAuth = async (type) => {
    setError("");
    setLoading(true);

    try {
      if (type === "email") {
        isLogin
          ? await signInWithEmailAndPassword(auth, formData.email, formData.password)
          : await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } else if (type === "google") {
        await signInWithPopup(auth, googleProvider);
      } else if (type === "phone") {
        if (!verificationId) {
          setupRecaptcha();
          const confirmation = await signInWithPhoneNumber(auth, formData.phone, window.recaptchaVerifier);
          setVerificationId(confirmation.verificationId);
        } else {
          // Verify the code here
        }
      } else if (type === "anonymous") {
        await signInAnonymously(auth);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already registered";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/weak-password":
        return "Password should be at least 6 characters";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password";
      default:
        return error.message;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-6 -left-6 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="overflow-hidden shadow-2xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
          <CardHeader className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white py-10 text-center">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
            
            {/* App Icon */}
            <div className="relative z-10 mb-4">
              <div className="inline-flex p-4 bg-white/20 rounded-3xl backdrop-blur-sm">
                <Mail className="w-8 h-8" />
              </div>
            </div>
            
            <CardTitle className="relative z-10 text-3xl font-bold mb-2">
              {method === "email" ? (isLogin ? "Welcome Back" : "Create Account") : "Sign In"}
            </CardTitle>
            <p className="relative z-10 text-blue-100 font-medium">
              {method === "email" 
                ? (isLogin ? "Sign in to your Stop Tracker account" : "Join Stop Tracker today")
                : "Choose your sign-in method"
              }
            </p>
          </CardHeader>
          <CardContent className="p-8 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className="bg-red-50 border-2 border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <AlertDescription className="text-red-700 dark:text-red-400 font-medium">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Button
            onClick={() => setMethod("email")}
            className={`relative py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              method === "email" 
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Mail className="mr-2 w-5 h-5" />
            Email
          </Button>
          <Button
            onClick={() => setMethod("phone")}
            className={`relative py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              method === "phone" 
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Phone className="mr-2 w-5 h-5" />
            Phone
          </Button>
        </div>

        {method === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth("email");
            }}
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-[var(--background)] text-[var(--text)]"
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="bg-[var(--background)] text-[var(--text)]"
            />
            <Button type="submit" className="w-full bg-[var(--primary)] hover:bg-[var(--secondary)]" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  {isLogin ? "Logging in..." : "Creating account..."}
                </>
              ) : isLogin ? (
                "Login"
              ) : (
                "Sign Up"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </Button>
          </form>
        )}

        {method === "phone" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth("phone");
            }}
            className="space-y-4"
          >
            {!verificationId ? (
              <Input
                type="tel"
                placeholder="Phone number (e.g., +447123456789)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="bg-[var(--background)] text-[var(--text)]"
              />
            ) : (
              <Input
                type="text"
                placeholder="Enter verification code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                className="bg-[var(--background)] text-[var(--text)]"
              />
            )}
            <Button type="submit" className="w-full bg-[var(--primary)] hover:bg-[var(--secondary)]" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  {verificationId ? "Verifying..." : "Sending code..."}
                </>
              ) : verificationId ? (
                "Verify Code"
              ) : (
                "Send Code"
              )}
            </Button>
          </form>
        )}

        <div className="relative py-4">
          <Separator />
          <div className="relative flex justify-center text-sm text-[var(--text)]">
            Or continue with
          </div>
        </div>

        <div className="grid gap-4">
          <Button
            onClick={() => handleAuth("google")}
            variant="outline"
            className="w-full border-[var(--primary)] text-[var(--primary)]"
            disabled={loading}
          >
            Continue with Google
          </Button>
          <Button
            onClick={() => handleAuth("anonymous")}
            variant="outline"
            className="w-full border-[var(--primary)] text-[var(--primary)]"
            disabled={loading}
          >
            Continue as Guest
          </Button>
        </div>

        {onBack && (
          <Button onClick={onBack} variant="ghost" className="w-full mt-4">
            Back to Home
          </Button>
        )}
            <div id="recaptcha-container" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;