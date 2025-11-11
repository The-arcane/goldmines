
"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import type { UserFormData, DistributorFormData, SkuFormData, OrderFormData, AttendanceData, StockOrderFormData } from "./types";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "./supabaseServer";
import { redirect } from 'next/navigation';

export async function checkVisitAnomaly(visitDetails: string, criteria: string) {
  try {
    const result = await flagAnomalousVisit({ visitDetails, criteria });
    return { data: result };
  } catch (error) {
    console.error("Error checking visit anomaly:", error);
    return { error: "Failed to communicate with the AI service." };
  }
}

// Helper function to introduce a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function createNewUser(formData: UserFormData, distributorId?: string) {
  const supabaseAdmin = createServerActionClient({ isAdmin: true });

  const userMetadata: {[key: string]: any} = {
      name: formData.name,
      role: formData.role,
      avatar_url: `https://picsum.photos/seed/${formData.email}/100/100`,
  };
  
  const roleInt = (() => {
    switch (formData.role) {
      case 'admin': return 1;
      case 'sales_executive': return 2;
      case 'distributor_admin': return 3;
      case 'delivery_partner': return 4;
      default: return 2;
    }
  })();
  
  // Step 1: Create the user in auth.users. The database trigger should handle creating the public.users profile.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name: formData.name,
      role: roleInt,
      avatar_url: userMetadata.avatar_url,
    }
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return { success: false, error: authError.message };
  }
  
  const authUser = authData.user;
  if (!authUser) {
    return { success: false, error: "Auth user was not created." };
  }

  // Step 2: Fetch the user profile from public.users that was created by the trigger.
  // We'll retry a few times in case of replication delay.
  let newUserId: number | null = null;
  for (let i = 0; i < 3; i++) {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single();

    if (profileData) {
      newUserId = profileData.id;
      break;
    }
    await sleep(500); // Wait for half a second before retrying
  }

  if (!newUserId) {
    console.error('Could not find user profile after creation.');
    await supabaseAdmin.auth.admin.deleteUser(authUser.id); // Clean up auth user
    return { success: false, error: 'User profile was not created automatically. Could not complete user setup.' };
  }

  // Step 3: If it's a distributor user, link them in the junction table
  if ((formData.role === 'delivery_partner' || formData.role === 'distributor_admin' || formData.role === 'sales_executive') && distributorId) {
    const { error: linkError } = await supabaseAdmin
      .from('distributor_users')
      .insert({
        distributor_id: parseInt(distributorId),
        user_id: newUserId,
      });

    if (linkError) {
      console.error('Error linking user to distributor:', linkError);
      // Clean up user and profile
      await supabaseAdmin.from('users').delete().eq('id', newUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      return { success: false, error: `User was created but could not be linked to the distributor: ${linkError.message}` };
    }
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/distributor/users');
  return { success: true, user: authUser };
}


export async function createDistributorWithAdmin(formData: DistributorFormData) {
    const supabaseAdmin = createServerActionClient({ isAdmin: true });

    // 1. Create the distributor organization first
    const { data: distributorData, error: distributorError } = await supabaseAdmin
        .from('distributors')
        .insert({ name: formData.distributorName })
        .select()
        .single();

    if (distributorError) {
        console.error('Error creating distributor:', distributorError);
        return { success: false, error: `Failed to create distributor organization: ${distributorError.message}` };
    }

    // 2. Now create the admin user for that organization
    const creationResult = await createNewUser({
        name: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        role: 'distributor_admin',
    }, String(distributorData.id));


    if (!creationResult.success || !creationResult.user) {
        // If user creation fails, roll back the distributor creation for consistency
        await supabaseAdmin.from('distributors').delete().eq('id', distributorData.id);
        console.error('Error creating admin user:', creationResult.error);
        return { success: false, error: `Failed to create admin user: ${creationResult.error}. Distributor creation was rolled back.` };
    }

    // 3. Link the new user's profile ID back to the distributor table as the main admin
    const { data: newUserProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_id', creationResult.user.id)
        .single();

    if (profileError || !newUserProfile) {
        console.error('Could not find new user profile to link to distributor', profileError);
        return { success: false, error: 'User and Distributor were created, but could not be linked as admin. Please edit the distributor to assign the admin manually.' };
    }

    const { error: updateError } = await supabaseAdmin
        .from('distributors')
        .update({ admin_user_id: newUserProfile.id })
        .eq('id', distributorData.id);

    if (updateError) {
        console.error('Error linking admin to distributor:', updateError);
        return { success: false, error: 'User and Distributor were created, but the admin could not be linked automatically.' };
    }

    revalidatePath('/dashboard/distributors');
    return { success: true };
}

export async function createNewSku(formData: SkuFormData, distributorId: number) {
  const supabase = createServerActionClient({ isAdmin: true });

  const { error } = await supabase.from("skus").insert({
    ...formData,
    distributor_id: distributorId,
  });

  if (error) {
    console.error("Error creating SKU:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/distributor/skus");
  return { success: true };
}

export async function createNewOrder(formData: OrderFormData, distributorId: number) {
  const supabase = createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!userProfile) {
    return { success: false, error: 'Could not find user profile.' };
  }
  
  // 1. Check credit limit
  const { data: outlet, error: outletError } = await supabase
    .from('outlets')
    .select('credit_limit, current_due')
    .eq('id', formData.outlet_id)
    .single();

  if (outletError || !outlet) {
    return { success: false, error: 'Could not find the selected outlet.' };
  }

  const newDueAmount = (outlet.current_due || 0) + formData.total_amount - (formData.amount_paid || 0);
  if (outlet.credit_limit > 0 && newDueAmount > outlet.credit_limit) {
    return { success: false, error: 'This order exceeds the outlets credit limit.' };
  }

  // 2. Create the main order record
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      distributor_id: distributorId,
      outlet_id: formData.outlet_id,
      status: 'Approved', // Sales exec orders are auto-approved
      total_amount: formData.total_amount, // This is now the FINAL, post-discount amount
      total_discount: formData.total_discount,
      amount_paid: formData.amount_paid,
      payment_status: formData.payment_status,
      order_date: new Date().toISOString(),
      created_by_user_id: userProfile.id,
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    return { success: false, error: orderError.message };
  }

  // 3. Prepare and insert order items
  const orderItems = formData.items.map(item => ({
    order_id: orderData.id,
    sku_id: item.sku_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price, // This is the pre-discount price for the line item
    order_unit_type: item.order_unit_type,
    scheme_discount_percentage: item.scheme_discount_percentage,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { success: false, error: `Order items could not be saved: ${itemsError.message}` };
  }

  // 4. Update distributor stock
  for (const item of formData.items) {
    const { data: stockItem, error: stockFetchError } = await supabase
      .from('distributor_stock')
      .select('stock_quantity, units_per_case')
      .eq('distributor_id', distributorId)
      .eq('sku_id', item.sku_id)
      .single();

    if (stockFetchError || !stockItem) {
      console.error(`Could not fetch stock for SKU ${item.sku_id} for distributor ${distributorId}. Skipping stock update for this item.`);
      continue;
    }
    
    const quantityToDecrement = item.order_unit_type === 'cases' 
      ? item.quantity * (stockItem.units_per_case || 1) 
      : item.quantity;
      
    const newStockQuantity = (stockItem.stock_quantity || 0) - quantityToDecrement;

    const { error: stockUpdateError } = await supabase
      .from('distributor_stock')
      .update({ stock_quantity: newStockQuantity })
      .eq('distributor_id', distributorId)
      .eq('sku_id', item.sku_id);
      
    if (stockUpdateError) {
       console.error(`Failed to update stock for SKU ${item.sku_id} for distributor ${distributorId}:`, stockUpdateError);
       // In a real app, you might want to add more robust error handling or rollback logic here.
    }
  }


  // 5. Update outlet due
  const dueChange = formData.total_amount - (formData.amount_paid || 0);
  if (dueChange !== 0) {
      const { error: rpcError } = await supabase.rpc('update_outlet_due', {
        outlet_uuid: formData.outlet_id,
        amount_change: dueChange
      });
      if (rpcError) console.error("Failed to update outlet due:", rpcError.message);
  }

  revalidatePath('/dashboard/distributor/orders');
  revalidatePath('/dashboard/distributor');
  revalidatePath('/dashboard/outlets');
  revalidatePath("/salesperson/dashboard");
  revalidatePath("/salesperson/orders");
  return { success: true, orderId: orderData.id };
}

export async function createStockOrder(formData: StockOrderFormData, distributorId: number) {
  const supabase = createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!userProfile) {
    return { success: false, error: 'Could not find user profile.' };
  }
  
  // 1. Create the main stock order record
  const { data: stockOrderData, error: stockOrderError } = await supabase
    .from("stock_orders")
    .insert({
      distributor_id: distributorId,
      total_amount: formData.total_amount,
      notes: formData.notes,
      order_date: new Date().toISOString(),
      created_by_user_id: userProfile.id,
      status: 'Pending',
    })
    .select()
    .single();

  if (stockOrderError) {
    console.error("Error creating stock order:", stockOrderError);
    return { success: false, error: stockOrderError.message };
  }

  // 2. Prepare and insert stock order items
  const stockOrderItems = formData.items.map(item => ({
    stock_order_id: stockOrderData.id,
    sku_id: item.sku_id,
    quantity: item.quantity,
    case_price: item.case_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase.from("stock_order_items").insert(stockOrderItems);

  if (itemsError) {
    console.error("Error creating stock order items:", itemsError);
    // Rollback logic
    await supabase.from("stock_orders").delete().eq("id", stockOrderData.id);
    return { success: false, error: `Stock order items could not be saved: ${itemsError.message}` };
  }

  revalidatePath('/dashboard/distributor/stock-orders');
  return { success: true, stockOrderId: stockOrderData.id };
}

export async function updateOrderStatus(orderId: number, status: 'Dispatched' | 'Rejected') {
    const supabase = createServerActionClient({ isAdmin: true });
    
    // Get order details to update outlet due if rejecting
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('outlet_id, total_amount, status')
        .eq('id', orderId)
        .single();
        
    if (fetchError || !order) {
         return { success: false, error: "Could not find order to update." };
    }

    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

    if (error) {
        console.error(`Error updating order ${orderId} to ${status}:`, error);
        return { success: false, error: error.message };
    }

    // If an approved order is rejected, we must reverse the due amount that was added.
    if (status === 'Rejected' && order.status === 'Approved') {
        const { error: rpcError } = await supabase.rpc('update_outlet_due', {
            outlet_uuid: order.outlet_id,
            amount_change: -order.total_amount
        });
         if (rpcError) {
             return { success: false, error: `Order status updated, but failed to update outlet due: ${rpcError.message}` };
        }
    }

    revalidatePath('/dashboard/distributor/orders');
    revalidatePath(`/dashboard/distributor/orders/${orderId}`);
    revalidatePath('/dashboard/outlets');
    return { success: true };
}

export async function recordOrderPayment(orderId: number, paymentAmount: number) {
    const supabase = createServerActionClient({ isAdmin: true });

    // 1. Get the current order details
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('total_amount, amount_paid, outlet_id')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        console.error(`Error fetching order ${orderId} for payment:`, fetchError);
        return { success: false, error: `Could not find order to record payment.` };
    }
    
    // 2. Calculate new payment status
    const newAmountPaid = (order.amount_paid || 0) + paymentAmount;
    let paymentStatus = 'Partially Paid';
    if (newAmountPaid >= order.total_amount) {
        paymentStatus = 'Paid';
    }

    // 3. Update the order
    const { error: updateError } = await supabase
        .from('orders')
        .update({ 
            amount_paid: newAmountPaid,
            payment_status: paymentStatus,
         })
        .eq('id', orderId);

    if (updateError) {
        console.error(`Error recording payment for order ${orderId}:`, updateError);
        return { success: false, error: updateError.message };
    }

     // 4. Decrease the outlet's current_due
    const { error: rpcError } = await supabase.rpc('update_outlet_due', {
        outlet_uuid: order.outlet_id,
        amount_change: -paymentAmount
    });
    if (rpcError) {
        return { success: false, error: `Payment was recorded, but failed to update outlet due: ${rpcError.message}` };
    }

    revalidatePath('/dashboard/distributor/payments');
    revalidatePath('/dashboard/outlets');
    return { success: true };
}

export async function markAttendance(data: AttendanceData) {
    const supabase = createServerActionClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "User not authenticated." };
    }

    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

    if (profileError || !userProfile) {
         return { success: false, error: "Could not find user profile." };
    }

    const userId = userProfile.id;
    const userAuthId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('user_id', userId)
        .gte('checkin_time', `${today}T00:00:00.000Z`)
        .lte('checkin_time', `${today}T23:59:59.999Z`)
        .order('checkin_time', { ascending: false })
        .limit(1)
        .maybeSingle();

    let selfieUrl = '';
    if (data.selfie) {
        const base64 = data.selfie.split(',')[1];
        if (!base64) return { success: false, error: 'Invalid selfie format.' };
        
        const imageBuffer = Buffer.from(base64, 'base64');
        const filePath = `attendance/${userAuthId}/${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('selfies')
            .upload(filePath, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (uploadError) {
            console.error("Selfie upload failed:", uploadError);
            return { success: false, error: "Could not save selfie." };
        }
        
        const { data: { publicUrl } } = supabase.storage.from('selfies').getPublicUrl(filePath);
        selfieUrl = publicUrl;
    }

    if (data.type === 'checkin') {
        if (existingRecord && existingRecord.status === 'Online') {
             return { success: false, error: "You have already started your day." };
        }
        const { error } = await supabase.from('attendance').insert({
            user_id: userId,
            checkin_time: new Date().toISOString(),
            checkin_lat: data.coords.latitude,
            checkin_lng: data.coords.longitude,
            checkin_photo_url: selfieUrl,
            status: 'Online',
        });
        if (error) return { success: false, error: error.message };
        revalidatePath('/salesperson/dashboard');
        return { success: true, message: 'Day started successfully!' };

    } else { // checkout
        if (!existingRecord || existingRecord.status === 'Offline') {
            return { success: false, error: "You have not started your day or have already ended it." };
        }
         const { error } = await supabase.from('attendance').update({
            checkout_time: new Date().toISOString(),
            checkout_lat: data.coords.latitude,
            checkout_lng: data.coords.longitude,
            checkout_photo_url: selfieUrl,
            status: 'Offline',
        }).eq('id', existingRecord.id);

        if (error) return { success: false, error: error.message };
        revalidatePath('/salesperson/dashboard');
        return { success: true, message: 'Day ended successfully!' };
    }
}

export async function updateOrderAndStock(orderId: number, outOfStockItemIds: number[]) {
    const supabase = createServerActionClient({ isAdmin: true });

    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*, skus(units_per_case))')
        .eq('id', orderId)
        .single();
    
    if (fetchError || !order) {
        return { success: false, error: "Order not found." };
    }

    if (order.status !== 'Dispatched') {
        return { success: false, error: "Only dispatched orders can be marked as delivered." };
    }

    // This logic is now handled when the order is created.
    // When marking as delivered, we just confirm the status.
    // Out-of-stock adjustments are done *before* dispatch.

    const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ 
            status: 'Delivered',
         })
        .eq('id', orderId);

    if (updateOrderError) {
        return { success: false, error: `Could not update order status: ${updateOrderError.message}` };
    }
    
    revalidatePath(`/dashboard/distributor/orders/${orderId}`);
    revalidatePath('/dashboard/distributor/orders');
    return { success: true };
}

export async function updateStockOrderStatus(orderId: number, status: string) {
    const supabase = createServerActionClient({ isAdmin: true });

    if (status === 'Delivered') {
        const result = await updateStockAndMarkAsDelivered(orderId);
        // We revalidate paths inside the called function
        return result;
    }

    const { error: updateError } = await supabase
        .from('stock_orders')
        .update({ status })
        .eq('id', orderId);
    
    if (updateError) {
        return { success: false, error: `Failed to update status: ${updateError.message}` };
    }

    revalidatePath('/dashboard/admin/stock-orders');
    revalidatePath('/dashboard/distributor/stock-orders');
    revalidatePath(`/dashboard/stock-orders/${orderId}`);
    return { success: true };
}

async function updateStockAndMarkAsDelivered(orderId: number) {
    const supabase = createServerActionClient({ isAdmin: true });

    const { data: order, error: orderError } = await supabase
        .from('stock_orders')
        .select('*, stock_order_items(*, skus(*))')
        .eq('id', orderId)
        .single();
    
    if (orderError || !order) {
        return { success: false, error: `Failed to fetch order details: ${orderError?.message}` };
    }

    const stockUpdateErrors = [];

    for (const item of order.stock_order_items) {
        const totalUnitsToMove = item.quantity * (item.skus?.units_per_case || 1);

        const { data: existingStock, error: fetchStockError } = await supabase
            .from('distributor_stock')
            .select('id, stock_quantity')
            .eq('distributor_id', order.distributor_id)
            .eq('sku_id', item.sku_id)
            .single();

        if (fetchStockError && fetchStockError.code !== 'PGRST116') { // Ignore "not found" error
            stockUpdateErrors.push(`Error checking stock for SKU ${item.sku_id}: ${fetchStockError.message}`);
            continue;
        }

        if (existingStock) {
            const newStock = (existingStock.stock_quantity || 0) + totalUnitsToMove;
            const { error: updateStockError } = await supabase
                .from('distributor_stock')
                .update({ 
                    stock_quantity: newStock,
                    case_price: item.case_price,
                    mrp: item.skus?.mrp,
                    units_per_case: item.skus?.units_per_case
                })
                .eq('id', existingStock.id);
            if (updateStockError) stockUpdateErrors.push(`Failed to update stock for SKU ${item.sku_id}: ${updateStockError.message}`);
        } else {
            const { error: insertStockError } = await supabase
                .from('distributor_stock')
                .insert({
                    distributor_id: order.distributor_id,
                    sku_id: item.sku_id,
                    stock_quantity: totalUnitsToMove,
                    case_price: item.case_price,
                    mrp: item.skus?.mrp,
                    units_per_case: item.skus?.units_per_case
                });
            if (insertStockError) stockUpdateErrors.push(`Failed to insert stock for SKU ${item.sku_id}: ${insertStockError.message}`);
        }
    }

    if (stockUpdateErrors.length > 0) {
        console.error("Stock update errors:", stockUpdateErrors);
        return { success: false, error: `Order status not updated. Stock update failed: ${stockUpdateErrors.join('; ')}` };
    }

    const { error: updateStatusError } = await supabase
        .from('stock_orders')
        .update({ status: 'Delivered' })
        .eq('id', orderId);

    if (updateStatusError) {
        console.error("Critical error: stock adjusted but failed to update order status.", updateStatusError);
        return { success: false, error: `Critical error: Stock was updated, but failed to mark order as delivered. Please check manually. Error: ${updateStatusError.message}` };
    }
    
    revalidatePath('/dashboard/admin/stock-orders');
    revalidatePath('/dashboard/distributor/skus');
    revalidatePath('/dashboard/distributor/stock-orders');
    revalidatePath(`/dashboard/stock-orders/${orderId}`);
    return { success: true };
}


export async function generateInvoice(orderId?: number, stockOrderId?: number) {
  const supabase = createServerActionClient({ isAdmin: true });

  if (!orderId && !stockOrderId) {
    return { success: false, error: "An order ID or stock order ID is required." };
  }

  let existingInvoiceCheck = supabase.from('invoices').select('id').limit(1);
  if (orderId) {
      existingInvoiceCheck = existingInvoiceCheck.eq('order_id', orderId);
  } else if (stockOrderId) {
      existingInvoiceCheck = existingInvoiceCheck.eq('stock_order_id', stockOrderId);
  }
  const { data: existingInvoice, error: checkError } = await existingInvoiceCheck.maybeSingle();

  if (checkError) {
      console.error("Error checking for existing invoice:", checkError);
      return { success: false, error: `Database error checking for invoice: ${checkError.message}` };
  }
  if (existingInvoice) {
      redirect(`/invoice/${existingInvoice.id}`);
      return { success: true, invoiceId: existingInvoice.id };
  }

  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  let totalAmount = 0;
  let totalDiscount = 0;
  let subTotal = 0;
  let itemsToStore: any[] = [];

  if (orderId) {
    const { data, error } = await supabase
        .from('orders')
        .select('total_amount, total_discount, order_items(*, skus(name, product_code, unit_type))')
        .eq('id', orderId)
        .single();
    if (error || !data) return { success: false, error: "Could not find retail order." };
    
    totalAmount = data.total_amount;
    totalDiscount = data.total_discount || 0;
    subTotal = totalAmount + totalDiscount; // Re-calculate subtotal before discount

    itemsToStore = data.order_items.map(item => ({
        name: item.skus?.name,
        code: item.skus?.product_code,
        weight: item.skus?.unit_type,
        quantity: `${item.quantity} ${item.order_unit_type}`,
        unit_price: item.unit_price,
        total_price: item.total_price // pre-discount price
    }));

    const { error: updateError } = await supabase.from('orders').update({ is_invoice_created: true }).eq('id', orderId);
    if (updateError) console.error("Failed to update invoice status for order:", updateError.message);

  } else if (stockOrderId) {
    const { data, error } = await supabase
        .from('stock_orders')
        .select('total_amount, stock_order_items(*, skus(name, product_code, unit_type, units_per_case))')
        .eq('id', stockOrderId)
        .single();
    if (error || !data) return { success: false, error: "Could not find stock order." };
    
    totalAmount = data.total_amount;
    subTotal = data.total_amount; // No discount for stock orders
    totalDiscount = 0;

    itemsToStore = data.stock_order_items.map(item => ({
        name: item.skus?.name,
        code: item.skus?.product_code,
        weight: item.skus?.unit_type,
        quantity: `${item.quantity} cases`,
        unit_price: item.case_price,
        total_price: item.total_price
    }));

    const { error: updateError } = await supabase.from('stock_orders').update({ is_invoice_created: true }).eq('id', stockOrderId);
    if (updateError) console.error("Failed to update invoice status for stock order:", updateError.message);
  }

  const { data: invoiceData, error: invoiceError } = await supabase.from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      order_id: orderId,
      stock_order_id: stockOrderId,
      total_amount: totalAmount,
      total_discount: totalDiscount,
      subtotal: subTotal,
      items: itemsToStore,
      issue_date: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (invoiceError) {
    console.error("Error creating invoice:", invoiceError);
    return { success: false, error: `Failed to create invoice: ${invoiceError.message}` };
  }

  revalidatePath('/invoice');
  revalidatePath('/dashboard/admin/stock-orders');
  revalidatePath('/dashboard/distributor/orders');
  revalidatePath('/dashboard/distributor/stock-orders');
  redirect(`/invoice/${invoiceData.id}`);
}
