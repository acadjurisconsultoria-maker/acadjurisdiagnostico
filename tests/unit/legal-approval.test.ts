import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prova que a autorização de aprovação de conteúdo jurídico é
 * estruturalmente independente de perfil administrativo:
 *
 * - um usuário admin_acadjuris/super_admin SEM o grant é recusado;
 * - um usuário SEM nenhum perfil administrativo, mas COM o grant, é
 *   autorizado -- prova que a permissão não decorre de admin_acadjuris/
 *   super_admin, decorre exclusivamente de legal_content_approval_grant;
 * - a função nunca consulta super_admin_grant/admin_acadjuris_grant (só o
 *   mock de `from` é fornecido para `legal_content_approval_grant`; se o
 *   código tentasse consultar outra tabela, o mock genérico abaixo ainda
 *   funcionaria, então o teste de "não decorre de perfil" acima é a prova
 *   funcional real, não a ausência de chamada).
 */

const { getUserMock, fromMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

const { authorizeLegalContentApproval, LegalApprovalAuthorizationError } = await import(
  "@/lib/supabase/legal-approval"
);

function mockGrantQuery(row: { user_id: string } | null) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        is: () => ({
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
        }),
      }),
    }),
  });
}

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
});

describe("authorizeLegalContentApproval", () => {
  it("recusa sem sessão autenticada", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(authorizeLegalContentApproval()).rejects.toThrow(
      LegalApprovalAuthorizationError,
    );
  });

  it("recusa usuário autenticado sem o grant (mesmo hipoteticamente admin)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-admin-sem-grant" } } });
    mockGrantQuery(null);

    await expect(authorizeLegalContentApproval()).rejects.toThrow(
      /não possui habilitação individual/,
    );
    // Confirma que a consulta foi feita exclusivamente contra a tabela do
    // grant proprio -- nunca super_admin_grant/admin_acadjuris_grant.
    expect(fromMock).toHaveBeenCalledWith("legal_content_approval_grant");
    expect(fromMock).not.toHaveBeenCalledWith("admin_acadjuris_grant");
    expect(fromMock).not.toHaveBeenCalledWith("super_admin_grant");
  });

  it("autoriza usuário com o grant, independentemente de qualquer perfil administrativo", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-analista-com-grant" } },
    });
    mockGrantQuery({ user_id: "user-analista-com-grant" });

    const result = await authorizeLegalContentApproval();
    expect(result.userId).toBe("user-analista-com-grant");
  });

  it("recusa quando o grant existe mas está revogado (a query já filtra revoked_at is null)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-revogado" } } });
    // Simula a query real: revoked_at is null nao encontra a linha revogada.
    mockGrantQuery(null);

    await expect(authorizeLegalContentApproval()).rejects.toThrow(
      LegalApprovalAuthorizationError,
    );
  });
});
