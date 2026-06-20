import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Font 
} from '@react-pdf/renderer';
import { Student, GradeSetting } from '../types';

// Register Cairo Font for Arabic support in PDF
Font.register({
  family: 'Cairo',
  src: 'https://fonts.gstatic.com/s/cairo/v28/SLXMc1GDQDq437c-EG-O.ttf',
  fontWeight: 'normal',
});

Font.register({
  family: 'Cairo-Bold',
  src: 'https://fonts.gstatic.com/s/cairo/v28/SLXMc1GDQDq437c-E2cE.ttf',
  fontWeight: 'bold',
});

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    padding: 30,
    backgroundColor: '#ffffff',
    direction: 'rtl',
  },
  borderContainer: {
    border: '4pt solid #0d2b45',
    padding: 20,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  innerBorder: {
    border: '1.5pt solid #c9a227',
    padding: 15,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  ministryTitle: {
    fontSize: 12,
    color: '#0d2b45',
    marginBottom: 3,
  },
  schoolName: {
    fontSize: 14,
    color: '#0e9e9e',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  certTitle: {
    fontSize: 22,
    color: '#0d2b45',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    borderBottom: '2pt solid #c9a227',
    paddingBottom: 5,
  },
  studentInfoRow: {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '1pt dashed #cccccc',
  },
  infoText: {
    fontSize: 12,
    color: '#1a202c',
  },
  boldInfoText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginVertical: 15,
    border: '1pt solid #dddddd',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row-reverse',
    backgroundColor: '#0e9e9e',
    padding: 6,
    color: '#ffffff',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row-reverse',
    borderBottom: '1pt solid #dddddd',
    padding: 6,
  },
  colSubject: {
    width: '40%',
    textAlign: 'right',
    fontSize: 10,
  },
  colMonthly: {
    width: '20%',
    textAlign: 'center',
    fontSize: 10,
  },
  colMidTerm: {
    width: '20%',
    textAlign: 'center',
    fontSize: 10,
  },
  colFinalExam: {
    width: '20%',
    textAlign: 'center',
    fontSize: 10,
  },
  summaryBlock: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderRight: '4pt solid #0e9e9e',
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0d2b45',
  },
  resultBoxPass: {
    backgroundColor: '#ecfdf5',
    border: '1pt solid #10b981',
    borderRadius: 4,
    padding: 8,
    textAlign: 'center',
    marginVertical: 10,
  },
  resultBoxFail: {
    backgroundColor: '#fef2f2',
    border: '1pt solid #ef4444',
    borderRadius: 4,
    padding: 8,
    textAlign: 'center',
    marginVertical: 10,
  },
  resultTextPass: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultTextFail: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 10,
    color: '#7f1d1d',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1pt solid #eeeeee',
  },
  signatureCol: {
    width: '40%',
    textAlign: 'center',
  },
  signatureTitle: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 20,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0d2b45',
  }
});

interface CertificatePdfProps {
  student: Student;
  gradeConfig: GradeSetting;
  studentRank?: number | null;
  totalClassStudents?: number;
  rankStage?: 'all' | 'monthly' | 'half' | 'final';
}

