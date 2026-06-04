export function enrichExam(exam, now = new Date()) {
  const date = exam.examDateTime ? new Date(exam.examDateTime) : null;
  const hasValidDate = date && !Number.isNaN(date.valueOf());
  const isCompleted = hasValidDate ? now > date : false;
  const daysRemaining = hasValidDate ? Math.ceil((date - now) / 86400000) : null;

  return {
    ...exam,
    status: isCompleted ? 'Completed' : 'Upcoming',
    daysRemaining,
    isSoon: hasValidDate && !isCompleted && daysRemaining <= 7,
    sortTime: hasValidDate ? date.getTime() : Number.POSITIVE_INFINITY,
    displayDateTime: hasValidDate
      ? new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(date)
      : 'Unknown'
  };
}

export function splitAndSortExams(exams, now = new Date()) {
  const enriched = exams.map((exam) => enrichExam(exam, now));

  return {
    upcoming: enriched
      .filter((exam) => exam.status === 'Upcoming')
      .sort((a, b) => a.sortTime - b.sortTime),
    completed: enriched
      .filter((exam) => exam.status === 'Completed')
      .sort((a, b) => b.sortTime - a.sortTime)
  };
}

export function formatDaysRemaining(value) {
  if (value === null || value === undefined) return 'Unknown';
  if (value < 0) return 'Done';
  if (value === 0) return 'Today';
  if (value === 1) return '1 day';
  return `${value} days`;
}
