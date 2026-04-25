"use client";

import { useAuth, Role } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Car, ShieldAlert, Navigation, Stethoscope, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const roles = [
  {
    id: "admin" as Role,
    title: "Dispatcher",
    description: "Manage and dispatch emergency vehicles",
    icon: ShieldAlert,
    color: "rose"
  },
  {
    id: "driver" as Role,
    title: "Ambulance Driver",
    description: "Receive missions and broadcast location",
    icon: Car,
    color: "blue"
  },
  {
    id: "hospital" as Role,
    title: "Hospital ER",
    description: "View incoming emergencies to prepare ER",
    icon: Stethoscope,
    color: "emerald"
  },
  {
    id: "road-user" as Role,
    title: "Road User",
    description: "Get alerts when ambulances are near",
    icon: Navigation,
    color: "amber"
  }
];

function RegisterContent() {
  const { user, userData, loading, refreshUserData, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get("role") as Role | null;
  const returnUrl = searchParams.get("returnUrl") || "";

  const [selectedRole, setSelectedRole] = useState<Role | null>(queryRole && roles.some(r => r.id === queryRole) ? queryRole : null);
  
  // Registration state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If already registered, go to their dashboard
    if (!loading && userData) {
      router.push(`/${userData.role}`);
    }
    // Pre-fill name from Google
    if (user && !name) {
      setName(user.displayName || "");
    }
  }, [user, userData, loading, router, name]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);
    try {
      await signUpWithEmail(email, password);
    } catch (err: any) {
      setAuthError(err.message || "Failed to create account");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const saveProfile = async (skip: boolean = false) => {
    if (!user || !selectedRole) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        role: selectedRole,
        name: skip ? (user.displayName || "User") : name,
        phone: skip ? null : (phone || null),
        hospitalName: selectedRole === "hospital" && !skip ? hospitalName : null,
        createdAt: Date.now()
      });
      await refreshUserData(); // This will trigger the redirect in the useEffect above
    } catch (error) {
      console.error("Error saving user data:", error);
      setIsSubmitting(false);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && selectedRole !== "hospital") return;
    if (selectedRole === "hospital" && !hospitalName) return;
    await saveProfile(false);
  };

  if (loading || userData) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full z-10"
      >
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
            {!user ? "Create an Account" : "Complete your profile"}
          </h1>
          <p className="text-slate-400 text-lg">
            {!user ? "Join the emergency network today." : "How will you be using Lookout today?"}
          </p>
        </div>

        {!user ? (
          // Registration Form
          <div className="glass-card p-10 max-w-md mx-auto border-slate-800">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
                {authError}
              </div>
            )}
            <form onSubmit={handleSignUp} className="space-y-4 mb-6">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isAuthenticating ? "Creating Account..." : "Sign Up with Email"}
              </button>
            </form>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">Or</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors mb-6"
            >
              Continue with Google
            </button>

            <p className="text-slate-400 text-sm text-center">
              Already have an account?{" "}
              <button 
                onClick={() => router.push(`/login?role=${queryRole || ""}&returnUrl=${returnUrl}`)}
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        ) : (
          // Profile Form
          <form onSubmit={handleSubmitProfile} className="space-y-8">
            {/* Role Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                      isSelected 
                        ? `border-${r.color}-500 bg-${r.color}-500/10 shadow-[0_0_30px_rgba(var(--${r.color}-500-rgb),0.2)]` 
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${isSelected ? `bg-${r.color}-500/20` : "bg-slate-800"}`}>
                        <Icon className={`w-6 h-6 ${isSelected ? `text-${r.color}-400` : "text-slate-400"}`} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold mb-1 ${isSelected ? "text-white" : "text-slate-300"}`}>
                          {r.title}
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{r.description}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`absolute top-4 right-4 text-${r.color}-500`}>
                        <div className="w-3 h-3 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Additional Details Form */}
            <AnimatePresence>
              {selectedRole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-8 border-slate-800 space-y-6">
                    <h3 className="text-xl font-bold text-white mb-4">Personal Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                        <input 
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Phone Number (Optional)</label>
                        <input 
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>

                      {selectedRole === "hospital" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <label className="block text-sm font-medium text-slate-400 mb-2">Hospital Name</label>
                          <input 
                            type="text"
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            placeholder="City General Hospital"
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                      <button
                        type="submit"
                        disabled={isSubmitting || !name || (selectedRole === "hospital" && !hospitalName)}
                        className="w-full sm:flex-1 bg-white text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSubmitting ? "Saving..." : "Continue to Dashboard"}
                        {!isSubmitting && <ChevronRight className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveProfile(true)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-slate-800 text-slate-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        )}
      </motion.div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950"><Activity className="w-8 h-8 text-white animate-pulse" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}
