import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Registra a confirmação de leitura de um comunicado pelo usuário atual. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { announcementId } = await request.json();
  if (!announcementId) {
    return NextResponse.json({ error: "Comunicado inválido." }, { status: 400 });
  }

  // O RLS garante que o usuário só marca leitura em comunicados que pode ver
  const { error } = await supabase
    .from("announcement_reads")
    .upsert({ announcement_id: announcementId, user_id: user.id });

  if (error) return NextResponse.json({ error: "Erro ao registrar leitura." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
