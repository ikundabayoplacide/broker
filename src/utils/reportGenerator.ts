import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType } from 'docx';
import { ReportConfig } from '@/components/models/ReportModal';

interface ReportData {
  title: string;
  data: any[];
  fields: { key: string; label: string }[];
  dateRange: { start: string; end: string };
}

export class ReportGenerator {
  static async generatePDF(reportData: ReportData, config: ReportConfig): Promise<void> {
    const pdf = new jsPDF();
    
    // Logo
    try {
      pdf.addImage('/logo.png', 'PNG', 20, 10, 30, 15);
    } catch (error) {
      console.warn('Logo not found, continuing without logo');
    }
    
    // Header
    pdf.setFontSize(20);
    pdf.text(reportData.title, 60, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Report Period: ${config.startDate} to ${config.endDate}`, 20, 35);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Filter data based on selected fields
    const filteredFields = reportData.fields.filter(field => 
      config.selectedFields.includes(field.key)
    );
    
    const tableData = reportData.data.map(item => 
      filteredFields.map(field => item[field.key] || '')
    );
    
    // Table
    autoTable(pdf, {
      head: [filteredFields.map(field => field.label)],
      body: tableData,
      startY: 60,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 75, 91],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });
    
    // Save
    pdf.save(`${reportData.title.toLowerCase().replace(/\s+/g, '-')}-report.pdf`);
  }

  static async generateWord(reportData: ReportData, config: ReportConfig): Promise<void> {
    const filteredFields = reportData.fields.filter(field => 
      config.selectedFields.includes(field.key)
    );
    
    const tableRows = [
      // Header row
      new TableRow({
        children: filteredFields.map(field => 
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: field.label, bold: true })],
              alignment: AlignmentType.CENTER,
            })],
          })
        ),
      }),
      // Data rows
      ...reportData.data.map(item => 
        new TableRow({
          children: filteredFields.map(field => 
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: String(item[field.key] || '') })],
              })],
            })
          ),
        })
      ),
    ];

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: reportData.title, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Report Period: ${config.startDate} to ${config.endDate}` })],
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString()}` })],
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({ text: "" }), // Empty line
          new Table({
            rows: tableRows,
            width: {
              size: 100,
              type: 'pct',
            },
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title.toLowerCase().replace(/\s+/g, '-')}-report.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}