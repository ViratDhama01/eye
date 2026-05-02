import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, CheckCircle2, Upload } from 'lucide-react';
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

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

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

  // Patient DB State
  const [dbPatients, setDbPatients] = useState([]);
  const [dbScans, setDbScans] = useState([]);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientNameInput, setPatientNameInput] = useState('');
  const [patientAgeInput, setPatientAgeInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    if (page === 'patients') {
      fetchPatients();
    }
  }, [page]);

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${BACKEND}/patients/`);
      const data = await res.json();
      setDbPatients(data);
      if (data.length > 0) {
        fetchScans(data[0].id);
      }
    } catch (err) { console.error("Failed to load patients", err); }
  };

  const fetchScans = async (patientId) => {
    try {
      const res = await fetch(`${BACKEND}/patients/${patientId}`);
      const data = await res.json();
      setDbScans(data.scans || []);
    } catch (err) { console.error("Failed to load scans", err); }
  };

  const handleSaveToPatient = async () => {
    if (!result || !patientNameInput || !patientAgeInput) {
      showToast('⚠️ Please enter patient name and age.');
      return;
    }
    setSavingPatient(true);
    try {
      // Create Patient
      const pRes = await fetch(`${BACKEND}/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: patientNameInput, age: parseInt(patientAgeInput) })
      });
      const pData = await pRes.json();

      // Save Scan
      const sRes = await fetch(`${BACKEND}/patients/${pData.id}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eye_type: result.eye_type,
          diagnosis: result.diagnosis,
          confidence: result.confidence,
          risk_score: getRiskPercent()
        })
      });

      showToast(`✅ Saved to Patient: ${pData.name}`);
      setShowSaveModal(false);
      setPatientNameInput('');
      setPatientAgeInput('');
    } catch (err) {
      showToast('❌ Failed to save patient data.');
    }
    setSavingPatient(false);
  };

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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/predict`, { method: 'POST', body: formData });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      clearInterval(interval); // Clear interval on success
      setResult(data);
      setReport('');
      setImageView('heatmap');
    } catch (err) {
      clearInterval(interval);
      console.error("Analysis Error:", err);
      alert(`Analysis failed: ${err.message || 'Please check backend connection and ensure FastAPI is running on port 8000.'}`);
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

      let finalReport = data.report || 'No report generated.';

      // Secondary robustness check for JSON trapped in string
      if (typeof finalReport === 'string' && finalReport.includes('{') && finalReport.includes('}')) {
        try {
          const startIdx = finalReport.indexOf('{');
          const endIdx = finalReport.lastIndexOf('}');
          const extracted = JSON.parse(finalReport.substring(startIdx, endIdx + 1));
          finalReport = extracted;
        } catch (e) {
          console.warn("Failed to parse embedded JSON in report string", e);
        }
      }

      setReport(finalReport);
    } catch (err) {
      console.error("Report Generation Error:", err);
      setReport('Failed to connect to Dr. AI. Ensure Ollama is running.');
    }
    setReportLoading(false);
  };

  const downloadPDF = () => {
    if (!result) return;
    showToast('⌛ Preparing Clinical Report PDF...');

    // Get current probabilities for the chart
    const labels = result.eye_type === 'RETINA'
      ? ['No DR', 'Mild', 'Moderate', 'Severe', 'Prolif']
      : ['CSC', 'DR', 'Edema', 'Glaucoma', 'Healthy', 'Scar', 'Myopia', 'Pterygium', 'Detached', 'RP'];

    const probs = result.probabilities || [];

    // Create elements for probability bars
    const chartHtml = probs.map((p, i) => `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
          <span>${labels[i] || `Class ${i}`}</span>
          <span>${(p * 100).toFixed(1)}%</span>
        </div>
        <div style="background: #E5E7EB; height: 6px; border-radius: 3px; overflow: hidden;">
          <div style="background: ${i === result.probabilities.indexOf(Math.max(...result.probabilities)) ? '#4DA3FF' : '#9CA3AF'}; width: ${p * 100}%; height: 100%;"></div>
        </div>
      </div>
    `).join('');

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #111827; background: white; min-height: 1050px; position: relative; box-sizing: border-box;">
        <!-- Letterhead Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; background: #4DA3FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">👁️</div>
            <div style="font-size: 24px; font-weight: 800; color: #1A2230;">OcuSight AI</div>
          </div>
          <div style="text-align: right; color: #6B7280; font-size: 11px;">
            Clinical Diagnostics Division<br/>
            Ref ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}<br/>
            ${new Date().toLocaleDateString()}
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(90deg, #4DA3FF, #00C2A8, #FFD700, #FF4D4F); margin-bottom: 30px;"></div>
        
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1A2230; margin: 0; font-size: 28px; letter-spacing: -0.5px;">CLINICAL ASSESSMENT REPORT</h1>
          <p style="color: #6B7280; font-size: 14px; margin-top: 8px;">Automated Deep Learning Analysis Findings</p>
        </div>
        
        <div style="display: flex; gap: 30px; margin-bottom: 30px; page-break-inside: avoid;">
          <div style="flex: 1.2; background: #F8FAFC; padding: 25px; border-radius: 16px; border: 1px solid #E2E8F0;">
            <h3 style="color: #4DA3FF; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #4DA3FF; padding-bottom: 10px; font-size: 18px;">Automated Findings</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 10px 0; font-weight: 600;">Primary Diagnosis:</td><td style="padding: 10px 0; text-align: right; color: #1A2230;">${result.diagnosis}</td></tr>
              <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 10px 0; font-weight: 600;">Detection Confidence:</td><td style="padding: 10px 0; text-align: right; color: #1A2230;">${result.confidence}%</td></tr>
              <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 10px 0; font-weight: 600;">Imaging Category:</td><td style="padding: 10px 0; text-align: right; color: #1A2230;">${result.eye_type}</td></tr>
              <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 10px 0; font-weight: 600;">Risk Severity Index:</td><td style="padding: 10px 0; text-align: right; font-weight: 700; color: ${getSeverity().color};">${getSeverity().stage} (${getRiskPercent()}%)</td></tr>
            </table>
            
            <div style="margin-top: 25px;">
              <h4 style="font-size: 13px; color: #64748B; text-transform: uppercase; margin-bottom: 15px;">Probability Distribution (AI Insights)</h4>
              ${chartHtml}
            </div>
          </div>
          
          <div style="flex: 0.8; text-align: center;">
            <div style="background: #F1F5F9; border-radius: 16px; padding: 10px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
              <img src="${getImageSrc()}" style="width: 100%; border-radius: 10px; display: block;" />
            </div>
            <p style="font-size: 11px; color: #94A3B8; font-style: italic;">Captured Reference: ${imageView.toUpperCase()} VIEW</p>
          </div>
        </div>

        <div>
          <h3 style="color: #1A2230; margin-bottom: 20px; border-bottom: 2px solid #1A2230; padding-bottom: 10px; font-size: 18px;">Expert AI Commentary</h3>
          <div style="font-size: 14px; line-height: 1.7; color: #334155;">
            ${!report ? '<div style="background: #FFFBEB; border: 1px solid #FEF3C7; padding: 15px; border-radius: 8px; color: #92400E;">Detailed clinical commentary unavailable for this session. Recommended to regenerate.</div>' :
        typeof report === 'string' ? `
              <div style="background: #F8FAFC; padding: 20px; border-radius: 12px; border-left: 4px solid #1A2230;">
                ${report.split('\n').filter(line => line.trim()).map(line => `<p style="margin-bottom: 10px;">${line}</p>`).join('')}
              </div>` :
          `
              <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="color: #4DA3FF; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 8px;">Section I: Clinical Summary</div>
                <div style="padding: 15px; border-left: 4px solid #4DA3FF; background: #F0F9FF; border-radius: 0 8px 8px 0; font-weight: 500;">${report.summary}</div>
              </div>

              <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="color: #00C2A8; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 12px;">Section II: Identified Biomarkers & Features</div>
                  <div style="display: block;">
                  ${(report.features || []).map(f => {
            const p = f.split(': ');
            return `<div style="padding: 12px 15px; margin-bottom: 8px; background: #F0FDFA; border-radius: 8px; border: 1px solid #CCFBF1; display: flex; gap: 10px;">
                        <span style="color: #00C2A8;">•</span>
                        <div>${p.length > 1 ? `<strong>${p[0]}</strong>: ${p.slice(1).join(': ')}` : f}</div>
                      </div>`;
          }).join('')}
                </div>
              </div>

              <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="color: #F59E0B; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 8px;">Section III: Quantitative Risk Assessment</div>
                <div style="padding: 15px; border-left: 4px solid #F59E0B; background: #FFFBEB; border-radius: 0 8px 8px 0;">${report.risk_assessment}</div>
              </div>

              <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="color: #3B82F6; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 12px;">Section IV: Required Clinical Actions</div>
                <div style="display: block;">
                  ${(report.recommended_action || []).map(a => {
            const p = a.split(': ');
            return `<div style="padding: 12px 15px; margin-bottom: 8px; background: #EFF6FF; border-radius: 8px; border: 1px solid #DBEAFE; display: flex; gap: 10px;">
                        <span style="color: #3B82F6;">•</span>
                        <div>${p.length > 1 ? `<strong>${p[0]}</strong>: ${p.slice(1).join(': ')}` : a}</div>
                      </div>`;
          }).join('')}
                </div>
              </div>
              `
      }
          </div>
        </div>
        
        <!-- Letterhead Footer -->
        <div style="position: absolute; bottom: 40px; left: 40px; width: calc(100% - 80px);">
          <div style="height: 1px; background: #E2E8F0; margin-bottom: 15px;"></div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; font-weight: 500;">
             <span>⚠️ RESEARCH PROTOTYPE — NOT FOR CLINICAL USE</span>
             <span>OcuSight AI Intelligence Platform · v2.4</span>
             <span>Ref: ${new Date().getTime()}</span>
          </div>
        </div>
      </div>
    `;

    const safePName = patientNameInput ? patientNameInput.replace(/[^a-z0-9]/gi, '_') : 'Scan';
    const filename = `OcuSight_${safePName}_Clinical_Report_${Date.now()}.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      showToast('✅ Report downloaded successfully');
    }).catch(err => {
      console.error("PDF Export Error:", err);
      showToast('❌ Export failed. Please try again.');
    });
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
    if (imageView === 'heatmap') return result.heatmap;
    if (imageView === 'overlay') return result.overlay;
    return previewUrl;
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
                  <div className="report-btn-wrap" style={{ marginTop: 8, display: 'flex', gap: '10px' }}>
                    <button className="download-btn" onClick={downloadPDF} style={{ flex: 1 }}>
                      <DownloadIcon /> Download Report
                    </button>
                    <button className="download-btn" onClick={() => setShowSaveModal(true)} style={{ flex: 1, borderColor: '#00C2A8', color: '#00C2A8' }}>
                      💾 Save to DB
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
                    <div className="structured-report">
                      {typeof report === 'string' ? (
                        <div style={{ background: '#111827', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', color: '#E6EDF3' }}>
                          <h4 style={{ color: '#4DA3FF', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                             <Sparkles className="w-5 h-5" /> Clinical Commentary
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             {report.split('\n').filter(line => line.trim()).map((line, i) => (
                               <div key={i} style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                 <span style={{ color: '#4DA3FF', fontWeight: 'bold' }}>•</span>
                                 <span style={{ lineHeight: '1.6' }}>{line.replace(/^[-*•]\s*/, '').replace(/^JSON:?\s*/i, '')}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#0B0F14', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                          <div style={{ height: '4px', background: 'linear-gradient(90deg, #4DA3FF, #00C2A8, #FFD700, #FF4D4F)' }} />
                          <div style={{ padding: '2.5rem' }}>
                            <div className="medical-report-grid" style={{ display: 'grid', gap: '2rem' }}>
                              
                              {/* Clinical Summary */}
                              <div style={{ background: 'rgba(77, 163, 255, 0.03)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(77, 163, 255, 0.1)' }}>
                                <h4 style={{ color: '#4DA3FF', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <CheckCircle2 className="w-5 h-5" /> Clinical Summary
                                </h4>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: '#E6EDF3', opacity: 0.9 }}>{report.summary}</p>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                {/* Biomarkers */}
                                <div style={{ background: 'rgba(26, 34, 48, 0.5)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <h4 style={{ color: '#00C2A8', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <BrainIcon /> Observed Biomarkers
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {(report.features || []).map((f, i) => (
                                      <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem', color: '#9AA4B2' }}>
                                        <span style={{ color: '#00C2A8' }}>•</span>
                                        <span>{f}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div style={{ background: 'rgba(26, 34, 48, 0.5)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <h4 style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Upload className="w-5 h-5" style={{ color: '#FFD700' }} /> Clinical Recommendations
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {(report.recommended_action || []).map((a, i) => (
                                      <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem', color: '#9AA4B2' }}>
                                        <span style={{ color: '#FFD700' }}>•</span>
                                        <span>{a}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Risk Assessment */}
                              <div style={{ background: 'rgba(245, 158, 11, 0.03)', padding: '1.5rem 2rem', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                <h4 style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                  ⚠️ Severity Analysis
                                </h4>
                                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#9AA4B2' }}>{report.risk_assessment}</p>
                              </div>

                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <h2 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>Patient Directory</h2>
              <p className="page-sub" style={{ color: '#9AA4B2' }}>Historical diagnostic data and chronological risk tracking.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                style={{ background: '#1A2230', color: 'white', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                onChange={(e) => fetchScans(e.target.value)}
              >
                {dbPatients.length === 0 && <option>No patients found</option>}
                {dbPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Age: {p.age})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Timeline Details */}
            <div className="patients-table-wrap" style={{ background: 'rgba(26, 34, 48, 0.7)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ marginBottom: '16px', color: '#00C2A8' }}>Progression Timeline</h3>
              {dbScans.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>No scans available for this patient.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {dbScans.map((s, i) => (
                    <div key={i} style={{ borderLeft: '2px solid #4DA3FF', paddingLeft: '16px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#4DA3FF' }}></div>
                      <div style={{ fontSize: '0.8rem', color: '#9AA4B2', marginBottom: '4px' }}>{new Date(s.scan_date).toLocaleString()}</div>
                      <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{s.diagnosis}</div>
                      <div style={{ fontSize: '0.8rem', color: s.risk_score > 70 ? '#FF4D4F' : '#00C2A8' }}>Risk Index: {s.risk_score}% (Conf: {s.confidence}%)</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recharts Graph */}
            <div style={{ background: 'rgba(26, 34, 48, 0.7)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ marginBottom: '24px', color: '#4DA3FF' }}>Risk Severity Trajectory</h3>
              <div style={{ width: '100%', height: '300px' }}>
                {dbScans.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dbScans.map(s => ({ date: new Date(s.scan_date).toLocaleDateString(), Risk: s.risk_score }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#9AA4B2" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="#9AA4B2" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid rgba(77,163,255,0.2)', borderRadius: '8px' }}
                        itemStyle={{ color: '#00C2A8', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="Risk" stroke="#00C2A8" strokeWidth={3} dot={{ r: 6, fill: '#00C2A8' }} activeDot={{ r: 8, fill: '#FFD700' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: '#6B7280', textAlign: 'center', marginTop: '100px' }}>Need at least 1 scan to generate trajectory chart.</p>
                )}
              </div>
            </div>
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

      {/* ================== MODALS & TOASTS ================== */}
      {showSaveModal && (
        <div className="zoom-modal" onClick={() => setShowSaveModal(false)}>
          <div style={{ background: '#1A2230', padding: '30px', borderRadius: '16px', border: '1px solid rgba(77,163,255,0.3)', width: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', color: '#4DA3FF' }}>Save to Patient DB</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9AA4B2', marginBottom: '6px', display: 'block' }}>Patient Name</label>
                <input
                  type="text"
                  value={patientNameInput}
                  onChange={e => setPatientNameInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B0F14', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#9AA4B2', marginBottom: '6px', display: 'block' }}>Age</label>
                <input
                  type="number"
                  value={patientAgeInput}
                  onChange={e => setPatientAgeInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0B0F14', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  placeholder="e.g. 52"
                />
              </div>
            </div>

            <button
              className="report-btn"
              onClick={handleSaveToPatient}
              disabled={savingPatient || !patientNameInput || !patientAgeInput}
            >
              {savingPatient ? 'Saving...' : '💾 Save Record'}
            </button>
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
