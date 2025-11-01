

export type UserRole = 'admin' | 'sales_executive' | 'distributor_admin' | 'delivery_partner';

export type User = {
  id: number; // This is the primary key from the public.users table.
  auth_id: string; // This is the uuid from the auth.users table.
  name: string;
  email: string;
  role: UserRole | number; 
  avatar_url: string;
  created_at: string;
};

export type Distributor = {
    id: number;
    name: string;
    created_at: string;
    admin_user_id: number | null;
}

export type Outlet = {
  id: string; // UUID
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
};

export type Geofence = {
  id: string; // UUID
  lat: number;
  lng: number;
  radius: number; // in meters
  outlet_id: string; // UUID
  created_at: string;
};

export type Visit = {
  id: number;
  user_id: number;
  outlet_id: string; // UUID
  entry_time: string;
  exit_time: string | null;
  within_radius: boolean;
  duration_minutes: number | null; // in minutes
  created_at: string;
};

export type Sku = {
  id: number;
  name: string;
  product_code?: string;
  unit_type?: string;
  units_per_case?: number;
  case_price?: number;
  mrp?: number;
  ptr?: number;
  stock_quantity: number;
  distributor_id: number;
  created_at: string;
};

export type Order = {
  id: number;
  distributor_id: number;
  outlet_id: string;
  order_date: string;
  total_value?: number;
  status: string;
  created_at: string;
  order_items: OrderItem[]; // This can be populated via a join
  outlets?: { name: string }; // To get outlet name
};

export type OrderItem = {
  id: number;
  order_id: number;
  sku_id: number;
  quantity: number;
  unit_price?: number;
  total_price?: number;
};


// For the generic new user creation form
export type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  distributorId?: string;
}

// For creating a new distributor organization and its admin
export type DistributorFormData = {
    distributorName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}
