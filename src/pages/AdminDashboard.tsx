import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Gym, Member, Payment } from '../types';
import { CheckCircle, XCircle, Users, CreditCard, Building2, Clock, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format, startOfMonth } from 'date-fns';

interface GymStats {
  gym: Gym;
  owner: UserProfile;
  memberCount: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [gymStats, setGymStats] = useState<GymStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const gymsSnap = await getDocs(collection(db, 'gyms'));
      const usersSnap = await getDocs(collection(db, 'users'));
      const membersSnap = await getDocs(collection(db, 'members'));
      const paymentsSnap = await getDocs(collection(db, 'payments'));

      const gyms = gymsSnap.docs.map(d => d.data() as Gym);
      const users = usersSnap.docs.map(d => d.data() as UserProfile);
      const members = membersSnap.docs.map(d => d.data() as Member);
      const payments = paymentsSnap.docs.map(d => d.data() as Payment);

      const now = new Date();
      const monthStart = startOfMonth(now);

      const stats: GymStats[] = gyms.map(gym => {
        const owner = users.find(u => u.gymId === gym.id) || {} as UserProfile;
        const gymMembers = members.filter(m => m.gymId === gym.id);
        const gymPayments = payments.filter(p => 
          p.gymId === gym.id && 
          p.status === 'paid' && 
          p.date?.toDate() >= monthStart
        );

        return {
          gym,
          owner,
          memberCount: gymMembers.length,
          monthlyRevenue: gymPayments.reduce((sum, p) => sum + p.amount, 0)
        };
      }).filter(s => s.owner.status === 'approved'); // Only show approved gyms in overview

      setGymStats(stats);
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'admin_data');
    }
  };

  useEffect(() => {
    // 1. Listen for pending users
    const pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      setPendingUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    fetchAllData();
    return () => unsubscribePending();
  }, []);

  const handleUpdateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'rejected') {
        // If rejected, delete user and their gym to make them "disappear"
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data() as UserProfile;
          if (userData.gymId) {
            await deleteDoc(doc(db, 'gyms', userData.gymId));
          }
          await deleteDoc(doc(db, 'users', userId));
        }
      } else {
        await updateDoc(doc(db, 'users', userId), { status });
        fetchAllData(); // Refresh overview
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteGym = async (gymId: string, ownerUid: string) => {
    if (!confirm('Are you sure you want to KICK this gym owner? All their data (members, plans, payments) will be deleted.')) return;
    
    try {
      // 1. Delete gym and owner
      await deleteDoc(doc(db, 'gyms', gymId));
      await deleteDoc(doc(db, 'users', ownerUid));

      // 2. Delete related data
      const collectionsToDelete = ['members', 'plans', 'payments'];
      for (const col of collectionsToDelete) {
        const snap = await getDocs(query(collection(db, col), where('gymId', '==', gymId)));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }

      fetchAllData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'gym_data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Approvals */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">Pending Approvals ({pendingUsers.length})</h2>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <li key={user.uid} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">{user.email}</p>
                  <p className="text-xs text-gray-500">Joined: {user.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(user.uid, 'approved')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(user.uid, 'rejected')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </button>
                </div>
              </li>
            ))}
            {pendingUsers.length === 0 && (
              <li className="px-6 py-8 text-center text-gray-500">No pending requests.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Gym Stats */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">All Gyms Overview</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gymStats.map((stat) => (
            <div key={stat.gym.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative group">
              <button
                onClick={() => handleDeleteGym(stat.gym.id, stat.owner.uid)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Kick Gym Owner"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{stat.gym.name}</h3>
                  <p className="text-sm text-gray-500">{stat.owner.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">Members</p>
                    <p className="text-sm font-bold">{stat.memberCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Monthly Rev.</p>
                    <p className="text-sm font-bold text-green-600">₹{stat.monthlyRevenue}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
