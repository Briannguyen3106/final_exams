import ExcelJS from 'exceljs';

export const DEFAULT_SESSION_MAPPING = {
  'Kip 1': '07:00',
  'Kip 2': '09:30',
  'Kip 3': '12:30',
  'Kip 4': '15:00',
  'Kip 5': '17:30'
};

export const FIELD_LABELS = {
  schoolFaculty: 'School/Faculty',
  classCode: 'Class Code',
  courseCode: 'Course Code',
  courseName: 'Course Name',
  notes: 'Notes',
  group: 'Group',
  examPeriod: 'Exam Period',
  week: 'Week',
  dayOfWeek: 'Day of Week',
  examDate: 'Exam Date',
  examSession: 'Exam Session',
  studentCount: 'Student Count',
  examRoom: 'Exam Room',
  examRoomCode: 'Exam Room/Class Code'
};

const FIELD_ALIASES = {
  schoolFaculty: ['truong khoa', 'truong/khoa', 'school faculty'],
  classCode: ['ma lop', 'class code'],
  courseCode: ['ma hoc phan', 'course code'],
  courseName: ['ten hoc phan', 'course name'],
  notes: ['ghi chu', 'notes'],
  group: ['nhom', 'group'],
  examPeriod: ['dot', 'exam period'],
  week: ['tuan', 'week'],
  dayOfWeek: ['thu', 'day of week'],
  examDate: ['ngay thi', 'exam date'],
  examSession: ['kip thi', 'exam session'],
  studentCount: ['so luong', 'student count'],
  examRoom: ['phong thi', 'exam room'],
  examRoomCode: ['ma lop thi', 'exam room class code', 'room code']
};

const REQUIRED_FIELDS = ['courseCode', 'courseName', 'examDate', 'examSession'];

export async function parseWorkbook(filePath, options = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    throw new Error('Invalid Excel file. Please upload a readable .xlsx file.');
  }

  if (!workbook.worksheets.length) {
    throw new Error('The Excel file does not contain any worksheets.');
  }

  const worksheet = workbook.worksheets[0];
  const worksheetName = worksheet.name;
  const rows = worksheetToRows(worksheet);

  if (!rows.length) {
    throw new Error('The first worksheet is empty.');
  }

  const detectedHeader = detectHeaderRow(rows);
  const headerRowIndex = Number.isInteger(options.headerRowIndex)
    ? options.headerRowIndex
    : detectedHeader.headerRowIndex;

  const headers = (rows[headerRowIndex] || []).map(formatCell);
  const detectedMapping = detectColumnMapping(headers);
  const columnMapping = { ...detectedMapping, ...(options.columnMapping || {}) };
  const missingRequired = REQUIRED_FIELDS.filter((field) => !isValidColumnIndex(columnMapping[field]));
  const sessionMapping = detectSessionMapping(rows[1]) || DEFAULT_SESSION_MAPPING;

  const dataRows = rows
    .slice(headerRowIndex + 1)
    .map((row, offset) => normalizeScheduleRow(row, {
      sourceRowNumber: headerRowIndex + offset + 2,
      headers,
      columnMapping,
      sessionMapping
    }))
    .filter((row) => hasMeaningfulScheduleData(row));

  return {
    worksheetName,
    headerRowIndex,
    detectedHeaderRowIndex: detectedHeader.headerRowIndex,
    headerConfidence: detectedHeader.confidence,
    headers,
    columnMapping,
    missingRequired,
    sessionMapping,
    sessionMappingDetected: Boolean(detectSessionMapping(rows[1])),
    previewRows: rows.slice(Math.max(0, headerRowIndex - 2), headerRowIndex + 8),
    rows: dataRows
  };
}

