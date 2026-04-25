"use client";

import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, AlertTriangle, Activity, LogOut, MapPinOff, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
      <div className="animate-pulse flex flex-col items-center">
        <Navigation className="w-8 h-8 text-emerald-500 mb-2 animate-bounce" />
        <span className="text-slate-400 font-medium">Acquiring GPS Signal...</span>
      </div>
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
}

export default function RoadUserPage() {
  const { user, loading, isSigningOut, signOut } = useAuth();
  const router = useRouter();
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoSupported, setGeoSupported] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user && !isSigningOut) {
      router.push("/login?returnUrl=/road-user");
    }
  }, [user, loading, router, isSigningOut]);



  const startTracking = useCallback(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      setGeoSupported(true);
      setLocationError(null);
      
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationError(null);
          setIsRetrying(false);
        },
        (error) => {
          console.error("Error watching position:", error);
          setIsRetrying(false);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError("denied");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationError("unavailable");
          } else if (error.code === error.TIMEOUT) {
            setLocationError("timeout");
          } else {
            setLocationError("unknown");
          }
        },
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
      );
    } else {
      setGeoSupported(false);
      setIsRetrying(false);
    }
  }, []);

  // Track Road User Location
  useEffect(() => {
    startTracking();
    
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [startTracking]);

  // Listen to Active Missions
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

  const [notified, setNotified] = useState(false);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Calculate Proximity and Trigger System Notification
  useEffect(() => {
    if (!location || activeMissions.length === 0) {
      setNearestDistance(null);
      setNotified(false);
      return;
    }

    let minDistance = Infinity;
    activeMissions.forEach(mission => {
      const dist = getDistanceFromLatLonInM(location.lat, location.lng, mission.lat, mission.lng);
      if (dist < minDistance) minDistance = dist;
    });

    setNearestDistance(minDistance);

    // Trigger System Notification
    if (minDistance < 1000) {
      if (!notified && "Notification" in window && Notification.permission === "granted") {
        new Notification("🚨 MOVE ASIDE", {
          body: `An emergency vehicle is approaching your location (${Math.round(minDistance)}m away).`,
          icon: "/favicon.ico",
        });
        setNotified(true);
      }
    } else {
      // Reset notification state if ambulance leaves the 1km radius
      setNotified(false);
    }
  }, [location, activeMissions, notified]);

  const handleRetryLocation = () => {
    setIsRetrying(true);
    startTracking();
  };

  const isAlertActive = nearestDistance !== null && nearestDistance < 1000; // Alert if within 1km

  if (loading || !user) return null;

  return (
    <main className="h-screen w-full flex flex-col bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Pulse if Alert */}
      <AnimatePresence>
        {isAlertActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-rose-500 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between mb-4 glass-card p-4 rounded-2xl z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors ${isAlertActive ? "bg-rose-500/20 border-rose-500/50" : "bg-emerald-500/20 border-emerald-500/30"}`}>
            <Navigation className={`w-6 h-6 ${isAlertActive ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Radar Mode</h1>
            <p className="text-xs text-slate-400 font-medium">{user.displayName || "Road User"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/50">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">
              {activeMissions.length} Active
            </span>
          </div>
          <button 
            onClick={() => signOut()} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-grow relative rounded-2xl overflow-hidden glass border-0 z-0 shadow-2xl">
        {location ? (
          <MapComponent 
            lat={location.lat} 
            lng={location.lng} 
            zoom={15}
            markers={activeMissions.map(m => ({
              id: m.driverId,
              lat: m.lat,
              lng: m.lng,
              title: `🚑 Ambulance En Route`,
              subtitle: `Speed: ${Math.round(m.speed * 3.6)} km/h`,
              isAmbulance: true
            }))}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
            {!geoSupported ? (
              <div className="glass-card p-6 max-w-md border-amber-500/30">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Location Blocked</h3>
                <p className="text-slate-400 text-sm">
                  If you are testing on your phone via a local IP (e.g. 192.168.x.x:3000), mobile browsers disable GPS because it is not a secure (HTTPS) connection. Please deploy to Vercel to test on mobile!
                </p>
              </div>
            ) : locationError ? (
              <div className="glass-card p-8 max-w-md border-rose-500/30">
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MapPinOff className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Location Access Denied</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  {locationError === "denied" 
                    ? "You have denied location access. Please click the lock icon in your browser's address bar, enable location permissions, and try again."
                    : "We couldn't acquire your location. Please check your device's GPS signal and try again."}
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={handleRetryLocation}
                    disabled={isRetrying}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "I've enabled access, retry"}
                  </button>
                  <button
                    onClick={() => {
                      setLocation({ lat: 40.7128, lng: -74.0060 });
                      setLocationError(null);
                      setGeoSupported(true);
                    }}
                    className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    Simulate Location
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <span className="text-slate-400 font-medium flex items-center gap-2">
                  <Activity className="w-5 h-5 animate-pulse" />
                  Waiting for GPS permissions...
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setIsRetrying(true);
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                          setLocationError(null);
                          setIsRetrying(false);
                          startTracking();
                        },
                        (err) => {
                          setIsRetrying(false);
                          if (err.code === err.PERMISSION_DENIED) setLocationError("denied");
                          else if (err.code === err.POSITION_UNAVAILABLE) setLocationError("unavailable");
                          else if (err.code === err.TIMEOUT) setLocationError("timeout");
                          else setLocationError("unknown");
                        },
                        { enableHighAccuracy: false, maximumAge: 10000, timeout: 10000 }
                      );
                    }}
                    disabled={isRetrying}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isRetrying ? "Prompting..." : "Prompt Location Access"}
                  </button>
                  <button
                    onClick={() => {
                      setLocation({ lat: 40.7128, lng: -74.0060 });
                      setLocationError(null);
                    }}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 font-bold py-2 px-4 rounded-xl transition-all"
                  >
                    Simulate Location
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alert Overlay */}
      <AnimatePresence>
        {isAlertActive && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-8 left-4 right-4 z-50 pointer-events-none"
          >
            <div className="glass bg-rose-950/80 border-rose-500/50 p-6 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.3)] flex flex-col items-center text-center">
              <AlertTriangle className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
              <h2 className="text-3xl font-extrabold text-white mb-1 uppercase tracking-wider">Move Aside</h2>
              <p className="text-rose-200 font-medium text-lg">
                Emergency vehicle approaching ({Math.round(nearestDistance!)}m)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
