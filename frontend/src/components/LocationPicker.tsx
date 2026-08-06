import { useMemo } from 'react';
import { DragEndEvent, LatLngLiteral, LeafletEventHandlerFnMap } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import MapView from './MapView';

interface LocationPickerProps {
  value: LatLngLiteral;
  onChange: (value: LatLngLiteral) => void;
}

const ClickHandler = ({ onChange }: { onChange: (value: LatLngLiteral) => void }) => {
  useMapEvents({
    click(event) {
      onChange(event.latlng);
    },
  });
  return null;
};

const DraggableMarker = ({ value, onChange }: LocationPickerProps) => {
  const handlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragend(event: DragEndEvent) {
        onChange(event.target.getLatLng());
      },
    }),
    [onChange],
  );

  return <Marker draggable eventHandlers={handlers} position={value} />;
};

const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  void MapView;
  return (
    <div className="map-card card">
      <MapContainer center={value} zoom={14} scrollWheelZoom className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <DraggableMarker value={value} onChange={onChange} />
      </MapContainer>
      <div className="map-footer muted-text">Tap the map or drag the pin to choose the job location.</div>
    </div>
  );
};

export default LocationPicker;
