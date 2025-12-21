import React, { useState } from 'react';
import { User, ExpenseRequest, RequestStatus } from '../types';
import { EXPENSE_REQUESTS } from '../constants';
import { ReceiptIcon, CheckCircleIcon, ClockIcon, XIcon } from './Icons';
import Notification from './Notification';

interface ExpensesProps {
    currentUser: User;
}

const statusInfo: Record<RequestStatus, { icon: React.FC<{className?: string}>, color: string }> = {
    [RequestStatus.PENDING]: { icon: ClockIcon, color: 'text-yellow-500' },
    [RequestStatus.APPROVED]: { icon: CheckCircleIcon, color: 'text-green-500' },
    [RequestStatus.REJECTED]: { icon: ClockIcon, color: 'text-red-500' }, // Using ClockIcon as a placeholder
    [RequestStatus.CANCELLED]: { icon: XIcon, color: 'text-gray-500' },
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);

const Expenses = ({ currentUser }: ExpensesProps) => {
    const [requests, setRequests] = useState<ExpenseRequest[]>(EXPENSE_REQUESTS.filter(e => e.userId === currentUser.id));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [receipt, setReceipt] = useState<File | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newRequest: ExpenseRequest = {
            id: `ex-${Date.now()}`,
            userId: currentUser.id,
            description,
            amount: parseFloat(amount),
            date: new Date(date),
            status: RequestStatus.PENDING,
            receiptUrl: receipt ? URL.createObjectURL(receipt) : undefined,
        };
        setRequests(prev => [newRequest, ...prev]);
        
        // Reset form
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setReceipt(null);
        setNotification('Expense claim submitted successfully!');
    };

    return (
        <>
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Submit Expense Claim</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g., Client Lunch" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (GHS)</label>
                                <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="150.00" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="receipt" className="block text-sm font-medium text-gray-700">Upload Receipt</label>
                            <input type="file" id="receipt" onChange={e => setReceipt(e.target.files ? e.target.files[0] : null)} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-indigo-200"/>
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition-colors">Submit Claim</button>
                    </form>
                </div>
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">My Expense Claims</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {requests.length > 0 ? requests.map(req => {
                            const StatusIcon = statusInfo[req.status].icon;
                            return (
                                <div key={req.id} className="p-3 border rounded-lg flex items-start space-x-3 bg-slate-50">
                                    <div className={`p-2.5 rounded-full mt-1 ${statusInfo[req.status].color}`}>
                                        <StatusIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-gray-700">{req.description}</p>
                                            <p className={`font-bold text-lg ${statusInfo[req.status].color}`}>{formatCurrency(req.amount)}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="text-gray-500 mt-1">{new Date(req.date).toLocaleDateString()}</p>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${statusInfo[req.status].color}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-gray-500 text-center py-8">You have no expense claims.</p>
                        )}
                    </div>
                 </div>
            </div>
        </>
    );
};

export default Expenses;
