import * as PDFLib from 'pdf-lib';
import { User } from '../types';

export const addWatermarkToPdf = async (pdfUrl: string, user: User): Promise<string> => {
    try {
        console.log("Starting watermark process for:", pdfUrl);
        const { PDFDocument, rgb, degrees } = PDFLib;

        // 1. Fetch the existing PDF
        const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        console.log("PDF fetched, size:", existingPdfBytes.byteLength);

        // 2. Load a PDFDocument from the existing PDF bytes
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // 3. Get all pages of the document
        const pages = pdfDoc.getPages();
        console.log("PDF loaded, pages:", pages.length);

        // 4. Define watermark text
        const watermarkText = `${user.name} • ${user.email} • ${new Date().toLocaleDateString()}`;

        // 5. Draw the watermark on each page
        pages.forEach((page, index) => {
            const { width, height } = page.getSize();

            // Draw diagonal text repeatedly or just once big in the center? 
            // Let's do a centered big text and maybe some smaller ones.
            // For robustness similar to the CSS one, let's do a few lines.

            page.drawText(watermarkText, {
                x: 50,
                y: height / 2,
                size: 30,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.2,
                rotate: degrees(45),
            });

            // Add a header/footer secure mark
            page.drawText(`Documento licenciado para: ${user.name} (${user.email})`, {
                x: 20,
                y: 20,
                size: 10,
                color: rgb(0, 0, 0),
                opacity: 0.5,
            });

            // Add a top header secure mark
            page.drawText(`MedBrain EM - Cópia Controlada`, {
                x: 20,
                y: height - 20,
                size: 10,
                color: rgb(0, 0, 0),
                opacity: 0.5,
            });

            // Add a central huge watermark
            page.drawText(user.email, {
                x: width / 2 - 200,
                y: height / 2,
                size: 40,
                color: rgb(0.7, 0.7, 0.7),
                opacity: 0.15,
                rotate: degrees(45),
            });
        });

        // 6. Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();
        console.log("PDF saved, new size:", pdfBytes.byteLength);

        // 7. Create a Blob and return the URL
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        console.log("Blob URL created:", url);
        return url;

    } catch (error) {
        console.error("Error adding watermark to PDF:", error);
        // Fallback? Return original URL if failed happens? 
        // Secure approach: Fail. But for usability let's throw so UI can handle or show original with warning.
        throw error;
    }
};
