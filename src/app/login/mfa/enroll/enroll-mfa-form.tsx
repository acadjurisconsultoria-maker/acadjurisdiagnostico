"use client";

import { useActionState } from "react";
import { verifyEnrollmentAction, type MfaFormState } from "@/app/login/mfa/enroll/actions";

const initialState: MfaFormState = { error: null };

export function EnrollMfaForm({ factorId }: { factorId: string }) {
  const [state, formAction, isPending] = useActionState(
    verifyEnrollmentAction,
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
        {isPending ? "Confirmando..." : "Confirmar cadastro"}
      </button>
    </form>
  );
}
