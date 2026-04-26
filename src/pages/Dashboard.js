import "../App.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import api, { requestWithRetry } from "../services/api";
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
  const [grupoRanking, setGrupoRanking] = useState("");
  
  const [rankingNext, setRankingNext] = useState([]);
  const [rankingGE, setRankingGE] = useState([]);
  const [rankingLideres, setRankingLideres] = useState([]);
  
  const [mostrarRankingNext, setMostrarRankingNext] = useState(false);
  const [mostrarRankingGE, setMostrarRankingGE] = useState(false);
  const [mostrarRankingLideres, setMostrarRankingLideres] = useState(false);
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
  const [mostrarExtratoCompleto, setMostrarExtratoCompleto] = useState(false);
  const [nomesNiveis, setNomesNiveis] = useState([
    "Nível 1",
    "Pro",
    "Elite",
    "Legend",
    "Master",
    "Supreme",
    "Omega",
  ]);
  const [coinsPerLevel, setCoinsPerLevel] = useState(500);
  const [coinLogoUrl, setCoinLogoUrl] = useState("");
  const [erroExtrato, setErroExtrato] = useState("");
  const [erroRanking, setErroRanking] = useState("");

  const inputFotoRef = useRef(null);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      setErroExtrato("");
      setErroRanking("");

      const resultados = await Promise.allSettled([
        requestWithRetry(() => api.get("/auth/me"), {
          retries: 2,
          delayMs: 1500,
        }),
        requestWithRetry(() => api.get("/user/extrato"), {
          retries: 2,
          delayMs: 1500,
        }),
        requestWithRetry(() => api.get("/user/ranking"), {
          retries: 2,
          delayMs: 1500,
        }),
        requestWithRetry(() => api.get("/user/messages"), {
          retries: 2,
          delayMs: 1200,
        }),
        requestWithRetry(() => api.get("/user/messages/popup"), {
          retries: 2,
          delayMs: 1200,
        }),
        requestWithRetry(() => api.get("/layout/public"), {
          retries: 2,
          delayMs: 1200,
        }),
      ]);

      const [
        usuarioResult,
        extratoResult,
        rankingResult,
        mensagensResult,
        popupResult,
        layoutResult,
      ] = resultados;

      if (usuarioResult.status === "fulfilled") {
        setDadosUsuario(usuarioResult.value.data);
      } else {
        console.error("Erro ao carregar /auth/me:", usuarioResult.reason);
      }

      if (extratoResult.status === "fulfilled") {
        setExtrato(extratoResult.value.data || []);
      } else {
        console.error("Erro ao carregar /user/extrato:", extratoResult.reason);
        setErroExtrato("Não foi possível carregar o extrato agora.");
      }

      if (rankingResult.status === "fulfilled") {
        const dadosRanking = rankingResult.value.data || {};
      
        if (dadosRanking.isLider) {
          setGrupoRanking("");
          setRanking([]);
      
          setRankingNext(dadosRanking.next?.ranking || []);
          setRankingGE(dadosRanking.ge?.ranking || []);
          setRankingLideres(dadosRanking.lideres?.ranking || []);
        } else {
          setGrupoRanking(dadosRanking.grupo || "");
          setRanking(dadosRanking.ranking || []);
      
          setRankingNext([]);
          setRankingGE([]);
          setRankingLideres([]);
        }
      } else {
        console.error("Erro ao carregar /user/ranking:", rankingResult.reason);
        setErroRanking("Não foi possível carregar o ranking agora.");
      }
      if (mensagensResult.status === "fulfilled") {
        setMensagens(mensagensResult.value.data || []);
      } else {
        console.error("Erro ao carregar /user/messages:", mensagensResult.reason);
      }

      if (popupResult.status === "fulfilled") {
        setMensagemPopup(popupResult.value.data || null);
      } else {
        console.error(
          "Erro ao carregar /user/messages/popup:",
          popupResult.reason,
        );
        setMensagemPopup(null);
      }

      if (layoutResult.status === "fulfilled") {
        const layoutData = layoutResult.value.data || {};

        setNomesNiveis(
          Array.isArray(layoutData.level_names) &&
            layoutData.level_names.length === 7
            ? layoutData.level_names
            : ["Nível 1", "Pro", "Elite", "Legend", "Master", "Supreme", "Omega"],
        );

        setCoinsPerLevel(Number(layoutData.coins_per_level) || 500);
        setCoinLogoUrl(layoutData.coin_logo_url || "");
      } else {
        console.error("Erro ao carregar /layout/public:", layoutResult.reason);
        setNomesNiveis([
          "Nível 1",
          "Pro",
          "Elite",
          "Legend",
          "Master",
          "Supreme",
          "Omega",
        ]);
        setCoinsPerLevel(500);
        setCoinLogoUrl("");
      }
    } catch (error) {
      console.error("Erro inesperado ao carregar dashboard:", error);
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

      const response = await requestWithRetry(
        () =>
          api.post("/user/foto", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }),
        {
          retries: 1,
          delayMs: 1200,
        },
      );

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
      await requestWithRetry(
        () => api.patch(`/user/messages/${msg._id}/read`),
        { retries: 1, delayMs: 1000 },
      );
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao marcar mensagem como lida:", error);
    }
  }

  async function removerMensagem(msg) {
    try {
      await requestWithRetry(
        () => api.patch(`/user/messages/${msg._id}/hide`),
        { retries: 1, delayMs: 1000 },
      );
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
      await requestWithRetry(
        () => api.patch("/user/messages/hide-all"),
        { retries: 1, delayMs: 1000 },
      );
      setMensagemPopup(null);
      await carregarDashboard();
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  }

  async function naoMostrarNovamente(msg) {
    try {
      await requestWithRetry(
        () => api.patch(`/user/messages/${msg._id}/hide`),
        { retries: 1, delayMs: 1000 },
      );
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

    if (index === 2) {
      return {
        medalha: "🥉",
        classe: "ranking-card ranking-terceiro",
        posicao: "3º",
      };
    }

    return {
      medalha: "🏅",
      classe: "ranking-card",
      posicao: `${index + 1}º`,
    };
  }

  function getNivelPorSaldo(saldo) {
    const saldoAtual = Number(saldo || 0);

    const niveis =
      Array.isArray(nomesNiveis) && nomesNiveis.length === 7
        ? nomesNiveis
        : ["Nível 1", "Pro", "Elite", "Legend", "Master", "Supreme", "Omega"];

    const divisor = Number(coinsPerLevel) > 0 ? Number(coinsPerLevel) : 500;
    const indice = Math.floor(saldoAtual / divisor);
    return niveis[indice] || `Nível ${indice + 1}`;
  }

  function getProgressoNivel(saldo) {
    const saldoAtual = Number(saldo || 0);
    const divisor = Number(coinsPerLevel) > 0 ? Number(coinsPerLevel) : 500;
    const resto = saldoAtual % divisor;
    return (resto / divisor) * 100;
  }

  function getCoinsParaProximoNivel(saldo) {
    const saldoAtual = Number(saldo || 0);
    const divisor = Number(coinsPerLevel) > 0 ? Number(coinsPerLevel) : 500;
    const resto = saldoAtual % divisor;

    if (resto === 0 && saldoAtual !== 0) {
      return divisor;
    }

    return divisor - resto;
  }

  function formatarNomeRanking(nome) {
    if (!nome) return "";
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length <= 1) return partes[0] || "";
    return `${partes[0]} ${partes[partes.length - 1]}`;
  }

  function obterUrlAvatar(foto) {
    if (!foto) {
      return `${process.env.PUBLIC_URL}/avatar-padrao.png`;
    }

    if (/^https?:\/\//i.test(foto)) {
      return foto;
    }

    return `${api.defaults.baseURL.replace("/api", "")}${foto}`;
  }

  function obterUrlLogoMoeda(foto) {
    if (!foto) {
      return moedaTeleios;
    }

    if (/^https?:\/\//i.test(foto)) {
      return foto;
    }

    return `${api.defaults.baseURL.replace("/api", "")}${foto}`;
  }

  const notificacoesNaoLidas = mensagens.filter((m) => !m.lida).length;
  const saldoAtual = Number(dadosUsuario?.saldo || 0);
  const nivelAtual = getNivelPorSaldo(saldoAtual);
  const progressoNivel = getProgressoNivel(saldoAtual);
  const coinsProximoNivel = getCoinsParaProximoNivel(saldoAtual);

  const extratoVisivel = extrato.slice(0, 4);
  const extratoRestante = extrato.slice(4);

  const tituloRanking = grupoRanking ? `Ranking ${grupoRanking}` : "Ranking";
  const usuarioEhLider = !!dadosUsuario?.is_lider;

    function renderizarListaRanking(lista) {
    if (!lista || lista.length === 0) {
      return <p style={{ color: "#ccc" }}>Nenhum usuário no ranking.</p>;
    }
  
    return lista.map((item, index) => {
      const info = getRankingInfo(index);
      const nivelRanking = getNivelPorSaldo(item.saldo);
  
      return (
        <div className={info.classe} key={item._id}>
          <div className="ranking-esquerda">
            <span className="ranking-medalha">{info.medalha}</span>
  
            <div className="ranking-textos">
              <strong>
                {info.posicao} {formatarNomeRanking(item.nome)}
              </strong>
            </div>
          </div>
  
          <div className="ranking-direita">
            <div className="ranking-nivel">{nivelRanking}</div>
            <div className="ranking-saldo">
              {Number(item.saldo || 0).toLocaleString("pt-BR")} Coins
            </div>
          </div>
        </div>
      );
    });
  }
  
  function renderizarRankingColapsavel(titulo, aberto, setAberto, lista) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="action-btn secondary"
          onClick={() => setAberto((prev) => !prev)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: aberto ? 12 : 0,
          }}
        >
          <span>{titulo}</span>
          <span>{aberto ? "Ocultar" : "Abrir"}</span>
        </button>
  
        {aberto && renderizarListaRanking(lista)}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="teleios-loading-screen">
        <div className="teleios-loading-box">
          <div className="teleios-loading-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard app-theme-bg">
      <div className="dashboard-wrapper page-shell">
        <div className="header">
          <div className="user-info">
            <div className="avatar-user-block">
              <div
                className={`avatar-upload ${
                  dadosUsuario?.is_lider ? "avatar-upload-lider" : ""
                }`}
                onClick={abrirSeletorFoto}
                title="Clique para alterar a foto"
              >
                <img
                  src={obterUrlAvatar(dadosUsuario?.foto)}
                  alt="avatar"
                  className={`avatar ${
                    dadosUsuario?.is_lider ? "avatar-lider" : ""
                  }`}
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

              {dadosUsuario?.is_lider && (
                <span className="lider-badge lider-badge-below">LÍDER</span>
              )}
            </div>

            <div className="user-text-block">
              <span className="user-name">
                Olá, {dadosUsuario?.nome?.trim()?.split(/\s+/)[0] || "Usuário"}
              </span>

              <div className="user-header-level">{nivelAtual}</div>
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
                src={obterUrlLogoMoeda(coinLogoUrl)}
                alt="Moeda"
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
            <h3>{usuarioEhLider ? "Rankings" : tituloRanking}</h3>
          
            {erroRanking ? (
              <p style={{ color: "#ffb3b3" }}>{erroRanking}</p>
            ) : usuarioEhLider ? (
              <>
                {renderizarRankingColapsavel(
                  "Ranking Next",
                  mostrarRankingNext,
                  setMostrarRankingNext,
                  rankingNext,
                )}
          
                {renderizarRankingColapsavel(
                  "Ranking GE",
                  mostrarRankingGE,
                  setMostrarRankingGE,
                  rankingGE,
                )}
          
                {renderizarRankingColapsavel(
                  "Ranking Líderes",
                  mostrarRankingLideres,
                  setMostrarRankingLideres,
                  rankingLideres,
                )}
              </>
            ) : (
              renderizarListaRanking(ranking)
            )}
          </div>

          <div className="extrato">
            <h3>Extrato</h3>

            {erroExtrato ? (
              <p style={{ color: "#ffb3b3" }}>{erroExtrato}</p>
            ) : extrato.length === 0 ? (
              <p style={{ color: "#ccc" }}>Nenhuma movimentação encontrada.</p>
            ) : (
              <>
                {extratoVisivel.map((item) => (
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
                ))}

                {extratoRestante.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="action-btn secondary"
                      onClick={() =>
                        setMostrarExtratoCompleto(!mostrarExtratoCompleto)
                      }
                    >
                      {mostrarExtratoCompleto
                        ? "Ocultar movimentações antigas"
                        : `Mostrar mais ${extratoRestante.length} movimentações`}
                    </button>

                    {mostrarExtratoCompleto && (
                      <div style={{ marginTop: 12 }}>
                        {extratoRestante.map((item) => (
                          <div className="extrato-item" key={item._id}>
                            <div>
                              <strong>{item.descricao}</strong>
                              <div className="extrato-data">
                                {new Date(item.createdAt).toLocaleString("pt-BR")}
                              </div>
                            </div>

                            <div
                              className={
                                item.tipo === "entrada"
                                  ? "valor-entrada"
                                  : "valor-saida"
                              }
                            >
                              {item.tipo === "entrada" ? "+" : "-"} {item.valor}{" "}
                              Coins
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
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
