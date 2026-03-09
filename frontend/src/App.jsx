import React, { useState, useRef, useEffect } from 'react';
import './index.css';

/* ====== SVG ICONS ====== */
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: '#4DA3FF' }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const UploadArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const CheckIcon = ({ color = '#4DA3FF' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: '#00C2A8' }}>
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
  </svg>
);
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: '#9AA4B2' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'white' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [page, setPage] = useState('home');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [processingStep, setProcessingStep] = useState(0);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [imageView, setImageView] = useState('heatmap');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const fileRef = useRef(null);
  const reportRef = useRef(null);
  const diagRef = useRef(null);

  const showToast = (msg, dur = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), dur);
  };

  const handleFeatureClick = (type) => {
    if (!result) {
      fileRef.current?.click();
      showToast(type === 'analysis' ? '⬆️ Upload a scan to start Smart Analysis'
        : type === 'diagnosis' ? '⬆️ Upload a scan for AI Diagnosis'
          : '⬆️ Upload a scan to generate a report');
      return;
    }
    if (type === 'analysis') {
      showToast(`👁️ Eye Type Detected: ${result.eye_type === 'RETINA' ? 'Retinal Fundus Scan' : 'Anterior/External Eye Photo'}`);
    } else if (type === 'diagnosis') {
      diagRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`🧠 Diagnosis: ${result.diagnosis} (${result.confidence}% confidence)`);
    } else if (type === 'report') {
      if (report) {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        generateReport();
      }
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setPage('home');
      runAnalysis(f);
    }
  };

  const runAnalysis = async (selectedFile) => {
    setProcessing(true);
    setResult(null);
    setReport('');
    setProcessingStep(0);

    const steps = [
      { msg: 'Verifying image ocular integrity...', icon: '🔍' },
      { msg: 'Analyzing retinal vascular structures...', icon: '🩸' },
      { msg: 'Scanning blood vessel patterns...', icon: '🫀' },
      { msg: 'Detecting microaneurysms and lesions...', icon: '🔬' },
      { msg: 'Evaluating vascular patterns...', icon: '🧬' },
      { msg: 'Consulting Specialist Brain (EfficientNet)...', icon: '🧠' },
      { msg: 'Generating clinical findings...', icon: '📋' }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) { setProcessingMsg(steps[i].msg); setProcessingStep(i + 1); i++; }
    }, 1100);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${BACKEND}/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      clearInterval(interval);
      setResult(data);
      setReport('');
      setImageView('heatmap');
    } catch (err) {
      clearInterval(interval);
      alert('Backend not responding. Ensure FastAPI is running on port 8000.');
    }
    setProcessing(false);
  };

  const generateReport = async () => {
    if (!file || !result) return;
    setReportLoading(true);
    setReport('');
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${BACKEND}/report?diagnosis=${encodeURIComponent(result.diagnosis)}&eye_type=${encodeURIComponent(result.eye_type)}`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      setReport(data.report || 'No report generated.');
    } catch (err) {
      setReport('Failed to connect to Dr. AI. Ensure Ollama is running.');
    }
    setReportLoading(false);
  };

  const downloadPDF = () => {
    if (!result) return;
    const content = `
AI EYE DIAGNOSTIC SYSTEM — CLINICAL REPORT
============================================
Date: ${new Date().toLocaleString()}

DIAGNOSIS: ${result.diagnosis}
Confidence: ${result.confidence}%
Eye Type: ${result.eye_type}
Severity: ${getSeverity().stage}
Risk Score: ${getRiskPercent()}%

CLINICAL REPORT:
${report || 'Report not yet generated.'}

---
Disclaimer: This is an AI-assisted screening tool for research purposes only.
Not a substitute for professional medical diagnosis.
Generated by OcuSight AI — Virat Dhama
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eye_ai_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📄 Report downloaded successfully');
  };

  const getSeverity = () => {
    if (!result) return { stage: '', color: '' };
    const d = result.diagnosis.toLowerCase();
    if (d.includes('proliferative')) return { stage: 'Proliferative Stage', color: '#FF4D4F' };
    if (d.includes('severe')) return { stage: 'Severe Stage', color: '#FF6B35' };
    if (d.includes('moderate')) return { stage: 'Moderate Stage', color: '#FFD700' };
    if (d.includes('mild')) return { stage: 'Mild Stage', color: '#00C2A8' };
    if (d.includes('healthy') || d.includes('no dr')) return { stage: 'Healthy', color: '#00C2A8' };
    return { stage: 'Detected', color: '#4DA3FF' };
  };

  const getRiskPercent = () => {
    if (!result || !result.probabilities) return 0;
    const weights = [0, 1, 2, 3, 4];
    const probs = result.probabilities.slice(0, 5);
    const severity = probs.reduce((sum, p, i) => sum + p * (weights[i] || 0), 0);
    return Math.round((severity / 4) * 100);
  };

  const getImageSrc = () => {
    if (!result) return '';
    if (imageView === 'original') return previewUrl;
    return result.heatmap;
  };

  /* ====================================================== */
  /*                      R E N D E R                       */
  /* ====================================================== */
  return (
    <>
      {/* Starfield Background */}
      <div className="starfield">
        <div className="stars" />
        <div className="stars stars-2" />
      </div>

      {/* Processing Overlay — Vessel Animation */}
      {processing && (
        <div className="processing-overlay">
          <div className="vessel-animation">
            <div className="vessel-ring" />
            <div className="vessel-ring vessel-ring-2" />
            <div className="vessel-ring vessel-ring-3" />
            <div className="vessel-core">
              <img src="/ocusight-logo.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            </div>
          </div>
          <div className="processing-title">AI Scanning Retina</div>
          <div className="processing-step">{processingMsg || 'Initializing scan...'}</div>
          <div className="processing-progress">
            <div className="processing-progress-bar" style={{ width: `${(processingStep / 7) * 100}%` }} />
          </div>
          <div className="processing-step-count">Step {processingStep}/7</div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomOpen && result && (
        <div className="zoom-modal" onClick={() => setZoomOpen(false)}>
          <div className="zoom-close" onClick={() => setZoomOpen(false)}><CloseIcon /></div>
          <img src={getImageSrc()} alt="Zoomed" className="zoom-image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
          <img src="/ocusight-logo.png" alt="OcuSight AI" className="nav-logo-img" />
          OcuSight AI
        </div>
        <div className="nav-links">
          <span className={page === 'home' ? 'nav-active' : ''} onClick={() => setPage('home')}>Home</span>
          <span className={page === 'patients' ? 'nav-active' : ''} onClick={() => setPage('patients')}>Patients</span>
          <span className={page === 'about' ? 'nav-active' : ''} onClick={() => setPage('about')}>About</span>
        </div>
        <div className="nav-avatar-wrap">
          <div className="nav-avatar" onClick={() => setAvatarOpen(!avatarOpen)}><UserIcon /></div>
          {avatarOpen && (
            <div className="avatar-dropdown">
              <div className="avatar-dropdown-header">
                <img src="/developer.jpg" className="avatar-dropdown-photo" alt="" />
                <div>
                  <div className="avatar-dropdown-name">Virat Dhama</div>
                  <div className="avatar-dropdown-role">Researcher</div>
                </div>
              </div>
              <div className="avatar-dropdown-divider" />
              <div className="avatar-dropdown-item" onClick={() => { setPage('about'); setAvatarOpen(false); }}>👤 View Profile</div>
              <div className="avatar-dropdown-item" onClick={() => { setPage('patients'); setAvatarOpen(false); }}>📋 Scan History</div>
              <div className="avatar-dropdown-item" onClick={() => { window.location.reload(); }}>🔄 Refresh App</div>
            </div>
          )}
        </div>
      </nav>

      {/* ================== HOME PAGE ================== */}
      {page === 'home' && (
        <div className="main-content">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-text">
              <img src="/ocusight-logo.png" alt="OcuSight AI" className="hero-logo" />
              <p className="hero-subtitle">Advanced AI Eye Disease Detection</p>
            </div>
            <div className="upload-panel" onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" className="upload-file-input" onChange={handleFileChange} />
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="upload-preview" />
                  <div className="upload-status">✓ Image loaded — {result ? 'Analysis complete' : 'Processing...'}</div>
                </>
              ) : (
                <>
                  <div className="upload-icon-circle"><UploadArrow /></div>
                  <div className="upload-title">Upload an eye scan</div>
                  <div className="upload-sub">Drag & drop an image, or <a>select file</a></div>
                  <button className="upload-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>Upload Photo</button>
                </>
              )}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="feature-row">
            <div className="feature-card" onClick={() => handleFeatureClick('analysis')}>
              <div className="feature-icon"><CheckIcon color={result ? '#00C2A8' : '#4DA3FF'} /></div>
              <div>
                <div className="feature-title">Smart Analysis</div>
                <div className="feature-desc">{result ? `Detected: ${result.eye_type === 'RETINA' ? 'Retinal Fundus' : 'Anterior Eye'}` : 'Auto eye type detection'}</div>
              </div>
            </div>
            <div className="feature-card" onClick={() => handleFeatureClick('diagnosis')}>
              <div className="feature-icon"><BrainIcon /></div>
              <div>
                <div className="feature-title">AI Diagnosis</div>
                <div className="feature-desc">{result ? result.diagnosis : 'Instant disease assessment'}</div>
              </div>
            </div>
            <div className="feature-card" onClick={() => handleFeatureClick('report')}>
              <div className="feature-icon"><FileIcon /></div>
              <div>
                <div className="feature-title">Detailed Report</div>
                <div className="feature-desc">{report ? '✓ Report ready — click to view' : 'Human-readable results'}</div>
              </div>
            </div>
          </div>

          {/* Diagnosis Dashboard */}
          {result && (
            <>
              <div className="diagnosis-section" ref={diagRef}>
                {/* Left: Result Card */}
                <div className="diag-card diag-card-glow">
                  <div className="diag-label">Diagnosis Result</div>
                  <div className="diag-name">{result.diagnosis.replace(/No DR.*/, 'No Diabetic Retinopathy').replace(/DR$/, 'Diabetic Retinopathy')}</div>
                  <div className="diag-stage" style={{ color: getSeverity().color }}>{getSeverity().stage}</div>
                  <div className="risk-label">Risk Level</div>
                  <div className="risk-bar-track">
                    <div className="risk-bar-fill" style={{ width: `${getRiskPercent()}%` }} />
                  </div>
                  <div className="risk-bar-labels">
                    <span>Low</span><span>Moderate</span><span>High</span>
                  </div>
                  <div className="report-btn-wrap">
                    <button className="report-btn" disabled={reportLoading} onClick={generateReport}>
                      {reportLoading ? (<><span className="btn-spinner" /> Generating Report...</>) : (<>Generate Full Report <ArrowRight /></>)}
                    </button>
                  </div>
                  <div className="report-btn-wrap" style={{ marginTop: 8 }}>
                    <button className="download-btn" onClick={downloadPDF}>
                      <DownloadIcon /> Download Report
                    </button>
                  </div>
                </div>

                {/* Center: Confidence + Model Info */}
                <div className="diag-card">
                  <div className="confidence-value">+{result.confidence}% Confidence</div>
                  <div className="confidence-text">
                    AI detected retinal features and biomarkers consistent with the identified condition.
                    The model analyzed vascular patterns, hemorrhages, and exudate distributions across the fundus image.
                  </div>
                  <div className="recommendation-label">Recommendation</div>
                  <div className="recommendation-text">
                    {result.confidence > 70
                      ? 'Schedule an appointment with an ophthalmologist within 1 month.'
                      : 'Continue routine screening. No immediate action required.'}
                  </div>

                  {/* Model Info */}
                  <div className="model-info">
                    <div className="model-info-title">Model Information</div>
                    <div className="model-info-grid">
                      <div className="model-info-item"><span className="model-info-label">Model</span><span className="model-info-value">EfficientNet-B0</span></div>
                      <div className="model-info-item"><span className="model-info-label">Dataset</span><span className="model-info-value">236k images</span></div>
                      <div className="model-info-item"><span className="model-info-label">QWK Score</span><span className="model-info-value">0.8490</span></div>
                      <div className="model-info-item"><span className="model-info-label">Framework</span><span className="model-info-value">PyTorch</span></div>
                    </div>
                  </div>
                </div>

                {/* Right: Retina Image with Toggle */}
                <div className="diag-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="image-viewer">
                    <div className="image-toggle-bar">
                      <button className={`image-toggle-btn ${imageView === 'original' ? 'active' : ''}`} onClick={() => setImageView('original')}>Original</button>
                      <button className={`image-toggle-btn ${imageView === 'heatmap' ? 'active' : ''}`} onClick={() => setImageView('heatmap')}>Heatmap</button>
                      <button className={`image-toggle-btn ${imageView === 'overlay' ? 'active' : ''}`} onClick={() => setImageView('overlay')}>Overlay</button>
                    </div>
                    <div className="retina-panel">
                      <img src={getImageSrc()} alt="Retina View" />
                      <div className="retina-zoom" onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }}>
                        <SearchIcon />
                      </div>
                      <div className="image-view-badge">{imageView.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Report */}
              {(report || reportLoading) && (
                <div className="report-panel" ref={reportRef}>
                  <h3>🤖 Clinical Intelligence Report</h3>
                  {reportLoading ? (
                    <div className="report-loading">
                      <div className="report-loading-spinner" />
                      <p className="report-loading-text">Dr. AI is analyzing the scan and writing a clinical report...</p>
                      <div className="report-loading-steps">
                        <span>Identifying retinal biomarkers</span>
                        <span>Cross-referencing clinical database</span>
                        <span>Drafting medical summary</span>
                      </div>
                    </div>
                  ) : (
                    <p>{report}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================== PATIENTS PAGE ================== */}
      {page === 'patients' && (
        <div className="main-content">
          <div className="page-header">
            <h2 className="page-title">Patient Scan History</h2>
            <p className="page-sub">Historical diagnostic data and scan records.</p>
          </div>
          <div className="patients-table-wrap">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Risk</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result ? (
                  <tr>
                    <td><div className="patient-name"><div className="patient-avatar">P1</div>Current Scan</div></td>
                    <td>{new Date().toLocaleDateString()}</td>
                    <td><span className="badge badge-blue">{result.diagnosis}</span></td>
                    <td><span className="risk-dot" style={{ background: getSeverity().color }} />{getSeverity().stage}</td>
                    <td>{result.confidence}%</td>
                  </tr>
                ) : (
                  <tr><td colSpan="5" className="empty-table">No scans yet. Upload an eye scan from the Home page to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================== ABOUT PAGE ================== */}
      {page === 'about' && (
        <div className="main-content about-content">
          <div className="about-hero">
            <div className="about-badge">Research Project</div>
            <h2 className="about-title">About OcuSight AI</h2>
            <p className="about-author">A research project by <strong>Virat Dhama</strong></p>
          </div>

          <div className="about-body">
            <p><strong>OcuSight AI</strong> is an intelligent medical screening platform designed to assist in the early detection of eye diseases using advanced artificial intelligence. By combining deep learning, medical image analysis, and explainable AI techniques, the system analyzes retinal fundus images and provides fast, interpretable diagnostic insights.</p>

            <p>This platform uses a deep neural network based on the <strong>EfficientNet architecture</strong>, trained on a large dataset of retinal images to detect different stages of <strong>Diabetic Retinopathy</strong> and other potential eye conditions. The system examines retinal structures, vascular patterns, and lesion features to estimate disease severity and provide a confidence score.</p>

            <p>To ensure transparency and interpretability, the system integrates <strong>GradCAM visualization</strong>, allowing users and medical professionals to see which regions of the retina influenced the model's decision. This helps improve trust and understanding of the AI's predictions.</p>

            <p>In addition to automated diagnosis, the platform also generates a <strong>human-readable clinical explanation</strong> describing the findings and potential recommendations for follow-up care.</p>

            <h3>Key Capabilities</h3>
            <div className="capabilities-grid">
              <div className="cap-item"><span className="cap-icon">🔬</span>Automated retinal image analysis using deep learning</div>
              <div className="cap-item"><span className="cap-icon">👁️</span>Detection of multiple stages of Diabetic Retinopathy</div>
              <div className="cap-item"><span className="cap-icon">🔥</span>Explainable AI visualization with heatmaps</div>
              <div className="cap-item"><span className="cap-icon">📊</span>Confidence scoring and risk assessment</div>
              <div className="cap-item"><span className="cap-icon">🤖</span>AI-generated diagnostic explanation</div>
              <div className="cap-item"><span className="cap-icon">⚡</span>Designed for fast screening and research support</div>
            </div>

            <h3>Intended Use</h3>
            <div className="disclaimer-box">
              <p>This system is designed as a <strong>screening and decision-support tool</strong> for educational, research, and prototype healthcare applications. It is intended to assist users in understanding potential retinal conditions but <strong>should not replace professional medical diagnosis</strong>.</p>
              <p>For any medical concerns or treatment decisions, consultation with a qualified <strong>ophthalmologist or healthcare professional</strong> is recommended.</p>
            </div>

            <h3>Technology Behind the System</h3>
            <div className="tech-grid">
              <div className="tech-item"><span className="tech-label">Deep Learning Model</span><span className="tech-value">EfficientNet-B0</span></div>
              <div className="tech-item"><span className="tech-label">Framework</span><span className="tech-value">PyTorch</span></div>
              <div className="tech-item"><span className="tech-label">Explainability</span><span className="tech-value">GradCAM</span></div>
              <div className="tech-item"><span className="tech-label">AI Reports</span><span className="tech-value">Vision-Language Model (LLaVA)</span></div>
              <div className="tech-item"><span className="tech-label">Frontend</span><span className="tech-value">React</span></div>
              <div className="tech-item"><span className="tech-label">Backend</span><span className="tech-value">FastAPI + Python</span></div>
            </div>

            <h3>About the Developer</h3>
            <div className="dev-card">
              <img src="/developer.jpg" alt="Virat Dhama" className="dev-photo" />
              <div className="dev-info">
                <div className="dev-name">Virat Dhama</div>
                <div className="dev-role">Undergraduate Researcher & AI Developer</div>
                <p className="dev-bio">
                  Virat Dhama is the creator of <strong>OcuSight AI</strong>, an AI-powered eye diagnostic platform designed to assist in early retinal disease detection using deep learning and medical image analysis.
                </p>
                <p className="dev-bio">
                  His work focuses on building practical AI systems that combine <strong>machine learning, computer vision, and modern web technologies</strong> to solve real-world problems. OcuSight AI integrates EfficientNet-based retinal analysis, GradCAM explainability, and AI-generated diagnostic reports to create an interactive medical screening platform.
                </p>
                <p className="dev-bio">
                  Virat has also published research on <strong>Prompt Engineering in the Era of Artificial Intelligence</strong>, exploring structured approaches to improve human–AI interaction.
                </p>
                <p className="dev-bio">
                  His interests include <strong>Artificial Intelligence, Computer Vision, Cybersecurity, and AI-powered healthcare systems</strong>.
                </p>
                <div className="dev-socials">
                  <a href="https://www.linkedin.com/in/viratdhama/" target="_blank" rel="noopener noreferrer" className="dev-social-link" title="LinkedIn">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a href="https://github.com/ViratDhama01" target="_blank" rel="noopener noreferrer" className="dev-social-link" title="GitHub">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-disclaimer">
          ⚠️ For Research and Educational Purposes Only — Not a Substitute for Professional Medical Diagnosis
        </div>
        <div className="footer-credit">
          Built by Virat Dhama · Powered by EfficientNet + LLaVA · © 2026
        </div>
      </footer>

      {/* Toast */}
      {toast && <div className="toast-notification">{toast}</div>}
    </>
  );
}

export default App;
