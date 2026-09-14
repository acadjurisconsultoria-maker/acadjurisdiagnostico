import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";

/**
 * Renova o cookie de sessao Supabase a cada requisicao e aplica protecao de
 * rota de conveniencia (camada de UX). A barreira real de dados continua
 * sendo RLS no Postgres -- este proxy (antigo "middleware", renomeado na
 * convencao do Next.js 16) nunca decide o que um usuario pode ver, apenas
 * evita que um usuario nao autenticado chegue a uma tela que exigiria dado
 * que o RLS ja recusaria de qualquer forma.
 */

const PUBLIC_PATHS = ["/login", "/login/mfa", "/login/mfa/enroll"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto assets estaticos do Next.js e a rota
     * de favicon -- essas nunca dependem de sessao.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
