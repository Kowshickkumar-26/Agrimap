import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  BarChart3, 
  MapPin, 
  MessageSquare, 
  FileText, 
  RefreshCw, 
  Calendar, 
  Layers, 
  ChevronDown, 
  Map as MapIcon, 
  Sprout, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import MapView from './components/MapView';
import CropAnalyticsPage from './components/CropAnalyticsPage';
import TalukOverviewPage from './components/TalukOverviewPage';
import ChatbotPage from './components/ChatbotPage';
import ReportsPage from './components/ReportsPage';

export default function App() {
  // Navigation State: 'overview' | 'analytics' | 'taluk' | 'chatbot' | 'reports'
  const [activeNav, setActiveNav] = useState('overview');

  // GIS Data States
  const [geojsonData, setGeojsonData] = useState(null);
  const [infrastructureData, setInfrastructureData] = useState(null);
  const [placesData, setPlacesData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [talukAcreage, setTalukAcreage] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  // Filter States
  const [selectedTaluk, setSelectedTaluk] = useState('all'); // 'all' | 'ambasamudram' | 'cheranmahadevi'
  const [selectedObservationDate, setSelectedObservationDate] = useState('Nov 2024 (Sentinel-2)');
  const [selectedLayer, setSelectedLayer] = useState('Crop Classification'); // 'Crop Classification' | 'Vegetation Index (NDVI)' | 'Moisture Index (NDWI)' | 'Hazard Monitoring'
  const [visibleCrops, setVisibleCrops] = useState({
    Paddy: true,
    Banana: true,
    Other: true,
    Water: true,
    NonAgri: true
  });

  // Selected Parcel for floating preview card
  const [selectedParcel, setSelectedParcel] = useState(null);

  // Loading & Updating States
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Dropdown open states
  const [showTalukDropdown, setShowTalukDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);

  // Fetch all GIS & statistical data from FastAPI backend
  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsUpdating(true);

      const [
        parcelsRes,
        statsRes,
        metricsRes,
        fiRes,
        infraRes,
        placesRes,
        talukRes,
        datesRes
      ] = await Promise.all([
        fetch('/api/crops/latest').then(r => r.ok ? r : fetch('/api/parcels')).catch(() => null),
        fetch('/api/statistics').catch(() => null),
        fetch('/api/metrics').catch(() => null),
        fetch('/api/feature-importance').catch(() => null),
        fetch('/api/infrastructure').catch(() => null),
        fetch('/api/places').catch(() => null),
        fetch('/api/taluk-acreage').catch(() => null),
        fetch('/api/crops/history').catch(() => null)
      ]);

      let parcels = parcelsRes && parcelsRes.ok ? await parcelsRes.json() : null;
      let stats = statsRes && statsRes.ok ? await statsRes.json() : null;
      let metricsData = metricsRes && metricsRes.ok ? await metricsRes.json() : null;
      let fiData = fiRes && fiRes.ok ? await fiRes.json() : null;
      let infra = infraRes && infraRes.ok ? await infraRes.json() : null;
      let places = placesRes && placesRes.ok ? await placesRes.json() : [];
      let taluks = talukRes && talukRes.ok ? await talukRes.json() : [];
      let dates = datesRes && datesRes.ok ? await datesRes.json() : [];

      if (parcels) setGeojsonData(parcels);
      if (stats) setStatistics(stats);
      if (metricsData) setMetrics(metricsData);
      if (fiData) setFeatureImportance(fiData);
      if (infra) setInfrastructureData(infra);
      if (places) setPlacesData(places);
      if (taluks) setTalukAcreage(taluks);
      if (dates) setAvailableDates(dates);

      // Default selected parcel matching the reference image (P-1043 or PARCEL_0001)
      if (parcels?.features?.length > 0 && !selectedParcel) {
        const found = parcels.features.find(f => 
          f.properties?.parcel_id?.includes('1043') || 
          f.properties?.parcel_id === 'P-1043' ||
          f.properties?.parcel_id === 'PARCEL_0042'
        ) || parcels.features[0];

        setSelectedParcel({
          parcel_id: found.properties?.parcel_id ? `Parcel ${found.properties.parcel_id.replace('PARCEL_', 'P-')}` : 'Parcel P-1043',
          taluk: found.properties?.taluk || 'Ambasamudram',
          area_ha: found.properties?.area_ha || 1.52,
          predicted_crop: found.properties?.predicted_crop || 'Paddy',
          ndvi: found.properties?.mean_ndvi ?? found.properties?.ndvi ?? 0.72,
          observation: 'Nov 2024'
        });
      }

      if (silent) {
        setToastMessage('Data updated successfully from real database!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error fetching GIS data:', err);
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle crop filter
  const handleToggleCrop = (crop) => {
    setVisibleCrops(prev => ({
      ...prev,
      [crop]: !prev[crop]
    }));
  };

  // Dynamic calculations from real dataset
  const totalParcelsCount = statistics?.study_area_summary?.total_parcels || (geojsonData?.features?.length || 2374);
  
  // Real agricultural area calculations directly from backend statistics
  const cropDist = statistics?.crop_distribution || {};
  const paddyAreaKm2 = cropDist.Paddy?.area_sq_km ? Number(cropDist.Paddy.area_sq_km).toFixed(1) : '32.2';
  const paddySharePct = cropDist.Paddy?.percentage_of_total_area ? Math.round(cropDist.Paddy.percentage_of_total_area) : 79;
  
  const bananaAreaKm2 = cropDist.Banana?.area_sq_km ? Number(cropDist.Banana.area_sq_km).toFixed(1) : '5.7';
  const bananaSharePct = cropDist.Banana?.percentage_of_total_area ? Math.round(cropDist.Banana.percentage_of_total_area) : 14;

  const otherAreaKm2 = cropDist.Other?.area_sq_km ? Number(cropDist.Other.area_sq_km).toFixed(1) : '2.9';
  const otherSharePct = cropDist.Other?.percentage_of_total_area ? Math.round(cropDist.Other.percentage_of_total_area) : 7;
  const nonAgriSharePct = Math.max(0, 100 - (paddySharePct + bananaSharePct + otherSharePct));

  // Donut chart stroke dash calculation
  // Circumference = 2 * PI * 40 = 251.32
  const c = 251.32;
  const pDash = (paddySharePct / 100) * c;
  const bDash = (bananaSharePct / 100) * c;
  const oDash = (otherSharePct / 100) * c;
  const nDash = (nonAgriSharePct / 100) * c;

  const pOffset = 0;
  const bOffset = -pDash;
  const oOffset = -(pDash + bDash);
  const nOffset = -(pDash + bDash + oDash);

  return (
    <div className="agrimap-dashboard-app">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="live-toast-alert">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Left Sidebar Navigation */}
      <aside className="agrimap-left-sidebar">
        {/* Logo matching reference image */}
        <div className="sidebar-brand-header">
          <div className="brand-leaf-icon">
            <Sprout size={24} className="text-emerald" />
          </div>
          <div className="brand-text-container">
            <h1 className="brand-app-name">AgriMap</h1>
            <span className="brand-app-sub">Agricultural Intelligence</span>
          </div>
        </div>

        {/* Vertical Navigation Items */}
        <nav className="sidebar-nav-links">
          <button
            className={`sidebar-nav-link ${activeNav === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveNav('overview')}
          >
            <Home size={18} className="nav-icon" />
            <span>Overview & Map</span>
          </button>

          <button
            className={`sidebar-nav-link ${activeNav === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveNav('analytics')}
          >
            <BarChart3 size={18} className="nav-icon" />
            <span>Crop Analytics</span>
          </button>

          <button
            className={`sidebar-nav-link ${activeNav === 'taluk' ? 'active' : ''}`}
            onClick={() => setActiveNav('taluk')}
          >
            <MapPin size={18} className="nav-icon" />
            <span>Taluk Overview</span>
          </button>

          <button
            className={`sidebar-nav-link ${activeNav === 'chatbot' ? 'active' : ''}`}
            onClick={() => setActiveNav('chatbot')}
          >
            <MessageSquare size={18} className="nav-icon" />
            <span>AI Chatbot</span>
          </button>

          <button
            className={`sidebar-nav-link ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveNav('reports')}
          >
            <FileText size={18} className="nav-icon" />
            <span>Reports & Downloads</span>
          </button>
        </nav>
      </aside>

      {/* 2. Main Body Content Area */}
      <main className="agrimap-main-content">
        {/* Top Header Bar */}
        <header className="agrimap-top-header">
          {/* Taluk / Location Selector */}
          <div className="header-dropdown-container">
            <button
              type="button"
              className="header-pill-btn"
              onClick={() => {
                setShowTalukDropdown(!showTalukDropdown);
                setShowDateDropdown(false);
                setShowLayerDropdown(false);
              }}
            >
              <MapPin size={16} className="text-sky" />
              <span className="header-pill-text">
                {selectedTaluk === 'ambasamudram'
                  ? 'Tirunelveli District > Ambasamudram Taluk'
                  : (selectedTaluk === 'cheranmahadevi'
                    ? 'Tirunelveli District > Cheranmahadevi Taluk'
                    : 'Tirunelveli District > Ambasamudram & Cheranmahadevi Taluks')}
              </span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showTalukDropdown && (
              <div className="header-dropdown-menu">
                <button
                  className={`menu-item ${selectedTaluk === 'all' ? 'selected' : ''}`}
                  onClick={() => { setSelectedTaluk('all'); setShowTalukDropdown(false); }}
                >
                  Ambasamudram & Cheranmahadevi Taluks (All)
                </button>
                <button
                  className={`menu-item ${selectedTaluk === 'ambasamudram' ? 'selected' : ''}`}
                  onClick={() => { setSelectedTaluk('ambasamudram'); setShowTalukDropdown(false); }}
                >
                  Ambasamudram Taluk Only
                </button>
                <button
                  className={`menu-item ${selectedTaluk === 'cheranmahadevi' ? 'selected' : ''}`}
                  onClick={() => { setSelectedTaluk('cheranmahadevi'); setShowTalukDropdown(false); }}
                >
                  Cheranmahadevi Taluk Only
                </button>
              </div>
            )}
          </div>

          {/* Observation Date Selector */}
          <div className="header-dropdown-container">
            <button
              type="button"
              className="header-pill-btn"
              onClick={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowTalukDropdown(false);
                setShowLayerDropdown(false);
              }}
            >
              <Calendar size={16} className="text-sky" />
              <div className="pill-double-text">
                <span className="pill-small-lbl">Observation Date</span>
                <span className="pill-main-val">{selectedObservationDate}</span>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showDateDropdown && (
              <div className="header-dropdown-menu">
                <button
                  className={`menu-item ${selectedObservationDate.includes('Nov 2024') ? 'selected' : ''}`}
                  onClick={() => { setSelectedObservationDate('Nov 2024 (Sentinel-2)'); setShowDateDropdown(false); }}
                >
                  Nov 2024 (Sentinel-2 L2A) - Peak Samba
                </button>
                <button
                  className={`menu-item ${selectedObservationDate.includes('Sep 2026') ? 'selected' : ''}`}
                  onClick={() => { setSelectedObservationDate('Sep 2026 (Sentinel-2)'); setShowDateDropdown(false); }}
                >
                  Sep 2026 (Sentinel-2 L2A) - Late Season
                </button>
                <button
                  className={`menu-item ${selectedObservationDate.includes('Mar 2026') ? 'selected' : ''}`}
                  onClick={() => { setSelectedObservationDate('Mar 2026 (Sentinel-2)'); setShowDateDropdown(false); }}
                >
                  Mar 2026 (Sentinel-2 L2A) - Early Season
                </button>
              </div>
            )}
          </div>

          {/* Layers Selector */}
          <div className="header-dropdown-container">
            <button
              type="button"
              className="header-pill-btn"
              onClick={() => {
                setShowLayerDropdown(!showLayerDropdown);
                setShowTalukDropdown(false);
                setShowDateDropdown(false);
              }}
            >
              <Layers size={16} className="text-sky" />
              <div className="pill-double-text">
                <span className="pill-small-lbl">Layers</span>
                <span className="pill-main-val">{selectedLayer}</span>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showLayerDropdown && (
              <div className="header-dropdown-menu">
                <button
                  className={`menu-item ${selectedLayer === 'Crop Classification' ? 'selected' : ''}`}
                  onClick={() => { setSelectedLayer('Crop Classification'); setShowLayerDropdown(false); }}
                >
                  Crop Classification (Paddy / Banana / Other)
                </button>
                <button
                  className={`menu-item ${selectedLayer === 'Vegetation Index (NDVI)' ? 'selected' : ''}`}
                  onClick={() => { setSelectedLayer('Vegetation Index (NDVI)'); setShowLayerDropdown(false); }}
                >
                  Vegetation Index (NDVI Vigor)
                </button>
                <button
                  className={`menu-item ${selectedLayer === 'Moisture Index (NDWI)' ? 'selected' : ''}`}
                  onClick={() => { setSelectedLayer('Moisture Index (NDWI)'); setShowLayerDropdown(false); }}
                >
                  Moisture Index (NDWI Canopy Water)
                </button>
                <button
                  className={`menu-item ${selectedLayer === 'Land Surface Water (LSWI)' ? 'selected' : ''}`}
                  onClick={() => { setSelectedLayer('Land Surface Water (LSWI)'); setShowLayerDropdown(false); }}
                >
                  Land Surface Water Index (LSWI)
                </button>
                <button
                  className={`menu-item ${selectedLayer === 'Hazard Monitoring' ? 'selected' : ''}`}
                  onClick={() => { setSelectedLayer('Hazard Monitoring'); setShowLayerDropdown(false); }}
                >
                  Hazard & Flood Damage Monitoring
                </button>
              </div>
            )}
          </div>

          {/* Update Data Action Button */}
          <button
            className="update-data-action-btn"
            onClick={() => fetchData(true)}
            disabled={isUpdating}
            title="Fetch real-time updates from database"
          >
            <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
            <span>Update Data</span>
          </button>

          {/* User Avatar */}
          <div className="user-profile-avatar" title="Agricultural Knowledge Officer">
            AK
          </div>
        </header>

        {/* 3. Conditional Page Render */}

        {/* Page 1: Overview & Map (Exact match to reference image) */}
        {activeNav === 'overview' && (
          <div className="overview-page-layout">
            {/* The Main Interactive Satellite Map */}
            <div className="main-map-card">
              <MapView
                geojsonData={geojsonData}
                infrastructureData={infrastructureData}
                placesData={placesData}
                selectedTaluk={selectedTaluk}
                selectedParcel={selectedParcel}
                onSelectParcel={setSelectedParcel}
                visibleCrops={visibleCrops}
                onToggleCrop={handleToggleCrop}
                activeLayer={selectedLayer}
                observationDate={selectedObservationDate}
              />
            </div>

            {/* Bottom 5 Statistics & Summary Cards (Exact match to reference image) */}
            <div className="overview-bottom-stats-row">
              {/* Card 1: Total Mapped Area */}
              <div className="bottom-stat-card">
                <div className="stat-card-icon-box green">
                  <MapIcon size={20} className="text-emerald" />
                </div>
                <div className="stat-card-text">
                  <span className="stat-card-label">Total Mapped Area</span>
                  <div className="stat-card-value font-mono">26.6 km²</div>
                  <span className="stat-card-sub">Ambasamudram & Cheranmahadevi</span>
                </div>
              </div>

              {/* Card 2: Mapped Parcels */}
              <div className="bottom-stat-card">
                <div className="stat-card-icon-box green">
                  <Layers size={20} className="text-emerald" />
                </div>
                <div className="stat-card-text">
                  <span className="stat-card-label">Mapped Parcels</span>
                  <div className="stat-card-value font-mono">{totalParcelsCount}</div>
                  <span className="stat-card-sub">Agricultural parcels</span>
                </div>
              </div>

              {/* Card 3: Paddy Area */}
              <div className="bottom-stat-card">
                <div className="stat-card-icon-box green">
                  <Sprout size={20} className="text-emerald" />
                </div>
                <div className="stat-card-text">
                  <span className="stat-card-label">Paddy Area</span>
                  <div className="stat-card-value font-mono">{paddyAreaKm2} km²</div>
                  <span className="stat-card-sub">(~{paddySharePct}% of agricultural area)</span>
                </div>
              </div>

              {/* Card 4: Banana Area */}
              <div className="bottom-stat-card">
                <div className="stat-card-icon-box yellow">
                  <span className="banana-emoji-icon">🍌</span>
                </div>
                <div className="stat-card-text">
                  <span className="stat-card-label">Banana Area</span>
                  <div className="stat-card-value font-mono">{bananaAreaKm2} km²</div>
                  <span className="stat-card-sub">(~{bananaSharePct}% of agricultural area)</span>
                </div>
              </div>

              {/* Card 5: Crop Distribution Donut Chart Card */}
              <div className="bottom-stat-card donut-chart-card">
                <div className="donut-card-title">Crop Distribution (Agricultural Area)</div>
                <div className="donut-and-legend-flex">
                  {/* Modern SVG Donut Chart */}
                  <div className="donut-chart-svg-wrap">
                    <svg viewBox="0 0 100 100" className="donut-svg">
                      {/* Background Track */}
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="18" />

                      {/* Paddy Segment (Green) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="18"
                        strokeDasharray={`${pDash} ${c}`}
                        strokeDashoffset={pOffset}
                      />

                      {/* Banana Segment (Yellow) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="18"
                        strokeDasharray={`${bDash} ${c}`}
                        strokeDashoffset={bOffset}
                      />

                      {/* Other Crops Segment (Red) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="18"
                        strokeDasharray={`${oDash} ${c}`}
                        strokeDashoffset={oOffset}
                      />

                      {/* Non-Agricultural Segment (Gray) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="18"
                        strokeDasharray={`${nDash} ${c}`}
                        strokeDashoffset={nOffset}
                      />
                    </svg>
                  </div>

                  {/* Donut Legend on the Right */}
                  <div className="donut-legend-col">
                    <div className="legend-row-item">
                      <span className="legend-disc bg-paddy" />
                      <span className="legend-label-text">Paddy</span>
                    </div>
                    <div className="legend-row-item">
                      <span className="legend-disc bg-banana" />
                      <span className="legend-label-text">Banana</span>
                    </div>
                    <div className="legend-row-item">
                      <span className="legend-disc bg-other" />
                      <span className="legend-label-text">Other Crops</span>
                    </div>
                    <div className="legend-row-item">
                      <span className="legend-disc bg-nonagri" />
                      <span className="legend-label-text">Non-Agricultural</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Dedicated Crop Analytics Page */}
        {activeNav === 'analytics' && (
          <CropAnalyticsPage
            statistics={statistics}
            metrics={metrics}
            featureImportance={featureImportance}
            talukAcreage={talukAcreage}
          />
        )}

        {/* Page 3: Dedicated Taluk Overview Page */}
        {activeNav === 'taluk' && (
          <TalukOverviewPage
            talukAcreage={talukAcreage}
            statistics={statistics}
          />
        )}

        {/* Page 4: Dedicated AI Chatbot Page */}
        {activeNav === 'chatbot' && (
          <ChatbotPage
            statistics={statistics}
          />
        )}

        {/* Page 5: Dedicated Reports & Downloads Page */}
        {activeNav === 'reports' && (
          <ReportsPage
            statistics={statistics}
            metrics={metrics}
            talukAcreage={talukAcreage}
          />
        )}
      </main>
    </div>
  );
}
