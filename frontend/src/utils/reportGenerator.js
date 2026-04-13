import jsPDF from 'jspdf';

export const generateMonthlyRevenueReport = (transactions, metrics) => {
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
      label: 'Total Transactions:',
      value: metrics.totalTransactions || 0,
    },
    {
      label: 'Total Gross Volume:',
      value: `Rs. ${parseFloat(metrics.totalGrossRevenue || 0).toFixed(2)}`,
    },
    {
      label: 'Total Platform Fees:',
      value: `Rs. ${parseFloat(metrics.platformRevenue || 0).toFixed(2)}`,
    },
    {
      label: 'Total Refunds:',
      value: `Rs. ${(dailyDataArray.reduce((sum, day) => sum + day.refunds, 0)).toFixed(2)}`,
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
  pdf.text('Daily Breakdown', margin, yPosition);

  yPosition += 8;

  // Table headers
  const headers = ['Date', 'Transactions', 'Gross Volume', 'Platform Fees', 'Refunds'];
  const colWidths = [40, 28, 32, 32, 28];
  const rowHeight = 7;

  // Draw header
  pdf.setFillColor(79, 70, 229);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont(undefined, 'bold');

  let xPos = margin;
  headers.forEach((header, index) => {
    pdf.rect(xPos, yPosition, colWidths[index], rowHeight, 'F');
    pdf.text(header, xPos + 2, yPosition + 5);
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
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');

      xPos = margin;
      headers.forEach((header, index) => {
        pdf.rect(xPos, yPosition, colWidths[index], rowHeight, 'F');
        pdf.text(header, xPos + 2, yPosition + 5);
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
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
    }

    const dateStr = new Date(day.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });

    const rowData = [
      dateStr,
      day.transactions.toString(),
      `Rs. ${day.grossVolume.toFixed(2)}`,
      `Rs. ${day.fees.toFixed(2)}`,
      `Rs. ${day.refunds.toFixed(2)}`,
    ];

    xPos = margin;
    rowData.forEach((data, index) => {
      pdf.text(data, xPos + 2, yPosition + 5);
      xPos += colWidths[index];
    });

    yPosition += rowHeight;
    rowCount += 1;
  });

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