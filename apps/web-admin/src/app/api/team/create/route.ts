import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ROLE_BASE_PERMISSIONS, AdminRole } from "@/lib/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, email, password, admin_role, custom_permissions } = body;

    if (!full_name || !email || !password || !admin_role) {
      return NextResponse.json(
        { error: "Tous les champs (nom, email, mot de passe, rôle) sont obligatoires." },
        { status: 400 }
      );
    }

    let userId: string | null = null;

    // 1. Try to create user with service role (auto confirm)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "admin",
          admin_role,
        },
      });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }

      userId = userData.user.id;
    } else {
      // Fallback to standard sign up
      const { data: signData, error: signErr } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role: "admin",
            admin_role,
          },
        },
      });

      if (signErr) {
        return NextResponse.json({ error: signErr.message }, { status: 400 });
      }

      userId = signData.user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Impossible de générer l'identifiant du collaborateur." }, { status: 500 });
    }

    // 2. Upsert in profiles table
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name,
      role: "admin",
      admin_role,
    });

    if (profErr) {
      console.error("Error upserting profile:", profErr);
    }

    // 3. Upsert in admin_permissions table
    const basePerms = ROLE_BASE_PERMISSIONS[admin_role as AdminRole] || {};
    const { error: permErr } = await supabaseAdmin.from("admin_permissions").upsert({
      user_id: userId,
      ...basePerms,
      custom_permissions: custom_permissions || {},
      updated_at: new Date().toISOString(),
    });

    if (permErr) {
      console.error("Error upserting admin_permissions:", permErr);
    }

    return NextResponse.json({
      success: true,
      userId,
      message: `Collaborateur ${full_name} (${email}) créé avec succès.`,
    });
  } catch (err: unknown) {
    console.error("Error in /api/team/create:", err);
    const msg = err instanceof Error ? err.message : "Erreur interne lors de la création du collaborateur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
