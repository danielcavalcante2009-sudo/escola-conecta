import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateBody = {
  full_name: string;
  email: string;
  password: string;
  role: "aluno" | "professor" | "coordenador" | "diretor";
  matricula?: string;
  turma?: string | null;
  can_publish?: boolean;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me || !["coordenador", "diretor"].includes(me.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const body: CreateBody = await request.json();
  const role = body.role;

  // Coordenação só cadastra alunos e professores (sem permissão de publicar)
  if (me.role === "coordenador" && !["aluno", "professor"].includes(role)) {
    return NextResponse.json(
      { error: "Coordenadores só podem cadastrar alunos e professores." },
      { status: 403 }
    );
  }
  if (me.role === "coordenador" && body.can_publish) {
    return NextResponse.json(
      { error: "Somente o diretor pode conceder permissão de publicação." },
      { status: 403 }
    );
  }
  if (role === "aluno" && !body.matricula?.trim()) {
    return NextResponse.json({ error: "Matrícula é obrigatória para alunos." }, { status: 400 });
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: body.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const msg = createError?.message.includes("already")
      ? "Já existe uma conta com este e-mail."
      : "Erro ao criar conta: " + (createError?.message ?? "");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    email: body.email.trim().toLowerCase(),
    full_name: body.full_name.trim(),
    role,
    matricula: role === "aluno" ? body.matricula!.trim() : null,
    turma: role === "aluno" ? body.turma ?? null : null,
    can_publish: role === "professor" ? !!body.can_publish : false,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const msg = profileError.message.includes("duplicate") || profileError.message.includes("unique")
      ? "Matrícula já cadastrada."
      : "Erro ao criar perfil: " + profileError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_name: me.full_name,
    action: "cadastro",
    details: `Cadastrou ${role} ${body.full_name} (${body.email})`,
  });

  return NextResponse.json({ ok: true });
}
