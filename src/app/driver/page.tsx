"use client";

import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import { ref, set, onDisconnect } from "firebase/database";
import { motion } from "framer-motion";
import { ShieldAlert, Navigation, Activity, LogOut, MapPinOff, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
      <div className="animate-pulse flex flex-col items-center">
        <Navigation className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
        <span className="text-slate-400 font-medium">Acquiring GPS Signal...</span>
      </div>
    </div>
  ),
});

export default function DriverPage() {
  const { user, loading, isSigningOut, signOut } = useAuth();
  const router = useRouter();
  
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; speed?: number } | null>(null);
  const [geoSupported, setGeoSupported] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user && !isSigningOut) {
      router.push("/login?returnUrl=/driver");
    }
  }, [user, loading, router, isSigningOut]);



  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const startTracking = useCallback(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      setGeoSupported(true);
      setLocationError(null);
      
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          setLocation({ lat: latitude, lng: longitude, speed: speed || 0 });
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

  useEffect(() => {
    startTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startTracking]);

  // Broadcast location to Firebase when mission is active
  useEffect(() => {
    if (!user) return;
    
    const missionRef = ref(rtdb, `missions/${user.uid}`);
    
    if (isMissionActive && location) {
      // Set up disconnect hook so if they close the app, it stops broadcasting
      onDisconnect(missionRef).remove();

      set(missionRef, {
        driverId: user.uid,
        driverName: user.displayName || user.email || "Driver",
        lat: location.lat,
        lng: location.lng,
        speed: location.speed || 0,
        timestamp: Date.now(),
        active: true
      }).catch(console.error);
    } else if (!isMissionActive) {
      // Clear mission from DB when deactivated
      set(missionRef, null).catch(console.error);
    }
  }, [isMissionActive, location, user]);

  const toggleMission = () => {
    setIsMissionActive(!isMissionActive);
  };

  const handleRetryLocation = () => {
    setIsRetrying(true);
    startTracking();
  };

  if (loading || !user) return null;

  return (
    <main className="h-screen w-full flex flex-col bg-slate-950 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 glass-card p-4 rounded-2xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Ambulance Unit</h1>
            <p className="text-xs text-slate-400 font-medium">{user.displayName || user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMissionActive ? "bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "bg-slate-600"}`} />
            <span className="text-sm font-medium text-slate-300">
              {isMissionActive ? "BROADCASTING" : "STANDBY"}
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
      <div className="flex-grow relative rounded-2xl overflow-hidden glass border-0 z-0">
        {location ? (
          <MapComponent lat={location.lat} lng={location.lng} zoom={16} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
            {!geoSupported ? (
              <div className="glass-card p-6 max-w-md border-amber-500/30">
                <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
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
                      setLocation({ lat: 40.7128, lng: -74.0060, speed: 15 });
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
                      setLocation({ lat: 40.7128, lng: -74.0060, speed: 15 });
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

        {/* Floating Controls Overlay */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-[1000] px-4 pointer-events-none">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleMission}
            disabled={!location}
            className={`pointer-events-auto px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all duration-300 flex items-center gap-3
              ${isMissionActive 
                ? "bg-slate-800 text-rose-500 border border-rose-500/50 hover:bg-slate-700" 
                : "bg-rose-600 text-white hover:bg-rose-500 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:bg-slate-800"
              }`}
          >
            {isMissionActive ? (
              <>
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                END MISSION
              </>
            ) : (
              <>
                <Activity className="w-6 h-6" />
                START EMERGENCY MISSION
              </>
            )}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
