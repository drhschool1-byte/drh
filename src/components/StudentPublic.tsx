import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Calendar, 
  HelpCircle, 
  Award, 
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Send,
  Printer,
  UserPlus
} from 'lucide-react';
import { Student, GradeSetting, Subject, NewStudentRegistration, CustomFormField } from '../types';
import { dbService, authService } from '../firebase';
import { matchArabicSearch, convertArabicNumerals } from '../utils';
import { AppCard, ResultBadge, HeroBanner } from './UI';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CertificatePdf } from './Certificate';

// Canvas-based image compressor to safe-guard Firestore document sizes (< 100KB)
const compressImageToBase64 = (file: File, callback: (base64: string) => void) => {
  if (file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 800; // Optimal for high fidelity screen legibility and tiny sizes
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      } else {
        callback(event.target?.result as string);
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

interface FileUploaderProps {
  label: string;
  required?: boolean;
  accept: string;
  fileValue: { name: string, type: string, size: number, data: string } | null;
  onFileChange: (file: { name: string, type: string, size: number, data: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ label, required, accept, fileValue, onFileChange, disabled, placeholder }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFile = (file: File) => {
    setLoading(true);
    compressImageToBase64(file, (base64) => {
      onFileChange({
        name: file.name,
        type: file.type,
        size: Math.round(base64.length * 0.75),
        data: base64
      });
      setLoading(false);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {fileValue ? (
        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-right">
          <div className="flex items-center gap-2">
            {fileValue.type.startsWith('image/') ? (
              <img src={fileValue.data} referrerPolicy="no-referrer" alt={fileValue.name} className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm" />
            ) : (
              <div className="w-10 h-10 p-2 text-rose-500 bg-rose-50 rounded-lg border border-rose-200 flex items-center justify-center font-extrabold text-[10px]">PDF</div>
            )}
            <div className="text-right">
              <p className="font-semibold text-slate-800 text-xs text-ellipsis overflow-hidden max-w-[200px] sm:max-w-xs">{fileValue.name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{(fileValue.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="p-1 px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer"
          >
            حذف
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center min-h-[110px] ${
            disabled 
              ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70' 
              : isDragActive 
              ? 'border-[#0e9e9e] bg-[#0e9e9e]/5 scale-[0.99]' 
              : 'border-slate-300 hover:border-[#0e9e9e] bg-slate-50/50'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-1">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0e9e9e] border-t-transparent" />
              <p className="text-xs text-slate-500 font-semibold mt-1">جاري ضغط ومعالجة المستند...</p>
            </div>
          ) : (
            <>
              <UserPlus className="w-6 h-6 text-slate-400 mb-1 animate-pulse" />
              <p className="text-xs font-bold text-slate-600 mt-1">{placeholder || "اسحب وأفلت الملف هنا أو انقر للاختيار"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">الحد الأقصى للملف: 10ميجا (صور JPG/PNG أو ملفات PDF)</p>
              <input
                type="file"
                accept={accept}
                disabled={disabled}
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helpers to calculate decoupled stage-specific points and passing status
const getStudentStageScore = (
  student: Student,
  gradeConfig: GradeSetting,
  subTab: 'half' | 'final' | 'monthly',
  selectedMonth: string
): number => {
  let scoreSum = 0;
  gradeConfig.subjects.forEach(sub => {
    const sGrades = student.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
    let monthly = 0;
    let midTerm = 0;
    let finalExam = 0;
    const history = (sGrades && typeof sGrades === 'object' && (sGrades as any).monthlyHistory) || {};

    if (typeof sGrades === 'number') {
      const flatNum = sGrades;
      monthly = Math.round(flatNum * 0.4);
      midTerm = Math.round(flatNum * 0.5);
      finalExam = Math.round(flatNum * 1.0);
    } else {
      monthly = Number(sGrades.monthly || 0);
      midTerm = Number(sGrades.midTerm || 0);
      finalExam = Number(sGrades.finalExam || 0);
    }

    if (subTab === 'monthly') {
      if (selectedMonth !== 'all') {
        if (history[selectedMonth] !== undefined) {
          scoreSum += Number(history[selectedMonth]);
        } else if (Object.keys(history).length === 0) {
          scoreSum += monthly;
        }
      } else {
        scoreSum += monthly;
      }
    } else if (subTab === 'half') {
      scoreSum += midTerm;
    } else {
      scoreSum += finalExam;
    }
  });
  return scoreSum;
};

const getStudentStageStatus = (
  student: Student,
  gradeConfig: GradeSetting,
  subTab: 'half' | 'final' | 'monthly',
  selectedMonth: string
): { isPassed: boolean; failedSubjectsList: string[] } => {
  const failedSubjectsList: string[] = [];
  let isPassed = true;

  gradeConfig.subjects.forEach(sub => {
    const sGrades = student.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
    let monthly = 0;
    let midTerm = 0;
    let finalExam = 0;
    const history = (sGrades && typeof sGrades === 'object' && (sGrades as any).monthlyHistory) || {};

    if (typeof sGrades === 'number') {
      const flatNum = sGrades;
      monthly = Math.round(flatNum * 0.4);
      midTerm = Math.round(flatNum * 0.5);
      finalExam = Math.round(flatNum * 1.0);
    } else {
      monthly = Number(sGrades.monthly || 0);
      midTerm = Number(sGrades.midTerm || 0);
      finalExam = Number(sGrades.finalExam || 0);
    }

    let val = 0;
    let threshold = 50;

    if (subTab === 'monthly') {
      if (selectedMonth !== 'all') {
        if (history[selectedMonth] !== undefined) {
          val = Number(history[selectedMonth]);
        } else if (Object.keys(history).length === 0) {
          val = monthly;
        } else {
          val = 0;
        }
      } else {
        val = monthly;
      }
      threshold = 20; // Passing grade for monthly
    } else if (subTab === 'half') {
      val = midTerm;
      threshold = 25; // Passing grade for Midterm
    } else {
      val = finalExam;
      threshold = 50; // Passing grade for Final
    }

    if (val < threshold) {
      isPassed = false;
      failedSubjectsList.push(`${sub.name} (حقق: ${val} د من أصل درجة النجاح ${threshold})`);
    }
  });

  return { isPassed, failedSubjectsList };
};

export const StudentPublic: React.FC = () => {
  // Navigation tabs for student views
  const [activeSubTab, setActiveSubTab] = useState<'half' | 'final' | 'monthly' | 'complaints' | 'registration'>('half');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [grades, setGrades] = useState<GradeSetting[]>([]);
  const [searchResult, setSearchResult] = useState<Student | null>(null);
  const [selectedSearchMonth, setSelectedSearchMonth] = useState<string>('all');
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);

  // Custom Form Fields configurations
  const [customFields, setCustomFields] = useState<CustomFormField[]>([]);
  const [complaintCustomValues, setComplaintCustomValues] = useState<{ [fieldId: string]: any }>({});
  const [registrationCustomValues, setRegistrationCustomValues] = useState<{ [fieldId: string]: any }>({});

  // Registration state
  const [regForm, setRegForm] = useState({
    studentName: '',
    parentName: '',
    gradeId: '',
    birthDate: '',
    nationalId: '',
    parentPhone: '',
    address: '',
    gender: 'ذكر' as 'ذكر' | 'أنثى',
    studentStatus: 'طالب مستجد' as 'طالب مستجد' | 'طالب منقول من مدرسة أخرى' | 'باقٍ للإعادة',
    birthPlace: '',
    nationality: 'يمني',
    previousSchool: '',
    lastGradeSuccess: '',
    healthConditions: ''
  });

  const [birthCertificateFile, setBirthCertificateFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [parentNationalCardFile, setParentNationalCardFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [previousGradesDocFile, setPreviousGradesDocFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [studentPhotoFile, setStudentPhotoFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);

  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsub = authService.onAuthStateChanged((u: any) => {
      setAuthUser(u);
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  const handlePortalGoogleSignIn = async () => {
    try {
      setRegError('');
      await authService.signInWithGoogle();
    } catch (err: any) {
      console.error("Auth sign in error:", err);
      setRegError('فشل تسجيل الدخول باستخدام حساب Google لمتابعة رفع الملفات والبيانات.');
    }
  };

  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [registeredId, setRegisteredId] = useState('');

  // Search registration state
  const [searchRegQuery, setSearchRegQuery] = useState('');
  const [searchRegResult, setSearchRegResult] = useState<NewStudentRegistration[]>([]);
  const [searchedReg, setSearchedReg] = useState(false);

  // Complaints state
  const [complaintForm, setComplaintForm] = useState({
    studentName: '',
    gradeId: '',
    complaintSubject: 'درجات مادة معينة',
    details: '',
    contactPhone: ''
  });
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [studentRank, setStudentRank] = useState<number | null>(null);
  const [totalClassStudents, setTotalClassStudents] = useState<number>(0);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await dbService.getGradeSettings();
        setGrades(data);
        
        const fields = await dbService.getCustomFields();
        setCustomFields(fields);

        const allStds = await dbService.getStudents();
        setAllStudents(allStds);
      } catch (err) {
        console.error("Failed loading grades config from Cloud:", err);
        // Fallback to local storage or mocked settings
        setGrades(JSON.parse(localStorage.getItem('grade_settings') || '[]'));
        setCustomFields(JSON.parse(localStorage.getItem('custom_form_fields') || '[]'));
        setAllStudents(JSON.parse(localStorage.getItem('students') || '[]'));
      }
    }
    loadConfig();
  }, []);

  // Recalculate rank and totals dynamically based on the active tab/month and selected grade
  useEffect(() => {
    if (!searchResult || !allStudents.length || !grades.length) {
      setStudentRank(null);
      setTotalClassStudents(0);
      return;
    }

    const activeGrade = grades.find(g => g.id === searchResult.grade);
    if (!activeGrade) {
      setStudentRank(null);
      setTotalClassStudents(0);
      return;
    }

    const stage = activeSubTab === 'monthly' || activeSubTab === 'half' || activeSubTab === 'final' ? activeSubTab : 'final';

    // Helper to check if a student passed in this style/stage
    const sPassed = (std: Student) => {
      if (std.resultStatus === 'غائب') return false;
      if (std.resultStatus === 'ناجح') return true;
      const statusInfo = getStudentStageStatus(std, activeGrade, stage as any, selectedSearchMonth);
      return statusInfo.isPassed;
    };

    // If the searched student did not pass in this stage, do not show rank!
    if (!sPassed(searchResult)) {
      setStudentRank(null);
      setTotalClassStudents(0);
      return;
    }

    // Filter students belonging to the same grade and who are passing in this specific evaluation stage
    const classStudents = allStudents.filter(s => s.grade === searchResult.grade && sPassed(s));

    // Sort them based on the active tab's points
    const pointsMap = new Map<string, number>();
    classStudents.forEach(s => {
      let total = 0;
      activeGrade.subjects.forEach(sub => {
        const sGrades = s.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
        let monthly = 0;
        let midTerm = 0;
        let finalExam = 0;
        const history = (sGrades && typeof sGrades === 'object' && (sGrades as any).monthlyHistory) || {};

        if (typeof sGrades === 'number') {
          const flatNum = sGrades;
          monthly = Math.round(flatNum * 0.4);
          midTerm = Math.round(flatNum * 0.5);
          finalExam = Math.round(flatNum * 1.0);
        } else {
          monthly = Number(sGrades.monthly || 0);
          midTerm = Number(sGrades.midTerm || 0);
          finalExam = Number(sGrades.finalExam || 0);
        }

        if (activeSubTab === 'monthly') {
          if (selectedSearchMonth !== 'all') {
            if (history[selectedSearchMonth] !== undefined) {
              total += Number(history[selectedSearchMonth]);
            } else if (Object.keys(history).length === 0) {
              total += monthly;
            } else {
              total += 0;
            }
          } else {
            total += monthly;
          }
        } else if (activeSubTab === 'half') {
          total += midTerm;
        } else {
          total += finalExam;
        }
      });
      pointsMap.set(s.id, total);
    });

    // Sort students by calculated points descending
    const sorted = [...classStudents].sort((a, b) => {
      const scoreA = pointsMap.get(a.id) || 0;
      const scoreB = pointsMap.get(b.id) || 0;
      return scoreB - scoreA;
    });

    const rankPos = sorted.findIndex(s => s.id === searchResult.id) + 1;
    setStudentRank(rankPos > 0 ? rankPos : null);
    setTotalClassStudents(sorted.length);
  }, [searchResult, activeSubTab, selectedSearchMonth, allStudents, grades]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setSearchError('');
    setSearchResult(null);

    const q = searchQuery.trim();
    if (!q) {
      setSearchError('يرجى كتابة اسم الطالب أو الرقم المدرسي أولاً.');
      return;
    }

    try {
      // Try finding by seat number first (using converted numerals)
      let foundStudent = await dbService.getStudentBySeatNumber(q);
      const allStds = await dbService.getStudents();
      setAllStudents(allStds);

      // If not found, look up by name in the complete list with smart Arabic matching
      if (!foundStudent) {
        foundStudent = allStds.find(
          s => matchArabicSearch(s.name, q) && 
          (selectedGradeId ? s.grade === selectedGradeId : true)
        ) || null;
      }

      if (foundStudent) {
        // Check if student belongs to selected grade if any
        if (selectedGradeId && foundStudent.grade !== selectedGradeId) {
          setSearchError('لم يتم العثور على طالب بهذا الاسم في الصف المحدد.');
        } else {
          setSearchResult(foundStudent);
        }
      } else {
        setSearchError('لم يتم العثور على أي نتائج مطابقة للرقم المدرسي أو اسم الطالب.');
      }
    } catch (err: any) {
      console.error("Error searching in Cloud:", err);
      
      // Fallback local search
      try {
        const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
        setAllStudents(localStudents);
        const normalizedQ = q.trim();
        const convertedQ = convertArabicNumerals(normalizedQ);
        
        const foundStudent = localStudents.find(
          (s: any) => (s.seatNumber === convertedQ || s.seatNumber === normalizedQ || matchArabicSearch(s.name, q)) && 
          (selectedGradeId ? s.grade === selectedGradeId : true)
        );
        
        if (foundStudent) {
          setSearchResult(foundStudent);
          setSearchError(''); // Clear error if found locally
        } else {
          setSearchError('حدث خطأ أثناء الاتصال بالسحابة الإلكترونية، ولم يتم العثور على الطالب محلياً أيضاً.');
        }
      } catch (fallbackErr) {
        console.error("LocalStorage fallback failed", fallbackErr);
        setSearchError('حدث خطأ أثناء الاتصال بالسحابة وتحميل البيانات.');
      }
    }
  };

  const resetSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearched(false);
    setSearchError('');
    setSelectedSearchMonth('all');
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.studentName || !complaintForm.details || !complaintForm.gradeId) {
      alert('يرجى ملء جميع الحقول المطلوبة واختيار الصف الدراسي لصاحب الشكوى.');
      return;
    }

    // Validate custom fields
    const compFields = customFields.filter(f => f.section === 'complaints');
    for (const f of compFields) {
      if (f.required && (complaintCustomValues[f.id] === undefined || complaintCustomValues[f.id] === '')) {
        alert(`يرجى ملء الحقل المطلوب: ${f.label}`);
        return;
      }
    }

    try {
      const newComplaint = {
        id: "comp_" + Date.now(),
        studentName: complaintForm.studentName.trim(),
        gradeId: complaintForm.gradeId,
        complaintSubject: complaintForm.complaintSubject,
        details: complaintForm.details.trim(),
        contactPhone: complaintForm.contactPhone.trim(),
        date: new Date().toISOString(),
        status: 'قيد المراجعة',
        customFields: complaintCustomValues
      };

      await dbService.saveComplaint(newComplaint);

      setComplaintSuccess(true);
      setComplaintCustomValues({});
      setComplaintForm({
        studentName: '',
        gradeId: '',
        complaintSubject: 'درجات مادة معينة',
        details: '',
        contactPhone: ''
      });

      setTimeout(() => {
        setComplaintSuccess(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الشكوى أو طلب التظلم. يرجى المحاولة لاحقاً.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);
    setRegSubmitting(true);

    const sName = regForm.studentName.trim();
    const pName = regForm.parentName.trim();
    const pPhone = regForm.parentPhone.trim();
    const natId = regForm.nationalId.trim();

    if (!sName || !pName || !pPhone || !regForm.gradeId || !regForm.birthDate || !natId || !regForm.address.trim()) {
      setRegError('يرجى ملء جميع الحقول المطلوبة المميزة بنجمة (*).');
      setRegSubmitting(false);
      return;
    }

    if (natId.length < 10) {
      setRegError('الرقم القومي / رقم الهوية يجب أن لا يقل عن 10 خانات.');
      setRegSubmitting(false);
      return;
    }

    // Validate registration custom fields
    const regFields = customFields.filter(f => f.section === 'registration');
    for (const f of regFields) {
      if (f.required && (registrationCustomValues[f.id] === undefined || registrationCustomValues[f.id] === '')) {
        setRegError(`يرجى ملء الحقل المطلوب: ${f.label}`);
        setRegSubmitting(false);
        return;
      }
    }

    const newId = 'reg_' + Date.now();
    const payload: NewStudentRegistration = {
      id: newId,
      studentName: sName,
      parentName: pName,
      gradeId: regForm.gradeId,
      birthDate: regForm.birthDate,
      nationalId: natId,
      parentPhone: pPhone,
      address: regForm.address.trim(),
      gender: regForm.gender,
      submissionDate: new Date().toISOString(),
      status: 'قيد المراجعة',
      notes: '',
      customFields: registrationCustomValues,

      // New educational and personal fields
      studentStatus: regForm.studentStatus,
      birthPlace: regForm.birthPlace.trim() || undefined,
      nationality: regForm.nationality.trim() || 'يمني',
      previousSchool: regForm.studentStatus === 'طالب منقول من مدرسة أخرى' ? regForm.previousSchool.trim() : undefined,
      lastGradeSuccess: regForm.studentStatus === 'طالب منقول من مدرسة أخرى' ? regForm.lastGradeSuccess.trim() : undefined,
      healthConditions: regForm.healthConditions.trim() || undefined,

      // Document Files
      birthCertificateFile: birthCertificateFile || undefined,
      parentNationalCardFile: parentNationalCardFile || undefined,
      previousGradesDocFile: previousGradesDocFile || undefined,
      studentPhotoFile: studentPhotoFile || undefined
    };

    try {
      await dbService.saveRegistration(payload);
      setRegisteredId(newId);
      setRegSuccess(true);
      setRegistrationCustomValues({});
      
      // Reset attachment files
      setBirthCertificateFile(null);
      setParentNationalCardFile(null);
      setPreviousGradesDocFile(null);
      setStudentPhotoFile(null);

      // Reset form
      setRegForm({
        studentName: '',
        parentName: '',
        gradeId: '',
        birthDate: '',
        nationalId: '',
        parentPhone: '',
        address: '',
        gender: 'ذكر',
        studentStatus: 'طالب مستجد',
        birthPlace: '',
        nationality: 'يمني',
        previousSchool: '',
        lastGradeSuccess: '',
        healthConditions: ''
      });
    } catch (err: any) {
      console.error("Error submitting registration:", err);
      setRegError('تعذر تقديم طلب التسجيل في الوقت الحالي. يرجى مراجعة الاتصال بالسحابة وإعادة المحاولة.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleSearchReg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedReg(true);
    setSearchRegResult([]);
    const q = searchRegQuery.trim();
    if (!q) return;

    try {
      const list = await dbService.getRegistrations();
      const matches = list.filter(r => 
        matchArabicSearch(r.studentName, q) || 
        r.nationalId.includes(q) || 
        r.parentPhone.includes(q) || 
        r.id === q
      );
      setSearchRegResult(matches);
    } catch (err) {
      console.error("Error searching registrations:", err);
    }
  };

  // Helper to extract active grade configuration matching found student
  const activeGradeConfig = grades.find(g => g.id === searchResult?.grade);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Dynamic welcome top advertisement */}
      <HeroBanner />

      {/* Internal Tab selectors for student operations */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-md border border-slate-200">
        <button
          onClick={() => { setActiveSubTab('half'); resetSearch(); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSubTab === 'half'
              ? 'bg-[#0d2b45] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
          }`}
        >
          <FileText className="w-4 h-4 text-[#c9a227]" />
          درجات نصف العام
        </button>

        <button
          onClick={() => { setActiveSubTab('final'); resetSearch(); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSubTab === 'final'
              ? 'bg-[#0d2b45] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
          }`}
        >
          <Award className="w-4 h-4 text-[#c9a227]" />
          درجات آخر العام
        </button>

        <button
          onClick={() => { setActiveSubTab('monthly'); resetSearch(); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSubTab === 'monthly'
              ? 'bg-[#0d2b45] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#c9a227]" />
          نتائج الاختبارات الشهرية
        </button>

        <button
          onClick={() => { setActiveSubTab('complaints'); resetSearch(); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSubTab === 'complaints'
              ? 'bg-[#0e9e9e] text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 cursor-pointer'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-white" />
          البوابة الذكية للشكاوى والتظلمات
        </button>

        <button
          onClick={() => { setActiveSubTab('registration'); resetSearch(); }}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
            activeSubTab === 'registration'
              ? 'bg-[#c9a227] text-[#0d2b45] shadow-md font-extrabold'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 cursor-pointer'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          تقديم وتسجيل الطلاب الجدد
        </button>
      </div>

      {(activeSubTab === 'half' || activeSubTab === 'final' || activeSubTab === 'monthly') && (
        <div className="space-y-6">
          {/* Main search form */}
          <AppCard 
            title={
              activeSubTab === 'half'
                ? 'الاستعلام الفوري عن نتيجة نصف العام'
                : activeSubTab === 'final'
                ? 'الاستعلام الفوري عن نتيجة اختبارات آخر العام'
                : 'الاستعلام الفوري عن كشف الاختبارات الشهرية'
            }
            icon={<Search className="w-6 h-6" />}
          >
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                {/* Search Text Input */}
                <div className={`${activeSubTab === 'monthly' ? 'md:col-span-5' : 'md:col-span-6'} space-y-2`}>
                  <label id="lbl-search" className="block text-sm font-semibold text-slate-700">
                    الرقم المدرسي أو اسم الطالب بالكامل: <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="txt-search"
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="أدخل اسم الطالب ثلاثي مثلاً (أحمد محمد) أو الرقم المدرسي المكون من أرقام"
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0e9e9e] focus:border-transparent text-right font-medium"
                    />
                    <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Grade selection filter */}
                <div className={`${activeSubTab === 'monthly' ? 'md:col-span-3' : 'md:col-span-4'} space-y-2`}>
                  <label id="lbl-grade" className="block text-sm font-semibold text-slate-700">
                    تصفية حسب الصف الدراسي: <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <select
                    id="sel-grade"
                    value={selectedGradeId}
                    onChange={(e) => setSelectedGradeId(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0e9e9e] text-right text-sm"
                  >
                    <option value="">كل الصفوف الدراسية</option>
                    {grades.map(grade => (
                      <option key={grade.id} value={grade.id}>{grade.gradeName}</option>
                    ))}
                  </select>
                </div>

                {/* Month filter (only for monthly queries) */}
                {activeSubTab === 'monthly' && (
                  <div className="md:col-span-2 space-y-2 animate-fade-in">
                    <label id="lbl-search-month" className="block text-sm font-semibold text-slate-700">
                      اختر الشهر: <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="sel-search-month"
                      value={selectedSearchMonth}
                      onChange={(e) => setSelectedSearchMonth(e.target.value)}
                      className="w-full px-2 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0e9e9e] text-right font-bold text-slate-800 text-sm"
                    >
                      <option value="all">الدرجة الكلية المعتمدة</option>
                      {['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Submit button */}
                <div className="md:col-span-2">
                  <button
                    id="btn-submit"
                    type="submit"
                    className="w-full py-3 bg-[#0d2b45] text-white font-bold rounded-xl hover:bg-[#0e9e9e] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Search className="w-4 h-4" />
                    استعلم الآن
                  </button>
                </div>

              </div>
              <p className="text-xs text-brand-teal font-medium mt-1">تنبيه: يمكنك استخدام الاسم للبحث أيضاً للتسهيل على أولياء الأمور والطلاب.</p>
            </form>
          </AppCard>

          {/* Search Result view */}
          {searched && (
            <div className="animate-fade-in space-y-6">
              {searchError && (
                <div className="p-4 bg-red-50 border-r-4 border-red-500 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-800">تنبيه: لم تنجح عملية البحث</h4>
                    <p className="text-sm text-red-700 mt-1">{searchError}</p>
                  </div>
                </div>
              )}

              {searchResult && activeGradeConfig && (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                  
                  {/* Decorative Banner Certificate Header */}
                  <div className="bg-[#0d2b45] p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-b-4 border-[#c9a227]">
                    <div className="text-right">
                      <span className="bg-[#c9a227] text-[#0d2b45] px-3 py-1 rounded-full text-xs font-black mb-2 inline-block">
                        الجمهورية العربية - وثيقة رسمية
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black">
                        {activeSubTab === 'half'
                          ? 'كشف درجات اختبارات نصف العام الدراسي'
                          : activeSubTab === 'final'
                          ? 'كشف درجات اختبارات آخر العام الدراسي'
                          : 'كشف درجات الاختبارات الشهرية والتحصيل والمواظبة السلوكية'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300 mt-1">
                        بيانات التحصيل العلمي وتقويم الأداء لعام ٢٠٢٥ / ٢٠٢٦
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Student Metadata Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <p className="text-xs text-gray-500">اسم الطالب</p>
                        <p className="text-base font-bold text-slate-800">{searchResult.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">الرقم المدرسي الخاص بالطالب</p>
                        <p className="text-base font-mono font-bold text-brand-blue">{searchResult.seatNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">المرحلة والصف الدراسي</p>
                        <p className="text-base font-bold text-slate-800">{activeGradeConfig.gradeName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">النتيجة في هذا التقويم</p>
                        <div className="mt-1">
                          {(() => {
                            const statusInfo = getStudentStageStatus(searchResult, activeGradeConfig, activeSubTab as any, selectedSearchMonth);
                            return <ResultBadge status={statusInfo.isPassed ? 'ناجح' : 'راسب'} />;
                          })()}
                        </div>
                      </div>
                      {studentRank !== null && (
                        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex flex-col justify-center">
                          <p className="text-xs text-amber-700 font-bold mb-0.5">ترتيب الطالب على الصف</p>
                          <p className="text-sm font-black text-amber-900 flex items-center gap-1.5">
                            <Award className="w-5 h-5 text-amber-600 animate-pulse" />
                            <span>المركز {studentRank} من {totalClassStudents}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Decoupled Stage overall status card */}
                    {(() => {
                      const statusInfo = getStudentStageStatus(searchResult, activeGradeConfig, activeSubTab as any, selectedSearchMonth);
                      if (statusInfo.isPassed) {
                        return (
                          <div className="p-4 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="text-right">
                              <h4 className="font-bold text-emerald-800 text-sm">حالة نتيجة الطالب في هذا التقويم: مجتاز (ناجح) ✅</h4>
                              <p className="text-xs text-emerald-700 mt-1">لقد نجح الطالب وحصل على الدرجة المطلوبة في كافة المواد الدراسية المقررة لهذه المرحلة التعليمية بشكل منفصل ومستقل.</p>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-4 bg-rose-50 border-r-4 border-rose-500 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="text-right">
                              <h4 className="font-bold text-rose-800 text-sm">حالة نتيجة الطالب في هذا التقويم: لديه مواد متبقية (راسب) ❌</h4>
                              <p className="text-xs text-rose-700 font-medium mt-1">المواد التي لم يحقق فيها الطالب درجة النجاح في هذا التقويم الحالي:</p>
                              <ul className="list-disc list-inside text-xs text-rose-700 mt-1 space-y-0.5 mr-2">
                                {statusInfo.failedSubjectsList.map((subj, idx) => (
                                  <li key={idx} className="list-item text-right font-medium">{subj}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      }
                    })()}

                    <div className="space-y-4">
                      <h4 className="text-lg font-bold text-[#0d2b45] border-r-4 border-[#0e9e9e] pr-3 flex flex-wrap justify-between items-center gap-2">
                        <span>
                          {activeSubTab === 'half'
                            ? 'كشف تفاصيل درجات نصف العام (من ٥٠)'
                            : activeSubTab === 'final'
                            ? 'كشف تفاصيل درجات آخر العام (من ١٠٠)'
                            : 'كشف تفاصيل الاختبارات الشهرية (من ٤٠)'}
                        </span>
                        {activeSubTab === 'monthly' && (
                          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold font-sans">
                            عرض نتائج: <span className="underline">{selectedSearchMonth === 'all' ? 'الدرجة الكلية المعتمدة تلقائياً' : `شهر ${selectedSearchMonth}`}</span>
                          </span>
                        )}
                      </h4>

                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-right border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="p-4 font-bold border-b border-slate-200">المادة الدراسية</th>
                              <th className="p-4 font-bold text-center border-b border-slate-200">الحد الأقصى للدرجة</th>
                              <th className="p-4 font-bold text-center border-b border-slate-200">درجة النجاح المقدرة</th>
                              <th className="p-4 font-bold text-center border-b border-slate-200">الدرجة الحاصل عليها الطالب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeGradeConfig.subjects.map(sub => {
                              const sGrades = searchResult.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
                              
                              let monthly = 0;
                              let midTerm = 0;
                              let finalExam = 0;
                              const history = (sGrades && typeof sGrades === 'object' && (sGrades as any).monthlyHistory) || {};

                              if (typeof sGrades === 'number') {
                                const flatNum = sGrades;
                                monthly = Math.round(flatNum * 40 / 100); // Wait, flat calculation was: monthly = Math.round(flatNum * 0.4); Wait! Let's check original line:
                                // flatNum * 0.4 or Math.round(flatNum * 40 / 100). Yes. Let's write the exact formula from the code: Math.round(flatNum * 0.4)
                                monthly = Math.round(flatNum * 0.4);
                                midTerm = Math.round(flatNum * 0.5);
                                finalExam = Math.round(flatNum * 1.0);
                              } else {
                                monthly = Number(sGrades.monthly || 0);
                                midTerm = Number(sGrades.midTerm || 0);
                                finalExam = Number(sGrades.finalExam || 0);
                              }

                              let displayGrade = 0;
                              let maxGrade = 190;
                              let passThreshold = 95;

                              if (activeSubTab === 'monthly') {
                                if (selectedSearchMonth !== 'all') {
                                  if (history[selectedSearchMonth] !== undefined) {
                                    displayGrade = Number(history[selectedSearchMonth]);
                                  } else if (Object.keys(history).length === 0) {
                                    // Fallback for legacy data before monthlyHistory existed
                                    displayGrade = monthly;
                                  } else {
                                    displayGrade = 0; // Standard fallback for unrecorded month
                                  }
                                } else {
                                  displayGrade = monthly;
                                }
                                maxGrade = 40;
                                passThreshold = 20;
                              } else if (activeSubTab === 'half') {
                                displayGrade = midTerm;
                                maxGrade = 50;
                                passThreshold = 25;
                              } else {
                                displayGrade = finalExam;
                                maxGrade = 100;
                                passThreshold = 50;
                              }

                              const isPassed = displayGrade >= passThreshold;

                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 border-b border-slate-100 font-bold text-slate-700">{sub.name}</td>
                                  <td className="p-4 border-b border-slate-100 text-center text-slate-600">{maxGrade} د</td>
                                  <td className="p-4 border-b border-slate-100 text-center text-slate-600">{passThreshold} د</td>
                                  <td className={`p-4 border-b border-slate-100 text-center font-bold text-base ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <div>{displayGrade} د</div>
                                    {activeSubTab === 'monthly' && Object.keys(history).length > 0 && (
                                      <div className="flex flex-wrap gap-1 justify-center text-[9px] text-slate-400 font-normal mt-1 max-w-[150px] mx-auto">
                                        {Object.entries(history).map(([m, v]) => (
                                          <span key={m} className={`px-1 py-0.5 rounded ${m === selectedSearchMonth ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-100'}`} title={`${m}: ${v}`}>
                                            {m}:{v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Attendance & Participation Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#0e9e9e]/5 border border-[#0e9e9e]/20">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-bold">إجمالي أيام الحضور</p>
                          <p className="text-lg font-black text-[#0e9e9e] mt-1">{searchResult.presentDays ?? 180} يوم</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-bold">إجمالي أيام الغياب</p>
                          <p className="text-lg font-black text-rose-600 mt-1">{searchResult.absentDays ?? 0} يوم</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-bold">نسبة الحضور والمواظبة</p>
                          <p className="text-lg font-black text-brand-blue mt-1">{searchResult.attendancePercentage ?? 100}%</p>
                        </div>
                      </div>

                      {/* Informational notice that each test is independent */}
                      <div className="p-6 rounded-2xl border bg-slate-50 border-slate-200 text-slate-800">
                        <h5 className="font-bold text-base mb-2 flex items-center gap-2 text-[#0d2b45]">
                          <HelpCircle className="w-5 h-5 text-[#0e9e9e]" />
                          تنبيه إداري حول رصد الدرجات:
                        </h5>
                        <p className="text-xs leading-relaxed mb-4 text-slate-600 font-medium">
                          توضح هذه القائمة درجات الطالب الحاصل عليها في الاختبار المحدد فقط بشكل مستقل ومنفصل. لا يتم جمع درجات الشهور مع نصف العام أو آخر العام، ولا يتم احتساب مجموع سنوي عام.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <button
                            onClick={() => window.print()}
                            className="px-5 py-2.5 bg-[#0d2b45] text-white font-bold rounded-xl hover:bg-[#1e466b] transition-all flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            طباعة هذا التقرير فورياً
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      )}

      {activeSubTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* Instructions and help card */}
          <div className="lg:col-span-4 space-y-4">
            <AppCard title="إرشادات تقديم التظلم أو الشكوى">
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed text-right">
                <p>
                  نأسف لأي استفسار أو قلق حيال كشف النقاط الحالي. تتيح لكم مدرسة الشهيد محمد الدرة الاساسية إرسال طلب تظلم يُرسل مباشرة لبوابة مدير المدرسة بالنيابة لتدقيق نتائج الاختبارات الشهرية والسنوية المعتمدة.
                </p>
                <div className="border-r-4 border-[#c9a227] pr-3 py-1 space-y-2">
                  <p className="font-bold text-[#0d2b45]">شروط تقديم الشكوى:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                    <li>إدخال اسم الطالب الثلاثي صحيحاً بالكامل.</li>
                    <li>تسجيل رقم جوال فعال لمندوب شؤون الطلاب للاتصال بكم.</li>
                  </ul>
                </div>
                <p className="text-xs text-[#0e9e9e] font-bold">
                  سيتم معالجة التظلم ومراجعته خلال مدة أقصاها ٤٨ ساعة عمل من تاريخ التقديم.
                </p>
              </div>
            </AppCard>
          </div>

          {/* Form */}
          <div className="lg:col-span-8">
            <AppCard title="استمارة تقديم شكوى أو تظلم رسمي" icon={<MessageSquare className="w-6 h-6" />}>
              {complaintSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-800">تم إرسال طلب التظلم والشكوى بنجاح!</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">تم حفظ تظلمكم برقم مرجعي مميز قيد المراجعة الفورية بشؤون الطلاب.</p>
                  </div>
                </div>
              )}

              <form onSubmit={submitComplaint} className="space-y-5">
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      اسم الطالب بالكامل: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={complaintForm.studentName}
                      onChange={(e) => setComplaintForm({ ...complaintForm, studentName: e.target.value })}
                      placeholder="اسم الطالب الثلاثي"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Grade Selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      الصف الدراسي للطالب: <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={complaintForm.gradeId}
                      onChange={(e) => setComplaintForm({ ...complaintForm, gradeId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#0e9e9e] text-right"
                    >
                      <option value="">اختر الصف...</option>
                      {grades.map(grade => (
                        <option key={grade.id} value={grade.id}>{grade.gradeName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Title */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">عنوان الشكوى للتوجيه:</label>
                    <select
                      value={complaintForm.complaintSubject}
                      onChange={(e) => setComplaintForm({ ...complaintForm, complaintSubject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#0e9e9e] text-right"
                    >
                      <option value="درجات مادة معينة">مراجعة كشف في علامات مادة دراسية</option>
                      <option value="سجل الاختبارات الشهرية">تظلم في سجل درجات الاختبارات الشهرية والتحصيل</option>
                      <option value="بيانات الطالب الشخصية">خطأ إملائي بالاسم أو الرقم القومي</option>
                      <option value="أخرى">أخرى / استفسار إداري عام</option>
                    </select>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    تفاصيل الشكوى والطلب: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={2000}
                    value={complaintForm.details}
                    onChange={(e) => setComplaintForm({ ...complaintForm, details: e.target.value })}
                    placeholder="اكتب بالتفصيل مثلاً المادة المراد تدقيقها أو تاريخ اليوم المغلوط فيه الغياب..."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                  />
                </div>

                {/* Contact phone */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">رقم جوال للتواصل وسرعة الرد:</label>
                  <input
                    type="tel"
                    value={complaintForm.contactPhone}
                    onChange={(e) => setComplaintForm({ ...complaintForm, contactPhone: e.target.value })}
                    placeholder="مثال: 052-1234567"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                  />
                </div>

                {/* Dynamic Custom Fields mapped by Admin */}
                {customFields.filter(f => f.section === 'complaints').map(f => (
                  <div key={f.id} className="space-y-2 text-right">
                    <label className="block text-sm font-semibold text-slate-700">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        required={f.required}
                        value={complaintCustomValues[f.id] || ''}
                        onChange={(e) => setComplaintCustomValues({ ...complaintCustomValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ''}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                      />
                    ) : f.type === 'checkbox' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={f.id}
                          checked={!!complaintCustomValues[f.id]}
                          onChange={(e) => setComplaintCustomValues({ ...complaintCustomValues, [f.id]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-[#0e9e9e] focus:ring-[#0e9e9e]"
                        />
                        <span className="text-xs text-slate-600 font-semibold">{f.placeholder || 'موافق ومؤكد'}</span>
                      </div>
                    ) : (
                      <input
                        type={f.type}
                        required={f.required}
                        value={complaintCustomValues[f.id] || ''}
                        onChange={(e) => setComplaintCustomValues({ ...complaintCustomValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ''}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0e9e9e] text-white font-bold rounded-xl hover:bg-[#0d2b45] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  تقديم الشكوى الآن لإدارة شؤون الطلاب
                </button>

              </form>
            </AppCard>
          </div>

        </div>
      )}

      {activeSubTab === 'registration' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in text-right">
          {/* Instructions and search registration info */}
          <div className="lg:col-span-4 space-y-4">
            <AppCard title="بوابة التسجيل والقبول الإلكتروني">
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  ترحب مدرسة <strong>الشهيد محمد الدرة الاساسية</strong> بالطلاب الجدد وأولياء أمورهم. تتيح لكم هذه البوابة تقديم طلبات الالتحاق بالصفوف الدراسية المختلفة إلكترونياً ومتابعة حالة الطلب فورياً وبسهولة ويسر.
                </p>
                <div className="border-r-4 border-[#c9a227] pr-3 py-1 space-y-2">
                  <p className="font-bold text-[#0d2b45] text-xs sm:text-sm">خطوات الاستكمال والقبول:</p>
                  <ul className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                    <li>تعبئة استمارة التسجيل بدقة تامة وبأحرف مطابقة لشهادة الميلاد.</li>
                    <li>إرفاق الرقم القومي / رقم هوية الطالب بشكل صحيح لتسهيل التدقيق.</li>
                    <li>متابعة حالة الطلب وقرار الهيئة الإدارية باستخدام الرقم القومي أدناه.</li>
                    <li>بعد الموافقة المبدئية، يتم الاتصال بكم فوراً للمقابلة الشخصية وتوثيق الملفات.</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-xs">
                  <strong>تنويه:</strong> تخضع جميع طلبات التسجيل للمراجعة والفرز طبقاً لشرط السن القانوني المعتمد من قبل وزارة التربية والتعليم لكل مرحلة.
                </div>
              </div>
            </AppCard>

            {/* Registration Status Tracker Lookup */}
            <AppCard title="متابعة حالة طلب تقديم سابق" icon={<Search className="w-5 h-5 text-[#c9a227]" />}>
              <form onSubmit={handleSearchReg} className="space-y-3">
                <p className="text-xs text-slate-500">
                  أدخل الاسم الكامل للطالب، الرقم القومي، أو رقم هاتف التواصل المسجل:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={searchRegQuery}
                    onChange={(e) => setSearchRegQuery(e.target.value)}
                    placeholder="الاسم، الرقم القومي، أو الهاتف..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0d2b45] text-white font-bold text-xs rounded-lg hover:bg-[#0e9e9e] transition-all cursor-pointer whitespace-nowrap"
                  >
                    بحث فوري
                  </button>
                </div>
              </form>

              {searchedReg && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {searchRegResult.length === 0 ? (
                    <p className="text-xs text-rose-500 text-center">لم يتم العثور على أي طلبات تسجيل مطابقة لبيانات التحقق المدخلة.</p>
                  ) : (
                    searchRegResult.map(reg => (
                      <div key={reg.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                            reg.status === 'مقبول مبدئياً' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : reg.status === 'مرفوض' 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {reg.status}
                          </span>
                          <h6 className="font-bold text-[#0d2b45]">{reg.studentName}</h6>
                        </div>
                        <p className="text-slate-600 mt-2">
                          <strong>الصف المطلوب:</strong> {grades.find(g => g.id === reg.gradeId)?.gradeName || reg.gradeId}
                        </p>
                        <p className="text-slate-600 font-mono">
                          <strong>الرقم القومي:</strong> {reg.nationalId}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          <strong>تاريخ التقديم:</strong> {new Date(reg.submissionDate).toLocaleDateString('ar-EG')}
                        </p>
                        {reg.notes ? (
                          <div className="mt-2 p-2.5 bg-[#c9a227]/10 text-[#0d2b45] font-medium rounded-lg border border-[#c9a227]/30 text-[11px] leading-relaxed">
                            <strong>ملاحظات ورسالة الإدارة:</strong> {reg.notes}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-[10px] mt-1 italic">الطلب قيد الفحص والمطابقة وسيتم الرد قريباً.</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </AppCard>
          </div>

          {/* Registration form */}
          <div className="lg:col-span-8">
            <AppCard title="طلب تسجيل وإجراءات قبول طالب جديد" icon={<UserPlus className="w-6 h-6 text-[#0e9e9e]" />}>
              {regSuccess && (
                <div className="mb-6 p-5 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl flex flex-col gap-2 shadow-sm animate-pulse-once">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-emerald-800 text-base">تم إرسال طلب تدوين البيانات بنجاح!</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">تم تدوين وحفظ بيانات الطالب والبدء بمراجعتها الفورية شؤون الطلاب بالمدرسة.</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">المعلومات المرجعية للبحث السريع:</p>
                    <p>• <strong>الرقم المرجعي للطلب:</strong> <code className="font-mono bg-slate-100 px-1.5 py-0.5 text-[#0d2b45] rounded font-extrabold text-sm">{registeredId}</code></p>
                    <p>• يمكنكم في أي وقت الاستعلام عن النتيجة باستخدام <strong>الرقم القومي للطالب</strong> في لوحة المتابعة الجانبية.</p>
                  </div>
                </div>
              )}

              {regError && (
                <div className="mb-6 p-4 bg-rose-50 border-r-4 border-rose-500 rounded-xl flex items-center gap-2 text-rose-800 text-sm font-semibold">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-8">
                {/* 1. القسم 1: الوصف والبيانات التعليمية الأساسية */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-[#0e9e9e] text-white flex items-center justify-center font-bold text-xs">١</span>
                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">القسم 1: الوصف والبيانات التعليمية الأساسية</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Grade Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        الصف الدراسي المطلوب التسجيل فيه: <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={regForm.gradeId}
                        onChange={(e) => setRegForm({ ...regForm, gradeId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right cursor-pointer"
                      >
                        <option value="">-- اختر الصف الدراسي المطلوب --</option>
                        {grades.map(grade => (
                          <option key={grade.id} value={grade.id}>{grade.gradeName}</option>
                        ))}
                      </select>
                    </div>

                    {/* Student Status */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        حالة الطالب: <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 p-1.5 bg-white rounded-lg border border-slate-300 justify-around h-[38px] items-center">
                        {(['طالب مستجد', 'طالب منقول من مدرسة أخرى', 'باقٍ للإعادة'] as const).map((status) => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer font-semibold select-none text-[10px] sm:text-xs text-slate-700">
                            <input
                              type="radio"
                              name="studentStatus"
                              value={status}
                              checked={regForm.studentStatus === status}
                              onChange={() => setRegForm({ ...regForm, studentStatus: status })}
                              className="accent-[#0e9e9e] w-3.5 h-3.5"
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. القسم 2: بيانات الطالب الشخصية */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-[#0e9e9e] text-white flex items-center justify-center font-bold text-xs">٢</span>
                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">القسم 2: بيانات الطالب الشخصية (من واقع شهادة الميلاد)</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        اسم الطالب الرباعي واللقب: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={regForm.studentName}
                        onChange={(e) => setRegForm({ ...regForm, studentName: e.target.value })}
                        placeholder="اكتب الاسم الرباعي واللقب مطابقاً لشهادة الميلاد الرسمية"
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        تاريخ الميلاد: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={regForm.birthDate}
                        onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Gender Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        النوع (الجنس): <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4 p-1.5 bg-white rounded-lg border border-slate-350 justify-around h-[38px] items-center">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-xs text-slate-700">
                          <input
                            type="radio"
                            name="gender"
                            value="ذكر"
                            checked={regForm.gender === 'ذكر'}
                            onChange={() => setRegForm({ ...regForm, gender: 'ذكر' })}
                            className="accent-[#0e9e9e] w-4 h-4 shadow-sm"
                          />
                          ذكر
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-xs text-slate-700">
                          <input
                            type="radio"
                            name="gender"
                            value="أنثى"
                            checked={regForm.gender === 'أنثى'}
                            onChange={() => setRegForm({ ...regForm, gender: 'أنثى' })}
                            className="accent-[#0e9e9e] w-4 h-4 shadow-sm"
                          />
                          أنثى
                        </label>
                      </div>
                    </div>

                    {/* Birth Place */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">مكان الميلاد (المحافظة والمديرية):</label>
                      <input
                        type="text"
                        maxLength={80}
                        value={regForm.birthPlace}
                        onChange={(e) => setRegForm({ ...regForm, birthPlace: e.target.value })}
                        placeholder="المحافظة - المديرية"
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>

                    {/* Nationality */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">الجنسية:</label>
                      <input
                        type="text"
                        value={regForm.nationality}
                        onChange={(e) => setRegForm({ ...regForm, nationality: e.target.value })}
                        placeholder="الجنسية"
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Parent Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        اسم ولي الأمر بالكامل: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={regForm.parentName}
                        onChange={(e) => setRegForm({ ...regForm, parentName: e.target.value })}
                        placeholder="الاسم الرباعي كما هو مسجل في هوية الأب"
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>

                    {/* Parent Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        رقم هاتف المحمول لولي الأمر: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={30}
                        value={regForm.parentPhone}
                        onChange={(e) => setRegForm({ ...regForm, parentPhone: convertArabicNumerals(e.target.value) })}
                        placeholder="مثال: 777123456"
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right font-mono"
                      />
                    </div>
                  </div>

                  {/* Detailed Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-slate-700">
                      عنوان السكن الحالي بالتفصيل (المديرية - الحارة/القرية): <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      maxLength={300}
                      value={regForm.address}
                      onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      placeholder="يرجى كتابة العنوان بشكل دقيق: المحافظة - المديرية - الحارة أو القرية لسهولة التواصل والمطابقة"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                    />
                  </div>
                </div>

                {/* 3. القسم 4: البيانات التعليمية السابقة والحالة الصحية */}
                {regForm.studentStatus === 'طالب منقول من مدرسة أخرى' ? (
                  <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/80 space-y-4 animate-slide-down">
                    <div className="flex items-center gap-2 border-b border-amber-200 pb-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">٤</span>
                      <h4 className="font-extrabold text-amber-900 text-sm sm:text-base">القسم 4: البيانات التعليمية السابقة والحالة الصحية (للطالب المنقول)</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Previous School */}
                      <div className="space-y-1.5">
                        <label className="block text-xs sm:text-sm font-bold text-amber-950">
                          اسم المدرسة السابقة والمديرية المنقول منها: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={regForm.studentStatus === 'طالب منقول من مدرسة أخرى'}
                          maxLength={150}
                          value={regForm.previousSchool}
                          onChange={(e) => setRegForm({ ...regForm, previousSchool: e.target.value })}
                          placeholder="مثال: مدرسة الثورة بمديرية معين"
                          className="w-full px-3.5 py-2 bg-white rounded-lg border border-amber-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                        />
                      </div>

                      {/* Last Grade Completed */}
                      <div className="space-y-1.5">
                        <label className="block text-xs sm:text-sm font-bold text-amber-950">
                          آخر صف دراسي أتمه الطالب ومعدله الدراسي: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={regForm.studentStatus === 'طالب منقول من مدرسة أخرى'}
                          maxLength={100}
                          value={regForm.lastGradeSuccess}
                          onChange={(e) => setRegForm({ ...regForm, lastGradeSuccess: e.target.value })}
                          placeholder="مثال: الصف الثاني الابتدائي بتقدير ممتاز ومعدل 98%"
                          className="w-full px-3.5 py-2 bg-white rounded-lg border border-amber-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                        />
                      </div>
                    </div>

                    {/* Chronic diseases or special needs */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-amber-950">
                        هل يعاني الطالب من أي أمراض مزمنة أو احتياجات خاصة تود إخطار المدرسة بها؟
                      </label>
                      <textarea
                        rows={2}
                        maxLength={400}
                        value={regForm.healthConditions}
                        onChange={(e) => setRegForm({ ...regForm, healthConditions: e.target.value })}
                        placeholder="أية عوارض صحية أو مزمنة، حساسية، أو احتياجات خاصة تهم تكييف بيئة الكومة التعليمية للطالب..."
                        className="w-full px-3.5 py-2 bg-white rounded-lg border border-amber-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>
                  </div>
                ) : (
                  // If not transfer, we still display healthConditions block standalone to satisfy the field request
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-[#0e9e9e] text-white flex items-center justify-center font-bold text-xs">٤</span>
                      <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">القسم 4: الرعاية الصحية والاحتياجات</h4>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-700">
                        هل يعاني الطالب من أي أمراض مزمنة أو احتياجات خاصة تود إخطار المدرسة بها؟
                      </label>
                      <textarea
                        rows={2}
                        maxLength={400}
                        value={regForm.healthConditions}
                        onChange={(e) => setRegForm({ ...regForm, healthConditions: e.target.value })}
                        placeholder="أية عوارض صحية أو مزمنة، حساسية، أو احتياجات خاصة تهم تكييف البيئة التعليمية للطالب..."
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-xs sm:text-sm text-right"
                      />
                    </div>
                  </div>
                )}



                {/* Dynamic Custom Fields mapped by Admin for registrations */}
                {customFields.filter(f => f.section === 'registration').map(f => (
                  <div key={f.id} className="space-y-2 text-right">
                    <label className="block text-sm font-semibold text-slate-700">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        required={f.required}
                        value={registrationCustomValues[f.id] || ''}
                        onChange={(e) => setRegistrationCustomValues({ ...registrationCustomValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ''}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                      />
                    ) : f.type === 'checkbox' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id={f.id}
                          checked={!!registrationCustomValues[f.id]}
                          onChange={(e) => setRegistrationCustomValues({ ...registrationCustomValues, [f.id]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-[#0e9e9e] focus:ring-[#0e9e9e]"
                        />
                        <span className="text-xs text-slate-600 font-semibold">{f.placeholder || 'موافق ومؤكد'}</span>
                      </div>
                    ) : (
                      <input
                        type={f.type}
                        required={f.required}
                        value={registrationCustomValues[f.id] || ''}
                        onChange={(e) => setRegistrationCustomValues({ ...registrationCustomValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ''}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0e9e9e] text-right"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-3 bg-[#c9a227] hover:bg-[#b08d1f] text-[#0d2b45] font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5" />
                  {regSubmitting ? 'جاري توثيق وإرسال طلب الالتحاق والوثائق الالكترونية...' : 'تسجيل تقديم طلب الالتحاق الجديد'}
                </button>
              </form>
            </AppCard>
          </div>
        </div>
      )}

    </div>
  );
};
