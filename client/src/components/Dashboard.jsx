import { formatDaysRemaining, splitAndSortExams } from '../utils/examStatus.js';

export function Dashboard({ exams, onRemove, onClear, onRefresh, now }) {
  const { upcoming, completed } = splitAndSortExams(exams, now);

  return (
    <section className="panel dashboard">
      <div className="section-header">
        <div>
          <h2>My Exams</h2>
          <p>{upcoming.length} upcoming, {completed.length} completed</p>
        </div>
        <div className="actions">
          <button className="secondary" type="button" onClick={onRefresh}>Refresh status</button>
          <button className="secondary danger" type="button" onClick={onClear} disabled={!exams.length}>Clear all</button>
        </div>
      </div>

      <ExamTable title="Upcoming Exams" rows={upcoming} onRemove={onRemove} />
      <ExamTable title="Completed Exams" rows={completed} onRemove={onRemove} muted />
    </section>
  );
}

function ExamTable({ title, rows, onRemove, muted = false }) {
  return (
    <div className={muted ? 'exam-section muted' : 'exam-section'}>
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Session</th>
              <th>Exam Date & Time</th>
              <th>Room</th>
              <th>Room Code</th>
              <th>Days Remaining</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((exam, index) => (
              <tr key={exam.selectionId} className={`${exam.isSoon ? 'soon' : ''} ${index === 0 && !muted ? 'nearest' : ''}`}>
                <td>{exam.courseCode || '-'}</td>
                <td>{exam.courseName || '-'}</td>
                <td>{exam.examSession || '-'}</td>
                <td>{exam.displayDateTime}</td>
                <td>{exam.examRoom || '-'}</td>
                <td>{exam.examRoomCode || '-'}</td>
                <td>{formatDaysRemaining(exam.daysRemaining)}</td>
                <td><span className={`status ${exam.status.toLowerCase()}`}>{exam.status}</span></td>
                <td>
                  <button className="secondary danger" type="button" onClick={() => onRemove(exam.selectionId)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="9" className="empty">No exams in this section.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
