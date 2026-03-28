import { useState } from "react";
import "../App.css";
import api from "../services/api";

function PrimeiroAcesso({ user, setUser }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleAlterarSenha(e) {
    e.preventDefault();
    setErro("");

    if (!novaSenha.trim() || novaSenha.trim().length < 4) {
      setErro("A nova senha deve ter pelo menos 4 caracteres");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/alterar-senha-primeiro-acesso", {
        novaSenha,
      });

      setUser({
        ...user,
        primeiro_acesso: false,
      });

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          primeiro_acesso: false,
        }),
      );
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao alterar senha";
      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="login-card">
        <img src="/LogoTeleiosBank.png" alt="logo" className="logo" />

        <h2 className="title">Primeiro acesso</h2>
        <p
          style={{
            color: "#c7d5e0",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          Olá, {user?.nome}. Para continuar, defina sua nova senha.
        </p>

        <form onSubmit={handleAlterarSenha}>
          <input
            className="input"
            type="password"
            placeholder="Nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />

          {erro && (
            <p style={{ color: "#ff6b6b", marginBottom: "12px" }}>{erro}</p>
          )}

          <button className="button" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PrimeiroAcesso;
