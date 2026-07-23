import React, { useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';

// Google Maps version of the route map. Used when a Maps key is configured;
// RoutePlanner falls back to the Leaflet map otherwise, so the planner keeps
// working with no key (and we never hard-depend on a billed API).
const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 }; // London

// Numbered teal pin, drawn inline so it matches the app's brand.
function numberedIcon(index) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="14" fill="#0D9488" stroke="#ffffff" stroke-width="3"/>
      <text x="17" y="22" text-anchor="middle" font-family="Arial, sans-serif"
            font-size="13" font-weight="bold" fill="#ffffff">${index}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(34, 34),
    anchor: new window.google.maps.Point(17, 17),
  };
}

const GoogleRouteMap = ({ addresses = [] }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'stop-tracker-google-maps',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });
  const mapRef = useRef(null);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Keep every stop in view as the list changes.
  useEffect(() => {
    if (!isLoaded || !mapRef.current || addresses.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    addresses.forEach((a) => bounds.extend({ lat: a.latitude, lng: a.longitude }));
    if (addresses.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(15);
    } else {
      mapRef.current.fitBounds(bounds, 48);
    }
  }, [addresses, isLoaded]);

  if (loadError) {
    return (
      <div className="w-full h-full rounded-lg border-2 border-border flex items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load the map. Check your connection.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full rounded-lg border-2 border-border flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const path = addresses.map((a) => ({ lat: a.latitude, lng: a.longitude }));

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border-2 border-border isolate">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={path[0] || DEFAULT_CENTER}
        zoom={addresses.length === 0 ? 6 : 13}
        onLoad={onLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        }}
      >
        {addresses.map((a, i) => (
          <MarkerF
            key={a.id ?? `${a.latitude},${a.longitude}`}
            position={{ lat: a.latitude, lng: a.longitude }}
            icon={numberedIcon(i + 1)}
            title={a.address}
          />
        ))}
        {addresses.length > 1 && (
          <PolylineF
            path={path}
            options={{ strokeColor: '#0D9488', strokeOpacity: 0.8, strokeWeight: 4 }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleRouteMap;
