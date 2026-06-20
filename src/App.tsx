import React, { useState, useEffect } from 'react';
import { 
  SchoolHeader, 
  AppCard, 
  BRAND_COLORS 
} from './components/UI';
import { StudentPublic } from './components/StudentPublic';
import { AdminPanel } from './components/AdminPanel';
import { TeacherPanel } from './components/TeacherPanel';
import { dbService, authService, isPlaceholder } from './firebase';
import { Teacher, UserRole } from './types';
import { 
  Lock, 
  LogIn, 
  UserCheck, 
  AlertCircle, 
  LogOut,
  GraduationCap,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('public');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // States for custom credential login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // For testing and role simulation warnings
  const [errorBanner, setErrorBanner] = useState('');

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthLoading(true);
    const trimmedUser = username.trim().toLowerCase();
    
    if (trimmedUser === 'm7md' && password === '1234') {
      const adminUser = {
        uid: 'admin_credential_uid_m7md',
        email: 'drhschool1@gmail.com', // Map to general admin email for cloud security rules compatibility
        displayName: 'المدير محمد',
        emailVerified: true
      };
      // Keep online simulation status if it is not a placeholder, or run in appropriate mode
      dbService.setSimulated(isPlaceholder);
      setCurrentUser(adminUser);
      setUserRole('admin');
      setCurrentTab('admin');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    // Listen to Auth State Changes
    const unsubscribe = authService.onAuthStateChanged(async (user: any) => {
      setAuthLoading(true);
      setErrorBanner('');
      if (user) {
        setCurrentUser(user);
        await resolveUserRole(user.email, user.uid);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setCurrentTeacher(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute roles matching emails/databases
  const resolveUserRole = async (email: string, uid: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Is super administrator - HARDCODED CHECK FIRST (Fail-proof)
      if (normalizedEmail === 'salemjalaal1@gmail.com' || normalizedEmail === 'drhschool1@gmail.com' || normalizedEmail === 'admin@school.com') {
        setUserRole('admin');
        setCurrentTab('admin'); // auto route
        return;
      }

      // 2. Read supervisors checklist (wrapped in try-catch so it won't crash super-admins or teachers if Firestore fails)
      let isSupervisor = false;
      try {
        const supervisors = await dbService.getSupervisors();
        isSupervisor = supervisors.some(s => s.email.trim().toLowerCase() === normalizedEmail);
      } catch (err) {
        console.warn("Failed checking supervisors, proceeding with other roles:", err);
      }

      if (isSupervisor) {
        setUserRole('admin');
        setCurrentTab('admin'); // auto route
        return;
      }

      // 3. Read teachers checklist
      const teacherRecords = await dbService.getTeachers();
      const matchTeacher = teacherRecords.find(t => t.email.trim().toLowerCase() === normalizedEmail);

      if (matchTeacher) {
        // Safe mapping
        const mappedTeacher: Teacher = {
          ...matchTeacher,
          id: uid, // link auth id
          email: normalizedEmail // Ensure lowercase normalized email
        };
        setCurrentTeacher(mappedTeacher);
        
        // Self-healing: write the mapped teacher under their auth UID to Firestore, so security rules see them!
        try {
          await dbService.saveTeacher(mappedTeacher);
        } catch (saveErr) {
          console.warn("Self-healing teacher registration failed:", saveErr);
        }

        setUserRole('teacher');
        setCurrentTab('teacher'); // auto route
        return;
      }

      // 4. Checked but not recognized teacher or administrator
      setUserRole(null);
      setErrorBanner('هذا حساب Google غير مدرج في كشوف الهيئة المدرسية كمدير أو معلم. للولوج يرجى استخدام الحسابات التجريبية بالأسفل.');
    } catch (e) {
      console.error("Role resolution failure:", e);
      // Fallback
      setUserRole(null);
    }
  };

  const handleSignInGoogle = async () => {
    setErrorBanner('');
    try {
      dbService.setSimulated(isPlaceholder);
      const result = await authService.signInWithGoogle();
      if (result && result.user) {
        setCurrentUser(result.user);
        await resolveUserRole(result.user.email, result.user.uid);
      }
    } catch (e: any) {
      console.error(e);
      setErrorBanner('فشل الاتصال بخادم تسجيل الدخول لـ Google.');
    }
  };

  // Demo simulations for AI Studio builder testing
  const handleDemoLogin = async (role: 'admin' | 'teacher') => {
    setAuthLoading(true);
    setErrorBanner('');
    dbService.setSimulated(true);
    
    if (role === 'admin') {
      const demoAdmin = {
        uid: 'demo_admin_uid_99',
        email: 'drhschool1@gmail.com',
        displayName: 'المدير العام (تجريبي)',
        emailVerified: true
      };
      setCurrentUser(demoAdmin);
      setUserRole('admin');
      setCurrentTab('admin');
    } else {
      // Fallback or seed teacher
      const teachers = await dbService.getTeachers();
      const demoT = teachers[0] || { id: 'teacher@school.com', name: 'أستاذ حازم المنشاوي', email: 'teacher@school.com', grade: '1' };
      
      const demoTeacherUser = {
        uid: demoT.id,
        email: demoT.email,
        displayName: demoT.name,
        emailVerified: true
      };
      setCurrentUser(demoTeacherUser);
      setCurrentTeacher(demoT);
      setUserRole('teacher');
      setCurrentTab('teacher');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    dbService.setSimulated(isPlaceholder);
    setCurrentUser(null);
    setUserRole(null);
    setCurrentTeacher(null);
    setCurrentTab('public');
    setErrorBanner('');
  };

  // Safe wrapper details
  const displayUserName = currentUser ? (currentUser.displayName || currentUser.email) : undefined;
  const status = dbService.getConnectionStatus();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-right font-sans antialiased overflow-x-hidden selection:bg-[#0e9e9e] selection:text-white" style={{ direction: 'rtl' }}>
      
      {/* Banner / Navigation Menu */}
      <SchoolHeader
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        role={userRole}
        onLogout={handleLogout}
        userName={displayUserName}
      />

      {/* Dynamic Cloud connection status banner */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        {status.isSimulated ? (
          <div className="bg-amber-50/90 border border-amber-200 py-3 px-4 rounded-2xl shadow-sm text-right flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2 text-amber-800 text-xs sm:text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span>تنبيه: تعمل البوابة حالياً في وضع "قاعدة البيانات المحلية المؤقتة" (أوفلاين).</span>
              {status.initError && (
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-mono text-left block" dir="ltr">
                  {status.initError}
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-100/40 px-2.5 py-1 rounded-lg">سيتم حفظ وترصيد تعديلاتك مَحلياً في هذا المتصفح.</p>
          </div>
        ) : (
          <div className="bg-emerald-50/90 border border-emerald-200 py-3 px-4 rounded-2xl shadow-sm text-right flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span>البوابة الالكترونية متصلة بنجاح بالسحابة الرقمية الآمنة لـ مدرسة الشهيد محمد الدرة الاساسية (Firestore).</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-mono font-bold bg-emerald-100/40 px-2.5 py-1 rounded-lg" dir="ltr">
              DB ID: {status.databaseId}
            </p>
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <main className="flex-grow w-full">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-[#0e9e9e] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">جاري فحص حالة الأمان وصلاحيات الدخول لخدمات المدرسة...</p>
          </div>
        ) : (
          <div className="animate-fade-in w-full">
            
            {/* View router bases */}
            {currentTab === 'public' && <StudentPublic />}

            {currentTab === 'admin' && userRole === 'admin' && <AdminPanel />}

            {currentTab === 'teacher' && userRole === 'teacher' && currentTeacher && (
              <TeacherPanel currentTeacher={currentTeacher} />
            )}

            {currentTab === 'login' && !currentUser && (
              <div className="max-w-md mx-auto px-4 py-8">
                <AppCard title="تسجيل دخول الكادر التعليمي" icon={<Lock className="w-5 h-5" />}>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-500 leading-relaxed text-center">
                      قم بتسجيل الدخول باستخدام حساب المدير العام لإدارة المدرسة والتحكم.
                    </p>

                    <form onSubmit={handleCredentialsLogin} className="space-y-4">
                      {loginError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm font-semibold border border-red-100 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="usernameInput">
                          اسم المستخدم
                        </label>
                        <input
                          id="usernameInput"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="m7md"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0e9e9e] focus:ring-1 focus:ring-[#0e9e9e] text-right transition-all text-sm font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="passwordInput">
                          كلمة المرور
                        </label>
                        <input
                          id="passwordInput"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0e9e9e] focus:ring-1 focus:ring-[#0e9e9e] transition-all text-sm font-semibold tracking-widest text-center"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        id="loginSubmitBtn"
                        className="w-full py-3 px-4 bg-[#0d2b45] hover:bg-[#123e63] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md text-sm hover:shadow-lg"
                      >
                        <ShieldCheck className="w-5 h-5 text-[#c9a227]" />
                        دخول لوحة التحكم
                      </button>
                    </form>

                  </div>
                </AppCard>
              </div>
            )}

            {/* Error notifications or guest checkups banner */}
            {currentUser && !userRole && (
              <div className="max-w-xl mx-auto px-4 py-16 animate-fade-in text-center">
                <AppCard title="فشل التحقق من الصلاحيات والتحكم" icon={<AlertCircle className="w-6 h-6 text-red-500" />}>
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="p-3 bg-rose-50 rounded-full text-rose-500">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                      هذا الحساب المراد تسجيل دخوله ({currentUser.email}) ليس جزءاً من الطاقم التعليمي المعتمد بمدرسة الشهيد محمد الدرة الاساسية حتى الآن.
                    </p>
                    <p className="text-xs text-amber-600">
                      إذا كنت معلماً، يرجى مطالبة المدير بإضافة بريدك الإلكتروني لصفك للدخول والتحكم بالصف السحابي المخصص لطلابك.
                    </p>

                    <button
                      onClick={handleLogout}
                      className="mt-4 px-4 py-2 text-xs text-red-500 hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج والرجوع للبوابة العامة
                    </button>
                  </div>
                </AppCard>
                {errorBanner && (
                  <p className="text-xs text-rose-600 font-bold mt-4 leading-relaxed">{errorBanner}</p>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Persistent global brand credentials footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <div>
            <p className="text-sm font-bold text-slate-300">نظام مدرسة الشهيد محمد الدرة الاساسية الرقمي © ٢٠٢٦</p>
            <p className="text-xs text-slate-500 mt-1">جميع شهادات الطلاب معتمدة ومشفرة بختم الجودة والاعتماد المدرسي.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-[#0e9e9e]">التوافق مع الهواتف والأجهزة اللوحية (مفعل)</span>
            <span className="text-slate-600">|</span>
            <span className="text-[#c9a227]">أنظمة قواعد البيانات السحابية (آمنة)</span>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
