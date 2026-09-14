import { signOutAction } from "@/app/login/actions";

/**
 * Exibida quando o login foi bem-sucedido, mas o usuario nao tem nenhum
 * vinculo ativo (nem equipe interna, nem cliente) -- nunca deve acontecer
 * em uso normal, mas evita que um usuario autenticado sem grants veja uma
 * tela de outro perfil por engano.
 */
export default function SemAcessoPage() {
  return (
    <main>
      <h1>Sem acesso configurado</h1>
      <p>
        Sua conta foi autenticada, mas ainda não tem nenhum vínculo de acesso
        configurado. Contate o administrador do sistema.
      </p>
      <form action={signOutAction}>
        <button type="submit">Sair</button>
      </form>
    </main>
  );
}
