"use client";

import { useActionState } from "react";
import { signInAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <main>
      <h1>Sistema Diagnóstico AcadJuris</h1>
      <p>Entre com seu e-mail e senha.</p>
      <form action={formAction}>
        <div>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state.error && <p className="erro">{state.error}</p>}
        <button type="submit" disabled={isPending}>
          {isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
