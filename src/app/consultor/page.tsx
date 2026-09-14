import { redirect } from "next/navigation";
import { getCurrentUserSession } from "@/lib/auth/session";
import { signOutAction } from "@/app/login/actions";

/**
 * Landing minima do Painel do Consultor (Ciclo 0). Confirma apenas que o
 * login e o roteamento por perfil funcionam -- as telas funcionais reais
 * (T-CON-01 em diante) entram a partir do Ciclo 1.
 */
export default async function ConsultorLandingPage() {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.effective.isStaff) {
    redirect("/sem-acesso");
  }

  return (
    <main>
      <h1>Painel do Consultor</h1>
      <p>Sessão ativa: {session.email}</p>
      <p>Perfis: {session.effective.perfis.join(", ") || "nenhum"}</p>
      <p>Projetos atribuídos: {session.effective.staffProjectIds.length}</p>
      <form action={signOutAction}>
        <button type="submit">Sair</button>
      </form>
    </main>
  );
}
