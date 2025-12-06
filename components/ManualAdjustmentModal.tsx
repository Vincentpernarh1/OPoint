
import React, { useState, useMemo, useEffect } from 'react';
import { TimeEntryType, TimeEntry } from '../types';
import { XIcon, ClockIcon, TrashIcon, CheckIcon } from './Icons';

interface AdjustmentDraft {
    id: string;
    time: string;
    reason: string;
    document: File | null;
}

interface ManualAdjustmentModalProps {
    onClose: () => void;
    onSubmit: (adjustments: Array<{ date: string, time: string, type: TimeEntryType, reason: string, document?: File | null }>) => void;
    date?: string;
    existingEntries?: TimeEntry[];
}

const ManualAdjustmentModal = ({ onClose, onSubmit, date: prefilledDate, existingEntries = [] }: ManualAdjustmentModalProps) => {
    // Ensure we work with the date string provided, defaulting to today's local YYYY-MM-DD if missing
    const dateStr = prefilledDate || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();
    
    // Helper to create a base date object in Local Time (00:00:00) from YYYY-MM-DD string
    // parsing "YYYY-MM-DD" directly usually results in UTC, so we parse manually
    const getBaseDate = () => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // State to hold multiple new adjustments being added
    const [newAdjustments, setNewAdjustments] = useState<AdjustmentDraft[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [useSameReason, setUseSameReason] = useState(false);
    const [error, setError] = useState('');

    // Combine existing entries with new drafts to determine chronological order and types
    const combinedTimeline = useMemo(() => {
        // 1. Map existing entries
        const mappedExisting = existingEntries.map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            isNew: false,
            originalType: e.type,
            draft: null as AdjustmentDraft | null
        }));

        // 2. Map new adjustments
        const mappedNew = newAdjustments.map((draft, index) => {
            let timestamp = getBaseDate(); 
            if (draft.time) {
                const [hours, minutes] = draft.time.split(':').map(Number);
                timestamp.setHours(hours, minutes, 0, 0);
            } else {
                // If no time set yet, place it at the end of the day.
                // Critical: Add 'index' to milliseconds to ensure stable sort order for multiple new empty drafts.
                // This ensures they appear as [IN, OUT, IN] in the order they were added.
                timestamp.setHours(23, 59, 59, 100 + index); 
            }

            return {
                id: draft.id,
                timestamp: timestamp,
                isNew: true,
                originalType: null,
                draft: draft
            };
        });

        // 3. Combine and Sort
        const all = [...mappedExisting, ...mappedNew];
        
        all.sort((a, b) => {
            const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
            // Stable sort is generally guaranteed in modern JS, but the millisecond offset ensures correctness.
            return timeDiff;
        });

        // 4. Infer types (Alternating: In -> Out -> In -> Out)
        return all.map((entry, index) => ({
            ...entry,
            inferredType: index % 2 === 0 ? TimeEntryType.CLOCK_IN : TimeEntryType.CLOCK_OUT
        }));

    }, [existingEntries, newAdjustments, dateStr]);

    const handleAddBubble = () => {
        const newId = `draft-${Date.now()}`;
        // If useSameReason is active, inherit the reason from the currently active draft (if any) or the first one
        let initialReason = '';
        if (useSameReason && newAdjustments.length > 0) {
             const sourceDraft = activeId ? newAdjustments.find(d => d.id === activeId) : newAdjustments[0];
             if (sourceDraft) initialReason = sourceDraft.reason;
        }

        setNewAdjustments(prev => [...prev, { id: newId, time: '', reason: initialReason, document: null }]);
        setActiveId(newId); // Automatically select the new bubble
    };

    const updateActiveDraft = (field: keyof AdjustmentDraft, value: any) => {
        if (!activeId) return;
        
        setNewAdjustments(prev => prev.map(draft => {
            // If updating reason and "Apply to all" is checked, update all drafts
            if (field === 'reason' && useSameReason) {
                return { ...draft, reason: value };
            }
            // Otherwise just update the active one
            return draft.id === activeId ? { ...draft, [field]: value } : draft;
        }));
    };

    const handleToggleSameReason = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setUseSameReason(checked);
        
        // If checking the box, sync all reasons to the current active draft's reason immediately
        if (checked && activeId) {
            const currentDraft = newAdjustments.find(d => d.id === activeId);
            if (currentDraft) {
                setNewAdjustments(prev => prev.map(d => ({ ...d, reason: currentDraft.reason })));
            }
        }
    };

    const removeActiveDraft = () => {
        if (!activeId) return;
        setNewAdjustments(prev => prev.filter(d => d.id !== activeId));
        setActiveId(null);
        if (newAdjustments.length <= 1) setUseSameReason(false); 
    };

    const activeDraft = newAdjustments.find(d => d.id === activeId);
    
    // Find the inferred type for the currently active draft for display
    const activeTimelineEntry = combinedTimeline.find(e => e.id === activeId);
    const activeInferredType = activeTimelineEntry?.inferredType || TimeEntryType.CLOCK_IN;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (newAdjustments.length === 0) {
            setError('Please add at least one time entry.');
            return;
        }
        
        for (const draft of newAdjustments) {
            if (!draft.time || !draft.reason.trim()) {
                setError('All new entries must have a time and a justification.');
                setActiveId(draft.id); // Highlight the invalid one
                return;
            }
        }
        
        setError('');

        // Prepare payload
        const payload = newAdjustments.map(draft => {
            const timelineEntry = combinedTimeline.find(e => e.id === draft.id);
            return {
                date: dateStr,
                time: draft.time,
                type: timelineEntry?.inferredType || TimeEntryType.CLOCK_IN,
                reason: draft.reason,
                document: draft.document
            };
        });
        
        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative animate-fade-in-down max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <XIcon className="h-6 w-6"/>
                </button>
                
                <div className="text-center mb-6">
                     <h3 className="text-xl font-bold text-gray-800">Correct Time Record</h3>
                     <p className="text-gray-500 text-sm mt-1">
                         {getBaseDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                     </p>
                </div>

                {/* VISUAL TIMELINE */}
                <div className="mb-8 overflow-x-auto pb-4">
                    <div className="flex flex-row justify-center items-start gap-6 min-w-max px-4">
                        {combinedTimeline.map((entry) => {
                            const isClockIn = entry.inferredType === TimeEntryType.CLOCK_IN;
                            const isActive = entry.id === activeId;
                            
                            // Styling logic
                            let circleClass = "w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-200 shadow-sm relative cursor-pointer ";
                            let timeText = "";
                            
                            if (entry.isNew) {
                                circleClass += isActive 
                                    ? "bg-white border-primary ring-4 ring-indigo-100 scale-110 z-10 " 
                                    : "bg-white border-primary border-dashed hover:bg-indigo-50 ";
                                
                                timeText = entry.draft?.time || "--:--";
                            } else {
                                circleClass += isClockIn 
                                    ? "bg-green-50 border-green-500 " 
                                    : "bg-gray-50 border-gray-400 ";
                                timeText = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                            }

                            return (
                                <div key={entry.id} className="flex flex-col items-center group relative" onClick={() => entry.isNew && setActiveId(entry.id)}>
                                    {/* Connector Line (Right side) */}
                                    <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
                                    
                                    <div className={circleClass}>
                                        <span className={`text-sm font-bold ${entry.isNew ? 'text-primary' : (isClockIn ? 'text-green-800' : 'text-gray-700')}`}>
                                            {timeText}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold mt-1 ${entry.isNew ? 'text-primary' : (isClockIn ? 'text-green-600' : 'text-gray-500')}`}>
                                            {isClockIn ? 'IN' : 'OUT'}
                                        </span>
                                        {entry.isNew && isActive && (
                                            <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-0.5">
                                                <div className="w-2 h-2 bg-white rounded-full m-1"></div>
                                            </div>
                                        )}
                                    </div>
                                    {entry.isNew && <span className="text-[10px] text-primary font-medium mt-2 bg-indigo-50 px-2 py-0.5 rounded-full">New</span>}
                                </div>
                            );
                        })}

                        {/* ADD BUTTON BUBBLE */}
                        <div className="flex flex-col items-center group cursor-pointer" onClick={handleAddBubble}>
                             <div className="absolute top-8 left-0 w-1/2 h-0.5 bg-gray-200 -z-10"></div>
                             <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-300 border-dashed bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                                <span className="text-3xl text-gray-400 font-light">+</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium mt-2 uppercase">Add</span>
                        </div>
                    </div>
                    {newAdjustments.length === 0 && (
                        <p className="text-center text-xs text-gray-400 mt-6 italic">Click the "+" circle to insert a missing punch.</p>
                    )}
                </div>

                {/* FORM AREA */}
                {activeId && activeDraft ? (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fade-in">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                             <h4 className="font-bold text-gray-700 flex items-center">
                                 <ClockIcon className="h-5 w-5 mr-2 text-primary" />
                                 Editing Punch
                                 <span className="ml-2 text-xs bg-indigo-100 text-primary px-2 py-0.5 rounded uppercase">{activeInferredType}</span>
                             </h4>
                             <button onClick={removeActiveDraft} className="text-xs text-red-500 hover:text-red-700 flex items-center font-medium">
                                 <TrashIcon className="h-4 w-4 mr-1" /> Remove
                             </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="adj-time" className="block text-sm font-bold text-gray-700 mb-1">
                                    Time
                                </label>
                                <input 
                                    type="time" 
                                    id="adj-time" 
                                    value={activeDraft.time} 
                                    onChange={e => updateActiveDraft('time', e.target.value)} 
                                    className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-mono text-center"
                                />
                            </div>
                             <div>
                                <label htmlFor="adj-doc" className="block text-sm font-bold text-gray-700 mb-1">Support Document <span className="font-normal text-gray-400 text-xs">(Optional)</span></label>
                                <div className="mt-1 flex items-center">
                                    <label htmlFor="adj-doc" className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                                        Choose File
                                    </label>
                                    <span className="ml-3 text-xs text-gray-500 truncate max-w-[150px]">
                                        {activeDraft.document ? activeDraft.document.name : 'No file chosen'}
                                    </span>
                                    <input 
                                        type="file" 
                                        id="adj-doc" 
                                        accept="image/*,.pdf"
                                        onChange={e => updateActiveDraft('document', e.target.files ? e.target.files[0] : null)}
                                        className="sr-only"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="adj-reason" className="block text-sm font-bold text-gray-700">Justification</label>
                                    {newAdjustments.length > 1 && (
                                        <label className="flex items-center space-x-2 text-xs text-primary cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={useSameReason} 
                                                onChange={handleToggleSameReason}
                                                className="rounded text-primary focus:ring-primary h-4 w-4 border-gray-300"
                                            />
                                            <span>Apply to all entries</span>
                                        </label>
                                    )}
                                </div>
                                <textarea 
                                    id="adj-reason" 
                                    value={activeDraft.reason} 
                                    onChange={e => updateActiveDraft('reason', e.target.value)} 
                                    rows={2} 
                                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm" 
                                    placeholder="e.g., Forgot to clock out for lunch"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                        {newAdjustments.length > 0 
                            ? "Select a new punch circle above to edit details." 
                            : "Click the empty dashed circle (+) to add a time entry."}
                    </div>
                )}

                {error && <p className="text-sm text-red-500 text-center font-medium mt-4">{error}</p>}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                    <button type="button" onClick={onClose} className="py-2.5 px-5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                    <button 
                        onClick={handleSubmit} 
                        className="py-2.5 px-5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-md transition-colors flex items-center"
                    >
                        <CheckIcon className="h-5 w-5 mr-2" />
                        Submit Request{newAdjustments.length > 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualAdjustmentModal;
