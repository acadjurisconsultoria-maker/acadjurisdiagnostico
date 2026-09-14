import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signInAs, SEED_USERS } from "./helpers";

/**
 * Teste de duas organizações fictícias (Plano-de-Testes-de-Seguranca-do-
 * MVP-v1.md, seção 1) -- critério de saída do Ciclo 0. Cobre a matriz
 * completa exigida: SELECT (listagem e ID direto), INSERT, UPDATE, DELETE,
 * acesso a empresa/unidade/projeto, falsificação de organization_id,
 * falsificação de perfil e de operação administrativa -- nos dois
 * sentidos (A→B e B→A).
 *
 * NÃO RODA no `npm test` padrão (excluído em vitest.config.ts) porque
 * exige um projeto Supabase de desenvolvimento real, vinculado, com as
 * migrations aplicadas e o seed executado. Ver tests/integration/README.md.
 *
 * Critério de aprovação: TODA tentativa indevida retorna vazio/0 linhas ou
 * erro de permissão -- nunca dado real da outra organização.
 */

interface OrgContext {
  label: "A" | "B";
  client: SupabaseClient;
  organizationId: string;
  companyId: string;
  unitId: string;
  projectId: string;
}

async function loadOrgContext(label: "A" | "B", email: string): Promise<OrgContext> {
  const client = await signInAs(email);
  const { data: org } = await client.from("organization").select("id").single();
  if (!org) throw new Error(`Seed não encontrado para organização ${label}.`);
  const { data: company } = await client.from("company").select("id").eq("organization_id", org.id).single();
  const { data: unit } = await client.from("unit").select("id").eq("company_id", company!.id).single();
  const { data: project } = await client.from("project").select("id").eq("unit_id", unit!.id).single();
  return {
    label,
    client,
    organizationId: org.id,
    companyId: company!.id,
    unitId: unit!.id,
    projectId: project!.id,
  };
}

let ctxA: OrgContext;
let ctxB: OrgContext;
let analistaA: SupabaseClient;
let analistaB: SupabaseClient;
let adminAcadjuris: SupabaseClient;

beforeAll(async () => {
  ctxA = await loadOrgContext("A", SEED_USERS.clienteA);
  ctxB = await loadOrgContext("B", SEED_USERS.clienteB);
  analistaA = await signInAs(SEED_USERS.analistaA);
  analistaB = await signInAs(SEED_USERS.analistaB);
  adminAcadjuris = await signInAs(SEED_USERS.adminAcadjuris);
}, 30_000);

/** [atacante, alvo] -- roda cada bloco de teste nos dois sentidos. */
function pairs(): Array<[() => OrgContext, () => OrgContext]> {
  return [
    [() => ctxA, () => ctxB],
    [() => ctxB, () => ctxA],
  ];
}

