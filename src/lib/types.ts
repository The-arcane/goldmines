

export type UserRole = 'admin' | 'sales_executive' | 'distributor_admin' | 'delivery_partner';

export type User = {
  id: number;
  auth_id: string;
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
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
  credit_limit: number;
  current_due: number;
};

export type Geofence = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  outlet_id: string;
  created_at: string;
};

export type Visit = {
  id: number;
  user_id: number;
  outlet_id: string;
  entry_time: string;
  exit_time: string | null;
  within_radius: boolean;
  duration_minutes: number | null;
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
  distributor_id: number | null;
  created_at: string;
};

export type Order = {
  id: number;
  distributor_id: number;
  outlet_id: string;
  order_date: string;
  total_value: number;
  status: string;
  amount_paid: number;
  payment_status: string;
  delivery_partner_id: number | null;
  created_at: string;
  order_items?: OrderItem[];
  outlets?: { name: string; address: string; }; // For joins
};

export type OrderItem = {
  id: number;
  order_id: number;
  sku_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  skus?: { name: string, product_code: string }; // For joins
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

// For creating a new SKU
export type SkuFormData = {
  name: string;
  product_code?: string;
  unit_type?: string;
  units_per_case?: number;
  case_price?: number;
  mrp?: number;
  ptr?: number;
  stock_quantity: number;
};

// For creating a new Order
export type OrderFormData = {
  outlet_id: string;
  total_value: number;
  items: {
    sku_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
};
