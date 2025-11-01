
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


  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: userMetadata
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return { success: false, error: authError.message };
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
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.adminEmail,
        password: formData.adminPassword,
        email_confirm: true,
        user_metadata: {
            name: formData.adminName,
            role: 'distributor_admin',
            distributor_id: distributorData.id,
            avatar_url: `https://picsum.photos/seed/${formData.adminEmail}/100/100`,
        }
    });

    if (authError) {
        // If user creation fails, roll back the distributor creation for consistency
        await supabaseAdmin.from('distributors').delete().eq('id', distributorData.id);
        console.error('Error creating admin user:', authError);
        return { success: false, error: `Failed to create admin user: ${authError.message}. Distributor creation was rolled back.` };
    }

    // 3. Link the new user's profile ID back to the distributor table
    // The handle_new_user trigger has already created the user profile.
    const { data: newUserProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .single();

    if (profileError || !newUserProfile) {
        console.error('Could not find new user profile to link to distributor', profileError);
        // This is a partial success, but the link is critical.
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
