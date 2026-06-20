import { jsPDF } from 'jspdf';
import { User, HealthMetric, Medication, MedicationLog } from '../types.ts';

/**
 * Utility to generate a beautifully styled PDF record of user health metrics and prescriptions.
 */
export const generateHealthReportPDF = (
  user: User,
  metrics: HealthMetric[],
  medications: Medication[],
  logs: MedicationLog[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 180 mm

  let y = 15; // Vertical cursor tracker

  // Progress/page validation helper
  const checkPageSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    // Top primary emerald horizontal bar
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Document identifier title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('MediSense AI', leftMargin, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('WELLNESS SUMMARY & COMPLIANCE RECORD', leftMargin, y + 10);

    // Generation timestamp text right-aligned
    const dateStr = new Date().toLocaleString();
    doc.text(`Generated: ${dateStr}`, pageWidth - rightMargin, y + 10, { align: 'right' });

    // Accent line divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(leftMargin, y + 13, pageWidth - rightMargin, y + 13);
    
    y += 18;
  };

  // 1. Render First Page Header and Metadata
  drawPageHeader();

  // Patient Card details
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(leftMargin, y, contentWidth, 24, 'F');
  doc.setDrawColor(241, 245, 249); // Slate-100
  doc.rect(leftMargin, y, contentWidth, 24, 'S');

  // Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('User Profile:', leftMargin + 5, y + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(`Name:   ${user.fullName || 'Registered Clinic User'}`, leftMargin + 5, y + 12);
  doc.text(`Email:  ${user.email || '—'}`, leftMargin + 5, y + 18);

  // Status metrics summary column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Report Details:', leftMargin + 95, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Recorded Vitals Logs:   ${metrics.length}`, leftMargin + 95, y + 12);
  doc.text(`Actionable Prescriptions: ${medications.length}`, leftMargin + 95, y + 18);

  y += 32;

  // 2. LATEST WELLNESS VITALS BLOCK
  checkPageSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LATEST LOGGED HEALTH VITALS', leftMargin, y);
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.line(leftMargin, y + 2, pageWidth - rightMargin, y + 2);
  y += 6;

  if (metrics.length === 0) {
    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('No physical vital logs recorded in Postgres yet.', leftMargin + 5, y + 4);
    y += 12;
  } else {
    // Fetch latest record indices
    const latest = metrics[0];
    const bpString = latest.bloodPressureSystolic && latest.bloodPressureDiastolic
      ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg`
      : '—';

    // Grid of metrics coordinates
    const stats = [
      { label: 'Weight', val: latest.weight ? `${latest.weight} kg` : '—' },
      { label: 'Blood Pressure', val: bpString },
      { label: 'Pulse Rate', val: latest.heartRate ? `${latest.heartRate} bpm` : '—' },
      { label: 'Sleep Cycles', val: latest.sleepHours ? `${latest.sleepHours} hrs` : '—' },
      { label: 'Hydration Log', val: latest.waterIntakeMl ? `${latest.waterIntakeMl} ml` : '—' },
      { label: 'Active BMI', val: latest.bmi ? `${latest.bmi} idx` : '—' },
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Latest Record Timestamp: ${latest.recordedAt}`, leftMargin, y);
    y += 5;

    // Output stats as dynamic table panels
    const colWidth = contentWidth / 3;
    let gridRowY = y;

    stats.forEach((st, idx) => {
      const colIdx = idx % 3;
      const rowIdx = Math.floor(idx / 3);
      const cellX = leftMargin + (colIdx * colWidth);
      const cellY = gridRowY + (rowIdx * 15);

      // Card Background
      doc.setFillColor(248, 250, 252);
      doc.rect(cellX, cellY, colWidth - 4, 12, 'F');
      
      // Text labels
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(st.label, cellX + 3, cellY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(st.val, cellX + 3, cellY + 9.5);
    });

    y += 35;
  }

  // 3. MEDICATIONS TABLE
  checkPageSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('ACTIVE PRESCRIPTIONS & DOSING SCHEDULES', leftMargin, y);

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(leftMargin, y + 2, pageWidth - rightMargin, y + 2);
  y += 6;

  if (medications.length === 0) {
    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No logged pharmaceutical prescriptions.', leftMargin + 5, y + 4);
    y += 12;
  } else {
    // Draw columns headers
    doc.setFillColor(241, 245, 249); // Slate-100 header
    doc.rect(leftMargin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    
    doc.text('Medication Name', leftMargin + 3, y + 5);
    doc.text('Dosage', leftMargin + 50, y + 5);
    doc.text('Frequency', leftMargin + 85, y + 5);
    doc.text('Reminder Time', leftMargin + 125, y + 5);
    doc.text('Duration Cycle', leftMargin + 155, y + 5);

    y += 7;

    medications.forEach((med) => {
      checkPageSpace(12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      // Truncate name safely
      const nameSaf = med.name.length > 22 ? `${med.name.substring(0, 20)}...` : med.name;
      doc.text(nameSaf, leftMargin + 3, y + 5);
      doc.text(med.dosage || '—', leftMargin + 50, y + 5);
      doc.text(med.frequency || 'Once daily', leftMargin + 85, y + 5);
      doc.text(med.reminderTime || '—', leftMargin + 125, y + 5);
      
      const durationStr = med.endDate ? `${med.startDate} to ${med.endDate}` : `${med.startDate} onward`;
      doc.text(durationStr, leftMargin + 155, y + 5);

      // Light underline separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, y + 8, pageWidth - rightMargin, y + 8);

      y += 8;
    });
    y += 5;
  }

  // 4. VITALS TIMELINE HISTORY (Timeseries rows logs)
  checkPageSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORICAL VITALS TIMELINE LOG', leftMargin, y);

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(leftMargin, y + 2, pageWidth - rightMargin, y + 2);
  y += 6;

  if (metrics.length === 0) {
    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No historical vital records to tabulate.', leftMargin + 5, y + 4);
    y += 12;
  } else {
    // Show table header
    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Recorded Date', leftMargin + 3, y + 5);
    doc.text('Weight (kg)', leftMargin + 40, y + 5);
    doc.text('BP Systolic', leftMargin + 67, y + 5);
    doc.text('BP Diastolic', leftMargin + 95, y + 5);
    doc.text('Pulse (bpm)', leftMargin + 122, y + 5);
    doc.text('Sleep (hrs)', leftMargin + 145, y + 5);
    doc.text('Hydration (ml)', leftMargin + 165, y + 5);

    y += 7;

    // Show up to the latest 8 entries to avoid overflow, keeping document concise and professional
    const latestMetrics = metrics.slice(0, 10);

    latestMetrics.forEach((m) => {
      checkPageSpace(10);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // Slate-700

      doc.text(m.recordedAt, leftMargin + 3, y + 4);
      doc.text(m.weight ? `${m.weight} kg` : '—', leftMargin + 40, y + 4);
      doc.text(m.bloodPressureSystolic ? `${m.bloodPressureSystolic} mmHg` : '—', leftMargin + 67, y + 4);
      doc.text(m.bloodPressureDiastolic ? `${m.bloodPressureDiastolic} mmHg` : '—', leftMargin + 95, y + 4);
      doc.text(m.heartRate ? `${m.heartRate} bpm` : '—', leftMargin + 122, y + 4);
      doc.text(m.sleepHours ? `${m.sleepHours} hrs` : '—', leftMargin + 145, y + 4);
      doc.text(m.waterIntakeMl ? `${m.waterIntakeMl} ml` : '—', leftMargin + 165, y + 4);

      // Bottom border for cells
      doc.setDrawColor(241, 245, 249);
      doc.line(leftMargin, y + 7, pageWidth - rightMargin, y + 7);

      y += 7;
    });
    
    if (metrics.length > 10) {
      doc.setFont('helvetica', 'oblique');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`* Showing latest 10 of ${metrics.length} recorded entries. View additional logs online inside the portal.`, leftMargin + 3, y + 4);
      y += 6;
    }
    y += 5;
  }

  // 5. VITALS COMPLIANCE HISTORY ROWS
  checkPageSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('MEDICATION COMPLIANCE HISTORY LOGS', leftMargin, y);

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(leftMargin, y + 2, pageWidth - rightMargin, y + 2);
  y += 6;

  if (logs.length === 0) {
    doc.setFont('helvetica', 'oblique');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No adherence actions or swallow alerts logged yet.', leftMargin + 5, y + 4);
    y += 12;
  } else {
    // Show compliance table headers
    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text('Medication', leftMargin + 3, y + 5);
    doc.text('Compliance Status', leftMargin + 55, y + 5);
    doc.text('Date Actioned', leftMargin + 105, y + 5);
    doc.text('Specific Ingestion Timestamp', leftMargin + 140, y + 5);

    y += 7;

    // Show up to the latest 8 adherence logs
    const latestLogs = logs.slice(0, 10);

    latestLogs.forEach((log) => {
      checkPageSpace(10);

      const medRef = medications.find((m) => m.id === log.medicationId);
      const medName = medRef ? medRef.name : 'Unknown Medication';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      doc.text(medName, leftMargin + 3, y + 4);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald color for TAKEN status
      doc.text(log.status.toUpperCase() === 'TAKEN' ? 'TAKEN' : 'MISSED', leftMargin + 55, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(log.date, leftMargin + 105, y + 4);

      const timeStr = new Date(log.takenAt).toLocaleTimeString();
      doc.text(timeStr, leftMargin + 140, y + 4);

      doc.setDrawColor(241, 245, 249);
      doc.line(leftMargin, y + 7, pageWidth - rightMargin, y + 7);

      y += 7;
    });

    if (logs.length > 10) {
      doc.setFont('helvetica', 'oblique');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`* Tabulated latest 10 compliance actions. Detailed timelines are visible in the Medication portal.`, leftMargin + 3, y + 4);
      y += 6;
    }
  }

  // 6. BOTTOM LEGAL DISCLAIMER AND FOOTER SIGNATURE
  checkPageSpace(30);
  y += 10;
  doc.setLineWidth(0.4);
  doc.setDrawColor(241, 245, 249);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  
  y += 4;
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const memoText = 'Disclaimer: This summary sheet was auto-generated by MediSense AI relying strictly on wellness feedback tracked directly by the user. It is for tracking and reference purposes only. Any values highlighted here must not substitute diagnostic analysis from verified healthcare professionals.';
  const wrappedMemo = doc.splitTextToSize(memoText, contentWidth);
  doc.text(wrappedMemo, leftMargin, y);

  // Trigger browser PDF save download
  const formattedDate = new Date().toISOString().split('T')[0];
  doc.save(`medisense-ai-health-report-${formattedDate}.pdf`);
};
