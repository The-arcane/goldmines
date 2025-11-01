
"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { UserFormData, DistributorFormData } from "./types";

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
  } else if (formData.role === 'delivery_partner' && !distributorId) {
    return { success: false, error: "A distributor must be selected to create a delivery partner."}
  }
  
  if (formData.role === 'distributor_admin' && !distributorId) {
    return { success: false, error: "This form cannot create a distributor admin without an organization. Please use the Distributors page."}
  }

  // Step 1: Create the user in auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      name: formData.name, // Pass name for trigger
      avatar_url: `https://picsum.photos/seed/${formData.email}/100/100`
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

  const roleMap: { [key in UserFormData['role']]: number } = {
    'admin': 1,
    'sales_executive': 2,
    'distributor_admin': 3,
    'delivery_partner': 4
  };

  // Step 2: Create the corresponding profile in public.users
  const { data: profileData, error: profileError } = await supabaseAdmin.from('users').insert({
    auth_id: authUser.id,
    name: formData.name,
    email: formData.email,
    role: roleMap[formData.role],
    avatar_url: userMetadata.avatar_url
  }).select().single();

  if (profileError) {
    console.error('Error creating user profile:', profileError);
    // Rollback auth user creation for consistency
    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    return { success: false, error: `Failed to create user profile: ${profileError.message}` };
  }

  // Step 3: If delivery partner or distributor admin, link them in the junction table
  if ((formData.role === 'delivery_partner' || formData.role === 'distributor_admin') && distributorId) {
    const { error: linkError } = await supabaseAdmin.from('distributor_users').insert({
      distributor_id: distributorId,
      user_id: profileData.id
    });
    
    if (linkError) {
       console.error('Error linking user to distributor:', linkError);
       // Rollback both profile and auth user
       await supabaseAdmin.from('users').delete().eq('id', profileData.id);
       await supabaseAdmin.auth.admin.deleteUser(authUser.id);
       return { success: false, error: `User created, but failed to link to distributor: ${linkError.message}` };
    }
  }


  return { success: true, user: authData.user };
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

    return { success: true };
}
