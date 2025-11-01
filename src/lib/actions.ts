
"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { UserFormData, DistributorFormData, SkuFormData, OrderFormData } from "./types";
import { revalidatePath } from "next/cache";

export async function checkVisitAnomaly(visitDetails: string, criteria: string) {
  try {
    const result = await flagAnomalousVisit({ visitDetails, criteria });
    return { data: result };
  } catch (error) {
    console.error("Error checking visit anomaly:", error);
    return { error: "Failed to communicate with the AI service." };
  }
}

export async function createNewUser(formData: UserFormData, distributorId?: string) {
  const cookieStore = cookies()

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: (name: string) => cookieStore.get(name)?.value },
    }
  )

  const userMetadata: {[key: string]: any} = {
      name: formData.name,
      role: formData.role,
      avatar_url: `https://picsum.photos/seed/${formData.email}/100/100`,
  };
  
  if ((formData.role === 'delivery_partner' || formData.role === 'distributor_admin') && distributorId) {
    userMetadata.distributor_id = distributorId;
  }
  
  // Step 1: Create the user in auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: userMetadata,
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return { success: false, error: authError.message };
  }
  
  const authUser = authData.user;
  if (!authUser) {
    return { success: false, error: "Auth user was not created." };
  }

  const roleInt = (() => {
    switch (formData.role) {
      case 'admin': return 1;
      case 'sales_executive': return 2;
      case 'distributor_admin': return 3;
      case 'delivery_partner': return 4;
      default: return 2;
    }
  })();

  // Step 2: Manually create the user profile in public.users
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: authUser.id,
      name: formData.name,
      email: formData.email,
      role: roleInt,
      avatar_url: userMetadata.avatar_url,
    })
    .select('id')
    .single();

  if (profileError) {
    console.error('Error creating user profile:', profileError);
    // Attempt to clean up the auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    return { success: false, error: `Failed to create user profile: ${profileError.message}` };
  }
  
  const newUserId = profileData.id;

  // Step 3: If it's a distributor user, link them in the junction table
  if ((formData.role === 'delivery_partner' || formData.role === 'distributor_admin') && distributorId) {
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
    const cookieStore = cookies()
    const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: { get: (name: string) => cookieStore.get(name)?.value },
        }
    );

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
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

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
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // 1. Check outlet credit limit
  const { data: outlet, error: outletError } = await supabase
    .from('outlets')
    .select('credit_limit, current_due')
    .eq('id', formData.outlet_id)
    .single();

  if (outletError || !outlet) {
    return { success: false, error: 'Could not find the selected outlet.' };
  }

  if (outlet.credit_limit > 0 && (outlet.current_due + formData.total_value) > outlet.credit_limit) {
    return { success: false, error: 'This order exceeds the outlets credit limit.' };
  }


  // 2. Create the main order record
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      distributor_id: distributorId,
      outlet_id: formData.outlet_id,
      status: "Pending",
      total_value: formData.total_value,
      order_date: new Date().toISOString(),
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
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // Rollback the order creation if items fail
    await supabase.from("orders").delete().eq("id", orderData.id);
    return { success: false, error: `Order items could not be saved: ${itemsError.message}` };
  }

  revalidatePath("/dashboard/distributor/orders");
  revalidatePath("/dashboard/distributor");
  return { success: true, orderId: orderData.id };
}

export async function updateOrderStatus(orderId: number, status: string) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );
    
    // Get order details to update outlet due
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('outlet_id, total_value, status')
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

    // If order is approved, increase the outlet's current_due
    if (status === 'Approved' && order.status !== 'Approved') {
        const { error: rpcError } = await supabase.rpc('update_outlet_due', {
            outlet_uuid: order.outlet_id,
            amount_change: order.total_value
        });
        if (rpcError) {
             return { success: false, error: `Order status updated, but failed to update outlet due: ${rpcError.message}` };
        }
    } else if (status === 'Rejected' && order.status === 'Approved') {
        // If an approved order is rejected, decrease the outlet's due
        const { error: rpcError } = await supabase.rpc('update_outlet_due', {
            outlet_uuid: order.outlet_id,
            amount_change: -order.total_value
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
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );

    // 1. Get the current order details
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('total_value, amount_paid, outlet_id')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        console.error(`Error fetching order ${orderId} for payment:`, fetchError);
        return { success: false, error: `Could not find order to record payment.` };
    }
    
    // 2. Calculate new payment status
    const newAmountPaid = (order.amount_paid || 0) + paymentAmount;
    let paymentStatus = 'Partially Paid';
    if (newAmountPaid >= order.total_value) {
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
