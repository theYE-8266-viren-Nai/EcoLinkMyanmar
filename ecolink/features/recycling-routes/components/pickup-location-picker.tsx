"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";

type Coordinates = { latitude: number; longitude: number };

const DEFAULT_CENTER: [number, number] = [96.1561, 16.8248];

export function PickupLocationPicker({ value, onChange }: { value: Coordinates | null; onChange: (coordinates: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const [mapError, setMapError] = useState<string>();
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const onMapChange = useEffectEvent((coordinates: Coordinates) => onChange(coordinates));

  function updateManualCoordinates(latitudeText: string, longitudeText: string) {
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    if (latitudeText && longitudeText && Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      onChange({ latitude, longitude });
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    let cancelled = false;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ?? "mapbox://styles/mapbox/streets-v12",
        center: DEFAULT_CENTER,
        zoom: 11.5,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("click", (event) => onMapChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }));
      map.on("error", () => setMapError("The map could not be loaded. You can still use your current location."));
      mapRef.current = map;
    }).catch(() => setMapError("The map could not be loaded. You can still use your current location."));
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      markerRef.current?.remove();
      markerRef.current = new mapboxgl.Marker({ color: "#087c78" })
        .setLngLat([value.longitude, value.latitude])
        .addTo(map);
      map.easeTo({ center: [value.longitude, value.latitude], zoom: Math.max(map.getZoom(), 14), duration: 350 });
    });
  }, [value]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMapError("Location is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setMapError("Location permission was denied. Select the pickup point on the map."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <section className="pickup-pin-picker" aria-labelledby="pickup-pin-heading">
      <div className="pickup-pin-picker__heading">
        <div><strong id="pickup-pin-heading">Confirm pickup map pin</strong><span>Click the exact collection point.</span></div>
        <button type="button" onClick={useCurrentLocation}><LocateFixed size={16} aria-hidden="true" /> Use my location</button>
      </div>
      {token ? <div className="pickup-pin-picker__map" ref={containerRef} role="application" aria-label="Pickup location map" /> : null}
      {!token ? (
        <div className="pickup-pin-picker__manual">
          <p className="pickup-pin-picker__fallback"><MapPin size={16} aria-hidden="true" /> Mapbox is unavailable. Use your current location or enter the coordinates.</p>
          <label><span>Latitude</span><input type="number" min="-90" max="90" step="0.000001" value={manualLatitude} onChange={(event) => {
            const next = event.target.value;
            setManualLatitude(next);
            updateManualCoordinates(next, manualLongitude);
          }}/></label>
          <label><span>Longitude</span><input type="number" min="-180" max="180" step="0.000001" value={manualLongitude} onChange={(event) => {
            const next = event.target.value;
            setManualLongitude(next);
            updateManualCoordinates(manualLatitude, next);
          }}/></label>
        </div>
      ) : null}
      {value ? <p className="pickup-pin-picker__confirmed"><MapPin size={15} aria-hidden="true" /> Pin confirmed at {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</p> : <p className="pickup-pin-picker__required">A confirmed map pin is required.</p>}
      {mapError ? <p className="pickup-pin-picker__error" role="status">{mapError}</p> : null}
    </section>
  );
}
