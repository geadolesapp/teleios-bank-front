import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import api from "./services/api";

const FRONT_VERSION = "teleios-front-v5";

function aplicarTema(config) {
  const root = document.documentElement;

  root.style.setProperty("--cor-primaria", config.primary_color || "#00c2cb");
  root.style.setProperty(
    "--cor-secundaria",
    config.secondary_color || "#0f2a3a",
  );
  root.style.setProperty("--cor-destaque", config.accent_color || "#6ecbff");
  root.style.setProperty(
    "--fonte-app",
    `'${config.font_family || "Inter"}', Arial, sans-serif`,
  );

  document.body.classList.toggle("theme-clouds-on", !!config.show_clouds);
  document.body.classList.toggle("theme-clouds-off", !config.show_clouds);
}

async function limparCachesDoApp() {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (error) {
    console.error("Erro ao limpar caches do app:", error);
  }
}

async function tratarMudancaDeVersao() {
  const versaoSalva = localStorage.getItem("teleios_front_version");

  if (versaoSalva !== FRONT_VERSION) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.setItem("teleios_front_version", FRONT_VERSION);

    await limparCachesDoApp();

    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      } catch (error) {
        console.error("Erro ao limpar service workers antigos:", error);
      }
    }

    window.location.reload();
    return true;
  }

  return false;
}

function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState(null);

  useEffect(() => {
    async function carregarTudo() {
      try {
        const houveMudanca = await tratarMudancaDeVersao();
        if (houveMudanca) return;

        try {
          const layoutResponse = await api.get("/layout/public");
          setLayoutConfig(layoutResponse.data);
          aplicarTema(layoutResponse.data);
          localStorage.setItem(
            "layout_config",
            JSON.stringify(layoutResponse.data),
          );
        } catch (error) {
          console.error("Erro ao carregar layout público:", error);
        }

        const token = localStorage.getItem("token");

        if (!token) {
          setCarregando(false);
          return;
        }

        try {
          const response = await api.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } finally {
          setCarregando(false);
        }
      } catch (error) {
        console.error("Erro geral ao carregar app:", error);
        setCarregando(false);
      }
    }

    carregarTudo();
  }, []);

  useEffect(() => {
    if (layoutConfig) {
      aplicarTema(layoutConfig);
    }
  }, [layoutConfig]);

  if (carregando) {
    return (
      <div className="teleios-loading-screen">
        <div className="teleios-loading-box">
          <div className="teleios-loading-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        setUser={setUser}
        layoutConfig={layoutConfig}
        setLayoutConfig={setLayoutConfig}
      />
    );
  }

  if (user.primeiro_acesso) {
    return <PrimeiroAcesso user={user} setUser={setUser} />;
  }

  if (user.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        setUser={setUser}
        layoutConfig={layoutConfig}
        setLayoutConfig={setLayoutConfig}
      />
    );
  }

  return <Dashboard user={user} setUser={setUser} />;
}

export default App;
