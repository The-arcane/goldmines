"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { UserFormData, UserRole } from "./types";
import { supabase } from "./supabaseClient";

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

  // Note: This uses the service_role key, which should only be done in a secure server environment.
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  const userMetadata: {[key: string]: any} = {
      name: formData.name,
      role: formData.role,
      avatar_url: `https://picsum.photos/seed/${formData.email}/100/100`,
  };

  if (formData.role === 'distributor_admin') {
      // 1. Create the distributor organization first
      const { data: distributorData, error: distributorError } = await supabaseAdmin
        .from('distributors')
        .insert({ name: `${formData.name}'s Group` }) // Or use a company name field
        .select()
        .single();
      
      if (distributorError) {
          console.error('Error creating distributor:', distributorError);
          return { success: false, error: `Failed to create distributor organization: ${distributorError.message}` };
      }
      userMetadata.distributor_id = distributorData.id;
  }

  if (formData.role === 'delivery_partner' && distributorId) {
    userMetadata.distributor_id = distributorId;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Auto-confirm the user
    user_metadata: userMetadata
  });

  if (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }

  // If a distributor_admin was created, link them to their new organization
  if (userMetadata.distributor_id && formData.role === 'distributor_admin') {
      const { data: newUserProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_id', data.user.id)
        .single();

      if(profileError || !newUserProfile) {
        // This is a problem, but the auth user was already created.
        console.error('Could not find new user profile to link to distributor', profileError);
        return { success: false, error: 'User was created but could not be linked to the distributor organization.' };
      }

      // Link the new admin user to the distributor entry
      const { error: updateError } = await supabaseAdmin
        .from('distributors')
        .update({ admin_user_id: newUserProfile.id })
        .eq('id', userMetadata.distributor_id);

      if (updateError) {
        console.error('Error linking admin to distributor:', updateError);
      }

      // Also add them to the distributor_users link table
      const { error: linkError } = await supabaseAdmin
        .from('distributor_users')
        .insert({ distributor_id: userMetadata.distributor_id, user_id: newUserProfile.id });
      
      if (linkError) {
        console.error('Error adding admin to distributor_users table:', linkError);
      }
  }


  // The database trigger 'on_auth_user_created' will handle inserting into the public.users table.
  return { success: true, user: data.user };
}
