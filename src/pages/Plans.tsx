import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Plan } from '../types';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Plans() {
  const { gym } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    if (!gym?.id) return;

    const plansQuery = query(collection(db, 'plans'), where('gymId', '==', gym.id));
    const unsubscribe = onSnapshot(plansQuery, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'plans'));

    return () => unsubscribe();
  }, [gym?.id]);

  const onSubmit = async (data: any) => {
    if (!gym?.id) return;

    try {
      const planData = {
        ...data,
        price: parseFloat(data.price),
        gymId: gym.id,
      };

      if (editingPlan) {
        await updateDoc(doc(db, 'plans', editingPlan.id), planData);
      } else {
        await addDoc(collection(db, 'plans'), planData);
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingPlan ? OperationType.UPDATE : OperationType.CREATE, 'plans');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'plans');
    }
  };

  const openModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setValue('name', plan.name);
      setValue('price', plan.price);
      setValue('duration', plan.duration);
      setValue('description', plan.description);
    } else {
      setEditingPlan(null);
      reset();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 uppercase">{plan.duration}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(plan)} className="text-gray-400 hover:text-gray-500">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(plan.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 flex-1">{plan.description}</p>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg shadow">
            No plans created yet.
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
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                  <input
                    {...register('name', { required: true })}
                    placeholder="e.g. Gold Membership"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                  <input
                    {...register('price', { required: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <select
                    {...register('duration', { required: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  >
                    {editingPlan ? 'Update' : 'Save'}
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
