import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom numbered icons
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to fit bounds when addresses change
const FitBounds = ({ addresses }) => {
  const map = useMap();

  useEffect(() => {
    if (addresses.length > 0) {
      const bounds = L.latLngBounds(
        addresses.map(addr => [addr.latitude, addr.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [addresses, map]);

  return null;
};

const RouteMap = ({ addresses }) => {
  // Default center (UK)
  const defaultCenter = [51.5074, -0.1278];
  const center = addresses.length > 0
    ? [addresses[0].latitude, addresses[0].longitude]
    : defaultCenter;

  // Create polyline coordinates
  const polylinePositions = addresses.map(addr => [addr.latitude, addr.longitude]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border-2 border-border isolate">
      <MapContainer
        center={center}
        zoom={addresses.length === 0 ? 6 : 13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Markers for each address */}
        {addresses.map((address, index) => (
          <Marker
            key={address.id}
            position={[address.latitude, address.longitude]}
            icon={createNumberedIcon(index + 1)}
          >
            <Popup>
              <div className="text-sm">
                <strong>Stop {index + 1}</strong>
                <br />
                {address.address}
                <br />
                <span className="text-xs text-gray-500">{address.postcode}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route line connecting all points */}
        {addresses.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color="#3B82F6"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}

        {/* Auto-fit bounds */}
        <FitBounds addresses={addresses} />
      </MapContainer>
    </div>
  );
};

export default RouteMap;
