import { createHmac } from "node:crypto";

/**
 * Implementação mínima de TOTP (RFC 6238, sobre HOTP/RFC 4226), usando
 * apenas o módulo `node:crypto` -- sem dependência externa (`otplib` ou
 * equivalente), consistente com a decisão de manter dependências mínimas.
 *
 * Uso exclusivo em testes: gerar o código que um aplicativo autenticador
 * geraria, a partir do segredo base32 retornado por
 * `supabase.auth.mfa.enroll()`, para permitir testar o fluxo real de MFA
 * (enroll -> challenge -> verify) sem intervenção humana digitando um
 * código de 6 dígitos. Nunca usado em código de produção -- o usuário real
 * sempre digita o código do próprio aplicativo autenticador.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Caractere base32 inválido: "${char}"`);
    }
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Gera o código TOTP para o instante `forTimeMs` (padrão: agora).
 *
 * @param base32Secret Segredo em base32 (retornado por `enroll().data.totp.secret`).
 * @param digits Quantidade de dígitos do código (Supabase usa 6).
 * @param timeStepSeconds Janela de tempo em segundos (padrão RFC 6238: 30).
 */
export function generateTotp(
  base32Secret: string,
  digits = 6,
  timeStepSeconds = 30,
  forTimeMs = Date.now(),
): string {
  const key = base32Decode(base32Secret);
  const counter = Math.floor(forTimeMs / 1000 / timeStepSeconds);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binCode =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  return (binCode % 10 ** digits).toString().padStart(digits, "0");
}
