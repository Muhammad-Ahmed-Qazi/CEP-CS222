import { Component, OnInit } from '@angular/core';
import { PrintData } from '../../../services/print-data';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface DailyReport {
  date: string;
  totalJobs: number;
  totalRevenue: number;
  normalJobs: number;
  bulkJobs: number;
}

export interface UserSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  totalJobs: number;
  totalSpend: number;
  currentBalance: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-reports',
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss'],
  standalone: false
})
export class Reports implements OnInit {
  dailyReports: DailyReport[] = [];
  userSummaries: UserSummary[] = [];
  
  // State
  isLoading = true;
  showAllDays = false;
  backendConfigError = false; 
  
  // Stats
  totalJobs30d = 0;
  totalRevenue30d = 0;
  avgJobsPerDay = 0;
  
  // Queue Pressure
  queuePressure = 0;
  queueStatus = 'Low Load';
  
  // Job Distribution
  normalJobsCount = 0;
  bulkJobsCount = 0;
  normalJobsPct = 0;
  bulkJobsPct = 0;
  
  // Users
  topUsers: UserSummary[] = [];

  // PDF Generation States
  isGeneratingDaily = false;
  isGeneratingSummary = false;
  isGeneratingOverview = false;

  constructor(private printDataService: PrintData) {}

  ngOnInit(): void {
    console.log('[ReportsComponent] Initialising component...');
    this.fetchData();
  }

