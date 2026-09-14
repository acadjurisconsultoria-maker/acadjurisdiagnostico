import { describe, expect, it, vi } from "vitest";
import { recordAuditEvent } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function makeMockSupabase(insertResult: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  const supabase = { from } as unknown as SupabaseClient<Database>;
  return { supabase, from, insert };
}

describe("recordAuditEvent", () => {
  it("recusa registrar previousValue com chave que parece dado pessoal", async () => {
    const { supabase, from } = makeMockSupabase({ error: null });

    await expect(
      recordAuditEvent(supabase, {
        actorUserId: "user-1",
        action: "update",
        entityTable: "documento",
        previousValue: { cpf: "000.000.000-00" },
      }),
    ).rejects.toThrow(/sensivel/);

    expect(from).not.toHaveBeenCalled();
  });

  it("recusa registrar newValue com chave que parece conteudo de documento", async () => {
    const { supabase, from } = makeMockSupabase({ error: null });

    await expect(
      recordAuditEvent(supabase, {
        actorUserId: "user-1",
        action: "update",
        entityTable: "documento",
        newValue: { arquivo: "base64..." },
      }),
    ).rejects.toThrow(/sensivel/);

    expect(from).not.toHaveBeenCalled();
  });

  it("registra normalmente quando os metadados nao contem chaves sensiveis", async () => {
    const { supabase, from, insert } = makeMockSupabase({ error: null });

    await recordAuditEvent(supabase, {
      actorUserId: "user-1",
      action: "login",
      entityTable: "auth.users",
      entityId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("audit_event");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_user_id: "user-1", action: "login" }),
    );
  });

  it("propaga falha de insercao como erro generico, sem detalhe interno do banco", async () => {
    const { supabase } = makeMockSupabase({ error: { message: "detalhe interno do postgres" } });

    await expect(
      recordAuditEvent(supabase, {
        actorUserId: "user-1",
        action: "login",
        entityTable: "auth.users",
      }),
    ).rejects.toThrow("Nao foi possivel registrar o evento de auditoria.");
  });
});
