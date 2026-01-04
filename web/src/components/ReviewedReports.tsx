import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Report {
  report_id: string;
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  created_at: string;
  reviewed_at: string;
  symptoms: string;
  diagnosis: string;
  treatment_plan: string;
  status: string;
}

export function ReviewedReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await api.get('/api/doctor/reports/my-reviewed');
      setReports(response.data);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      alert('Failed to load reviewed reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/doctor-dashboard')} className="back-btn">
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

      {reports.length === 0 ? (
        <div className="card">
          <p className="empty">No reviewed reports yet.</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="report-card"
              onClick={() => navigate(`/doctor/report/${report.report_id}`)}
            >
              <div className="report-header">
                <h3>{report.patient_name}</h3>
                <span className="report-badge reviewed">Reviewed</span>
              </div>
              <p className="report-phone">📞 {report.patient_phone}</p>
              <p className="report-date">
                Reviewed: {new Date(report.reviewed_at).toLocaleString()}
              </p>
              <div className="report-preview">
                <strong>Diagnosis:</strong>
                <p>{report.diagnosis?.substring(0, 150)}...</p>
              </div>
              {report.treatment_plan && (
                <div className="report-preview">
                  <strong>Treatment Plan:</strong>
                  <p>{report.treatment_plan.substring(0, 150)}...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