  fetchData(): void {
    console.log('[ReportsComponent] Triggering fetchData() pipeline...');
    this.isLoading = true;
    this.backendConfigError = false;
    
    forkJoin({
      daily: this.printDataService.getDailyReports().pipe(
        catchError(err => {
          console.error('[ReportsComponent] Daily reports stream fetch failed intercept configuration:', err);
          return of(null);
        })
      ),
      users: this.printDataService.getUserSummary().pipe(
        catchError(err => {
          console.error('[ReportsComponent] User Summary stream fetch failed intercept configuration:', err);
          return of(null);
        })
      )
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        console.log('[ReportsComponent] forkJoin transaction finalized. Loading state off.');
      })
    ).subscribe({
      next: (res: { daily: any; users: any }) => {
        console.group('[ReportsComponent] API Fetch Evaluation');
        console.log('Incoming Payload Response:', res);
        console.groupEnd();

        if (res.daily === null || res.users === null) {
          this.backendConfigError = true;
          this.dailyReports = [];
          this.userSummaries = [];
          this.processData();
          return;
        }

        const rawDaily = Array.isArray(res.daily) ? res.daily : (res.daily?.data || []);
        this.dailyReports = rawDaily.map((d: any) => ({
          date: d.date || d.DATE,
          totalJobs: Number(d.totalJobs ?? d.total_jobs ?? d.TOTAL_JOBS ?? 0),
          totalRevenue: Number(d.totalRevenue ?? d.total_revenue ?? d.TOTAL_REVENUE ?? 0),
          normalJobs: Number(d.normalJobs ?? d.normal_jobs ?? d.NORMAL_JOBS ?? 0),
          bulkJobs: Number(d.bulkJobs ?? d.bulk_jobs ?? d.BULK_JOBS ?? 0)
        }));

        const rawUsers = Array.isArray(res.users) ? res.users : (res.users?.data || []);
        this.userSummaries = rawUsers.map((u: any) => ({
          userId: u.userId || u.user_id || u.USER_ID,
          firstName: u.firstName || u.first_name || u.FIRST_NAME || '',
          lastName: u.lastName || u.last_name || u.LAST_NAME || '',
          email: u.email || u.EMAIL || '',
          totalJobs: Number(u.totalJobs ?? u.total_jobs ?? u.TOTAL_JOBS ?? 0),
          totalSpend: Number(u.totalSpend ?? u.total_spend ?? u.TOTAL_SPEND ?? 0),
          currentBalance: Number(u.currentBalance ?? u.current_balance ?? u.CURRENT_BALANCE ?? 0),
          totalPages: Number(u.totalPages ?? u.total_pages ?? u.TOTAL_PAGES ?? u.PAGES ?? u.pages ?? u.page_count ?? u.PAGE_COUNT ?? 0)
        }));
        
        this.processData();
      },
      error: (err) => {
        this.backendConfigError = true;
        console.group('%c[ReportsComponent] Critical Pipeline Fallback Exception', 'color: #ff3333; font-weight: bold;');
        console.error('Error Object Structural Details:', err);
        this.processData(); 
      }
    });
  }

  processData(): void {
    console.group('[ReportsComponent] Processing Retrieved Dataset Metrics');
    
    if (!this.dailyReports || this.dailyReports.length === 0) {
      this.totalJobs30d = 0;
      this.totalRevenue30d = 0;
      this.avgJobsPerDay = 0;
      this.queuePressure = 0;
      this.queueStatus = 'No Data Available';
      this.normalJobsCount = 0;
      this.bulkJobsCount = 0;
      this.normalJobsPct = 0;
      this.bulkJobsPct = 0;
      this.topUsers = [];
      console.groupEnd();
      return;
    }

    this.totalJobs30d = this.dailyReports.reduce((sum, d) => sum + d.totalJobs, 0);
    this.totalRevenue30d = this.dailyReports.reduce((sum, d) => sum + d.totalRevenue, 0);
    this.avgJobsPerDay = Math.round(this.totalJobs30d / (this.dailyReports.length || 1));

    const recentDay = this.dailyReports[this.dailyReports.length - 1];
    if (recentDay && recentDay.totalJobs > 0) {
      this.queuePressure = Math.min(Math.round((((recentDay.bulkJobs || 0) * 1.5) / recentDay.totalJobs) * 100), 100);
    }
    
    if (this.queuePressure < 40) this.queueStatus = 'Low Load';
    else if (this.queuePressure < 70) this.queueStatus = 'Moderate Load';
    else this.queueStatus = 'High Load';

    this.normalJobsCount = this.dailyReports.reduce((sum, d) => sum + d.normalJobs, 0);
    this.bulkJobsCount = this.dailyReports.reduce((sum, d) => sum + d.bulkJobs, 0);
    const totalJobDist = this.normalJobsCount + this.bulkJobsCount || 1;
    this.normalJobsPct = Math.round((this.normalJobsCount / totalJobDist) * 100);
    this.bulkJobsPct = Math.round((this.bulkJobsCount / totalJobDist) * 100);

    if (this.userSummaries && this.userSummaries.length > 0) {
      this.topUsers = [...this.userSummaries]
        .sort((a, b) => b.totalJobs - a.totalJobs)
        .slice(0, 10);
    } else {
      this.topUsers = [];
    }

    console.log('Metrics successfully compiled for structural tracking.');
    console.groupEnd();
  }

  get displayedDailyReports(): DailyReport[] {
    if (this.showAllDays) return this.dailyReports;
    return this.dailyReports.slice(-7);
  }

  formatPKR(value: number): string {
    return 'PKR ' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getInitials(first: string, last: string): string {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  }

  // --- PDF GENERATION LOGIC ---

  private addPdfHeader(doc: jsPDF, title: string, subtitle: string = '') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('CHAPAI', 14, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Print Management System', 14, 27);

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('NED University of Engineering and Technology', 196, 20, { align: 'right' });
    doc.text('Department of Computer and Information Systems Engineering', 196, 25, { align: 'right' });
    doc.text('Course: CS-222 Database Management Systems', 196, 30, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 46);
    
    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, 51);
    }

    const now = new Date();
    const dateString = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${dateString} ${now.toLocaleTimeString()}`, 196, 46, { align: 'right' });
    doc.text('Scope: Last 30 Days Operations', 196, 51, { align: 'right' });
  }

  private addPdfFooter(doc: jsPDF, pageCount: number, internalOnly = false) {
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(14, 280, 196, 280);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      let leftText = 'Chapai Print Management System — Confidential';
      if (internalOnly) leftText += ' | Internal Academic Audit Only — NED University';
      doc.text(leftText, 14, 285);
      doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
    }
  }

  downloadDailyReportPDF(): void {
    if (this.dailyReports.length === 0) return;
    this.isGeneratingDaily = true;
    setTimeout(() => {
      const doc = new jsPDF();
      this.addPdfHeader(doc, 'Daily Activity Report', 'Log breakdown of campus print execution pipeline');

      const cardWidth = 58;
      const cardY = 58;
      const metrics = [
        { label: 'Total Jobs Submitted', val: this.totalJobs30d.toString() },
        { label: 'Gross Volume Grossing', val: this.formatPKR(this.totalRevenue30d) },
        { label: 'Daily Job Mean Metric', val: this.avgJobsPerDay.toString() }
      ];

      metrics.forEach((m, idx) => {
        const xX = 14 + (idx * (cardWidth + 4));
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(xX, cardY, cardWidth, 20, 'FD');
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, xX + 3, cardY + 6);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(m.val, xX + 3, cardY + 14);
      });

      const tableBody = this.dailyReports.map(d => [
        new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        d.normalJobs.toLocaleString('en-US'),
        d.bulkJobs.toLocaleString('en-US'),
        d.totalJobs.toLocaleString('en-US'),
        this.formatPKR(d.totalRevenue)
      ]);
      
      tableBody.push([
        'TOTAL DECLARED',
        this.normalJobsCount.toLocaleString('en-US'),
        this.bulkJobsCount.toLocaleString('en-US'),
        this.totalJobs30d.toLocaleString('en-US'),
        this.formatPKR(this.totalRevenue30d)
      ]);

      autoTable(doc, {
        startY: 84,
        head: [['Calendar Date', 'Normal Streams', 'Bulk Pipelines', 'Gross Jobs', 'Revenue Aggregation']],
        body: tableBody,
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, valign: 'middle' },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 220) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Revenue Trend Vector Analysis — Last 30 Sequential Intervals', 14, finalY);
        
        const chartX = 14;
        const chartY = finalY + 6;
        const chartW = 182;
        const chartH = 35;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
        
        const maxRev = Math.max(...this.dailyReports.map(d => d.totalRevenue), 1);
        const barWidth = (chartW / this.dailyReports.length) - 1.5;
        
        this.dailyReports.forEach((day, i) => {
          const barH = (day.totalRevenue / maxRev) * chartH;
          const x = chartX + (i * (chartW / this.dailyReports.length));
          const y = chartY + chartH - barH;
          
          doc.setFillColor(day.totalRevenue === maxRev ? '#1e293b' : '#3b82f6');
          doc.rect(x, y, barWidth, barH, 'F');
        });
      }

      const pages = (doc.internal as any).getNumberOfPages();
      this.addPdfFooter(doc, pages);

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`chapai-daily-report-${dateStr}.pdf`);
      this.isGeneratingDaily = false;
    }, 100);
  }

  downloadUserSummaryPDF(): void {
    if (this.userSummaries.length === 0) return;
    this.isGeneratingSummary = true;
    setTimeout(() => {
      const doc = new jsPDF();
      this.addPdfHeader(doc, 'User Activity Summary Report', 'Operational profiling of accounts by network volume output');

      const cardWidth = 43;
      const cardY = 58;
      const totalUserJobs = this.userSummaries.reduce((s, u) => s + u.totalJobs, 0);
      const totalUserPages = this.userSummaries.reduce((s, u) => s + u.totalPages, 0);

      const metrics = [
        { label: 'Profiles Registered', val: this.userSummaries.length.toString() },
        { label: 'Aggregated Job Handlers', val: totalUserJobs.toString() },
        { label: 'Cumulative Client Spend', val: this.formatPKR(this.totalRevenue30d) },
        { label: 'Printed Canvas Leaves', val: totalUserPages.toLocaleString('en-US') }
      ];

      metrics.forEach((m, idx) => {
        const xX = 14 + (idx * (cardWidth + 3.3));
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(xX, cardY, cardWidth, 20, 'FD');
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, xX + 3, cardY + 6);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(m.val, xX + 3, cardY + 14);
      });

      const sortedUsers = [...this.userSummaries].sort((a, b) => b.totalSpend - a.totalSpend);
      const totalSpendAll = sortedUsers.reduce((s, u) => s + u.totalSpend, 0);
      const totalBalanceAll = sortedUsers.reduce((s, u) => s + u.currentBalance, 0);

      const tableBody = sortedUsers.map((u, index) => [
        (index + 1).toString(),
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.totalJobs.toLocaleString('en-US'),
        u.totalPages.toLocaleString('en-US'),
        this.formatPKR(u.totalSpend),
        this.formatPKR(u.currentBalance)
      ]);

      tableBody.push([
        '',
        'SYSTEM SUMMARY BALANCE TOTALS',
        '',
        totalUserJobs.toLocaleString('en-US'),
        totalUserPages.toLocaleString('en-US'),
        this.formatPKR(totalSpendAll),
        this.formatPKR(totalBalanceAll)
      ]);

      autoTable(doc, {
        startY: 84,
        head: [['Rank Index', 'Account Identifier Name', 'Corporate Base Email', 'Jobs', 'Pages', 'Gross Expense Matrix', 'Wallet Balance']],
        body: tableBody,
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3.5, valign: 'middle' },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold' },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          } else if (data.column.index === 6 && data.row.index < tableBody.length - 1) {
            const val = sortedUsers[data.row.index]?.currentBalance || 0;
            if (val === 0) data.cell.styles.textColor = [220, 38, 38]; 
            else if (val < 50) data.cell.styles.textColor = [217, 119, 6]; 
            else data.cell.styles.textColor = [22, 163, 74]; 
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 230) {
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Operational Executive Insights', 14, finalY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        
        const mostActive = [...this.userSummaries].sort((a,b) => b.totalJobs - a.totalJobs)[0];
        const highestSpender = sortedUsers[0];
        const avgSpend = totalSpendAll / (this.userSummaries.length || 1);
        const lowBalanceCount = this.userSummaries.filter(u => u.currentBalance < 50).length;

        let y = finalY + 7;
        doc.text(`• Core System Activator: ${mostActive?.firstName || 'N/A'} ${mostActive?.lastName || ''} presenting a cluster of ${mostActive?.totalJobs || 0} discrete runtime requests.`, 14, y); y += 5.5;
        doc.text(`• Top Account Funding Unit: ${highestSpender?.firstName || 'N/A'} ${highestSpender?.lastName || ''} clearing a balance of ${this.formatPKR(highestSpender?.totalSpend || 0)}.`, 14, y); y += 5.5;
        doc.text(`• Per-Capita Account Mean Investment: Calculated at ${this.formatPKR(avgSpend)} per profile context.`, 14, y); y += 5.5;
        doc.text(`• Depleted Liquidity Quotas (Under PKR 50): Identified across ${lowBalanceCount} consumer accounts requiring automated notification updates.`, 14, y);
      }

      const pages = (doc.internal as any).getNumberOfPages();
      this.addPdfFooter(doc, pages);

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`chapai-user-summary-${dateStr}.pdf`);
      this.isGeneratingSummary = false;
    }, 100);
  }

  downloadSystemOverviewPDF(): void {
    if (this.dailyReports.length === 0) return;
    this.isGeneratingOverview = true;
    setTimeout(() => {
      const doc = new jsPDF();
      this.addPdfHeader(doc, 'System Overview Report', 'Comprehensive infrastructure health and balance auditing metrics');

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 58, 182, 34, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text('OPERATIONAL STATUS: NODE ENGINE ONLINE ACTIVE', 18, 65);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Total System Submissions', 20, 74);
      doc.text('Gross Financed Audits', 85, 74);
      doc.text('Authenticated Access Links', 150, 74);
      
      doc.text('Normal Execution Streams', 20, 86);
      doc.text('Bulk Spool Computations', 85, 86);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(this.totalJobs30d.toLocaleString('en-US'), 20, 79);
      doc.text(this.formatPKR(this.totalRevenue30d), 85, 79);
      doc.text(this.userSummaries.length.toLocaleString('en-US'), 150, 79);
      
      doc.text(this.normalJobsCount.toLocaleString('en-US'), 20, 91);
      doc.text(this.bulkJobsCount.toLocaleString('en-US'), 85, 91);

      doc.setFontSize(12);
      doc.text('Recent Terminal Phase Operational Breakdowns', 14, 104);
      
      const tableBody = this.dailyReports.slice(-10).map(d => {
        return [
          new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          d.totalJobs.toLocaleString('en-US'),
          this.formatPKR(d.totalRevenue)
        ];
      });

      autoTable(doc, {
        startY: 109,
        head: [['Monitored Interval Frame', 'Resolved Jobs', 'Financial Accumulation']],
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.5, valign: 'middle' },
        headStyles: { fontStyle: 'bold', textColor: [15, 23, 42] },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' },
          2: { halign: 'right' }
        },
        didParseCell: (data) => {
          data.cell.styles.lineColor = [241, 245, 249];
        }
      });

      const pages = (doc.internal as any).getNumberOfPages();
      this.addPdfFooter(doc, pages, true);

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`chapai-system-overview-${dateStr}.pdf`);
      this.isGeneratingOverview = false;
    }, 100);
  }
}