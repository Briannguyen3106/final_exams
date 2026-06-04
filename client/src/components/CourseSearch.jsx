export function CourseSearch({ query, onQueryChange, results, selectedIds, onAdd, disabled }) {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Course Selection</h2>
          <p>Search by course code, course name, or class code. Duplicate course codes are shown as separate rows.</p>
        </div>
      </div>

      <input
        className="search-input"
        type="search"
        value={query}
        placeholder="Search course code or course name"
        onChange={(event) => onQueryChange(event.target.value)}
        disabled={disabled}
      />

      <div className="table-wrap compact">
        <table>
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Class</th>
              <th>Date</th>
              <th>Session</th>
              <th>Room</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const added = selectedIds.has(row.id);
              return (
                <tr key={row.id}>
                  <td>{row.courseCode || '-'}</td>
                  <td>{row.courseName || '-'}</td>
                  <td>{row.classCode || '-'}</td>
                  <td>{row.examDateRaw || '-'}</td>
                  <td>{row.examSession || '-'}</td>
                  <td>{row.examRoom || '-'}</td>
                  <td>
                    <button
                      className={added ? 'secondary' : ''}
                      type="button"
                      disabled={added}
                      onClick={() => onAdd(row.id)}
                    >
                      {added ? 'Added' : 'Add'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!results.length && (
              <tr>
                <td colSpan="7" className="empty">No matching courses.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
