"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { landingPathFor, requiresMfa } from "@/lib/auth/perfis";
import { recordAuditEvent } from "@/lib/audit";

export interface LoginFormState {
  error: string | null;
}

/**
 * Passo 1 do login: e-mail + senha. Nunca registra a senha em log ou em
 * evento de auditoria -- apenas o resultado (sucesso/falha) e o e-mail
 * informado (identificador, nao segredo).
 */
export async function signInAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordAuditEvent(supabase, {
      actorUserId: null,
      action: "login_failed",
      entityTable: "auth.users",
      justification: `Falha de login para e-mail informado (motivo: ${error?.name ?? "desconhecido"}).`,
    });
    return { error: "E-mail ou senha invalidos." };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    // Usuario ja tem fator MFA cadastrado -- precisa completar o desafio.
    redirect("/login/mfa");
  }

  if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal1") {
    // Nenhum fator MFA cadastrado ainda -- verifica se o perfil exige.
    const session = await getCurrentUserSession();
    if (session && requiresMfa(session.effective)) {
      redirect("/login/mfa/enroll");
    }
  }

  await recordAuditEvent(supabase, {
    actorUserId: data.user.id,
    action: "login",
    entityTable: "auth.users",
    entityId: data.user.id,
  });

  const session = await getCurrentUserSession();
  redirect(session ? landingPathFor(session.effective) : "/sem-acesso");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordAuditEvent(supabase, {
      actorUserId: user.id,
      action: "logout",
      entityTable: "auth.users",
      entityId: user.id,
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}
