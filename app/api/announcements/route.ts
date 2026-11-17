import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateBody = {
  title: string;
  body: string;
  category: "geral" | "turma" | "professores" | "administrativo";
  turma?: string | null;
  important?: boolean;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me || !me.active) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const b: CreateBody = await request.json();

  // Permissões (verificação em DOBLE camada: RLS + servidor)
  const isStaff = me.role === "coordenador" || me.role === "diretor";
  const professorOk =
    me.role === "professor" && me.can_publish && ["geral", "professores"].includes(b.category);
  if (!isStaff && !professorOk) {
    return NextResponse.json(
      { error: "Você não tem autorização para publicar comunicados." },
      { status: 403 }
    );
  }
  if (me.role === "professor" && b.category === "administrativo") {
    return NextResponse.json({ error: "Categoria não permitida para professores." }, { status: 403 });
  }
  if (b.category === "turma" && !b.turma) {
    return NextResponse.json({ error: "Selecione a turma do aviso." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: b.title.trim(),
      body: b.body.trim(),
      category: b.category,
      turma: b.category === "turma" ? b.turma : null,
      important: !!b.important,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Erro ao publicar: " + error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_name: me.full_name,
    action: "publicação",
    details: `Publicou "${b.title}" (${b.category}${b.turma ? " " + b.turma : ""})`,
  });

  return NextResponse.json({ ok: true, id: data.id });
}
