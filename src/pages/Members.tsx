import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Member, Plan } from '../types';
import { Plus, Search, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';

export default function Members() {
  const { gym } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const selectedPlanId = watch('planId');

  useEffect(() => {
    if (!gym?.id) return;

    const membersQuery = query(collection(db, 'members'), where('gymId', '==', gym.id));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const plansQuery = query(collection(db, 'plans'), where('gymId', '==', gym.id));
    const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    return () => {
      unsubscribeMembers();
      unsubscribePlans();
    };
  }, [gym?.id]);

  const onSubmit = async (data: any) => {
    if (!gym?.id) return;

    try {
      const memberData = {
        ...data,
        customPlan: data.planId === 'custom' ? {
          name: 'Custom Plan',
          price: parseFloat(data.customPrice),
          duration: data.customDuration,
        } : null,
      };

      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), {
          ...memberData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'members'), {
          ...memberData,
          gymId: gym.id,
          joinedAt: serverTimestamp(),
          status: 'active',
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingMember ? OperationType.UPDATE : OperationType.CREATE, 'members');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'members');
    }
  };

  const openModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setValue('name', member.name);
      setValue('email', member.email);
      setValue('phone', member.phone);
      setValue('planId', member.planId || (member.customPlan ? 'custom' : ''));
      if (member.customPlan) {
        setValue('customPrice', member.customPlan.price);
        setValue('customDuration', member.customPlan.duration);
      }
      setValue('status', member.status);
    } else {
      setEditingMember(null);
      reset();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    reset();
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Member
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredMembers.map((member) => (
            <li key={member.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="truncate">
                    <div className="flex text-sm">
                      <p className="font-medium text-indigo-600 truncate">{member.name}</p>
                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                        {member.email ? `(${member.email})` : ''}
                      </p>
                    </div>
                    <div className="mt-2 flex">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          member.status === 'active' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}>
                          {member.status}
                        </span>
                        <span className="ml-2">
                          Plan: {member.planId === 'custom' ? `Custom (₹${member.customPlan?.price})` : (plans.find(p => p.id === member.planId)?.name || 'None')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex-shrink-0 flex gap-2">
                  <button onClick={() => openModal(member)} className="p-2 text-gray-400 hover:text-gray-500">
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filteredMembers.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No members found.
            </li>
          )}
        </ul>
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
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    {...register('name', { required: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register('phone')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <select
                    {...register('planId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a plan</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.price}</option>
                    ))}
                    <option value="custom">Custom Plan</option>
                  </select>
                </div>

                {selectedPlanId === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rate (₹)</label>
                      <input
                        {...register('customPrice', { required: selectedPlanId === 'custom' })}
                        type="number"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration</label>
                      <input
                        {...register('customDuration', { required: selectedPlanId === 'custom' })}
                        placeholder="e.g. 2 Months"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
                {editingMember && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      {...register('status')}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                )}
                <div className="mt-5 sm:mt-6">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  >
                    {editingMember ? 'Update' : 'Save'}
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
