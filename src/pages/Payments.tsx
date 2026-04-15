import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Payment, Member } from '../types';
import { Plus, Trash2, X, CheckCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';

export default function Payments() {
  const { gym } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const { register, handleSubmit, reset, watch } = useForm();
  const selectedMemberId = watch('memberId');

  useEffect(() => {
    if (!gym?.id) return;

    const paymentsQuery = query(collection(db, 'payments'), where('gymId', '==', gym.id));
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    const membersQuery = query(collection(db, 'members'), where('gymId', '==', gym.id));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const plansQuery = query(collection(db, 'plans'), where('gymId', '==', gym.id));
    const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    return () => {
      unsubscribePayments();
      unsubscribeMembers();
      unsubscribePlans();
    };
  }, [gym?.id]);

  const getMemberDetails = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return null;

    const plan = member.planId === 'custom' 
      ? member.customPlan 
      : plans.find(p => p.id === member.planId);
    
    const memberPayments = payments.filter(p => p.memberId === memberId && p.status === 'paid');
    const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
    const planPrice = plan?.price || 0;
    const balance = planPrice - totalPaid;

    return {
      planName: plan?.name || 'No Plan',
      planPrice,
      totalPaid,
      balance: balance > 0 ? balance : 0
    };
  };

  const memberDetails = selectedMemberId ? getMemberDetails(selectedMemberId) : null;

  const onSubmit = async (data: any) => {
    if (!gym?.id) return;

    try {
      await addDoc(collection(db, 'payments'), {
        ...data,
        amount: parseFloat(data.amount),
        gymId: gym.id,
        date: serverTimestamp(),
      });
      closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'payments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'payments');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'payments');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Record Payment
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.sort((a, b) => b.date?.seconds - a.date?.seconds).map((payment) => (
              <li key={payment.id} className="table-row">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {members.find(m => m.id === payment.memberId)?.name || 'Unknown Member'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{payment.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {payment.date ? format(payment.date.toDate(), 'MMM dd, yyyy') : 'Pending...'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1",
                    payment.status === 'paid' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  )}>
                    {payment.status === 'paid' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {payment.status === 'pending' && (
                      <button 
                        onClick={() => handleStatusUpdate(payment.id, 'paid')}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </li>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No payment records found.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={closeModal}
            />

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal Content */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member</label>
                  <select
                    {...register('memberId', { required: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                {memberDetails && (
                  <div className="p-3 bg-indigo-50 rounded-md border border-indigo-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Selected Plan:</span>
                      <span className="font-semibold text-indigo-700">{memberDetails.planName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Plan Rate:</span>
                      <span className="font-semibold text-indigo-700">₹{memberDetails.planPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-indigo-100 pt-2">
                      <span className="text-gray-900 font-medium">Balance to be Paid:</span>
                      <span className="font-bold text-red-600">₹{memberDetails.balance}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                  <input
                    {...register('amount', { required: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    {...register('status', { required: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  >
                    Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
