import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Patient {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  last_encounter_date: string | null;
  total_encounters: number;
}

export function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    // Filter patients based on search query
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patients.filter(
        (patient) =>
          patient.first_name.toLowerCase().includes(query) ||
          patient.last_name.toLowerCase().includes(query) ||
          patient.phone_number.includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    try {
      const response = await api.get('/api/doctor/patients/my-patients');
      setPatients(response.data);
      setFilteredPatients(response.data);
    } catch (error: any) {
      console.error('Error loading patients:', error);
      alert('Failed to load patients');
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

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="card">
          <p className="empty">
            {searchQuery ? 'No patients found matching your search.' : 'No patients yet.'}
          </p>
        </div>
      ) : (
        <div className="patients-list">
          {filteredPatients.map((patient) => (
            <div
              key={patient.user_id}
              className="patient-card"
              onClick={() => navigate(`/doctor/patient/${patient.user_id}`)}
            >
              <div className="patient-header">
                <h3>
                  {patient.first_name} {patient.last_name}
                </h3>
                <span className="patient-info">
                  {patient.gender} • {calculateAge(patient.date_of_birth)} years
                </span>
              </div>
              <p className="patient-phone">📞 {patient.phone_number}</p>
              <div className="patient-stats">
                <span>Total Encounters: {patient.total_encounters}</span>
                {patient.last_encounter_date && (
                  <span>
                    Last Visit: {new Date(patient.last_encounter_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
