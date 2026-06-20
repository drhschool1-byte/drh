import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  Settings, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Check, 
  AlertTriangle,
  X,
  MessageSquare,
  BookOpen,
  Eye,
  Activity,
  Plus,
  RefreshCw,
  Search,
  Award,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Student, Teacher, GradeSetting, Subject, Complaint, NewStudentRegistration, CustomFormField, Supervisor } from '../types';
import { dbService, calculateStudentResult, isValidStudentData } from '../firebase';
import { calculateMonthlyFromHistory } from '../utils';
import { AppCard, BRAND_COLORS, ResultBadge } from './UI';
import * as XLSX from 'xlsx';
import { SystemResetPortal } from './SystemResetPortal';

// Recharts for stats
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface CustomGradesViewProps {
  type: 'monthly' | 'midTerm' | 'finalExam';
  students: Student[];
  grades: GradeSetting[];
  onExport: (type: 'monthly' | 'midTerm' | 'finalExam') => void;
  gradeViewSearch: string;
  setGradeViewSearch: (val: string) => void;
  gradeViewClass: string;
  setGradeViewClass: (val: string) => void;
}

const CustomGradesView: React.FC<CustomGradesViewProps> = ({
  type,
  students,
  grades,
  onExport,
  gradeViewSearch,
  setGradeViewSearch,
  gradeViewClass,
  setGradeViewClass
}) => {
  const typeLabel = type === 'monthly' ? 'درجات الاختبارات الشهرية' : type === 'midTerm' ? 'درجات نصف العام' : 'درجات آخر العام';
  const badgeColorClass = type === 'monthly' ? 'bg-[#0e9e9e]/10 text-[#0e9e9e]' : type === 'midTerm' ? 'bg-[#c9a227]/10 text-[#c9a227]' : 'bg-rose-100 text-rose-800';

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchClass = gradeViewClass === 'all' || s.grade === gradeViewClass;
    const matchSearch = !gradeViewSearch || s.name.toLowerCase().includes(gradeViewSearch.toLowerCase()) || s.seatNumber.includes(gradeViewSearch);
    return matchClass && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in text-right font-sans" dir="rtl border-none">
      {/* Top filter dashboard */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">تصفية حسب الصف الدراسي:</label>
            <select
              value={gradeViewClass}
              onChange={(e) => setGradeViewClass(e.target.value)}
              className="px-4 py-2 text-sm border-2 border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:border-[#0e9e9e] focus:outline-none cursor-pointer"
            >
              <option value="all">جميع الصفوف الدراسية</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.gradeName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">محرك البحث السريع (الاسم أو الرقم المدرسي):</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن طالب..."
                value={gradeViewSearch}
                onChange={(e) => setGradeViewSearch(e.target.value)}
                className="px-10 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-[#0e9e9e] focus:outline-none w-72 text-right font-bold text-slate-800"
              />
              <span className="absolute right-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onExport(type)}
            className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer border border-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            تصدير الكشف الفعلي إلى Excel
          </button>
        </div>
      </div>

      {/* Main Table */}
      <AppCard 
        title={`${typeLabel} - كشف العلامات المعتمدة والبحث الفوري`}
        icon={type === 'monthly' ? <Calendar className="w-5 h-5 text-[#0e9e9e]" /> : type === 'midTerm' ? <BookOpen className="w-5 h-5 text-[#c9a227]" /> : <Award className="w-5 h-5 text-rose-500" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="p-3.5 border-b border-slate-200 text-right min-w-[180px]">اسم الطالب</th>
                <th className="p-3.5 border-b border-slate-200 text-center font-bold min-w-[100px]">الرقم المدرسي</th>
                <th className="p-3.5 border-b border-slate-200 text-center font-bold min-w-[120px]">الصف الدراسي</th>
                
                {/* Dynamically render headers of subject names depending on student or selected class */}
                {(() => {
                  const activeClassSymbol = gradeViewClass;
                  let subjectsToHeader: { id: string, name: string }[] = [];
                  if (activeClassSymbol !== 'all') {
                    const currentClassConfig = grades.find(g => g.id === activeClassSymbol);
                    if (currentClassConfig) {
                      subjectsToHeader = currentClassConfig.subjects.map(s => ({ id: s.id, name: s.name }));
                    }
                  } else {
                    const seen = new Set<string>();
                    grades.forEach(g => {
                      g.subjects.forEach(sub => {
                        if (!seen.has(sub.id)) {
                          seen.add(sub.id);
                          subjectsToHeader.push({ id: sub.id, name: sub.name });
                        }
                      });
                    });
                  }

                  return (
                    <>
                      {subjectsToHeader.map(sub => (
                        <th key={sub.id} className="p-3.5 border-b border-slate-200 text-center font-bold min-w-[90px] bg-slate-50">
                          {sub.name}
                          <span className="block text-[9px] font-normal text-slate-400 mt-0.5">
                            {type === 'monthly' ? 'أعمال شهر (20 د)' : type === 'midTerm' ? 'نصف عام (40 د)' : 'آخر عام (40 د)'}
                          </span>
                        </th>
                      ))}
                    </>
                  );
                })()}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400 font-medium">
                    لا توجد قيود طلاب تطابق شروط البحث أو التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(std => {
                  const grConfig = grades.find(g => g.id === std.grade);
                  const className = grConfig?.gradeName || std.grade;

                  // Find same subjects columns to align values
                  const activeClassSymbol = gradeViewClass;
                  let subjectsToHeader: { id: string, name: string }[] = [];
                  if (activeClassSymbol !== 'all') {
                    const currentClassConfig = grades.find(g => g.id === activeClassSymbol);
                    if (currentClassConfig) {
                      subjectsToHeader = currentClassConfig.subjects.map(s => ({ id: s.id, name: s.name }));
                    }
                  } else {
                    const seen = new Set<string>();
                    grades.forEach(g => {
                      g.subjects.forEach(sub => {
                        if (!seen.has(sub.id)) {
                          seen.add(sub.id);
                          subjectsToHeader.push({ id: sub.id, name: sub.name });
                        }
                      });
                    });
                  }

                  let sumOfPeriod = 0;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-800 text-right">{std.name}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{std.seatNumber}</td>
                      <td className="p-3 text-center text-slate-600 font-semibold">{className}</td>
                      
                      {subjectsToHeader.map(sub => {
                        const isStudentSubject = grConfig?.subjects.some(s => s.id === sub.id) ?? false;
                        
                        let valOfPeriod = 0;
                        if (isStudentSubject) {
                          const raw = std.subjectGrades[sub.id];
                          if (raw && typeof raw === 'object') {
                            valOfPeriod = Number((raw as any)[type] ?? 0);
                          } else if (typeof raw === 'number') {
                            const flatNum = raw;
                            if (type === 'monthly') {
                              valOfPeriod = Math.round(flatNum * 0.4);
                            } else if (type === 'midTerm') {
                              valOfPeriod = Math.round(flatNum * 0.5);
                            } else {
                              valOfPeriod = Math.round(flatNum * 1.0);
                            }
                          }
                          sumOfPeriod += valOfPeriod;
                        }

                        return (
                          <td key={sub.id} className={`p-3 text-center font-bold text-sm ${isStudentSubject ? 'text-slate-800' : 'text-slate-300 font-normal bg-slate-50/40'}`}>
                            {isStudentSubject ? `${valOfPeriod} د` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  // Tabs (Added results_bulk for editing & uploading student results collectively, registrations for admittor review)
  const [adminTab, setAdminTab] = useState<'stats' | 'students' | 'teachers' | 'grades' | 'complaints' | 'results_bulk' | 'registrations' | 'monthly_grades' | 'midterm_grades' | 'final_grades' | 'supervisors' | 'system_reset'>('stats');

  // Search and class filter states for dedicated grade views
  const [gradeViewSearch, setGradeViewSearch] = useState('');
  const [gradeViewClass, setGradeViewClass] = useState('all');

  // Unified global records
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<GradeSetting[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<NewStudentRegistration[]>([]);
  const [customFields, setCustomFields] = useState<CustomFormField[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [activeRankStage, setActiveRankStage] = useState<'all' | 'monthly' | 'half' | 'final'>('all');

  // State for managing custom field creator form
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldSection, setNewFieldSection] = useState<'registration' | 'complaints'>('registration');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'textarea' | 'checkbox'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');

  // Registration decision notes
  const [selectedReg, setSelectedReg] = useState<NewStudentRegistration | null>(null);
  const [regNotes, setRegNotes] = useState('');

  // Feedback trackers
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Live Cloud Synchronization states & actions
  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await loadAllRecords();
      triggerSuccess('تم جلب وتحديث كافة بيانات السجلات من السحابة الإلكترونية بنجاح.');
    } catch (e) {
      console.error(e);
      triggerError('تعذر جلب البيانات وتحديثها من السحابة الإلكترونية. يرجى التحقق من اتصالك.');
    } finally {
      setIsSyncing(false);
    }
  };

  const [resettingCurriculum, setResettingCurriculum] = useState(false);

  const handleApplyOfficialCurriculum = async () => {
    if (!window.confirm("تحذير: هل أنت متأكد من رغبتك في إعادة تعيين كافة الصفوف الدراسية والمواد الدراسية إلى المنهاج الرسمي المعتمد من الوزارة؟ سيقوم هذا الإجراء بإعادة ضبط صفوفك الـ 9 مع موادها المحددة وتحديث الكشوف لجميع الطلاب لتكون درجات صفوفهم متناسقة مع المواد الجديدة.")) {
      return;
    }
    setResettingCurriculum(true);
    try {
      await dbService.resetGradeSettingsToMinistryOfficial();
      // Reload grades and students from dbService to update UI
      const updatedGrades = await dbService.getGradeSettings();
      setGrades(updatedGrades);
      if (editingGrade) {
        const matchingUpdated = updatedGrades.find(g => g.id === editingGrade.id);
        if (matchingUpdated) {
          setEditingGrade(matchingUpdated);
        } else if (updatedGrades.length > 0) {
          setEditingGrade(updatedGrades[0]);
        }
      } else if (updatedGrades.length > 0) {
        setEditingGrade(updatedGrades[0]);
      }
      const updatedStudents = await dbService.getStudents();
      setStudents(updatedStudents);
      triggerSuccess("تم تطبيق المنهاج الرسمي للوزارة بنجاح وإعادة ضبط المواد والدرجات!");
    } catch (e) {
      console.error(e);
      triggerError("فشل في تطبيق المنهاج الرسمي للوزارة.");
    } finally {
      setResettingCurriculum(false);
    }
  };

  const handleTabChange = async (tab: typeof adminTab) => {
    setAdminTab(tab);
    // Dynamic background loading to fetch fresh submissions instantly on tab click
    try {
      const dbGrades = await dbService.getGradeSettings();
      setGrades(dbGrades);
      
      const dbStudents = await dbService.getStudents();
      setStudents(dbStudents);

      const dbTeachers = await dbService.getTeachers();
      setTeachers(dbTeachers);

      const dbComplaints = await dbService.getComplaints();
      setComplaints(dbComplaints);

      const dbReg = await dbService.getRegistrations();
      setRegistrations(dbReg);

      const dbCustomFields = await dbService.getCustomFields();
      setCustomFields(dbCustomFields);

      const dbSupervisors = await dbService.getSupervisors();
      setSupervisors(dbSupervisors);
    } catch (e) {
      console.warn("Silent background reload on tab change skipped or offline:", e);
    }
  };

  // Modals / Modifying State triggers
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    seatNumber: '',
    grade: '',
    subjectGrades: {} as { [subjectId: string]: { monthly: number, midTerm: number, finalExam: number } }
  });

  // Teacher Form State
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    grade: ''
  });

  // Supervisor Form State
  const [isAddSupervisorOpen, setIsAddSupervisorOpen] = useState(false);
  const [supervisorForm, setSupervisorForm] = useState({
    name: '',
    email: ''
  });

  // Grade settings State
  const [editingGrade, setEditingGrade] = useState<GradeSetting | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');

  // File Upload State
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Bulk Results Center State Fields
  const [bulkSelectedGrade, setBulkSelectedGrade] = useState<string>('');
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkGradeTab, setBulkGradeTab] = useState<'monthly' | 'midTerm' | 'finalExam'>('monthly');

  // Monthly tracking states with localStorage persistence
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    return localStorage.getItem('school_active_month') || 'أكتوبر';
  });
  const [customMonthInput, setCustomMonthInput] = useState<string>('');
  const [isCustomMonth, setIsCustomMonth] = useState<boolean>(() => {
    const saved = localStorage.getItem('school_is_custom_month');
    return saved === 'true';
  });
  const [calculationMethod, setCalculationMethod] = useState<'average' | 'highest' | 'active'>(() => {
    return (localStorage.getItem('school_calc_method') as any) || 'average';
  });

  const changeActiveMonth = (month: string, customFlg = false) => {
    setActiveMonth(month);
    setIsCustomMonth(customFlg);
    localStorage.setItem('school_active_month', month);
    localStorage.setItem('school_is_custom_month', String(customFlg));
  };

  const changeCalculationMethod = (method: 'average' | 'highest' | 'active') => {
    setCalculationMethod(method);
    localStorage.setItem('school_calc_method', method);
  };

  const applyCalculationMethod = (method: 'average' | 'highest' | 'active', monthToUse = activeMonth) => {
    if (!bulkStudents || bulkStudents.length === 0) return;
    const updatedList = bulkStudents.map(std => {
      const updatedGrades = { ...std.subjectGrades };
      let changed = false;
      Object.keys(updatedGrades).forEach(subId => {
        const raw = updatedGrades[subId];
        if (raw && typeof raw === 'object' && (raw as any).monthlyHistory) {
          const newMonthly = calculateMonthlyFromHistory(
            (raw as any).monthlyHistory,
            Number((raw as any).monthly ?? 0),
            method,
            monthToUse
          );
          if (newMonthly !== (raw as any).monthly) {
            updatedGrades[subId] = {
              ...(raw as any),
              monthly: newMonthly
            };
            changed = true;
          }
        }
      });
      if (changed) {
        // Recalculate results
        const gradeConfig = grades.find(g => g.id === bulkSelectedGrade);
        if (gradeConfig) {
          const calcResult = calculateStudentResult({
            name: std.name,
            seatNumber: std.seatNumber,
            grade: std.grade,
            subjectGrades: updatedGrades
          }, gradeConfig);
          return {
            ...std,
            subjectGrades: updatedGrades,
            ...calcResult
          };
        }
      }
      return std;
    });
    setBulkStudents(updatedList);
  };

  // Synchronize bulk editor list when grade selection changes or master students list is updated
  useEffect(() => {
    if (bulkSelectedGrade) {
      const filtered = students.filter(s => s.grade === bulkSelectedGrade);
      setBulkStudents(JSON.parse(JSON.stringify(filtered)));
    } else {
      setBulkStudents([]);
    }
  }, [bulkSelectedGrade, students]);

  useEffect(() => {
    loadAllRecords();
  }, []);

  const loadAllRecords = async () => {
    try {
      const dbGrades = await dbService.getGradeSettings();
      setGrades(dbGrades);
      if (dbGrades.length > 0 && !bulkSelectedGrade) {
        setBulkSelectedGrade(dbGrades[0].id);
      }

      const dbStudents = await dbService.getStudents();
      setStudents(dbStudents);

      const dbTeachers = await dbService.getTeachers();
      setTeachers(dbTeachers);

      // Complaints from Firestore/dbService
      const dbComplaints = await dbService.getComplaints();
      setComplaints(dbComplaints);

      // Registrations from Firestore/dbService
      const dbReg = await dbService.getRegistrations();
      setRegistrations(dbReg);

      // Custom fields from Firestore/dbService
      const dbCustomFields = await dbService.getCustomFields();
      setCustomFields(dbCustomFields);

      // Supervisors from Firestore/dbService
      const dbSupervisors = await dbService.getSupervisors();
      setSupervisors(dbSupervisors);
    } catch (e) {
      console.error("Failed loading from Firestore Cloud. Activating local storage offline safety fallback.", e);
      triggerError('تنبيه: تعذر جلب السجلات من السحابة الإلكترونية. تم تفريغ البيانات من الذاكرة المحلية مؤقتاً.');
      
      // Fallbacks
      try {
        const localGrades = JSON.parse(localStorage.getItem('grade_settings') || '[]');
        setGrades(localGrades);
        if (localGrades.length > 0 && !bulkSelectedGrade) {
          setBulkSelectedGrade(localGrades[0].id);
        }
        
        const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
        setStudents(localStudents);
        
        const localTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');
        setTeachers(localTeachers);
        
        const localComplaints = JSON.parse(localStorage.getItem('complaints') || '[]');
        setComplaints(localComplaints);

        const localReg = JSON.parse(localStorage.getItem('registrations') || '[]');
        setRegistrations(localReg);

        const localFields = JSON.parse(localStorage.getItem('custom_form_fields') || '[]');
        setCustomFields(localFields);

        const localSupervisors = JSON.parse(localStorage.getItem('supervisors') || '[]');
        setSupervisors(localSupervisors);
      } catch (fallbackError) {
        console.error("Local recovery storage parsing failed", fallbackError);
      }
    }
  };

  const triggerSuccess = (text: string) => {
    setSuccessMsg(text);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const triggerError = (text: string) => {
    setErrorMsg(text);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // ----------------------------------------------------
  // Bulk Evaluation Action Handlers
  // ----------------------------------------------------
  const handleBulkChange = (studentId: string, updates: Partial<Student>) => {
    setBulkStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;

      const newStudent = { ...s, ...updates };
      const gradeConfig = grades.find(g => g.id === newStudent.grade);
      if (gradeConfig) {
        const calculated = calculateStudentResult({
          name: newStudent.name,
          seatNumber: newStudent.seatNumber,
          grade: newStudent.grade,
          subjectGrades: newStudent.subjectGrades
        }, gradeConfig);
        return {
          ...newStudent,
          ...calculated
        };
      }
      return newStudent;
    }));
  };

  const handleBulkAddStudent = () => {
    if (!bulkSelectedGrade) return;
    const baseGrade = grades.find(g => g.id === bulkSelectedGrade);
    const initialGrades: { [subjectId: string]: { monthly: number, midTerm: number, finalExam: number } } = {};
    if (baseGrade) {
      baseGrade.subjects.forEach(sub => {
        initialGrades[sub.id] = { monthly: 0, midTerm: 0, finalExam: 0 };
      });
    }

    const newStudent: Student = {
      id: "bulk_new_" + Date.now(),
      name: "",
      seatNumber: "",
      grade: bulkSelectedGrade,
      subjectGrades: initialGrades,
      totalPoints: 0,
      resultStatus: "ناجح",
      reason: "ناجح"
    };

    setBulkStudents(prev => [...prev, newStudent]);
  };

  const handleBulkRemoveRow = async (id: string) => {
    if (id.startsWith('bulk_new_')) {
      setBulkStudents(prev => prev.filter(s => s.id !== id));
      return;
    }

    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطالب نهائياً من قاعدة البيانات السحابية؟')) return;
    try {
      await dbService.deleteStudent(id);
      triggerSuccess('تم حذف سجلات الطالب بنجاح من قاعدة البيانات.');
      await loadAllRecords();
    } catch (e) {
      triggerError('حدث خطأ أثناء عملية حذف الطالب.');
    }
  };

  const handleBulkSave = async () => {
    if (bulkStudents.length === 0) {
      triggerError('لا يوجد طلاب لتحديث بياناتهم في هذا الصف الدراسي للرصد.');
      return;
    }

    // Validation
    const emptyNames = bulkStudents.some(s => !s.name?.trim());
    if (emptyNames) {
      triggerError('تنبيه: يرجى التأكد من ملء أسماء جميع الطلاب في الجدول للرصد.');
      return;
    }

    const emptySeats = bulkStudents.some(s => !s.seatNumber?.trim());
    if (emptySeats) {
      triggerError('تنبيه: يرجى التأكد من ملء الأرقام المدرسية لجميع طلاب الجدول لتجنب التضارب.');
      return;
    }

    const seatNumbers = bulkStudents.map(s => s.seatNumber.trim());
    const uniqueSeats = new Set(seatNumbers);
    if (uniqueSeats.size !== seatNumbers.length) {
      triggerError('تنبيه: يوجد تكرار في الأرقام المدرسية المدخلة. يجب أن يكون الرقم المدرسي فريداً لكل طالب.');
      return;
    }

    setIsBulkSaving(true);
    try {
      for (const student of bulkStudents) {
        const cleanStudent: Student = {
          ...student,
          id: student.id.startsWith('bulk_new_') ? ("stud_" + student.seatNumber.trim() + "_" + Date.now()) : student.id,
          name: student.name.trim(),
          seatNumber: student.seatNumber.trim()
        };
        await dbService.saveStudent(cleanStudent);
      }
      triggerSuccess('تم بنجاح حفظ وتحديث كافة علامات وتقارير الطلاب سحابياً لجميع القيود في الجدول.');
      await loadAllRecords();
    } catch (e: any) {
      console.error(e);
      triggerError(e.message || 'فشلت عملية حفظ الدرجات جماعياً.');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleExportBulkExcel = () => {
    if (!bulkSelectedGrade) return;
    const currentGrade = grades.find(g => g.id === bulkSelectedGrade);
    if (!currentGrade) return;

    const headers = [
      "اسم الطالب",
      "الرقم المدرسي",
      "معرف الصف",
      "أيام الحضور",
      "أيام الغياب"
    ];
    currentGrade.subjects.forEach(sub => {
      headers.push(`${sub.name} - أعمال الشهر (40)`);
      headers.push(`${sub.name} - نصف العام (50)`);
      headers.push(`${sub.name} - آخر العام (100)`);
    });

    const rows = bulkStudents.map(std => {
      const rowData = [
        std.name,
        std.seatNumber,
        std.grade,
        std.presentDays ?? 180,
        std.absentDays ?? 0
      ];
      currentGrade.subjects.forEach(sub => {
        const raw = std.subjectGrades[sub.id];
        let monthly = 0;
        let midTerm = 0;
        let finalExam = 0;

        if (raw && typeof raw === 'object') {
          monthly = Number((raw as any).monthly ?? 0);
          midTerm = Number((raw as any).midTerm ?? 0);
          finalExam = Number((raw as any).finalExam ?? 0);
        } else if (typeof raw === 'number') {
          const flatNum = raw;
          monthly = Math.round(flatNum * 0.4);
          midTerm = Math.round(flatNum * 0.5);
          finalExam = Math.round(flatNum * 1.0);
        }
        rowData.push(monthly, midTerm, finalExam);
      });
      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `نتائج - ${currentGrade.gradeName}`);
    XLSX.writeFile(wb, `نتائج_طلاب_${currentGrade.gradeName.replace(/ /g, '_')}.xlsx`);
    triggerSuccess(`تمت عملية تصدير كشف درجات ${currentGrade.gradeName} بنجاح.`);
  };

  const handleImportBulkExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          triggerError('ملف Excel فارغ أو غير متوافق للرصد.');
          return;
        }

        const rows = data.slice(1);
        const currentGrade = grades.find(g => g.id === bulkSelectedGrade);
        if (!currentGrade) {
          triggerError('يرجى تحديد الصف أولاً لإقران المواد بشكل صحيح.');
          return;
        }

        // --- DATA VALIDATION STAGE ---
        const validationErrors: string[] = [];
        const validRows: any[][] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // Row number in Excel

          if (row.length === 0 || (!row[0] && !row[1] && !row[2])) {
            continue; // Skip empty rows
          }

          const name = row[0] ? String(row[0]).trim() : '';
          const seatNumber = row[1] ? String(row[1]).trim() : '';
          const gradeId = row[2] ? String(row[2]).trim() : '';

          if (!name) {
            validationErrors.push(`السطر ${rowNum}: اسم الطالب فارغ.`);
          } else if (name.length < 2 || name.length > 128) {
            validationErrors.push(`السطر ${rowNum}: اسم الطالب (${name}) يجب أن يكون طوله بين 2 إلى 128 حرفاً.`);
          }

          if (!seatNumber) {
            validationErrors.push(`السطر ${rowNum}: الرقم المدرسي فارغ.`);
          }

          if (gradeId !== bulkSelectedGrade) {
            validationErrors.push(`السطر ${rowNum}: معرف الصف (${gradeId}) لا يطابق الصف المحدد للرصد الحالي (${bulkSelectedGrade}).`);
            continue;
          }

          const isLegacyTemplate = row.length > currentGrade.subjects.length + 3;
          const startColIdx = isLegacyTemplate ? 5 : 3;

          // Attendance Validation
          if (isLegacyTemplate) {
            const present = Number(row[3] ?? 0);
            const absent = Number(row[4] ?? 0);
            if (isNaN(present) || present < 0) {
              validationErrors.push(`السطر ${rowNum}: قيمة أيام الحضور (${row[3]}) غير صالحة. يرجى إدخال عدد موجب.`);
            }
            if (isNaN(absent) || absent < 0) {
              validationErrors.push(`السطر ${rowNum}: قيمة أيام الغياب (${row[4]}) غير صالحة. يرجى إدخال عدد موجب.`);
            }
          }

          // Subject Grades Validation
          const colsPerSubject = (row.length - startColIdx) >= (currentGrade.subjects.length * 3) ? 3 : 1;
          currentGrade.subjects.forEach((sub, idx) => {
            if (colsPerSubject === 3) {
              const mIdx = startColIdx + idx * 3;
              const tIdx = startColIdx + idx * 3 + 1;
              const fIdx = startColIdx + idx * 3 + 2;

              const monthly = Number(row[mIdx] ?? 0);
              const midTerm = Number(row[tIdx] ?? 0);
              const finalExam = Number(row[fIdx] ?? 0);

              if (isNaN(monthly) || monthly < 0 || monthly > 40) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} الشهري (${row[mIdx] ?? 0}) يجب أن تكون بين 0 و 40.`);
              }
              if (isNaN(midTerm) || midTerm < 0 || midTerm > 50) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} نصف العام (${row[tIdx] ?? 0}) يجب أن تكون بين 0 و 50.`);
              }
              if (isNaN(finalExam) || finalExam < 0 || finalExam > 100) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} آخر العام (${row[fIdx] ?? 0}) يجب أن تكون بين 0 و 100.`);
              }
            } else {
              const excelColIdx = startColIdx + idx;
              const rawVal = Number(row[excelColIdx] || 0);
              if (isNaN(rawVal) || rawVal < 0 || rawVal > 190) {
                validationErrors.push(`السطر ${rowNum}: الدرجة الكلية لـ ${sub.name} (${row[excelColIdx] ?? 0}) يجب أن تكون بين 0 و 190.`);
              }
            }
          });

          validRows.push(row);
        }

        if (validationErrors.length > 0) {
          const displayedErrors = validationErrors.slice(0, 5).join('\n');
          const remainingCount = validationErrors.length - 5;
          const remainingMsg = remainingCount > 0 ? `\n... و (${remainingCount}) خطأ إضافي.` : '';
          triggerError(`تم إلغاء الاستيراد بسبب وجود أخطاء في البيانات مدخلة:\n${displayedErrors}${remainingMsg}`);
          e.target.value = '';
          return;
        }

        const updatedList = [...bulkStudents];
        let matchCount = 0;
        let newCount = 0;

        for (const row of validRows) {
          const name = String(row[0]).trim();
          const seatNumber = String(row[1]).trim();
          const gradeId = String(row[2]).trim();

          const isLegacyTemplate = row.length > currentGrade.subjects.length + 3;
          const startColIdx = isLegacyTemplate ? 5 : 3;

          let presentDays = 180;
          let absentDays = 0;
          if (isLegacyTemplate) {
            presentDays = Number(row[3] ?? 180);
            absentDays = Number(row[4] ?? 0);
          }

          presentDays = isNaN(presentDays) ? 180 : Math.max(0, Math.floor(presentDays));
          absentDays = isNaN(absentDays) ? 0 : Math.max(0, Math.floor(absentDays));

          const totalDays = presentDays + absentDays;
          const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

          const colsPerSubject = (row.length - startColIdx) >= (currentGrade.subjects.length * 3) ? 3 : 1;

          const subjectGrades: { [subId: string]: { monthly: number, midTerm: number, finalExam: number } } = {};
          currentGrade.subjects.forEach((sub, idx) => {
            if (colsPerSubject === 3) {
              const mIdx = startColIdx + idx * 3;
              const tIdx = startColIdx + idx * 3 + 1;
              const fIdx = startColIdx + idx * 3 + 2;
              
              const monthly = Number(row[mIdx] ?? 0);
              const midTerm = Number(row[tIdx] ?? 0);
              const finalExam = Number(row[fIdx] ?? 0);
              
              subjectGrades[sub.id] = { monthly, midTerm, finalExam };
            } else {
              const excelColIdx = startColIdx + idx;
              const rawVal = Number(row[excelColIdx] || 0);
              
              const monthly = Math.round(rawVal * 0.2);
              const midTerm = Math.round(rawVal * 0.4);
              const finalExam = rawVal - (monthly + midTerm);
              subjectGrades[sub.id] = { monthly, midTerm, finalExam };
            }
          });

          const calculated = calculateStudentResult({
            name,
            seatNumber,
            grade: gradeId,
            subjectGrades
          }, currentGrade);

          const existingIdx = updatedList.findIndex(s => s.seatNumber === seatNumber);

          if (existingIdx >= 0) {
            updatedList[existingIdx] = {
              ...updatedList[existingIdx],
              name,
              subjectGrades,
              totalPoints: calculated.totalPoints,
              resultStatus: calculated.resultStatus,
              reason: calculated.reason,
              presentDays,
              absentDays,
              attendancePercentage
            };
            matchCount++;
          } else {
            updatedList.push({
              id: "stud_" + seatNumber,
              name,
              seatNumber,
              grade: gradeId,
              subjectGrades,
              totalPoints: calculated.totalPoints,
              resultStatus: calculated.resultStatus,
              reason: calculated.reason,
              presentDays,
              absentDays,
              attendancePercentage
            });
            newCount++;
          }
        }

        setBulkStudents(updatedList);
        triggerSuccess(`تم الاستيراد بنجاح: تم تحديث (${matchCount}) طالب، وإضافة (${newCount}) طالب جديد بالجدول. يرجى الضغط على "حفظ التراخيص والدرجات سحابياً" لتثبيت التعديلات.`);
        e.target.value = '';
      } catch (err) {
        console.error(err);
        triggerError('حدث خطأ فني أثناء قراءة وتجهيز علامات ملف الإكسل المرفوع.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // ----------------------------------------------------
  // Excel Template Generator & Download
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    // Generate headers on base of selected grade or fallback to first grade settings
    const activeGradeId = bulkSelectedGrade || (grades[0]?.id || "1");
    const currentGrade = grades.find(g => g.id === activeGradeId) || grades[0] || { id: "1", gradeName: "الصف الأول", subjects: [] };
    
    const headers = [
      "اسم الطالب",
      "الرقم المدرسي",
      "معرف الصف",
      "أيام الحضور",
      "أيام الغياب"
    ];

    const demoRow = ["اسم مالي تجريبي كامل", "1005", currentGrade.id, "180", "5"];

    // Add subjects column names with independent grade components
    currentGrade.subjects.forEach(sub => {
      headers.push(`${sub.name} - أعمال الشهر (40)`);
      headers.push(`${sub.name} - نصف العام (50)`);
      headers.push(`${sub.name} - آخر العام (100)`);
      
      demoRow.push("35", "45", "85"); // independent mock values
    });

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      demoRow
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `قالب استيراد ${currentGrade.gradeName}`);

    // File saver
    XLSX.writeFile(wb, `قالب_استيراد_طلاب_${currentGrade.gradeName.replace(/ /g, '_')}.xlsx`);
    triggerSuccess(`تم تنزيل قالب Excel الاسترشادي لـ (${currentGrade.gradeName}) بنجاح.`);
  };

  // ----------------------------------------------------
  // Excel Import Parser
  // ----------------------------------------------------
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          triggerError('ملف Excel فارغ أو غير منسق بشكل صحيح.');
          return;
        }

        const rows = data.slice(1);

        // --- DATA VALIDATION STAGE ---
        const validationErrors: string[] = [];
        const validRows: {
          row: any[];
          rowNum: number;
          gradeConfig: GradeSetting;
        }[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // Row number in Excel

          if (row.length === 0 || (!row[0] && !row[1] && !row[2])) {
            continue; // Skip empty rows
          }

          const name = row[0] ? String(row[0]).trim() : '';
          const seatNumber = row[1] ? String(row[1]).trim() : '';
          const gradeId = row[2] ? String(row[2]).trim() : '';

          if (!name) {
            validationErrors.push(`السطر ${rowNum}: اسم الطالب فارغ.`);
          } else if (name.length < 2 || name.length > 128) {
            validationErrors.push(`السطر ${rowNum}: اسم الطالب (${name}) يجب أن يكون طوله بين 2 إلى 128 حرفاً.`);
          }

          if (!seatNumber) {
            validationErrors.push(`السطر ${rowNum}: الرقم المدرسي فارغ.`);
          }

          if (!gradeId) {
            validationErrors.push(`السطر ${rowNum}: معرف الصف فارغ.`);
            continue;
          }

          const gradeConfig = grades.find(g => g.id === gradeId);
          if (!gradeConfig) {
            validationErrors.push(`السطر ${rowNum}: معرف الصف (${gradeId}) غير مفعّل أو مفقود في قاعدة البيانات.`);
            continue;
          }

          const isLegacyTemplate = row.length > gradeConfig.subjects.length + 3;
          const startColIdx = isLegacyTemplate ? 5 : 3;

          // Attendance Validation
          if (isLegacyTemplate) {
            const present = Number(row[3] ?? 0);
            const absent = Number(row[4] ?? 0);
            if (isNaN(present) || present < 0) {
              validationErrors.push(`السطر ${rowNum}: قيمة أيام الحضور (${row[3]}) غير صالحة في العمود الرابع.`);
            }
            if (isNaN(absent) || absent < 0) {
              validationErrors.push(`السطر ${rowNum}: قيمة أيام الغياب (${row[4]}) غير صالحة في العمود الخامس.`);
            }
          }

          // Subject Grades Validation
          const colsPerSubject = (row.length - startColIdx) >= (gradeConfig.subjects.length * 3) ? 3 : 1;
          gradeConfig.subjects.forEach((sub, idx) => {
            if (colsPerSubject === 3) {
              const mIdx = startColIdx + idx * 3;
              const tIdx = startColIdx + idx * 3 + 1;
              const fIdx = startColIdx + idx * 3 + 2;

              const monthly = Number(row[mIdx] ?? 0);
              const midTerm = Number(row[tIdx] ?? 0);
              const finalExam = Number(row[fIdx] ?? 0);

              if (isNaN(monthly) || monthly < 0 || monthly > 40) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} الشهري (${row[mIdx] ?? 0}) يجب أن تكون بين 0 و 40.`);
              }
              if (isNaN(midTerm) || midTerm < 0 || midTerm > 50) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} نصف العام (${row[tIdx] ?? 0}) يجب أن تكون بين 0 و 50.`);
              }
              if (isNaN(finalExam) || finalExam < 0 || finalExam > 100) {
                validationErrors.push(`السطر ${rowNum}: درجة ${sub.name} آخر العام (${row[fIdx] ?? 0}) يجب أن تكون بين 0 و 100.`);
              }
            } else {
              const excelColIdx = startColIdx + idx;
              const rawVal = Number(row[excelColIdx] || 0);
              if (isNaN(rawVal) || rawVal < 0 || rawVal > 190) {
                validationErrors.push(`السطر ${rowNum}: الدرجة الكلية لـ ${sub.name} (${row[excelColIdx] ?? 0}) يجب أن تكون بين 0 و 190.`);
              }
            }
          });

          validRows.push({ row, rowNum, gradeConfig });
        }

        if (validationErrors.length > 0) {
          const displayedErrors = validationErrors.slice(0, 5).join('\n');
          const remainingCount = validationErrors.length - 5;
          const remainingMsg = remainingCount > 0 ? `\n... و (${remainingCount}) خطأ إضافي.` : '';
          triggerError(`تم إلغاء الاستيراد بسبب وجود أخطاء في البيانات مدخلة:\n${displayedErrors}${remainingMsg}`);
          e.target.value = '';
          return;
        }

        let importCount = 0;

        for (const record of validRows) {
          const { row, gradeConfig } = record;
          const name = String(row[0]).trim();
          const seatNumber = String(row[1]).trim();
          const gradeId = String(row[2]).trim();

          const isLegacyTemplate = row.length > gradeConfig.subjects.length + 3;
          const startColIdx = isLegacyTemplate ? 5 : 3;

          let presentDays = 180;
          let absentDays = 0;
          if (isLegacyTemplate) {
            presentDays = Number(row[3] ?? 180);
            absentDays = Number(row[4] ?? 0);
          }

          presentDays = isNaN(presentDays) ? 180 : Math.max(0, Math.floor(presentDays));
          absentDays = isNaN(absentDays) ? 0 : Math.max(0, Math.floor(absentDays));

          const totalDays = presentDays + absentDays;
          const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

          const colsPerSubject = (row.length - startColIdx) >= (gradeConfig.subjects.length * 3) ? 3 : 1;

          const subjectGrades: { [subjectId: string]: { monthly: number, midTerm: number, finalExam: number } } = {};
          gradeConfig.subjects.forEach((sub, idx) => {
            if (colsPerSubject === 3) {
              const mIdx = startColIdx + idx * 3;
              const tIdx = startColIdx + idx * 3 + 1;
              const fIdx = startColIdx + idx * 3 + 2;
              
              const monthly = Number(row[mIdx] ?? 0);
              const midTerm = Number(row[tIdx] ?? 0);
              const finalExam = Number(row[fIdx] ?? 0);
              
              subjectGrades[sub.id] = { monthly, midTerm, finalExam };
            } else {
              const excelColIdx = startColIdx + idx;
              const rawVal = Number(row[excelColIdx] || 0);
              
              const monthly = Math.round(rawVal * 0.2);
              const midTerm = Math.round(rawVal * 0.4);
              const finalExam = rawVal - (monthly + midTerm);
              subjectGrades[sub.id] = { monthly, midTerm, finalExam };
            }
          });

          const calcInput = {
            name,
            seatNumber,
            grade: gradeId,
            subjectGrades
          };
          const calculated = calculateStudentResult(calcInput, gradeConfig);

          // Check if student already exists by seatNumber (to satisfy "create or update")
          const existingStudent = students.find(s => s.seatNumber === seatNumber);
          const studentPayload: Student = {
            id: existingStudent ? existingStudent.id : ("stud_" + seatNumber),
            name,
            seatNumber,
            grade: gradeId,
            subjectGrades,
            totalPoints: calculated.totalPoints,
            resultStatus: calculated.resultStatus,
            reason: calculated.reason,
            presentDays,
            absentDays,
            attendancePercentage
          };

          await dbService.saveStudent(studentPayload);
          importCount++;
        }

        triggerSuccess(`تم بنجاح استيراد وتحديث كشوف عدد (${importCount}) طالب في الفيرستور.`);
        loadAllRecords();
        e.target.value = '';
      } catch (err) {
        console.error(err);
        triggerError('حدث خطأ فني أثناء قراءة وتثبيت ملف Excel الحسابي.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // ----------------------------------------------------
  // Student Actions Form Submits
  // ----------------------------------------------------
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      name: '',
      seatNumber: '',
      grade: grades[0]?.id || '',
      subjectGrades: {}
    });
    setIsAddStudentOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      seatNumber: student.seatNumber,
      grade: student.grade,
      subjectGrades: { ...student.subjectGrades }
    });
    setIsAddStudentOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.seatNumber || !studentForm.grade) {
      triggerError('يرجى تعبئة كافة الحقول الأساسية للطالب.');
      return;
    }

    const gradeConfig = grades.find(g => g.id === studentForm.grade);
    if (!gradeConfig) {
      triggerError('تكوينات الصف الدراسي المحدد مفقودة.');
      return;
    }

    try {
      // Calculate results
      const calcData = {
        name: studentForm.name,
        seatNumber: studentForm.seatNumber,
        grade: studentForm.grade,
        subjectGrades: studentForm.subjectGrades
      };
      const calculated = calculateStudentResult(calcData, gradeConfig);

      const targetId = editingStudent ? editingStudent.id : "stud_" + Date.now();
      const studentPayload: Student = {
        id: targetId,
        ...calcData,
        ...calculated
      };

      await dbService.saveStudent(studentPayload);
      triggerSuccess(editingStudent ? 'تم تحديث درجات وتفاصيل الطالب بنجاح.' : 'تم تسجيل الطالب الجديد بنجاح في قاعدة البيانات.');
      setIsAddStudentOpen(false);
      loadAllRecords();
    } catch (e: any) {
      triggerError(e.message || 'فشلت عملية حفظ الطالب.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطالب وسجل درجاته بالكامل؟')) return;
    try {
      await dbService.deleteStudent(id);
      triggerSuccess('تم حذف سجلات الطالب بنجاح.');
      loadAllRecords();
    } catch (e) {
      triggerError('تم رفض عملية الحذف لعدم توفر الصلاحيات الكافية.');
    }
  };

  // ----------------------------------------------------
  // Custom Dynamic Form Field Actions
  // ----------------------------------------------------
  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) {
      triggerError('يرجى تحديد اسم / وصف الخانة المخصصة.');
      return;
    }
    
    try {
      const fieldId = 'cf_' + Date.now();
      const newField: CustomFormField = {
        id: fieldId,
        section: newFieldSection,
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired,
        placeholder: newFieldPlaceholder.trim() || undefined
      };
      
      await dbService.saveCustomField(newField);
      triggerSuccess('تمت إضافة الخانة المخصصة بنجاح.');
      
      // Reset form
      setNewFieldLabel('');
      setNewFieldPlaceholder('');
      setNewFieldRequired(false);
      setIsAddFieldOpen(false);
      
      await loadAllRecords();
    } catch (err) {
      console.error(err);
      triggerError('حدث خطأ أثناء حفظ الخانة المخصصة.');
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الخانة المخصصة؟ سيؤدي ذلك لإخفائها من النماذج العامة.')) return;
    try {
      await dbService.deleteCustomField(id);
      triggerSuccess('تم حذف الخانة المخصصة بنجاح.');
      await loadAllRecords();
    } catch (err) {
      console.error(err);
      triggerError('حدث خطأ أثناء حذف الخانة المخصصة.');
    }
  };

  const handleClearRegistrationFields = async () => {
    const regFields = customFields.filter(f => f.section === 'registration');
    if (regFields.length === 0) {
      triggerError('لا توجد حقول مخصصة مضافة حالياً لتسجيل الطلاب الجدد لحذف القائمة.');
      return;
    }
    if (!window.confirm('🚨 تحذير: هل أنت متأكد من رغبتك في حذف قائمة الحقول بالكامل؟ سيتم مسح جميع الحقول الإضافية المخصصة لنموذج التسجيل من قاعدة البيانات.')) return;
    try {
      // Direct Firestore deletions or local storage deletions for all registration fields
      for (const field of regFields) {
        await dbService.deleteCustomField(field.id);
      }
      triggerSuccess('تم حذف قائمة الحقول المخصصة لنموذج التسجيل بالكامل بنجاح من قاعدة البيانات.');
      await loadAllRecords();
    } catch (err) {
      console.error(err);
      triggerError('حدث خطأ أثناء حذف قائمة الحقول المخصصة.');
    }
  };

  const handleDownloadRegistrationsExcel = () => {
    if (registrations.length === 0) {
      triggerError('لا توجد طلبات تسجيل متاحة للتصدير حالياً.');
      return;
    }

    const regCustomFieldsList = customFields.filter(f => f.section === 'registration');

    // Build workbook headers
    const headers = [
      "اسم الطالب",
      "الجنس",
      "الصف الدراسي",
      "تاريخ الميلاد",
      "الرقم الوطني/الهوية",
      "اسم ولي الأمر",
      "رقم الجوال",
      "العنوان بالتفصيل",
      "تاريخ تقديم الطلب",
      "حالة الطلب",
      "رد الإدارة / الملاحظات"
    ];

    // Add custom field labels dynamically as columns
    regCustomFieldsList.forEach(field => {
      headers.push(field.label);
    });

    // Translate each registration data row
    const rows = registrations.map(reg => {
      const gradeName = grades.find(g => g.id === reg.gradeId)?.gradeName || reg.gradeId;
      const formattedDate = new Date(reg.submissionDate).toLocaleDateString('ar-EG');
      
      const rowData = [
        reg.studentName,
        reg.gender,
        gradeName,
        reg.birthDate,
        reg.nationalId,
        reg.parentName,
        reg.parentPhone,
        reg.address || '',
        formattedDate,
        reg.status,
        reg.notes || ''
      ];

      // Retrieve dynamic responses
      regCustomFieldsList.forEach(field => {
        const val = reg.customFields?.[field.id];
        let displayVal = '';
        if (val === true) {
          displayVal = 'نعم / مؤكد';
        } else if (val === false) {
          displayVal = 'لا';
        } else if (val !== undefined && val !== null) {
          displayVal = String(val);
        }
        rowData.push(displayVal);
      });

      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "طلبات التسجيل كشف موحد");
    XLSX.writeFile(wb, "طلبات_تسجيل_الطلاب_الجدد_المسجلين.xlsx");
    triggerSuccess("تم تصدير قائمة طلبات التسجيل للطلاب الجدد بالكامل إلى ملف Excel بنجاح.");
  };

  const handleExportCustomGradeViewExcel = (type: 'monthly' | 'midTerm' | 'finalExam') => {
    const typeLabel = type === 'monthly' ? 'درجات الاختبارات الشهرية' : type === 'midTerm' ? 'درجات نصف العام' : 'درجات آخر العام';
    const activeClassSymbol = gradeViewClass;
    const searchText = gradeViewSearch.toLowerCase().trim();

    // Filter students
    const filteredStudents = students.filter(s => {
      const matchClass = activeClassSymbol === 'all' || s.grade === activeClassSymbol;
      const matchSearch = !searchText || s.name.toLowerCase().includes(searchText) || s.seatNumber.includes(searchText);
      return matchClass && matchSearch;
    });

    if (filteredStudents.length === 0) {
      triggerError(`لا توجد قيود طلاب لمطابقتها في كشف ${typeLabel} تحت المعايير المحددة.`);
      return;
    }

    // Build workbook headers
    const headers = ["الرقم المدرسي", "اسم الطالب بالكامل", "الصف الدراسي"];
    
    // Obtain dynamic subject list
    const isSingleClass = activeClassSymbol !== 'all';
    let subjectsToHeader: { id: string, name: string }[] = [];
    if (isSingleClass) {
      const currentClassConfig = grades.find(g => g.id === activeClassSymbol);
      if (currentClassConfig) {
        subjectsToHeader = currentClassConfig.subjects.map(s => ({ id: s.id, name: s.name }));
      }
    } else {
      const seen = new Set<string>();
      grades.forEach(g => {
        g.subjects.forEach(sub => {
          if (!seen.has(sub.id)) {
            seen.add(sub.id);
            subjectsToHeader.push({ id: sub.id, name: sub.name });
          }
        });
      });
    }

    subjectsToHeader.forEach(sub => {
      headers.push(`${sub.name}`);
    });

    const rows = filteredStudents.map(std => {
      const classObj = grades.find(g => g.id === std.grade);
      const className = classObj?.gradeName || std.grade;
      const rowData = [std.seatNumber, std.name, className];

      subjectsToHeader.forEach(sub => {
        const raw = std.subjectGrades[sub.id];
        let valOfPeriod = 0;
        if (raw && typeof raw === 'object') {
          valOfPeriod = Number((raw as any)[type] ?? 0);
        } else if (typeof raw === 'number') {
          const flatNum = raw;
          if (type === 'monthly') {
            valOfPeriod = Math.round(flatNum * 0.4);
          } else if (type === 'midTerm') {
            valOfPeriod = Math.round(flatNum * 0.5);
          } else {
            valOfPeriod = Math.round(flatNum * 1.0);
          }
        }
        rowData.push(valOfPeriod);
      });

      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كشف العلامات المعتمدة");
    XLSX.writeFile(wb, `كشف_${typeLabel.replace(/ /g, '_')}_تصدير_إداري.xlsx`);
    triggerSuccess(`تم تصدير ملف إكسل لـ ${typeLabel} لـ (${filteredStudents.length}) طالب بنجاح.`);
  };

  // ----------------------------------------------------
  // New Student Registration Admissions Handlers
  // ----------------------------------------------------
  const handleAcceptInitially = async (id: string, notesText: string) => {
    try {
      const regObj = registrations.find(r => r.id === id);
      if (!regObj) return;

      const updatedReg: NewStudentRegistration = {
        ...regObj,
        status: 'مقبول مبدئياً',
        notes: notesText.trim() || 'تم قبول طلب الالتحاق مبدئياً. يرجى مراجعة إدارة المدرسة في الموعد المحدد لإجراء المقابلة الشخصية وإتمام الملف الأكاديمي.'
      };

      await dbService.saveRegistration(updatedReg);
      triggerSuccess(`تم القبول المبدئي للطالب: ${regObj.studentName} بنجاح.`);
      await loadAllRecords();
      setSelectedReg(null);
      setRegNotes('');
    } catch (err: any) {
      console.error(err);
      triggerError('فشل تحديث حالة الطلب إلى قبول مبدئي.');
    }
  };

  const handleRejectRegistration = async (id: string, notesText: string) => {
    try {
      const regObj = registrations.find(r => r.id === id);
      if (!regObj) return;

      const updatedReg: NewStudentRegistration = {
        ...regObj,
        status: 'مرفوض',
        notes: notesText.trim() || 'نعتذر منكم، تعذر قبول طلب الالتحاق بالوقت الحالي نظراً لعدم استيفاء السن القانوني أو الشروط المعتمدة.'
      };

      await dbService.saveRegistration(updatedReg);
      triggerSuccess(`تم رفض طلب الطالب: ${regObj.studentName}.`);
      await loadAllRecords();
      setSelectedReg(null);
      setRegNotes('');
    } catch (err: any) {
      console.error(err);
      triggerError('فشل تحديث حالة الطلب إلى الرفض.');
    }
  };

  const handleFinalEnrollStudent = async (id: string, customSeatNumber: string) => {
    try {
      const regObj = registrations.find(r => r.id === id);
      if (!regObj) return;

      const seat = customSeatNumber.trim();
      if (!seat) {
        triggerError('يرجى تحديد رقم مدرسي رسمي للطالب لترسيمه في كشوفات الصف.');
        return;
      }

      // Check duplicate seat
      const duplicateSeat = students.find(s => s.seatNumber === seat);
      if (duplicateSeat) {
        triggerError('الرقم المدرسي هذا مستخدم بالفعل لطالب آخر بالبوابة الفورية. يرجى اختيار رقم فريد.');
        return;
      }

      const gradeConfig = grades.find(g => g.id === regObj.gradeId);
      if (!gradeConfig) {
        triggerError('تكوينات الصف المطلوب للتعليم غير مفعّلة في لوحة التحكم الإدارية.');
        return;
      }

      // Initialize default zero grades structures
      const subjectGrades: { [subjectId: string]: any } = {};
      gradeConfig.subjects.forEach(sub => {
        subjectGrades[sub.id] = {
          halfExam: 0,
          classWork: 0,
          finalExam: 0,
          monthlyExam: 0
        };
      });

      const calcData = {
        name: regObj.studentName,
        seatNumber: seat,
        grade: regObj.gradeId,
        subjectGrades: subjectGrades
      };
      const calculated = calculateStudentResult(calcData, gradeConfig);

      const enrolledStudentPay: Student = {
        id: "stud_" + seat + "_" + Date.now(),
        ...calcData,
        ...calculated
      };

      // 1. Direct save student to roster
      await dbService.saveStudent(enrolledStudentPay);

      // 2. Mark registry as officially enrolled
      const updatedReg: NewStudentRegistration = {
        ...regObj,
        status: 'مقبول مبدئياً',
        notes: `مبروك! تم القبول النهائي والتسليم الرسمي لملف الطالب بالعام الجديد. الرقم المدرسي المولد: [${seat}]`
      };
      await dbService.saveRegistration(updatedReg);

      triggerSuccess(`تم بنجاح الانتهاء من ترسيم الطالب وقيده في الكشوفات بالرقم المدرسي: ${seat}.`);
      await loadAllRecords();
      setSelectedReg(null);
      setRegNotes('');
    } catch (err: any) {
      console.error(err);
      triggerError('حدث خطأ أثناء ترسيم وعقد القيد الرسمي للطالب.');
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف طلب التسجيل المختار نهائياً؟')) return;
    try {
      await dbService.deleteRegistration(id);
      triggerSuccess('تم حذف طلب التسجيل بنجاح من الطابور.');
      await loadAllRecords();
      if (selectedReg?.id === id) {
        setSelectedReg(null);
        setRegNotes('');
      }
    } catch (err) {
      console.error(err);
      triggerError('فشل حذف طلب تقديم الطالب.');
    }
  };

  // ----------------------------------------------------
  // Teacher Actions
  // ----------------------------------------------------
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.email || !teacherForm.grade) {
      triggerError('يرجى تعبئة حقول المعلم بشكل صحيح.');
      return;
    }

    try {
      const normalizedEmail = teacherForm.email.trim().toLowerCase();
      const payload: Teacher = {
        id: normalizedEmail,
        name: teacherForm.name,
        email: normalizedEmail,
        grade: teacherForm.grade
      };
      await dbService.saveTeacher(payload);
      triggerSuccess('تم تجنيد وإضافة المعلم بنجاح.');
      setIsAddTeacherOpen(false);
      setTeacherForm({ name: '', email: '', grade: '' });
      loadAllRecords();
    } catch (e) {
      triggerError('حدث خطأ في صلاحية الحفظ.');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm('هل تريد بالتأكيد إلغاء صلاحية هذا المعلم وحذفه من النظام؟')) return;
    try {
      await dbService.deleteTeacher(id);
      triggerSuccess('تم حذف المعلم بنجاح.');
      loadAllRecords();
    } catch (e) {
      triggerError('فشل حذف سجل المعلم.');
    }
  };

  // ----------------------------------------------------
  // Supervisor Actions
  // ----------------------------------------------------
  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorForm.name || !supervisorForm.email) {
      triggerError('يرجى تعبئة حقول المشرف بشكل صحيح.');
      return;
    }

    try {
      const emailId = supervisorForm.email.trim().toLowerCase();
      const payload: Supervisor = {
        id: emailId,
        name: supervisorForm.name,
        email: emailId,
        createdAt: new Date().toISOString()
      };
      await dbService.saveSupervisor(payload);
      triggerSuccess('تم تفويض وإضافة المشرف بكامل الصلاحيات بنجاح.');
      setIsAddSupervisorOpen(false);
      setSupervisorForm({ name: '', email: '' });
      loadAllRecords();
    } catch (e: any) {
      console.error("Save supervisor failed:", e);
      let errorText = 'حدث خطأ في صلاحية حفظ المشرف.';
      try {
        const parsed = JSON.parse(e.message);
        if (parsed && parsed.error) {
          errorText += ` (سبب الخطأ: ${parsed.error})`;
        }
      } catch (err) {
        if (e instanceof Error) {
          errorText += ` (سبب الخطأ: ${e.message})`;
        } else {
          errorText += ` (سبب الخطأ: ${String(e)})`;
        }
      }
      triggerError(errorText);
    }
  };

  const handleDeleteSupervisor = async (id: string) => {
    if (!window.confirm('هل تريد بالتأكيد إلغاء تفويض هذا المشرف وسحب كامل صلاحياته من النظام؟')) return;
    try {
      await dbService.deleteSupervisor(id);
      triggerSuccess('تم سحب صلاحيات المشرف وحذف حسابه بنجاح.');
      loadAllRecords();
    } catch (e: any) {
      console.error("Delete supervisor failed:", e);
      let errorText = 'فشل حذف صلاحيات المشرف.';
      try {
        const parsed = JSON.parse(e.message);
        if (parsed && parsed.error) {
          errorText += ` (سبب الخطأ: ${parsed.error})`;
        }
      } catch (err) {
        if (e instanceof Error) {
          errorText += ` (سبب الخطأ: ${e.message})`;
        } else {
          errorText += ` (سبب الخطأ: ${String(e)})`;
        }
      }
      triggerError(errorText);
    }
  };

  // ----------------------------------------------------
  // Grade Configurations Save
  // ----------------------------------------------------
  const handleSaveGradeSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    try {
      await dbService.saveGradeSetting(editingGrade);
      triggerSuccess('تم حفظ وتحديث إعدادات الصف الدراسي والمواد والنجاح بنجاح.');
      setEditingGrade(null);
      loadAllRecords();
    } catch (e) {
      triggerError('خطأ أثناء تحديث التعديلات بالقواعد.');
    }
  };

  const updateSubjectPassing = (subjectId: string, passingGrade: number) => {
    if (!editingGrade) return;
    const updatedSubjects = editingGrade.subjects.map(s => 
      s.id === subjectId ? { ...s, passingGrade } : s
    );
    setEditingGrade({ ...editingGrade, subjects: updatedSubjects });
  };

  const handleRemoveSubject = (subjectId: string) => {
    if (!editingGrade) return;
    const updatedSubjects = editingGrade.subjects.filter(s => s.id !== subjectId);
    setEditingGrade({ ...editingGrade, subjects: updatedSubjects });
    triggerSuccess('تم إزالة المادة مؤقتاً من القائمة المحددة. يرجى الضغط على حفظ لحفظ التغييرات النهائية.');
  };

  const handleAddNewSubject = () => {
    if (!editingGrade) return;
    const name = newSubjectName.trim();
    const id = newSubjectId.trim().toLowerCase();

    if (!name || !id) {
      triggerError('يرجى كتابة اسم المادة ومعرفها الفريد باللغة الإنجليزية.');
      return;
    }

    if (editingGrade.subjects.some(s => s.id === id)) {
      triggerError('تنبيه: يوجد مادة أخرى بنفس المعرف المعطى مسبقاً.');
      return;
    }

    const newSub: Subject = {
      id,
      name,
      passingGrade: 50
    };

    const updatedSubjects = [...editingGrade.subjects, newSub];
    setEditingGrade({ ...editingGrade, subjects: updatedSubjects });
    setNewSubjectName('');
    setNewSubjectId('');
    triggerSuccess(`تم إضافة المادة "${name}" مؤقتاً، يرجى الضغط على زر الحفظ أدناه لحفظ الإعدادات.`);
  };

  const getAdminStudentStageScore = (student: Student, grConfig: GradeSetting | undefined) => {
    if (!grConfig) return 0;
    let scoreSum = 0;
    grConfig.subjects.forEach(sub => {
      const sGrades = student.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
      let monthly = 0;
      let midTerm = 0;
      let finalExam = 0;
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

      if (activeRankStage === 'monthly') {
        scoreSum += monthly;
      } else if (activeRankStage === 'half') {
        scoreSum += midTerm;
      } else if (activeRankStage === 'final') {
        scoreSum += finalExam;
      } else {
        scoreSum += (monthly + midTerm + finalExam);
      }
    });
    return scoreSum;
  };

  const isAdminStudentPassedStage = (student: Student) => {
    if (student.resultStatus === 'غائب') return false;
    if (student.resultStatus === 'ناجح') return true;
    const grConfig = grades.find(g => g.id === student.grade);
    if (!grConfig) return true;
    let passed = true;
    grConfig.subjects.forEach(sub => {
      const sGrades = student.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
      let monthly = 0;
      let midTerm = 0;
      let finalExam = 0;
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
      if (activeRankStage === 'monthly') {
        val = monthly;
        threshold = 20;
      } else if (activeRankStage === 'half') {
        val = midTerm;
        threshold = 25;
      } else if (activeRankStage === 'final') {
        val = finalExam;
        threshold = 50;
      } else {
        val = monthly + midTerm + finalExam;
        threshold = 95;
      }
      if (val < threshold) passed = false;
    });
    return passed;
  };

  const getStudentRankInGrade = (student: Student) => {
    if (!isAdminStudentPassedStage(student)) {
      return null;
    }
    const gradeStudents = students.filter(s => s.grade === student.grade && isAdminStudentPassedStage(s));
    const grConfig = grades.find(g => g.id === student.grade);
    gradeStudents.sort((a, b) => {
      const scoreA = getAdminStudentStageScore(a, grConfig);
      const scoreB = getAdminStudentStageScore(b, grConfig);
      return scoreB - scoreA;
    });
    const rankIndex = gradeStudents.findIndex(s => s.id === student.id);
    return rankIndex !== -1 ? rankIndex + 1 : null;
  };

  const getAdminSortedStudents = () => {
    return [...students].sort((a, b) => {
      if (a.grade !== b.grade) {
        return a.grade.localeCompare(b.grade); // Group by grade first
      }
      const grConfig = grades.find(g => g.id === a.grade);
      return getAdminStudentStageScore(b, grConfig) - getAdminStudentStageScore(a, grConfig);
    });
  };

  const getGradeStudentsCount = (gradeId: string) => {
    return students.filter(s => s.grade === gradeId).length;
  };

  const getGradePassingStudentsCount = (gradeId: string) => {
    return students.filter(s => s.grade === gradeId && isAdminStudentPassedStage(s)).length;
  };

  // ----------------------------------------------------
  // Complaints Operations
  // ----------------------------------------------------
  const resolveComplaint = async (id: string) => {
    try {
      const target = complaints.find(c => c.id === id);
      if (!target) return;
      
      const updatedItem = { ...target, status: 'تم حلها' };
      await dbService.saveComplaint(updatedItem);
      
      setComplaints(prev => prev.map(c => c.id === id ? updatedItem : c));
      triggerSuccess('تم تغيير حالة التظلم إلى "تم حلها" وأرشفة الطلب بنجاح.');
    } catch (err) {
      console.error(err);
      triggerError('حدث خطأ أثناء تحديث حالة التظلم بالفيرستور.');
    }
  };

  const deleteComplaint = async (id: string) => {
    try {
      await dbService.deleteComplaint(id);
      setComplaints(prev => prev.filter(c => c.id !== id));
      triggerSuccess('تم حذف التظلم.');
    } catch (err) {
      console.error(err);
      triggerError('حدث خطأ أثناء حذف التظلم من الفيرستور.');
    }
  };

  // ==========================================
  // CALCULATE STATISTICS FOR CHARTS
  // ==========================================
  
  // 1. Student Count by Grade level (Bar Chart Data)
  const chartGradeData = grades.map(g => {
    const count = students.filter(s => s.grade === g.id).length;
    return {
      name: g.gradeName,
      'عدد الطلاب': count
    };
  });

  // 2. School overall pass vs fail (Pie Chart Data)
  const countPass = students.filter(s => s.resultStatus === 'ناجح').length;
  const countFail = students.filter(s => s.resultStatus === 'راسب').length;
  const countAbsent = students.filter(s => s.resultStatus === 'غائب').length;

  const chartPieData = [
    { name: 'ناجح', value: countPass === 0 && countFail === 0 ? 1 : countPass, color: '#10b981' },
    { name: 'راسب / باقٍ', value: countFail, color: '#ef4444' }
  ];

  // Selected Grade Configuration for input form subjects fields
  const currentSelectedGradeConfig = grades.find(g => g.id === studentForm.grade);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Page Title & Realtime Cloud Sync Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-gradient-to-r from-[#0d2b45] to-[#163f64] text-white p-6 rounded-2xl shadow-md border-r-4 border-[#c9a227]" dir="rtl">
        <div className="text-right">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
            <span>لوحة الإدارة والتحكم المدرسي الشاملة</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a227]/20 border border-[#c9a227]/30 text-[#c9a227] font-semibold animate-pulse">
              إشراف مباشر
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            صندوق إدارة شؤون الطلاب، الكادر التعليمي، رصد ومتابعة طلبات التسجيل ودفاتر التظلمات بكفاءة سحابية حية.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Cloud status pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
            {dbService.getConnectionStatus().isSimulated ? (
              <>
                <span className="w-2 rounded-full h-2 bg-amber-500 animate-ping" />
                <span className="text-amber-400">قاعدة بيانات محاكاة (محلية)</span>
              </>
            ) : (
              <>
                <span className="w-2 rounded-full h-2 bg-emerald-500 animate-ping" />
                <span className="text-emerald-400">سحابة حية (Firestore Cloud)</span>
              </>
            )}
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-[#c9a227] hover:bg-[#b08d20] disabled:bg-slate-700 disabled:text-slate-400 text-[#0d2b45] hover:text-white font-extrabold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer border border-[#c9a227]/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'جاري التحديث...' : 'تحديث ومزامنة البيانات'}
          </button>
        </div>
      </div>
      
      {/* Messages */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-100 text-emerald-800 border-r-4 border-emerald-500 rounded-xl font-bold animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-5 h-5" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-100 text-rose-800 border-r-4 border-rose-500 rounded-xl font-bold animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Admin Side Tab list */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-md border border-slate-200">
        <button
          onClick={() => handleTabChange('stats')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'stats' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4 text-[#c9a227]" />
          إحصائيات المدرسة والرسوم
        </button>

        <button
          onClick={() => handleTabChange('students')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'students' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-[#c9a227]" />
          إدارة شؤون الطلاب ({students.length})
        </button>

        <button
          onClick={() => handleTabChange('teachers')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'teachers' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-[#c9a227]" />
          إدارة الكادر التعليمي ({teachers.length})
        </button>

        <button
          onClick={() => handleTabChange('grades')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'grades' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4 text-[#c9a227]" />
          إعدادات الصفوف والمواد
        </button>

        <button
          onClick={() => handleTabChange('complaints')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm relative cursor-pointer ${
            adminTab === 'complaints' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#c9a227]" />
          التظلمات والشكاوى ({complaints.filter(c => c.status !== 'تم حلها').length})
          {complaints.filter(c => c.status !== 'تم حلها').length > 0 && (
            <span className="absolute -top-1 -left-1 bg-rose-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
              {complaints.filter(c => c.status !== 'تم حلها').length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('results_bulk')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'results_bulk' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#c9a227]" />
          رصد وتعديل النتائج جماعياً
        </button>

        <button
          onClick={() => handleTabChange('monthly_grades')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'monthly_grades' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#c9a227]" />
          درجات الشهرية
        </button>

        <button
          onClick={() => handleTabChange('midterm_grades')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'midterm_grades' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#c9a227]" />
          درجات نصف العام
        </button>

        <button
          onClick={() => handleTabChange('final_grades')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'final_grades' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-[#c9a227]" />
          درجات آخر العام
        </button>

        <button
          onClick={() => handleTabChange('registrations')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm relative cursor-pointer ${
            adminTab === 'registrations' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4 text-[#c9a227]" />
          طلبات تسجيل الطلاب الجدد ({registrations.filter(r => r.status === 'قيد المراجعة').length})
          {registrations.filter(r => r.status === 'قيد المراجعة').length > 0 && (
            <span className="absolute -top-1 -left-1 bg-amber-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
              {registrations.filter(r => r.status === 'قيد المراجعة').length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('supervisors')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'supervisors' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4 text-emerald-500" />
          إدارة المشرفين ({supervisors.length})
        </button>

        <button
          onClick={() => handleTabChange('system_reset')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer ${
            adminTab === 'system_reset' ? 'bg-[#0d2b45] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className="w-4 h-4 text-rose-500 animate-spin-slow" />
          تهيئة وترحيل النظام
        </button>
      </div>

      {/* Main Tab content router */}
      {adminTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Info Board Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0d2b45] text-white p-6 rounded-2xl shadow-lg border-b-4 border-[#c9a227] flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">إجمالي طلاب المدرسة الموثقين</p>
                <p className="text-3xl font-black mt-2">{students.length} طالب</p>
              </div>
              <Users className="w-10 h-10 text-[#c9a227]" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-[#0e9e9e] flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">منظومة هيئة التدريس الفعالة</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{teachers.length} معلم</p>
              </div>
              <GraduationCap className="w-10 h-10 text-[#0e9e9e]" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-emerald-500 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">معدل النجاح الإجمالي</p>
                <p className="text-3xl font-black text-slate-800 mt-2">
                  {students.length > 0 ? Math.round((countPass / students.length) * 100) : 0}%
                </p>
              </div>
              <Check className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-rose-500 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">حالات الرسوب الحالية</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{countFail} طالب</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
          </div>

          {/* Graphics Plots and Charts with Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Bar Chart Student Distributions */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
              <h4 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-r-4 border-[#0e9e9e] pr-3">
                توزيع الطلاب الفعلي وفق الصف الدراسي
              </h4>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartGradeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="عدد الطلاب" fill="#0e9e9e" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart Success distribution */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
              <h4 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-r-4 border-[#c9a227] pr-3">
                النسبة المئوية الكلية للنجاح
              </h4>
              <div className="w-full h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Embedded percent overlay */}
                <div className="absolute text-center">
                  <p className="text-3xl font-black text-slate-800">
                    {students.length > 0 ? Math.round((countPass / students.length) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-gray-500 font-bold">نسبة النجاح الكلية</p>
                </div>
              </div>

              {/* Chart Legend display labels */}
              <div className="flex justify-center gap-4 mt-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  ناجح ({countPass})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  رسوب / إعادة ({countFail})
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {adminTab === 'students' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Quick adding Student controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenAddStudent}
                className="px-4 py-2.5 bg-[#0d2b45] text-white font-bold rounded-xl hover:bg-[#0e9e9e] transition-all flex items-center gap-2 cursor-pointer text-sm shadow"
              >
                <UserPlus className="w-4 h-4" />
                إضافة طالب جديد مفرداً
              </button>

              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 bg-[#c9a227] text-[#0d2b45] font-black rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-2 cursor-pointer text-sm shadow"
              >
                <Download className="w-4 h-4" />
                تحميل قالب الاستيراد Excel
              </button>
            </div>

            {/* Document Importing with xlsx drag file trigger inputs */}
            <div className="flex items-center gap-3">
              <div className="relative border-2 border-dashed border-[#0e9e9e] rounded-xl px-4 py-2 hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-[#0e9e9e]" />
                <span className="text-xs font-bold text-[#0e9e9e]">استيراد كشف Excel للطلاب</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* Student database table list card */}
          <AppCard title="سجل طلاب المدرسة وعلاماتهم المعتمدة">
            {/* Interactive evaluation stage filter */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">تعديل معيار الترتيب والنتائج المعروضة:</h5>
                <p className="text-xs text-slate-500">اختر المرحلة الدراسية أو الشهر لفرز الطلاب وعرض ترتيبهم الدقيق بناء عليها فقط للتأكد من استقلال المراحل.</p>
              </div>
              <select
                value={activeRankStage}
                onChange={(e) => setActiveRankStage(e.target.value as any)}
                className="px-4 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-[#0e9e9e] text-right font-bold text-slate-800 text-sm cursor-pointer shadow-sm focus:outline-none"
              >
                <option value="all">المجموع السنوي العام المعتمد (الكل)</option>
                <option value="monthly">الاختبارات الشهرية فقط (من ٤٠ د لكل مادة)</option>
                <option value="half">اختبارات نصف العام فقط (من ٥٠ د لكل مادة)</option>
                <option value="final">اختبارات آخر العام فقط (من ١٠٠ د لكل مادة)</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-4 border-b border-slate-200 font-bold">اسم الطالب</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">الرقم المدرسي</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">الصف الدراسي</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">عدد المواد</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">
                      {activeRankStage === 'all' ? 'مجموع الدرجات الكلي' : activeRankStage === 'monthly' ? 'مجموع أعمال الشهر' : activeRankStage === 'half' ? 'مجموع نصف العام' : 'مجموع اختبار آخر العام'}
                    </th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">الترتيب في الصف</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">المعدل والنتيجة</th>
                    <th className="p-4 border-b border-slate-200 text-center font-bold">خيارات التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 font-medium font-sans">
                        لا يوجد أي سجلات طلاب مدخلة في النظام السحابي حتى الآن. الرجاء الضغط على إضافة أو استيراد Excel.
                      </td>
                    </tr>
                  ) : (
                    getAdminSortedStudents().map(std => {
                      const grConfig = grades.find(g => g.id === std.grade);
                      let monthlyTotal = 0;
                      let midtermTotal = 0;
                      let finalTotal = 0;
                      grConfig?.subjects.forEach(sub => {
                        const raw = std.subjectGrades[sub.id];
                        if (raw && typeof raw === 'object') {
                          monthlyTotal += Number(raw.monthly ?? 0);
                          midtermTotal += Number(raw.midTerm ?? 0);
                          finalTotal += Number(raw.finalExam ?? 0);
                        } else if (typeof raw === 'number') {
                          const flatNum = raw;
                          const m = Math.round(flatNum * 0.4);
                          const h = Math.round(flatNum * 0.5);
                          monthlyTotal += m;
                          midtermTotal += h;
                          finalTotal += Math.round(flatNum * 1.0);
                        }
                      });

                      const stageScore = (() => {
                        if (activeRankStage === 'monthly') return monthlyTotal;
                        if (activeRankStage === 'half') return midtermTotal;
                        if (activeRankStage === 'final') return finalTotal;
                        return monthlyTotal + midtermTotal + finalTotal;
                      })();

                      return (
                        <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-100 font-bold text-slate-800">{std.name}</td>
                          <td className="p-4 border-b border-slate-100 text-center font-mono font-bold text-slate-600">{std.seatNumber}</td>
                          <td className="p-4 border-b border-slate-100 text-center text-slate-700">{grConfig?.gradeName || std.grade}</td>
                          <td className="p-4 border-b border-slate-100 text-center text-xs font-semibold text-slate-500">
                            {grConfig?.subjects.length || 0} مواد مسجلة
                          </td>
                          <td className="p-4 border-b border-slate-100 text-center text-xs font-bold leading-relaxed whitespace-nowrap">
                            <span className="block text-[#0e9e9e] text-sm">مجموع المرحلة: {stageScore} د</span>
                            <span className="block text-[10px] text-slate-400 mt-1">
                              (شهري: {monthlyTotal} | منتصف: {midtermTotal} | نهائي: {finalTotal})
                            </span>
                          </td>
                          <td className="p-4 border-b border-slate-100 text-center font-bold text-amber-600">
                            {getStudentRankInGrade(std) !== null ? `المركز ${getStudentRankInGrade(std)} من ${getGradePassingStudentsCount(std.grade)}` : '—'}
                          </td>
                          <td className="p-4 border-b border-slate-100 text-center">
                            <ResultBadge status={std.resultStatus} />
                          </td>
                          <td className="p-4 border-b border-slate-100 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit command */}
                              <button
                                onClick={() => handleOpenEditStudent(std)}
                                className="p-1.5 bg-slate-100 hover:bg-[#0e9e9e] hover:text-white text-slate-600 rounded-lg transition-all cursor-pointer"
                                title="تعديل الدرجات والمعلومات"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {/* Delete command */}
                              <button
                                onClick={() => handleDeleteStudent(std.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="حذف الطالب بشكل نهائي"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </AppCard>

        </div>
      )}

      {adminTab === 'teachers' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow border border-slate-200">
            <h4 className="text-base font-bold text-slate-800">توزيع الكوادر التدريسية على الفصول الدراسية</h4>
            <button
              onClick={() => setIsAddTeacherOpen(true)}
              className="px-4 py-2 bg-[#0d2b45] text-white font-bold rounded-lg hover:bg-[#0e9e9e] transition-all flex items-center gap-2 text-xs shadow cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              إضافة وتعيين معلم في المدرسة
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left form for quick addition if open */}
            {isAddTeacherOpen && (
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-[#c9a227] animate-fade-in space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h5 className="font-bold text-slate-800">تعيين معلم في النظام</h5>
                  <button onClick={() => setIsAddTeacherOpen(false)} className="text-slate-500 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveTeacher} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">اسم المعلم كاملاً:</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      placeholder="الأستاذ / ..."
                      className="w-full px-3 py-2 text-sm rounded-lg border text-right focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">بريد المعلم الإلكتروني (المستعمل لتسجيل الدخول):</label>
                    <input
                      type="email"
                      required
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      placeholder="teacher@school.com"
                      className="w-full px-3 py-2 text-sm rounded-lg border text-right focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">الصف الدراسي المسؤول عنه:</label>
                    <select
                      required
                      value={teacherForm.grade}
                      onChange={(e) => setTeacherForm({ ...teacherForm, grade: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border bg-white text-right focus:outline-none"
                    >
                      <option value="">اختر صف...</option>
                      {grades.map(gr => (
                        <option key={gr.id} value={gr.id}>{gr.gradeName}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0e9e9e] text-white font-bold rounded-lg hover:bg-[#0d2b45] transition-all text-xs"
                  >
                    حفظ وتأكيد صلاحية المعلم
                  </button>
                </form>
              </div>
            )}

            {/* Teacher distribution table */}
            <div className={`${isAddTeacherOpen ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <AppCard title="سجل المعلمين وصلاحيات الصفوف">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-4 border-b font-bold">اسم المعلم الموثق</th>
                        <th className="p-4 border-b font-bold">البريد الإلكتروني للتحقق</th>
                        <th className="p-4 border-b font-bold">الصف المعين لمراقبته</th>
                        <th className="p-4 border-b font-bold text-center">أدوات التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">لا يوجد معلّمين تم تعيينهم، قم بإضافة المعلمين لتمكينهم من تسجيل الدخول وتحديث الدرجات.</td>
                        </tr>
                      ) : (
                        teachers.map(tr => {
                          const gr = grades.find(g => g.id === tr.grade);
                          return (
                            <tr key={tr.id} className="hover:bg-slate-50">
                              <td className="p-4 border-b font-bold text-slate-800">{tr.name}</td>
                              <td className="p-4 border-b text-slate-600 font-mono text-xs">{tr.email}</td>
                              <td className="p-4 border-b text-[#0e9e9e] font-bold">{gr?.gradeName || tr.grade}</td>
                              <td className="p-4 border-b text-center">
                                <button
                                  onClick={() => handleDeleteTeacher(tr.id)}
                                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                  title="حذف صلاحية الدخول للمدرس"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </AppCard>
            </div>

          </div>

        </div>
      )}

      {adminTab === 'grades' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-right">
              <h4 className="text-sm font-bold text-slate-800 leading-relaxed">
                إعدادات النجاح والرسوب تختلف ديناميكياً لكل صف دراسي مخصص. قم بضبط المواد، ودرجة النجاح لكل منها.
              </h4>
              <p className="text-xs text-slate-500 mt-1">تتيح لك البوابة تهيئة المنهاج الدراسي الرسمي أو تعديل مواد بعينها لمدرستك.</p>
            </div>
            <button
              onClick={handleApplyOfficialCurriculum}
              disabled={resettingCurriculum}
              className="px-5 py-2.5 bg-[#c9a227] hover:bg-amber-500 disabled:bg-slate-300 text-[#0d2b45] font-black rounded-xl transition-all shadow-md hover:shadow-lg text-xs sm:text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap self-stretch md:self-auto justify-center"
            >
              {resettingCurriculum ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0d2b45] border-t-transparent rounded-full animate-spin" />
                  جاري تهيئة المنهاج...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  تطبيق وإعادة ضبط المنهاج الوزاري الرسمي (٩ صفوف)
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* List of grades config */}
            <div className="lg:col-span-1 space-y-4">
              <AppCard title="اختر الصف لضبط مواده">
                <div className="flex flex-col gap-2">
                  {grades.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setEditingGrade({ ...g })}
                      className={`p-4 rounded-xl text-right font-bold transition-all border ${
                        editingGrade?.id === g.id
                          ? 'bg-[#0d2b45] text-white border-[#c9a227] shadow'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {g.gradeName}
                      <span className="block text-xs font-light mt-1 text-slate-400">
                        مجموع المواد: {g.subjects.length}
                      </span>
                    </button>
                  ))}
                </div>
              </AppCard>
            </div>

            {/* Edit Panel for selected grade setting */}
            <div className="lg:col-span-2">
              {editingGrade ? (
                <AppCard title={`تعديل إعدادات نجاح ومواد: ${editingGrade.gradeName}`} icon={<Settings className="w-5 h-5" />}>
                  <form onSubmit={handleSaveGradeSetting} className="space-y-6">

                    {/* Subjects custom pass-marks */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-slate-800 border-r-4 border-[#0e9e9e] pr-2">
                        قائمة المواد والدرجات المحققة للنجاح (الحد الأقصى لكل مادة ١٠٠ د):
                      </h5>
                      
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
                        {editingGrade.subjects.length === 0 ? (
                          <p className="text-center text-slate-400 py-4 text-xs font-semibold">لا توجد أي مواد مسجلة لهذا الصف بعد. يرجى إضافة مواد جديدة أدناه.</p>
                        ) : (
                          editingGrade.subjects.map(sub => (
                            <div key={sub.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b last:border-0 border-slate-200">
                              <div>
                                <p className="font-bold text-slate-800">{sub.name}</p>
                                <span className="text-[10px] text-gray-400">معرف المادة: {sub.id}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-600">درجة النجاح الصغرى:</span>
                                  <input
                                    type="number"
                                    required
                                    min={1}
                                    max={100}
                                    value={sub.passingGrade}
                                    onChange={(e) => updateSubjectPassing(sub.id, Number(e.target.value))}
                                    className="w-20 px-2 py-1 border rounded-lg text-center font-bold text-brand-teal focus:outline-none bg-white"
                                  />
                                  <span className="text-xs text-slate-500">من ١٠٠ د</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubject(sub.id)}
                                  className="px-2.5 py-1 text-xs bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white font-bold rounded-lg transition-all"
                                  title="حذف هذه المادة"
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* inline new subject adder form */}
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-dashed border-[#0e9e9e]/30 space-y-3">
                        <h6 className="text-xs font-black text-[#0d2b45] flex items-center gap-1.5">
                          <span>⚙️</span> إضافة مادة تعليمية جديدة للصف:
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-5">
                            <label className="block text-[11px] text-slate-600 mb-1">اسم المادة (مثال: التربية الوطنية Social Studies)</label>
                            <input
                              type="text"
                              value={newSubjectName}
                              onChange={(e) => setNewSubjectName(e.target.value)}
                              placeholder="اسم المادة"
                              className="w-full text-xs px-2.5 py-2 border rounded-xl focus:outline-none bg-white"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-[11px] text-slate-600 mb-1">رمز المادة (إنجليزية فريدة، مثال: history)</label>
                            <input
                              type="text"
                              value={newSubjectId}
                              onChange={(e) => setNewSubjectId(e.target.value)}
                              placeholder="رمز بالإنجليزية"
                              className="w-full text-xs px-2.5 py-2 border rounded-xl focus:outline-none bg-white font-mono"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <button
                              type="button"
                              onClick={handleAddNewSubject}
                              className="w-full py-2 bg-[#0e9e9e] hover:bg-[#0d2b45] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              إدراج المادة
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#0e9e9e] text-white font-bold rounded-xl hover:bg-[#0d2b45] transition-all text-sm shadow"
                      >
                        حفظ المعايير المعدلة للصف الدراسي
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGrade(null)}
                        className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all text-sm"
                      >
                        إلغاء التعديل
                      </button>
                    </div>

                  </form>
                </AppCard>
              ) : (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 font-sans shadow flex flex-col items-center justify-center space-y-3">
                  <Settings className="w-12 h-12 text-slate-300" />
                  <p>الرجاء اختيار صف دراسي من القائمة الجانبية لتعديل وضبط متطلبات درجات النجاح والغياب الخاصة به.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {adminTab === 'complaints' && (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
          
          {/* Custom Fields Manager for Complaints */}
          <AppCard title="لوحة تخصيص وإضافة حقول استمارة التظلمات والأقسام المخصصة" icon={<Settings className="w-5 h-5 text-[#0e9e9e]" />}>
            <div className="space-y-4 text-right">
              <p className="text-xs text-slate-500">
                تتيح لك هذه اللوحة ديناميكياً إضافة حانات وخانات جديدة لاستمارة تقديم الشكاوى والتظلمات العامة بالطلاب. سيطلب النظام من مقدم الطلب تعبئتها فوراً وسحفظ القيم مع الطلب.
              </p>

              {customFields.filter(f => f.section === 'complaints').length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  لا توجد حقول مخصصة مضافة حالياً لقسم الشكاوى. الاستمارة تحتوي فقط على الحقول الافتراضية الرئيسية.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customFields.filter(f => f.section === 'complaints').map(f => (
                    <div key={f.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800">{f.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                          <span>النوع: {f.type === 'textarea' ? 'شرح/نص طويل' : f.type === 'checkbox' ? 'تأكيد إجباري' : f.type === 'text' ? 'نص قصير' : f.type === 'number' ? 'رقم' : 'تاريخ'}</span>
                          <span>•</span>
                          {f.required ? (
                            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-extrabold text-[9px]">إلزامي (مطلوب)</span>
                          ) : (
                            <span className="bg-slate-105 text-slate-600 px-1.5 py-0.5 rounded font-bold text-[9px]">غير إلزامي (اختياري)</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomField(f.id)}
                        className="py-1 px-2.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg border border-rose-200 transition-all font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        title="حذف هذه الخانة من الاستمارة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الخانة</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isAddFieldOpen && newFieldSection === 'complaints' ? (
                <form onSubmit={handleAddCustomField} className="p-4 bg-slate-100 rounded-2xl border space-y-4">
                  <h6 className="font-bold text-xs text-slate-800">إضافة خانة مخصصة جديدة للشكاوى:</h6>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">اسم/عنوان الحقل:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: رقم الهاتف البديل"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">نوع المدخلات:</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      >
                        <option value="text">نص قصير (Text)</option>
                        <option value="number">رقم (Number)</option>
                        <option value="date">تاريخ (Date)</option>
                        <option value="textarea">نص طويل/أشرح (Textarea)</option>
                        <option value="checkbox">مربع تحديد/إقرار (Checkbox)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">ملاحظة مساعدة/Placeholder:</label>
                      <input
                        type="text"
                        placeholder="تظهر كتلميح داخل الخانة"
                        value={newFieldPlaceholder}
                        onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">حالة الإلزام (درجة الإجبار):</label>
                      <select
                        value={newFieldRequired ? 'true' : 'false'}
                        onChange={(e) => setNewFieldRequired(e.target.value === 'true')}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right font-bold text-slate-700"
                      >
                        <option value="false">غير إلزامي (اختياري / يمكن تجاوزه)</option>
                        <option value="true">إلزامي (مطلوب وإجباري للتعبئة *)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0e9e9e] hover:bg-[#0d2b45] text-white font-extrabold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      حفظ وإدراج الخانة مخصصة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFieldOpen(false);
                        setNewFieldLabel('');
                        setNewFieldPlaceholder('');
                      }}
                      className="px-4 py-2 bg-slate-300 text-slate-705 font-bold rounded-lg transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNewFieldSection('complaints');
                    setIsAddFieldOpen(true);
                  }}
                  className="px-4 py-2 bg-[#0e9e9e]/10 text-[#0e9e9e] border border-[#0e9e9e]/20 font-bold rounded-xl hover:bg-[#0e9e9e] hover:text-white transition-all text-xs cursor-pointer flex items-center gap-1.5 mr-auto"
                >
                  <Plus className="w-4 h-4" />
                  إضافة خانة مخصصة جديدة لاستمارة الشكاوي والتظلمات
                </button>
              )}
            </div>
          </AppCard>

          <AppCard title="صندوق مراجعة التظلمات والشكاوى الحكومية">
            <div className="space-y-4">
              {complaints.length === 0 ? (
                <p className="p-8 text-center text-slate-400"> لا توجد تظلمات أو شكاوى مرفوعة حتى الآن في المنصة.</p>
              ) : (
                complaints.map(comp => (
                  <div 
                    key={comp.id} 
                    className={`p-6 rounded-2xl border transition-all text-right ${
                      comp.status === 'تم حلها' 
                        ? 'bg-emerald-50/50 border-emerald-100 opacity-70' 
                        : 'bg-white border-slate-200 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 mb-3 border-slate-100">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          comp.status === 'تم حلها' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {comp.status}
                        </span>
                        <h5 className="font-extrabold text-slate-800 text-base mt-2">
                          تظلم الطالب: {comp.studentName} {comp.seatNumber ? `(الرقم المدرسي: ${comp.seatNumber})` : ''}
                        </h5>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        تاريخ التقديم: {new Date(comp.date).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700 leading-relaxed mb-4">
                      <p>
                        <strong className="text-slate-900">موضوع الشكوى:</strong> {comp.complaintSubject}
                      </p>
                      <p>
                        <strong className="text-slate-900">شرح وتفاصيل التظلم:</strong> {comp.details}
                      </p>
                      {comp.contactPhone && (
                        <p>
                          <strong className="text-slate-900">رقم جوال ولي الأمر للمتابعة:</strong> {comp.contactPhone}
                        </p>
                      )}
                      {/* Dynamic Custom Fields Values */}
                      {comp.customFields && typeof comp.customFields === 'object' && Object.keys(comp.customFields).length > 0 && (
                        <div className="mt-2 p-3 bg-[#0e9e9e]/5 rounded-xl border border-slate-100 text-xs text-slate-800 space-y-1">
                          <p className="font-extrabold text-[#0d2b45] text-xs">البيانات الإضافية المخصصة:</p>
                          {Object.entries(comp.customFields).map(([fieldId, val]) => {
                            const label = customFields.find(f => f.id === fieldId)?.label || fieldId;
                            return (
                              <p key={fieldId}>
                                <strong className="text-slate-900">{label}:</strong> {String(val === true ? 'نعم (مؤكد)' : val === false ? 'لا' : val)}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {comp.status !== 'تم حلها' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveComplaint(comp.id)}
                          className="px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all text-xs cursor-pointer"
                        >
                          تم حل الشكوى والمراجعة وتحديث الدرجات
                        </button>
                        <button
                          onClick={() => deleteComplaint(comp.id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-xs rounded-lg cursor-pointer font-bold flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          إلغاء الطلب وحذفه
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => deleteComplaint(comp.id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-xs rounded-lg cursor-pointer font-bold flex items-center gap-1.5"
                          title="حذف هذا الطلب نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف هذا التظلم المؤرشف
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </AppCard>

        </div>
      )}

      {adminTab === 'results_bulk' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top selection and configuration bar */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Grade/Class Selector and search */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">تحديد الصف الدراسي للرصد والرفع:</label>
                <select
                  value={bulkSelectedGrade}
                  onChange={(e) => setBulkSelectedGrade(e.target.value)}
                  className="px-4 py-2 text-sm border-2 border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:border-[#0e9e9e] focus:outline-none cursor-pointer"
                >
                  {grades.map(grade => (
                    <option key={grade.id} value={grade.id}>{grade.gradeName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">تصفية وبحث بالاسم أو الرقم المدرسي:</label>
                <input
                  type="text"
                  placeholder="ابحث عن طالب..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  className="px-4 py-1.5 text-sm border-2 border-slate-200 rounded-xl focus:border-[#0e9e9e] focus:outline-none w-64 text-right"
                />
              </div>
            </div>

            {/* Bulk File and database controls */}
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
              {/* Quick Add Row */}
              <button
                onClick={handleBulkAddStudent}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs shadow-sm"
                title="إضافة سطر طالب جديد لجدول الرصد الفوري"
              >
                <Plus className="w-4 h-4 text-[#0e9e9e]" />
                إضافة سطر طالب سريع
              </button>

              {/* Template Download */}
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 bg-[#c9a227]/10 text-[#0d2b45] hover:bg-[#c9a227]/25 font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs shadow-sm"
                title="تحميل قالب إكسل لملء النتائج"
              >
                <Download className="w-4 h-4 text-[#c9a227]" />
                تحميل قالب الرصد Excel
              </button>

              {/* Dynamic Excel Export */}
              <button
                onClick={handleExportBulkExcel}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer text-xs shadow-sm"
                title="تصدير نتائج طلاب الصف الحالي كملف إكسل كامل"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                تصدير النتائج كـ Excel
              </button>

              {/* Excel Upload Input */}
              <div className="relative border-2 border-dashed border-emerald-400 rounded-xl px-4 py-2.5 hover:bg-emerald-50/50 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-600">رفع كشف الدرجات (Excel)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportBulkExcel}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* BIG Save All */}
              <button
                onClick={handleBulkSave}
                disabled={isBulkSaving}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs shadow-md text-white ${
                  isBulkSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0e9e9e] hover:bg-[#0d2b45] cursor-pointer'
                }`}
              >
                {isBulkSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isBulkSaving ? 'جاري الحفظ...' : 'حفظ التراخيص والدرجات سحابياً'}
              </button>
            </div>

          </div>

          {/* Guidelines info */}
          <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl text-amber-950 text-xs leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-900"><AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" /> ميزات وعمليات الرصد لمدير المدرسة:</p>
            <p>• <strong>تحديث العلامات الفوري:</strong> يمكنك إدخال علامات الطلاب مباشرة في الجدول وسيتم حساب المجموع الكلي ودراسة حالة نجاح/رسوب الطالب فور التحديث.</p>
            <p>• <strong>الرفع المطابق (Excel):</strong> عند رفع كشف Excel، يسعى النظام لمطابقة الأرقام المدرسية تلقائياً لتفادي تكرار قيود الطلاب المعتمدة وسجلاتهم.</p>
            <p>• <strong>الاعتماد النهائي:</strong> يرجى الضغط دائماً على زر <strong className="text-slate-900">"حفظ التراخيص والدرجات سحابياً"</strong> باللون الأخضر بالأعلى لتأكيد وتخزين درجات الطلاب سحابياً.</p>
          </div>

          {/* Dense Table wrapper Card */}
          <AppCard title={`رصد وتعديل علامات طلاب: ${grades.find(g => g.id === bulkSelectedGrade)?.gradeName || ''}`} icon={<FileSpreadsheet className="w-5 h-5 text-[#c9a227]" />}>
            
            {/* Component Tabs for Monthly, Mid-term, and Final Exam */}
            <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-slate-100 rounded-xl max-w-full">
              <button
                type="button"
                onClick={() => setBulkGradeTab('monthly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  bulkGradeTab === 'monthly' 
                    ? 'bg-[#0e9e9e] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                الاختبارات الشهرية (القصوى: 40)
              </button>
              <button
                type="button"
                onClick={() => setBulkGradeTab('midTerm')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  bulkGradeTab === 'midTerm' 
                    ? 'bg-[#c9a227] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                امتحان نصف العام (القصوى: 50)
              </button>
              <button
                type="button"
                onClick={() => setBulkGradeTab('finalExam')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  bulkGradeTab === 'finalExam' 
                    ? 'bg-rose-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                امتحان آخر العام (القصوى: 100)
              </button>
            </div>

            {/* If Monthly Tab is active, render Month Selector and Calculation Method */}
            {bulkGradeTab === 'monthly' && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Month Selection */}
                  <div className="space-y-1.5 flex-1">
                    <label className="block text-xs font-black text-slate-700">رصد علامات أعمال الشهر لـ:</label>
                    <div className="flex flex-wrap gap-2">
                      {['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            changeActiveMonth(m, false);
                            applyCalculationMethod(calculationMethod, m);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                            activeMonth === m && !isCustomMonth
                              ? 'bg-[#0e9e9e] text-white border-[#0e9e9e] shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveMonth(customMonthInput || 'مايو', true);
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                          isCustomMonth
                            ? 'bg-[#0e9e9e] text-white border-[#0e9e9e] shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isCustomMonth ? `شهر مخصص: ${activeMonth}` : 'كتابة شهر مخصص...'}
                      </button>
                    </div>

                    {isCustomMonth && (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="اكتب اسم الشهر يدوياً (مثال: مايو)"
                          value={customMonthInput}
                          onChange={(e) => setCustomMonthInput(e.target.value)}
                          className="px-3 py-1.5 text-xs border rounded-lg bg-white font-bold focus:border-[#0e9e9e] focus:outline-none w-48 text-right"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customMonthInput.trim()) {
                              changeActiveMonth(customMonthInput.trim(), true);
                              applyCalculationMethod(calculationMethod, customMonthInput.trim());
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#0e9e9e] hover:bg-[#077d7d] rounded-lg"
                        >
                          اعتماد الشهر يدوياً
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Calculation method setting */}
                  <div className="space-y-1.5 w-full md:w-auto">
                    <label className="block text-xs font-black text-[#c9a227]">طريقة احتساب علامات الشهر الإجمالية الكلية:</label>
                    <select
                      value={calculationMethod}
                      onChange={(e) => {
                        const nextMethod = e.target.value as 'average' | 'highest' | 'active';
                        changeCalculationMethod(nextMethod);
                        applyCalculationMethod(nextMethod, activeMonth);
                      }}
                      className="px-3 py-2 text-xs border rounded-lg bg-white font-bold focus:border-[#0e9e9e] focus:outline-none w-full md:w-64 text-right"
                    >
                      <option value="average">متوسط جميع الشهور المدوّنة (موصى به)</option>
                      <option value="highest">أعلى درجة تم رصدها بين الشهور</option>
                      <option value="active">درجة الشهر النشط الحالي المختار فقط ({activeMonth})</option>
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  * <strong>ملاحظة:</strong> الدرجة الشهرية ستتغير بحسب الشهور المضافة يدوياً، حيث يحسب النظام الدرجة الإجمالية (المحسوبة لنتيجة الطالب الكلية وشهادته) تلقائياً بناء على طريقة الاحتساب المحددة.
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-3 border-b border-slate-200 font-bold min-w-[200px]">اسم الطالب ثلاثياً</th>
                    <th className="p-3 border-b border-slate-200 text-center font-bold min-w-[110px]">الرقم المدرسي الفريد</th>
                    {/* Render subject headings dynamically */}
                    {grades.find(g => g.id === bulkSelectedGrade)?.subjects.map(sub => (
                      <th key={sub.id} className="p-3 border-b border-slate-200 text-center font-bold min-w-[100px] bg-slate-50">
                        {sub.name}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {bulkGradeTab === 'monthly' && `أعمال الشهر: 40 د`}
                          {bulkGradeTab === 'midTerm' && `نصف العام: 50 د`}
                          {bulkGradeTab === 'finalExam' && `آخر العام: 100 د`}
                        </span>
                      </th>
                    ))}
                    <th className="p-3 border-b border-slate-200 text-center font-bold min-w-[110px]">
                      {bulkGradeTab === 'monthly' && 'مجموع الشهر'}
                      {bulkGradeTab === 'midTerm' && 'مجموع نصف العام'}
                      {bulkGradeTab === 'finalExam' && 'مجموع آخر العام'}
                    </th>
                    <th className="p-3 border-b border-slate-200 text-center font-bold min-w-[115px]">نتيجة هذا الكشف</th>
                    <th className="p-3 border-b border-slate-200 text-center font-bold min-w-[60px]">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkStudents.filter(s => {
                    if (!bulkSearch) return true;
                    return s.name.toLowerCase().includes(bulkSearch.toLowerCase()) || s.seatNumber.includes(bulkSearch);
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={5 + (grades.find(g => g.id === bulkSelectedGrade)?.subjects.length || 0)} className="p-12 text-center text-slate-400 font-medium font-sans">
                        لا يوجد أي سجلات طلاب مطابقة للشروط في هذا الصف حالياً. اضغط على "إضافة سطر طالب سريع" للبدء الفوري بالرصد والتدوين.
                      </td>
                    </tr>
                  ) : (
                    bulkStudents
                      .filter(s => {
                        if (!bulkSearch) return true;
                        return s.name.toLowerCase().includes(bulkSearch.toLowerCase()) || s.seatNumber.includes(bulkSearch);
                      })
                      .map((std) => {
                        const currentGradeConfig = grades.find(g => g.id === bulkSelectedGrade);
                        
                        // Calculate total score dynamically for the active tab across all subjects in this row
                        let activeRowSum = 0;
                        let activeRowMax = 0;
                        let isRowFailed = false;
                        const rowFailedSubjects: string[] = [];

                        currentGradeConfig?.subjects.forEach(sub => {
                          const raw = std.subjectGrades[sub.id];
                          let mVal = 0;
                          let hVal = 0;
                          let fVal = 0;
                          if (raw && typeof raw === 'object') {
                            mVal = Number((raw as any).monthly ?? 0);
                            hVal = Number((raw as any).midTerm ?? 0);
                            fVal = Number((raw as any).finalExam ?? 0);
                          } else if (typeof raw === 'number') {
                            const flatNum = raw;
                            mVal = Math.round(flatNum * (40 / 190));
                            hVal = Math.round(flatNum * (50 / 190));
                            fVal = flatNum - (mVal + hVal);
                          }
                          
                          if (bulkGradeTab === 'monthly') {
                            activeRowSum += mVal;
                            activeRowMax += 40;
                            if (mVal < 20) {
                              rowFailedSubjects.push(`${sub.name} (شهري: ${mVal}/40)`);
                              isRowFailed = true;
                            }
                          } else if (bulkGradeTab === 'midTerm') {
                            activeRowSum += hVal;
                            activeRowMax += 50;
                            if (hVal < 25) {
                              rowFailedSubjects.push(`${sub.name} (نصف العام: ${hVal}/50)`);
                              isRowFailed = true;
                            }
                          } else if (bulkGradeTab === 'finalExam') {
                            activeRowSum += fVal;
                            activeRowMax += 100;
                            if (fVal < 50) {
                              rowFailedSubjects.push(`${sub.name} (آخر العام: ${fVal}/100)`);
                              isRowFailed = true;
                            }
                          }
                        });

                        const rowResultStatus: 'ناجح' | 'راسب' = isRowFailed ? 'راسب' : 'ناجح';
                        const rowReason = isRowFailed 
                          ? `راسب بسبب عدم الحصول على درجة النجاح في الاختبارات التالية: ${rowFailedSubjects.join('، ')}.`
                          : `ناجح لتجاوزه جميع درجات هذا الكشف بنجاح.`;

                        return (
                          <tr key={std.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                            {/* Student Name */}
                            <td className="p-2 border-r border-slate-100">
                              <input
                                type="text"
                                required
                                value={std.name}
                                onChange={(e) => handleBulkChange(std.id, { name: e.target.value })}
                                placeholder="اسم الطالب بالكامل"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-[#0e9e9e] focus:outline-none font-bold text-slate-800"
                              />
                            </td>

                            {/* Seat Number */}
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                required
                                value={std.seatNumber}
                                disabled={!std.id.startsWith('bulk_new_')} // Open for edits only if newly added inside editor to lock registered seats
                                onChange={(e) => handleBulkChange(std.id, { seatNumber: e.target.value })}
                                placeholder="الرقم المدرسي"
                                className={`w-full px-2 py-1.5 text-center border rounded-lg font-mono font-bold focus:border-[#0e9e9e] focus:outline-none ${
                                  std.id.startsWith('bulk_new_') ? 'bg-white border-dashed border-amber-400 text-amber-800' : 'bg-slate-100 text-slate-500'
                                }`}
                                title={!std.id.startsWith('bulk_new_') ? 'الرقم المدرسي للطلاب المقيدين مغلق للأمان، لحذفه أزله من لوحة الطلاب' : 'أدخل رقم مدرسي فريد'}
                              />
                            </td>

                            {/* Dynamic Subject Grades inputs */}
                            {currentGradeConfig?.subjects.map(sub => {
                              const raw = std.subjectGrades[sub.id];
                              
                              // Helper to calculate total value dynamically for styling passing/failed check
                              let totalVal = 0;
                              let monthlyVal = 0;
                              let midTermVal = 0;
                              let finalExamVal = 0;
                              let activeMonthVal = 0;
                              let monthlyHistoryObj: { [monthKey: string]: number } = {};

                              if (raw && typeof raw === 'object') {
                                monthlyVal = Number((raw as any).monthly ?? 0);
                                midTermVal = Number((raw as any).midTerm ?? 0);
                                finalExamVal = Number((raw as any).finalExam ?? 0);
                                monthlyHistoryObj = (raw as any).monthlyHistory || {};
                                totalVal = monthlyVal;

                                if (monthlyHistoryObj[activeMonth] !== undefined) {
                                  activeMonthVal = Number(monthlyHistoryObj[activeMonth]);
                                } else if (Object.keys(monthlyHistoryObj).length === 0) {
                                  activeMonthVal = monthlyVal;
                                } else {
                                  activeMonthVal = 0;
                                }
                              } else if (typeof raw === 'number') {
                                const flatNum = raw;
                                monthlyVal = Math.round(flatNum * 0.4);
                                midTermVal = Math.round(flatNum * 0.5);
                                finalExamVal = Math.round(flatNum * 1.0);
                                totalVal = monthlyVal;
                                activeMonthVal = monthlyVal;
                              }

                              // Determine active input value, limits, change handler, and failure
                              let activeVal = 0;
                              let activeMax = 190;
                              let infoText = '';
                              let isFailed = false;

                              if (bulkGradeTab === 'monthly') {
                                activeVal = activeMonthVal;
                                activeMax = 40;
                                infoText = '/ 40';
                                isFailed = activeMonthVal < 20;
                              } else if (bulkGradeTab === 'midTerm') {
                                activeVal = midTermVal;
                                activeMax = 50;
                                infoText = '/ 50';
                                isFailed = midTermVal < 25;
                              } else if (bulkGradeTab === 'finalExam') {
                                activeVal = finalExamVal;
                                activeMax = 100;
                                infoText = '/ 100';
                                isFailed = finalExamVal < 50;
                              } else {
                                activeVal = totalVal;
                                activeMax = 190;
                                infoText = '/ 190';
                                isFailed = totalVal < 95;
                              }

                              const handleValChange = (valStr: string) => {
                                const rawVal = Number(valStr);
                                const updatedGrades = { ...std.subjectGrades };
                                
                                const currentGradesObj = {
                                  monthly: monthlyVal,
                                  midTerm: midTermVal,
                                  finalExam: finalExamVal,
                                  monthlyHistory: monthlyHistoryObj
                                };

                                if (bulkGradeTab === 'monthly') {
                                  const nextHistory = { ...monthlyHistoryObj, [activeMonth]: rawVal };
                                  currentGradesObj.monthlyHistory = nextHistory;
                                  currentGradesObj.monthly = calculateMonthlyFromHistory(
                                    nextHistory,
                                    rawVal,
                                    calculationMethod,
                                    activeMonth
                                  );
                                } else if (bulkGradeTab === 'midTerm') {
                                  currentGradesObj.midTerm = rawVal;
                                } else if (bulkGradeTab === 'finalExam') {
                                  currentGradesObj.finalExam = rawVal;
                                } else {
                                  // Total tab splits mathematically
                                  currentGradesObj.monthly = Math.round(rawVal * (40 / 190));
                                  currentGradesObj.midTerm = Math.round(rawVal * (50 / 190));
                                  currentGradesObj.finalExam = rawVal - (currentGradesObj.monthly + currentGradesObj.midTerm);
                                }

                                updatedGrades[sub.id] = currentGradesObj;
                                handleBulkChange(std.id, { subjectGrades: updatedGrades });
                              };

                              return (
                                <td key={sub.id} className="p-2 text-center bg-slate-50/55 border-l">
                                  <div className="flex flex-col items-center justify-center gap-1.5">
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={activeMax}
                                        required
                                        disabled={bulkGradeTab === 'total'}
                                        title={bulkGradeTab === 'total' ? 'المجموع الكلي رصيد تلقائي من مجموع الأشهر والامتحانات، لتغييره يرجى التعديل من تبويبات أعمال الشهر ونصف العام وآخر العام' : ''}
                                        value={activeVal}
                                        onChange={(e) => handleValChange(e.target.value)}
                                        className={`w-16 px-2 py-1.5 text-center border rounded-lg focus:outline-none font-bold font-mono text-xs ${
                                          bulkGradeTab === 'total'
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : isFailed
                                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                                            : 'bg-white border-slate-200 text-slate-800'
                                        }`}
                                      />
                                      <span className="text-[10px] text-slate-400 font-mono">{infoText}</span>
                                    </div>
                                    {bulkGradeTab === 'monthly' && Object.keys(monthlyHistoryObj).length > 0 ? (
                                      <div className="flex flex-wrap gap-1 justify-center max-w-[110px] text-[8px] text-slate-500 mt-1">
                                        {Object.entries(monthlyHistoryObj).map(([monthName, monthVal]) => (
                                          <span key={monthName} className={`px-1 py-0.5 rounded ${monthName === activeMonth ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-slate-100 text-slate-600'}`} title={`${monthName}: ${monthVal}`}>
                                            {monthName}: {monthVal}
                                          </span>
                                        ))}
                                      </div>
                                    ) : bulkGradeTab !== 'total' && (
                                      <span className="text-[9px] text-[#0e9e9e] font-sans font-medium">
                                        درجته: {activeVal}د
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Total Marks */}
                            <td className="p-2 text-center font-bold text-slate-700 text-xs bg-slate-50/70 border-l font-mono">
                              {activeRowSum} / {activeRowMax} د
                            </td>

                            {/* Result Status Badge & Tooltip/Reason */}
                            <td className="p-2 text-center bg-slate-50/70 border-l">
                              <div className="flex flex-col items-center justify-center min-h-[40px]">
                                <ResultBadge status={rowResultStatus} />
                                <span className="text-[10px] text-slate-400 mt-1 max-w-[130px] truncate block font-sans" title={rowReason}>
                                  {rowReason}
                                </span>
                              </div>
                            </td>

                            {/* Delete Button */}
                            <td className="p-2 text-center border-l">
                              <button
                                onClick={() => handleBulkRemoveRow(std.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all cursor-pointer"
                                title="إلغاء السجل أو حذفه فورا"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom aggregate indicator bar */}
            {bulkStudents.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-slate-600">
                  كشف إحصائي فوري: عدد الطلاب الحاليين بالصف: ({bulkStudents.length} طلاب) | يتم تطبيق الشروط والمظاهر والنسب تلقائياً.
                </span>
                
                <button
                  onClick={handleBulkSave}
                  disabled={isBulkSaving}
                  className={`px-6 py-2 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 text-white shadow-sm ${
                    isBulkSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#008080] hover:bg-[#0d2b45] cursor-pointer'
                  }`}
                >
                  {isBulkSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  حفظ علامات الجميع سحابياً
                </button>
              </div>
            )}
          </AppCard>

        </div>
      )}

      {adminTab === 'registrations' && (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">

          {/* Custom Fields Manager for Registrations */}
          <AppCard title="لوحة تخصيص وإضافة حقول استمارة تقديم الطلاب الجدد" icon={<Settings className="w-5 h-5 text-[#c9a227]" />}>
            <div className="space-y-4 text-right">
              <p className="text-xs text-slate-500">
                تتيح لك هذه اللوحة ديناميكياً إضافة حانات وخانات جديدة لاستمارة تسجيل الطلاب الجدد. سيطلب النظام من ولى الأمر تعبئتها فور عند تقديم طلب الالتحاق الجديد وسوف تُحفظ داخل سجل الطالب.
              </p>

              {customFields.filter(f => f.section === 'registration').length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  لا توجد حقول مخصصة مضافة حالياً لقسم تسجيل الطلاب الجدد. الاستمارة تحتوي فقط على الحقول الافتراضية الرئيسية.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customFields.filter(f => f.section === 'registration').map(f => (
                    <div key={f.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800">{f.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                          <span>النوع: {f.type === 'textarea' ? 'شرح/نص طويل' : f.type === 'checkbox' ? 'تأكيد إجباري' : f.type === 'text' ? 'نص قصير' : f.type === 'number' ? 'رقم' : 'تاريخ'}</span>
                          <span>•</span>
                          {f.required ? (
                            <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-extrabold text-[9px]">إلزامي (مطلوب)</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold text-[9px]">غير إلزامي (اختياري)</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomField(f.id)}
                        className="py-1 px-2.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg border border-rose-200 transition-all font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        title="حذف هذه الخانة من الاستمارة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الخانة</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isAddFieldOpen && newFieldSection === 'registration' ? (
                <form onSubmit={handleAddCustomField} className="p-4 bg-slate-100 rounded-2xl border space-y-4">
                  <h6 className="font-bold text-xs text-slate-800">إضافة خانة مخصصة جديدة لاستمارة التسجيل:</h6>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">اسم/عنوان الحقل:</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: وظيفة أم الطالب"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">نوع المدخلات:</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      >
                        <option value="text">نص قصير (Text)</option>
                        <option value="number">رقم (Number)</option>
                        <option value="date">تاريخ (Date)</option>
                        <option value="textarea">نص طويل/أشرح (Textarea)</option>
                        <option value="checkbox">مربع تحديد/إقرار (Checkbox)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">ملاحظة مساعدة/Placeholder:</label>
                      <input
                        type="text"
                        placeholder="تظهر كتلميح داخل الخانة"
                        value={newFieldPlaceholder}
                        onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600">حالة الإلزام (درجة الإجبار):</label>
                      <select
                        value={newFieldRequired ? 'true' : 'false'}
                        onChange={(e) => setNewFieldRequired(e.target.value === 'true')}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white text-right font-bold text-slate-700"
                      >
                        <option value="false">غير إلزامي (اختياري / يمكن تجاوزها)</option>
                        <option value="true">إلزامي (مطلوب وإجباري للتعبئة *)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0e9e9e] hover:bg-[#0d2b45] text-white font-extrabold rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      حفظ وإدراج الخانة لاستمارة التسجيل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFieldOpen(false);
                        setNewFieldLabel('');
                        setNewFieldPlaceholder('');
                      }}
                      className="px-4 py-2 bg-slate-300 text-slate-705 font-bold rounded-lg transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewFieldSection('registration');
                      setIsAddFieldOpen(true);
                    }}
                    className="px-4 py-2.5 bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20 font-bold rounded-xl hover:bg-[#c9a227] hover:text-[#0b2135] transition-all text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة خانة مخصصة جديدة لاستمارة تسجيل الطلاب الجدد
                  </button>

                  {customFields.filter(f => f.section === 'registration').length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearRegistrationFields}
                      className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف قائمة الحقول المخصصة بالكامل (حذف القائمة)
                    </button>
                  )}
                </div>
              )}
            </div>
          </AppCard>
          
          <AppCard title="صندوق إدارة ومراجعة طلبات القبول والطلاب الجدد" icon={<UserPlus className="w-6 h-6 text-[#c9a227]" />}>
            <div className="space-y-4">
              {registrations.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-semibold">
                      يوجد حالياً ({registrations.length}) طلب تسجيل للالتحاق بالدراسة. يمكنك تصدير كافة بياناتهم وكافة الحقول الإضافية في ملف إكسل موحد بكبسة زر واحدة.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadRegistrationsExcel}
                    className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs shadow-sm border border-emerald-200"
                    title="تنزيل وتصدير كافة طلبات تسجيل الطلاب كملف Excel كامل"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
                    تنزيل كافة المسجلين الجدد كـ Excel
                  </button>
                </div>
              )}
              {registrations.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                  <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>لا توجد طلبات تسجيل أو انضمام مضافة حتى الآن في قاعدة البيانات.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {registrations.map(reg => {
                    const gradeName = grades.find(g => g.id === reg.gradeId)?.gradeName || reg.gradeId;
                    return (
                      <div 
                        key={reg.id} 
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          selectedReg?.id === reg.id
                            ? 'border-[#0e9e9e] ring-2 ring-[#0e9e9e]/10 bg-white shadow-lg'
                            : reg.status === 'مقبول مبدئياً' 
                            ? 'bg-emerald-50/40 border-emerald-100'
                            : reg.status === 'مرفوض'
                            ? 'bg-rose-50/40 border-rose-100 opacity-80'
                            : 'bg-white border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-start border-b pb-2">
                            <div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                                reg.status === 'مقبول مبدئياً' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : reg.status === 'مرفوض'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {reg.status}
                              </span>
                              <h5 className="font-extrabold text-slate-800 text-base mt-2.5">
                                {reg.studentName} ({reg.gender})
                              </h5>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              تاريخ التقديم: {new Date(reg.submissionDate).toLocaleDateString('ar-EG')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                            <p><strong>الصف المطلوب:</strong> <span className="text-slate-900 font-bold">{gradeName}</span></p>
                            <p><strong>تاريخ الميلاد:</strong> <span className="text-slate-900 font-mono">{reg.birthDate}</span></p>
                            <p className="col-span-2"><strong>الرقم القومي:</strong> <span className="text-slate-900 font-mono">{reg.nationalId}</span></p>
                            <p><strong>ولي الأمر:</strong> <span className="text-slate-900 font-bold">{reg.parentName}</span></p>
                            <p><strong>الهاتف المحمول:</strong> <span className="text-slate-900 font-mono">{reg.parentPhone}</span></p>
                            {reg.address && (
                              <p className="col-span-2"><strong>العنوان بالتفصيل:</strong> <span className="text-slate-950">{reg.address}</span></p>
                            )}

                            {/* New Educational & Bio Fields */}
                            <p className="col-span-2">
                              <strong>حالة الطالب التعليمية:</strong>{' '}
                              <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                                {reg.studentStatus || 'طالب مستجد'}
                              </span>
                            </p>
                            
                            {reg.birthPlace && (
                              <p><strong>مكان الميلاد:</strong> <span className="text-slate-900 font-bold">{reg.birthPlace}</span></p>
                            )}
                            {reg.nationality && (
                              <p><strong>الجنسية:</strong> <span className="text-slate-900 font-bold">{reg.nationality}</span></p>
                            )}

                            {reg.studentStatus === 'طالب منقول من مدرسة أخرى' && reg.previousSchool && (
                              <div className="col-span-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-xs text-right">
                                <p className="font-bold text-amber-950">بيانات المدرسة السابقة والانتقال:</p>
                                <p className="mt-1">• <strong>اسم المدرسة والمديرية:</strong> {reg.previousSchool}</p>
                                <p>• <strong>آخر صف دراسي أتمه ومعدله:</strong> {reg.lastGradeSuccess}</p>
                              </div>
                            )}

                            {reg.healthConditions && (
                              <div className="col-span-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-rose-800 text-xs text-right">
                                <p className="font-bold text-rose-950">الرعاية الصحية الحساسة والاحتياجات:</p>
                                <p className="mt-0.5">{reg.healthConditions}</p>
                              </div>
                            )}

                            {/* Attached Documents section */}
                            {((reg.birthCertificateFile || reg.parentNationalCardFile || reg.previousGradesDocFile || reg.studentPhotoFile)) && (
                              <div className="col-span-2 mt-2 pt-2 border-t border-slate-150 text-right">
                                <p className="font-extrabold text-slate-800 text-xs mb-2">المستندات والوثائق الثبوتية المرفقة للقبول:</p>
                                <div className="grid grid-cols-2 gap-3">
                                  {reg.birthCertificateFile && (
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                      <p className="text-[10px] text-slate-500 font-bold mb-1">صورة شهادة الميلاد للطالب:</p>
                                      {reg.birthCertificateFile.type?.startsWith('image/') ? (
                                        <a href={reg.birthCertificateFile.data} download={reg.birthCertificateFile.name} className="block group relative overflow-hidden rounded-lg border border-slate-100 shadow-sm cursor-pointer">
                                          <img src={reg.birthCertificateFile.data} referrerPolicy="no-referrer" alt={reg.birthCertificateFile.name} className="w-full h-24 object-cover hover:scale-105 transition-all" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold">تحميل المستند</div>
                                        </a>
                                      ) : (
                                        <a href={reg.birthCertificateFile.data} download={reg.birthCertificateFile.name} className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-[#0e9e9e] font-extrabold text-[10px] h-24 gap-1 cursor-pointer hover:bg-slate-50">
                                          <span className="text-xs">PDF</span>
                                          <span>تحميل الملف</span>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {reg.parentNationalCardFile && (
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                      <p className="text-[10px] text-slate-500 font-bold mb-1">بطاقة ولي الأمر الشخصية:</p>
                                      {reg.parentNationalCardFile.type?.startsWith('image/') ? (
                                        <a href={reg.parentNationalCardFile.data} download={reg.parentNationalCardFile.name} className="block group relative overflow-hidden rounded-lg border border-slate-100 shadow-sm cursor-pointer">
                                          <img src={reg.parentNationalCardFile.data} referrerPolicy="no-referrer" alt={reg.parentNationalCardFile.name} className="w-full h-24 object-cover hover:scale-105 transition-all" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold">تحميل المستند</div>
                                        </a>
                                      ) : (
                                        <a href={reg.parentNationalCardFile.data} download={reg.parentNationalCardFile.name} className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-[#0e9e9e] font-extrabold text-[10px] h-24 gap-1 cursor-pointer hover:bg-slate-50">
                                          <span className="text-xs">PDF</span>
                                          <span>تحميل الملف</span>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {reg.previousGradesDocFile && (
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                      <p className="text-[10px] text-slate-500 font-bold mb-1">كشف درجات العام السابق / النقل:</p>
                                      {reg.previousGradesDocFile.type?.startsWith('image/') ? (
                                        <a href={reg.previousGradesDocFile.data} download={reg.previousGradesDocFile.name} className="block group relative overflow-hidden rounded-lg border border-slate-100 shadow-sm cursor-pointer">
                                          <img src={reg.previousGradesDocFile.data} referrerPolicy="no-referrer" alt={reg.previousGradesDocFile.name} className="w-full h-24 object-cover hover:scale-105 transition-all" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold">تحميل المستند</div>
                                        </a>
                                      ) : (
                                        <a href={reg.previousGradesDocFile.data} download={reg.previousGradesDocFile.name} className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-[#0e9e9e] font-extrabold text-[10px] h-24 gap-1 cursor-pointer hover:bg-slate-50">
                                          <span className="text-xs">PDF</span>
                                          <span>تحميل الملف</span>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {reg.studentPhotoFile && (
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                      <p className="text-[10px] text-slate-500 font-bold mb-1">الصورة الشخصية الحديثة للطالب:</p>
                                      {reg.studentPhotoFile.type?.startsWith('image/') ? (
                                        <a href={reg.studentPhotoFile.data} download={reg.studentPhotoFile.name} className="block group relative overflow-hidden rounded-lg border border-slate-100 shadow-sm cursor-pointer">
                                          <img src={reg.studentPhotoFile.data} referrerPolicy="no-referrer" alt={reg.studentPhotoFile.name} className="w-full h-24 object-cover hover:scale-105 transition-all" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-bold">تحميل الصورة</div>
                                        </a>
                                      ) : (
                                        <a href={reg.studentPhotoFile.data} download={reg.studentPhotoFile.name} className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center text-[#0e9e9e] font-extrabold text-[10px] h-24 gap-1 cursor-pointer hover:bg-slate-50">
                                          <span className="text-xs">PDF</span>
                                          <span>تحميل الملف</span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {reg.customFields && typeof reg.customFields === 'object' && Object.keys(reg.customFields).length > 0 && (
                              <div className="col-span-2 mt-2 p-2.5 bg-[#c9a227]/5 rounded-xl border border-slate-100 text-xs text-slate-800 space-y-1">
                                <p className="font-extrabold text-[#0d2b45] text-xs">البيانات الإضافية المخصصة:</p>
                                {Object.entries(reg.customFields).map(([fieldId, val]) => {
                                  const label = customFields.find(f => f.id === fieldId)?.label || fieldId;
                                  return (
                                    <p key={fieldId} className="text-right">
                                      <strong className="text-slate-900">{label}:</strong> {String(val === true ? 'نعم (مؤكد)' : val === false ? 'لا' : val)}
                                    </p>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {reg.notes && (
                            <div className="mt-3 p-2 bg-slate-100 border rounded-lg text-slate-700 text-xs leading-relaxed">
                              <strong>ملاحظات ورسالة الإدارة:</strong> {reg.notes}
                            </div>
                          )}
                        </div>

                        {/* Interactive Admin panel actions */}
                        <div className="mt-4 pt-3 border-t border-slate-150 flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedReg(reg);
                              setRegNotes(reg.notes || '');
                            }}
                            className="px-3 py-1.5 bg-[#0d2b45] text-white rounded-lg hover:bg-[#0e9e9e] transition-all text-xs cursor-pointer font-bold flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            اتخاذ قرار وتعديل الملاحظات
                          </button>

                          <button
                            onClick={() => handleDeleteRegistration(reg.id)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all text-xs cursor-pointer font-bold flex items-center gap-1"
                            title="حذف هذا الطلب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف طلب التسجيل</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </AppCard>

          {/* Quick decision modal overlays */}
          {selectedReg && (
            <AppCard 
              title={`تقييم واتخاذ قرار لطلب الطالب: ${selectedReg.studentName}`} 
              icon={<UserPlus className="w-5 h-5 text-[#c9a227]" />}
            >
              <div className="space-y-4 text-right">
                <p className="text-xs text-slate-500">
                  يرجى تحديد القرار الإداري بخصوص طلب الالتحاق بالصف <strong>{grades.find(g => g.id === selectedReg.gradeId)?.gradeName || selectedReg.gradeId}</strong>:
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">رسالة / قرار لجنة القبول والتعليم لولي الأمر:</label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    placeholder="اكتب مواعيد المقابلات الشخصية أو أسباب عدم الموفقة هنا لولي الأمر ليتواصل ويتحقق من خلال البوابة الخارجية..."
                    className="w-full px-3 py-2 text-xs border rounded-lg text-right focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInitially(selectedReg.id, regNotes)}
                      className="px-4 py-2 bg-[#0e9e9e] text-white font-extrabold rounded-lg hover:bg-[#0d2b45] transition-all text-xs cursor-pointer"
                    >
                      موافقة مبدئية وجدولة مقابلة
                    </button>
                    <button
                      onClick={() => handleRejectRegistration(selectedReg.id, regNotes)}
                      className="px-4 py-2 bg-rose-600 text-white font-extrabold rounded-lg hover:bg-rose-700 transition-all text-xs cursor-pointer"
                    >
                      رفض الطلب الحالي
                    </button>
                  </div>

                  {/* Promotion with Seat Number Generation! */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] text-slate-400">توليد رقم مدرسي وقبول نهائي للترسيم الفوري بالكشوفات</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="الرقم المدرسي..."
                          id="seat_alloc_input"
                          className="w-36 px-2 py-1 border rounded bg-white text-xs text-center font-mono font-bold"
                          defaultValue={String(Math.floor(10000 + Math.random() * 90000))}
                        />
                        <button
                          onClick={() => {
                            const inp = document.getElementById('seat_alloc_input') as HTMLInputElement;
                            if (inp) {
                              handleFinalEnrollStudent(selectedReg.id, inp.value);
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-500 text-white font-black text-xs rounded hover:bg-emerald-600 transition-all cursor-pointer"
                        >
                          قبول نهائي وترسيم فوري
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setSelectedReg(null);
                      setRegNotes('');
                    }}
                    className="px-4 py-2 bg-[#0d2b45] text-white font-bold text-xs rounded-lg hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    إلغاء وإغلاق التعديل
                  </button>
                </div>
              </div>
            </AppCard>
          )}
        </div>
      )}

      {adminTab === 'monthly_grades' && (
        <CustomGradesView
          type="monthly"
          students={students}
          grades={grades}
          onExport={handleExportCustomGradeViewExcel}
          gradeViewSearch={gradeViewSearch}
          setGradeViewSearch={setGradeViewSearch}
          gradeViewClass={gradeViewClass}
          setGradeViewClass={setGradeViewClass}
        />
      )}

      {adminTab === 'midterm_grades' && (
        <CustomGradesView
          type="midTerm"
          students={students}
          grades={grades}
          onExport={handleExportCustomGradeViewExcel}
          gradeViewSearch={gradeViewSearch}
          setGradeViewSearch={setGradeViewSearch}
          gradeViewClass={gradeViewClass}
          setGradeViewClass={setGradeViewClass}
        />
      )}

      {adminTab === 'final_grades' && (
        <CustomGradesView
          type="finalExam"
          students={students}
          grades={grades}
          onExport={handleExportCustomGradeViewExcel}
          gradeViewSearch={gradeViewSearch}
          setGradeViewSearch={setGradeViewSearch}
          gradeViewClass={gradeViewClass}
          setGradeViewClass={setGradeViewClass}
        />
      )}

      {adminTab === 'supervisors' && (
        <div className="space-y-6 animate-fade-in text-right">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <h4 className="text-sm font-bold text-amber-800 leading-relaxed">
              تنبيه الأمان العالي: المشرف المضاف هنا يمتلك صلاحيات إدارة النظام بالكامل (التحكم بالمعلمين، رصد الدرجات، إعدادات الصفوف والمواد، مراجعة الشكاوى والتسجيل). يرجى التأكد من كتابة البريد الإلكتروني (Gmail) الخاص بالمشرف بشكل صحيح ليتمكن من تسجيل الدخول والمصادقة عليه فوراً.
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form to add a new supervisor */}
            <div className="lg:col-span-1">
              <AppCard title="تفويض مشرف جديد" icon={<UserPlus className="w-5 h-5 text-emerald-600" />}>
                <form onSubmit={handleSaveSupervisor} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">اسم المشرف بالكامل</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-xs"
                      placeholder="الأستاذ / عبد الرحمن سلام"
                      value={supervisorForm.name}
                      onChange={e => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">البريد الإلكتروني (Gmail) المعتمد</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                      placeholder="example@gmail.com"
                      value={supervisorForm.email}
                      onChange={e => setSupervisorForm({ ...supervisorForm, email: e.target.value })}
                      required
                    />
                    <span className="block text-[10px] text-slate-400 mt-1">يجب أن يكون حساب بريد إلكتروني نشط وصالح لعملية تسجيل الدخول عبر Google.</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                  >
                    تفويض المشرف ومنحه الصلاحيات
                  </button>
                </form>
              </AppCard>
            </div>

            {/* Supervisors registry table */}
            <div className="lg:col-span-2">
              <AppCard title="سجل المشرفين ذوي الصلاحيات الكاملة" icon={<Users className="w-5 h-5 text-[#c9a227]" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="p-4 border-b font-black">اسم المشرف</th>
                        <th className="p-4 border-b font-black">بريد التحقق</th>
                        <th className="p-4 border-b font-black">تاريخ التفويض</th>
                        <th className="p-4 border-b font-black text-center">أدوات التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisors.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">لا يوجد مشرفين مضافين حالياً. الحسابات الافتراضية للمدراء فقط هي من تمتلك الصلاحيات الكاملة مسبقاً.</td>
                        </tr>
                      ) : (
                        supervisors.map(sv => (
                          <tr key={sv.id} className="hover:bg-slate-50 transition-all">
                            <td className="p-4 border-b font-bold text-slate-800">{sv.name}</td>
                            <td className="p-4 border-b text-slate-600 font-mono text-xs">{sv.email}</td>
                            <td className="p-4 border-b text-slate-500 text-xs">
                              {sv.createdAt ? new Date(sv.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                            </td>
                            <td className="p-4 border-b text-center">
                              <button
                                onClick={() => handleDeleteSupervisor(sv.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                title="سحب الصلاحيات الكاملة وإلغاء هذا المشرف"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>سحب الصلاحيات</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </AppCard>
            </div>

          </div>
        </div>
      )}

      {adminTab === 'system_reset' && (
        <SystemResetPortal
          students={students}
          grades={grades}
          complaints={complaints}
          registrations={registrations}
          onSuccess={async () => {
            try {
              const uStudents = await dbService.getStudents();
              setStudents(uStudents);
              const uComplaints = await dbService.getComplaints();
              setComplaints(uComplaints);
              const uReg = await dbService.getRegistrations();
              setRegistrations(uReg);
            } catch (err) {
              console.error("Error reloading after reset:", err);
            }
          }}
          triggerSuccess={triggerSuccess}
          triggerError={triggerError}
        />
      )}


      {/* Adding / Editing Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl transform transition-transform animate-fade-in overflow-hidden">
            
            {/* Modal Title */}
            <div className="bg-[#0d2b45] px-6 py-4 border-b-2 border-[#c9a227] flex items-center justify-between text-white">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#c9a227]" />
                {editingStudent ? 'تعديل علامات ومعلومات الطالب الحالي' : 'تسجيل طالب جديد وضبط درجاته'}
              </h3>
              <button 
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStudent}>
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-right">
                
                <h4 className="text-sm font-black text-[#0d2b45] border-r-4 border-[#0e9e9e] pr-2 mb-4">
                  أولاً: البيانات الأساسية لتعريف الطالب
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">اسم الطالب ثلاثياً بالكامل:</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      placeholder="سجل الاسم بشكل مطابق للأواق الثبوتية"
                      className="w-full px-3 py-2 text-sm border rounded-lg text-right focus:outline-none"
                    />
                  </div>
                  {/* Seat number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">رقم الطالب المدرسي الفريد:</label>
                    <input
                      type="text"
                      required
                      value={studentForm.seatNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, seatNumber: e.target.value })}
                      placeholder="رقم الطالب المدرسي للبحث"
                      className="w-full px-3 py-2 text-sm border rounded-lg text-right focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Grade */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">الصف الدراسي للطالب المقيد:</label>
                    <select
                      value={studentForm.grade}
                      onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value, subjectGrades: {} })}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-white text-right focus:outline-none"
                    >
                      {grades.map(grade => (
                        <option key={grade.id} value={grade.id}>{grade.gradeName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Grades inputs */}
                <h4 className="text-sm font-black text-[#0d2b45] border-r-4 border-[#c9a227] pr-2 pt-4 flex flex-wrap justify-between items-center gap-2">
                  <span>ثانياً: درجات اختبار التحصيل الدراسي (الدرجة الكاملة من ١٠٠ د للمادة):</span>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-bold">
                    التحرير النشط لشهر: <span className="underline">{activeMonth}</span> (طريقة الحساب: {calculationMethod === 'average' ? 'متوسط الشهور' : calculationMethod === 'highest' ? 'أعلى شهر' : 'الشهر الحالي المحدد'})
                  </span>
                </h4>

                <div className="bg-slate-50 p-4 rounded-2xl border space-y-4">
                  {currentSelectedGradeConfig?.subjects.map(subject => {
                    const raw = studentForm.subjectGrades[subject.id] as any || { monthly: 0, midTerm: 0, finalExam: 0 };
                    
                    let monthly = 0;
                    let midTerm = 0;
                    let finalExam = 0;
                    const history = (raw && typeof raw === 'object' && (raw as any).monthlyHistory) || {};
                    
                    if (typeof raw === 'number') {
                      monthly = Math.round(raw * 0.2);
                      midTerm = Math.round(raw * 0.4);
                      finalExam = raw - (monthly + midTerm);
                    } else {
                      monthly = Number(raw.monthly ?? 0);
                      midTerm = Number(raw.midTerm ?? 0);
                      finalExam = Number(raw.finalExam ?? 0);
                    }

                    let activeMonthVal = 0;
                    if (history[activeMonth] !== undefined) {
                      activeMonthVal = Number(history[activeMonth]);
                    } else if (Object.keys(history).length === 0) {
                      activeMonthVal = monthly;
                    } else {
                      activeMonthVal = 0;
                    }

                    return (
                      <div key={subject.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-slate-100 flex-wrap gap-1.5">
                          <span className="font-bold text-slate-800 text-sm">
                            {subject.name}
                          </span>
                          <div className="flex gap-2 text-[10px] font-black">
                            <span className={monthly >= 20 ? 'text-emerald-600' : 'text-rose-600'}>الشهري المعتمد: {monthly}/40</span>
                            <span className={midTerm >= 25 ? 'text-emerald-600' : 'text-rose-600'}>منتصف: {midTerm}/50</span>
                            <span className={finalExam >= 50 ? 'text-emerald-600' : 'text-rose-600'}>نهائي: {finalExam}/100</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[11px] text-slate-500 text-center font-bold">شهر {activeMonth} (٤٠)</label>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              required
                              value={activeMonthVal}
                              onChange={(e) => {
                                const nextVal = Number(e.target.value);
                                const updatedGrades = { ...studentForm.subjectGrades };
                                const nextHistory = { ...history, [activeMonth]: nextVal };
                                const calculatedMonthly = calculateMonthlyFromHistory(
                                  nextHistory,
                                  nextVal,
                                  calculationMethod,
                                  activeMonth
                                );
                                updatedGrades[subject.id] = {
                                  monthly: calculatedMonthly,
                                  midTerm,
                                  finalExam,
                                  monthlyHistory: nextHistory
                                };
                                setStudentForm({ ...studentForm, subjectGrades: updatedGrades });
                              }}
                              className="w-full px-2 py-1 text-center text-xs border rounded-lg bg-white focus:outline-none font-bold"
                            />
                            {Object.keys(history).length > 0 && (
                              <div className="flex flex-wrap gap-0.5 justify-center text-[7px] text-slate-400 mt-1">
                                {Object.entries(history).map(([m, v]) => (
                                  <span key={m} className={`px-0.5 py-0.5 rounded ${m === activeMonth ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`} title={`${m}: ${v}`}>
                                    {m}:{v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] text-slate-500 text-center font-bold">نصف العام (٥٠)</label>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              required
                              value={midTerm}
                              onChange={(e) => {
                                const updatedGrades = { ...studentForm.subjectGrades };
                                updatedGrades[subject.id] = {
                                  monthly,
                                  midTerm: Number(e.target.value),
                                  finalExam,
                                  monthlyHistory: history
                                };
                                setStudentForm({ ...studentForm, subjectGrades: updatedGrades });
                              }}
                              className="w-full px-2 py-1 text-center text-xs border rounded-lg bg-white focus:outline-none font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] text-slate-500 text-center font-bold">آخر العام (١٠٠)</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              required
                              value={finalExam}
                              onChange={(e) => {
                                const updatedGrades = { ...studentForm.subjectGrades };
                                updatedGrades[subject.id] = {
                                  monthly,
                                  midTerm,
                                  finalExam: Number(e.target.value),
                                  monthlyHistory: history
                                };
                                setStudentForm({ ...studentForm, subjectGrades: updatedGrades });
                              }}
                              className="w-full px-2 py-1 text-center text-xs border rounded-lg bg-white focus:outline-none font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }) || (
                    <p className="text-xs text-slate-400">الرجاء اختيار صف دراسي لعرض قائمة المواد الدراسية.</p>
                  )}
                </div>

              </div>

              {/* Confirm bar */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-all text-xs"
                >
                  إلغاء الحفظ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0e9e9e] text-white font-bold rounded-lg hover:bg-[#0d2b45] transition-all text-xs shadow"
                >
                  حفظ البيانات والترصيد السحابي
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
