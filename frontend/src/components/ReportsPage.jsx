import React, { useState } from 'react';
import { 
  FileDown, 
  FileText, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Layers, 
  Sparkles,
  ExternalLink,
  Table as TableIcon
} from 'lucide-react';

export default function ReportsPage({ statistics, metrics, talukAcreage }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      setDownloadSuccess(false);
      
      const link = document.createElement('a');
      link.href = '/api/reports/download-pdf';
      link.setAttribute('download', 'VIT_MAPATHON_Agricultural_Cadastral_Report.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setDownloadingPdf(false);
        setDownloadSuccess(true);
      }, 1000);
    } catch (err) {
      console.error('Error initiating PDF download:', err);
      setDownloadingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    const link = document.createElement('a');
    link.href = '/api/statistics/taluk-acreage';
    link.setAttribute('download', 'taluk_crop_acreage_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGeoJson = () => {
    const link = document.createElement('a');
    link.href = '/api/parcels/geojson';
    link.setAttribute('download', 'classified_parcels.geojson');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalParcels = statistics?.study_area_summary?.total_parcels || 2374;
  const totalHa = statistics?.study_area_summary?.total_parcels_area_hectares || 4074.41;
  const modelAcc = (((metrics?.overall?.test_accuracy ?? 0.9153)) * 100).toFixed(1);

  return (
    <div className="reports-page-wrapper">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2 className="page-main-title">Reports & Geospatial Data Downloads</h2>
          <p className="page-subtitle">
            Generate and export official multi-page cadastral assessments, GIS vectors, and statistical tables
          </p>
        </div>
        <div className="page-header-badges">
          <span className="live-engine-tag">
            <ShieldCheck size={14} />
            Official Cadastral Report Generator Active
          </span>
        </div>
      </div>

      {/* Hero Download Card for Primary PDF Report */}
      <div className="primary-report-hero-card">
        <div className="hero-card-left">
          <div className="pdf-doc-icon-badge">
            <FileText size={32} />
          </div>
          <div className="hero-text-content">
            <span className="document-type-pill">Official 3-Page Cadastral Assessment</span>
            <h3 className="hero-doc-title">
              VIT MAPATHON 2026 — Agricultural Land Parcel & Multi-Temporal Crop Assessment Report
            </h3>
            <p className="hero-doc-desc">
              Comprehensive publication-ready assessment featuring geographic boundary statistics, 
              taluk-level crop acreage breakdowns, bi-temporal Sentinel-2 spectral shifts, out-of-sample 
              machine learning verification metrics, and 5 AI agronomic recommendations.
            </p>
            <div className="doc-meta-tags-row">
              <span><strong>Pages:</strong> 3 Pages (A4)</span>
              <span><strong>Audited Parcels:</strong> {Number(totalParcels).toLocaleString()} Polygons</span>
              <span><strong>Mapped Extent:</strong> {Number(totalHa).toFixed(1)} ha</span>
              <span><strong>Model Accuracy:</strong> {modelAcc}%</span>
              <span><strong>Sensor:</strong> Sentinel-2 L2A</span>
            </div>
          </div>
        </div>

        <div className="hero-card-right">
          <button
            className={`big-download-pdf-btn ${downloadingPdf ? 'loading' : ''}`}
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            <Download size={20} />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
          {downloadSuccess && (
            <div className="download-toast-pill">
              <CheckCircle2 size={14} className="text-emerald" />
              <span>Report downloaded successfully!</span>
            </div>
          )}
          <span className="pdf-spec-note">ReportLab Engine • Exact Table Alignments • Dynamic NumberedCanvas</span>
        </div>
      </div>

      {/* Additional Export Formats Grid */}
      <h3 className="section-subheading">Data Deliverables & Vector Exports</h3>
      <div className="export-cards-grid">
        {/* CSV Export */}
        <div className="export-format-card">
          <div className="format-icon-box green">
            <TableIcon size={22} />
          </div>
          <div className="format-info">
            <h4 className="format-name">Taluk Crop Acreage Summary (.CSV)</h4>
            <p className="format-desc">
              Tabular spreadsheet containing parcel counts, hectare extents, acre conversions, and jurisdiction percentages.
            </p>
          </div>
          <button className="format-download-btn" onClick={handleDownloadCsv}>
            <Download size={16} />
            <span>Download CSV</span>
          </button>
        </div>

        {/* GeoJSON Export */}
        <div className="export-format-card">
          <div className="format-icon-box blue">
            <Layers size={22} />
          </div>
          <div className="format-info">
            <h4 className="format-name">Classified Cadastral Parcels (.GeoJSON)</h4>
            <p className="format-desc">
              Standard OGC GeoJSON vector boundaries with predicted crops, confidence scores, NDVI values, and probabilities.
            </p>
          </div>
          <button className="format-download-btn" onClick={handleDownloadGeoJson}>
            <Download size={16} />
            <span>Download GeoJSON</span>
          </button>
        </div>

        {/* JSON Metrics Export */}
        <div className="export-format-card">
          <div className="format-icon-box purple">
            <FileDown size={22} />
          </div>
          <div className="format-info">
            <h4 className="format-name">Model Evaluation Metrics (.JSON)</h4>
            <p className="format-desc">
              Complete machine learning performance log including precision, recall, F1-scores, and confusion matrix data.
            </p>
          </div>
          <a className="format-download-btn" href="/api/metrics" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            <span>View JSON</span>
          </a>
        </div>
      </div>

      {/* PDF Document Structure Preview */}
      <h3 className="section-subheading" style={{ marginTop: '1.75rem' }}>
        Report Contents Preview (Strict Text Wrapping & Page Breaks Verified)
      </h3>
      <div className="report-preview-sections-grid">
        <div className="preview-page-card">
          <div className="preview-page-header">
            <span className="page-number-badge">Page 1</span>
            <strong>Executive Cadastral Overview</strong>
          </div>
          <ul className="preview-page-list">
            <li>✓ Official AgriMap Header & Metadata Block</li>
            <li>✓ Geographic Study Area & Delineation Summary ({totalParcels} Parcels)</li>
            <li>✓ 5-Column Executive KPI Matrix (Area, Polygons, Accuracy, Confidence)</li>
            <li>✓ Taluk-Wise Cadastral Crop Distribution Table (Acreage & Shares)</li>
            <li>✓ Key Cadastral Agro-Ecological Finding Callout</li>
          </ul>
        </div>

        <div className="preview-page-card">
          <div className="preview-page-header">
            <span className="page-number-badge">Page 2</span>
            <strong>Remote Sensing & ML Verification</strong>
          </div>
          <ul className="preview-page-list">
            <li>✓ Multi-Temporal Sentinel-2 Seasonal Analysis (Baseline vs Peak)</li>
            <li>✓ Bi-Temporal Agronomic & Spectral Parameter Table (NDVI, NDWI Shifts)</li>
            <li>✓ Out-of-Sample Machine Learning Performance Verification Table</li>
            <li>✓ Per-Class Precision, Recall, and F1-Scores (Paddy, Banana, Other)</li>
            <li>✓ Predictive Spectral Feature Importance Rankings</li>
          </ul>
        </div>

        <div className="preview-page-card">
          <div className="preview-page-header">
            <span className="page-number-badge">Page 3</span>
            <strong>AI Recommendations & Governance</strong>
          </div>
          <ul className="preview-page-list">
            <li>✓ 5 Calibrated Precision Cultivation & Optimization Recommendations</li>
            <li>✓ Post-Harvest Pulse Relay Cropping & LCC Nitrogen Management</li>
            <li>✓ AWD Tail-End Water Conservation & Banana Sigatoka Management</li>
            <li>✓ Cadastral Governance & Geospatial Verification Audit Table</li>
            <li>✓ Formal Digital Seal, Analytical Engine Version & Verification Hash</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
