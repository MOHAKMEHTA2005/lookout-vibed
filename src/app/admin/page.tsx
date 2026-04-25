"use client";

import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, Map as MapIcon, Users, FileText, CheckCircle2, LogOut } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
      <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
    </div>
  ),
});



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

export default function DispatcherDashboard() {
  const { user, loading, isSigningOut, signOut } = useAuth();
  const router = useRouter();
  
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && !isSigningOut) router.push("/login?returnUrl=/admin");
  }, [user, loading, router, isSigningOut]);

  useEffect(() => {
    const missionsRef = ref(rtdb, "missions");
    const unsubscribe = onValue(missionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const missionsArray: Mission[] = Object.values(data);
        setActiveMissions(missionsArray.filter(m => m.active));
      } else {
        setActiveMissions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const assignHospital = (driverId: string, hospitalName: string) => {
    const missionRef = ref(rtdb, `missions/${driverId}`);
    update(missionRef, { assignedHospital: hospitalName });
  };

  const handleGenerateReport = async (driverId: string) => {
    const mission = activeMissions.find(m => m.driverId === driverId);
    if (!mission) return;

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mission),
      });

      const data = await res.json();
      if (data.success) {
        // Create a link element to download the base64 PDF
        const link = document.createElement('a');
        link.href = data.pdfData;
        link.download = `Incident_Log_${driverId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Failed to generate report: " + data.error);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report");
    }
  };

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Try to get admin's location via IP as default center
    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          setMapCenter({ lat: data.latitude, lng: data.longitude });
        } else {
          setMapCenter({ lat: 40.7128, lng: -74.0060 }); // Fallback to NY
        }
      })
      .catch(() => {
        setMapCenter({ lat: 40.7128, lng: -74.0060 });
      });
  }, []);

  if (loading || !user) return null;

  // Center on active mission if available, else admin's location
  const displayLat = activeMissions.length > 0 ? activeMissions[0].lat : (mapCenter?.lat || 40.7128);
  const displayLng = activeMissions.length > 0 ? activeMissions[0].lng : (mapCenter?.lng || -74.0060);


  return (
    <main className="h-screen w-full flex bg-slate-950 overflow-hidden">
      
      {/* Sidebar Panel */}
      <aside className="w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col z-10 backdrop-blur-md relative shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <ShieldAlert className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Central Dispatch</h1>
                <p className="text-xs text-slate-400">Command Center</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="text-slate-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Active Units ({activeMissions.length})
          </h2>

          {activeMissions.length === 0 ? (
            <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
              <p className="text-slate-500">No active emergency missions right now.</p>
            </div>
          ) : (
            activeMissions.map(mission => (
              <motion.div 
                key={mission.driverId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedMission(mission.driverId)}
                className={`glass-card p-4 cursor-pointer transition-all ${selectedMission === mission.driverId ? "border-blue-500/50 bg-blue-900/20" : "hover:bg-slate-800"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-bold">{mission.driverName}</h3>
                    <p className="text-xs text-rose-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      En Route
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-slate-300">{Math.round(mission.speed * 3.6)} km/h</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium">Destination Hospital:</p>
                  {mission.assignedHospital ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" /> {mission.assignedHospital}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); assignHospital(mission.driverId, "City General Hospital"); }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 transition-colors"
                      >
                        City General
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); assignHospital(mission.driverId, "St. Jude's Trauma"); }}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 transition-colors"
                      >
                        St. Jude's
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleGenerateReport(mission.driverId); }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white py-2 rounded-lg transition-colors border border-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5" /> Incident Log
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </aside>

      {/* Main Map View */}
      <section className="flex-1 relative bg-slate-950 p-4">
        <div className="w-full h-full rounded-3xl overflow-hidden glass shadow-2xl border-0 z-0">
          <MapComponent 
            lat={displayLat} 
            lng={displayLng} 
            zoom={13}
            markers={activeMissions.map(m => ({
              id: m.driverId,
              lat: m.lat,
              lng: m.lng,
              title: `Unit: ${m.driverName}`,
              subtitle: `Speed: ${Math.round(m.speed * 3.6)} km/h\nStatus: ${m.assignedHospital ? `En route to ${m.assignedHospital}` : 'Unassigned'}`,
              isAmbulance: true
            }))}
          />
        </div>
      </section>

    </main>
  );
}
