import "../App.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import api from "../services/api";
import QRCodeScanner from "./QRCodeScanner";
import Footer from "../components/Footer";
import moedaTeleios from "../assets/moedaTeleios.png";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const size = 400;
  canvas.width = size;
  canvas.height = size;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/png",
      0.95,
    );
  });
}

function Dashboard({ user, setUser }) {
  const [dadosUsuario, setDadosUsuario] = useState(user);
  const [extrato, setExtrato] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [imagemOriginal, setImagemOriginal] = useState(null);
  const [mostrarCropModal, setMostrarCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [mensagens, setMensagens] = useState([]);
  const [mostrarMensagens, setMostrarMensagens] = useState(false);
  const [mensagemPopup, setMensagemPopup] = useState(null);

  const inputFotoRef = useRef(null);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      const [
        usuarioResponse,
        extratoResponse,
        rankingResponse,
        mensagensResponse,
        popupResponse,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/user/extrato"),
        api.get("/user/ranking"),
        api.get("/user/messages"),
        api.get("/user/messages/popup"),
      ]);

      setDadosUsuario(usuarioResponse.data);
      setExtrato(extratoResponse.data);
      setRanking(rankingResponse.data.slice(0, 3));
      setMensagens(mensagensResponse.data);
      setMensagemPopup(popupResponse.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  function abrirSeletorFoto() {
    inputFotoRef.current?.click();
  }

  function handleSelecionarFoto(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImagemOriginal(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setMostrarCropModal(true);
    };

    reader.readAsDataURL(arquivo);
    event.target.value = "";
  }

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function confirmarCrop() {
    if (!imagemOriginal || !croppedAreaPixels) return;

    try {
      setEnviandoFoto(true);

      const croppedBlob = await getCroppedImg(
        imagemOriginal,
        croppedAreaPixels,
      );

      const formData = new FormData();
      formData.append("foto", croppedBlob, "avatar.png");

      const response = await api.post("/user/foto", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setDadosUsuario((prev) => ({
        ...prev,
        foto: response.data.foto,
      }));

      setMostrarCropModal(false);
      setImagemOriginal(null);

      await carregarDashboard();
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao enviar foto";
      alert(mensagem);
    } finally {
      setEnviandoFoto(false);
    }
  }

  function cancelarCrop() {
    setMostrarCropModal(false);
    setImagemOriginal(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function abrirMensagem(msg) {
    try {
      await api.patch(`/user/messages/${msg._id}/read`);
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao marcar mensagem como lida:", error);
    }
  }

  async function removerMensagem(msg) {
    try {
      await api.patch(`/user/messages/${msg._id}/hide`);
      if (mensagemPopup?._id === msg._id) {
        setMensagemPopup(null);
      }
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao remover mensagem:", error);
    }
  }

  async function limparNotificacoes() {
    if (mensagens.length === 0) {
      alert("Não há notificações para limpar");
      return;
    }

    try {
      await api.patch("/user/messages/hide-all");
      setMensagemPopup(null);
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  }

  async function naoMostrarNovamente(msg) {
    try {
      await api.patch(`/user/messages/${msg._id}/hide`);
      setMensagemPopup(null);
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao ocultar mensagem:", error);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  function getRankingInfo(index) {
    if (index === 0) {
      return {
        medalha: "🥇",
        classe: "ranking-card ranking-primeiro",
        posicao: "1º",
      };
    }

    if (index === 1) {
      return {
        medalha: "🥈",
        classe: "ranking-card ranking-segundo",
        posicao: "2º",
      };
    }

    return {
      medalha: "🥉",
      classe: "ranking-card ranking-terceiro",
      posicao: "3º",
    };
  }

  function getNivelPorSaldo(saldo) {
    const saldoAtual = Number(saldo || 0);

    const niveis = [
      "Nível 1",
      "Pro",
      "Elite",
      "Legend",
      "Master",
      "Supreme",
      "Omega",
    ];

    const indice = Math.floor(saldoAtual / 500);
    return niveis[indice] || `Nível ${indice + 1}`;
  }

  function getProgressoNivel(saldo) {
    const saldoAtual = Number(saldo || 0);
    const resto = saldoAtual % 500;
    return (resto / 500) * 100;
  }

  function getCoinsParaProximoNivel(saldo) {
    const saldoAtual = Number(saldo || 0);
    const resto = saldoAtual % 500;

    if (resto === 0 && saldoAtual !== 0) {
      return 500;
    }

    return 500 - resto;
  }

  const notificacoesNaoLidas = mensagens.filter((m) => !m.lida).length;
  const saldoAtual = Number(dadosUsuario?.saldo || 0);
  const nivelAtual = getNivelPorSaldo(saldoAtual);
  const progressoNivel = getProgressoNivel(saldoAtual);
  const coinsProximoNivel = getCoinsParaProximoNivel(saldoAtual);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1d2a",
          color: "#fff",
          fontSize: "20px",
        }}
      >
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard app-theme-bg">
      <div className="dashboard-wrapper page-shell">
        <div className="header">
          <div className="user-info">
            <div
              className="avatar-upload"
              onClick={abrirSeletorFoto}
              title="Clique para alterar a foto"
            >
              <img
                src={
                  dadosUsuario?.foto
                    ? `${api.defaults.baseURL.replace("/api", "")}${dadosUsuario.foto}`
                    : "https://i.pravatar.cc/100"
                }
                alt="avatar"
                className="avatar"
              />

              <div className="avatar-overlay">
                <span>{enviandoFoto ? "Enviando..." : "Editar"}</span>
              </div>

              <input
                ref={inputFotoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleSelecionarFoto}
              />
            </div>

            <div>
              <span className="user-name">Olá, {dadosUsuario?.nome}</span>
              <div style={{ color: "#9fb3c8", fontSize: 13 }}>
                Toque na foto para alterar
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="notification-btn"
              onClick={() => setMostrarMensagens(!mostrarMensagens)}
            >
              🔔
              {notificacoesNaoLidas > 0 && (
                <span className="notification-badge">
                  {notificacoesNaoLidas}
                </span>
              )}
            </button>

            <button className="logout-btn" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        {mostrarMensagens && (
          <div className="main-card" style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ color: "#fff", margin: 0 }}>Notificações</h3>

              <button
                className="action-btn secondary"
                onClick={limparNotificacoes}
              >
                Limpar notificações
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {mensagens.length === 0 ? (
                <p style={{ color: "#ccc" }}>Nenhuma notificação.</p>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg._id}
                    className="extrato-item"
                    style={{
                      flexDirection: "column",
                      alignItems: "stretch",
                      opacity: msg.lida ? 0.75 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        onClick={() => abrirMensagem(msg)}
                        style={{ cursor: "pointer", flex: 1 }}
                      >
                        <strong>{msg.titulo}</strong>
                        <div className="extrato-data">
                          {new Date(msg.createdAt).toLocaleString("pt-BR")}
                        </div>
                        <div style={{ marginTop: 8 }}>{msg.conteudo}</div>
                      </div>

                      <button
                        className="action-btn secondary"
                        onClick={() => removerMensagem(msg)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="main-card">
          <div className="actions">
            <button
              className="action-btn"
              onClick={() => setMostrarScanner(true)}
            >
              Ler QR Code
            </button>
          </div>

          <div className="dashboard-content">
            <div className="balance-card teleios-balance-card">
              <img
                src={moedaTeleios}
                alt="Moeda Teleios"
                className="teleios-coin-logo"
              />

              <div className="balance-label">Saldo</div>

              <div className="balance-value">
                {saldoAtual.toLocaleString("pt-BR")} Coins
              </div>

              <div className="teleios-level-badge">{nivelAtual}</div>

              <div className="teleios-progress-wrapper">
                <div className="teleios-progress-track">
                  <div
                    className="teleios-progress-fill"
                    style={{ width: `${progressoNivel}%` }}
                  />
                </div>

                <div className="teleios-progress-text">
                  Faltam {coinsProximoNivel} coins para o próximo nível
                </div>
              </div>
            </div>
          </div>

          <div className="extrato">
            <h3>Ranking</h3>

            {ranking.length === 0 ? (
              <p style={{ color: "#ccc" }}>Nenhum usuário no ranking.</p>
            ) : (
              ranking.map((item, index) => {
                const info = getRankingInfo(index);
                const nivelRanking = getNivelPorSaldo(item.saldo);

                return (
                  <div className={info.classe} key={item._id}>
                    <div className="ranking-esquerda">
                      <span className="ranking-medalha">{info.medalha}</span>

                      <div className="ranking-textos">
                        <strong>
                          {info.posicao} {item.nome}
                        </strong>
                        <div className="ranking-nivel">{nivelRanking}</div>
                      </div>
                    </div>

                    <div className="ranking-saldo">
                      {Number(item.saldo || 0).toLocaleString("pt-BR")} Coins
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="extrato">
            <h3>Extrato</h3>

            {extrato.length === 0 ? (
              <p style={{ color: "#ccc" }}>Nenhuma movimentação encontrada.</p>
            ) : (
              extrato.map((item) => (
                <div className="extrato-item" key={item._id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <div className="extrato-data">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div
                    className={
                      item.tipo === "entrada" ? "valor-entrada" : "valor-saida"
                    }
                  >
                    {item.tipo === "entrada" ? "+" : "-"} {item.valor} Coins
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Footer />
      </div>

      {mostrarScanner && (
        <QRCodeScanner
          onClose={() => setMostrarScanner(false)}
          onResgateSucesso={async () => {
            setMostrarScanner(false);
            await carregarDashboard();
          }}
        />
      )}

      {mostrarCropModal && (
        <div className="scanner-overlay">
          <div className="crop-modal">
            <h3>Ajustar foto</h3>

            <div className="crop-container">
              <Cropper
                image={imagemOriginal}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="crop-controls">
              <label style={{ color: "#fff", fontSize: 14 }}>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </div>

            <div className="crop-actions">
              <button
                className="action-btn secondary"
                onClick={cancelarCrop}
                disabled={enviandoFoto}
              >
                Cancelar
              </button>

              <button
                className="action-btn"
                onClick={confirmarCrop}
                disabled={enviandoFoto}
              >
                {enviandoFoto ? "Salvando..." : "Usar foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensagemPopup && (
        <div className="scanner-overlay">
          <div className="scanner-modal">
            <h3>{mensagemPopup.titulo}</h3>
            <p style={{ color: "#dfe8ef", lineHeight: 1.5 }}>
              {mensagemPopup.conteudo}
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="action-btn secondary"
                onClick={() => setMensagemPopup(null)}
              >
                Fechar
              </button>

              <button
                className="action-btn"
                onClick={() => naoMostrarNovamente(mensagemPopup)}
              >
                Não mostrar novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
