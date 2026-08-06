import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
}

const DEFAULT_CENTER: LatLngExpression = [40.7128, -74.006];

const MapView = ({ center, zoom = 13 }: MapViewProps) => {
  const markerPosition: LatLngExpression = center ? [center.lat, center.lng] : DEFAULT_CENTER;

  return (
    <div className="map-card card">
      <MapContainer center={markerPosition} zoom={zoom} scrollWheelZoom={false} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={markerPosition} />
      </MapContainer>
    </div>
  );
};

export default MapView;
