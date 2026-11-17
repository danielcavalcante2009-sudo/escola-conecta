"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/supabase/server";

const turmas = ["1A", "1B", "2A", "2B", "3A", "3B"];

export default function NewAnnouncement({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"geral" | "turma" | "professores" | "administrativo">(
    profile.role === "professor" ? "geral" : "geral"
  );
  const [turma, setTurma] = useState(turmas[0]);
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isProfessor = profile.role === "professor";
  const catOptions: { id: typeof category; label: string; desc: string }[] = isProfessor
    ? [
        { id: "geral", label: "📢 Toda a escola", desc: "Alunos, professores e equipe" },
        { id: "professores", label: "👩‍🏫 Professores", desc: "Somente a equipe docente" },
      ]
    : [
        { id: "geral", label: "📢 Toda a escola", desc: "Todos os usuários" },
        { id: "turma", label: "🎓 Turma específica", desc: "Alunos de uma sala" },
        { id: "professores", label: "👩‍🏫 Professores", desc: "Somente docentes" },
        { id: "administrativo", label: "🗂️ Administrativo", desc: "Coordenação e direção" },
      ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, category, turma: category === "turma" ? turma : null, important }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao publicar.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-bold text-gray-900">➕ Novo comunicado</h1>
      <form onSubmit={submit} className="card space-y-5 p-6">
        <div>
          <label className="label">Público do comunicado</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {catOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-lg border-2 p-3 text-left transition ${
                  category === c.id ? "border-primary-700 bg-primary-50" : "border-gray-200 hover:border-primary-300"
                }`}
              >
                <p className="text-sm font-bold">{c.label}</p>
                <p className="text-[11px] text-gray-500">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {category === "turma" && (
          <div>
            <label className="label">Turma</label>
            <div className="flex flex-wrap gap-2">
              {turmas.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurma(t)}
                  className={`h-10 w-14 rounded-lg border-2 text-sm font-bold transition ${
                    turma === t ? "border-primary-700 bg-primary-800 text-white" : "border-gray-200 hover:border-primary-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="title">Título</label>
          <input id="title" required maxLength={120} className="input" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reunião de pais e mestres" />
        </div>

        <div>
          <label className="label" htmlFor="body">Descrição</label>
          <textarea id="body" required rows={6} className="input" value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva o conteúdo do comunicado..." />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300" />
          Marcar como aviso importante (destaque na página inicial)
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">⚠️ {error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Publicando..." : "Publicar comunicado"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Ao publicar, todos os usuários do público selecionado receberão notificação automática.
      </p>
    </div>
  );
}
