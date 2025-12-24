

import React, { useState } from 'react';
import { FileTextIcon, LogoIcon } from './Icons';
import { api } from '../services/api';
import type { User } from '../types';

const downloadCSV = (content: string, fileName: string) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface ReportsProps {
    currentUser: User;
}

const Reports = ({ currentUser }: ReportsProps) => {
    const [loadingReport, setLoadingReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async (reportType: 'ssnit' | 'paye' | 'attendance' | 'leave') => {
        setLoadingReport(reportType);
        setError(null);
        try {
            const data: any[] = await api.getReport(reportType, currentUser.tenantId);
            
            if (data.length === 0) {
                setError(`No data available for ${reportType} report.`);
                return;
            }

            const headers = Object.keys(data[0]);
            const rows = data.map((row: any) => headers.map(header => row[header]));
            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            downloadCSV(csvContent, `${reportType}_report.csv`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error('Report download error:', errorMessage);
            setError(`Failed to download ${reportType} report: ${errorMessage}`);
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

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    onClick={() => setError(null)}
                                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
