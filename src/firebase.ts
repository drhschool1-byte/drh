import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { Student, Teacher, GradeSetting, Subject, Complaint, NewStudentRegistration, CustomFormField, Supervisor } from './types';
import { convertArabicNumerals } from './utils';

// Check if we are running with placeholder values
export const isPlaceholder = 
  !firebaseConfig || 
  firebaseConfig.apiKey.includes('placeholder') || 
  firebaseConfig.projectId.includes('placeholder');

export let isSimulated = isPlaceholder;
export let initError: string | null = null;

let app;
let db: any;
let auth: any;

try {
  if (!isSimulated) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } else {
    console.warn("Using placeholder Firebase config. The app will simulate database operations using LocalStorage.");
  }
} catch (e) {
  console.error("Firebase initialization failed, falling back to simulation.", e);
  initError = e instanceof Error ? e.message : String(e);
  isSimulated = true;
}

// Error Logger standard following system skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation helper strictly as defined in firebase skill (Arabic RTL limits)
export function isValidStudentData(student: Partial<Student>): boolean {
  if (!student.name || student.name.length === 0 || student.name.length > 128) return false;
  if (!student.seatNumber || student.seatNumber.length === 0 || student.seatNumber.length > 64) return false;
  if (!student.grade || student.grade.length === 0) return false;
  return true;
}

// ==========================================
// SEED DATA FOR SIMULATED LOCAL DATA LAYER
// ==========================================
const DEFAULT_GRADE_SETTINGS: GradeSetting[] = [
  {
    id: "1",
    gradeName: "الصف الأول الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 }
    ]
  },
  {
    id: "2",
    gradeName: "الصف الثاني الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 }
    ]
  },
  {
    id: "3",
    gradeName: "الصف الثالث الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "التربية الاجتماعية", passingGrade: 50 }
    ]
  },
  {
    id: "4",
    gradeName: "الصف الرابع الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "التربية الاجتماعية", passingGrade: 50 }
    ]
  },
  {
    id: "5",
    gradeName: "الصف الخامس الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "الاجتماعيات", passingGrade: 50 }
    ]
  },
  {
    id: "6",
    gradeName: "الصف السادس الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "الاجتماعيات", passingGrade: 50 }
    ]
  },
  {
    id: "7",
    gradeName: "الصف السابع الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "english", name: "اللغة الإنجليزية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "الاجتماعيات", passingGrade: 50 }
    ]
  },
  {
    id: "8",
    gradeName: "الصف الثامن الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "english", name: "اللغة الإنجليزية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "الاجتماعيات", passingGrade: 50 }
    ]
  },
  {
    id: "9",
    gradeName: "الصف التاسع الأساسي",
    subjects: [
      { id: "quran", name: "القرآن الكريم وعلومه", passingGrade: 50 },
      { id: "islamic", name: "التربية الإسلامية", passingGrade: 50 },
      { id: "arabic", name: "اللغة العربية", passingGrade: 50 },
      { id: "english", name: "اللغة الإنجليزية", passingGrade: 50 },
      { id: "math", name: "الرياضيات", passingGrade: 50 },
      { id: "science", name: "العلوم", passingGrade: 50 },
      { id: "social", name: "الاجتماعيات", passingGrade: 50 }
    ]
  }
];

