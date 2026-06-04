import { useMemo, useState } from 'react';

const FIELD_OPTIONS = [
  ['schoolFaculty', 'School/Faculty'],
  ['classCode', 'Class Code'],
  ['courseCode', 'Course Code'],
  ['courseName', 'Course Name'],
  ['notes', 'Notes'],
  ['group', 'Group'],
  ['examPeriod', 'Exam Period'],
  ['week', 'Week'],
  ['dayOfWeek', 'Day of Week'],
  ['examDate', 'Exam Date'],
  ['examSession', 'Exam Session'],
  ['studentCount', 'Student Count'],
  ['examRoom', 'Exam Room'],
  ['examRoomCode', 'Exam Room/Class Code']
];

const FIELD_LABELS = Object.fromEntries(FIELD_OPTIONS);

export function ImportPanel({ currentUpload, importResult, onUpload, onReparse, onReplace, busy }) {
  const [file, setFile] = useState(null);
  const [headerRow, setHeaderRow] = useState('');
  const [mapping, setMapping] = useState({});

  const headers = importResult?.headers || [];
  const activeMapping = useMemo(
    () => ({ ...(importResult?.columnMapping || {}), ...mapping }),
    [importResult, mapping]
  );

  function handleUpload(event) {
    event.preventDefault();
    if (file) onUpload(file);
  }

  function handleMappingChange(field, value) {
    setMapping((current) => ({
      ...current,
      [field]: value === '' ? undefined : Number(value)
    }));
  }

  function handleReparse(event) {
    event.preventDefault();
    onReparse({
      headerRowIndex: headerRow === '' ? importResult?.headerRowIndex : Number(headerRow) - 1,
      columnMapping: activeMapping
    });
  }

  return (
    <section className="panel import-panel">
      <div className="section-header">
        <div>
          <h2>Excel Import</h2>
          <p>{currentUpload ? `${currentUpload.originalName} - ${currentUpload.rowCount} rows loaded` : 'Upload the full exam schedule .xlsx file.'}</p>
        </div>
        {currentUpload && (
          <button className="secondary danger" type="button" onClick={onReplace} disabled={busy}>
            Replace schedule
          </button>
        )}
      </div>

      <form className="upload-row" onSubmit={handleUpload}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button type="submit" disabled={!file || busy}>Upload</button>
      </form>

      {importResult && (
        <div className="mapping-area">
          <div className="import-summary">
            <span>Worksheet: {importResult.worksheetName}</span>
            <span>Header row: {importResult.headerRowIndex + 1}</span>
            <span>Rows imported: {importResult.rowCount}</span>
            <span>{importResult.sessionMappingDetected ? 'Session mapping detected' : 'Default session mapping used'}</span>
          </div>

          {(importResult.missingRequired?.length > 0 || importResult.rowCount === 0) && (
            <div className="import-warning">
              {importResult.missingRequired?.length > 0 && (
                <p>
                  Required columns not detected: {importResult.missingRequired.map((field) => FIELD_LABELS[field] || field).join(', ')}.
                </p>
              )}
              {importResult.rowCount === 0 && (
                <p>No schedule rows were imported. Adjust the header row or column mapping, then apply mapping.</p>
              )}
            </div>
          )}

          <form className="mapping-grid" onSubmit={handleReparse}>
            <label>
              Header row
              <input
                type="number"
                min="1"
                value={headerRow}
                placeholder={String(importResult.headerRowIndex + 1)}
                onChange={(event) => setHeaderRow(event.target.value)}
              />
            </label>

            {FIELD_OPTIONS.map(([field, label]) => (
              <label key={field}>
                {label}
                <select
                  value={activeMapping[field] ?? ''}
                  onChange={(event) => handleMappingChange(field, event.target.value)}
                >
                  <option value="">Not mapped</option>
                  {headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {index + 1}. {header || '(blank)'}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <button type="submit" disabled={busy}>Apply mapping</button>
          </form>

          <div className="session-map">
            {Object.entries(importResult.sessionMapping).map(([session, time]) => (
              <span key={session}>{session}: {time}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