function normalizeScheduleRow(row, context) {
  const { sourceRowNumber, headers, columnMapping, sessionMapping } = context;
  const warnings = [];
  const raw = {};

  headers.forEach((header, index) => {
    if (header) raw[header] = cellToJsonSafe(row[index]);
  });

  const value = (field) => readMappedCell(row, columnMapping[field]);
  const examDateValue = value('examDate');
  const examSession = formatCell(value('examSession'));
  const sessionKey = normalizeSessionKey(examSession);
  const examTime = sessionMapping[sessionKey] || '';
  const parsedDate = parseExcelDate(examDateValue);

  if (!parsedDate) warnings.push('Exam date could not be parsed.');
  if (!examSession) warnings.push('Exam session is missing.');
  if (examSession && !examTime) warnings.push(`No time mapping found for ${examSession}.`);

  return {
    sourceRowNumber,
    schoolFaculty: formatCell(value('schoolFaculty')),
    classCode: formatCell(value('classCode')),
    courseCode: formatCell(value('courseCode')),
    courseName: formatCell(value('courseName')),
    notes: formatCell(value('notes')),
    group: formatCell(value('group')),
    examPeriod: formatCell(value('examPeriod')),
    week: formatCell(value('week')),
    dayOfWeek: formatCell(value('dayOfWeek')),
    examDateRaw: formatCell(examDateValue),
    examSession,
    studentCount: formatCell(value('studentCount')),
    examRoom: formatCell(value('examRoom')),
    examRoomCode: formatCell(value('examRoomCode')),
    examTime,
    examDateTime: parsedDate && examTime ? combineDateAndTime(parsedDate, examTime) : null,
    parseWarnings: warnings,
    raw
  };
}

function detectHeaderRow(rows) {
  let best = { headerRowIndex: 0, score: 0 };

  rows.slice(0, 40).forEach((row, index) => {
    const headers = row.map(formatCell);
    const mapping = detectColumnMapping(headers);
    const score = Object.values(mapping).filter(isValidColumnIndex).length;
    const requiredScore = REQUIRED_FIELDS.filter((field) => isValidColumnIndex(mapping[field])).length * 3;
    const total = score + requiredScore;

    if (total > best.score) best = { headerRowIndex: index, score: total };
  });

  return {
    headerRowIndex: best.headerRowIndex,
    confidence: Math.min(1, best.score / 20)
  };
}

function detectColumnMapping(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map(normalizeText);

  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => header === alias || header.includes(alias))
    );
    if (index >= 0) mapping[field] = index;
  });

  return mapping;
}

function detectSessionMapping(row = []) {
  const text = row.map(formatCell).filter(Boolean).join(' | ');
  const normalized = normalizeText(text).replaceAll('=', ' = ');
  const mapping = {};
  const regex = /kip\s*(\d+)\D+(\d{1,2})[:h](\d{2})/gi;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    mapping[`Kip ${match[1]}`] = `${match[2].padStart(2, '0')}:${match[3]}`;
  }

  return Object.keys(mapping).length ? mapping : null;
}

function parseExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number') {
    return excelSerialDateToDate(value);
  }

  const text = formatCell(value);
  if (!text) return null;

  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const year = normalizeYear(Number(dmy[3]));
    return new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const ymd = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.valueOf())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }

  return null;
}

function combineDateAndTime(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  return toLocalIso(combined);
}

function toLocalIso(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function normalizeSessionKey(value) {
  const match = normalizeText(value).match(/kip\s*(\d+)/i);
  return match ? `Kip ${match[1]}` : formatCell(value);
}

function worksheetToRows(worksheet) {
  const rows = [];
  const rowCount = Math.max(worksheet.actualRowCount || 0, worksheet.rowCount || 0);
  const columnCount = Math.max(worksheet.actualColumnCount || 0, worksheet.columnCount || 0);

  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      values.push(normalizeExcelCellValue(row.getCell(columnNumber).value));
    }
    rows.push(values);
  }

  return rows;
}

function normalizeExcelCellValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;
  if (value.text) return value.text;
  if (value.result !== undefined) return normalizeExcelCellValue(value.result);
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
  if (value.hyperlink && value.text) return value.text;
  return String(value);
}

function excelSerialDateToDate(serial) {
  if (!Number.isFinite(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function readMappedCell(row, index) {
  return isValidColumnIndex(index) ? row[index] : '';
}

function isValidColumnIndex(index) {
  return Number.isInteger(index) && index >= 0;
}

function hasMeaningfulScheduleData(row) {
  return Boolean(row.courseCode || row.courseName || row.examDateRaw || row.examSession);
}

function formatCell(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('vi-VN');
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return formatCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cellToJsonSafe(value) {
  if (value instanceof Date) return value.toISOString();
  return value ?? '';
}
