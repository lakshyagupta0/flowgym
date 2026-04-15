export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  gymId?: string;
  role: 'owner' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Gym {
  id: string;
  name: string;
  ownerUid: string;
  address?: string;
  phone?: string;
  createdAt: any;
}

export interface Member {
  id: string;
  gymId: string;
  name: string;
  email?: string;
  phone?: string;
  planId?: string;
  customPlan?: {
    name: string;
    price: number;
    duration: string;
  };
  status: 'active' | 'inactive' | 'expired';
  joinedAt: any;
  lastPaymentDate?: any;
  nextDueDate?: any;
}

export interface Plan {
  id: string;
  gymId: string;
  name: string;
  price: number;
  duration: 'monthly' | 'yearly' | 'quarterly';
  description?: string;
}

export interface Payment {
  id: string;
  gymId: string;
  memberId: string;
  amount: number;
  date: any;
  status: 'paid' | 'pending' | 'failed';
  method?: string;
}
