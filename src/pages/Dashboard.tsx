import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Member, Plan, Payment } from '../types';
import { Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Dashboard() {
  const { gym } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalRevenue: 0,
    pendingDues: 0,
  });

  useEffect(() => {
    if (!gym?.id) return;

    const membersQuery = query(collection(db, 'members'), where('gymId', '==', gym.id));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const members = snapshot.docs.map(doc => doc.data() as Member);
      setStats(prev => ({
        ...prev,
        totalMembers: members.length,
        activeMembers: members.filter(m => m.status === 'active').length,
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const paymentsQuery = query(collection(db, 'payments'), where('gymId', '==', gym.id));
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const payments = snapshot.docs.map(doc => doc.data() as Payment);
      const totalRevenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const pendingDues = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
      
      setStats(prev => ({
        ...prev,
        totalRevenue,
        pendingDues,
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    return () => {
      unsubscribeMembers();
      unsubscribePayments();
    };
  }, [gym?.id]);

  const cards = [
    { name: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Active Members', value: stats.activeMembers, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Pending Dues', value: `₹${stats.pendingDues}`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{card.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to {gym?.name}</h2>
        <p className="text-gray-600">
          Use the sidebar to manage your members, subscription plans, and track payments.
        </p>
      </div>
    </div>
  );
}
