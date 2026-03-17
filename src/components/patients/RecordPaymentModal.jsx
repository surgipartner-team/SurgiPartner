'use client';

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

export default function RecordPaymentModal({ isOpen, onClose, invoice, onSubmit }) {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !invoice) return null;

    const balanceDue = Number(invoice.total_amount) - Number(invoice.paid_amount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const numAmount = parseFloat(amount);
        if (numAmount > balanceDue) {
            alert(`Payment amount (${numAmount}) cannot exceed the Balance Due (${balanceDue}).`);
            return;
        }

        setLoading(true);

        const paymentData = {
            amount: numAmount,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            payment_status: 'completed',
            transaction_id: transactionId || null,
            notes: notes || null
        };

        await onSubmit(paymentData);

        // Reset form
        setAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('cash');
        setTransactionId('');
        setNotes('');
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
                        <p className="text-sm text-gray-600 mt-1">Add payment for {invoice.customer_name} ({invoice.invoice_number})</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Amount */}
                    <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-blue-800 font-medium mb-1">Total Amount: ₹{Number(invoice.total_amount).toLocaleString('en-IN')}</p>
                            <p className="text-lg text-red-600 font-bold">Balance Due: ₹{balanceDue.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Amount to Pay <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                ₹
                            </span>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                min="0"
                                step="0.01"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Payment Date and Method */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Payment Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="insurance">Insurance</option>
                            </select>
                        </div>
                    </div>

                    {/* Transaction ID */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Transaction ID
                        </label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Optional transaction reference"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional payment details..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="px-6 py-3 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <DollarSign size={18} />
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
