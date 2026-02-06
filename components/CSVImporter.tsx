import React, { useState } from 'react';
import { Topic, ContentStatus, ExamTag, Subject } from '../types';
import { Upload, X, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react';

interface CSVImporterProps {
    subjects: Subject[];
    onImport: (topics: Topic[]) => void;
    onClose: () => void;
}

interface ParsedRow {
    titulo: string;
    disciplina: string;
    data: string;
    turno?: string;
    tag?: string;
    subespecialidade?: string;
}

interface ValidationResult {
    valid: ParsedRow[];
    invalid: { row: ParsedRow; errors: string[]; lineNumber: number }[];
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ subjects, onImport, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [importing, setImporting] = useState(false);

    const downloadTemplate = () => {
        const template = `titulo,disciplina,data,turno,tag,subespecialidade
Semiologia neurológica Parte 1,cm3,2026-02-22,MANHÃ,PR1,Neurologia
Exames Hematológicos,cm3,2026-02-22,TARDE,PR1,Hematologia
Otite Média Aguda,cc3,2026-02-10,MANHÃ,PR1,Otorrino
Fraturas de Membros Superiores,cc3,2026-02-10,TARDE,PR1,Ortopedia`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_importacao.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const parseCSV = (text: string): ParsedRow[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            rows.push(row as ParsedRow);
        }

        return rows;
    };

    const validateRows = (rows: ParsedRow[]): ValidationResult => {
        const valid: ParsedRow[] = [];
        const invalid: { row: ParsedRow; errors: string[]; lineNumber: number }[] = [];

        const validSubjectIds = subjects.map(s => s.id);
        const validTags = ['PR1', 'PR2', 'SUB', 'FINAL', 'NONE', ''];
        const validTurnos = ['MANHÃ', 'TARDE', 'NOITE', ''];
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        rows.forEach((row, index) => {
            const errors: string[] = [];

            // Validar campos obrigatórios
            if (!row.titulo || row.titulo.trim() === '') {
                errors.push('Título é obrigatório');
            }
            if (!row.disciplina || row.disciplina.trim() === '') {
                errors.push('Disciplina é obrigatória');
            } else if (!validSubjectIds.includes(row.disciplina)) {
                errors.push(`Disciplina "${row.disciplina}" não existe`);
            }
            if (!row.data || row.data.trim() === '') {
                errors.push('Data é obrigatória');
            } else if (!dateRegex.test(row.data)) {
                errors.push('Data deve estar no formato YYYY-MM-DD');
            }

            // Validar campos opcionais
            if (row.tag && !validTags.includes(row.tag.toUpperCase())) {
                errors.push(`TAG "${row.tag}" inválida. Use: PR1, PR2, SUB, FINAL ou NONE`);
            }
            if (row.turno && !validTurnos.includes(row.turno.toUpperCase())) {
                errors.push(`Turno "${row.turno}" inválido. Use: MANHÃ, TARDE ou NOITE`);
            }

            if (errors.length > 0) {
                invalid.push({ row, errors, lineNumber: index + 2 }); // +2 porque linha 1 é header
            } else {
                valid.push(row);
            }
        });

        return { valid, invalid };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = parseCSV(text);
            const result = validateRows(rows);
            setValidationResult(result);
        };

        reader.readAsText(selectedFile, 'UTF-8');
    };

    const handleImport = () => {
        if (!validationResult || validationResult.valid.length === 0) return;

        setImporting(true);

        const topics: Topic[] = validationResult.valid.map(row => ({
            id: Math.random().toString(36).substr(2, 9),
            title: row.titulo,
            subjectId: row.disciplina,
            date: row.data,
            shift: row.turno?.toUpperCase() as any,
            tag: (row.tag?.toUpperCase() as ExamTag) || ExamTag.NONE,
            front: row.subespecialidade || undefined,
            status: ContentStatus.PENDENTE,
            hasMedia: false
        }));

        onImport(topics);
        setImporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Upload size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Importar Conteúdos em Lote</h2>
                            <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Upload de arquivo CSV</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* File Input */}
                    {!file && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label htmlFor="csv-upload" className="cursor-pointer">
                                    <FileText size={64} className="mx-auto text-slate-400 mb-4" />
                                    <p className="text-lg font-bold text-slate-700 mb-2">Clique para selecionar arquivo CSV</p>
                                    <p className="text-sm text-slate-500">Ou arraste e solte aqui</p>
                                </label>
                            </div>

                            {/* Download Template Button */}
                            <div className="flex items-center justify-center">
                                <button
                                    onClick={downloadTemplate}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border border-slate-300"
                                >
                                    <Download size={18} />
                                    Baixar Template CSV
                                </button>
                            </div>

                            {/* Help Text */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-blue-900 mb-2">📋 Formato do CSV:</p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                    <li>• <strong>Obrigatórios:</strong> titulo, disciplina, data</li>
                                    <li>• <strong>Opcionais:</strong> turno, tag, subespecialidade</li>
                                    <li>• <strong>Data:</strong> formato YYYY-MM-DD (ex: 2026-02-22)</li>
                                    <li>• <strong>Disciplina:</strong> use o ID (cm3, cc3, hmp7, etc.)</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Validation Results */}
                    {validationResult && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <CheckCircle size={24} className="text-emerald-600" />
                                        <span className="text-sm font-black text-emerald-900 uppercase tracking-widest">Válidos</span>
                                    </div>
                                    <p className="text-4xl font-black text-emerald-600">{validationResult.valid.length}</p>
                                </div>
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertCircle size={24} className="text-rose-600" />
                                        <span className="text-sm font-black text-rose-900 uppercase tracking-widest">Inválidos</span>
                                    </div>
                                    <p className="text-4xl font-black text-rose-600">{validationResult.invalid.length}</p>
                                </div>
                            </div>

                            {/* Invalid Rows */}
                            {validationResult.invalid.length > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-4">Erros Encontrados</h3>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {validationResult.invalid.map((item, idx) => (
                                            <div key={idx} className="bg-white rounded-xl p-4 border border-rose-200">
                                                <p className="text-xs font-black text-rose-700 mb-2">Linha {item.lineNumber}</p>
                                                <p className="text-sm font-bold text-slate-700 mb-2">{item.row.titulo || '(sem título)'}</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {item.errors.map((error, i) => (
                                                        <li key={i} className="text-xs text-rose-600">{error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Valid Rows Preview */}
                            {validationResult.valid.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                                        Preview ({validationResult.valid.length} conteúdos)
                                    </h3>
                                    <div className="overflow-x-auto max-h-80">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-300">
                                                    <th className="text-left p-2 font-black text-slate-700">Título</th>
                                                    <th className="text-left p-2 font-black text-slate-700">Disciplina</th>
                                                    <th className="text-left p-2 font-black text-slate-700">Data</th>
                                                    <th className="text-left p-2 font-black text-slate-700">TAG</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {validationResult.valid.slice(0, 10).map((row, idx) => (
                                                    <tr key={idx} className="border-b border-slate-200">
                                                        <td className="p-2 font-medium text-slate-900">{row.titulo}</td>
                                                        <td className="p-2 text-slate-600">{row.disciplina}</td>
                                                        <td className="p-2 text-slate-600">{row.data}</td>
                                                        <td className="p-2 text-slate-600">{row.tag || 'NONE'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {validationResult.valid.length > 10 && (
                                            <p className="text-xs text-slate-500 mt-2 text-center">
                                                ... e mais {validationResult.valid.length - 10} conteúdos
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-6 flex items-center justify-between border-t">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!validationResult || validationResult.valid.length === 0 || importing}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {importing ? 'Importando...' : `Importar ${validationResult?.valid.length || 0} Conteúdos`}
                    </button>
                </div>
            </div>
        </div>
    );
};
