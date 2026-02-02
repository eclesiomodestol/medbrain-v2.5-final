
import React from 'react';
import { User } from '../types';

interface WatermarkProps {
    user: User;
}

export const Watermark: React.FC<WatermarkProps> = ({ user }) => {
    // Create a grid of watermark text
    const watermarkText = `${user.name} • ${user.email} • ${new Date().toLocaleDateString()}`;
    const repeats = Array(20).fill(watermarkText);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden flex flex-wrap content-center justify-center opacity-[0.08] select-none">
            <div className="w-[150%] h-[150%] -rotate-45 flex flex-wrap gap-20 items-center justify-center transform -translate-x-1/4 -translate-y-1/4">
                {repeats.map((text, i) => (
                    <React.Fragment key={i}>
                        {Array(10).fill(text).map((t, j) => (
                            <span key={`${i}-${j}`} className="text-2xl font-black uppercase tracking-widest text-slate-900 whitespace-nowrap">
                                {t}
                            </span>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
