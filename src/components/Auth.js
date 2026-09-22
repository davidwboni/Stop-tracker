import React, { useState } from "react";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth, signInWithGoogle } from "../services/firebase";
import { Loader2, Mail, ArrowLeft, AlertCircle } from "lucide-react";

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"/>
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.3 2 20.5 2 24s.9 6.7 2.5 9.9l7.3-5.7z"/>
    <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
  </svg>
);

export default function Auth(){
  const [isLogin,setIsLogin]=useState(true);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState("");
  const [error,setError]=useState("");

  const run=async(id,fn)=>{setLoading(id);setError("");try{await fn();}catch(e){const code=e?.code||"";setError(code==="auth/invalid-credential"||code==="auth/wrong-password"?"Email or password is incorrect.":code==="auth/email-already-in-use"?"That email already has an account.":code==="auth/weak-password"?"Use a password with at least 6 characters.":"We couldn't sign you in. Please try again.");setLoading("");}};
  const submit=e=>{e.preventDefault();run("email",()=>isLogin?signInWithEmailAndPassword(auth,email,password):createUserWithEmailAndPassword(auth,email,password));};

  return <div className="min-h-[100dvh] bg-[#080c14] px-5 py-8 text-[#f5f7fb]">
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="mx-auto w-full max-w-sm">
      <button onClick={()=>window.location.href="/"} className="mb-10 grid h-11 w-11 place-items-center rounded-xl border border-[#26314a] bg-[#111827] text-[#9aa6bd]" aria-label="Back"><ArrowLeft className="h-5 w-5"/></button>
      <div className="mb-8">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#7567ff]/15 text-[#9b91ff]"><Mail className="h-6 w-6"/></div>
        <h1 className="text-3xl font-bold">{isLogin?"Welcome back":"Create your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-[#8e9ab2]">{isLogin?"Sign in and get back to your work records.":"Start your independent work and pay record."}</p>
      </div>

      {error&&<div className="mb-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>{error}</div>}

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs text-[#8e9ab2]">Email<input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 h-13 w-full rounded-xl border border-[#2a3550] bg-[#111827] px-4 py-3 text-base text-white outline-none focus:border-[#7567ff]"/></label>
        <label className="block text-xs text-[#8e9ab2]">Password<input autoComplete={isLogin?"current-password":"new-password"} type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="mt-1 h-13 w-full rounded-xl border border-[#2a3550] bg-[#111827] px-4 py-3 text-base text-white outline-none focus:border-[#7567ff]"/></label>
        <button disabled={!!loading} className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6657f5] to-[#806cff] font-bold text-white disabled:opacity-60">{loading==="email"?<Loader2 className="h-5 w-5 animate-spin"/>:isLogin?"Sign in":"Create account"}</button>
      </form>

      <button onClick={()=>setIsLogin(v=>!v)} className="mt-4 w-full py-2 text-sm text-[#9b91ff]">{isLogin?"New to Stop Tracker? Create an account":"Already have an account? Sign in"}</button>

      <div className="my-6 flex items-center gap-3 text-xs text-[#5f6a80]"><span className="h-px flex-1 bg-[#202a3d]"/><span>or</span><span className="h-px flex-1 bg-[#202a3d]"/></div>
      <div className="space-y-3">
        <button onClick={()=>run("google",signInWithGoogle)} disabled={!!loading} className="flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-[#2a3550] bg-[#111827] py-3 text-sm font-semibold"><GoogleMark/>{loading==="google"?"Signing in…":"Continue with Google"}</button>
        <button onClick={()=>run("guest",()=>signInAnonymously(auth))} disabled={!!loading} className="h-13 w-full rounded-xl border border-[#2a3550] py-3 text-sm font-semibold text-[#a9b3c6]">{loading==="guest"?"Opening preview…":"Have a look around first"}</button>
      </div>
      <p className="mt-8 text-center text-[11px] leading-5 text-[#5f6a80]">Your work. Your records. Your pay.</p>
    </motion.div>
  </div>;
}
