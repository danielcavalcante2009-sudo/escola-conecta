"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "aluno" | "professor" | "coordenador" | "diretor";

const roleCards: { role: Role; icon: string; label: string; desc: string }[] = [
  { role: "aluno", icon: "🎓", label: "Aluno", desc: "E-mail, senha e matrícula" },
  { role: "professor", icon: "👩‍🏫", label: "Professor", desc: "E-mail institucional e senha" },
  { role: "coordenador", icon: "🗂️", label: "Coordenador", desc: "E-mail institucional e senha" },
  { role: "diretor", icon: "🏛️", label: "Diretor", desc: "E-mail institucional e senha" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("aluno");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricula, setMatricula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email, password, matricula }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar. Verifique os dados.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">
            🏫
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Escola Conecta</h1>
          <p className="mt-1 text-sm text-primary-100">
            Toda a comunicação escolar em um só lugar — sem correção de grupos.
          </p>
        </div>

        <div className="card p-6">
          <p className="label">Escolha seu tipo de acesso</p>
          <div className="grid grid-cols-2 gap-2.5">
            {roleCards.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => {
                  setRole(c.role);
                  setError(null);
                }}
                className={`rounded-lg border-2 p-3 text-left transition ${
                  role === c.role
                    ? "border-primary-700 bg-primary-50"
                    : "border-gray-200 bg-white hover:border-primary-300"
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <p className="text-sm font-bold text-gray-900">{c.label}</p>
                <p className="text-[11px] text-gray-500">{c.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                {role === "aluno" ? "E-mail" : "E-mail institucional"}
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                placeholder="voce@escola.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {role === "aluno" && (
              <div>
                <label className="label" htmlFor="matricula">
                  Matrícula (ID único do estudante)
                </label>
                <input
                  id="matricula"
                  required
                  className="input"
                  placeholder="Ex.: 2024001"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Entrando..." : `Entrar como ${roleCards.find((r) => r.role === role)?.label}`}
            </button>
          </form>

          <p className="mt-4 rounded-lg bg-primary-50 p-3 text-center text-xs text-gray-600">
            🔐 Os cadastros são realizados exclusivamente por coordenadores e diretores da escola.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-primary-100/80">
          Acesso seguro por perfil · Aluno · Professor · Coordenador · Diretor
        </p>
      </div>
    </main>
  );
}
