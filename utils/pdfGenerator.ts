import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScheduleEntry, Subject, Period } from '../types';

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
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0) {
                // Adjust row height if needed, jspdf-autotable handles it mostly
            }
        }
    });

    doc.save('MedBrain_Horario.pdf');
};
