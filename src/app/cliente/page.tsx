import { redirect } from "next/navigation";
import { getCurrentUserSession } from "@/lib/auth/session";
import { signOutAction } from "@/app/login/actions";

/**
 * Landing minima do Painel da Cliente (Ciclo 0). Confirma apenas que o
 * login e o roteamento por perfil funcionam -- as telas funcionais reais
 * (T-CLI-01 em diante) entram a partir do Ciclo 1.
 */
export default async function ClienteLandingPage() {
  const session = await getCurrentUserSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.effective.isClient) {
    redirect("/sem-acesso");
  }

  return (
    <main>
      <h1>Painel da Cliente</h1>
      <p>Sessão ativa: {session.email}</p>
      <p>Organizações com acesso: {session.effective.clientOrganizationIds.length}</p>
      <form action={signOutAction}>
        <button type="submit">Sair</button>
      </form>
    </main>
  );
}