const DEFAULT_STUDENTS: Student[] = [
  {
    id: "stud_1",
    name: "أحمد محمد محمود علي",
    seatNumber: "1001",
    grade: "1",
    subjectGrades: {
      "quran": { monthly: 15, midTerm: 35, finalExam: 35 },
      "islamic": { monthly: 16, midTerm: 32, finalExam: 32 },
      "arabic": { monthly: 15, midTerm: 35, finalExam: 35 },
      "math": { monthly: 13, midTerm: 31, finalExam: 34 },
      "science": { monthly: 14, midTerm: 29, finalExam: 29 }
    },
    totalPoints: 405,
    resultStatus: "ناجح",
    reason: "ناجح لتجاوزه درجات النجاح في جميع المواد."
  },
  {
    id: "stud_2",
    name: "سارة محمود عبد الرحمن",
    seatNumber: "1002",
    grade: "1",
    subjectGrades: {
      "quran": { monthly: 19, midTerm: 38, finalExam: 38 },
      "islamic": { monthly: 17, midTerm: 34, finalExam: 34 },
      "arabic": { monthly: 19, midTerm: 38, finalExam: 38 },
      "math": { monthly: 17, midTerm: 35, finalExam: 36 },
      "science": { monthly: 18, midTerm: 36, finalExam: 36 }
    },
    totalPoints: 450,
    resultStatus: "ناجح",
    reason: "ناجح لتجاوزه درجات النجاح في جميع المواد."
  },
  {
    id: "stud_3",
    name: "يوسف إبراهيم خالد",
    seatNumber: "2001",
    grade: "2",
    subjectGrades: {
      "quran": { monthly: 14, midTerm: 28, finalExam: 28 },
      "islamic": { monthly: 12, midTerm: 24, finalExam: 24 },
      "arabic": { monthly: 14, midTerm: 28, finalExam: 28 },
      "math": { monthly: 8, midTerm: 17, finalExam: 17 },
      "science": { monthly: 11, midTerm: 22, finalExam: 22 }
    },
    totalPoints: 292,
    resultStatus: "راسب",
    reason: "راسب بسبب عدم الحصول على درجة النجاح في مادة: الرياضيات (الدرجة: 42 من 100)."
  },
  {
    id: "stud_4",
    name: "فاطمة الزهراء عادل حسني",
    seatNumber: "3001",
    grade: "3",
    subjectGrades: {
      "quran": { monthly: 20, midTerm: 39, finalExam: 39 },
      "islamic": { monthly: 18, midTerm: 38, finalExam: 38 },
      "arabic": { monthly: 20, midTerm: 39, finalExam: 39 },
      "math": { monthly: 19, midTerm: 40, finalExam: 40 },
      "science": { monthly: 19, midTerm: 38, finalExam: 39 },
      "social": { monthly: 18, midTerm: 38, finalExam: 38 }
    },
    totalPoints: 482,
    resultStatus: "ناجح",
    reason: "ناجح بتفوق ممتاز."
  }
];

const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: "teacher@school.com",
    name: "أستاذ حازم المنشاوي",
    email: "teacher@school.com",
    grade: "1"
  },
  {
    id: "teacher2@school.com",
    name: "أستاذة مروة الشافعي",
    email: "teacher2@school.com",
    grade: "2"
  }
];

const DEFAULT_REGISTRATIONS: NewStudentRegistration[] = [
  {
    id: "reg_1",
    studentName: "خالد وليد عبد العال صبحي",
    parentName: "وليد عبد العال صبحي",
    gradeId: "1",
    birthDate: "2020-03-12",
    nationalId: "32003120101234",
    parentPhone: "01011223344",
    address: "القاهرة، مصر الجديدة، ش الثورة - عمارة ٢٣",
    gender: "ذكر",
    submissionDate: "2026-06-05T10:00:00.000Z",
    status: "قيد المراجعة",
    notes: "",
    studentStatus: "طالب مستجد"
  },
  {
    id: "reg_2",
    studentName: "رنا سليم جلال حسني",
    parentName: "سليم جلال حسني",
    gradeId: "1",
    birthDate: "2020-08-25",
    nationalId: "32008250109876",
    parentPhone: "01234567890",
    address: "الإسكندرية، سموحة، شارع فوزي معاذ",
    gender: "أنثى",
    submissionDate: "2026-06-06T14:30:00.000Z",
    status: "مقبول مبدئياً",
    notes: "يرجى الحضور لمقر المدرسة بمصاحبة الملف الطبي وشهادة الميلاد للمقابلة الشخصية.",
    studentStatus: "طالب مستجد"
  }
];

// Initialize localStorage if keys not present or incomplete (less than 9 grades)
const storedGrades = localStorage.getItem('grade_settings');
if (!storedGrades || JSON.parse(storedGrades).length < 9) {
  localStorage.setItem('grade_settings', JSON.stringify(DEFAULT_GRADE_SETTINGS));
}
if (!localStorage.getItem('students')) {
  localStorage.setItem('students', JSON.stringify(DEFAULT_STUDENTS));
}
if (!localStorage.getItem('teachers')) {
  localStorage.setItem('teachers', JSON.stringify(DEFAULT_TEACHERS));
}
if (!localStorage.getItem('registrations')) {
  localStorage.setItem('registrations', JSON.stringify(DEFAULT_REGISTRATIONS));
}

