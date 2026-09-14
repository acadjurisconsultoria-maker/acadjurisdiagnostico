import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "@/app/login/mfa/mfa-challenge-form";

/**
 * Passo 2 do login para usuarios que ja possuem um fator MFA cadastrado.
 * Server Component: busca o fator existente antes de renderizar o
 * formulario cliente.
 */
export default async function MfaChallengePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  // O bucket `totp` de listFactors() so contem fatores ja verificados.
  const totpFactor = factorsData?.totp[0];

  if (!totpFactor) {
    // Nenhum fator verificado -- o usuario precisa cadastrar um antes de
    // continuar (nao deveria chegar aqui normalmente, ver login/actions.ts).
    redirect("/login/mfa/enroll");
  }

  return (
    <main>
      <h1>Verificação em duas etapas</h1>
      <p>Digite o código do seu aplicativo autenticador.</p>
      <MfaChallengeForm factorId={totpFactor.id} />
    </main>
  );
}
