"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/auth/perfis";
import { recordAuditEvent } from "@/lib/audit";

export interface MfaFormState {
  error: string | null;
}

/**
 * Confirma o cadastro de um novo fator TOTP: gera um desafio para o fator
 * recem-criado e verifica o primeiro codigo informado pelo usuario.
 */
export async function verifyEnrollmentAction(
  _prevState: MfaFormState,
  formData: FormData,
): Promise<MfaFormState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!factorId || !code) {
    return { error: "Informe o codigo do aplicativo autenticador." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError || !challenge) {
    return { error: "Nao foi possivel iniciar a verificacao. Tente novamente." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    // Codigo invalido -- o fator MFA em status "unverified" pode ser
    // removido e recriado pelo usuario tentando novamente (a tela de
    // enrollment gera um novo fator a cada carregamento se o anterior
    // nao foi verificado).
    return { error: "Codigo invalido. Escaneie o QR novamente e tente outra vez." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordAuditEvent(supabase, {
      actorUserId: user.id,
      action: "permission_change",
      entityTable: "auth.mfa_factors",
      entityId: factorId,
      justification: "Cadastro de fator de autenticacao multifator (MFA) concluido.",
    });
    await recordAuditEvent(supabase, {
      actorUserId: user.id,
      action: "login",
      entityTable: "auth.users",
      entityId: user.id,
      justification: "Login concluido apos cadastro e verificacao de MFA.",
    });
  }

  const session = await getCurrentUserSession();
  redirect(session ? landingPathFor(session.effective) : "/sem-acesso");
}
