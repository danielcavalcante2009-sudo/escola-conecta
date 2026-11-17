import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateBody = {
  title?: string;
  body?: string;
  important?: boolean;
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
  if (!me) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { data: ann } = await supabase.from("announcements").select("*").eq("id", params.id).single();
  if (!ann) return NextResponse.json({ error: "Comunicado não encontrado." }, { status: 404 });

  const isStaff = ["coordenador", "diretor"].includes(me.role);
  const isAuthorWithPermission = ann.author_id === user.id && me.can_publish;
  if (!isStaff && !isAuthorWithPermission) {
    return NextResponse.json(
      { error: "Você só pode editar comunicados de sua autoria e com autorização ativa." },
      { status: 403 }
    );
  }

  const b: UpdateBody = await request.json();
  const updates: Record<string, unknown> = {};
  if (b.title !== undefined) updates.title = b.title.trim();
  if (b.body !== undefined) updates.body = b.body.trim();
  if (b.important !== undefined) updates.important = b.important;

  const { error } = await supabase.from("announcements").update(updates).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Erro ao editar: " + error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_name: me.full_name,
    action: "edição",
    details: `Editou o comunicado "${ann.title}"`,
  });

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
  if (!me) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { data: ann } = await supabase.from("announcements").select("*").eq("id", params.id).single();
  if (!ann) return NextResponse.json({ error: "Comunicado não encontrado." }, { status: 404 });

  const isStaff = ["coordenador", "diretor"].includes(me.role);
  const isAuthorWithPermission = ann.author_id === user.id && me.can_publish;
  if (!isStaff && !isAuthorWithPermission) {
    return NextResponse.json({ error: "Sem permissão para excluir este comunicado." }, { status: 403 });
  }

  const { error } = await supabase.from("announcements").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Erro ao excluir: " + error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_name: me.full_name,
    action: "exclusão",
    details: `Excluiu o comunicado "${ann.title}"`,
  });

  return NextResponse.json({ ok: true });
}
