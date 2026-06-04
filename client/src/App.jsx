import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard.jsx';
import { CourseSearch } from './components/CourseSearch.jsx';
import { ImportPanel } from './components/ImportPanel.jsx';
import { api } from './services/api.js';

export default function App() {
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
    loadInitialData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentUpload) searchCourses(searchQuery);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, currentUpload]);

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
          <p>Local dashboard for your selected exams</p>
        </div>
      </header>

      {(message || error) && (
        <div className={error ? 'notice error' : 'notice'}>
          <span>{error || message}</span>
          <button type="button" onClick={() => { setMessage(''); setError(''); }}>Dismiss</button>
        </div>
      )}

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
    </main>
  );
}
