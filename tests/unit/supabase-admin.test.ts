import { describe, expect, it } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Verifica a barreira de autorizacao do cliente privilegiado de servidor
 * (regra de produto: nenhum uso silencioso, sempre com perfil + operacao
 * declarados). Nao testa conectividade real com o Supabase -- a
 * construcao do cliente (`createClient`) nao faz chamada de rede.
 */
describe("createSupabaseAdminClient", () => {
  it("recusa perfis nao autorizados", () => {
    expect(() =>
      createSupabaseAdminClient({
        // @ts-expect-error -- testando deliberadamente um perfil invalido
        actingPerfil: "consultor_responsavel",
        operation: "tentativa indevida",
      }),
    ).toThrow(/não está autorizado/);
  });

  it("recusa quando a operacao nao e descrita", () => {
    expect(() =>
      createSupabaseAdminClient({
        actingPerfil: "admin_acadjuris",
        operation: "",
      }),
    ).toThrow(/descrição da operação/);
  });

  it("permite super_admin com operacao descrita", () => {
    expect(() =>
      createSupabaseAdminClient({
        actingPerfil: "super_admin",
        operation: "teste unitário — revogação em cascata",
      }),
    ).not.toThrow();
  });

  it("permite admin_acadjuris com operacao descrita", () => {
    expect(() =>
      createSupabaseAdminClient({
        actingPerfil: "admin_acadjuris",
        operation: "teste unitário — gestão de metodologia",
      }),
    ).not.toThrow();
  });
});
