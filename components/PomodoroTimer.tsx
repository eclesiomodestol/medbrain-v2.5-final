import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Settings, X, Minimize2, Maximize2, SkipForward, Loader2 } from 'lucide-react';
import { usePomodoroTimer } from '../contexts/PomodoroContext';

interface Subject {
    id: string;
    name: string;
}

interface PomodoroTimerProps {
    subjects: Subject[];
    subspecialties?: Record<string, string[]>;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ subjects, subspecialties }) => {
    const {
        isRunning,
        isPaused,
        currentPhase,
        timeRemaining,
        selectedSubject,
        selectedFront,
        pomodorosCompleted,
        start,
        pause,
        resume,
        stop,
        reset,
        skipPhase,
        settings,
        isSaving
    } = usePomodoroTimer();

    const [isMinimized, setIsMinimized] = useState(true);
    const [isVisible, setIsVisible] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [tempSubject, setTempSubject] = useState<string>('');
    const [tempFront, setTempFront] = useState<string>('');

    const timerRef = useRef<HTMLDivElement>(null);

    // Update tempFront when tempSubject changes
    useEffect(() => {
        setTempFront('');
    }, [tempSubject]);


    // Debug: log subjects
    useEffect(() => {
        console.log('PomodoroTimer subjects:', subjects);
    }, [subjects]);

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, select')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get phase info
    const getPhaseInfo = () => {
        switch (currentPhase) {
            case 'work':
                return { emoji: '📚', label: 'Estudando', color: 'blue' };
            case 'short_break':
                return { emoji: '☕', label: 'Pausa Curta', color: 'emerald' };
            case 'long_break':
                return { emoji: '🌟', label: 'Pausa Longa', color: 'purple' };
            default:
                return { emoji: '🍅', label: 'Pomodoro', color: 'slate' };
        }
    };

    const phaseInfo = getPhaseInfo();

    // Don't render if not visible
    if (!isVisible) return null;

    // Handle start
    const handleStart = () => {
        if (tempSubject) {
            start(tempSubject, tempFront || undefined);
        }
    };

    // Progress percentage
    const totalTime = currentPhase === 'work'
        ? settings.workDuration * 60
        : currentPhase === 'short_break'
            ? settings.shortBreak * 60
            : settings.longBreak * 60;
    const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

    const availableFronts = (subspecialties && tempSubject) ? subspecialties[tempSubject] : undefined;

    if (isMinimized) {
        return (
            <div
                ref={timerRef}
                className="fixed z-50 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl cursor-move"
                style={{ left: position.x, top: position.y }}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 px-4 py-3">
                    <span className="text-xl">{phaseInfo.emoji}</span>
                    <span className="font-black text-sm">{formatTime(timeRemaining)}</span>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={timerRef}
            className={`fixed z-50 bg-white rounded-3xl shadow-2xl border-2 ${isDragging ? 'cursor-grabbing' : 'cursor-move'
                }`}
            style={{ left: position.x, top: position.y, width: '300px' }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className={`bg-gradient-to-r from-${phaseInfo.color}-500 to-${phaseInfo.color}-600 text-white rounded-t-3xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{phaseInfo.emoji}</span>
                        <span className="font-black text-sm uppercase tracking-wider">{phaseInfo.label}</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <Minimize2 size={16} />
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            title="Fechar timer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Status Message Overlay */}
                {isSaving && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-200">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                        <span className="font-bold text-slate-800">Salvando progresso...</span>
                    </div>
                )}

                {/* Subject selector (only when idle) */}
                {currentPhase === 'idle' && !isRunning && !isSaving && (
                    <div className="space-y-2">
                        <select
                            value={tempSubject}
                            onChange={(e) => setTempSubject(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white/20 text-white font-medium text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                        >
                            <option value="" className="text-slate-900">Selecione uma disciplina</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id} className="text-slate-900">
                                    {subject.name}
                                </option>
                            ))}
                        </select>

                        {availableFronts && availableFronts.length > 0 && (
                            <select
                                value={tempFront}
                                onChange={(e) => setTempFront(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white/20 text-white font-medium text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="" className="text-slate-900">Selecione uma frente</option>
                                {availableFronts.map(front => (
                                    <option key={front} value={front} className="text-slate-900">
                                        {front}
                                    </option>
                                ))}
                            </select>
                        )}
                        {!tempSubject && (
                            <div className="text-center mt-2 text-white/80 text-xs font-medium">
                                Selecione uma matéria para iniciar
                            </div>
                        )}
                    </div>
                )}

                {/* Current subject (when running) */}
                {selectedSubject && isRunning && (
                    <div className="text-xs font-medium opacity-90">
                        {subjects.find(s => s.id === selectedSubject)?.name || selectedSubject}
                        {selectedFront && ` - ${selectedFront}`}
                    </div>
                )}
            </div>

            {/* Timer Display */}
            <div className="p-6">
                <div className="text-center mb-4">
                    <div className="text-6xl font-black text-slate-900 mb-2">
                        {formatTime(timeRemaining)}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r from-${phaseInfo.color}-500 to-${phaseInfo.color}-600 transition-all duration-1000`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Pomodoros completed */}
                <div className="flex items-center justify-center gap-1 mb-4">
                    {Array.from({ length: settings.pomodorosUntilLongBreak }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < pomodorosCompleted
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-200 text-slate-400'
                                }`}
                        >
                            🍅
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                    {!isRunning && currentPhase === 'idle' ? (
                        <button
                            onClick={handleStart}
                            disabled={!tempSubject || (availableFronts && availableFronts.length > 0 && !tempFront)}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                        >
                            <Play size={20} className="inline mr-2" />
                            Iniciar
                        </button>
                    ) : (
                        <>
                            {isPaused ? (
                                <button
                                    onClick={resume}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg transition-all"
                                >
                                    <Play size={18} className="inline mr-1" />
                                    Retomar
                                </button>
                            ) : (
                                <button
                                    onClick={pause}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg transition-all"
                                >
                                    <Pause size={18} className="inline mr-1" />
                                    Pausar
                                </button>
                            )}

                            <button
                                onClick={skipPhase}
                                className="p-3 rounded-xl font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all"
                                title="Pular fase"
                            >
                                <SkipForward size={18} />
                            </button>

                            <button
                                onClick={stop}
                                className="p-3 rounded-xl font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg transition-all"
                                title="Parar"
                            >
                                <Square size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
