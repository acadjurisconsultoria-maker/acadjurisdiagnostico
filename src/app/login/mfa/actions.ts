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
 * Verifica o codigo TOTP informado pelo usuario contra o fator MFA ja
 * cadastrado (fluxo de login normal, nao de primeiro cadastro do fator --
 * ver src/app/login/mfa/enroll/actions.ts para o cadastro).
 */
export async function verifyMfaChallengeAction(
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
    return { error: "Codigo invalido ou expirado." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await recordAuditEvent(supabase, {
      actorUserId: user.id,
      action: "login",
      entityTable: "auth.users",
      entityId: user.id,
      justification: "Login concluido apos verificacao MFA.",
    });
  }

  const session = await getCurrentUserSession();
  redirect(session ? landingPathFor(session.effective) : "/sem-acesso");
}
