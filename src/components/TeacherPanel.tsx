import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Save, 
  Edit, 
  Upload, 
  Check, 
  AlertTriangle, 
  X,
  FileText,
  Printer,
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { Student, Teacher, GradeSetting, Subject } from '../types';
import { dbService, calculateStudentResult } from '../firebase';
import { calculateMonthlyFromHistory } from '../utils';
import { AppCard, ResultBadge } from './UI';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CertificatePdf } from './Certificate';
import * as XLSX from 'xlsx';

interface TeacherPanelProps {
  currentTeacher: Teacher;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({ currentTeacher }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeConfig, setGradeConfig] = useState<GradeSetting | null>(null);
  const [loading, setLoading] = useState(true);

  // Status logs
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active Student edit state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [marksForm, setMarksForm] = useState<{ [subjectId: string]: any }>({});

  // Monthly grading tracking states for Teachers
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

  useEffect(() => {
    loadClassroomData();
  }, [currentTeacher]);

  const loadClassroomData = async () => {
    setLoading(true);
    try {
      // Find matching grade configuration
      const dGrades = await dbService.getGradeSettings();
      const matched = dGrades.find(g => g.id === currentTeacher.grade) || null;
      setGradeConfig(matched);

      // Fetch only students of teacher's assigned grade
      const dStudents = await dbService.getStudentsByGrade(currentTeacher.grade);
      setStudents(dStudents);
    } catch (e) {
      console.error("Cloud classroom fetch failed. Activating local teachers dashboard backup data.", e);
      triggerError('تنبيه: فشل تحميل بيانات الصف الدراسي من السحابة. تم تنشيط نسخة الذاكرة المحلية المؤقتة.');
      
      try {
        const localGrades = JSON.parse(localStorage.getItem('grade_settings') || '[]');
        const matched = localGrades.find((g: any) => g.id === currentTeacher.grade) || null;
        setGradeConfig(matched);

        const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
        const filtered = localStudents.filter((s: any) => s.grade === currentTeacher.grade);
        setStudents(filtered);
      } catch (fallbackError) {
        console.error("Local workspace fallback error", fallbackError);
      }
    } finally {
      setLoading(false);
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

  const [activeRankStage, setActiveRankStage] = useState<'all' | 'monthly' | 'half' | 'final'>('all');
  const [selectedRankMonth, setSelectedRankMonth] = useState<string>('all');

  const getStudentStageScore = (student: Student) => {
    if (!gradeConfig) return 0;
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
        if (activeRankStage === 'monthly' && selectedRankMonth !== 'all') {
          if (history[selectedRankMonth] !== undefined) {
            monthly = Number(history[selectedRankMonth]);
          } else if (Object.keys(history).length === 0) {
            monthly = Number(sGrades.monthly || 0);
          } else {
            monthly = 0;
          }
        } else {
          monthly = Number(sGrades.monthly || 0);
        }
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

  const isStudentPassedStage = (student: Student) => {
    if (student.resultStatus === 'غائب') return false;
    if (student.resultStatus === 'ناجح') return true;
    if (!gradeConfig) return true;
    let passed = true;
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
        if (activeRankStage === 'monthly' && selectedRankMonth !== 'all') {
          if (history[selectedRankMonth] !== undefined) {
            monthly = Number(history[selectedRankMonth]);
          } else if (Object.keys(history).length === 0) {
            monthly = Number(sGrades.monthly || 0);
          } else {
            monthly = 0;
          }
        } else {
          monthly = Number(sGrades.monthly || 0);
        }
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

  const getRankingStudents = () => {
    const passingStudents = students.filter(s => isStudentPassedStage(s));
    if (activeRankStage === 'all') {
      return [...passingStudents].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    }
    return [...passingStudents].sort((a, b) => getStudentStageScore(b) - getStudentStageScore(a));
  };

  const getSortedStudents = () => {
    return [...students].sort((a, b) => {
      const passA = isStudentPassedStage(a);
      const passB = isStudentPassedStage(b);
      if (passA && !passB) return -1;
      if (!passA && passB) return 1;

      const scoreA = activeRankStage === 'all' ? (a.totalPoints || 0) : getStudentStageScore(a);
      const scoreB = activeRankStage === 'all' ? (b.totalPoints || 0) : getStudentStageScore(b);
      return scoreB - scoreA;
    });
  };

  const getStudentRank = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !isStudentPassedStage(student)) {
      return null;
    }
    const sorted = getRankingStudents();
    const idx = sorted.findIndex(s => s.id === studentId);
    return idx !== -1 ? idx + 1 : null;
  };

  const openEditGrades = (std: Student) => {
    setSelectedStudent(std);
    const normalized: { [subjectId: string]: any } = {};
    if (gradeConfig) {
      gradeConfig.subjects.forEach(sub => {
        const raw = std.subjectGrades[sub.id];
        if (raw && typeof raw === 'object') {
          normalized[sub.id] = {
            monthly: Number((raw as any).monthly ?? 0),
            midTerm: Number((raw as any).midTerm ?? 0),
            finalExam: Number((raw as any).finalExam ?? 0),
            monthlyHistory: (raw as any).monthlyHistory || {}
          };
        } else if (typeof raw === 'number') {
          const flatNum = raw;
          const monthly = Math.round(flatNum * 0.4);
          const midTerm = Math.round(flatNum * 0.5);
          const finalExam = Math.round(flatNum * 1.0);
          normalized[sub.id] = { monthly, midTerm, finalExam, monthlyHistory: {} };
        } else {
          normalized[sub.id] = { monthly: 0, midTerm: 0, finalExam: 0, monthlyHistory: {} };
        }
      });
    }
    setMarksForm(normalized);
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !gradeConfig) return;

    try {
      // Security Check: Enforce that the teacher can only modify students of their assigned grade
      if (selectedStudent.grade !== currentTeacher.grade) {
        throw new Error('غير مسموح لك بتعديل علامات طالب لا ينتمي لصفك الدراسي المعتمد!');
      }

      // Package values for recalculation
      const input = {
        name: selectedStudent.name,
        seatNumber: selectedStudent.seatNumber,
        grade: currentTeacher.grade, // Force teacher's grade
        subjectGrades: marksForm
      };

      const result = calculateStudentResult(input, gradeConfig);

      const updatedPayload: Student = {
        ...selectedStudent,
        ...input,
        ...result
      };

      await dbService.saveStudent(updatedPayload);
      triggerSuccess(`تم بنجاح تحديث درجات الطالب: ${selectedStudent.name}`);
      setSelectedStudent(null);
      loadClassroomData();
    } catch (err: any) {
      triggerError(err.message || 'فشلت عملية التعديل لعدم تطابق القوانين الإلكترونية.');
    }
  };

  // ----------------------------------------------------
  // Excel Grade Import exclusively for current teacher class
  // ----------------------------------------------------
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gradeConfig) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          triggerError('ملف Excel فارغ أو غير متوافق.');
          return;
        }

        const rows = data.slice(1);
        let updateCount = 0;

        for (const row of rows) {
          if (!row[1]) continue; // Seat number must be present
          const seatNumber = String(row[1]).trim();
          
          // Locate student in currently assigned list
          const targetStudent = students.find(s => s.seatNumber === seatNumber);
          if (!targetStudent || targetStudent.grade !== currentTeacher.grade) continue; // Skip since they are not in this teacher's class

          const subjectGrades: { [subjectId: string]: { monthly: number, midTerm: number, finalExam: number } } = {};
          
          // Fallback check: guess start index based on column lengths
          const isLegacyTemplate = row.length > gradeConfig.subjects.length + 3;
          const startColIdx = isLegacyTemplate ? 5 : 3;

          let presentDays = targetStudent.presentDays ?? 180;
          let absentDays = targetStudent.absentDays ?? 0;
          if (isLegacyTemplate) {
            presentDays = Number(row[3] ?? 180);
            absentDays = Number(row[4] ?? 0);
          }

          presentDays = isNaN(presentDays) ? 180 : Math.max(0, Math.floor(presentDays));
          absentDays = isNaN(absentDays) ? 0 : Math.max(0, Math.floor(absentDays));

          const totalDays = presentDays + absentDays;
          const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

          // Detect column configuration based on row length
          const colsPerSubject = (row.length - startColIdx) >= (gradeConfig.subjects.length * 3) ? 3 : 1;

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

          const input = {
            name: targetStudent.name,
            seatNumber: targetStudent.seatNumber,
            grade: currentTeacher.grade,
            subjectGrades
          };
          const calcResult = calculateStudentResult(input, gradeConfig);

          const updatedPayload: Student = {
            ...targetStudent,
            ...input,
            ...calcResult,
            presentDays,
            absentDays,
            attendancePercentage
          };

          await dbService.saveStudent(updatedPayload);
          updateCount++;
        }

        triggerSuccess(`تم استيراد كشف الدرجات بنجاح وتحديث عدد (${updateCount}) طالب يخص صفك.`);
        loadClassroomData();
        e.target.value = '';
      } catch (err) {
        console.error(err);
        triggerError('حدث خطأ أثناء فحص وتدقيق علامات ملف Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#0e9e9e] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">جاري تحميل سجلات واختبارات الفصل الدراسي الأول...</p>
      </div>
    );
  }

  const getStageStatusCount = () => {
    let pCount = 0;
    let fCount = 0;

    if (!gradeConfig || !students.length) return { pCount: 0, fCount: 0 };

    students.forEach(student => {
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
          if (activeRankStage === 'monthly' && selectedRankMonth !== 'all') {
            if (history[selectedRankMonth] !== undefined) {
              monthly = Number(history[selectedRankMonth]);
            } else if (Object.keys(history).length === 0) {
              monthly = Number(sGrades.monthly || 0);
            } else {
              monthly = 0;
            }
          } else {
            monthly = Number(sGrades.monthly || 0);
          }
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
          // Annual/Total matches
          val = monthly + midTerm + finalExam;
          threshold = 95; // 20 + 25 + 50
        }

        if (val < threshold) {
          isPassed = false;
        }
      });

      if (isPassed) {
        pCount++;
      } else {
        fCount++;
      }
    });

    return { pCount, fCount };
  };

  const { pCount: passCount, fCount: failCount } = getStageStatusCount();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Notifications */}
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

      {/* Classroom profile header */}
      <div className="bg-gradient-to-r from-[#0d2b45] to-[#1e4e79] relative text-white rounded-3xl p-6 shadow-xl mb-8 border-r-8 border-[#c9a227]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-[#c9a227] text-[#0d2b45] font-black px-4 py-1 rounded-full text-xs">
              مسؤولية التدريس والصلاحية المعينة
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              لوحة تحكم المعلم الدراسي: {currentTeacher.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              الصف المسؤول عنه: <strong className="text-white text-base">{gradeConfig?.gradeName || currentTeacher.grade}</strong>
            </p>
          </div>

          {/* Quick stats ratios */}
          <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
            <div className="text-center">
              <p className="text-xs text-slate-300">طلاب الصف</p>
              <p className="text-xl font-extrabold">{students.length} طالب</p>
            </div>
            <div className="h-8 border-l border-white/20" />
            <div className="text-center font-bold">
              <p className="text-xs text-emerald-300">الناجحين</p>
              <p className="text-xl text-emerald-400">{passCount}</p>
            </div>
            <div className="h-8 border-l border-white/20" />
            <div className="text-center font-bold">
              <p className="text-xs text-rose-300">الراسبين</p>
              <p className="text-xl text-rose-400">{failCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Students list */}
        <div className="lg:col-span-8">
          <AppCard title="سجل طلاب صفك وعلامات المواد الرسمية">
            
            {/* Quick bulk spreadsheet Excel edit helper for teachers */}
            <div className="mb-6 p-4 bg-slate-50 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">استيراد علامات الطلاب دفعة واحدة عبر ملف Excel:</h5>
                <p className="text-xs text-gray-500">حمل كشف Excel الطلاب الخاص بصفك وعبئ درجاتهم ثم ارفعه هنا لتحديث الفصل كاملاً.</p>
              </div>
              <div className="relative border border-[#0e9e9e] bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 text-right">
                <Upload className="w-4 h-4 text-[#0e9e9e]" />
                <span className="text-xs font-black text-[#0e9e9e]">تعبئة كشف Excel الصف</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Interactive evaluation stage filter */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <h5 className="font-bold text-slate-800 text-sm">عرض وترتيب قائمة الطلاب على الصف حسب:</h5>
                <p className="text-xs text-slate-500">اختر نوع التقييم لإعادة فرز وترتيب طلابك فورياً حسب درجة تحصيلهم المستقلة وعرض نجاحهم.</p>
              </div>
              <select
                value={activeRankStage}
                onChange={(e) => setActiveRankStage(e.target.value as any)}
                className="px-4 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-[#0e9e9e] text-right font-bold text-slate-850 text-sm cursor-pointer shadow-sm focus:outline-none"
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
                    <th className="p-4 border-b font-bold">اسم الطالب</th>
                    <th className="p-4 border-b text-center font-bold">الرقم المدرسي</th>
                    <th className="p-4 border-b text-center font-bold">
                      {activeRankStage === 'all' ? 'الدرجة الإجمالية' : activeRankStage === 'monthly' ? 'مجموع الشهر' : activeRankStage === 'half' ? 'مجموع نصف العام' : 'مجموع آخر العام'}
                    </th>
                    <th className="p-4 border-b text-center font-bold">الترتيب في الصف</th>
                    <th className="p-4 border-b text-center font-bold">حالة المرحلة الحالية</th>
                    <th className="p-4 border-b text-center font-bold">الشهادة</th>
                    <th className="p-4 border-b text-center font-bold">تعديل</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">لا يوجد طلاب مسجلين في هذا الصف بعد. اطلب من مدير المدرسة إضافة طلاب في صفك.</td>
                    </tr>
                  ) : (
                    getSortedStudents().map(std => {
                      let monthlyTotal = 0;
                      let midtermTotal = 0;
                      let finalTotal = 0;
                      gradeConfig.subjects.forEach(sub => {
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

                      const isStagePassed = (() => {
                        if (!gradeConfig) return true;
                        let passed = true;
                        gradeConfig.subjects.forEach(sub => {
                          const sGrades = std.subjectGrades[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
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
                      })();

                      const stageScore = (() => {
                        if (activeRankStage === 'monthly') return monthlyTotal;
                        if (activeRankStage === 'half') return midtermTotal;
                        if (activeRankStage === 'final') return finalTotal;
                        return monthlyTotal + midtermTotal + finalTotal;
                      })();

                      return (
                        <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b font-semibold text-slate-800">{std.name}</td>
                          <td className="p-4 border-b text-center font-mono font-bold text-slate-500">{std.seatNumber}</td>
                          <td className="p-4 border-b text-center text-xs font-bold leading-relaxed whitespace-nowrap">
                            <div className="text-sm font-black text-slate-800">{stageScore} د</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              (ش: {monthlyTotal} | ن: {midtermTotal} | خ: {finalTotal})
                            </div>
                          </td>
                          <td className="p-4 border-b text-center font-bold text-amber-600">
                            {getStudentRank(std.id) !== null ? `المركز ${getStudentRank(std.id)} من ${students.filter(s => isStudentPassedStage(s)).length}` : '—'}
                          </td>
                          <td className="p-4 border-b text-center">
                            <ResultBadge status={isStagePassed ? "ناجح" : "راسب"} />
                          </td>
                          <td className="p-4 border-b text-center border-l border-slate-100">
                            {gradeConfig && (
                              <PDFDownloadLink
                                document={<CertificatePdf student={std} gradeConfig={gradeConfig} studentRank={getStudentRank(std.id)} totalClassStudents={students.filter(s => isStudentPassedStage(s)).length} rankStage={activeRankStage} />}
                                fileName={`شهادة-${std.name}.pdf`}
                                style={{
                                  color: '#0e9e9e',
                                  textDecoration: 'underline',
                                  fontWeight: 'bold',
                                  fontSize: '13px'
                                }}
                              >
                                {({ loading }) => (loading ? 'تكوين...' : 'تنزيل الشهادة')}
                              </PDFDownloadLink>
                            )}
                          </td>
                          <td className="p-4 border-b text-center">
                            <button
                              onClick={() => openEditGrades(std)}
                              className="p-1.5 bg-slate-100 hover:bg-[#0d2b45] hover:text-white rounded-lg transition-all text-slate-600 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ); })
                  )}
                </tbody>
              </table>
            </div>
          </AppCard>
        </div>

        {/* Edit Panel form details (on base of selection) */}
        <div className="lg:col-span-4">
          {selectedStudent && gradeConfig ? (
            <div className="animate-fade-in bg-white rounded-3xl p-6 shadow-xl border-2 border-[#0e9e9e] space-y-6">
              
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-slate-800 text-base">تعديل علامات الطالب السريع</h4>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="p-1 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-500">اسم الطالب المختار:</p>
                <p className="text-sm font-bold text-[#0d2b45] leading-snug">{selectedStudent.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-1">الرقم المدرسي: {selectedStudent.seatNumber}</p>
              </div>

              <form onSubmit={handleSaveGrades} className="space-y-4">
                
                {/* Month Selection and aggregation options for the Teacher */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-black text-slate-700">رصد وتعديل علامات الشهر لـ:</span>
                    <div className="flex flex-wrap gap-1">
                      {['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            changeActiveMonth(m, false);
                          }}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all border ${
                            activeMonth === m && !isCustomMonth
                              ? 'bg-[#0e9e9e] text-white border-[#0e9e9e]'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all border ${
                          isCustomMonth
                            ? 'bg-[#0e9e9e] text-white border-[#0e9e9e]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isCustomMonth ? `شهر: ${activeMonth}` : 'مخصص...'}
                      </button>
                    </div>

                    {isCustomMonth && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="text"
                          placeholder="اسم الشهر يدوياً..."
                          value={customMonthInput}
                          onChange={(e) => setCustomMonthInput(e.target.value)}
                          className="px-2 py-1 text-[10px] border rounded bg-white font-bold w-32 text-right focus:outline-none focus:border-[#0e9e9e]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customMonthInput.trim()) {
                              changeActiveMonth(customMonthInput.trim(), true);
                            }
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-white bg-[#0e9e9e] hover:bg-[#077d7d] rounded cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] font-black text-[#c9a227]">طريقة احتساب علامات الشهر الإجمالية:</span>
                      <select
                        value={calculationMethod}
                        onChange={(e) => {
                          const nextMethod = e.target.value as 'average' | 'highest' | 'active';
                          changeCalculationMethod(nextMethod);
                        }}
                        className="px-2 py-1 text-[11px] border rounded bg-white font-bold w-full text-right focus:outline-none"
                      >
                        <option value="average">متوسط كل الشهور المدونة</option>
                        <option value="highest">أعلى درجة تم رصدها</option>
                        <option value="active">درجة شهر {activeMonth} فقط</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subjects marks */}
                <div className="space-y-3">
                  <h5 className="font-bold text-xs text-slate-800 border-r-2 border-[#c9a227] pr-2">درجات تقييم الطالب المفصلة:</h5>
                  
                  <div className="space-y-4 bg-slate-50 p-3 rounded-xl border max-h-[350px] overflow-y-auto">
                    {gradeConfig.subjects.map(sub => {
                      const scores = marksForm[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0, monthlyHistory: {} };
                      const historyObj = scores.monthlyHistory || {};

                      let activeMonthVal = 0;
                      if (historyObj[activeMonth] !== undefined) {
                        activeMonthVal = Number(historyObj[activeMonth]);
                      } else if (Object.keys(historyObj).length === 0) {
                        activeMonthVal = Number(scores.monthly ?? 0);
                      } else {
                        activeMonthVal = 0;
                      }
                      
                      return (
                        <div key={sub.id} className="space-y-2 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center bg-white/50 p-1.5 rounded-lg border border-slate-100 flex-wrap gap-1.5">
                            <span className="text-xs font-black text-slate-800">{sub.name}</span>
                            <div className="flex gap-2 text-[10px] font-black">
                              <span className={scores.monthly >= 20 ? 'text-emerald-600' : 'text-rose-600'}>الشهري الكلي: {scores.monthly}/40</span>
                              <span className={scores.midTerm >= 25 ? 'text-emerald-600' : 'text-rose-600'}>منتصف: {scores.midTerm}/50</span>
                              <span className={scores.finalExam >= 50 ? 'text-emerald-600' : 'text-rose-600'}>نهائي: {scores.finalExam}/100</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-gray-500 font-semibold text-center">أعمال {activeMonth} (٤٠)</label>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                required
                                value={activeMonthVal}
                                onChange={(e) => {
                                  const nextVal = Number(e.target.value);
                                  const dup = { ...marksForm };
                                  const nextHistory = { ...historyObj, [activeMonth]: nextVal };
                                  const calculatedMonthly = calculateMonthlyFromHistory(
                                    nextHistory,
                                    nextVal,
                                    calculationMethod,
                                    activeMonth
                                  );
                                  dup[sub.id] = { 
                                    ...scores, 
                                    monthlyHistory: nextHistory,
                                    monthly: calculatedMonthly
                                  };
                                  setMarksForm(dup);
                                }}
                                className="w-full px-2 py-1 text-center text-xs font-bold border rounded bg-white focus:ring-1 focus:ring-[#0e9e9e] focus:outline-none"
                              />
                              {Object.keys(historyObj).length > 0 && (
                                <div className="flex flex-wrap gap-0.5 justify-center text-[7px] text-slate-400 mt-1">
                                  {Object.entries(historyObj).map(([month, val]) => (
                                    <span key={month} className={`px-0.5 py-0.5 rounded ${month === activeMonth ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`} title={`${month}: ${val}`}>
                                      {month}:{val}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-gray-500 font-semibold text-center">نصف العام (٥٠)</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                required
                                value={scores.midTerm}
                                onChange={(e) => {
                                  const dup = { ...marksForm };
                                  dup[sub.id] = { ...scores, midTerm: Number(e.target.value) };
                                  setMarksForm(dup);
                                }}
                                className="w-full px-2 py-1 text-center text-xs font-bold border rounded bg-white focus:ring-1 focus:ring-[#0e9e9e] focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-gray-500 font-semibold text-center">آخر العام (١٠٠)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                required
                                value={scores.finalExam}
                                onChange={(e) => {
                                  const dup = { ...marksForm };
                                  dup[sub.id] = { ...scores, finalExam: Number(e.target.value) };
                                  setMarksForm(dup);
                                }}
                                className="w-full px-2 py-1 text-center text-xs font-bold border rounded bg-white focus:ring-1 focus:ring-[#0e9e9e] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-grow py-2 bg-[#0e9e9e] text-white font-bold rounded-lg hover:bg-[#0d2b45] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    حفظ وحساب النتائج فوراً
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-all text-xs"
                  >
                    إلغاء
                  </button>
                </div>

              </form>

            </div>
          ) : (
            <div className="bg-white p-8 text-center rounded-3xl border border-slate-200 text-slate-400 font-sans shadow flex flex-col items-center justify-center space-y-3">
              <Users className="w-12 h-12 text-slate-300" />
              <p className="text-xs">الرجاء اختيار أحد الطلاب من الجدول المقابل، لتحديث درجاته المدرسية وحساب النتيجة الإجمالية له.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
