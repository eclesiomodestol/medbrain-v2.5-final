import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ScheduleEntry, Subject, Period, User } from '../types';

export const generateSchedulePDF = (schedule: ScheduleEntry[], subjects: Subject[]) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('MedBrain EM - Horário Acadêmico', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-400
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

    const daysLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const periods: Period[] = ['Manhã', 'Tarde', 'Noite'];

    const tableRows: any[] = [];

    periods.forEach(period => {
        const row = [period as string];
        daysLabels.forEach(day => {
            const entries = schedule.filter(s => s.day === day && s.period === period);
            const content = entries.map(entry => {
                const subject = subjects.find(sub => sub.id === entry.subjectId);
                const front = entry.front ? ` (${entry.front})` : '';
                return `${subject?.name || '---'}${front}`;
            }).join('\n\n');
            row.push(content || '');
        });
        tableRows.push(row);
    });

    autoTable(doc, {
        startY: 35,
        head: [['Período', ...daysLabels]],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 6,
            lineColor: [226, 232, 240], // slate-200
            valign: 'middle'
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'center' }
        }
    });

    doc.save('MedBrain_Horario.pdf');
};

export const generateSummaryPdf = async (title: string, summary: string, user: User) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Background Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 15, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`ANÁLISE ESTRUTURADA MEDBRAIN • USUÁRIO: ${user.name.toUpperCase()}`, 15, 30);

    // Body Text
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(summary, pageWidth - 30);
    doc.text(lines, 15, 50);

    // Footer Watermark on first page
    doc.setTextColor(226, 232, 240);
    doc.setFontSize(60);
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.text(user.name, pageWidth / 2, 150, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();

    return new Uint8Array(doc.output('arraybuffer'));
};

export const addWatermarkToPdf = async (pdfUrl: string, user: User) => {
    const response = await fetch(pdfUrl);
    const existingPdfBytes = await response.arrayBuffer();

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(user.name, {
            x: width / 4,
            y: height / 2,
            size: 50,
            font: font,
            color: rgb(0.7, 0.7, 0.7),
            opacity: 0.2,
            rotate: { type: 'degrees', angle: 45 },
        });
    }

    return await pdfDoc.save();
};
