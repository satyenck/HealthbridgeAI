import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PendingReports } from './components/PendingReports';
import { ReviewedReports } from './components/ReviewedReports';
import { PatientsList } from './components/PatientsList';
import { PatientDetail } from './components/PatientDetail';
import { ReportEdit } from './components/ReportEdit';

// Login Component
function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google Sign-In only if you have a valid client ID
    // To enable: Get your Client ID from https://console.cloud.google.com/
    // and uncomment the code below

    const GOOGLE_CLIENT_ID = ''; // Add your Google Client ID here to enable Google Sign-In

    if (window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'outline', size: 'large', width: 300 }
      );
    }
  }, []);

  const handleGoogleCallback = async (response: any) => {
    setLoading(true);
    try {
      const result = await api.post('/api/auth/google', {
        id_token: response.credential,
      });
      localStorage.setItem('access_token', result.data.access_token);

      // Check user role and redirect accordingly
      const userResponse = await api.get('/api/auth/me');
      const userRole = userResponse.data.role;

      if (userRole === 'DOCTOR' || userRole === 'DOCTOR_ASSISTANT') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Google authentication failed. Make sure Google OAuth is configured in the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/phone/send-code', { phone_number: phoneNumber });
      setCodeSent(true);
      alert('Verification code sent! Check your backend console for the code.');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/phone/verify', {
        phone_number: phoneNumber,
        verification_code: verificationCode,
      });
      localStorage.setItem('access_token', response.data.access_token);

      // Check user role and redirect accordingly
      const userResponse = await api.get('/api/auth/me');
      const userRole = userResponse.data.role;

      if (userRole === 'DOCTOR' || userRole === 'DOCTOR_ASSISTANT') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <div className="logo-container">
          <div className="logo-icon">
            <span className="heart-icon">❤️</span>
          </div>
          <h1 className="logo-text">HealthbridgeAI</h1>
        </div>
        <p className="subtitle">Your AI Health Companion</p>

        <div className="form">
          {/* Google Sign-In button will appear here when configured */}
          <div id="googleSignInButton" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0px' }}></div>

          <label>Phone Number</label>
          <input
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={codeSent}
          />

          {!codeSent ? (
            <button onClick={handleSendCode} disabled={loading}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          ) : (
            <>
              <label>Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
              <button onClick={handleVerifyCode} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button className="link-button" onClick={() => setCodeSent(false)}>
                Change Phone Number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Home Component
function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, timelineRes] = await Promise.all([
        api.get('/api/profile').catch(() => null),
        api.get('/api/profile/timeline').catch(() => ({ data: { encounters: [] } })),
      ]);

      if (profileRes) {
        setProfile(profileRes.data);
      } else {
        navigate('/profile');
      }
      setConsultations(timelineRes.data.encounters || []);
    } catch (error) {
      console.error('Error loading data:', error);
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

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>;

  return (
    <div className="container">
      <div className="header">
        <div className="logo-container-header">
          <div className="logo-icon-header">
            <span className="heart-icon-header">❤️</span>
          </div>
          <h1 className="logo-text-header">HealthbridgeAI</h1>
        </div>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      {profile && (
        <div className="card">
          <h2>Welcome, {profile.first_name}!</h2>
          <p>{profile.gender} • {new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()} years old</p>
        </div>
      )}

      <div className="card consultation-card" onClick={() => navigate('/consultation')}>
        <div className="icon">💬</div>
        <h3>Need Medical Consultation?</h3>
        <p>Describe your symptoms and get AI-powered insights</p>
      </div>

      <div className="card">
        <h3>Consultation History</h3>
        {consultations.length === 0 ? (
          <p className="empty">No consultations yet. Start your first consultation!</p>
        ) : (
          <div className="consultation-list">
            {consultations.map((encounter) => (
              <div
                key={encounter.encounter_id}
                className="consultation-item"
                onClick={() => navigate(`/consultation/${encounter.encounter_id}`)}
              >
                <div className="date">{new Date(encounter.created_at).toLocaleDateString()}</div>
                <div className="description">
                  {encounter.encounter_type === 'HEALTH_ASSISTANT' ? 'Health Assistant Chat' :
                   encounter.encounter_type === 'VITALS_REPORT' ? 'Vitals Report' :
                   encounter.patient_symptoms || 'Consultation'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Profile Component
function Profile() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    health_condition: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/profile', formData);
      alert('Profile created successfully!');
      navigate('/home');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Create Your Profile</h1>
        <p className="subtitle">Tell us about yourself to get personalized care</p>

        <form onSubmit={handleSubmit} className="form">
          <label>First Name *</label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />

          <label>Last Name *</label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />

          <label>Date of Birth *</label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            required
          />

          <label>Gender *</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>

          <label>Health Condition (Optional)</label>
          <textarea
            value={formData.health_condition}
            onChange={(e) => setFormData({ ...formData, health_condition: e.target.value })}
            rows={4}
            placeholder="Any existing health conditions or medications"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

// New Consultation Component
function NewConsultation() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe your health issue');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/consultations', {
        patient_description: description,
      });
      alert('Consultation report generated!');
      navigate(`/consultation/${response.data.id}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create consultation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/home')} className="back-btn">← Back</button>
          <div className="logo-container-header">
            <div className="logo-icon-header">
              <span className="heart-icon-header">❤️</span>
            </div>
            <h1 className="logo-text-header">HealthbridgeAI</h1>
          </div>
        </div>
      </div>

      <div className="card info-card">
        <p>Describe your symptoms or health concerns in detail. Our AI will analyze and provide insights about:</p>
        <ul>
          <li>Potential symptoms</li>
          <li>Possible diagnoses</li>
          <li>Treatment recommendations</li>
          <li>Next steps to take</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <label>Describe Your Health Issue</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          placeholder="Example: I've been experiencing headaches for the past 3 days, mostly in the morning. I also feel nauseous and have trouble concentrating..."
          required
        />

        <div className="disclaimer">
          ⚠️ This is not a substitute for professional medical advice. Please consult a healthcare provider for proper diagnosis and treatment.
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating Report...' : 'Generate Consultation Report'}
        </button>
      </form>
    </div>
  );
}

// Consultation Detail Component
function ConsultationDetail() {
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadConsultation();
  }, []);

  const loadConsultation = async () => {
    try {
      const response = await api.get(`/api/consultations/${id}`);
      console.log('Consultation API Response:', response.data);
      console.log('Symptoms:', response.data.symptoms);
      console.log('Diagnosis:', response.data.potential_diagnosis);
      console.log('Treatment:', response.data.potential_treatment);
      console.log('Next Steps:', response.data.next_steps);
      setConsultation(response.data);
    } catch (error) {
      alert('Failed to load consultation');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>;
  if (!consultation) return null;

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/home')} className="back-btn">← Back</button>
          <div className="logo-container-header">
            <div className="logo-icon-header">
              <span className="heart-icon-header">❤️</span>
            </div>
            <h1 className="logo-text-header">HealthbridgeAI</h1>
          </div>
        </div>
      </div>

      <div className="date">{new Date(consultation.created_at).toLocaleString()}</div>

      <div className="disclaimer">
        ⚠️ This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
      </div>

      <div className="card">
        <h3>Your Description</h3>
        <p>{consultation.patient_description}</p>
      </div>

      {consultation.symptoms && (
        <div className="card">
          <h3>Symptoms</h3>
          <p>{consultation.symptoms}</p>
        </div>
      )}

      {consultation.potential_diagnosis && (
        <div className="card">
          <h3>Potential Diagnosis</h3>
          <p>{consultation.potential_diagnosis}</p>
        </div>
      )}

      {consultation.potential_treatment && (
        <div className="card">
          <h3>Potential Treatment</h3>
          <p>{consultation.potential_treatment}</p>
        </div>
      )}

      {consultation.next_steps && (
        <div className="card">
          <h3>Next Steps</h3>
          <p>{consultation.next_steps}</p>
        </div>
      )}

      <button onClick={() => navigate('/consultation')} className="primary-btn">
        Start New Consultation
      </button>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/consultation" element={<ProtectedRoute><NewConsultation /></ProtectedRoute>} />
        <Route path="/consultation/:id" element={<ProtectedRoute><ConsultationDetail /></ProtectedRoute>} />

        {/* Doctor Routes */}
        <Route path="/doctor-dashboard" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/reports/pending" element={<ProtectedRoute><PendingReports /></ProtectedRoute>} />
        <Route path="/doctor/reports/reviewed" element={<ProtectedRoute><ReviewedReports /></ProtectedRoute>} />
        <Route path="/doctor/patients" element={<ProtectedRoute><PatientsList /></ProtectedRoute>} />
        <Route path="/doctor/search" element={<ProtectedRoute><PatientsList /></ProtectedRoute>} />
        <Route path="/doctor/patient/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/doctor/report/:reportId" element={<ProtectedRoute><ReportEdit /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
