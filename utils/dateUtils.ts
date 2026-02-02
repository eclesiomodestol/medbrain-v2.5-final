/**
 * Formats a date string (YYYY-MM-DD) to Brazilian locale (DD/MM/YYYY)
 * without timezone offset issues.
 */
export const formatLocalDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';

    // If it's already a full ISO string or other date string, we need to be careful.
    // But for "YYYY-MM-DD", splitting is the safest way to preserve the local day.
    if (dateStr.includes('-') && dateStr.length <= 10) {
        const [year, month, day] = dateStr.split('-').map(Number);
        // month is 0-indexed in Date constructor (0-11)
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
    }

    // Fallback for full ISO strings or already formatted strings
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateStr;
    }
};

/**
 * Ensures a date string is always treated as local 00:00 instead of UTC
 */
export const getSafeLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};