export const CertificatePdf: React.FC<CertificatePdfProps> = ({ student, gradeConfig, studentRank, totalClassStudents, rankStage }) => {
  // Safe mapping of subject details with 3 component-scores
  const subjectsWithGrades = gradeConfig?.subjects.map(subject => {
    const sGrades = student.subjectGrades[subject.id] || { monthly: 0, midTerm: 0, finalExam: 0 };
    
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

    const finalGrade = monthly;

    return {
      name: subject.name,
      monthly,
      midTerm,
      finalExam,
      grade: finalGrade,
      passingGrade: Math.round(subject.passingGrade * 0.2),
    };
  }) || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.borderContainer}>
          <View style={styles.innerBorder}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.ministryTitle}>وزارة التربية والتعليم والتعليم الفني</Text>
              <Text style={styles.schoolName}>مدرسة الشهيد محمد الدرة الاساسية</Text>
              <Text style={styles.certTitle}>شهادة إثبات درجات طالب</Text>
            </View>

            {/* Student Info */}
            <View style={styles.studentInfoRow}>
              <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Text style={styles.infoText}>اسم الطالب: <Text style={styles.boldInfoText}>{student.name}</Text></Text>
                <Text style={styles.infoText}>الصف الدراسي: <Text style={styles.boldInfoText}>{gradeConfig?.gradeName || student.grade}</Text></Text>
              </View>
              <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Text style={styles.infoText}>الرقم المدرسي: <Text style={styles.boldInfoText}>{student.seatNumber}</Text></Text>
                <Text style={styles.infoText}>تاريخ الصدور: <Text style={styles.boldInfoText}>{new Date().toLocaleDateString('ar-EG')}</Text></Text>
              </View>
            </View>

            {/* Grades Table */}
            <View style={styles.table}>
              {/* Header row */}
              <View style={styles.tableHeader}>
                <Text style={[styles.colSubject, { color: '#ffffff', fontWeight: 'bold' }]}>المادة</Text>
                <Text style={[styles.colMonthly, { color: '#ffffff', fontWeight: 'bold' }]}>أعمال الشهر (٤٠)</Text>
                <Text style={[styles.colMidTerm, { color: '#ffffff', fontWeight: 'bold' }]}>نصف العام (٥٠)</Text>
                <Text style={[styles.colFinalExam, { color: '#ffffff', fontWeight: 'bold' }]}>آخر العام (١٠٠)</Text>
              </View>

              {/* Data rows */}
              {subjectsWithGrades.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.colSubject}>{item.name}</Text>
                  <Text style={[styles.colMonthly, { color: item.monthly >= 20 ? '#10b981' : '#ef4444', fontWeight: 'bold' }]}>
                    {item.monthly} / 40
                  </Text>
                  <Text style={[styles.colMidTerm, { color: item.midTerm >= 25 ? '#10b981' : '#ef4444', fontWeight: 'bold' }]}>
                    {item.midTerm} / 50
                  </Text>
                  <Text style={[styles.colFinalExam, { color: item.finalExam >= 50 ? '#10b981' : '#ef4444', fontWeight: 'bold' }]}>
                    {item.finalExam} / 100
                  </Text>
                </View>
              ))}
            </View>

            {/* Summary Block */}
            <View style={styles.summaryBlock}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>المجموع الكلي من المواد:</Text>
                <Text style={styles.summaryVal}>{student.totalPoints} من أصل {subjectsWithGrades.length * 190}</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Text style={styles.summaryLabel}>نسبة الحضور والمواظبة السلوكية:</Text>
                <Text style={styles.summaryVal}>
                  {student.attendancePercentage ?? 100}% (حضور {student.presentDays ?? 180} يوم / غياب {student.absentDays ?? 0} يوم)
                </Text>
              </View>
              {studentRank && totalClassStudents ? (() => {
                let stageText = 'المجموع السنوي العام';
                if (rankStage === 'monthly') stageText = 'الاختبارات الشهرية';
                if (rankStage === 'half') stageText = 'اختبار منتصف العام';
                if (rankStage === 'final') stageText = 'اختبار آخر العام';
                return (
                  <View style={[styles.summaryRow, { marginTop: 4 }]}>
                    <Text style={styles.summaryLabel}>ترتيب الطالب في ({stageText}):</Text>
                    <Text style={[styles.summaryVal, { color: '#c9a227', fontWeight: 'bold' }]}>المركز {studentRank} من أصل {totalClassStudents} طلاب</Text>
                  </View>
                );
              })() : null}
            </View>

            {/* Result Status Box */}
            {student.resultStatus === 'ناجح' ? (
              <View style={styles.resultBoxPass}>
                <Text style={styles.resultTextPass}>الحالة النهائية: ناجح ومؤهل للصف الأعلى</Text>
              </View>
            ) : (
              <View style={styles.resultBoxFail}>
                <Text style={styles.resultTextFail}>الحالة النهائية: راسب / باقٍ للإعادة</Text>
                {student.reason && <Text style={styles.reasonText}>{student.reason}</Text>}
              </View>
            )}

            {/* Footer Signatures */}
            <View style={styles.footer}>
              <View style={styles.signatureCol}>
                <Text style={styles.signatureTitle}>مختم شؤون الطلاب</Text>
                <Text style={[styles.signatureName, { marginTop: 20 }]}>........................</Text>
              </View>
              <View style={styles.signatureCol}>
                <Text style={styles.signatureTitle}>مدير المدرسة بالنيابة</Text>
                <Text style={[styles.signatureName, { marginTop: 20 }]}>أ.د. سالم جلال العراقي</Text>
              </View>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
};
