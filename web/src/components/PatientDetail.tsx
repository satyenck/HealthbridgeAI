import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

interface PatientProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  general_health_issues: string | null;
}

interface Report {
  report_id: string;
  encounter_id: string;
  created_at: string;
  reviewed_at: string | null;
  symptoms: string;
  diagnosis: string;
  status: string;
  encounter_type: string;
}

export function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      const [profileRes, reportsRes] = await Promise.all([
        api.get(`/api/doctor/patients/${patientId}`),
        api.get(`/api/doctor/patients/${patientId}/reports`),
      ]);
      setPatient(profileRes.data);
      setReports(reportsRes.data);
    } catch (error: any) {
      console.error('Error loading patient:', error);
      alert('Failed to load patient data');
      navigate('/doctor/patients');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/doctor/patients')} className="back-btn">
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

      <div className="card">
        <h2>
          {patient.first_name} {patient.last_name}
        </h2>
        <div className="patient-details">
          <p>
            <strong>Gender:</strong> {patient.gender}
          </p>
          <p>
            <strong>Age:</strong> {calculateAge(patient.date_of_birth)} years
          </p>
          <p>
            <strong>Date of Birth:</strong>{' '}
            {new Date(patient.date_of_birth).toLocaleDateString()}
          </p>
          <p>
            <strong>Phone:</strong> {patient.phone_number}
          </p>
          {patient.general_health_issues && (
            <p>
              <strong>Health Issues:</strong> {patient.general_health_issues}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Medical Reports ({reports.length})</h3>
      </div>

      {reports.length === 0 ? (
        <div className="card">
          <p className="empty">No medical reports for this patient yet.</p>
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
                <span className="report-date">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
                <span
                  className={`report-badge ${
                    report.status === 'REVIEWED' ? 'reviewed' : 'pending'
                  }`}
                >
                  {report.status === 'REVIEWED' ? 'Reviewed' : 'Pending'}
                </span>
              </div>
              {report.encounter_type && (
                <p className="report-type">
                  Type: {report.encounter_type.replace('_', ' ')}
                </p>
              )}
              <div className="report-preview">
                <strong>Symptoms:</strong>
                <p>{report.symptoms.substring(0, 100)}...</p>
              </div>
              {report.diagnosis && (
                <div className="report-preview">
                  <strong>Diagnosis:</strong>
                  <p>{report.diagnosis.substring(0, 100)}...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
