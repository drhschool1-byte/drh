import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { dbService } from '../firebase';
import { Student, GradeSetting, Complaint, NewStudentRegistration } from '../types';
import { 
  FileSpreadsheet, 
  Trash2, 
  AlertTriangle, 
  Lock, 
  Check, 
  Download, 
  RefreshCw,
  Award
} from 'lucide-react';

interface SystemResetPortalProps {
  students: Student[];
  grades: GradeSetting[];
  complaints: Complaint[];
  registrations: NewStudentRegistration[];
  onSuccess: () => void;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export const SystemResetPortal: React.FC<SystemResetPortalProps> = ({
  students,
  grades,
  complaints,
  registrations,
  onSuccess,
  triggerSuccess,
  triggerError
}) => {
  const [isBackupDone, setIsBackupDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // كلمات مرور تأكيدية للنظام للحماية القصوى
  const SECURITY_PASSWORD = "RESET_SYSTEM_2026"; 

  // أخذ نسخة احتياطية إجبارية وتصديرها كملف Excel يحتوي على تبييض لجميع الشيتات والمجموعات
  const handleExportBackup = async () => {
    setLoading(true);
    setStatusMessage('جاري توليد ملف النسخة الاحتياطية الشاملة...');
    try {
      const wb = XLSX.utils.book_new();

      // 1. ورقة بيانات الطلاب الأساسية والمعدلات العامة
      const studentsData = students.map(s => {
        const gradeConfig = grades.find(g => g.id === s.grade);
        return {
          'اسم الطالب': s.name,
          'رقم الجلوس / الرقم المدرسي': s.seatNumber,
          'الصف الدراسي الحالي': gradeConfig?.gradeName || s.grade,
          'المجموع الكلي للدرجات': s.totalPoints || 0,
          'حالة النتيجة العامة': s.resultStatus || 'لم ترصد',
          'ملاحظات / أسباب النتيجة': s.reason || ''
        };
      });
      const wsStudents = XLSX.utils.json_to_sheet(studentsData);
      XLSX.utils.book_append_sheet(wb, wsStudents, 'سجل بيانات الطلاب والنتائج');

      // 2. ورقة درجات المواد التفصيلية لكل طالب
      const subjectGradesData = students.map(s => {
        const gradeConfig = grades.find(g => g.id === s.grade);
        const row: any = {
          'اسم الطالب': s.name,
          'رقم الجلوس': s.seatNumber,
          'الصف الدراسي': gradeConfig?.gradeName || s.grade,
        };
        
        if (gradeConfig) {
          gradeConfig.subjects.forEach(sub => {
            const g = s.subjectGrades?.[sub.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
            row[`${sub.name} - اختبار شهري`] = g.monthly ?? 0;
            row[`${sub.name} - نصف العام`] = g.midTerm ?? 0;
            row[`${sub.name} - آخر العام`] = g.finalExam ?? 0;
          });
        }
        return row;
      });
      const wsSubjectGrades = XLSX.utils.json_to_sheet(subjectGradesData);
      XLSX.utils.book_append_sheet(wb, wsSubjectGrades, 'تفاصيل درجات المواد');

      // 3. ورقة التظلمات والشكاوى السابقة
      const complaintsData = complaints.map(c => {
        const gradeConfig = grades.find(g => g.id === c.gradeId);
        return {
          'اسم الطالب': c.studentName,
          'رقم الجلوس': c.seatNumber || '',
          'الصف الدراسي': gradeConfig?.gradeName || c.gradeId,
          'موضوع التظلم': c.complaintSubject,
          'التفاصيل والقرائن': c.details,
          'هاتف التواصل المعتمد': c.contactPhone || '',
          'تاريخ تقديم الشكوى': c.date ? new Date(c.date).toLocaleString('ar-EG') : '',
          'حالة التظلم الحالي': c.status
        };
      });
      const wsComplaints = XLSX.utils.json_to_sheet(complaintsData);
      XLSX.utils.book_append_sheet(wb, wsComplaints, 'سجل تظلمات الطلاب');

      // 4. ورقة طلبات التسجيل المنسقة
      const registrationsData = registrations.map(r => {
        const gradeConfig = grades.find(g => g.id === r.gradeId);
        return {
          'اسم الطالب المترشح': r.studentName,
          'اسم ولي الأمر / الوصي': r.parentName,
          'الصف الدراسي المطلوب': gradeConfig?.gradeName || r.gradeId,
          'اسم وجنس الطالب': r.gender,
          'رقم هاتف ولي الأمر للتواصل': r.parentPhone,
          'تاريخ تقديم طلب القبول': r.submissionDate ? new Date(r.submissionDate).toLocaleString('ar-EG') : '',
          'تاريخ الميلاد الفعلي': r.birthDate,
          'الحالة الإدارية الحالية للطلب': r.status,
          'الرد والملاحظات التعديلية': r.notes || ''
        };
      });
      const wsRegistrations = XLSX.utils.json_to_sheet(registrationsData);
      XLSX.utils.book_append_sheet(wb, wsRegistrations, 'طلبات التسجيل والقبول');

      // كتابة وحفظ المصنف بالكامل
      XLSX.writeFile(wb, `النسخة_الاحتياطية_النظامية_${new Date().toISOString().split('T')[0]}.xlsx`);

      setIsBackupDone(true);
      triggerSuccess('تم إنشاء وتحميل ملف النسخة الاحتياطية الشاملة بنجاح! يمكنك الآن تفعيل زر إعادة التهيئة والترحيل للعام القادم.');
    } catch (error) {
      console.error(error);
      triggerError('حدث خطأ غير متوقع أثناء توليد ملف النسخة الاحتياطية التفصيلي.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // الخطوة الثانية: تصفير الجداول وتثبيت/ترقية الطلاب للعام الجديد
  const handleSystemResetAndPromotion = async () => {
    if (adminPassword !== SECURITY_PASSWORD) {
      triggerError('رمز تأكيد الأمان الذي أدخلته غير صحيح. يرجى التحقق وإعادة المحاولة.');
      return;
    }

    setLoading(true);
    setStatusMessage('جاري تنفيذ معاملات قاعدة البيانات للترحيل والترقية وتصفير الدرجات...');
    setShowConfirmModal(false);

    try {
      // تنفيذ عملية التهيئة والترحيل السريعة والشاملة
      const result = await dbService.performSystemResetAndPromotion();
      
      triggerSuccess(`تم ترحيل وترقية العام الدراسي الجديد بنجاح! تم معالجة وترقية ${result.studentsProcessed} طالب ونقل ${result.graduatesArchived} طالب خريج إلى سجل الأرشيف الدائم بنجاح.`);
      
      setIsBackupDone(false);
      setAdminPassword('');
      onSuccess(); // استدعاء دالة تحديث كافة البيانات في الـ AdminPanel
    } catch (error) {
      console.error(error);
      triggerError('فشل في إتمام عملية التصفير والترحيل النظامي. يرجى التحقق من اتصال شبكة الإنترنت.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-200 animate-fade-in text-right font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-r-8 border-[#c9a227]">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#c9a227] animate-spin-slow" />
            <h2 className="text-xl lg:text-2xl font-black">بوابة تصفيل وترحيل النظام السنوي</h2>
          </div>
          <p className="text-slate-300 text-xs font-bold leading-relaxed max-w-2xl">
            تتيح لك هذه المنظومة تصفير درجات الطلاب الحالية وحضورهم، ترحيل وترقية الطلاب الناجحين تلقائياً إلى الفصول الدراسية الأعلى، تبيت الطلاب الباقين للإعادة، وتصدير الخريجين كأرشيف مع أخذ نسخة احتياطية إلزامية قبل البدء لحماية سلامة البيانات.
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-5 py-3 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
          <span className="text-amber-400 font-black text-xs font-mono">نهاية العام الدراسي 2026</span>
        </div>
      </div>

      {/* Safety Alert Board */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-8 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-rose-900 text-sm">تنبيه الحماية السيادية القصوى</h3>
          <p className="text-rose-800 text-xs leading-relaxed font-bold">
            هذه العملية حساسة للغاية وتقوم بإحداث تغييرات جذرية لا يمكن التراجع عنها في قاعدة البيانات. بمجرد تأكيد الترحيل، سيتم ترحيل مستويات الطلاب الدراسية، تصفير كشوف الدرجات، وحذف سجل تظلمات الفصل السابق بالكامل لبدء دورة دراسية جديدة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Step 1 Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#0e9e9e] text-white flex items-center justify-center font-black text-sm">١</span>
              <h3 className="font-extrabold text-slate-800 text-base">تصدير وحفظ النسخة الاحتياطية الشاملة</h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-bold">
              كإجراء أمان إلزامي فرضه النظام لحماية درجات تظلمات ومعدلات العام، يجب عليك تصدير كافة جداول قاعدة البيانات الحالية لملف Excel منظم يحتوي على أربعة أوراق عمل (الطلاب والدرجات والتظلمات والطلبات). لن يعمل زر إعادة التهيئة إلا بعد تحميل الملف بنجاح.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            {isBackupDone ? (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-black">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم تأمين وحفظ النسخة الاحتياطية بنجاح!</span>
              </div>
            ) : (
              <div className="bg-slate-200 text-slate-600 px-4 py-3 rounded-xl text-xs font-semibold">
                بانتظار أخذ النسخة الاحتياطية...
              </div>
            )}

            <button
              onClick={handleExportBackup}
              disabled={loading}
              className={`px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                loading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#0e9e9e] hover:bg-[#077f7f] text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>توليد وتصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Step 2 Card */}
        <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between transition-all ${
          !isBackupDone ? 'opacity-60 grayscale cursor-not-allowed' : ''
        }`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-sm">٢</span>
              <h3 className="font-extrabold text-slate-800 text-base">بدء الترحيل وترقية المنظومة</h3>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-bold">
              عند التنشيط، سيقوم محرك الترحيل بترقية الصفوف للطلاب الناجحين (مثلاً من الأول إلى الثاني)، ونقل خريجي الصف التاسع لمستودع الأرشيف الخارجي، وتبيت الراسبين والغائبين، مع إعادة تصفير جداول علامات المواد الدراسية ودرجات الشهور تمهيداً للعام القادم.
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => {
                if (!isBackupDone) {
                  triggerError('يرجى أخذ نسخة احتياطية أولاً قبل محاولة إعادة التهيئة والترحيل.');
                  return;
                }
                setShowConfirmModal(true);
              }}
              disabled={loading || !isBackupDone}
              className={`px-6 py-3.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                loading || !isBackupDone
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>بدء التهيئة والترحيل العام</span>
            </button>
          </div>
        </div>

      </div>

      {loading && (
        <div className="mt-8 bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-[#0e9e9e] animate-spin" />
          <span className="text-xs font-bold text-slate-700">{statusMessage}</span>
        </div>
      )}

      {/* Security Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md transform transition-transform animate-fade-in overflow-hidden">
            
            {/* Modal Title */}
            <div className="bg-rose-950 px-6 py-4 border-b-2 border-[#c9a227] flex items-center justify-between text-white">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#c9a227]" />
                مطلوب رمز تفويض الإدارة العليا
              </h3>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-right">
              <div className="bg-rose-50 p-4 rounded-xl text-rose-800 text-xs font-bold leading-relaxed">
                هل أنت متأكد تماماً من قرار ترحيل الطلاب وتصفير المنظومة؟ هذه الخطوة ستقوم فوراً بنقل خريجي الصف التاسع الناجحين للارشيف وحذفهم من القوائم النشطة، وزيادة صفوف البقية بمعدل صف دراسي واحد، وتفريغ كشوف علامات المواد بالكامل.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700">الرجاء إدخال الرمز السري للتصفير للتأكيد:</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl font-mono text-center text-sm focus:border-rose-600 focus:outline-none"
                  placeholder="RESET_SYSTEM_2026"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <span className="block text-[10px] text-slate-400">
                  الرمز الافتراضي للتأمين هو: <span className="font-mono font-bold select-all bg-slate-100 p-0.5 rounded text-rose-600">RESET_SYSTEM_2026</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3">
              <button
                onClick={handleSystemResetAndPromotion}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                تأكيد وبدء الترحيل كلياً
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                تراجع وإلغاء
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
