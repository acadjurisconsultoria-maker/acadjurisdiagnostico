import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Tipos de acao auditavel (Plano-de-Seguranca-e-LGPD-v4.md, secao 14):
 * login, visualizacao, criacao, alteracao, exclusao logica, download,
 * alteracao de permissao, revisao, aprovacao, liberacao.
 *
 * Ciclo 0 registra apenas login/logout (os demais tipos entram conforme as
 * telas correspondentes forem implementadas nos proximos ciclos).
 */
export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "view"
  | "create"
  | "update"
  | "soft_delete"
  | "download"
  | "permission_change"
  | "review"
  | "approval"
  | "release";

export interface AuditEventInput {
  actorUserId: string | null;
  action: AuditAction;
  entityTable: string;
  entityId?: string;
  /**
   * Metadados da alteracao (ex.: nome de campo, valores de enum/estado).
   * NUNCA inclua aqui conteudo de documento, resposta de questionario ou
   * qualquer dado pessoal -- apenas referencias e metadados estruturais.
   * Ver comentario da coluna no banco (0001_init_schema.sql).
   */
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  justification?: string;
}

const FORBIDDEN_KEYS = new Set([
  "cpf",
  "rg",
  "email",
  "telefone",
  "endereco",
  "conteudo",
  "texto_resposta",
  "arquivo",
]);

function assertNoSensitiveKeys(value: Record<string, unknown> | undefined, label: string) {
  if (!value) return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(
        `Tentativa de registrar campo potencialmente sensivel ("${key}") em ${label} de evento de auditoria. ` +
          "Registre apenas metadados/referencias, nunca dado pessoal ou conteudo de documento/resposta.",
      );
    }
  }
}

/**
 * Registra um evento de auditoria. Lanca erro (em vez de registrar
 * silenciosamente) se `previousValue`/`newValue` parecerem conter um campo
 * de dado pessoal por nome -- checagem best-effort, nao substitui revisao
 * de codigo, mas evita o erro mais comum (copiar um objeto de dominio
 * inteiro para o log).
 */
export async function recordAuditEvent(
  supabase: SupabaseClient<Database>,
  input: AuditEventInput,
): Promise<void> {
  assertNoSensitiveKeys(input.previousValue, "previousValue");
  assertNoSensitiveKeys(input.newValue, "newValue");

  const { error } = await supabase.from("audit_event").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_table: input.entityTable,
    entity_id: input.entityId ?? null,
    previous_value: input.previousValue ?? null,
    new_value: input.newValue ?? null,
    justification: input.justification ?? null,
  });

  if (error) {
    // Falha ao auditar nunca deve vazar detalhe de erro do banco ao
    // usuario final nem ser logada com dado sensivel -- apenas o tipo de
    // acao que falhou.
    console.error(`Falha ao registrar evento de auditoria (action=${input.action})`);
    throw new Error("Nao foi possivel registrar o evento de auditoria.");
  }
}
