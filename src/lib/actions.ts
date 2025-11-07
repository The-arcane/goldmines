

"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import type { UserFormData, DistributorFormData, SkuFormData, OrderFormData, AttendanceData, StockOrderFormData } from "./types";
import { revalidatePath } from "next/cache";
import { createServerActionClient } from "./supabaseServer";

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

export async function createNewOrder(formData: OrderFormData, distributorId: number, isDistributorOrder = false) {
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

  let finalStatus = 'Approved';
  let finalOutletId = formData.outlet_id;

  if (isDistributorOrder) {
    finalStatus = 'Pending';
    finalOutletId = undefined; // Distributor orders are not for a specific outlet
  } else {
    // This is a sales exec order for an outlet, check credit limit
    const { data: outlet, error: outletError } = await supabase
      .from('outlets')
      .select('credit_limit, current_due')
      .eq('id', finalOutletId)
      .single();

    if (outletError || !outlet) {
      return { success: false, error: 'Could not find the selected outlet.' };
    }

    const newDueAmount = (outlet.current_due || 0) + formData.total_amount - (formData.amount_paid || 0);

    if (outlet.credit_limit > 0 && newDueAmount > outlet.credit_limit) {
      return { success: false, error: 'This order exceeds the outlets credit limit.' };
    }
  }


  // 2. Create the main order record
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      distributor_id: distributorId,
      outlet_id: finalOutletId,
      status: finalStatus,
      total_amount: formData.total_amount,
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

  // For sales exec orders, update outlet due immediately since it's auto-approved
  if (!isDistributorOrder && finalOutletId) {
      const dueChange = formData.total_amount - (formData.amount_paid || 0);
      if (dueChange !== 0) {
          const { error: rpcError } = await supabase.rpc('update_outlet_due', {
            outlet_uuid: finalOutletId,
            amount_change: dueChange
          });
        
          if (rpcError) {
              await supabase.from("orders").delete().eq("id", orderData.id);
              console.error("Error updating outlet due on order creation:", rpcError);
              return { success: false, error: `Order could not be placed because outlet balance could not be updated: ${rpcError.message}` };
          }
      }
  }


  // 4. Prepare and insert order items
  const orderItems = formData.items.map(item => ({
    order_id: orderData.id,
    sku_id: item.sku_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // Rollback logic
     if (!isDistributorOrder && finalOutletId) {
        const dueChange = formData.total_amount - (formData.amount_paid || 0);
        if (dueChange !== 0) {
            await supabase.rpc('update_outlet_due', {
                outlet_uuid: finalOutletId,
                amount_change: -dueChange
            });
        }
    }
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { success: false, error: `Order items could not be saved: ${itemsError.message}` };
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

export async function updateOrderStatus(orderId: number, status: string) {
    const supabase = createServerActionClient({ isAdmin: true });
    
    // Get order details to update outlet due
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

    // This logic is now mostly for status changes other than Approved/Rejected by distributor
    // e.g., Dispatched, Delivered etc.
    // The credit logic is handled during order creation.
    if (status === 'Rejected' && order.status === 'Approved') {
        // If an approved order is rejected, decrease the outlet's due
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

    // 1. Fetch the order and its items
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();
    
    if (fetchError || !order) {
        return { success: false, error: "Order not found." };
    }

    if (order.status !== 'Dispatched') {
        return { success: false, error: "Only dispatched orders can be marked as delivered." };
    }

    // 2. Mark specified items as out of stock
    if (outOfStockItemIds.length > 0) {
        const { error: updateItemsError } = await supabase
            .from('order_items')
            .update({ is_out_of_stock: true })
            .in('id', outOfStockItemIds);

        if (updateItemsError) {
            return { success: false, error: `Could not mark items as out of stock: ${updateItemsError.message}` };
        }
    }

    // 3. Recalculate total based on in-stock items
    const fulfilledItems = order.order_items.filter(item => !outOfStockItemIds.includes(item.id));
    const newTotalAmount = fulfilledItems.reduce((sum, item) => sum + item.total_price, 0);

    // 4. Update order status and new total
    const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ 
            status: 'Delivered',
            total_amount: newTotalAmount,
            // You might also want to adjust amount_paid or payment_status if logic requires
         })
        .eq('id', orderId);

    if (updateOrderError) {
        return { success: false, error: `Could not update order status: ${updateOrderError.message}` };
    }

    // 5. Update stock for fulfilled items
    if (fulfilledItems.length > 0) {
        const stockUpdates = fulfilledItems.map(item => 
            supabase.rpc('update_sku_stock', {
                sku_id_to_update: item.sku_id,
                quantity_to_decrement: item.quantity,
            })
        );
        
        const results = await Promise.all(stockUpdates);
        const rpcErrors = results.filter(res => res.error);

        if (rpcErrors.length > 0) {
            // This is tricky; the order is delivered but stock might not be updated.
            // A more robust system would use a transactional queue.
            // For now, we return an error indicating partial success.
            console.error('Stock update RPC errors:', rpcErrors);
            return { success: false, error: "Order marked as delivered, but failed to update stock for some items." };
        }
    }

    revalidatePath(`/dashboard/distributor/orders/${orderId}`);
    revalidatePath('/dashboard/distributor/orders');
    revalidatePath('/dashboard/distributor/skus');
    return { success: true };
}

export async function updateStockOrderStatus(orderId: number, status: string) {
    const supabase = createServerActionClient({ isAdmin: true });

    const { data: updatedOrder, error: updateError } = await supabase
        .from('stock_orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
    
    if (updateError) {
        return { success: false, error: `Failed to update status: ${updateError.message}` };
    }

    if (status === 'Shipped') {
        const { data: items, error: itemsError } = await supabase
            .from('stock_order_items')
            .select('*, skus(id, stock_quantity, units_per_case, case_price, mrp)')
            .eq('stock_order_id', orderId);

        if (itemsError) {
            return { success: false, error: `Status updated, but failed to fetch items for stock update: ${itemsError.message}`};
        }

        if (!items) return { success: true };

        const stockUpdateErrors = [];

        for (const item of items) {
            if (!item.skus) continue;

            const totalUnitsToDecrement = item.quantity * (item.skus.units_per_case || 1);

            // Decrement from brand's main stock
            const { error: brandStockError } = await supabase.rpc('update_sku_stock', {
                sku_id_to_update: item.sku_id,
                quantity_to_decrement: totalUnitsToDecrement,
            });

            if (brandStockError) {
                stockUpdateErrors.push(`Failed to decrement brand stock for SKU ${item.sku_id}: ${brandStockError.message}`);
                continue; // Skip updating distributor stock if brand stock fails
            }

            // Upsert into distributor's stock
            const { error: distributorStockError } = await supabase
                .from('distributor_stock')
                .upsert(
                    {
                        distributor_id: updatedOrder.distributor_id,
                        sku_id: item.sku_id,
                        stock_quantity: totalUnitsToDecrement,
                        units_per_case: item.skus.units_per_case,
                        case_price: item.skus.case_price,
                        mrp: item.skus.mrp,
                    },
                    {
                        onConflict: 'distributor_id,sku_id',
                    }
                )
                .select();
                
            if (distributorStockError) {
                stockUpdateErrors.push(`Error upserting distributor stock for SKU ${item.sku_id}: ${distributorStockError.message}`);
            }
        }

        if (stockUpdateErrors.length > 0) {
            console.error('Stock update errors:', stockUpdateErrors);
            return { success: false, error: `Order shipped, but failed to update stock: ${stockUpdateErrors.join(", ")}` };
        }
    }

    revalidatePath('/dashboard/admin/stock-orders');
    revalidatePath('/dashboard/distributor/skus');
    return { success: true };
}
