import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { VoiceRecorder } from './VoiceRecorder';
import { LoadingIndicator } from './LoadingIndicator';

interface Report {
  report_id: string;
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  created_at: string;
  reviewed_at: string | null;
  symptoms: string;
  preliminary_assessment: string;
  diagnosis: string;
  treatment_plan: string;
  next_steps: string;
  status: string;
  encounter_type: string;
}

export function ReportEdit() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [tests, setTests] = useState('');
  const [prescription, setPrescription] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      const response = await api.get(`/api/doctor/reports/${reportId}`);
      setReport(response.data);
      setDiagnosis(response.data.diagnosis || '');
      setTreatmentPlan(response.data.treatment_plan || '');
      setNextSteps(response.data.next_steps || '');
      setTests(response.data.tests || '');
      setPrescription(response.data.prescription || '');
    } catch (error: any) {
      console.error('Error loading report:', error);
      alert('Failed to load report');
      navigate('/doctor-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceRecording = async (audioBlob: Blob, audioBase64: string) => {
    setIsProcessing(true);
    try {
      const response = await api.post('/api/doctor/reports/voice-edit', {
        report_id: reportId,
        audio_base64: audioBase64,
      });

      // Update fields with voice-edited content
      if (response.data.diagnosis) setDiagnosis(response.data.diagnosis);
      if (response.data.treatment_plan) setTreatmentPlan(response.data.treatment_plan);
      if (response.data.next_steps) setNextSteps(response.data.next_steps);

      alert('Voice edits processed successfully!');
    } catch (error: any) {
      console.error('Error processing voice:', error);
      alert(error.response?.data?.detail || 'Failed to process voice recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!diagnosis.trim()) {
      alert('Please provide a diagnosis');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/doctor/reports/${reportId}/review`, {
        diagnosis: diagnosis.trim(),
        treatment_plan: treatmentPlan.trim(),
        next_steps: nextSteps.trim(),
        tests: tests.trim(),
        prescription: prescription.trim(),
      });

      alert('Report reviewed and saved successfully!');

      // Reload the report to show updated data and exit edit mode
      setIsEditing(false);
      await loadReport();
    } catch (error: any) {
      console.error('Error saving report:', error);
      alert(error.response?.data?.detail || 'Failed to save report');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <div className="logo-container-header">
            <div className="logo-icon-header">
              <span className="heart-icon-header">❤️</span>
            </div>
            <h1 className="logo-text-header">HealthbridgeAI</h1>
          </div>
        </div>
      </div>

      {isProcessing && (
        <LoadingIndicator message="Processing" />
      )}

      <div className="card">
        <div className="report-header">
          <div className="report-header-left">
            <h2>{report.patient_name}</h2>
            <p>📞 {report.patient_phone}</p>
            <p>Date: {new Date(report.created_at).toLocaleString()}</p>
            {report.encounter_type && (
              <p>Type: {report.encounter_type.replace('_', ' ')}</p>
            )}
          </div>
          <div className="report-header-right">
            <span className={`report-badge ${report.status === 'REVIEWED' ? 'reviewed' : 'pending'}`}>
              {report.status === 'REVIEWED' ? 'Reviewed' : 'Pending Review'}
            </span>
            {!isEditing && (
              <button
                className="edit-btn-top"
                onClick={() => setIsEditing(true)}
              >
                ✏️ {report.status === 'REVIEWED' ? 'Edit Report' : 'Start Review'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Patient Symptoms</h3>
        <p className="report-content">{report.symptoms}</p>
      </div>

      {report.preliminary_assessment && (
        <div className="card">
          <h3>AI Preliminary Assessment</h3>
          <p className="report-content">{report.preliminary_assessment}</p>
        </div>
      )}

      <div className="card">
        <h3>Diagnosis</h3>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={5}
            placeholder="Enter diagnosis..."
          />
        ) : (
          <p className="report-content">{diagnosis || 'Not yet provided'}</p>
        )}
      </div>

      <div className="card">
        <h3>Treatment Plan</h3>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={treatmentPlan}
            onChange={(e) => setTreatmentPlan(e.target.value)}
            rows={5}
            placeholder="Enter treatment plan..."
          />
        ) : (
          <p className="report-content">{treatmentPlan || 'Not yet provided'}</p>
        )}
      </div>

      <div className="card">
        <h3>Next Steps</h3>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            rows={4}
            placeholder="Enter next steps..."
          />
        ) : (
          <p className="report-content">{nextSteps || 'Not yet provided'}</p>
        )}
      </div>

      <div className="card">
        <h3>Lab Tests</h3>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={tests}
            onChange={(e) => setTests(e.target.value)}
            rows={5}
            placeholder="Enter recommended lab tests..."
          />
        ) : (
          <p className="report-content">{tests || 'Not yet provided'}</p>
        )}
      </div>

      <div className="card">
        <h3>Prescription</h3>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            rows={5}
            placeholder="Enter prescription details..."
          />
        ) : (
          <p className="report-content">{prescription || 'Not yet provided'}</p>
        )}
      </div>

      {isEditing && (
        <>
          <div className="card voice-section">
            <h3>Or Use Voice Input</h3>
            <p className="voice-hint">
              Record your diagnosis, treatment plan, and next steps by voice
            </p>
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecording}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>

          <div className="action-buttons">
            <button
              className="cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setDiagnosis(report.diagnosis || '');
                setTreatmentPlan(report.treatment_plan || '');
                setNextSteps(report.next_steps || '');
                setTests(report.tests || '');
                setPrescription(report.prescription || '');
              }}
            >
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={isProcessing || isRecording}
            >
              {isProcessing ? 'Saving...' : 'Save & Mark as Reviewed'}
            </button>
          </div>
        </>
      )}

      {report.reviewed_at && !isEditing && (
        <div className="card">
          <p className="reviewed-info">
            ✓ Reviewed on {new Date(report.reviewed_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
