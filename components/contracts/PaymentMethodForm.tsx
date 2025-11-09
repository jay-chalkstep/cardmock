'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Check, Gift, FileText } from 'lucide-react';

interface PaymentMethodFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: string;
    details: any;
    status?: string;
  }) => Promise<void>;
  initialData?: {
    id?: string;
    type?: string;
    details?: any;
    status?: string;
  };
}

const PAYMENT_TYPES = [
  { value: 'prepaid_card', label: 'Prepaid Card', icon: CreditCard },
  { value: 'check', label: 'Check', icon: Check },
  { value: 'amazon_card', label: 'Amazon Card', icon: Gift },
  { value: 'custom', label: 'Custom', icon: FileText },
];

export default function PaymentMethodForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: PaymentMethodFormProps) {
  const [type, setType] = useState<string>(initialData?.type || 'prepaid_card');
  const [details, setDetails] = useState<any>(initialData?.details || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'prepaid_card');
      setDetails(initialData.details || {});
    } else {
      setType('prepaid_card');
      setDetails({});
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!type) {
      newErrors.type = 'Payment type is required';
    }

    // Type-specific validation
    switch (type) {
      case 'prepaid_card':
        if (!details.card_number) newErrors.card_number = 'Card number is required';
        if (!details.amount) newErrors.amount = 'Amount is required';
        if (details.amount && isNaN(parseFloat(details.amount))) {
          newErrors.amount = 'Amount must be a valid number';
        }
        break;
      case 'check':
        if (!details.check_number) newErrors.check_number = 'Check number is required';
        if (!details.amount) newErrors.amount = 'Amount is required';
        if (details.amount && isNaN(parseFloat(details.amount))) {
          newErrors.amount = 'Amount must be a valid number';
        }
        if (!details.payable_to) newErrors.payable_to = 'Payable to is required';
        break;
      case 'amazon_card':
        if (!details.card_number) newErrors.card_number = 'Card number is required';
        if (!details.amount) newErrors.amount = 'Amount is required';
        if (details.amount && isNaN(parseFloat(details.amount))) {
          newErrors.amount = 'Amount must be a valid number';
        }
        break;
      case 'custom':
        if (!details.description) newErrors.description = 'Description is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({
        type,
        details,
        status: initialData?.status || 'pending_approval',
      });
      // Reset form
      setType('prepaid_card');
      setDetails({});
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error submitting payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDetail = (key: string, value: any) => {
    setDetails((prev: any) => ({
      ...prev,
      [key]: value,
    }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'prepaid_card':
        return (
          <>
            <div>
              <label htmlFor="card_number" className="block text-sm font-medium mb-1">
                Card Number <span className="text-red-500">*</span>
              </label>
              <input
                id="card_number"
                type="text"
                value={details.card_number || ''}
                onChange={(e) => updateDetail('card_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.card_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1234 5678 9012 3456"
              />
              {errors.card_number && (
                <p className="text-xs text-red-500 mt-1">{errors.card_number}</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={details.amount || ''}
                onChange={(e) => updateDetail('amount', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100.00"
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <label htmlFor="expiration_date" className="block text-sm font-medium mb-1">
                Expiration Date
              </label>
              <input
                id="expiration_date"
                type="text"
                value={details.expiration_date || ''}
                onChange={(e) => updateDetail('expiration_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="MM/YY"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={details.notes || ''}
                onChange={(e) => updateDetail('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </>
        );

      case 'check':
        return (
          <>
            <div>
              <label htmlFor="check_number" className="block text-sm font-medium mb-1">
                Check Number <span className="text-red-500">*</span>
              </label>
              <input
                id="check_number"
                type="text"
                value={details.check_number || ''}
                onChange={(e) => updateDetail('check_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.check_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1234"
              />
              {errors.check_number && (
                <p className="text-xs text-red-500 mt-1">{errors.check_number}</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={details.amount || ''}
                onChange={(e) => updateDetail('amount', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100.00"
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <label htmlFor="payable_to" className="block text-sm font-medium mb-1">
                Payable To <span className="text-red-500">*</span>
              </label>
              <input
                id="payable_to"
                type="text"
                value={details.payable_to || ''}
                onChange={(e) => updateDetail('payable_to', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.payable_to ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="John Doe"
              />
              {errors.payable_to && (
                <p className="text-xs text-red-500 mt-1">{errors.payable_to}</p>
              )}
            </div>
            <div>
              <label htmlFor="memo" className="block text-sm font-medium mb-1">
                Memo
              </label>
              <input
                id="memo"
                type="text"
                value={details.memo || ''}
                onChange={(e) => updateDetail('memo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment for services"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={details.notes || ''}
                onChange={(e) => updateDetail('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </>
        );

      case 'amazon_card':
        return (
          <>
            <div>
              <label htmlFor="card_number" className="block text-sm font-medium mb-1">
                Card Number <span className="text-red-500">*</span>
              </label>
              <input
                id="card_number"
                type="text"
                value={details.card_number || ''}
                onChange={(e) => updateDetail('card_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.card_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1234 5678 9012 3456"
              />
              {errors.card_number && (
                <p className="text-xs text-red-500 mt-1">{errors.card_number}</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={details.amount || ''}
                onChange={(e) => updateDetail('amount', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="100.00"
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={details.notes || ''}
                onChange={(e) => updateDetail('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </>
        );

      case 'custom':
        return (
          <>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={details.description || ''}
                onChange={(e) => updateDetail('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe the payment method..."
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
              )}
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-1">
                Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={details.amount || ''}
                onChange={(e) => updateDetail('amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Additional Details
              </label>
              <textarea
                id="notes"
                value={details.notes || ''}
                onChange={(e) => updateDetail('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional details..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Payment Method' : 'Add Payment Method'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_TYPES.map((paymentType) => {
                const Icon = paymentType.icon;
                return (
                  <button
                    key={paymentType.value}
                    type="button"
                    onClick={() => {
                      setType(paymentType.value);
                      setDetails({}); // Reset details when type changes
                      setErrors({});
                    }}
                    className={`p-3 border-2 rounded-lg text-left transition-colors ${
                      type === paymentType.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={type === paymentType.value ? 'text-blue-600' : 'text-gray-400'} />
                      <span className="font-medium text-sm">{paymentType.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.type && (
              <p className="text-xs text-red-500 mt-1">{errors.type}</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
            <div className="space-y-4">
              {renderTypeSpecificFields()}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : initialData ? 'Update Payment Method' : 'Add Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