describe.each(pairs())("Cliente de uma organização contra outra (%s)", (getAttacker, getTarget) => {
  it("SELECT — não lista a organização alvo", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client.from("organization").select("id");
    expect(data?.some((row) => row.id === target.organizationId)).toBe(false);
  });

  it("SELECT — não lê a organização alvo por ID direto", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data, error } = await attacker.client
      .from("organization")
      .select("*")
      .eq("id", target.organizationId)
      .maybeSingle();
    expect(data).toBeNull();
    expect(error).toBeNull(); // RLS filtra silenciosamente -- ausência, não erro.
  });

  it("SELECT — não lê a empresa (company) do alvo por ID direto", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client
      .from("company")
      .select("*")
      .eq("id", target.companyId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("SELECT — não lê a unidade (unit) do alvo por ID direto", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client.from("unit").select("*").eq("id", target.unitId).maybeSingle();
    expect(data).toBeNull();
  });

  it("SELECT — não lê o projeto do alvo por ID direto (identificador conhecido)", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client
      .from("project")
      .select("*")
      .eq("id", target.projectId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("UPDATE — não altera a organização alvo", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data, error } = await attacker.client
      .from("organization")
      .update({ name: "Nome adulterado" })
      .eq("id", target.organizationId)
      .select();
    expect(data ?? []).toHaveLength(0);
    expect(error).toBeNull();
  });

  it("UPDATE — não altera o projeto alvo", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client
      .from("project")
      .update({ name: "Nome adulterado" })
      .eq("id", target.projectId)
      .select();
    expect(data ?? []).toHaveLength(0);
  });

  it("DELETE — não exclui a organização alvo (nem sequer a própria, salvo super_admin)", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data } = await attacker.client
      .from("organization")
      .delete()
      .eq("id", target.organizationId)
      .select();
    expect(data ?? []).toHaveLength(0);
  });

  it("INSERT — não vincula-se (client_access) à organização alvo", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { data: user } = await attacker.client.auth.getUser();
    const { error } = await attacker.client
      .from("client_access")
      .insert({ user_id: user.user?.id, organization_id: target.organizationId });
    expect(error).not.toBeNull();
  });

  it("INSERT — tentativa de falsificar organization_id ao criar company não é aceita (usuário comum não é staff privilegiado)", async () => {
    const attacker = getAttacker();
    const target = getTarget();
    const { error } = await attacker.client
      .from("company")
      .insert({ organization_id: target.organizationId, name: "Empresa forjada" });
    expect(error).not.toBeNull();
  });
});

describe("Falsificação de perfil / operação administrativa (usuário comum não privilegiado)", () => {
  it("cliente A não consegue se autoconceder super_admin_grant", async () => {
    const { data: user } = await ctxA.client.auth.getUser();
    const { error } = await ctxA.client.from("super_admin_grant").insert({ user_id: user.user?.id });
    expect(error).not.toBeNull();
  });

  it("cliente A não consegue se autoconceder admin_acadjuris_grant", async () => {
    const { data: user } = await ctxA.client.auth.getUser();
    const { error } = await ctxA.client.from("admin_acadjuris_grant").insert({ user_id: user.user?.id });
    expect(error).not.toBeNull();
  });

  it("analista de A não consegue se autoconceder staff_project_access como consultor_responsavel", async () => {
    const { data: user } = await analistaA.auth.getUser();
    const { error } = await analistaA
      .from("staff_project_access")
      .insert({ user_id: user.user?.id, project_id: ctxA.projectId, perfil: "consultor_responsavel" });
    expect(error).not.toBeNull();
  });

  it("analista de A (staff, mas não privilegiado) não consegue conceder client_access a si mesmo em outro projeto", async () => {
    const { data: user } = await analistaA.auth.getUser();
    const { error } = await analistaA
      .from("client_access")
      .insert({ user_id: user.user?.id, organization_id: ctxB.organizationId });
    expect(error).not.toBeNull();
  });

  it("analista de A não consegue se autoconceder legal_content_approval_grant", async () => {
    const { data: user } = await analistaA.auth.getUser();
    const { error } = await analistaA
      .from("legal_content_approval_grant")
      .insert({ user_id: user.user?.id });
    expect(error).not.toBeNull();
  });

  it("admin_acadjuris NÃO possui, por si só, linha em legal_content_approval_grant (competência não é automática)", async () => {
    const { data: user } = await adminAcadjuris.auth.getUser();
    const { data } = await adminAcadjuris
      .from("legal_content_approval_grant")
      .select("user_id")
      .eq("user_id", user.user?.id ?? "")
      .is("revoked_at", null)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("advogado habilitado (sem nenhum perfil administrativo) POSSUI a habilitação de aprovação jurídica", async () => {
    const advogado = await signInAs(SEED_USERS.advogadoHabilitado);
    const { data: user } = await advogado.auth.getUser();
    const { data } = await advogado
      .from("legal_content_approval_grant")
      .select("user_id")
      .eq("user_id", user.user?.id ?? "")
      .is("revoked_at", null)
      .maybeSingle();
    expect(data).not.toBeNull();
  });
});
