import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { role, email, password, matricula } = await request.json();

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }

  const supabase = createClient();

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });

  if (signInError || !signIn.user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  // Verificação no SERVIDOR do papel, do status e da matrícula
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", signIn.user.id)
    .single<Profile>();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Perfil não encontrado. Fale com a coordenação." }, { status: 403 });
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Sua conta está desativada. Fale com a coordenação." },
      { status: 403 }
    );
  }

  if (profile.role !== role) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: `Esta conta não é do tipo "${role}". Selecione o acesso correto.` },
      { status: 403 }
    );
  }

  if (role === "aluno") {
    const informed = String(matricula ?? "").trim();
    if (!informed || profile.matricula?.toLowerCase() !== informed.toLowerCase()) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Matrícula inválida para este e-mail." }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, role: profile.role });
}
