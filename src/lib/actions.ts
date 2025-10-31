
"use server";

import { flagAnomalousVisit } from "@/ai/flows/flag-anomalous-visits";
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { UserFormData } from "./types";

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

  // If a delivery partner is being created (by anyone), they must be linked to a distributor.
  if (formData.role === 'delivery_partner' && distributorId) {
    userMetadata.distributor_id = distributorId;
  } else if (formData.role === 'delivery_partner' && !distributorId) {
    return { success: false, error: "A distributor must be selected to create a delivery partner."}
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true, // Auto-confirm the user
    user_metadata: userMetadata
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return { success: false, error: authError.message };
  }

  // The database trigger 'on_auth_user_created' handles inserting into the public.users table and the linking table.
  // But we still need to link the distributor admin back to the organization they own.
  if (userMetadata.distributor_id && formData.role === 'distributor_admin') {
      // Wait a moment for the trigger to fire and create the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: newUserProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .single();

      if(profileError || !newUserProfile) {
        console.error('Could not find new user profile to link to distributor', profileError);
        return { success: false, error: 'User was created but could not be linked as admin to the distributor organization.' };
      }

      // Link the new admin user to the distributor entry
      const { error: updateError } = await supabaseAdmin
        .from('distributors')
        .update({ admin_user_id: newUserProfile.id })
        .eq('id', userMetadata.distributor_id);

      if (updateError) {
        console.error('Error linking admin to distributor:', updateError);
        // This is not a fatal error, the user and org exist, just the link is missing. Can be fixed manually.
      }
  }

  return { success: true, user: authData.user };
}
