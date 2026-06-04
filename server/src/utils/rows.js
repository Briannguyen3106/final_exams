export function rowToDto(row) {
  if (!row) return null;

  return {
    id: row.id,
    uploadId: row.upload_id,
    sourceRowNumber: row.source_row_number,
    schoolFaculty: row.school_faculty,
    classCode: row.class_code,
    courseCode: row.course_code,
    courseName: row.course_name,
    notes: row.notes,
    group: row.course_group,
    examPeriod: row.exam_period,
    week: row.week,
    dayOfWeek: row.day_of_week,
    examDateRaw: row.exam_date_raw,
    examSession: row.exam_session,
    studentCount: row.student_count,
    examRoom: row.exam_room,
    examRoomCode: row.exam_room_code,
    examTime: row.exam_time,
    examDateTime: row.exam_datetime,
    parseWarnings: JSON.parse(row.parse_warnings_json || '[]'),
    raw: JSON.parse(row.raw_json || '{}')
  };
}

export function selectionToDto(row) {
  return {
    selectionId: row.selection_id,
    selectedAt: row.selected_at,
    ...rowToDto(row)
  };
}
