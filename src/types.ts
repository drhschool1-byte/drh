export interface Subject {
  id: string;
  name: string;
  passingGrade: number; // درجة النجاح
}

export interface GradeSetting {
  id: string; // e.g. "1", "2", "3"
  gradeName: string; // e.g. "الصف الأول"
  subjects: Subject[];
}

export interface SubjectGradeComponents {
  monthly: number;   // درجات الاختبارات الشهرية (أو المحسوبة من سجل الشهور)
  midTerm: number;   // درجات نصف العام
  finalExam: number; // درجات آخر العام
  monthlyHistory?: { [monthName: string]: number }; // سجل درجات الاختبارات الشهرية التفصيلي لكل شهر
}

export interface Student {
  id: string;
  name: string; // اسم الطالب
  seatNumber: string; // رقم الجلوس
  grade: string; // معرف الصف
  subjectGrades: { [subjectId: string]: SubjectGradeComponents }; // درجات المواد
  totalPoints: number; // المجموع الكلي
  resultStatus: "ناجح" | "راسب" | "غائب"; // النتيجة الكلية
  reason: string; // تفاصيل الرسوب (أسباب)
  presentDays?: number; // عدد أيام الحضور
  absentDays?: number; // عدد أيام الغياب
  attendancePercentage?: number; // نسبة الحضور
}

export interface Teacher {
  id: string; // Auth UID
  name: string; // اسم المعلم
  email: string; // بريد المعلم
  grade: string; // الصف المخصص
}

export interface Admin {
  id: string;
  email: string;
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  studentName: string;
  seatNumber?: string;
  gradeId: string;
  complaintSubject: string;
  details: string;
  contactPhone?: string;
  date: string;
  status: string; // e.g. 'قيد المراجعة' | 'تم حلها'
  customFields?: { [fieldId: string]: any };
}

export interface NewStudentRegistration {
  id: string; // ID of the registration request
  studentName: string; // اسم الطالب بالكامل
  parentName: string; // اسم ولي الأمر
  gradeId: string; // معرف الصف المراد الالتحاق به
  birthDate: string; // تاريخ ميلاد الطالب
  nationalId: string; // الرقم القومي / رقم الهوية للطالب
  parentPhone: string; // رقم هاتف التواصل
  address: string; // العنوان السكني بالتفصيل
  gender: "ذكر" | "أنثى"; // الجنس
  submissionDate: string; // تاريخ تقديم الطلب
  status: "قيد المراجعة" | "مقبول مبدئياً" | "مرفوض"; // حالة الطلب
  notes?: string; // رد الإدارة / ملاحظات القبول والتسجيل
  customFields?: { [fieldId: string]: any };

  // New detailed educational and personal fields
  studentStatus: "طالب مستجد" | "طالب منقول من مدرسة أخرى" | "باقٍ للإعادة";
  birthPlace?: string; // مكان الميلاد (المحافظة والمديرية)
  nationality?: string; // الجنسية
  previousSchool?: string; // اسم المدرسة السابقة والمديرية المنقول منها
  lastGradeSuccess?: string; // آخر صف دراسي أتمه الطالب ومعدله الدراسي
  healthConditions?: string; // الحالات الصحية أو الإعاقات
  
  // Document Files (name, type, size, and base64 data)
  birthCertificateFile?: { name: string; type: string; size: number; data: string };
  parentNationalCardFile?: { name: string; type: string; size: number; data: string };
  previousGradesDocFile?: { name: string; type: string; size: number; data: string };
  studentPhotoFile?: { name: string; type: string; size: number; data: string };
}

export interface CustomFormField {
  id: string;
  section: 'registration' | 'complaints';
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
}

export type UserRole = "admin" | "teacher" | "student" | null;
