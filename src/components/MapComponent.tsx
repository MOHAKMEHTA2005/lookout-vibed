"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// A component to automatically center the map when coordinates change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  isAmbulance?: boolean;
}

interface MapComponentProps {
  lat: number;
  lng: number;
  zoom?: number;
  children?: React.ReactNode;
  markers?: MapMarker[];
}

export default function MapComponent({ lat, lng, zoom = 15, children, markers = [] }: MapComponentProps) {
  const center: [number, number] = [lat, lng];

  const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const ambulanceIcon = L.divIcon({
    className: "custom-ambulance-icon",
    html: `<div style="width: 20px; height: 20px; background-color: #f43f5e; border-radius: 50%; box-shadow: 0 0 15px #f43f5e; border: 2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      className="w-full h-full rounded-2xl z-0"
      zoomControl={false}
    >
      <ChangeView center={center} zoom={zoom} />
      
      {/* Dark Theme Map Tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      {children}
      
      {/* Current Location Marker */}
      <Marker position={center} icon={defaultIcon}>
        <Popup className="text-slate-900 font-medium">
          You are here.
        </Popup>
      </Marker>

      {/* Additional Markers */}
      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={[marker.lat, marker.lng]} 
          icon={marker.isAmbulance ? ambulanceIcon : defaultIcon}
        >
          <Popup className="text-slate-900 font-bold">
            {marker.title}
            {marker.subtitle && (
              <>
                <br />
                {marker.subtitle}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
