import type { User, Outlet, Geofence, Visit } from './types';
import { subMinutes, subHours, formatISO } from 'date-fns';

export const users: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@successarrow.com', role: 'admin', avatarUrl: 'https://picsum.photos/seed/user1/100/100' },
  { id: 'user-2', name: 'Sales Executive 1', email: 'sales1@successarrow.com', role: 'sales_executive', avatarUrl: 'https://picsum.photos/seed/user2/100/100', assigned_outlet_ids: ['outlet-1', 'outlet-2'] },
  { id: 'user-3', name: 'Distributor 1', email: 'dist1@successarrow.com', role: 'distributor', avatarUrl: 'https://picsum.photos/seed/user3/100/100' },
  { id: 'user-4', name: 'Delivery Partner 1', email: 'delivery1@successarrow.com', role: 'delivery_partner', avatarUrl: 'https://picsum.photos/seed/user4/100/100' },
  { id: 'user-5', name: 'Sales Executive 2', email: 'sales2@successarrow.com', role: 'sales_executive', avatarUrl: 'https://picsum.photos/seed/user5/100/100', assigned_outlet_ids: ['outlet-3'] },
];

export const outlets: Outlet[] = [
  { id: 'outlet-1', name: 'SuperMart Downtown', type: 'Retail', address: '123 Main St, Anytown, USA', lat: 34.0522, lng: -118.2437, geofence_id: 'geo-1', created_at: formatISO(new Date()) },
  { id: 'outlet-2', name: 'Green Grocers Uptown', type: 'Retail', address: '456 Oak Ave, Anytown, USA', lat: 34.0622, lng: -118.2537, geofence_id: 'geo-2', created_at: formatISO(new Date()) },
  { id: 'outlet-3', name: 'Central Warehouse', type: 'Warehouse', address: '789 Industrial Pkwy, Anytown, USA', lat: 34.0422, lng: -118.2637, geofence_id: 'geo-3', created_at: formatISO(new Date()) },
];

export const geofences: Geofence[] = [
  { id: 'geo-1', lat: 34.0522, lng: -118.2437, radius: 150, outlet_id: 'outlet-1', created_at: formatISO(new Date()) },
  { id: 'geo-2', lat: 34.0622, lng: -118.2537, radius: 150, outlet_id: 'outlet-2', created_at: formatISO(new Date()) },
  { id: 'geo-3', lat: 34.0422, lng: -118.2637, radius: 150, outlet_id: 'outlet-3', created_at: formatISO(new Date()) },
];

const now = new Date();
export const visits: Visit[] = [
  { 
    id: 'visit-1', 
    user_id: 'user-2', 
    outlet_id: 'outlet-1', 
    entry_time: formatISO(subMinutes(now, 45)), 
    exit_time: formatISO(subMinutes(now, 15)), 
    within_radius: true, 
    duration: 30, 
    created_at: formatISO(subMinutes(now, 45)) 
  },
  { 
    id: 'visit-2', 
    user_id: 'user-5', 
    outlet_id: 'outlet-3', 
    entry_time: formatISO(subHours(now, 2)), 
    exit_time: formatISO(subHours(now, 1)), 
    within_radius: true, 
    duration: 60, 
    created_at: formatISO(subHours(now, 2)) 
  },
  { 
    id: 'visit-3', 
    user_id: 'user-2', 
    outlet_id: 'outlet-2', 
    entry_time: formatISO(subHours(now, 4)), 
    exit_time: formatISO(subMinutes(subHours(now, 4), -130)), // 130 minutes duration
    within_radius: true, 
    duration: 130, 
    created_at: formatISO(subHours(now, 4)) 
  },
  { 
    id: 'visit-4', 
    user_id: 'user-2', 
    outlet_id: 'outlet-1', 
    entry_time: formatISO(subHours(now, 8)), 
    exit_time: null, 
    within_radius: true, 
    duration: null, 
    created_at: formatISO(subHours(now, 8)) 
  },
];
