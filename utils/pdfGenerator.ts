
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { User } from '../types';

export const addWatermarkToPdf = async (pdfUrl: string, user: User): Promise<Uint8Array | null> => {
    try {
        const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();

        const watermarkText = `${user.name} • ${user.email} • ${new Date().toLocaleDateString()}`;

        pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
                x: 50,
                y: height / 2,
                size: 24,
                font: helveticaFont,
                color: rgb(0.5, 0.5, 0.5),
                rotate: degrees(45),
                opacity: 0.3,
            });
            // Add a bottom secure footer too
            page.drawText(`Documento rastreado por MedBrain • ${user.email}`, {
                x: 20,
                y: 20,
                size: 8,
                font: helveticaFont,
                color: rgb(0.2, 0.2, 0.2),
                opacity: 0.5
            });
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error watermarking PDF:", error);
        return null;
    }
};

export const generateSummaryPdf = async (title: string, summary: string, user: User): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const margin = 50;
    const maxWidth = width - (margin * 2);
    const lineHeight = 15;

    // Draw Title
    page.drawText(title, { x: margin, y, size: 20, font: boldFont, color: rgb(0.1, 0.3, 0.7) });
    y -= 40;

    // Draw Watermark on first page
    const watermarkText = `${user.name} • ${user.email}`;
    page.drawText(watermarkText, {
        x: 50,
        y: height / 2,
        size: 30,
        font: boldFont,
        color: rgb(0.7, 0.7, 0.7),
        rotate: degrees(45),
        opacity: 0.2,
    });

    // Simple text wrapping logic
    const lines = summary.split('\n');

    // Create a new page function
    let currentPage = page;
    const addNewPage = () => {
        currentPage = pdfDoc.addPage();
        y = height - 50;
        // Watermark on new page
        currentPage.drawText(watermarkText, {
            x: 50,
            y: height / 2,
            size: 30,
            font: boldFont,
            color: rgb(0.7, 0.7, 0.7),
            rotate: degrees(45),
            opacity: 0.2,
        });
    };

    for (const line of lines) {
        if (y < 50) addNewPage();

        const text = line.trim();
        if (!text) {
            y -= 10;
            continue;
        }

        let fontSize = 10;
        let currentFont = font;
        let color = rgb(0, 0, 0);

        // Simple Markdown-ish parsing
        if (text.startsWith('# ')) {
            fontSize = 18;
            currentFont = boldFont;
            y -= 20; // Extra spacing
        } else if (text.startsWith('## ')) {
            fontSize = 14;
            currentFont = boldFont;
            y -= 10;
        } else if (text.startsWith('### ')) {
            fontSize = 12;
            currentFont = boldFont;
        }

        // Remove markdown chars for display
        const cleanText = text.replace(/#/g, '').trim().replace(/\*\*/g, '');

        // Wrap text
        // We estimate char width ~ font_size * 0.5 (rough)
        const allowedChars = Math.floor(maxWidth / (fontSize * 0.5));

        // Split into words
        const words = cleanText.split(' ');
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + word).length > allowedChars) {
                currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font: currentFont, color });
                y -= lineHeight;
                if (y < 50) addNewPage();
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        }
        if (currentLine) {
            currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font: currentFont, color });
            y -= lineHeight;
        }
        y -= 5; // Paragraph spacing
    }

    return await pdfDoc.save();
};
