import { describe, expect, it } from "vitest";
import { recordAuditEvent } from "@/lib/audit";
import { signInAs, SEED_USERS } from "./helpers";

/**
 * Valida a trilha de auditoria contra o banco real: um usuário consegue
 * registrar evento em seu próprio nome (RLS: actor_user_id = auth.uid()),
 * não consegue registrar em nome de outro, e ninguém consegue alterar ou
 * apagar um evento já criado (imutabilidade -- nenhuma policy de
 * UPDATE/DELETE existe para audit_event).
 */
describe("Trilha de auditoria (audit_event) — RLS real", () => {
  it("usuário autenticado registra evento em seu próprio nome com sucesso", async () => {
    const client = await signInAs(SEED_USERS.consultorA);
    const { data: user } = await client.auth.getUser();

    await expect(
      recordAuditEvent(client, {
        actorUserId: user.user!.id,
        action: "view",
        entityTable: "project",
        entityId: undefined,
        justification: "teste de integração — leitura de projeto",
      }),
    ).resolves.toBeUndefined();
  });

  it("usuário autenticado NÃO consegue registrar evento em nome de outro usuário", async () => {
    const clientA = await signInAs(SEED_USERS.consultorA);
    const clientB = await signInAs(SEED_USERS.consultorB);
    const { data: userB } = await clientB.auth.getUser();

    // Tenta, autenticado como A, inserir um evento alegando ser B.
    const { error } = await clientA.from("audit_event").insert({
      actor_user_id: userB.user!.id,
      action: "view",
      entity_table: "project",
    });
    expect(error).not.toBeNull();
  });

  it("evento de auditoria não pode ser alterado após criado", async () => {
    const client = await signInAs(SEED_USERS.consultorA);
    const { data: user } = await client.auth.getUser();

    const { data: inserted, error: insertError } = await client
      .from("audit_event")
      .insert({ actor_user_id: user.user!.id, action: "view", entity_table: "project" })
      .select()
      .single();
    expect(insertError).toBeNull();

    const { data: updated } = await client
      .from("audit_event")
      .update({ action: "update" })
      .eq("id", inserted!.id)
      .select();
    expect(updated ?? []).toHaveLength(0);
  });

  it("evento de auditoria não pode ser excluído após criado", async () => {
    const client = await signInAs(SEED_USERS.consultorA);
    const { data: user } = await client.auth.getUser();

    const { data: inserted } = await client
      .from("audit_event")
      .insert({ actor_user_id: user.user!.id, action: "view", entity_table: "project" })
      .select()
      .single();

    const { data: deleted } = await client
      .from("audit_event")
      .delete()
      .eq("id", inserted!.id)
      .select();
    expect(deleted ?? []).toHaveLength(0);

    // Confirma que o evento ainda existe.
    const { data: stillThere } = await client
      .from("audit_event")
      .select("id")
      .eq("id", inserted!.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it("recordAuditEvent recusa registrar campo com nome de dado pessoal, mesmo contra o banco real", async () => {
    const client = await signInAs(SEED_USERS.consultorA);
    const { data: user } = await client.auth.getUser();

    await expect(
      recordAuditEvent(client, {
        actorUserId: user.user!.id,
        action: "update",
        entityTable: "project",
        newValue: { cpf: "000.000.000-00" },
      }),
    ).rejects.toThrow(/sensível/);
  });
});
