import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getCropColor, createParcelPopupContent } from './ParcelPopup';
import { X, Crosshair, ZoomIn, ZoomOut, Layers } from 'lucide-react';

export default function MapView({
  geojsonData,
  infrastructureData,
  placesData,
  activeBasemap = 'satellite',
  showParcelBoundaries = true,
  showPlaces = true,
  showInfra = true,
  showLabels = true,
  selectedTaluk = 'all',
  selectedParcel,
  onSelectParcel,
  visibleCrops = { Paddy: true, Banana: true, Other: true, Water: true, NonAgri: true },
  onToggleCrop,
  observationDate = 'Nov 2024 (Sentinel-2)',
  activeLayer = 'Crop Classification'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseLayersGroupRef = useRef({});
  const labelOverlayGroupRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const settlementsLayerRef = useRef(null);
  const infraLayerRef = useRef(null);
  const labelsLayerRef = useRef(null);
  const hasFitInitialBoundsRef = useRef(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [8.698, 77.495],
      zoom: 12.5,
      minZoom: 9,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: false
    });

    // Custom high-priority pane for Agricultural Parcels
    const parcelsPane = map.createPane('parcelsPane');
    parcelsPane.style.zIndex = '500';

    // Leaflet Scale Control on bottom-left (matching reference image scale bar)
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 120 }).addTo(map);

    // --- BASE TILE LAYERS ---
    const satImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
    });

    const streetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    const darkMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri'
    });

    // Reference labels overlay for satellite hybrid
    const placesOverlay = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      pane: 'shadowPane'
    });
    const roadsOverlay = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      pane: 'shadowPane'
    });

    const hybridLabelsGroup = L.layerGroup([roadsOverlay, placesOverlay]);
    labelOverlayGroupRef.current = hybridLabelsGroup;

    baseLayersGroupRef.current = {
      satellite: satImagery,
      hybrid: satImagery,
      map: streetMap,
      dark: darkMap
    };

    // Default: Satellite + labels
    satImagery.addTo(map);
    hybridLabelsGroup.addTo(map);

    // Custom Administrative and River Labels on map
    const prominentLabels = L.layerGroup();
    
    // Taluk Headers
    const ambMarker = L.marker([8.710, 77.442], {
      icon: L.divIcon({
        className: 'custom-map-area-label amb-label',
        html: `<div class="taluk-label-tag"><strong>Ambasamudram</strong><span>Taluk</span></div>`,
        iconSize: [160, 40],
        iconAnchor: [80, 20]
      })
    });
    prominentLabels.addLayer(ambMarker);

    const cherMarker = L.marker([8.705, 77.545], {
      icon: L.divIcon({
        className: 'custom-map-area-label cher-label',
        html: `<div class="taluk-label-tag"><strong>Cheranmahadevi</strong><span>Taluk</span></div>`,
        iconSize: [160, 40],
        iconAnchor: [80, 20]
      })
    });
    prominentLabels.addLayer(cherMarker);

    // Town and River Labels (matching reference image)
    const landmarks = [
      { name: "Papanasam", lat: 8.718, lon: 77.385, type: 'town' },
      { name: "Ambasamudram", lat: 8.701, lon: 77.452, type: 'town' },
      { name: "Kallidaikurichi", lat: 8.685, lon: 77.462, type: 'town' },
      { name: "Cheranmahadevi", lat: 8.688, lon: 77.558, type: 'town' },
      { name: "Manimuthar River", lat: 8.718, lon: 77.592, type: 'river' },
      { name: "Gadana Nathi", lat: 8.692, lon: 77.420, type: 'river' },
      { name: "Tirunelveli", lat: 8.665, lon: 77.675, type: 'town' },
      { name: "Nanguneri", lat: 8.680, lon: 77.720, type: 'town' },
    ];

    landmarks.forEach(lm => {
      const isRiver = lm.type === 'river';
      const marker = L.marker([lm.lat, lm.lon], {
        icon: L.divIcon({
          className: isRiver ? 'custom-river-label' : 'custom-town-label',
          html: `<span class="${isRiver ? 'river-text' : 'town-text'}">${lm.name}</span>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12]
        })
      });
      prominentLabels.addLayer(marker);
    });

    prominentLabels.addTo(map);
    labelsLayerRef.current = prominentLabels;

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap & Label Overlays
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const layers = baseLayersGroupRef.current;

    Object.values(layers).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });

    const activeLayerObj = layers[activeBasemap] || layers.satellite;
    activeLayerObj.addTo(map);

    if (labelOverlayGroupRef.current) {
      if ((activeBasemap === 'satellite' || activeBasemap === 'hybrid') && showLabels) {
        if (!map.hasLayer(labelOverlayGroupRef.current)) {
          labelOverlayGroupRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(labelOverlayGroupRef.current)) {
          map.removeLayer(labelOverlayGroupRef.current);
        }
      }
    }
  }, [activeBasemap, showLabels]);

  // Infrastructure (Waterways & Roads) Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !infrastructureData) return;
    const map = mapInstanceRef.current;

    if (infraLayerRef.current) {
      map.removeLayer(infraLayerRef.current);
      infraLayerRef.current = null;
    }

    if (!showInfra) return;

    try {
      const rawInfra = Array.isArray(infrastructureData?.features) ? infrastructureData.features : [];
      const validInfra = rawInfra.filter(f => f && f.type === 'Feature' && f.geometry && typeof f.geometry.type === 'string' && Array.isArray(f.geometry.coordinates));
      const safeInfra = { ...infrastructureData, type: 'FeatureCollection', features: validInfra };

      const infraLayer = L.geoJSON(safeInfra, {
        filter: (feature) => {
          const cat = feature.properties?.category;
          if (cat === "waterway" && !visibleCrops.Water) return false;
          return true;
        },
        style: (feature) => {
          const cat = feature.properties?.category;
          const type = feature.properties?.type;
          if (cat === "waterway") {
            const isMain = type === "river";
            return {
              color: isMain ? "#0284c7" : "#38bdf8",
              weight: isMain ? 2.5 : 1.5,
              opacity: isMain ? 0.95 : 0.85,
              lineCap: "round",
              lineJoin: "round"
            };
          } else {
            return {
              color: "#fb923c",
              weight: 1.5,
              opacity: 0.75,
              lineCap: "round",
              lineJoin: "round"
            };
          }
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.name || "Waterway / Infrastructure";
          layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true });
        }
      }).addTo(map);

      infraLayerRef.current = infraLayer;
    } catch (infraErr) {
      console.error('Error creating infrastructure layer:', infraErr);
    }
  }, [infrastructureData, showInfra, visibleCrops.Water]);

  // Classified Agricultural Parcels Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !geojsonData) return;
    const map = mapInstanceRef.current;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    map.invalidateSize();

    const parcelStyle = (feature) => {
      const props = feature.properties || {};
      const crop = props.predicted_crop || 'Other';
      const colors = getCropColor(crop);

      // Check for different layer display modes
      let fillColor = colors.fill;
      if (activeLayer === 'Vegetation Index (NDVI)') {
        const ndvi = props.mean_ndvi ?? props.ndvi ?? 0.7;
        fillColor = ndvi > 0.7 ? '#15803d' : (ndvi > 0.5 ? '#84cc16' : '#eab308');
      } else if (activeLayer === 'Moisture Index (NDWI)') {
        const ndwi = props.mean_ndwi ?? props.ndwi ?? -0.1;
        fillColor = ndwi > 0 ? '#0284c7' : '#38bdf8';
      } else if (activeLayer.includes('LSWI')) {
        const lswi = props.mean_lswi ?? props.lswi ?? 0.0;
        fillColor = lswi > 0.05 ? '#0284c7' : (lswi > -0.05 ? '#38bdf8' : '#e2e8f0');
      } else if (activeLayer === 'Hazard Monitoring') {
        const hasHazard = props.hazard && props.hazard !== 'None';
        fillColor = hasHazard ? '#ef4444' : '#22c55e';
      }

      const isSelected = selectedParcel && (
        selectedParcel.parcel_id === props.parcel_id || 
        selectedParcel.id === props.parcel_id
      );

      return {
        pane: 'parcelsPane',
        fillColor: fillColor,
        weight: isSelected ? 3.0 : (showParcelBoundaries ? 1.0 : 0),
        opacity: 1.0,
        color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
        fillOpacity: isSelected ? 0.90 : 0.75
      };
    };

    const highlightStyle = {
      pane: 'parcelsPane',
      weight: 3.0,
      color: '#ffffff',
      fillOpacity: 0.95
    };

    const rawFeatures = Array.isArray(geojsonData?.features) ? geojsonData.features : [];
    const validFeatures = rawFeatures.filter((f) => {
      if (!f || f.type !== 'Feature') return false;
      const geom = f.geometry;
      if (!geom || typeof geom !== 'object' || !geom.type || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
        return false;
      }

      // Filter by visible crops
      const crop = f.properties?.predicted_crop || 'Other';
      if (crop === 'Paddy' && !visibleCrops.Paddy) return false;
      if (crop === 'Banana' && !visibleCrops.Banana) return false;
      if ((crop === 'Other' || crop === 'Non-Crop') && !visibleCrops.Other && !visibleCrops.NonAgri) return false;

      // Filter by taluk
      if (selectedTaluk !== 'all') {
        const t = (f.properties?.taluk || '').toLowerCase();
        const sel = selectedTaluk.toLowerCase();
        if (!t.includes(sel) && !sel.includes(t)) return false;
      }

      return true;
    });

    const safeGeojson = {
      ...geojsonData,
      type: 'FeatureCollection',
      features: validFeatures
    };

    let parcelLayer = null;
    try {
      parcelLayer = L.geoJSON(safeGeojson, {
        style: parcelStyle,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const confPct = Math.round((props.confidence || 0) * 100);
          const areaHa = props.area_ha ? Number(props.area_ha).toFixed(2) : (props.area_sq_km ? (Number(props.area_sq_km) * 100).toFixed(2) : '1.50');
          const ndvi = props.mean_ndvi !== undefined ? Number(props.mean_ndvi).toFixed(2) : '—';
          const lswi = props.mean_lswi !== undefined ? Number(props.mean_lswi).toFixed(2) : '—';

          layer.bindTooltip(
            `<strong>${props.parcel_id}</strong><br/>` +
            `Crop: <strong>${props.predicted_crop}</strong> (${confPct}%)<br/>` +
            `Taluk: ${props.taluk || 'Study Area'}<br/>` +
            `Area: ${areaHa} ha | NDVI: ${ndvi} | LSWI: ${lswi}`,
            { sticky: true, className: 'leaflet-custom-tooltip' }
          );

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle(highlightStyle);
              l.bringToFront();
            },
            mouseout: (e) => {
              const l = e.target;
              parcelLayer.resetStyle(l);
            },
            click: (e) => {
              if (onSelectParcel) {
                onSelectParcel(props);
              }
              L.DomEvent.stopPropagation(e);
            }
          });
        }
      }).addTo(map);

      geojsonLayerRef.current = parcelLayer;
    } catch (layerErr) {
      console.error('Error creating Leaflet parcel GeoJSON layer:', layerErr);
      return;
    }

    // Helper to verify bounds
    const isValidWgs84 = (b) => {
      if (!b || !b.isValid()) return false;
      const s = b.getSouth(), n = b.getNorth(), w = b.getWest(), e = b.getEast();
      return s >= -90 && n <= 90 && w >= -180 && e <= 180 && (n - s) > 0.0001 && (e - w) > 0.0001;
    };

    // Auto-fit bounds on initial load
    if (parcelLayer && !hasFitInitialBoundsRef.current && parcelLayer.getLayers().length > 0) {
      const bounds = parcelLayer.getBounds();
      if (isValidWgs84(bounds)) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        hasFitInitialBoundsRef.current = true;
      }
    }
  }, [geojsonData, showParcelBoundaries, visibleCrops, selectedTaluk, activeLayer, selectedParcel, onSelectParcel]);

  // Handle Zoom In / Zoom Out
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Handle Locate / Re-center View
  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (geojsonLayerRef.current && geojsonLayerRef.current.getLayers().length > 0) {
      const bounds = geojsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        return;
      }
    }
    map.setView([8.698, 77.495], 12.5);
  };

  // Fallback parcel details if selectedParcel is active
  const parcelId = selectedParcel?.parcel_id || 'Parcel P-1043';
  const parcelTaluk = selectedParcel?.taluk || 'Ambasamudram';
  const parcelArea = selectedParcel?.area_ha 
    ? `${Number(selectedParcel.area_ha).toFixed(2)} ha` 
    : (selectedParcel?.area_sq_km ? `${(Number(selectedParcel.area_sq_km) * 100).toFixed(2)} ha` : '1.52 ha');
  const parcelCrop = selectedParcel?.predicted_crop || 'Paddy';
  const parcelNdvi = selectedParcel?.mean_ndvi ?? selectedParcel?.ndvi ?? 0.72;
  const parcelObsDate = selectedParcel?.observation_date || selectedParcel?.observation || 'Nov 2024';

  return (
    <div className="satellite-map-container">
      {/* 1. Underlying Leaflet Map Engine */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" />

      {/* 2. Top-Center Floating Legend Pill (Exact match to reference image) */}
      <div className="floating-crop-legend-pill">
        <button
          type="button"
          className={`legend-item-btn ${visibleCrops.Paddy ? 'active' : 'inactive'}`}
          onClick={() => onToggleCrop && onToggleCrop('Paddy')}
          title="Toggle Paddy Parcels"
        >
          <span className="legend-dot dot-paddy" />
          <span className="legend-name">Paddy</span>
        </button>

        <button
          type="button"
          className={`legend-item-btn ${visibleCrops.Banana ? 'active' : 'inactive'}`}
          onClick={() => onToggleCrop && onToggleCrop('Banana')}
          title="Toggle Banana Parcels"
        >
          <span className="legend-dot dot-banana" />
          <span className="legend-name">Banana</span>
        </button>

        <button
          type="button"
          className={`legend-item-btn ${visibleCrops.Other ? 'active' : 'inactive'}`}
          onClick={() => onToggleCrop && onToggleCrop('Other')}
          title="Toggle Other Crops"
        >
          <span className="legend-dot dot-other" />
          <span className="legend-name">Other Crops</span>
        </button>

        <button
          type="button"
          className={`legend-item-btn ${visibleCrops.Water ? 'active' : 'inactive'}`}
          onClick={() => onToggleCrop && onToggleCrop('Water')}
          title="Toggle Waterways"
        >
          <span className="legend-dot dot-water" />
          <span className="legend-name">Water</span>
        </button>

        <button
          type="button"
          className={`legend-item-btn ${visibleCrops.NonAgri ? 'active' : 'inactive'}`}
          onClick={() => onToggleCrop && onToggleCrop('NonAgri')}
          title="Toggle Non-Agricultural Areas"
        >
          <span className="legend-dot dot-nonagri" />
          <span className="legend-name">Non-Agricultural</span>
        </button>
      </div>

      {/* 3. Top-Left Floating Map Controls: Zoom (+/-) and Locate */}
      <div className="floating-map-controls-group">
        <button
          className="map-ctrl-btn"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="map-ctrl-btn"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="map-ctrl-btn"
          onClick={handleFitBounds}
          title="Recenter Map View"
        >
          <Crosshair size={16} />
        </button>
      </div>

      {/* 4. Floating Selected Parcel Card (Matching Reference Image) */}
      {selectedParcel && (
        <div className="floating-parcel-info-card">
          <div className="card-top-bar">
            <span className="card-title-text">{parcelId}</span>
            <button
              className="card-close-btn"
              onClick={() => onSelectParcel && onSelectParcel(null)}
              title="Close parcel preview"
            >
              <X size={14} />
            </button>
          </div>

          <div className="card-main-content">
            <div className="parcel-thumb-container">
              <img
                src="/parcel_p102_thumb.jpg"
                alt="Agricultural parcel satellite crop view"
                className="parcel-thumb-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/api/parcels/thumbnail';
                }}
              />
            </div>

            <div className="parcel-details-table">
              <div className="detail-row">
                <span className="detail-key">Taluk</span>
                <span className="detail-val">{parcelTaluk}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Area</span>
                <span className="detail-val">{parcelArea}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Crop Class</span>
                <span className={`crop-class-badge badge-${parcelCrop.toLowerCase()}`}>
                  {parcelCrop}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-key">NDVI (Latest)</span>
                <span className="detail-val font-mono">{Number(parcelNdvi).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Observation</span>
                <span className="detail-val">{parcelObsDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
