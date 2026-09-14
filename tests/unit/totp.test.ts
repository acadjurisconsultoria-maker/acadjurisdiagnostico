import { describe, expect, it } from "vitest";
import { generateTotp } from "@/lib/mfa/totp";

/**
 * Valida a implementação contra os vetores de teste oficiais do RFC 6238,
 * Apêndice B (segredo ASCII "12345678901234567890", SHA1, 8 dígitos) --
 * cujo equivalente em base32 é "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".
 */
const RFC_6238_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("generateTotp (RFC 6238)", () => {
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ])("T=%i segundos -> %s (8 dígitos)", (unixTimeSeconds, expected) => {
    const code = generateTotp(RFC_6238_SECRET_BASE32, 8, 30, unixTimeSeconds * 1000);
    expect(code).toBe(expected);
  });

  it("gera código de 6 dígitos por padrão (formato usado pelo Supabase Auth)", () => {
    const code = generateTotp(RFC_6238_SECRET_BASE32);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("o mesmo instante sempre produz o mesmo código (determinístico)", () => {
    const t = Date.now();
    expect(generateTotp(RFC_6238_SECRET_BASE32, 6, 30, t)).toBe(
      generateTotp(RFC_6238_SECRET_BASE32, 6, 30, t),
    );
  });

  it("ignora caracteres fora do alfabeto base32 (ex.: hífens de formatação) sem lançar erro", () => {
    // Segredos exibidos por apps autenticadores as vezes vem formatados
    // com espacos/hifens -- a funcao normaliza antes de decodificar.
    const semFormatacao = generateTotp(RFC_6238_SECRET_BASE32);
    const comFormatacao = generateTotp("GEZD-GNBV-GY3T-QOJQ-GEZD-GNBV-GY3T-QOJQ");
    expect(comFormatacao).toBe(semFormatacao);
  });
});
