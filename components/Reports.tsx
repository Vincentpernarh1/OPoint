

import React, { useState } from 'react';
import { FileTextIcon, LogoIcon } from './Icons';
import { api } from '../services/api';

const downloadCSV = (content: string, fileName: string) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const Reports = () => {
    const [loadingReport, setLoadingReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async (reportType: 'ssnit' | 'paye' | 'attendance' | 'leave') => {
        setLoadingReport(reportType);
        setError(null);
        try {
            // CHANGED: Use local API service instead of fetch
            const data: any[] = await api.getReport(reportType);
            
            if (data.length === 0) {
                alert('No data available for this report.');
                return;
            }

            const headers = Object.keys(data[0]);
            const rows = data.map((row: any) => headers.map(header => row[header]));
            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            downloadCSV(csvContent, `${reportType}_report.csv`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            alert(error);
        } finally {
            setLoadingReport(null);
        }
    };


    const reportCards = [
        { key: 'ssnit', title: 'SSNIT Contribution Report', description: 'Monthly report for filing with SSNIT.' },
        { key: 'paye', title: 'PAYE Tax Report', description: 'Monthly report for filing with the GRA.' },
        { key: 'attendance', title: 'Attendance Summary', description: 'Overview of employee work hours for the month.' },
        { key: 'leave', title: 'Leave Balance Report', description: 'Current leave balances for all employees.' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
                <p className="text-gray-500 mt-1">Generate and download company reports for compliance and management.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportCards.map((card) => (
                    <div key={card.key} className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-between">
                        <div>
                            <div className="bg-primary-light text-primary p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                <FileTextIcon className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{card.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                        </div>
                        <div className="mt-6">
                            <button 
                                onClick={() => handleDownload(card.key as 'ssnit' | 'paye' | 'attendance' | 'leave')} 
                                disabled={!!loadingReport}
                                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-300 flex items-center justify-center"
                            >
                                {loadingReport === card.key ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    'Download CSV'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
