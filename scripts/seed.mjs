/**
 * Cria os usuários de demonstração (Auth + profiles) usando a SERVICE ROLE KEY.
 * Uso:  npm run seed
 * Requer .env.local preenchido.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const CLASSES = ["1A", "1B", "2A", "2B", "3A", "3B"];

const DEMO = [
  { full_name: "Helena Martins", email: "diretor@escola.com", password: "Diretor123", role: "diretor" },
  { full_name: "Rafael Souza", email: "coordenador@escola.com", password: "Coordenador123", role: "coordenador" },
  { full_name: "Clara Nogueira", email: "professora@escola.com", password: "Professor123", role: "professor", can_publish: true },
  { full_name: "Marcos Lima", email: "professor2@escola.com", password: "Professor123", role: "professor", can_publish: false },
  { full_name: "Beatriz Almeida", email: "aluna@escola.com", password: "Aluno123", role: "aluno", matricula: "2024001", turma: "2A" },
  { full_name: "Diego Ferreira", email: "aluno2@escola.com", password: "Aluno123", role: "aluno", matricula: "2024002", turma: "1A" },
  { full_name: "Gabriela Castro", email: "aluno3@escola.com", password: "Aluno123", role: "aluno", matricula: "2024003", turma: "3B" },
];

async function main() {
  // Turmas
  for (const name of CLASSES) {
    await admin.from("classes").upsert({ name }, { onConflict: "name" });
  }
  console.log("✅ Turmas garantidas:", CLASSES.join(", "));

  for (const u of DEMO) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", u.email)
      .maybeSingle();
    if (existing) {
      console.log(`↩︎  ${u.email} já existe — ignorado.`);
      continue;
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      console.error(`❌ ${u.email}:`, error?.message);
      continue;
    }
    const { error: perr } = await admin.from("profiles").insert({
      id: created.user.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      matricula: u.matricula ?? null,
      turma: u.turma ?? null,
      can_publish: u.can_publish ?? false,
    });
    if (perr) console.error(`❌ perfil ${u.email}:`, perr.message);
    else console.log(`✅ ${u.role} criado: ${u.email} / ${u.password}`);
  }

  // Comunicados de demonstração
  const { data: profs } = await admin.from("profiles").select("id, email");
  const byEmail = Object.fromEntries((profs ?? []).map((p) => [p.email, p.id]));
  const author = byEmail["coordenador@escola.com"];
  if (author) {
    const { count } = await admin.from("announcements").select("*", { count: "exact", head: true });
    if (!count) {
      await admin.from("announcements").insert([
        { title: "Bem-vindos ao Escola Conecta!", body: "A partir de agora, todos os avisos da escola serão publicados aqui. Nada de grupos cheios de mensagens: consulte o app sempre que quiser.", category: "geral", important: true, author_id: author },
        { title: "Reunião de pais e mestres", body: "Dia 28/11 às 19h, no auditório principal. Sua presença é muito importante.", category: "geral", author_id: author },
        { title: "Simulado de matemática — Turma 2A", body: "O simulado acontecerá na sexta-feira, das 8h às 12h, na sala 12. Levem caneta azul e calculadora.", category: "turma", turma: "2A", author_id: author },
        { title: "Planejamento pedagógico", body: "Prezados professores, o planejamento do próximo bimestre ocorre na quarta-feira às 14h na sala dos professores.", category: "professores", author_id: author },
        { title: "Pauta da reunião administrativa", body: "Coordenação e direção: revisão do calendário de provas e do cronograma de formatura.", category: "administrativo", author_id: author },
      ]);
      console.log("✅ Comunicados de demonstração criados.");
    }
  }

  console.log("\n🎉 Seed concluído!");
}

main();
