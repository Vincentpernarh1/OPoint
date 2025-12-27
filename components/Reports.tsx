

import React, { useState, useEffect } from 'react';
import { FileTextIcon, LogoIcon } from './Icons';
import { api } from '../services/api';
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
            } catch (err) {
                console.error('Failed to fetch employees:', err);
                setError('Failed to load employees for selection.');
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
            title: 'SSNIT Contribution Report', 
            description: selectedEmployee 
                ? `Monthly SSNIT report for ${selectedEmployee.name}.` 
                : hasFullAccess 
                    ? 'Monthly report for filing with SSNIT for all employees.' 
                    : 'Your monthly SSNIT contribution report.'
        },
        { 
            key: 'paye', 
            title: 'PAYE Tax Report', 
            description: selectedEmployee 
                ? `Monthly PAYE report for ${selectedEmployee.name}.` 
                : hasFullAccess 
                    ? 'Monthly report for filing with the GRA for all employees.' 
                    : 'Your monthly PAYE tax report.'
        },
        { 
            key: 'attendance', 
            title: 'Attendance Summary', 
            description: selectedEmployee 
                ? `Work hours summary for ${selectedEmployee.name}.` 
                : hasFullAccess 
                    ? 'Overview of employee work hours for the month for all employees.' 
                    : 'Your work hours summary for the month.'
        },
        { 
            key: 'leave', 
            title: 'Leave Balance Report', 
            description: selectedEmployee 
                ? `Leave balances for ${selectedEmployee.name}.` 
                : hasFullAccess 
                    ? 'Current leave balances for all employees.' 
                    : 'Your current leave balances.'
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reports</h1>
                <p className="text-gray-500 mt-1">
                    {hasFullAccess 
                        ? 'Generate and download company reports for compliance and management.'
                        : 'Generate and download your personal reports.'}
                </p>
            </div>

            {/* Month/Year Filter - Available to all users */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Report Period</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                    <label className="text-sm font-medium text-gray-700">
                        Select Month & Year:
                    </label>
                    <select
                        title="Select Month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    >
                        {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Report Scope - Only visible to Admin and Payments roles */}
            {hasFullAccess && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Report Scope</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                        <label htmlFor="employee-select" className="text-sm font-medium text-gray-700">
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
                            className="w-full sm:flex-1 sm:max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                    {loadingEmployees && <p className="text-sm text-gray-500 mt-2">Loading employees...</p>}
                </div>
            )}

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
