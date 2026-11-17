"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/server";

export default function EditForm({ id, profile }: { id: string; profile: Profile }) {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("announcements").select("*").eq("id", id).single();
      if (!data) {
        setError("Comunicado não encontrado ou sem permissão de acesso.");
      } else {
        setTitle(data.title);
        setBody(data.body);
        setImportant(data.important);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, important }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-bold text-gray-900">✏️ Editar comunicado</h1>
      <form onSubmit={submit} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="etitle">Título</label>
          <input id="etitle" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ebody">Descrição</label>
          <textarea id="ebody" required rows={6} className="input" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300" />
          Aviso importante
        </label>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">⚠️ {error}</div>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
