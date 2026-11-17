"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import AnnouncementCard, { type Announcement } from "@/components/AnnouncementCard";
import type { Profile } from "@/lib/supabase/server";
import Link from "next/link";
const turmas = ["1A", "1B", "2A", "2B", "3A", "3B"];

export default function Feed({ profile }: { profile: Profile }) {
  const supabase = createBrowserSupabase();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("todas");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const isStaff = profile.role === "coordenador" || profile.role === "diretor";

  useEffect(() => {
    (async () => {
      setLoading(true);
      // RLS filtra automaticamente o que este perfil pode ver
      const { data } = await supabase
        .from("announcements")
        .select("*, profiles!announcements_author_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setItems((data as Announcement[]) ?? []);

      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", profile.id);
      setReadIds(new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id)));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const filtered = useMemo(() => {
    if (category === "todas") return items;
    if (category === "minha-turma") return items.filter((a) => a.turma === profile.turma);
    return items.filter((a) => a.category === category);
  }, [items, category, profile.turma]);

  const important = filtered.filter((a) => a.important);

  const categories = [
    ...(profile.role === "aluno"
      ? [
          { id: "todas", label: "Todas" },
          { id: "geral", label: "Gerais" },
          { id: "minha-turma", label: `Minha turma (${profile.turma ?? "—"})` },
        ]
      : profile.role === "professor"
        ? [
            { id: "todas", label: "Todas" },
            { id: "geral", label: "Gerais" },
            { id: "professores", label: "Professores" },
          ]
        : [
            { id: "todas", label: "Todas" },
            { id: "geral", label: "Gerais" },
            { id: "turma", label: "Por turma" },
            { id: "professores", label: "Professores" },
            { id: "administrativo", label: "Administrativos" },
          ]),
  ];

  async function confirmRead(id: string) {
    if (readIds.has(id)) return;
    const res = await fetch("/api/reads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId: id }),
    });
    if (res.ok) setReadIds((prev) => new Set(prev).add(id));
  }

  return (
    <div className="space-y-5">
      {profile.role === "aluno" && (
        <div className="card flex items-center justify-between bg-primary-900 p-5 text-white">
          <div>
            <p className="text-xs text-primary-100">Bem-vindo(a), {profile.full_name.split(" ")[0]}!</p>
            <p className="text-lg font-bold">Sua turma: {profile.turma ?? "não vinculada"}</p>
          </div>
          <span className="text-4xl">🎓</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">📣 Comunicados</h1>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                category === c.id
                  ? "border-primary-800 bg-primary-800 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {profile.can_publish && profile.role === "professor" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-primary-600 p-4">
          <p className="text-sm text-gray-700">
            ✅ Você está <strong>autorizado pelo diretor</strong> a publicar comunicados.
          </p>
          <Link href="/dashboard/novo" className="btn-primary text-xs">
            ➕ Publicar comunicado
          </Link>
        </div>
      )}
      {profile.role === "professor" && !profile.can_publish && (
        <div className="card p-4 text-sm text-gray-600">
            🔒 Você não possui autorização para publicar comunicados. Solicite ao diretor.
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Carregando comunicados...</p>}

      {!loading && important.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-red-700">⚠️ Avisos importantes</h2>
          <div className="space-y-4">
            {important.map((a) => (
              <div key={a.id} onMouseEnter={() => confirmRead(a.id)}>
                <AnnouncementCard a={a} />
                <p className="mt-1 text-right text-[11px] text-gray-400">
                  {readIds.has(a.id) ? "✓ Leitura confirmada" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="space-y-4">
          {filtered.filter((a) => !a.important).length === 0 && important.length === 0 && (
            <div className="card p-10 text-center text-sm text-gray-500">
              Nenhum comunicado encontrado para esta categoria.
            </div>
          )}
          {filtered
            .filter((a) => !a.important)
            .map((a) => (
              <div key={a.id} onMouseEnter={() => confirmRead(a.id)} onFocus={() => confirmRead(a.id)}>
                <AnnouncementCard
                  a={a}
                  actions={
                    isStaff || (profile.can_publish && a.author_id === profile.id) ? (
                      <div className="flex gap-1.5">
                        <Link
                          href={`/dashboard/editar/${a.id}`}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={async () => {
                            if (!confirm("Excluir este comunicado?")) return;
                            const res = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" });
                            if (res.ok) setItems((prev) => prev.filter((x) => x.id !== a.id));
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    ) : undefined
                  }
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">
                  {readIds.has(a.id) ? "✓ Leitura confirmada" : ""}
                </p>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
