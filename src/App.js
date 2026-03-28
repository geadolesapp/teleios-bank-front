import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import api from "./services/api";

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

function App() {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState(null);

  useEffect(() => {
    async function carregarTudo() {
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
    }

    carregarTudo();
  }, []);

  if (carregando) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base, #0b1d2a)",
          color: "#fff",
          fontSize: "20px",
        }}
      >
        Carregando...
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
