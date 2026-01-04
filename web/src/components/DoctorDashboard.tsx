import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface DoctorStats {
  total_patients: number;
  pending_reports: number;
  reviewed_reports: number;
}

export function DoctorDashboard() {
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, profileRes] = await Promise.all([
        api.get('/api/doctor/stats'),
        api.get('/api/doctor/profile/'),
      ]);
      setStats(statsRes.data);
      setProfile(profileRes.data);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('access_token');
      navigate('/login');
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
        <div className="logo-container-header">
          <div className="logo-icon-header">
            <span className="heart-icon-header">❤️</span>
          </div>
          <h1 className="logo-text-header">HealthbridgeAI</h1>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {profile && (
        <div className="card doctor-info-card">
          <h2>Welcome, Dr. {profile.first_name} {profile.last_name}!</h2>
          {profile.specialty && <p>{profile.specialty}</p>}
          {profile.hospital_name && <p>{profile.hospital_name}</p>}
        </div>
      )}

      <div className="doctor-actions">
        <div
          className="action-card"
          style={{ backgroundColor: '#E3F2FD' }}
          onClick={() => navigate('/doctor/patients')}
        >
          <div className="action-icon" style={{ color: '#1976D2' }}>
            👥
          </div>
          <h3 style={{ color: '#1565C0' }}>My Patients</h3>
          <p style={{ color: '#1976D2' }}>
            {stats?.total_patients || 0}{' '}
            {stats?.total_patients === 1 ? 'Patient' : 'Patients'}
          </p>
        </div>

        <div
          className="action-card"
          style={{ backgroundColor: '#FFF3E0' }}
          onClick={() => navigate('/doctor/reports/pending')}
        >
          <div className="action-icon" style={{ color: '#EF6C00' }}>
            📋
          </div>
          <h3 style={{ color: '#E65100' }}>Pending Reports</h3>
          <p style={{ color: '#EF6C00' }}>
            {stats?.pending_reports || 0}{' '}
            {stats?.pending_reports === 1 ? 'Report' : 'Reports'} awaiting review
          </p>
        </div>

        <div
          className="action-card"
          style={{ backgroundColor: '#E8F5E9' }}
          onClick={() => navigate('/doctor/reports/reviewed')}
        >
          <div className="action-icon" style={{ color: '#388E3C' }}>
            ✓
          </div>
          <h3 style={{ color: '#2E7D32' }}>Reviewed Reports</h3>
          <p style={{ color: '#388E3C' }}>
            {stats?.reviewed_reports || 0}{' '}
            {stats?.reviewed_reports === 1 ? 'Report' : 'Reports'}
          </p>
        </div>

        <div
          className="action-card"
          style={{ backgroundColor: '#F3E5F5' }}
          onClick={() => navigate('/doctor/search')}
        >
          <div className="action-icon" style={{ color: '#7B1FA2' }}>
            🔍
          </div>
          <h3 style={{ color: '#6A1B9A' }}>Search Patients</h3>
          <p style={{ color: '#7B1FA2' }}>Find and view any patient records</p>
        </div>
      </div>
    </div>
  );
}
