import React, { useState } from "react";
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
    <Card className="w-full max-w-md mx-auto shadow-lg rounded-xl bg-[var(--background)]">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold text-[var(--text)]">
          {method === "email" ? (isLogin ? "Login" : "Sign Up") : "Sign In"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4 mb-4">
          <Button
            onClick={() => setMethod("email")}
            variant={method === "email" ? "default" : "outline"}
            className="flex-1"
          >
            <Mail className="mr-2 w-5 h-5" />
            Email
          </Button>
          <Button
            onClick={() => setMethod("phone")}
            variant={method === "phone" ? "default" : "outline"}
            className="flex-1"
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
  );
};

export default Auth;