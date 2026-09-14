import { describe, expect, it } from "vitest";
import { generateTotp } from "@/lib/mfa/totp";
import { anonClient, signInAs, SENHA_TESTE, SEED_USERS } from "./helpers";

/**
 * Testes reais de autenticação e MFA contra o projeto Supabase de
 * desenvolvimento -- exercitam a mesma API (`supabase.auth.*`,
 * `supabase.auth.mfa.*`) usada por src/app/login/**, apenas conduzida
 * diretamente via supabase-js em vez de through Server Actions do Next.js
 * (que exigiriam servidor HTTP rodando + navegador para um teste
 * verdadeiramente end-to-end de UI -- fora do escopo deste gate).
 */

describe("Login real (e-mail/senha)", () => {
  it("autentica com credenciais válidas de um usuário semeado", async () => {
    const client = await signInAs(SEED_USERS.consultorA);
    const { data } = await client.auth.getUser();
    expect(data.user).not.toBeNull();
    expect(data.user?.email).toBe(SEED_USERS.consultorA);
  });

  it("recusa senha incorreta", async () => {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: SEED_USERS.consultorA,
      password: "senha-definitivamente-errada",
    });
    expect(error).not.toBeNull();
  });

  it("recusa e-mail inexistente", async () => {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: "nao.existe@teste.acadjuris.local",
      password: SENHA_TESTE,
    });
    expect(error).not.toBeNull();
  });
});

describe("MFA real (TOTP) — perfis internos", () => {
  it("fluxo completo: enroll -> challenge -> verify -> AAL sobe para aal2", async () => {
    // Usa o Analista/Auditor de B para nao colidir com fatores ja
    // cadastrados em execucoes anteriores deste teste sobre outros
    // usuarios (cada usuario semeado comeca sem fator MFA).
    const client = await signInAs(SEED_USERS.analistaB);

    const before = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(before.data?.currentLevel).toBe("aal1");

    // Limpa fatores de execucoes anteriores deste mesmo teste, para que a
    // suite seja re-executavel sem intervencao manual.
    const { data: existing } = await client.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      await client.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data: enrolled, error: enrollError } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `teste-integracao-${Date.now()}`,
    });
    expect(enrollError).toBeNull();
    expect(enrolled?.totp.secret).toBeTruthy();

    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
      factorId: enrolled!.id,
    });
    expect(challengeError).toBeNull();

    const code = generateTotp(enrolled!.totp.secret);
    const { error: verifyError } = await client.auth.mfa.verify({
      factorId: enrolled!.id,
      challengeId: challenge!.id,
      code,
    });
    expect(verifyError).toBeNull();

    const after = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(after.data?.currentLevel).toBe("aal2");

    // Limpeza: remove o fator para nao deixar estado residual entre execucoes.
    await client.auth.mfa.unenroll({ factorId: enrolled!.id });
  }, 30_000);

  it("código TOTP incorreto é recusado na verificação", async () => {
    const client = await signInAs(SEED_USERS.consultorB);

    const { data: existing } = await client.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      await client.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data: enrolled } = await client.auth.mfa.enroll({ factorType: "totp" });
    const { data: challenge } = await client.auth.mfa.challenge({ factorId: enrolled!.id });

    const { error: verifyError } = await client.auth.mfa.verify({
      factorId: enrolled!.id,
      challengeId: challenge!.id,
      code: "000000",
    });
    expect(verifyError).not.toBeNull();

    await client.auth.mfa.unenroll({ factorId: enrolled!.id });
  }, 30_000);
});
