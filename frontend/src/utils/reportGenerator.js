import jsPDF from 'jspdf';

const formatReportCurrency = (amount) => `Rs. ${(parseFloat(amount || 0)).toFixed(2)}`;

const getTransactionDateValue = (tx) => tx.completedAt || tx.updatedAt || tx.createdAt;

const drawCellText = (pdf, text, x, y, width, align = 'left') => {
  if (align === 'right') {
    pdf.text(String(text), x + width - 2, y + 5, { align: 'right' });
    return;
  }
  if (align === 'center') {
    pdf.text(String(text), x + (width / 2), y + 5, { align: 'center' });
    return;
  }
  pdf.text(String(text), x + 2, y + 5);
};

const truncateText = (value, maxChars) => {
  if (!value) return '';
  const text = String(value);
  if (text.length <= maxChars) return text;
  return `${text.substring(0, maxChars - 3)}...`;
};

const resolveIdentity = (lookup = {}, entityId, fallbackLabel) => {
  const info = lookup[String(entityId)] || {};
  return {
    entityId: info.entityId ?? entityId ?? 'N/A',
    name: info.name || fallbackLabel,
    email: info.email || 'N/A',
  };
};

export const generateMonthlyRevenueReport = (transactions, metrics, options = {}) => {
  const { patientInfoById = {}, doctorInfoById = {} } = options;
  // Prepare data - group transactions by date
  const dailyData = {};

  transactions.forEach((tx) => {
    const txDate = tx.completedAt || tx.updatedAt || tx.createdAt;
    if (!txDate) return;

    const date = new Date(txDate).toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        transactions: 0,
        grossVolume: 0,
        fees: 0,
        refunds: 0,
      };
    }

    dailyData[date].transactions += 1;
    dailyData[date].grossVolume += parseFloat(tx.amount) || 0;

    if (tx.paymentStatus === 'COMPLETED' || tx.paymentStatus === 'SUCCESS') {
      dailyData[date].fees += parseFloat(tx.platformFee) || 0;
    }

    if (tx.paymentStatus === 'REFUNDED') {
      dailyData[date].refunds += parseFloat(tx.amount) || 0;
    }
  });

  // Sort dates
  const sortedDates = Object.keys(dailyData).sort();
  const dailyDataArray = sortedDates.map((date) => dailyData[date]);

  // Create PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // ==================== HEADER ====================
  pdf.setFillColor(79, 70, 229); // Indigo color (similar to your theme)
  pdf.rect(0, 0, pageWidth, 35, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.text('MediStream', margin, yPosition + 15);

  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.text('Monthly Revenue Report', margin, yPosition + 25);

  yPosition = 45;

  // ==================== REPORT INFO ====================
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(`Report Generated: ${currentDate}`, margin, yPosition);

  if (dailyDataArray.length > 0) {
    const firstDate = new Date(dailyDataArray[0].date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const lastDate = new Date(dailyDataArray[dailyDataArray.length - 1].date).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
    pdf.text(`Period: ${firstDate} to ${lastDate}`, margin, yPosition + 7);
  }

  yPosition += 20;

  // ==================== SUMMARY METRICS ====================
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text('Summary', margin, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');

  const summaryItems = [
    {
      label: 'Total Transactions Recorded:',
      value: metrics.totalTransactions || 0,
    },
    {
      label: 'Total Gross Revenue:',
      value: formatReportCurrency(metrics.totalGrossRevenue || 0),
    },
    {
      label: 'Total Platform Fees Collected:',
      value: formatReportCurrency(metrics.platformRevenue || 0),
    },
    {
      label: 'Total Refund Amount:',
      value: formatReportCurrency(dailyDataArray.reduce((sum, day) => sum + day.refunds, 0)),
    },
  ];

  summaryItems.forEach((item, index) => {
    pdf.text(
      `${item.label} ${item.value}`,
      margin,
      yPosition + index * 7
    );
  });

  yPosition += summaryItems.length * 7 + 10;

  // ==================== DAILY BREAKDOWN TABLE ====================
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text('Daily Financial Breakdown', margin, yPosition);

  yPosition += 8;

  // Table headers
  const headers = ['No.', 'Transaction Date', 'Transactions', 'Gross Revenue (LKR)', 'Platform Fees (LKR)', 'Refunds (LKR)'];
  const colWidths = [14, 34, 24, 36, 36, 36];
  const rowHeight = 7;
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

  // Draw header
  pdf.setFillColor(79, 70, 229);
  pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont(undefined, 'bold');

  let xPos = margin;
  headers.forEach((header, index) => {
    drawCellText(pdf, header, xPos, yPosition, colWidths[index], 'center');
    xPos += colWidths[index];
  });

  yPosition += rowHeight;

  // Draw rows
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(8);

  let rowCount = 0;
  dailyDataArray.forEach((day) => {
    // Check if we need a new page
    if (yPosition + rowHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;

      // Redraw header on new page
      pdf.setFillColor(79, 70, 229);
      pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');

      xPos = margin;
      headers.forEach((header, index) => {
        drawCellText(pdf, header, xPos, yPosition, colWidths[index], 'center');
        xPos += colWidths[index];
      });

      yPosition += rowHeight;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
    }

    // Alternate row colors
    if (rowCount % 2 === 0) {
      pdf.setFillColor(245, 245, 250);
      pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
    }

    const dateStr = new Date(day.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });

    const rowData = [
      (rowCount + 1).toString(),
      dateStr,
      day.transactions.toString(),
      formatReportCurrency(day.grossVolume),
      formatReportCurrency(day.fees),
      formatReportCurrency(day.refunds),
    ];

    xPos = margin;
    rowData.forEach((data, index) => {
      const align = index === 0 || index === 2 ? 'center' : index === 1 ? 'left' : 'right';
      drawCellText(pdf, data, xPos, yPosition, colWidths[index], align);
      xPos += colWidths[index];
    });

    yPosition += rowHeight;
    rowCount += 1;
  });

  // ==================== TRANSACTION IDENTITY TABLE ====================
  const identityRows = transactions
    .slice()
    .sort((a, b) => new Date(getTransactionDateValue(b) || 0) - new Date(getTransactionDateValue(a) || 0))
    .map((tx) => {
      const patient = resolveIdentity(patientInfoById, tx.patientId, 'Unknown Patient');
      const doctor = resolveIdentity(doctorInfoById, tx.doctorId, 'Unknown Doctor');

      return {
        id: tx.id,
        patientLabel: `ID:${patient.entityId} | ${patient.name}`,
        patientEmail: patient.email,
        doctorLabel: `ID:${doctor.entityId} | ${doctor.name}`,
        doctorEmail: doctor.email,
      };
    });

  if (identityRows.length > 0) {
    if (yPosition + 16 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Transaction Party Details', margin, yPosition);

    yPosition += 8;

    const identityHeaders = ['No.', 'Tx ID', 'Patient (ID + Name)', 'Patient Email', 'Doctor (ID + Name)', 'Doctor Email'];
    const identityColWidths = [12, 14, 44, 34, 44, 34];
    const identityRowHeight = 7;
    const identityTableWidth = identityColWidths.reduce((sum, width) => sum + width, 0);

    pdf.setFillColor(55, 48, 163);
    pdf.rect(margin, yPosition, identityTableWidth, identityRowHeight, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'bold');

    let identityX = margin;
    identityHeaders.forEach((header, index) => {
      drawCellText(pdf, header, identityX, yPosition, identityColWidths[index], 'center');
      identityX += identityColWidths[index];
    });

    yPosition += identityRowHeight;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(7);

    identityRows.forEach((row, index) => {
      if (yPosition + identityRowHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;

        pdf.setFillColor(55, 48, 163);
        pdf.rect(margin, yPosition, identityTableWidth, identityRowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');

        identityX = margin;
        identityHeaders.forEach((header, headerIndex) => {
          drawCellText(pdf, header, identityX, yPosition, identityColWidths[headerIndex], 'center');
          identityX += identityColWidths[headerIndex];
        });

        yPosition += identityRowHeight;
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
      }

      if (index % 2 === 0) {
        pdf.setFillColor(247, 247, 252);
        pdf.rect(margin, yPosition, identityTableWidth, identityRowHeight, 'F');
      }

      const rowData = [
        (index + 1).toString(),
        `#${row.id}`,
        truncateText(row.patientLabel, 30),
        truncateText(row.patientEmail, 24),
        truncateText(row.doctorLabel, 30),
        truncateText(row.doctorEmail, 24),
      ];

      identityX = margin;
      rowData.forEach((data, colIndex) => {
        const align = colIndex <= 1 ? 'center' : 'left';
        drawCellText(pdf, data, identityX, yPosition, identityColWidths[colIndex], align);
        identityX += identityColWidths[colIndex];
      });

      yPosition += identityRowHeight;
    });
  }

  // ==================== FOOTER ====================
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // ==================== DOWNLOAD ====================
  const fileName = `MediStream_Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export const generateDoctorPayoutReport = (transactions, doctorInfoById = {}, selectedPeriod = 'All Time') => {
  const doctorStatsById = {};

  Object.entries(doctorInfoById).forEach(([doctorId, doctorInfo]) => {
    doctorStatsById[doctorId] = {
      doctorId,
      doctorName: doctorInfo?.name || `Doctor ${doctorId}`,
      doctorEmail: doctorInfo?.email || 'N/A',
      appointmentsCompleted: 0,
      totalEarnings: 0,
      paidOutAmount: 0,
    };
  });

  transactions.forEach((tx) => {
    const status = tx.paymentStatus;
    if (status !== 'COMPLETED' && status !== 'SUCCESS') {
      return;
    }

    const doctorId = tx.doctorId?.toString() || 'UNKNOWN';
    if (!doctorStatsById[doctorId]) {
      const doctorInfo = doctorInfoById[doctorId] || {};
      doctorStatsById[doctorId] = {
        doctorId,
        doctorName: doctorInfo.name || `Doctor ${doctorId}`,
        doctorEmail: doctorInfo.email || 'N/A',
        appointmentsCompleted: 0,
        totalEarnings: 0,
        paidOutAmount: 0,
      };
    }

    const earnings = parseFloat(
      tx.doctorEarnings ?? ((parseFloat(tx.amount) || 0) - (parseFloat(tx.platformFee) || 0))
    ) || 0;
    const paidOut = tx.doctorPayoutStatus === 'COMPLETED' ? earnings : 0;

    doctorStatsById[doctorId].appointmentsCompleted += 1;
    doctorStatsById[doctorId].totalEarnings += earnings;
    doctorStatsById[doctorId].paidOutAmount += paidOut;
  });

  const doctorRows = Object.values(doctorStatsById).sort((a, b) =>
    a.doctorName.localeCompare(b.doctorName)
  );

  const totals = doctorRows.reduce(
    (acc, row) => {
      acc.totalAppointments += row.appointmentsCompleted;
      acc.totalEarnings += row.totalEarnings;
      acc.totalPaidOut += row.paidOutAmount;
      return acc;
    },
    { totalAppointments: 0, totalEarnings: 0, totalPaidOut: 0 }
  );

  const activeDoctors = doctorRows.filter((row) => row.appointmentsCompleted > 0).length;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  pdf.setFillColor(234, 88, 12);
  pdf.rect(0, 0, pageWidth, 35, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.text('MediStream', margin, yPosition + 15);

  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.text('Doctor Payout Report', margin, yPosition + 25);

  yPosition = 45;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.text(`Report Generated: ${currentDate}`, margin, yPosition);
  pdf.text(`Selected Period: ${selectedPeriod}`, margin, yPosition + 7);

  if (transactions.length > 0) {
    const sortedDates = transactions
      .map(getTransactionDateValue)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);

    if (sortedDates.length > 0) {
      const firstDate = sortedDates[0].toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const lastDate = sortedDates[sortedDates.length - 1].toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      pdf.text(`Data Window: ${firstDate} to ${lastDate}`, margin, yPosition + 14);
    }
  }

  yPosition += 25;

  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text('Summary', margin, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');

  const summaryItems = [
    `Total Doctors Listed: ${doctorRows.length}`,
    `Active Doctors in Period: ${activeDoctors}`,
    `Total Completed Appointments: ${totals.totalAppointments}`,
    `Total Doctor Earnings (LKR): ${formatReportCurrency(totals.totalEarnings)}`,
    `Total Paid Out Amount (LKR): ${formatReportCurrency(totals.totalPaidOut)}`,
  ];

  summaryItems.forEach((item, index) => {
    pdf.text(item, margin, yPosition + index * 7);
  });

  yPosition += summaryItems.length * 7 + 10;

  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text('Doctor Payout Breakdown', margin, yPosition);

  yPosition += 8;

  const headers = ['No.', 'Doctor ID', 'Doctor Name', 'Doctor Email', 'Completed Appts', 'Earnings (LKR)', 'Paid Out (LKR)'];
  const colWidths = [10, 16, 36, 36, 22, 30, 30];
  const rowHeight = 7;
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

  pdf.setFillColor(234, 88, 12);
  pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont(undefined, 'bold');

  let xPos = margin;
  headers.forEach((header, index) => {
    drawCellText(pdf, header, xPos, yPosition, colWidths[index], 'center');
    xPos += colWidths[index];
  });

  yPosition += rowHeight;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(8);

  let rowCount = 0;
  doctorRows.forEach((row) => {
    if (yPosition + rowHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;

      pdf.setFillColor(234, 88, 12);
      pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');

      xPos = margin;
      headers.forEach((header, index) => {
        drawCellText(pdf, header, xPos, yPosition, colWidths[index], 'center');
        xPos += colWidths[index];
      });

      yPosition += rowHeight;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
    }

    if (rowCount % 2 === 0) {
      pdf.setFillColor(253, 247, 237);
      pdf.rect(margin, yPosition, tableWidth, rowHeight, 'F');
    }

    const doctorName = truncateText(row.doctorName, 26);
    const doctorEmail = truncateText(row.doctorEmail, 24);

    const rowData = [
      (rowCount + 1).toString(),
      row.doctorId,
      doctorName,
      doctorEmail,
      row.appointmentsCompleted.toString(),
      formatReportCurrency(row.totalEarnings),
      formatReportCurrency(row.paidOutAmount),
    ];

    xPos = margin;
    rowData.forEach((data, index) => {
      const align = index === 0 || index === 1 || index === 4 ? 'center' : (index >= 5 ? 'right' : 'left');
      drawCellText(pdf, data, xPos, yPosition, colWidths[index], align);
      xPos += colWidths[index];
    });

    yPosition += rowHeight;
    rowCount += 1;
  });

  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i += 1) {
    pdf.setPage(i);
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  const fileName = `MediStream_Doctor_Payout_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
