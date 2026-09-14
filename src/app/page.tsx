import { redirect } from "next/navigation";
import { getCurrentUserSession } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/auth/perfis";

/**
 * Rota raiz: apenas decide para onde redirecionar. Nenhum conteudo proprio.
 */
export default async function HomePage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/login");
  }

  redirect(landingPathFor(session.effective));
}
