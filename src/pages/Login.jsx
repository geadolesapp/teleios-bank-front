import { useEffect, useMemo, useState } from "react";
import "../App.css";
import api from "../services/api";
import Footer from "../components/Footer";
import olhoAberto from "../assets/olho-aberto.png";
import olhoFechado from "../assets/olho-fechado.png";

function detectarPlataforma() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  const isAndroid = /android/i.test(ua);
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isAndroid) return "android";
  if (isIOS) return "ios";
  return "desktop";
}

function Login({ setUser, layoutConfig }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarPopupInstalacao, setMostrarPopupInstalacao] = useState(false);
  const [plataforma, setPlataforma] = useState("desktop");

  const logoUrl = useMemo(() => {
    if (!layoutConfig?.logo_url) {
      return `${process.env.PUBLIC_URL}/LogoTeleiosBank.png`;
    }

    return `${api.defaults.baseURL.replace("/api", "")}${layoutConfig.logo_url}`;
  }, [layoutConfig]);

  const nuvem1 = `${process.env.PUBLIC_URL}/nuvem_1.png`;
  const nuvem2 = `${process.env.PUBLIC_URL}/nuvem_2.png`;
  const nuvem3 = `${process.env.PUBLIC_URL}/nuvem_3.png`;

  useEffect(() => {
    const plataformaDetectada = detectarPlataforma();
    setPlataforma(plataformaDetectada);

    if (plataformaDetectada === "desktop") {
      return;
    }

    const chave =
      plataformaDetectada === "android"
        ? "teleios_popup_instalacao_android_visto"
        : "teleios_popup_instalacao_ios_visto";

    const jaViuPopup = localStorage.getItem(chave);

    if (!jaViuPopup) {
      setMostrarPopupInstalacao(true);
    }
  }, []);

  function fecharPopupInstalacao() {
    const chave =
      plataforma === "android"
        ? "teleios_popup_instalacao_android_visto"
        : "teleios_popup_instalacao_ios_visto";

    localStorage.setItem(chave, "true");
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
      <div className="login-clouds">
        <div
          className="login-cloud login-cloud-1"
          style={{ backgroundImage: `url(${nuvem1})` }}
        />
        <div
          className="login-cloud login-cloud-2"
          style={{ backgroundImage: `url(${nuvem2})` }}
        />
        <div
          className="login-cloud login-cloud-3"
          style={{ backgroundImage: `url(${nuvem3})` }}
        />
      </div>

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

      {mostrarPopupInstalacao && plataforma === "android" && (
        <div className="scanner-overlay">
          <div className="install-popup">
            <h3>Instale o Teleios Bank</h3>

            <p className="install-popup-text">
              Para acessar mais rápido, você pode instalar o app ou adicionar um
              atalho à tela inicial.
            </p>

            <div className="install-popup-box">
              <strong>Android, Chrome</strong>
              <p>
                Toque no menu do navegador e escolha <b>Instalar app</b> ou{" "}
                <b>Adicionar à tela inicial</b>.
              </p>
            </div>

            <button className="action-btn" onClick={fecharPopupInstalacao}>
              Entendi
            </button>
          </div>
        </div>
      )}

      {mostrarPopupInstalacao && plataforma === "ios" && (
        <div className="scanner-overlay">
          <div className="install-popup">
            <h3>Adicione o Teleios Bank à tela inicial</h3>

            <p className="install-popup-text">
              Para acessar mais rápido no iPhone, salve o app na tela inicial.
            </p>

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
