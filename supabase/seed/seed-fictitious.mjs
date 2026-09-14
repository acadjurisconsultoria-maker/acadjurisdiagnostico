#!/usr/bin/env node
/**
 * Cria duas organizacoes ficticias, cada uma com 1 empresa / 1 unidade /
 * 1 projeto, e um usuario para cada um dos 5 perfis, para permitir o teste
 * de segregacao entre organizacoes (Plano-de-Testes-de-Seguranca-do-MVP-
 * v1.md, secao 1).
 *
 * DADOS SINTETICOS APENAS. Nunca rode este script contra um projeto
 * Supabase de producao -- ele cria usuarios e senhas de teste conhecidas.
 *
 * Uso:
 *   node supabase/seed/seed-fictitious.mjs
 *
 * Requer as variaveis de ambiente SUPABASE_URL e SUPABASE_SECRET_KEY
 * (padrao atual de chaves do Supabase -- substitui a antiga
 * "service_role key") apontando para uma instancia Supabase LOCAL de
 * desenvolvimento (ex.: `supabase start`). O script se recusa a rodar se
 * APP_ENV=production.
 */

import { createClient } from "@supabase/supabase-js";

const APP_ENV = process.env.APP_ENV ?? "development";
if (APP_ENV === "production") {
  console.error("Recusando executar seed ficticio com APP_ENV=production.");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Defina SUPABASE_URL e SUPABASE_SECRET_KEY (ambiente local) antes de rodar o seed.",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA_TESTE = "SenhaTeste!2026";

async function criarUsuario(email, fullName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SENHA_TESTE,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Falha ao criar usuario ${email}: ${error.message}`);
  return data.user.id;
}

async function criarOrganizacaoCompleta(prefixo) {
  const { data: org, error: orgError } = await supabase
    .from("organization")
    .insert({ name: `Academia Ficticia ${prefixo}` })
    .select()
    .single();
  if (orgError) throw new Error(`Falha ao criar organization: ${orgError.message}`);

  const { data: company, error: companyError } = await supabase
    .from("company")
    .insert({ organization_id: org.id, name: `Empresa ${prefixo} Ltda` })
    .select()
    .single();
  if (companyError) throw new Error(`Falha ao criar company: ${companyError.message}`);

  const { data: unit, error: unitError } = await supabase
    .from("unit")
    .insert({ company_id: company.id, name: `Unidade ${prefixo} - Matriz` })
    .select()
    .single();
  if (unitError) throw new Error(`Falha ao criar unit: ${unitError.message}`);

  const { data: project, error: projectError } = await supabase
    .from("project")
    .insert({ unit_id: unit.id, name: `Diagnóstico 360 - ${prefixo} - 01` })
    .select()
    .single();
  if (projectError) throw new Error(`Falha ao criar project: ${projectError.message}`);

  const consultorId = await criarUsuario(
    `consultor.${prefixo.toLowerCase()}@teste.acadjuris.local`,
    `Consultora Responsável (${prefixo})`,
  );
  const analistaId = await criarUsuario(
    `analista.${prefixo.toLowerCase()}@teste.acadjuris.local`,
    `Analista/Auditor (${prefixo})`,
  );
  const clienteId = await criarUsuario(
    `cliente.${prefixo.toLowerCase()}@teste.acadjuris.local`,
    `Usuário da Cliente (${prefixo})`,
  );

  await supabase.from("staff_project_access").insert([
    { user_id: consultorId, project_id: project.id, perfil: "consultor_responsavel" },
    { user_id: analistaId, project_id: project.id, perfil: "analista_auditor" },
  ]);

  await supabase.from("client_access").insert({
    user_id: clienteId,
    organization_id: org.id,
  });

  return { org, company, unit, project, consultorId, analistaId, clienteId };
}

async function main() {
  console.log("Criando organizações fictícias A e B...");
  const orgA = await criarOrganizacaoCompleta("A");
  const orgB = await criarOrganizacaoCompleta("B");

  const superAdminId = await criarUsuario(
    "superadmin@teste.acadjuris.local",
    "Super Administrador (teste)",
  );
  await supabase.from("super_admin_grant").insert({ user_id: superAdminId });

  const adminId = await criarUsuario(
    "admin@teste.acadjuris.local",
    "Administrador AcadJuris (teste)",
  );
  await supabase.from("admin_acadjuris_grant").insert({ user_id: adminId });

  console.log("Seed concluído.");
  console.log(`Organização A: ${orgA.org.id} (projeto ${orgA.project.id})`);
  console.log(`Organização B: ${orgB.org.id} (projeto ${orgB.project.id})`);
  console.log(`Senha de todos os usuários de teste: ${SENHA_TESTE}`);
  console.log(
    "Use estas credenciais no teste de segregação (tests/integration/rls-segregation.test.ts).",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
