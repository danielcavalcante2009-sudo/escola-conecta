import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type UpdateBody = {
  full_name?: string;
  role?: "aluno" | "professor" | "coordenador" | "diretor";
  turma?: string | null;
  matricula?: string;
  active?: boolean;
  can_publish?: boolean;
  new_password?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me || !["coordenador", "diretor"].includes(me.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { data: target } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (me.role === "coordenador" && !["aluno", "professor"].includes(target.role)) {
    return NextResponse.json({ error: "Coordenadores só editam alunos e professores." }, { status: 403 });
  }
  if (me.role === "coordenador" && target.role === "professor" && params.id !== user.id) {
    // coordenador pode editar dados básicos de professor, mas NUNCA can_publish
  }

  const body: UpdateBody = await request.json();
  const updates: Record<string, unknown> = {};
  const changes: string[] = [];

  if (body.full_name !== undefined) { updates.full_name = body.full_name.trim(); changes.push("renomeou"); }
  if (body.matricula !== undefined && target.role === "aluno") { updates.matricula = body.matricula.trim(); changes.push("matrícula"); }
  if (body.turma !== undefined && target.role === "aluno") { updates.turma = body.turma; changes.push(`turma ${body.turma ?? "—"}`); }
  if (body.active !== undefined) { updates.active = body.active; changes.push(body.active ? "reativou" : "desativou"); }

  if (body.can_publish !== undefined) {
    if (target.role !== "professor") {
      return NextResponse.json({ error: "Permissão de publicação se aplica apenas a professores." }, { status: 400 });
    }
    if (me.role !== "diretor") {
      return NextResponse.json(
        { error: "Somente o diretor pode conceder ou retirar permissão de publicação." },
        { status: 403 }
      );
    }
    updates.can_publish = body.can_publish;
    changes.push(body.can_publish ? "AUTORIZOU publicação" : "RETIROU permissão de publicação");
  }

  if (body.role !== undefined && body.role !== target.role) {
    if (me.role !== "diretor") {
      return NextResponse.json({ error: "Somente o diretor altera a função de um usuário." }, { status: 403 });
    }
    updates.role = body.role;
    changes.push(`função → ${body.role}`);
    if (body.role !== "aluno") { updates.turma = null; updates.matricula = null; }
    if (body.role !== "professor") updates.can_publish = false;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("profiles").update(updates).eq("id", params.id);
    if (error) return NextResponse.json({ error: "Erro ao atualizar: " + error.message }, { status: 400 });
  }

  if (body.new_password) {
    if (body.new_password.length < 6) {
      return NextResponse.json({ error: "A nova senha deve ter ao menos 6 caracteres." }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error: pwError } = await admin.auth.admin.updateUserById(params.id, {
      password: body.new_password,
    });
    if (pwError) return NextResponse.json({ error: "Erro ao redefinir senha." }, { status: 400 });
    changes.push("redefiniu a senha");
  }

  if (changes.length > 0) {
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      actor_name: me.full_name,
      action: "atualização",
      details: `${changes.join(", ")} — ${target.full_name} (${target.email})`,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me || me.role !== "diretor") {
    return NextResponse.json({ error: "Apenas o diretor pode excluir usuários." }, { status: 403 });
  }

  const { data: target } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: "Erro ao excluir conta." }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_name: me.full_name,
    action: "exclusão",
    details: `Excluiu ${target.role} ${target.full_name} (${target.email})`,
  });

  return NextResponse.json({ ok: true });
}
