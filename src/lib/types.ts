

export type UserRole = 'super_admin' | 'sales_executive' | 'distributor_admin' | 'delivery_partner';

export type User = {
  id: number;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole; 
  avatar_url: string;
  created_at: string;
  company_name?: string;
  company_address?: string;
  company_gst_number?: string;
};

export type Distributor = {
    id: number;
    name: string;
    created_at: string;
    admin_user_id: number | null;
    address?: string;
    gst_number?: string;
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
  created_by?: string; // Add this if you track who created the outlet
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
  distributor_id: number | null; // This now refers to the brand's stock if null
  created_at: string;
  weight?: string;
};

export type DistributorStock = {
    id: number;
    distributor_id: number;
    sku_id: number;
    stock_quantity: number;
    units_per_case: number;
    case_price: number;
    mrp: number;
    skus: Sku; // For joins to get name, etc.
}

export type Order = {
  id: number;
  distributor_id: number;
  outlet_id: string;
  order_date: string;
  total_amount: number;
  total_discount: number;
  status: string;
  amount_paid: number;
  payment_status: string;
  delivery_partner_id: number | null;
  created_at: string;
  created_by_user_id?: number; // Track who created the order using public user ID
  order_items?: OrderItem[];
  outlets?: { name: string; address: string; }; // For joins
  distributors?: { name: string; address?: string; gst_number?: string }; // For joins
  is_invoice_created: boolean;
  invoices?: { id: number }[]
};

export type OrderItem = {
  id: number;
  order_id: number;
  sku_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_unit_type: 'units' | 'cases';
  scheme_discount_percentage: number;
  is_out_of_stock: boolean;
  skus?: { name: string, product_code: string, unit_type?: string }; // For joins
};

export type StockOrder = {
  id: number;
  distributor_id: number;
  order_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  created_by_user_id?: number;
  notes?: string;
  distributors?: { name: string, address?: string, gst_number?: string }; // For joins
  stock_order_items?: StockOrderItem[]; // For joins
  is_invoice_created: boolean;
  invoices?: { id: number }[]; // To get the invoice id
};

export type StockOrderItem = {
  id: number;
  stock_order_id: number;
  sku_id: number;
  quantity: number; // in cases
  case_price: number;
  total_price: number;
  skus?: { name: string, product_code: string, units_per_case: number, unit_type?: string }; // For joins
};


export type Attendance = {
    id: string;
    user_id: number;
    checkin_time: string;
    checkin_lat?: number;
    checkin_lng?: number;
    checkin_photo_url?: string;
    checkout_time?: string;
    checkout_lat?: number;
    checkout_lng?: number;
    checkout_photo_url?: string;
    status: 'Online' | 'Offline';
    created_at: string;
}

export type InvoiceItem = {
    name: string;
    code: string;
    weight?: string;
    quantity: string; // e.g., "10 units" or "2 cases"
    unit_price: number;
    total_price: number;
};

export type Invoice = {
    id: number;
    invoice_number: string;
    order_id?: number | null;
    stock_order_id?: number | null;
    issue_date: string;
    due_date?: string | null;
    subtotal: number;
    total_discount: number;
    total_amount: number;
    tax_amount?: number | null;
    notes?: string | null;
    items: InvoiceItem[]; // The denormalized items snapshot
    orders?: Order | null;
    stock_orders?: StockOrder | null;
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
    address?: string;
    gst_number?: string;
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
  weight?: string;
};

// For creating a new Order
export type OrderFormData = {
  outlet_id?: string; // Optional for distributor orders
  total_amount: number;
  total_discount: number;
  payment_status: "Unpaid" | "Partially Paid" | "Paid";
  amount_paid?: number;
  items: {
    sku_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    order_unit_type: 'units' | 'cases';
    scheme_discount_percentage: number;
  }[];
};

// For creating a new stock order
export type StockOrderFormData = {
  total_amount: number;
  notes?: string;
  items: {
    sku_id: number;
    quantity: number; // in cases
    case_price: number;
    total_price: number;
  }[];
};


// For marking attendance
export type AttendanceData = {
    type: 'checkin' | 'checkout';
    coords: {
        latitude: number;
        longitude: number;
    };
    selfie: string; // base64 data URI
}
