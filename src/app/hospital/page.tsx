"use client";

import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Plus, Clock, Stethoscope, AlertTriangle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Mission {
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
  active: boolean;
  assignedHospital?: string;
}

export default function HospitalDashboard() {
  const { user, loading, isSigningOut, signOut } = useAuth();
  const router = useRouter();
  
  const [incomingMissions, setIncomingMissions] = useState<Mission[]>([]);
  // Hardcoded for demo purposes: We assume the logged-in hospital user belongs to "City General Hospital"
  const hospitalName = "City General Hospital";

  useEffect(() => {
    if (!loading && !user && !isSigningOut) router.push("/login?returnUrl=/hospital");
  }, [user, loading, router, isSigningOut]);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const missionsRef = ref(rtdb, "missions");
    const unsubscribe = onValue(missionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const missionsArray: Mission[] = Object.values(data);
        // Filter missions assigned to THIS hospital
        setIncomingMissions(missionsArray.filter(m => m.active && m.assignedHospital === hospitalName));
      } else {
        setIncomingMissions([]);
      }
    });
    return () => unsubscribe();
  }, [hospitalName]);

  if (loading || !user) return null;

  return (
    <main className="min-h-screen w-full bg-slate-950 p-6 sm:p-10">
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
              <Plus className="w-8 h-8 text-emerald-400" />
            </div>
            ER Readiness Board
          </h1>
          <p className="text-slate-400 mt-2 ml-15 font-medium">{hospitalName}</p>
        </div>
        <button 
          onClick={signOut}
          className="text-slate-400 hover:text-white transition-colors bg-slate-900 p-3 rounded-xl border border-slate-800"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            Incoming Emergency Units
          </h2>
          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            {incomingMissions.length} En Route
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {incomingMissions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center glass-card border-dashed border-slate-800"
              >
                <Stethoscope className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium text-lg">No incoming ambulances currently.</p>
              </motion.div>
            ) : (
              incomingMissions.map((mission) => (
                <motion.div
                  key={mission.driverId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card p-6 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded">Priority 1</span>
                      <h3 className="text-2xl font-bold text-white mt-2">{mission.driverName}</h3>
                    </div>
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-inner">
                      <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Current Speed</p>
                        <p className="text-white font-bold font-mono">{Math.round(mission.speed * 3.6)} km/h</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Est. Arrival Time</p>
                        {/* We don't have routing calculated, so we mock an ETA based on distance or just show pending */}
                        <p className="text-white font-bold">~ 8 mins</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors border border-slate-700">
                    Prepare Trauma Bay 1
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
