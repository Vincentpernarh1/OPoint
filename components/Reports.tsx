

import React, { useState, useEffect } from 'react';
import { FileTextIcon, LogoIcon } from './Icons';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import type { User } from '../types';
import { UserRole } from '../types';

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
    const [employees, setEmployees] = useState<User[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    
    // Month and Year filters
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    
    // Check if user has full report access (Admin or Payments)
    const hasFullAccess = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PAYMENTS;

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoadingEmployees(true);
                const data = await api.getUsers(currentUser.tenantId!);
                setEmployees(data);
                // Cache employees for offline use
                await offlineStorage.cacheUsers(data, currentUser.tenantId!);
            } catch (err) {
                console.error('Failed to fetch employees:', err);
                // OFFLINE FALLBACK: Try to load cached users
                try {
                    const cachedUsers = await offlineStorage.getCachedUsers(currentUser.tenantId!);
                    if (cachedUsers.length > 0) {
                        setEmployees(cachedUsers);
                        setError('📴 Offline - Showing cached employee list');
                    } else {
                        setError('📴 Offline - No cached employee data. Please connect to internet and load employees first.');
                    }
                } catch (cacheErr) {
                    console.error('Failed to load cached users:', cacheErr);
                    setError('Failed to load employees. Please check your connection.');
                }
            } finally {
                setLoadingEmployees(false);
            }
        };

        if (currentUser.tenantId) {
            fetchEmployees();
        }
    }, [currentUser.tenantId]);

    const handleDownload = async (reportType: 'ssnit' | 'paye' | 'attendance' | 'leave') => {
        setLoadingReport(reportType);
        setError(null);
        try {
            // Pass month and year to the API
            const data: any[] = await api.getReport(
                reportType, 
                currentUser.tenantId!, 
                selectedEmployee?.id,
                selectedMonth,
                selectedYear
            );
            
            if (data.length === 0) {
                const scope = selectedEmployee ? `for ${selectedEmployee.name}` : 'for all employees';
                setError(`No data available for ${reportType} report ${scope}.`);
                return;
            }

            const headers = Object.keys(data[0]);
            const rows = data.map((row: any) => headers.map(header => row[header]));
            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            
            const employeeSuffix = selectedEmployee ? `_${selectedEmployee.name.replace(/\s+/g, '_')}` : '_all';
            const fileName = `${reportType}_report${employeeSuffix}.csv`;
            
            downloadCSV(csvContent, fileName);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error('Report download error:', errorMessage);
            setError(`Failed to download ${reportType} report: ${errorMessage}`);
        } finally {
            setLoadingReport(null);
        }
    };


    const reportCards = [
        { 
            key: 'ssnit',
            emoji: '💰',
            gradient: 'from-green-500 to-emerald-600',
            bgGradient: 'from-green-50 to-emerald-50/50',
            title: 'SSNIT Contribution Report', 
            description: selectedEmployee 
                ? `Monthly SSNIT report for ${selectedEmployee.name}` 
                : hasFullAccess 
                    ? 'Monthly report for filing with SSNIT for all employees' 
                    : 'Your monthly SSNIT contribution report'
        },
        { 
            key: 'paye',
            emoji: '🏛️',
            gradient: 'from-blue-500 to-indigo-600',
            bgGradient: 'from-blue-50 to-indigo-50/50',
            title: 'PAYE Tax Report', 
            description: selectedEmployee 
                ? `Monthly PAYE report for ${selectedEmployee.name}` 
                : hasFullAccess 
                    ? 'Monthly report for filing with the GRA for all employees' 
                    : 'Your monthly PAYE tax report'
        },
        { 
            key: 'attendance',
            emoji: '⏰',
            gradient: 'from-purple-500 to-pink-600',
            bgGradient: 'from-purple-50 to-pink-50/50',
            title: 'Attendance Summary', 
            description: selectedEmployee 
                ? `Work hours summary for ${selectedEmployee.name}` 
                : hasFullAccess 
                    ? 'Overview of employee work hours for the month for all employees' 
                    : 'Your work hours summary for the month'
        },
        { 
            key: 'leave',
            emoji: '🏖️',
            gradient: 'from-orange-500 to-amber-600',
            bgGradient: 'from-orange-50 to-amber-50/50',
            title: 'Leave Balance Report', 
            description: selectedEmployee 
                ? `Leave balances for ${selectedEmployee.name}` 
                : hasFullAccess 
                    ? 'Current leave balances for all employees' 
                    : 'Your current leave balances'
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl shadow-xl overflow-hidden mb-8">
                <div className="px-6 py-8 sm:px-8">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                            <div className="text-3xl">📊</div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Reports</h1>
                            <p className="text-white/90 text-sm mt-1">
                                {hasFullAccess 
                                    ? 'Generate and download company reports for compliance and management'
                                    : 'Generate and download your personal reports'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Month/Year Filter - Available to all users */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                        <span className="text-xl">📅</span>
                        <span>Report Period</span>
                    </h2>
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <label className="text-sm font-semibold text-gray-700">
                            Select Period:
                        </label>
                        <select
                            title="Select Month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                        >
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                    </select>
                        <select
                            title="Select Year"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                        >
                            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Report Scope - Only visible to Admin and Payments roles */}
            {hasFullAccess && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                            <span className="text-xl">👥</span>
                            <span>Report Scope</span>
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <label htmlFor="employee-select" className="text-sm font-semibold text-gray-700">
                                Generate reports for:
                            </label>
                            <select
                                id="employee-select"
                                value={selectedEmployee?.id || ''}
                                onChange={(e) => {
                                    const employeeId = e.target.value;
                                    const employee = employees.find(emp => emp.id === employeeId) || null;
                                    setSelectedEmployee(employee);
                                }}
                                className="w-full sm:flex-1 sm:max-w-md px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:shadow-md transition-all"
                                disabled={loadingEmployees}
                            >
                            <option value="">All Employees</option>
                            {employees.map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name}
                                </option>
                            ))}
                        </select>
                            {selectedEmployee && (
                                <button
                                    onClick={() => setSelectedEmployee(null)}
                                    className="px-4 py-2 text-sm font-medium text-primary hover:text-purple-600 hover:bg-primary/5 rounded-lg transition-all"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                        {loadingEmployees && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500 mt-4">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Loading employees...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500 rounded-xl p-4 shadow-md">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="ml-3 inline-flex p-1.5 rounded-lg text-red-500 hover:bg-red-200/50 transition-colors"
                        >
                            <span className="sr-only">Dismiss</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportCards.map((card) => (
                    <div key={card.key} className={`group bg-gradient-to-br ${card.bgGradient} border border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden`}>
                        <div className="p-6 flex flex-col justify-between h-full">
                            <div>
                                <div className="bg-white rounded-2xl p-4 w-16 h-16 flex items-center justify-center mb-4 shadow-md">
                                    <span className="text-3xl">{card.emoji}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{card.description}</p>
                            </div>
                            <div className="mt-6">
                                <button 
                                    onClick={() => handleDownload(card.key as 'ssnit' | 'paye' | 'attendance' | 'leave')} 
                                    disabled={!!loadingReport}
                                    className={`w-full bg-gradient-to-r ${card.gradient} hover:shadow-lg hover:scale-105 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2`}
                                >
                                    {loadingReport === card.key ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                            <span>Downloading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📥</span>
                                            <span>Download CSV</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
