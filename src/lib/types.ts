export type UserRole = 'admin' | 'sales_executive' | 'distributor' | 'delivery_partner';

export type User = {
  id: string; // uuid from public.users table
  auth_id: string; // uuid from auth.users table
  name: string;
  email: string;
  // The 'role' in the frontend app is a string, but is stored as a SMALLINT in the DB.
  // The auth provider handles mapping between the two.
  role: UserRole; 
  avatar_url: string;
  created_at: string;
  assigned_outlet_ids?: string[];
};

export type Outlet = {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
};

export type Geofence = {
  id: string;
  lat: number;
  lng: number;
  radius: number; // in meters
  outlet_id: string;
  created_at: string;
};

export type Visit = {
  id: string;
  user_id: string;
  outlet_id: string;
  entry_time: string;
  exit_time: string | null;
  within_radius: boolean;
  duration_minutes: number | null; // in minutes
  created_at: string;
};

export type Order = {
  id: string;
  outlet_id: string;
  order_date: string;
  total_amount: number;
  status: 'Pending' | 'In Transit' | 'Delivered';
};

export type Delivery = {
  id: string;
  order_id: string;
  delivery_person_id: string;
  status: 'Pending' | 'Delivered';
  delivered_at: string | null;
};

// For the new user creation form
export type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
