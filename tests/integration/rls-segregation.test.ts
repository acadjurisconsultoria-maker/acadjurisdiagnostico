import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Teste de duas organizacoes ficticias (Plano-de-Testes-de-Seguranca-do-
 * MVP-v1.md, secao 1) -- criterio de saida do Ciclo 0.
 *
 * NAO RODA no `npm test` padrao (excluido em vitest.config.ts) porque exige
 * uma instancia Supabase local em execucao:
 *
 *   1. `supabase start`               (requer Docker -- indisponivel neste
 *                                       ambiente de desenvolvimento nesta
 *                                       rodada, ver README.md deste diretorio)
 *   2. `supabase db reset`            (aplica as migrations)
 *   3. `node supabase/seed/seed-fictitious.mjs`
 *   4. `npx vitest run tests/integration`
 *
 * Critério de aprovação: TODA tentativa de um usuário da Organização A de
 * ler/criar/alterar/excluir dado da Organização B retorna vazio ou erro de
 * permissão -- nunca dado real de B.
 */

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const SENHA_TESTE = "SenhaTeste!2026";

async function signInAs(email: string): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: SENHA_TESTE,
  });
  if (error) {
    throw new Error(
      `Falha ao autenticar ${email} -- rode o seed antes deste teste (ver instrucoes no topo do arquivo). Detalhe: ${error.message}`,
    );
  }
  return client;
}

describe("Segregação entre duas organizações fictícias", () => {
  let clienteA: SupabaseClient;
  let clienteB: SupabaseClient;
  let orgBId: string;
  let projectBId: string;

  beforeAll(async () => {
    clienteA = await signInAs("cliente.a@teste.acadjuris.local");
    clienteB = await signInAs("cliente.b@teste.acadjuris.local");

    // Descobre os IDs reais de B autenticado como B (visao legitima) para
    // usa-los nas tentativas de acesso cruzado feitas como A.
    const { data: orgB } = await clienteB
      .from("organization")
      .select("id")
      .single();
    if (!orgB) throw new Error("Seed nao encontrado -- rode o seed antes deste teste.");
    orgBId = orgB.id;

    const { data: projectB } = await clienteB.from("project").select("id").single();
    if (!projectB) throw new Error("Projeto de B nao encontrado no seed.");
    projectBId = projectB.id;
  });

  it("cliente A não enxerga a organização B via listagem", async () => {
    const { data } = await clienteA.from("organization").select("id");
    expect(data?.some((row) => row.id === orgBId)).toBe(false);
  });

  it("cliente A não consegue ler a organização B por ID direto", async () => {
    const { data, error } = await clienteA
      .from("organization")
      .select("*")
      .eq("id", orgBId)
      .maybeSingle();
    expect(data).toBeNull();
    expect(error).toBeNull(); // RLS filtra silenciosamente -- nao é erro, é ausência.
  });

  it("cliente A não consegue ler o projeto de B por ID direto", async () => {
    const { data } = await clienteA
      .from("project")
      .select("*")
      .eq("id", projectBId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("cliente A não consegue alterar a organização B", async () => {
    const { data, error } = await clienteA
      .from("organization")
      .update({ name: "Nome adulterado por A" })
      .eq("id", orgBId)
      .select();
    // RLS bloqueia a policy de UPDATE (nem staff nem cliente de A tem
    // has_client_access_to_organization(orgB)) -- 0 linhas afetadas.
    expect(data ?? []).toHaveLength(0);
    expect(error).toBeNull();
  });

  it("cliente A não consegue vincular-se à organização B (client_access)", async () => {
    const { error } = await clienteA.from("client_access").insert({
      user_id: (await clienteA.auth.getUser()).data.user?.id,
      organization_id: orgBId,
    });
    // Policy de INSERT em client_access exige is_privileged_staff() --
    // um cliente comum nunca passa, mesmo tentando se auto-conceder acesso.
    expect(error).not.toBeNull();
  });
});
