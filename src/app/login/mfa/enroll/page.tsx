import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EnrollMfaForm } from "@/app/login/mfa/enroll/enroll-mfa-form";

/**
 * Passo 2 do login (primeira vez) para perfis internos, para os quais MFA
 * e obrigatorio (Matriz-de-Perfis-e-Permissoes-v5.md, secao 9) e que ainda
 * nao cadastraram um fator.
 */
export default async function EnrollMfaPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();

  // O bucket `totp` de listFactors() so contem fatores ja verificados (por
  // desenho da API) -- qualquer item nele significa que o cadastro ja foi
  // concluido antes.
  if (factorsData && factorsData.totp.length > 0) {
    redirect("/login/mfa");
  }

  // Remove tentativas anteriores de cadastro nao concluidas (fatores TOTP
  // "unverified" em `all`), para nunca acumular fatores orfaos.
  const staleFactors =
    factorsData?.all.filter((f) => f.factor_type === "totp" && f.status === "unverified") ?? [];
  for (const stale of staleFactors) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id });
  }

  const { data: enrollData, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `AcadJuris - ${user.email ?? user.id}`,
  });

  if (error || !enrollData) {
    return (
      <main>
        <h1>Não foi possível iniciar o cadastro de MFA</h1>
        <p className="erro">Tente novamente em instantes ou contate o suporte.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Cadastro obrigatório de autenticação em duas etapas</h1>
      <p>
        Seu perfil exige verificação em duas etapas. Escaneie o QR code abaixo com um
        aplicativo autenticador (Google Authenticator, 1Password, Authy) e informe o
        código gerado.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG de dados, gerado pelo Supabase, nao um asset otimizavel */}
      <img
        src={enrollData.totp.qr_code}
        alt="QR code para cadastro do aplicativo autenticador"
        width={200}
        height={200}
      />
      <p>
        Não consegue escanear? Digite manualmente: <code>{enrollData.totp.secret}</code>
      </p>
      <EnrollMfaForm factorId={enrollData.id} />
    </main>
  );
}
