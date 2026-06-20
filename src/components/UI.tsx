import React from 'react';
import { 
  School,
  GraduationCap, 
  Search, 
  Settings, 
  LogOut, 
  BookOpen, 
  Users, 
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  CalendarCheck
} from 'lucide-react';

// Custom CSS class abbreviations
export const BRAND_COLORS = {
  teal: '#0e9e9e',
  gold: '#c9a227',
  blue: '#0d2b45'
};

// 1. Shared Header & Banner for School System
export const SchoolHeader: React.FC<{
  currentTab: string;
  onTabChange: (tab: string) => void;
  role: 'admin' | 'teacher' | 'student' | null;
  onLogout: () => void;
  userName?: string;
}> = ({ currentTab, onTabChange, role, onLogout, userName }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#0d2b45] text-white shadow-xl border-b-4 border-[#c9a227]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* School Brand logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-[#0e9e9e] rounded-xl text-white shadow-md border border-[#c9a227]/40">
              <School className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight font-sans">
                مدرسة الشهيد محمد الدرة الاساسية
              </h1>
              <span className="text-xs sm:text-sm text-[#c9a227] font-medium">
                البوابة الإلكترونية الذكية للمدرسة
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onTabChange('public')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                currentTab === 'public'
                  ? 'bg-[#0e9e9e] text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              بوابة الطالب والزوار
            </button>

            {role === 'admin' && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  currentTab === 'admin'
                    ? 'bg-[#0e9e9e] text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                لوحة تحكم المدير
              </button>
            )}

            {role === 'teacher' && (
              <button
                onClick={() => onTabChange('teacher')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  currentTab === 'teacher'
                    ? 'bg-[#0e9e9e] text-[#0d2b45] shadow-lg font-bold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                لوحة تحكم المعلم
              </button>
            )}
          </nav>

          {/* Identity & LogOut Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {role ? (
              <div className="flex items-center gap-2 bg-slate-800/60 py-1.5 px-3 rounded-lg border border-slate-700">
                <div className="text-right">
                  <p className="text-xs text-gray-400">مرحباً بك،</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#c9a227] truncate max-w-[120px]">
                    {userName || (role === 'admin' ? 'المدير العام' : 'المعلم')}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onTabChange('login')}
                className="px-4 py-2 bg-[#c9a227] text-[#0d2b45] font-bold rounded-lg hover:bg-amber-400 transition-all duration-200 shadow-md border border-[#c9a227] cursor-pointer text-xs sm:text-sm"
              >
                دخول الكادر التعليمي
              </button>
            )}
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto gap-2 py-3 border-t border-white/10 scrollbar-none items-center justify-center">
          <button
            onClick={() => onTabChange('public')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap scroll-mx-4 transition-all duration-200 ${
              currentTab === 'public'
                ? 'bg-[#0e9e9e] text-white shadow-md font-bold'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            بوابة الطلاب
          </button>

          {role === 'admin' && (
            <button
              onClick={() => onTabChange('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                currentTab === 'admin'
                  ? 'bg-[#0e9e9e] text-white shadow-md font-bold'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              لوحة المدير
            </button>
          )}

          {role === 'teacher' && (
            <button
              onClick={() => onTabChange('teacher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                currentTab === 'teacher'
                  ? 'bg-[#0e9e9e] text-white shadow-md font-bold'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              لوحة المعلم
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

// 2. Beautiful custom Card with customizable styles
export const AppCard: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}> = ({ title, icon, children, className = '', footer }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-right ${className}`}>
      {title && (
        <div className="bg-[#0d2b45] px-6 py-4 flex items-center justify-between border-b-2 border-[#c9a227]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {title}
          </h3>
          {icon && <div className="text-[#c9a227]">{icon}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

// 3. Status Badges containing Arabic
export const ResultBadge: React.FC<{ status: 'ناجح' | 'راسب' | 'غائب' }> = ({ status }) => {
  const styles = {
    'ناجح': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    'راسب': 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    'غائب': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${styles[status]}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ml-1.5 ${
        status === 'ناجح' ? 'bg-emerald-500' : status === 'راسب' ? 'bg-rose-500' : 'bg-amber-500'
      }`} />
      {status}
    </span>
  );
};

// 4. Custom Arabesque Banner Card for Public Landing
export const HeroBanner: React.FC = () => {
  return (
    <div className="relative w-full bg-[#0d2b45] text-white rounded-3xl overflow-hidden shadow-2xl border-2 border-[#c9a227]/40 p-8 sm:p-12 mb-8 animate-fade-in">
      {/* Decorative geometries */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#0e9e9e]/10 rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c9a227]/10 rounded-full blur-3xl -ml-16 -mb-16" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-right space-y-4 max-w-2xl">
          <span className="inline-block bg-[#0e9e9e]/35 text-[#c9a227] px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border border-[#c9a227]/30">
            العام الدراسي الحالي: ٢٠٢٥ / ٢٠٢٦ م
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            بوابة نتائج الطلاب والشهادات الرقمية المعتمدة
          </h2>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">
            مرحباً بكم في مدرسة الشهيد محمد الدرة الاساسية. تتيح هذه المنصة للطلاب وأولياء الأمور الاستعلام الفوري عن نتائج امتحانات نصف العام وأخر العام، ومتابعة درجات الاختبارات الشهرية بكل يسر، وطباعة الشهادات بختم المدرسة الرسمي.
          </p>
        </div>
        <div className="flex-shrink-0 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col items-center gap-3">
          <GraduationCap className="w-16 h-16 text-[#c9a227]" />
          <div className="text-center">
            <p className="text-xs text-gray-300">الشهادات الصادرة</p>
            <p className="text-xl font-bold text-white">١,٢٤٠ شهادة معتمدة</p>
          </div>
        </div>
      </div>
    </div>
  );
};
