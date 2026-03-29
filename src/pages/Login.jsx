import { useEffect, useMemo, useState } from "react";
import "../App.css";
import api from "../services/api";
import Footer from "../components/Footer";
import olhoAberto from "../assets/olho-aberto.png";
import olhoFechado from "../assets/olho-fechado.png";

function Login({ setUser, layoutConfig }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarPopupInstalacao, setMostrarPopupInstalacao] = useState(false);

  const logoUrl = useMemo(() => {
    if (!layoutConfig?.logo_url) {
      return `${process.env.PUBLIC_URL}/LogoTeleiosBank.png`;
    }

    return `${api.defaults.baseURL.replace("/api", "")}${layoutConfig.logo_url}`;
  }, [layoutConfig]);

  useEffect(() => {
    const jaViuPopup = localStorage.getItem("teleios_popup_instalacao_visto");

    if (!jaViuPopup) {
      setMostrarPopupInstalacao(true);
    }
  }, []);

  function fecharPopupInstalacao() {
    localStorage.setItem("teleios_popup_instalacao_visto", "true");
    setMostrarPopupInstalacao(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        senha,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setUser(user);
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao fazer login";
      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container app-theme-bg login-page">
      <div className="page-shell login-shell">
        <div className="login-content">
          <div className="login-card glass-card">
            <img src={logoUrl} alt="logo" className="logo" />

            <form onSubmit={handleLogin}>
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="input-wrapper">
                <input
                  className="input"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />

                <span
                  className="toggle-password"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  <img
                    src={mostrarSenha ? olhoFechado : olhoAberto}
                    alt={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="icone-olho"
                  />
                </span>
              </div>

              {erro && (
                <p style={{ color: "#ff6b6b", marginBottom: "12px" }}>{erro}</p>
              )}

              <button className="button" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>

        <Footer />
      </div>

      {mostrarPopupInstalacao && (
        <div className="scanner-overlay">
          <div className="install-popup">
            <h3>Instale o Teleios Bank</h3>

            <p className="install-popup-text">
              Para acessar mais rápido, você pode adicionar o app à tela inicial
              do seu celular.
            </p>

            <div className="install-popup-box">
              <strong>Android, Chrome</strong>
              <p>
                Toque no menu (Os tres pontinhos) do navegador e escolha <b>Instalar app</b> ou{" "}
                <b>Adicionar à tela inicial</b>.
              </p>
            </div>

            <div className="install-popup-box">
              <strong>iPhone, Safari</strong>
              <p>
                Toque em <b>Compartilhar</b> e depois em{" "}
                <b>Adicionar à Tela de Início</b>.
              </p>
            </div>

            <button className="action-btn" onClick={fecharPopupInstalacao}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
