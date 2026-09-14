"use client";

import { useActionState } from "react";
import { verifyMfaChallengeAction, type MfaFormState } from "@/app/login/mfa/actions";

const initialState: MfaFormState = { error: null };

export function MfaChallengeForm({ factorId }: { factorId: string }) {
  const [state, formAction, isPending] = useActionState(
    verifyMfaChallengeAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="factorId" value={factorId} />
      <div>
        <label htmlFor="code">Código de 6 dígitos</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
        />
      </div>
      {state.error && <p className="erro">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Verificando..." : "Verificar"}
      </button>
    </form>
  );
}
