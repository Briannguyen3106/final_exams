import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard.jsx';
import { CourseSearch } from './components/CourseSearch.jsx';
import { ImportPanel } from './components/ImportPanel.jsx';
import { api } from './services/api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [currentUpload, setCurrentUpload] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExams, setSelectedExams] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const selectedIds = useMemo(
    () => new Set(selectedExams.map((exam) => exam.id)),
    [selectedExams]
  );

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (user && currentUpload) searchCourses(searchQuery);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, currentUpload, user]);

  async function checkSession() {
    if (!api.getToken()) {
      setAuthChecked(true);
      return;
    }

    setBusy(true);
    try {
      const session = await api.getMe();
      setUser(session.user);
      await loadInitialData();
    } catch {
      api.setToken('');
      setUser(null);
    } finally {
      setBusy(false);
      setAuthChecked(true);
    }
  }

  async function submitAuth(payload) {
    setBusy(true);
    try {
      const result = authMode === 'signup'
        ? await api.signup(payload)
        : await api.login(payload);
      api.setToken(result.token);
      setUser(result.user);
      setMessage(authMode === 'signup' ? 'Account created.' : 'Signed in.');
      setError('');
      await loadInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    api.setToken('');
    setUser(null);
    setCurrentUpload(null);
    setImportResult(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedExams([]);
    setMessage('');
    setError('');
  }

  async function loadInitialData() {
    setBusy(true);
    try {
      const [schedule, selections] = await Promise.all([
        api.getCurrentSchedule(),
        api.getSelections()
      ]);
      setCurrentUpload(schedule.upload);
      setSearchResults(schedule.rows || []);
      setSelectedExams(selections);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function searchCourses(query) {
    try {
      const rows = await api.searchRows(query);
      setSearchResults(rows);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadSchedule(file) {
    setBusy(true);
    try {
      const result = await api.uploadSchedule(file);
      setImportResult(result);
      setMessage(`Imported ${result.rowCount} schedule rows.`);
      await loadInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reparseSchedule(payload) {
    setBusy(true);
    try {
      const result = await api.reparseSchedule(payload);
      setImportResult(result);
      setMessage(`Reparsed ${result.rowCount} schedule rows.`);
      await loadInitialData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addSelection(scheduleRowId) {
    try {
      await api.addSelection(scheduleRowId);
      setSelectedExams(await api.getSelections());
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeSelection(selectionId) {
    try {
      await api.removeSelection(selectionId);
      setSelectedExams(await api.getSelections());
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearSelections() {
    try {
      await api.clearSelections();
      setSelectedExams([]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function replaceSchedule() {
    setBusy(true);
    try {
      await api.replaceSchedule();
      setCurrentUpload(null);
      setImportResult(null);
      setSearchResults([]);
      setSelectedExams([]);
      setMessage('Schedule removed. Upload a new .xlsx file.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function refreshStatus() {
    setNow(new Date());
    setMessage('Status calculations refreshed.');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Exam Schedule Manager</h1>
          <p>{user ? `Signed in as ${user.email}` : 'Sign in to manage your exam dashboard'}</p>
        </div>
        {user && (
          <button type="button" className="secondary" onClick={signOut}>Sign out</button>
        )}
      </header>

      {(message || error) && (
        <div className={error ? 'notice error' : 'notice'}>
          <span>{error || message}</span>
          <button type="button" onClick={() => { setMessage(''); setError(''); }}>Dismiss</button>
        </div>
      )}

      {!authChecked && <section className="panel"><p className="empty">Checking session...</p></section>}

      {authChecked && !user && (
        <AuthPanel
          mode={authMode}
          onModeChange={setAuthMode}
          onSubmit={submitAuth}
          busy={busy}
        />
      )}

      {authChecked && user && (
        <>
          <ImportPanel
            currentUpload={currentUpload}
            importResult={importResult}
            onUpload={uploadSchedule}
            onReparse={reparseSchedule}
            onReplace={replaceSchedule}
            busy={busy}
          />

          <CourseSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            selectedIds={selectedIds}
            onAdd={addSelection}
            disabled={!currentUpload || busy}
          />

          <Dashboard
            exams={selectedExams}
            onRemove={removeSelection}
            onClear={clearSelections}
            onRefresh={refreshStatus}
            now={now}
          />
        </>
      )}
    </main>
  );
}

function AuthPanel({ mode, onModeChange, onSubmit, busy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isSignup = mode === 'signup';

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <section className="panel auth-panel">
      <div className="section-header">
        <div>
          <h2>{isSignup ? 'Create Account' : 'Sign In'}</h2>
          <p>Your uploaded schedules and selected exams stay separate from other users.</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className={!isSignup ? '' : 'secondary'}
            onClick={() => onModeChange('login')}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            className={isSignup ? '' : 'secondary'}
            onClick={() => onModeChange('signup')}
            disabled={busy}
          >
            Sign up
          </button>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
