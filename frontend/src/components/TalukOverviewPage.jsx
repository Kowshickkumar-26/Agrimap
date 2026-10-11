import React from 'react';
import { 
  MapPin, 
  Droplets, 
  Sprout, 
  Layers, 
  TrendingUp, 
  Activity, 
  Compass, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function TalukOverviewPage({ talukAcreage, statistics }) {
  // Aggregate dynamic Taluk metrics from real API / prop data
  const ambaRows = Array.isArray(talukAcreage) 
    ? talukAcreage.filter(r => (r.taluk || '').toLowerCase().includes('amba'))
    : [];
  const cherRows = Array.isArray(talukAcreage)
    ? talukAcreage.filter(r => (r.taluk || '').toLowerCase().includes('cher'))
    : [];

  const getTalukMetric = (rows, cropName, defaultVal) => {
    const found = rows.find(r => (r.crop || '').toLowerCase() === cropName.toLowerCase());
    return found ? Number(found.area_hectares) : defaultVal;
  };

  const getTalukCount = (rows, defaultVal) => {
    const subtotal = rows.find(r => (r.taluk || '').includes('Subtotal') || (r.crop || '').toUpperCase() === 'ALL_CROPS');
    if (subtotal) return Number(subtotal.parcel_count);
    const sum = rows.filter(r => !(r.taluk || '').includes('Subtotal')).reduce((acc, r) => acc + Number(r.parcel_count || 0), 0);
    return sum > 0 ? sum : defaultVal;
  };

  const getTalukArea = (rows, defaultVal) => {
    const subtotal = rows.find(r => (r.taluk || '').includes('Subtotal') || (r.crop || '').toUpperCase() === 'ALL_CROPS');
    if (subtotal) return Number(subtotal.area_hectares);
    const sum = rows.filter(r => !(r.taluk || '').includes('Subtotal')).reduce((acc, r) => acc + Number(r.area_hectares || 0), 0);
    return sum > 0 ? sum : defaultVal;
  };

  const ambaParcels = getTalukCount(ambaRows, 1516);
  const ambaAreaHa = getTalukArea(ambaRows, 2894.02);
  const ambaPaddyHa = getTalukMetric(ambaRows, 'paddy', 2670.77);
  const ambaBananaHa = getTalukMetric(ambaRows, 'banana', 2.05);
  const ambaOtherHa = getTalukMetric(ambaRows, 'other', 221.20);

  const cherParcels = getTalukCount(cherRows, 858);
  const cherAreaHa = getTalukArea(cherRows, 1180.39);
  const cherPaddyHa = getTalukMetric(cherRows, 'paddy', 546.47);
  const cherBananaHa = getTalukMetric(cherRows, 'banana', 565.69);
  const cherOtherHa = getTalukMetric(cherRows, 'other', 68.23);

  const ambaPaddyPct = ((ambaPaddyHa / ambaAreaHa) * 100).toFixed(1);
  const ambaBananaPct = ((ambaBananaHa / ambaAreaHa) * 100).toFixed(1);
  const ambaOtherPct = ((ambaOtherHa / ambaAreaHa) * 100).toFixed(1);

  const cherPaddyPct = ((cherPaddyHa / cherAreaHa) * 100).toFixed(1);
  const cherBananaPct = ((cherBananaHa / cherAreaHa) * 100).toFixed(1);
  const cherOtherPct = ((cherOtherHa / cherAreaHa) * 100).toFixed(1);

  return (
    <div className="taluk-overview-page-wrapper">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2 className="page-main-title">Taluk Cadastral & Agro-Ecological Overview</h2>
          <p className="page-subtitle">
            Side-by-side comparative analysis of Ambasamudram and Cheranmahadevi Taluks across the Thamirabarani Basin
          </p>
        </div>
        <div className="page-header-badges">
          <span className="live-engine-tag">
            <MapPin size={14} />
            Tirunelveli District • 2 Administrative Taluks
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="taluk-comparison-grid">
        {/* Ambasamudram Taluk Card */}
        <div className="taluk-card">
          <div className="taluk-card-top amb-accent">
            <div className="taluk-name-box">
              <span className="taluk-badge">West Basin</span>
              <h3 className="taluk-title">Ambasamudram Taluk</h3>
              <p className="taluk-geo-desc">Upper canal network & Gadana Nathi confluence</p>
            </div>
            <div className="taluk-stat-pill">
              <strong>{ambaParcels}</strong> parcels
            </div>
          </div>

          <div className="taluk-card-body">
            <div className="taluk-metrics-row">
              <div className="t-metric-item">
                <span className="t-metric-lbl">Total Area</span>
                <span className="t-metric-num">{ambaAreaHa.toFixed(1)} ha</span>
                <span className="t-metric-sub">{(ambaAreaHa * 2.471).toFixed(1)} acres</span>
              </div>
              <div className="t-metric-item">
                <span className="t-metric-lbl">Mean NDVI</span>
                <span className="t-metric-num text-emerald">0.74</span>
                <span className="t-metric-sub">High Canopy Vigor</span>
              </div>
              <div className="t-metric-item">
                <span className="t-metric-lbl">Water Source</span>
                <span className="t-metric-num text-sky">Perennial</span>
                <span className="t-metric-sub">Upper Sluice Feeder</span>
              </div>
            </div>

            <div className="taluk-crop-breakdown-box">
              <div className="box-title">Delineated Crop Distribution</div>
              <div className="crop-bar-stacked">
                <div 
                  className="bar-seg bg-paddy" 
                  style={{ width: `${(ambaPaddyHa / ambaAreaHa) * 100}%` }} 
                  title={`Paddy: ${ambaPaddyHa} ha (${ambaPaddyPct}%)`} 
                />
                <div 
                  className="bar-seg bg-banana" 
                  style={{ width: `${(ambaBananaHa / ambaAreaHa) * 100}%` }} 
                  title={`Banana: ${ambaBananaHa} ha (${ambaBananaPct}%)`} 
                />
                <div 
                  className="bar-seg bg-other" 
                  style={{ width: `${(ambaOtherHa / ambaAreaHa) * 100}%` }} 
                  title={`Other: ${ambaOtherHa} ha (${ambaOtherPct}%)`} 
                />
              </div>

              <div className="crop-legend-row">
                <div className="legend-entry">
                  <span className="legend-dot dot-paddy" />
                  <span>Paddy: <strong>{ambaPaddyHa.toFixed(1)} ha</strong> ({ambaPaddyPct}%)</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-dot dot-banana" />
                  <span>Banana: <strong>{ambaBananaHa.toFixed(1)} ha</strong> ({ambaBananaPct}%)</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-dot dot-other" />
                  <span>Other: <strong>{ambaOtherHa.toFixed(1)} ha</strong> ({ambaOtherPct}%)</span>
                </div>
              </div>
            </div>

            <div className="taluk-insights-list">
              <div className="insight-bullet">
                <Sprout size={14} className="text-emerald" />
                <span>Extensive <strong>high-yield double-crop Samba paddy</strong> cultivation across alluvial basin.</span>
              </div>
              <div className="insight-bullet">
                <Droplets size={14} className="text-sky" />
                <span>Receives early seasonal gravity irrigation from <strong>Papanasam & Manimuthar Dams</strong>.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cheranmahadevi Taluk Card */}
        <div className="taluk-card">
          <div className="taluk-card-top cher-accent">
            <div className="taluk-name-box">
              <span className="taluk-badge">East Delta</span>
              <h3 className="taluk-title">Cheranmahadevi Taluk</h3>
              <p className="taluk-geo-desc">Lower alluvial flood plains & Thamirabarani distributaries</p>
            </div>
            <div className="taluk-stat-pill">
              <strong>{cherParcels}</strong> parcels
            </div>
          </div>

          <div className="taluk-card-body">
            <div className="taluk-metrics-row">
              <div className="t-metric-item">
                <span className="t-metric-lbl">Total Area</span>
                <span className="t-metric-num">{cherAreaHa.toFixed(1)} ha</span>
                <span className="t-metric-sub">{(cherAreaHa * 2.471).toFixed(1)} acres</span>
              </div>
              <div className="t-metric-item">
                <span className="t-metric-lbl">Mean NDVI</span>
                <span className="t-metric-num text-emerald">0.74</span>
                <span className="t-metric-sub">Intensive Rice & Horticulture</span>
              </div>
              <div className="t-metric-item">
                <span className="t-metric-lbl">Water Source</span>
                <span className="t-metric-num text-sky">Monsoon Tail</span>
                <span className="t-metric-sub">Delta Sluice Channels</span>
              </div>
            </div>

            <div className="taluk-crop-breakdown-box">
              <div className="box-title">Delineated Crop Distribution</div>
              <div className="crop-bar-stacked">
                <div 
                  className="bar-seg bg-paddy" 
                  style={{ width: `${(cherPaddyHa / cherAreaHa) * 100}%` }} 
                  title={`Paddy: ${cherPaddyHa} ha (${cherPaddyPct}%)`} 
                />
                <div 
                  className="bar-seg bg-banana" 
                  style={{ width: `${(cherBananaHa / cherAreaHa) * 100}%` }} 
                  title={`Banana: ${cherBananaHa} ha (${cherBananaPct}%)`} 
                />
                <div 
                  className="bar-seg bg-other" 
                  style={{ width: `${(cherOtherHa / cherAreaHa) * 100}%` }} 
                  title={`Other: ${cherOtherHa} ha (${cherOtherPct}%)`} 
                />
              </div>

              <div className="crop-legend-row">
                <div className="legend-entry">
                  <span className="legend-dot dot-paddy" />
                  <span>Paddy: <strong>{cherPaddyHa.toFixed(1)} ha</strong> ({cherPaddyPct}%)</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-dot dot-banana" />
                  <span>Banana: <strong>{cherBananaHa.toFixed(1)} ha</strong> ({cherBananaPct}%)</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-dot dot-other" />
                  <span>Other: <strong>{cherOtherHa.toFixed(1)} ha</strong> ({cherOtherPct}%)</span>
                </div>
              </div>
            </div>

            <div className="taluk-insights-list">
              <div className="insight-bullet">
                <Sprout size={14} className="text-emerald" />
                <span>Significant <strong>commercial Grand Naine banana horticulture</strong> along river banks.</span>
              </div>
              <div className="insight-bullet">
                <Droplets size={14} className="text-sky" />
                <span>Relies heavily on regulated releases and seasonal Northeast Monsoon inflows.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Taluk Acreage Table */}
      <div className="content-card full-width" style={{ marginTop: '1.25rem' }}>
        <div className="card-header">
          <h3 className="card-title">Consolidated Taluk Acreage Summary Table</h3>
          <span className="card-tag">Derived from results/taluk_crop_acreage_summary.csv</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="pro-data-table">
            <thead>
              <tr>
                <th>Taluk Jurisdiction</th>
                <th>Crop Type</th>
                <th>Parcel Count</th>
                <th>Area (Hectares)</th>
                <th>Area (Acres)</th>
                <th>Percentage of Taluk</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(talukAcreage) && talukAcreage.length > 0 ? (
                talukAcreage.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.taluk}</strong></td>
                    <td>
                      <span className={`crop-class-badge badge-${(row.crop || '').toLowerCase()}`}>
                        {row.crop}
                      </span>
                    </td>
                    <td className="font-mono">{row.parcel_count}</td>
                    <td className="font-mono">{Number(row.area_hectares).toFixed(2)} ha</td>
                    <td className="font-mono">{Number(row.area_acres).toFixed(2)} ac</td>
                    <td className="font-mono font-bold">{Number(row.percentage_of_taluk).toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <>
                  <tr>
                    <td><strong>Ambasamudram</strong></td>
                    <td><span className="crop-class-badge badge-paddy">Paddy</span></td>
                    <td className="font-mono">1,304</td>
                    <td className="font-mono">2,670.77 ha</td>
                    <td className="font-mono">6,599.61 ac</td>
                    <td className="font-mono font-bold">92.3%</td>
                  </tr>
                  <tr>
                    <td><strong>Ambasamudram</strong></td>
                    <td><span className="crop-class-badge badge-other">Other</span></td>
                    <td className="font-mono">210</td>
                    <td className="font-mono">221.20 ha</td>
                    <td className="font-mono">546.60 ac</td>
                    <td className="font-mono font-bold">7.6%</td>
                  </tr>
                  <tr>
                    <td><strong>Ambasamudram</strong></td>
                    <td><span className="crop-class-badge badge-banana">Banana</span></td>
                    <td className="font-mono">2</td>
                    <td className="font-mono">2.05 ha</td>
                    <td className="font-mono">5.07 ac</td>
                    <td className="font-mono font-bold">0.1%</td>
                  </tr>
                  <tr>
                    <td><strong>Cheranmahadevi</strong></td>
                    <td><span className="crop-class-badge badge-banana">Banana</span></td>
                    <td className="font-mono">528</td>
                    <td className="font-mono">565.69 ha</td>
                    <td className="font-mono">1,397.85 ac</td>
                    <td className="font-mono font-bold">47.9%</td>
                  </tr>
                  <tr>
                    <td><strong>Cheranmahadevi</strong></td>
                    <td><span className="crop-class-badge badge-paddy">Paddy</span></td>
                    <td className="font-mono">270</td>
                    <td className="font-mono">546.47 ha</td>
                    <td className="font-mono">1,350.35 ac</td>
                    <td className="font-mono font-bold">46.3%</td>
                  </tr>
                  <tr>
                    <td><strong>Cheranmahadevi</strong></td>
                    <td><span className="crop-class-badge badge-other">Other</span></td>
                    <td className="font-mono">60</td>
                    <td className="font-mono">68.23 ha</td>
                    <td className="font-mono">168.60 ac</td>
                    <td className="font-mono font-bold">5.8%</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