// Local mock storage API handlers
const mockDb = {
  getGradeSettings: (): GradeSetting[] => {
    return JSON.parse(localStorage.getItem('grade_settings') || '[]');
  },
  saveGradeSettings: (settings: GradeSetting[]) => {
    localStorage.setItem('grade_settings', JSON.stringify(settings));
  },
  getStudents: (): Student[] => {
    return JSON.parse(localStorage.getItem('students') || '[]');
  },
  saveStudents: (students: Student[]) => {
    localStorage.setItem('students', JSON.stringify(students));
  },
  getTeachers: (): Teacher[] => {
    return JSON.parse(localStorage.getItem('teachers') || '[]');
  },
  saveTeachers: (teachers: Teacher[]) => {
    localStorage.setItem('teachers', JSON.stringify(teachers));
  },
  getSupervisors: (): Supervisor[] => {
    return JSON.parse(localStorage.getItem('supervisors') || '[]');
  },
  saveSupervisors: (supervisors: Supervisor[]) => {
    localStorage.setItem('supervisors', JSON.stringify(supervisors));
  }
};

// Calculate status based on grade configurations
export function calculateStudentResult(
  student: Omit<Student, 'id' | 'totalPoints' | 'resultStatus' | 'reason'>,
  gradeConfig: GradeSetting
): Pick<Student, 'totalPoints' | 'resultStatus' | 'reason'> {
  let totalPoints = 0;
  const failedSubjects: string[] = [];

  gradeConfig.subjects.forEach(subject => {
    // If we have a legacy flat number grade, convert it roughly, or handle as components
    const sGrades = student.subjectGrades[subject.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
    
    let monthly = 0;
    let midTerm = 0;
    let finalExam = 0;

    if (typeof sGrades === 'number') {
      const flatNum = sGrades;
      monthly = Math.round(flatNum * (40 / 190));
      midTerm = Math.round(flatNum * (50 / 190));
      finalExam = flatNum - (monthly + midTerm);
    } else {
      monthly = Number(sGrades.monthly || 0);
      midTerm = Number(sGrades.midTerm || 0);
      finalExam = Number(sGrades.finalExam || 0);
    }

    // Sum of all points is monthly + midTerm + finalExam
    totalPoints += (monthly + midTerm + finalExam);

    const monthlyFailed = monthly < 20;
    const midTermFailed = midTerm < 25;
    const finalExamFailed = finalExam < 50;

    if (monthlyFailed || midTermFailed || finalExamFailed) {
      const fails: string[] = [];
      if (monthlyFailed) fails.push(`الشهري: ${monthly}/40`);
      if (midTermFailed) fails.push(`نصف العام: ${midTerm}/50`);
      if (finalExamFailed) fails.push(`آخر العام: ${finalExam}/100`);
      failedSubjects.push(`${subject.name} (${fails.join(', ')})`);
    }
  });

  const isSubjectsPassed = failedSubjects.length === 0;

  let resultStatus: 'ناجح' | 'راسب' = 'ناجح';
  let reason = 'ناجح لتجاوزه جميع الاختبارات المستقلة بنجاح.';

  if (!isSubjectsPassed) {
    resultStatus = 'راسب';
    reason = `راسب بسبب عدم الحصول على درجة النجاح في الاختبارات التالية: ${failedSubjects.join(', ')}.`;
  }

  return {
    totalPoints,
    resultStatus,
    reason
  };
}

// General export wrapper to keep backend clean and support both Firebase & local storage seamlessly
export const dbService = {
  // Connection details
  getConnectionStatus() {
    return {
      isSimulated,
      initError,
      databaseId: firebaseConfig?.firestoreDatabaseId || 'default'
    };
  },

  setSimulated(val: boolean) {
    isSimulated = val;
  },

  // Test Firestore Connection
  async testConnection() {
    if (isSimulated) return true;
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
      return false;
    }
  },

  // Reset All Grade Settings & Students back to official ministry curriculum
  async resetGradeSettingsToMinistryOfficial(): Promise<void> {
    if (isSimulated) {
      mockDb.saveGradeSettings(DEFAULT_GRADE_SETTINGS);
      localStorage.setItem('students', JSON.stringify(DEFAULT_STUDENTS));
      return;
    }
    const path = 'grade_settings';
    try {
      for (const s of DEFAULT_GRADE_SETTINGS) {
        await setDoc(doc(db, path, s.id), s);
      }
      // Overwrite default students in Firestore too so that mock data looks perfect
      for (const stud of DEFAULT_STUDENTS) {
        await setDoc(doc(db, 'students', stud.id), stud);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  // 1. Grade Settings
  async getGradeSettings(): Promise<GradeSetting[]> {
    if (isSimulated) {
      // If mock db has old settings, make sure they are updated too
      const current = mockDb.getGradeSettings();
      const needsReset = current.length < 9 || current.some(g => g.id === "1" && g.subjects.some(s => s.id === "english"));
      if (needsReset) {
        mockDb.saveGradeSettings(DEFAULT_GRADE_SETTINGS);
        return DEFAULT_GRADE_SETTINGS;
      }
      return current;
    }
    const path = 'grade_settings';
    try {
      const q = collection(db, path);
      const snapshot = await getDocs(q);
      const settings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GradeSetting));
      
      // Check if they contain the old format or any mismatch compared to standard ministry curriculum
      const hasOldFormat = settings.some(g => {
        const defaultG = DEFAULT_GRADE_SETTINGS.find(d => d.id === g.id);
        if (!defaultG) return true;
        if (g.gradeName !== defaultG.gradeName) return true;
        if (g.subjects.length !== defaultG.subjects.length) return true;
        return g.subjects.some((sub, idx) => sub.id !== defaultG.subjects[idx]?.id);
      });

      if (settings.length < 9 || hasOldFormat) {
        const dummy = DEFAULT_GRADE_SETTINGS;
        try {
          for (const s of dummy) {
            await setDoc(doc(db, path, s.id), s);
          }
        } catch (writeErr) {
          console.warn("Seeding/updating grade_settings skipped (unauthorized write or offline):", writeErr);
        }
        return dummy;
      }
      return settings;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveGradeSetting(setting: GradeSetting): Promise<void> {
    if (isSimulated) {
      const settings = mockDb.getGradeSettings();
      const index = settings.findIndex(s => s.id === setting.id);
      if (index >= 0) settings[index] = setting;
      else settings.push(setting);
      mockDb.saveGradeSettings(settings);
      return;
    }
    const path = `grade_settings/${setting.id}`;
    try {
      await setDoc(doc(db, 'grade_settings', setting.id), setting);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteGradeSetting(id: string): Promise<void> {
    if (isSimulated) {
      const settings = mockDb.getGradeSettings();
      const filtered = settings.filter(s => s.id !== id);
      mockDb.saveGradeSettings(filtered);
      return;
    }
    const path = `grade_settings/${id}`;
    try {
      await deleteDoc(doc(db, 'grade_settings', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 2. Teachers
  async getTeachers(): Promise<Teacher[]> {
    if (isSimulated) {
      return mockDb.getTeachers();
    }
    const path = 'teachers';
    try {
      const snapshot = await getDocs(collection(db, path));
      const teachers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
      if (teachers.length === 0) {
        // Seeding
        const dummy = DEFAULT_TEACHERS;
        try {
          for (const t of dummy) {
            await setDoc(doc(db, path, t.id), t);
          }
        } catch (writeErr) {
          console.warn("Seeding teachers skipped (unauthorized write or offline):", writeErr);
        }
        return dummy;
      }
      return teachers;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveTeacher(teacher: Teacher): Promise<void> {
    if (isSimulated) {
      const teachers = mockDb.getTeachers();
      const index = teachers.findIndex(t => t.id === teacher.id);
      if (index >= 0) teachers[index] = teacher;
      else teachers.push(teacher);
      mockDb.saveTeachers(teachers);
      return;
    }
    const path = `teachers/${teacher.id}`;
    try {
      await setDoc(doc(db, 'teachers', teacher.id), teacher);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteTeacher(id: string): Promise<void> {
    if (isSimulated) {
      const teachers = mockDb.getTeachers();
      const filtered = teachers.filter(t => t.id !== id);
      mockDb.saveTeachers(filtered);
      return;
    }
    const path = `teachers/${id}`;
    try {
      await deleteDoc(doc(db, 'teachers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 3. Students
  async getStudents(): Promise<Student[]> {
    if (isSimulated) {
      return mockDb.getStudents();
    }
    const path = 'students';
    try {
      const snapshot = await getDocs(collection(db, path));
      const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      if (students.length === 0) {
        // Seed
        const dummy = DEFAULT_STUDENTS;
        try {
          for (const s of dummy) {
            await setDoc(doc(db, path, s.id), s);
          }
        } catch (writeErr) {
          console.warn("Seeding students skipped (unauthorized write or offline):", writeErr);
        }
        return dummy;
      }
      return students;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async getStudentsByGrade(grade: string): Promise<Student[]> {
    if (isSimulated) {
      return mockDb.getStudents().filter(s => s.grade === grade);
    }
    const path = 'students';
    try {
      const q = query(collection(db, path), where('grade', '==', grade));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async getStudentBySeatNumber(seatNumber: string): Promise<Student | null> {
    const rawSN = seatNumber.trim();
    const sN = convertArabicNumerals(rawSN);
    if (isSimulated) {
      const found = mockDb.getStudents().find(s => s.seatNumber === sN || s.seatNumber === rawSN);
      return found || null;
    }
    const path = 'students';
    try {
      // Try searching with normalized Western digits first
      let q = query(collection(db, path), where('seatNumber', '==', sN));
      let snapshot = await getDocs(q);
      
      // Fallback: search with raw input if different
      if (snapshot.empty && sN !== rawSN) {
        q = query(collection(db, path), where('seatNumber', '==', rawSN));
        snapshot = await getDocs(q);
      }
      
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Student;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  async saveStudent(student: Student): Promise<void> {
    if (!isValidStudentData(student)) {
      throw new Error("Student data is invalid or missing fields!");
    }
    if (isSimulated) {
      const students = mockDb.getStudents();
      const index = students.findIndex(s => s.id === student.id);
      if (index >= 0) students[index] = student;
      else students.push(student);
      mockDb.saveStudents(students);
      return;
    }
    const path = `students/${student.id}`;
    try {
      await setDoc(doc(db, 'students', student.id), student);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteStudent(id: string): Promise<void> {
    if (isSimulated) {
      const students = mockDb.getStudents();
      const filtered = students.filter(s => s.id !== id);
      mockDb.saveStudents(filtered);
      return;
    }
    const path = `students/${id}`;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 4. Complaints
  async getComplaints(): Promise<Complaint[]> {
    if (isSimulated) {
      return JSON.parse(localStorage.getItem('complaints') || '[]');
    }
    const path = 'complaints';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveComplaint(complaint: Complaint): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('complaints') || '[]');
      const index = list.findIndex((c: any) => c.id === complaint.id);
      if (index >= 0) list[index] = complaint;
      else list.push(complaint);
      localStorage.setItem('complaints', JSON.stringify(list));
      return;
    }
    const path = `complaints/${complaint.id}`;
    try {
      await setDoc(doc(db, 'complaints', complaint.id), complaint);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteComplaint(id: string): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('complaints') || '[]');
      const filtered = list.filter((c: any) => c.id !== id);
      localStorage.setItem('complaints', JSON.stringify(filtered));
      return;
    }
    const path = `complaints/${id}`;
    try {
      await deleteDoc(doc(db, 'complaints', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 5. New Student Registrations
  async getRegistrations(): Promise<NewStudentRegistration[]> {
    if (isSimulated) {
      return JSON.parse(localStorage.getItem('registrations') || '[]');
    }
    const path = 'registrations';
    try {
      const snapshot = await getDocs(collection(db, path));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NewStudentRegistration));
      if (list.length === 0) {
        // Seed initial registrations on live Firestore too if empty
        const dummy = DEFAULT_REGISTRATIONS;
        try {
          for (const r of dummy) {
            await setDoc(doc(db, path, r.id), r);
          }
        } catch (writeErr) {
          console.warn("Seeding initial registrations skipped:", writeErr);
        }
        return dummy;
      }
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveRegistration(reg: NewStudentRegistration): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('registrations') || '[]');
      const index = list.findIndex((r: any) => r.id === reg.id);
      if (index >= 0) list[index] = reg;
      else list.push(reg);
      localStorage.setItem('registrations', JSON.stringify(list));
      return;
    }
    const path = `registrations/${reg.id}`;
    try {
      await setDoc(doc(db, 'registrations', reg.id), reg);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteRegistration(id: string): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('registrations') || '[]');
      const filtered = list.filter((r: any) => r.id !== id);
      localStorage.setItem('registrations', JSON.stringify(filtered));
      return;
    }
    const path = `registrations/${id}`;
    try {
      await deleteDoc(doc(db, 'registrations', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 6. Custom dynamic form fields
  async getCustomFields(): Promise<CustomFormField[]> {
    if (isSimulated) {
      return JSON.parse(localStorage.getItem('custom_form_fields') || '[]');
    }
    const path = 'custom_form_fields';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomFormField));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveCustomField(field: CustomFormField): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('custom_form_fields') || '[]');
      const index = list.findIndex((f: any) => f.id === field.id);
      if (index >= 0) list[index] = field;
      else list.push(field);
      localStorage.setItem('custom_form_fields', JSON.stringify(list));
      return;
    }
    const path = `custom_form_fields/${field.id}`;
    try {
      await setDoc(doc(db, 'custom_form_fields', field.id), field);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteCustomField(id: string): Promise<void> {
    if (isSimulated) {
      const list = JSON.parse(localStorage.getItem('custom_form_fields') || '[]');
      const filtered = list.filter((f: any) => f.id !== id);
      localStorage.setItem('custom_form_fields', JSON.stringify(filtered));
      return;
    }
    const path = `custom_form_fields/${id}`;
    try {
      await deleteDoc(doc(db, 'custom_form_fields', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // 10. Supervisors
  async getSupervisors(): Promise<Supervisor[]> {
    if (isSimulated) {
      return mockDb.getSupervisors();
    }
    const path = 'supervisors';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Supervisor));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return [];
    }
  },

  async saveSupervisor(supervisor: Supervisor): Promise<void> {
    if (isSimulated) {
      const list = mockDb.getSupervisors();
      const index = list.findIndex(s => s.id === supervisor.id);
      if (index >= 0) list[index] = supervisor;
      else list.push(supervisor);
      mockDb.saveSupervisors(list);
      return;
    }
    const path = `supervisors/${supervisor.id}`;
    try {
      await setDoc(doc(db, 'supervisors', supervisor.id), supervisor);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  },

  async deleteSupervisor(id: string): Promise<void> {
    if (isSimulated) {
      const list = mockDb.getSupervisors();
      const filtered = list.filter(s => s.id !== id);
      mockDb.saveSupervisors(filtered);
      return;
    }
    const path = `supervisors/${id}`;
    try {
      await deleteDoc(doc(db, 'supervisors', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  async performSystemResetAndPromotion(): Promise<{ studentsProcessed: number; graduatesArchived: number }> {
    if (isSimulated) {
      const students = mockDb.getStudents();
      const updatedStudents: Student[] = [];
      const archivedStudents: any[] = [];
      let graduatesCount = 0;

      students.forEach(s => {
        const currentGradeNum = parseInt(s.grade || '1');
        const isPassed = s.resultStatus === "ناجح";

        if (currentGradeNum === 9 && isPassed) {
          archivedStudents.push({
            ...s,
            archiveStatus: "خريج",
            archivedAt: new Date().toISOString()
          });
          graduatesCount++;
        } else {
          let nextGrade = s.grade;
          let reasonStr = "باقٍ للإعادة في نفس الصف للعام الدراسي الجديد";
          if (isPassed && currentGradeNum < 9) {
            nextGrade = String(currentGradeNum + 1);
            reasonStr = "تم ترحيله وترقيته تلقائياً للعام الدراسي الجديد";
          }
          updatedStudents.push({
            ...s,
            grade: nextGrade,
            subjectGrades: {},
            totalPoints: 0,
            resultStatus: "ناجح",
            reason: reasonStr,
            presentDays: 0,
            absentDays: 0,
            attendancePercentage: 100
          } as any);
        }
      });

      mockDb.saveStudents(updatedStudents);
      const existingArchived = JSON.parse(localStorage.getItem('archived_students') || '[]');
      localStorage.setItem('archived_students', JSON.stringify([...existingArchived, ...archivedStudents]));
      
      // Delete complaints
      localStorage.setItem('complaints', JSON.stringify([]));
      
      return {
        studentsProcessed: updatedStudents.length,
        graduatesArchived: graduatesCount
      };
    }

    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsList = studentsSnap.docs;
      
      let studentsProcessed = 0;
      let graduatesArchived = 0;
      
      let batch = writeBatch(db);
      let opCount = 0;

      for (const studentDoc of studentsList) {
        const s = studentDoc.data() as Student;
        const currentGradeNum = parseInt(s.grade || '1');
        const isPassed = s.resultStatus === "ناجح";

        if (currentGradeNum === 9 && isPassed) {
          const archiveRef = doc(collection(db, "archived_students"), studentDoc.id);
          batch.set(archiveRef, {
            ...s,
            archiveStatus: "خريج",
            archivedAt: new Date().toISOString()
          });
          
          const studentRef = doc(collection(db, "students"), studentDoc.id);
          batch.delete(studentRef);
          
          graduatesArchived++;
          opCount += 2;
        } else {
          let nextGrade = s.grade;
          let reasonStr = "باقٍ للإعادة في نفس الصف للعام الدراسي الجديد";
          if (isPassed && currentGradeNum < 9) {
            nextGrade = String(currentGradeNum + 1);
            reasonStr = "تم ترحيله وترقيته تلقائياً للعام الدراسي الجديد";
          }
          
          const studentRef = doc(collection(db, "students"), studentDoc.id);
          batch.update(studentRef, {
            grade: nextGrade,
            subjectGrades: {},
            totalPoints: 0,
            resultStatus: "ناجح",
            reason: reasonStr,
            presentDays: 0,
            absentDays: 0,
            attendancePercentage: 100
          });
          
          studentsProcessed++;
          opCount += 1;
        }

        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      // Purge complaints as well
      const complaintsSnap = await getDocs(collection(db, "complaints"));
      for (const complaintDoc of complaintsSnap.docs) {
        batch.delete(complaintDoc.ref);
        opCount++;
        
        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      return {
        studentsProcessed,
        graduatesArchived
      };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "students/bulk-reset");
      throw e;
    }
  }
};

// Export fallback or real auth methods
export const authService = {
  isPlaceholder: isSimulated,
  isSimulated,
  
  async signInWithGoogle() {
    if (isSimulated) {
      // Simulate Google Auth
      return {
        user: {
          uid: 'admin_demo_uid',
          email: 'drhschool1@gmail.com',
          displayName: 'المدير العام (drhschool1)',
          emailVerified: true
        }
      };
    }
    try {
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  async signInWithEmail(email: string, pass: string) {
    if (isSimulated) {
      const trimmedEmail = email.trim().toLowerCase();
      const supervisors = mockDb.getSupervisors();
      const matchingSupervisor = supervisors.find(s => s.email.trim().toLowerCase() === trimmedEmail);

      if (email === 'admin@school.com' || email === 'salemjalaal1@gmail.com' || email === 'drhschool1@gmail.com' || email === 'admin') {
        return {
          user: {
            uid: 'admin_demo_uid',
            email: 'drhschool1@gmail.com',
            displayName: 'المدير العام المعتمد',
            emailVerified: true
          }
        };
      } else if (matchingSupervisor) {
        return {
          user: {
            uid: matchingSupervisor.id,
            email: matchingSupervisor.email,
            displayName: `${matchingSupervisor.name} (مشرف مسجل)`,
            emailVerified: true
          }
        };
      }
      throw new Error("Invalid local credentials");
    }
    try {
      return await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      console.error("Firebase auth email sign in error:", e);
      throw e;
    }
  },

  async logout() {
    if (isSimulated) {
      return;
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  },

  onAuthStateChanged(callback: (user: any | null) => void) {
    if (isSimulated) {
      // Return unregister function
      callback(null);
      return () => {};
    }
    return auth.onAuthStateChanged(callback);
  }
};
