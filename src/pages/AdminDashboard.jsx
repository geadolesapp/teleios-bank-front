import "../App.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Footer from "../components/Footer";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import olhoAberto from "../assets/olho-aberto.png";
import olhoFechado from "../assets/olho-fechado.png";

function ClickMap({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });

  return null;
}

function MapUpdater({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && Array.isArray(center)) {
      map.setView(center, zoom || 16);
    }
  }, [center, zoom, map]);

  return null;
}

function ModalMapa({ onClose, onConfirm }) {
  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [enderecoPreview, setEnderecoPreview] = useState("");
  const [carregandoEndereco, setCarregandoEndereco] = useState(false);

  const [enderecoBusca, setEnderecoBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscandoLocais, setBuscandoLocais] = useState(false);

  const [mapCenter, setMapCenter] = useState([-25.5307, -49.2037]);
  const [mapZoom, setMapZoom] = useState(13);

  async function buscarEndereco(lat, lng) {
    try {
      setCarregandoEndereco(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      const data = await response.json();

      setEnderecoPreview(data.display_name || `Lat ${lat}, Lng ${lng}`);
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      setEnderecoPreview(`Lat ${lat}, Lng ${lng}`);
    } finally {
      setCarregandoEndereco(false);
    }
  }

  async function pesquisarEndereco() {
    if (!enderecoBusca.trim()) {
      alert("Digite um endereço para pesquisar");
      return;
    }

    try {
      setBuscandoLocais(true);
      setResultadosBusca([]);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          enderecoBusca.trim(),
        )}&limit=5`,
      );

      const data = await response.json();
      setResultadosBusca(Array.isArray(data) ? data : []);

      if (!data || data.length === 0) {
        alert("Nenhum endereço encontrado");
      }
    } catch (error) {
      console.error("Erro ao pesquisar endereço:", error);
      alert("Erro ao pesquisar endereço");
    } finally {
      setBuscandoLocais(false);
    }
  }

  function selecionarResultado(resultado) {
    const lat = Number(resultado.lat);
    const lon = Number(resultado.lon);

    const ponto = { lat, lng: lon };

    setPontoSelecionado(ponto);
    setEnderecoPreview(resultado.display_name || "");
    setEnderecoBusca(resultado.display_name || "");
    setMapCenter([lat, lon]);
    setMapZoom(17);
    setResultadosBusca([]);
  }

  async function handleSelecionar(latlng) {
    setPontoSelecionado(latlng);
    setMapCenter([latlng.lat, latlng.lng]);
    setMapZoom(17);
    await buscarEndereco(latlng.lat, latlng.lng);
  }

  function confirmarLocal() {
    if (!pontoSelecionado) {
      alert("Selecione um ponto no mapa");
      return;
    }

    onConfirm({
      nome: `Local ${Date.now()}`,
      endereco:
        enderecoPreview ||
        `Lat ${pontoSelecionado.lat}, Lng ${pontoSelecionado.lng}`,
      latitude: pontoSelecionado.lat,
      longitude: pontoSelecionado.lng,
    });
  }

  return (
    <div className="scanner-overlay">
      <div className="map-modal">
        <h3>Selecionar local no mapa</h3>

        <div className="actions" style={{ marginTop: 16, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Digite um endereço"
            value={enderecoBusca}
            onChange={(e) => setEnderecoBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                pesquisarEndereco();
              }
            }}
          />

          <button
            type="button"
            className="action-btn"
            onClick={pesquisarEndereco}
            disabled={buscandoLocais}
          >
            {buscandoLocais ? "Pesquisando..." : "Pesquisar endereço"}
          </button>
        </div>

        {resultadosBusca.length > 0 && (
          <div
            style={{
              marginBottom: 14,
              maxHeight: 180,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {resultadosBusca.map((resultado, index) => (
              <button
                key={`${resultado.place_id}-${index}`}
                type="button"
                className="action-btn secondary"
                style={{
                  textAlign: "left",
                  whiteSpace: "normal",
                  lineHeight: 1.4,
                }}
                onClick={() => selecionarResultado(resultado)}
              >
                {resultado.display_name}
              </button>
            ))}
          </div>
        )}

        <div className="map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />

            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ClickMap onSelect={handleSelecionar} />

            {pontoSelecionado && (
              <CircleMarker
                center={[pontoSelecionado.lat, pontoSelecionado.lng]}
                radius={10}
                pathOptions={{
                  color: "#00c2cb",
                  fillColor: "#00c2cb",
                  fillOpacity: 0.8,
                }}
              />
            )}
          </MapContainer>
        </div>

        <div className="map-info">
          {carregandoEndereco ? (
            <p>Buscando endereço...</p>
          ) : enderecoPreview ? (
            <p>
              <strong>Endereço:</strong> {enderecoPreview}
            </p>
          ) : (
            <p>Digite um endereço ou clique no mapa para selecionar um local.</p>
          )}
        </div>

        <div className="map-actions">
          <button className="action-btn" onClick={confirmarLocal}>
            Confirmar local
          </button>
          <button className="action-btn secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  open,
  onToggle,
  children,
  rightContent,
}) {
  return (
    <div className="main-card admin-inner-card">
      <div className="section-card-header">
        <div className="section-card-texts">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="section-card-actions">
          {rightContent}
          <button
            type="button"
            className="action-btn secondary section-toggle-btn"
            onClick={onToggle}
          >
            {open ? "Ocultar" : "Expandir"}
          </button>
        </div>
      </div>

      {open && <div style={{ marginTop: 18 }}>{children}</div>}
    </div>
  );
}

function AdminDashboard({ setUser }) {
  const [users, setUsers] = useState([]);

  const [novoNome, setNovoNome] = useState("");
  const [novoDataNascimento, setNovoDataNascimento] = useState("");
  const [novoSexo, setNovoSexo] = useState("");
  const [novoIdade, setNovoIdade] = useState("");
  const [novoCelular, setNovoCelular] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoSaldo, setNovoSaldo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editDataNascimento, setEditDataNascimento] = useState("");
  const [editSexo, setEditSexo] = useState("");
  const [editIdade, setEditIdade] = useState("");
  const [editCelular, setEditCelular] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSenha, setEditSenha] = useState("");
  const [mostrarSenhaEdicao, setMostrarSenhaEdicao] = useState(false);

  const [qrcodes, setQrcodes] = useState([]);
  const [carregandoQRCodes, setCarregandoQRCodes] = useState(true);
  const [salvandoQRCode, setSalvandoQRCode] = useState(false);

  const [qrNome, setQrNome] = useState("");
  const [qrValor, setQrValor] = useState("");
  const [qrDataInicio, setQrDataInicio] = useState("");
  const [qrHoraInicio, setQrHoraInicio] = useState("");
  const [qrDataFim, setQrDataFim] = useState("");
  const [qrHoraFim, setQrHoraFim] = useState("");
  const [qrRaio, setQrRaio] = useState("100");
  const [qrLocais, setQrLocais] = useState([]);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const [arquivoImportacao, setArquivoImportacao] = useState(null);
  const [importandoUsuarios, setImportandoUsuarios] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState(null);

  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [mostrarCriacaoManual, setMostrarCriacaoManual] = useState(false);
  const [mostrarImportacao, setMostrarImportacao] = useState(false);
  const [mostrarLayout, setMostrarLayout] = useState(false);
  const [mostrarGerarQR, setMostrarGerarQR] = useState(false);
  const [mostrarQRCodesGerados, setMostrarQRCodesGerados] = useState(false);
  const [mostrarMensagensAdmin, setMostrarMensagensAdmin] = useState(false);
  const [mostrarRankingNext, setMostrarRankingNext] = useState(false);
  const [mostrarRankingGE, setMostrarRankingGE] = useState(false);

  const [buscaUsuario, setBuscaUsuario] = useState("");

  const [layoutNome, setLayoutNome] = useState("");
  const [layoutCorPrimaria, setLayoutCorPrimaria] = useState("#00c2cb");
  const [layoutCorSecundaria, setLayoutCorSecundaria] = useState("#0f2a3a");
  const [layoutCorDestaque, setLayoutCorDestaque] = useState("#6ecbff");
  const [layoutFonte, setLayoutFonte] = useState("Inter");
  const [layoutMostrarNuvens, setLayoutMostrarNuvens] = useState(true);
  const [layoutLogoArquivo, setLayoutLogoArquivo] = useState(null);
  const [salvandoLayout, setSalvandoLayout] = useState(false);

  const [mensagensAdmin, setMensagensAdmin] = useState([]);
  const [tituloMensagem, setTituloMensagem] = useState("");
  const [conteudoMensagem, setConteudoMensagem] = useState("");
  const [grupoDestinoMensagem, setGrupoDestinoMensagem] = useState("todos");
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);

  const [rankingNext, setRankingNext] = useState([]);
  const [rankingGE, setRankingGE] = useState([]);
  const [carregandoRankingsAdmin, setCarregandoRankingsAdmin] =
    useState(true);

  const fontesPermitidas = [
    "Inter",
    "Poppins",
    "Roboto",
    "Montserrat",
    "Nunito",
  ];

  useEffect(() => {
    carregarUsuarios();
    carregarQRCodes();
    carregarLayout();
    carregarMensagensAdmin();
    carregarRankingsAdmin();
  }, []);

  function aplicarMascaraData(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 8);

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;

    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  }

  function aplicarMascaraHora(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 4);

    if (numeros.length <= 2) return numeros;

    return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
  }

  function converterIsoParaDataBR(valor) {
    if (!valor) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      return valor;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const [ano, mes, dia] = valor.split("-");
      return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "";

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return `${dia}/${mes}/${ano}`;
  }

  function validarDataBR(valor) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return false;

    const [dia, mes, ano] = valor.split("/").map(Number);
    const data = new Date(ano, mes - 1, dia);

    return (
      data.getFullYear() === ano &&
      data.getMonth() === mes - 1 &&
      data.getDate() === dia
    );
  }

  function validarHora(valor) {
    if (!/^\d{2}:\d{2}$/.test(valor)) return false;

    const [hora, minuto] = valor.split(":").map(Number);

    return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
  }

  function converterDataBRParaISO(valor) {
    if (!valor) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return valor;
    }

    if (!validarDataBR(valor)) return "";

    const [dia, mes, ano] = valor.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  function montarDataHoraISO(dataBR, hora) {
    if (!validarDataBR(dataBR) || !validarHora(hora)) return "";

    const [dia, mes, ano] = dataBR.split("/").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);

    return new Date(ano, mes - 1, dia, horas, minutos, 0, 0).toISOString();
  }

  function calcularIdade(dataNascimento) {
    if (!dataNascimento) return "";

    const dataBR = converterIsoParaDataBR(dataNascimento);

    if (!validarDataBR(dataBR)) return "";

    const [dia, mes, ano] = dataBR.split("/").map(Number);
    const hoje = new Date();
    const nascimento = new Date(ano, mes - 1, dia);

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diferencaMes = hoje.getMonth() - nascimento.getMonth();

    if (
      diferencaMes < 0 ||
      (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())
    ) {
      idade--;
    }

    return idade >= 0 ? String(idade) : "";
  }

  function formatarDataExibicao(valor) {
    return converterIsoParaDataBR(valor) || "-";
  }

  function formatarNomeRanking(nome) {
    if (!nome) return "";
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length <= 1) return partes[0] || "";
    return `${partes[0]} ${partes[partes.length - 1]}`;
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

  function formatarGrupoMensagem(grupo) {
    if (grupo === "todos") return "Enviada para todos";
    if (grupo === "next") return "Enviada para o grupo Next";
    if (grupo === "ge") return "Enviada para o grupo GE";
    return "Grupo não identificado";
  }

  async function carregarUsuarios() {
    try {
      setErro("");
      setLoading(true);

      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao carregar usuários";
      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  }

  async function carregarRankingsAdmin() {
    try {
      setCarregandoRankingsAdmin(true);

      const response = await api.get("/user/admin-rankings");

      setRankingNext(response.data?.next?.ranking || []);
      setRankingGE(response.data?.ge?.ranking || []);
    } catch (error) {
      console.error("Erro ao carregar rankings do admin:", error);
      setRankingNext([]);
      setRankingGE([]);
    } finally {
      setCarregandoRankingsAdmin(false);
    }
  }

  function baixarModeloUsuarios() {
    const conteudo = "nome;data_nascimento;email;celular;sexo;senha;saldo_inicial\n";

    const blob = new Blob([conteudo], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_usuarios.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  async function carregarLayout() {
    try {
      const response = await api.get("/layout");
      const config = response.data;

      setLayoutNome(config.app_name || "");
      setLayoutCorPrimaria(config.primary_color || "#00c2cb");
      setLayoutCorSecundaria(config.secondary_color || "#0f2a3a");
      setLayoutCorDestaque(config.accent_color || "#6ecbff");
      setLayoutFonte(config.font_family || "Inter");
      setLayoutMostrarNuvens(!!config.show_clouds);
    } catch (error) {
      console.error("Erro ao carregar layout:", error);
    }
  }

  async function salvarLayout() {
    try {
      setSalvandoLayout(true);

      await api.put("/layout", {
        app_name: layoutNome,
        primary_color: layoutCorPrimaria,
        secondary_color: layoutCorSecundaria,
        accent_color: layoutCorDestaque,
        font_family: layoutFonte,
        show_clouds: layoutMostrarNuvens,
      });

      if (layoutLogoArquivo) {
        const formData = new FormData();
        formData.append("logo", layoutLogoArquivo);

        await api.post("/layout/logo", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setLayoutLogoArquivo(null);
      }

      alert("Layout atualizado com sucesso");
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao salvar layout";
      alert(mensagem);
    } finally {
      setSalvandoLayout(false);
    }
  }

  async function importarUsuariosPorArquivo() {
    if (!arquivoImportacao) {
      alert("Selecione um arquivo para importar");
      return;
    }

    try {
      setImportandoUsuarios(true);
      setResultadoImportacao(null);

      const formData = new FormData();
      formData.append("arquivo", arquivoImportacao);

      const response = await api.post("/admin/users/importar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResultadoImportacao(response.data);
      setArquivoImportacao(null);
      await carregarUsuarios();
      await carregarRankingsAdmin();
      setMostrarUsuarios(true);
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao importar usuários";
      alert(mensagem);
    } finally {
      setImportandoUsuarios(false);
    }
  }

  async function carregarQRCodes() {
    try {
      setCarregandoQRCodes(true);

      const response = await api.get("/admin/qrcodes");
      setQrcodes(response.data);
    } catch (error) {
      console.error("Erro ao carregar QR Codes:", error);
    } finally {
      setCarregandoQRCodes(false);
    }
  }

  async function carregarMensagensAdmin() {
    try {
      const response = await api.get("/admin/messages");
      setMensagensAdmin(response.data);
    } catch (error) {
      console.error("Erro ao carregar mensagens admin:", error);
    }
  }

  async function enviarMensagemAdmin() {
    if (!tituloMensagem.trim() || !conteudoMensagem.trim()) {
      alert("Informe título e conteúdo da mensagem");
      return;
    }

    try {
      setEnviandoMensagem(true);

      await api.post("/admin/messages", {
        titulo: tituloMensagem.trim(),
        conteudo: conteudoMensagem.trim(),
        grupo_destino: grupoDestinoMensagem,
      });

      setTituloMensagem("");
      setConteudoMensagem("");
      setGrupoDestinoMensagem("todos");

      await carregarMensagensAdmin();
      alert("Mensagem enviada com sucesso");
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao enviar mensagem";
      alert(mensagem);
    } finally {
      setEnviandoMensagem(false);
    }
  }

  async function excluirMensagemAdmin(id) {
    const confirmar = window.confirm("Deseja excluir esta mensagem?");
    if (!confirmar) return;

    try {
      await api.delete(`/admin/messages/${id}`);
      await carregarMensagensAdmin();
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao excluir mensagem";
      alert(mensagem);
    }
  }

  async function limparMensagensAdmin() {
    if (mensagensAdmin.length === 0) {
      alert("Não há mensagens para limpar");
      return;
    }

    const confirmar = window.confirm(
      "Deseja excluir todas as mensagens do admin?",
    );
    if (!confirmar) return;

    try {
      await api.delete("/admin/messages");
      await carregarMensagensAdmin();
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao limpar mensagens";
      alert(mensagem);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();

    if (!termo) return users;

    return users.filter((user) => {
      const nome = user.nome?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const celular = user.celular?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        celular.includes(termo)
      );
    });
  }, [users, buscaUsuario]);

  function limparFormularioCriacao() {
    setNovoNome("");
    setNovoDataNascimento("");
    setNovoSexo("");
    setNovoIdade("");
    setNovoCelular("");
    setNovoEmail("");
    setNovoSaldo("");
    setNovaSenha("");
    setMostrarSenha(false);
  }

  function limparFormularioQRCode() {
    setQrNome("");
    setQrValor("");
    setQrDataInicio("");
    setQrHoraInicio("");
    setQrDataFim("");
    setQrHoraFim("");
    setQrRaio("100");
    setQrLocais([]);
  }

  function iniciarEdicao(user) {
    setUsuarioEmEdicao(user._id);
    setEditNome(user.nome || "");
    setEditDataNascimento(converterIsoParaDataBR(user.data_nascimento || ""));
    setEditSexo(user.sexo || "");
    setEditIdade(user.idade || "");
    setEditCelular(user.celular || "");
    setEditEmail(user.email || "");
    setEditSenha("");
    setMostrarSenhaEdicao(false);
    setMostrarUsuarios(true);
  }

  function cancelarEdicao() {
    setUsuarioEmEdicao(null);
    setEditNome("");
    setEditDataNascimento("");
    setEditSexo("");
    setEditIdade("");
    setEditCelular("");
    setEditEmail("");
    setEditSenha("");
    setMostrarSenhaEdicao(false);
  }

  async function criarUsuario() {
    if (!novoNome.trim()) {
      alert("Informe o nome do usuário");
      return;
    }

    if (!novoDataNascimento.trim()) {
      alert("Informe a data de nascimento");
      return;
    }

    if (!validarDataBR(novoDataNascimento)) {
      alert("Informe uma data de nascimento válida no formato DD/MM/AAAA");
      return;
    }

    if (!novoEmail.trim()) {
      alert("Informe o e-mail do usuário");
      return;
    }

    if (!novaSenha.trim()) {
      alert("Informe uma senha");
      return;
    }

    if (Number(novoSaldo) < 0) {
      alert("Saldo não pode ser negativo");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await api.post("/admin/users", {
        nome: novoNome.trim(),
        data_nascimento: converterDataBRParaISO(novoDataNascimento),
        sexo: novoSexo || "",
        idade: Number(novoIdade) || 0,
        celular: novoCelular.trim(),
        email: novoEmail.trim(),
        senha: novaSenha,
        saldo: Number(novoSaldo) || 0,
      });

      limparFormularioCriacao();
      await carregarUsuarios();
      await carregarRankingsAdmin();
      setMostrarUsuarios(true);
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao criar usuário";
      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!editNome.trim()) {
      alert("Informe o nome do usuário");
      return;
    }

    if (!editDataNascimento.trim()) {
      alert("Informe a data de nascimento");
      return;
    }

    if (!validarDataBR(editDataNascimento)) {
      alert("Informe uma data de nascimento válida no formato DD/MM/AAAA");
      return;
    }

    if (!editEmail.trim()) {
      alert("Informe o e-mail do usuário");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const payload = {
        nome: editNome.trim(),
        data_nascimento: converterDataBRParaISO(editDataNascimento),
        sexo: editSexo || "",
        idade: Number(editIdade) || 0,
        celular: editCelular.trim(),
        email: editEmail.trim(),
      };

      if (editSenha.trim()) {
        payload.senha = editSenha.trim();
      }

      await api.put(`/admin/users/${usuarioEmEdicao}`, payload);

      cancelarEdicao();
      await carregarUsuarios();
      await carregarRankingsAdmin();
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao editar usuário";
      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(id) {
    const confirmar = window.confirm("Deseja realmente excluir este usuário?");
    if (!confirmar) return;

    try {
      setErro("");
      await api.delete(`/admin/users/${id}`);

      if (usuarioEmEdicao === id) {
        cancelarEdicao();
      }

      await carregarUsuarios();
      await carregarRankingsAdmin();
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao excluir usuário";
      setErro(mensagem);
    }
  }

  async function alterarSaldo(id, tipo) {
    const valorDigitado = window.prompt(
      `Informe o valor para ${tipo === "entrada" ? "adicionar" : "remover"}`,
    );

    if (!valorDigitado) return;

    const valor = Number(valorDigitado);

    if (Number.isNaN(valor) || valor <= 0) {
      alert("Informe um valor válido maior que zero");
      return;
    }

    const descricao =
      tipo === "entrada"
        ? "Depósito manual do administrador"
        : "Ajuste manual do administrador";

    try {
      setErro("");

      await api.patch(`/admin/users/${id}/saldo`, {
        tipo,
        valor,
        descricao,
      });

      await carregarUsuarios();
      await carregarRankingsAdmin();
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao alterar saldo";
      setErro(mensagem);
    }
  }

  function adicionarLocal(local) {
    setQrLocais((prev) => [...prev, local]);
    setMostrarMapa(false);
  }

  function removerLocal(index) {
    setQrLocais((prev) => prev.filter((_, i) => i !== index));
  }

  async function criarQRCode() {
    if (!qrNome.trim()) {
      alert("Informe o nome da campanha");
      return;
    }

    if (!qrValor || Number(qrValor) <= 0) {
      alert("Informe um valor válido");
      return;
    }

    if (!qrDataInicio || !qrHoraInicio || !qrDataFim || !qrHoraFim) {
      alert("Informe a data e hora de início e fim");
      return;
    }

    if (!validarDataBR(qrDataInicio) || !validarHora(qrHoraInicio)) {
      alert("Informe uma data e hora de início válidas");
      return;
    }

    if (!validarDataBR(qrDataFim) || !validarHora(qrHoraFim)) {
      alert("Informe uma data e hora de fim válidas");
      return;
    }

    const inicioISO = montarDataHoraISO(qrDataInicio, qrHoraInicio);
    const fimISO = montarDataHoraISO(qrDataFim, qrHoraFim);

    if (!inicioISO || !fimISO) {
      alert("Não foi possível montar as datas do QR Code");
      return;
    }

    if (new Date(inicioISO) >= new Date(fimISO)) {
      alert("A data/hora final deve ser maior que a data/hora inicial");
      return;
    }

    if (qrLocais.length > 0 && (!qrRaio || Number(qrRaio) <= 0)) {
      alert("Informe um raio válido");
      return;
    }

    try {
      setSalvandoQRCode(true);

      const locaisPayload = qrLocais.map((local, index) => ({
        nome: `Local ${index + 1}`,
        endereco: local.endereco,
        latitude: Number(local.latitude),
        longitude: Number(local.longitude),
        raio_metros: Number(qrRaio),
      }));

      await api.post("/admin/qrcodes", {
        nome: qrNome.trim(),
        valor: Number(qrValor),
        inicio: inicioISO,
        fim: fimISO,
        locais_permitidos: locaisPayload,
      });

      limparFormularioQRCode();
      await carregarQRCodes();
      alert("QR Code criado com sucesso");
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao criar QR Code";
      alert(mensagem);
    } finally {
      setSalvandoQRCode(false);
    }
  }

  async function excluirQRCode(id) {
    const confirmar = window.confirm("Deseja realmente excluir este QR Code?");
    if (!confirmar) return;

    try {
      await api.delete(`/admin/qrcodes/${id}`);
      await carregarQRCodes();
    } catch (error) {
      const mensagem =
        error.response?.data?.message || "Erro ao excluir QR Code";
      alert(mensagem);
    }
  }

  function baixarQRCode(base64, nome) {
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${nome || "qrcode"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <div className="dashboard app-theme-bg">
      <div className="dashboard-wrapper page-shell">
        <div className="header">
          <span className="user-name">Admin Dashboard</span>

          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>

        <div className="admin-sections-shell">
          <SectionCard
            title="Criar usuário manualmente"
            subtitle="Cadastro individual de usuário"
            open={mostrarCriacaoManual}
            onToggle={() => setMostrarCriacaoManual(!mostrarCriacaoManual)}
          >
            <div className="actions">
              <input
                className="input"
                placeholder="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />

              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="Data de nascimento (DD/MM/AAAA)"
                value={novoDataNascimento}
                onChange={(e) => {
                  const data = aplicarMascaraData(e.target.value);
                  setNovoDataNascimento(data);
                  setNovoIdade(calcularIdade(data));
                }}
              />

              <select
                className="input"
                value={novoSexo}
                onChange={(e) => setNovoSexo(e.target.value)}
              >
                <option value="">Selecione o sexo</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>

              <input
                className="input"
                placeholder="Idade calculada automaticamente"
                type="number"
                value={novoIdade}
                disabled
              />

              <input
                className="input"
                placeholder="Celular"
                value={novoCelular}
                onChange={(e) => setNovoCelular(e.target.value)}
              />

              <input
                className="input"
                placeholder="E-mail"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
              />

              <input
                className="input"
                placeholder="Saldo inicial"
                type="number"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
              />

              <div className="input-wrapper">
                <input
                  className="input"
                  placeholder="Senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  <img
                    src={mostrarSenha ? olhoFechado : olhoAberto}
                    alt={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="icone-olho"
                  />
                </button>
              </div>

              <button
                className="action-btn"
                onClick={criarUsuario}
                disabled={salvando}
              >
                {salvando ? "Criando..." : "Criar"}
              </button>
            </div>

            {erro && (
              <p style={{ color: "#ff6b6b", marginTop: "12px" }}>{erro}</p>
            )}
          </SectionCard>

          <SectionCard
            title="Criar usuários por carga"
            subtitle="Importação em lote por arquivo"
            open={mostrarImportacao}
            onToggle={() => setMostrarImportacao(!mostrarImportacao)}
          >
            <div className="actions">
              <button
                type="button"
                className="action-btn secondary"
                onClick={baixarModeloUsuarios}
              >
                Baixar modelo
              </button>

              <input
                className="input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) =>
                  setArquivoImportacao(e.target.files?.[0] || null)
                }
              />

              <button
                type="button"
                className="action-btn"
                onClick={importarUsuariosPorArquivo}
                disabled={importandoUsuarios}
              >
                {importandoUsuarios ? "Importando..." : "Importar usuários"}
              </button>
            </div>

            <p style={{ color: "#9fb3c8", marginTop: 10, fontSize: 14 }}>
              Use o modelo padrão com as colunas: nome, data_nascimento, email,
              celular, sexo, senha, saldo_inicial.
            </p>

            {resultadoImportacao && (
              <div style={{ marginTop: 16 }}>
                <p style={{ color: "#fff" }}>
                  <strong>Resultado da importação</strong>
                </p>

                <p style={{ color: "#9fb3c8" }}>
                  Total de linhas: {resultadoImportacao.total_linhas} | Importados:{" "}
                  {resultadoImportacao.importados} | Erros: {resultadoImportacao.erros}
                </p>

                <div
                  style={{
                    maxHeight: 220,
                    overflowY: "auto",
                    marginTop: 10,
                    paddingRight: 6,
                  }}
                >
                  {resultadoImportacao.resultados?.map((item, index) => (
                    <div className="extrato-item" key={index}>
                      <div>
                        <strong>{item.motivo}</strong>
                      </div>

                      <button
                        type="button"
                        className="action-btn"
                        style={{
                          maxWidth: 90,
                          minWidth: 90,
                          padding: "10px 0",
                          flex: "none",
                        }}
                        onClick={() => setResultadoImportacao(null)}
                      >
                        OK
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Usuários cadastrados"
            subtitle={`Total: ${users.length}`}
            open={mostrarUsuarios}
            onToggle={() => setMostrarUsuarios(!mostrarUsuarios)}
          >
            <div style={{ marginTop: 0 }}>
              <input
                className="input"
                placeholder="Buscar por nome, e-mail ou celular"
                value={buscaUsuario}
                onChange={(e) => setBuscaUsuario(e.target.value)}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                maxHeight: 520,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {loading ? (
                <p style={{ color: "#ccc" }}>Carregando usuários...</p>
              ) : usuariosFiltrados.length === 0 ? (
                <p style={{ color: "#ccc" }}>
                  Nenhum usuário encontrado para essa busca.
                </p>
              ) : (
                usuariosFiltrados.map((user) => (
                  <div
                    className="extrato-item"
                    key={user._id}
                    style={{ flexDirection: "column", alignItems: "stretch" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong>{user.nome}</strong>
                        <div className="extrato-data">{user.email}</div>
                        <div className="extrato-data">
                          Celular: {user.celular || "-"}
                        </div>
                        <div className="extrato-data">
                          Sexo: {user.sexo || "-"} | Idade: {user.idade || 0}
                        </div>
                        <div className="extrato-data">
                          Nascimento: {formatarDataExibicao(user.data_nascimento)}
                        </div>
                        <div className="extrato-data">
                          Saldo:{" "}
                          {Number(user.saldo || 0).toLocaleString("pt-BR")}{" "}
                          Coins
                        </div>
                        <div className="extrato-data">Perfil: {user.role}</div>
                      </div>

                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        <button
                          className="action-btn"
                          onClick={() => alterarSaldo(user._id, "entrada")}
                        >
                          + saldo
                        </button>

                        <button
                          className="action-btn secondary"
                          onClick={() => alterarSaldo(user._id, "saida")}
                        >
                          - saldo
                        </button>

                        <button
                          className="action-btn secondary"
                          onClick={() => iniciarEdicao(user)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>

                    {usuarioEmEdicao === user._id && (
                      <div style={{ marginTop: 16 }}>
                        <div className="actions">
                          <input
                            className="input"
                            placeholder="Nome"
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                          />

                          <input
                            className="input"
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Data de nascimento (DD/MM/AAAA)"
                            value={editDataNascimento}
                            onChange={(e) => {
                              const data = aplicarMascaraData(e.target.value);
                              setEditDataNascimento(data);
                              setEditIdade(calcularIdade(data));
                            }}
                          />

                          <select
                            className="input"
                            value={editSexo}
                            onChange={(e) => setEditSexo(e.target.value)}
                          >
                            <option value="">Selecione o sexo</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Outro">Outro</option>
                          </select>

                          <input
                            className="input"
                            placeholder="Idade calculada automaticamente"
                            type="number"
                            value={editIdade}
                            disabled
                          />

                          <input
                            className="input"
                            placeholder="Celular"
                            value={editCelular}
                            onChange={(e) => setEditCelular(e.target.value)}
                          />

                          <input
                            className="input"
                            placeholder="E-mail"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />

                          <div className="input-wrapper">
                            <input
                              className="input"
                              placeholder="Nova senha (opcional)"
                              type={mostrarSenhaEdicao ? "text" : "password"}
                              value={editSenha}
                              onChange={(e) => setEditSenha(e.target.value)}
                            />

                            <button
                              type="button"
                              className="toggle-password"
                              onClick={() =>
                                setMostrarSenhaEdicao((prev) => !prev)
                              }
                              aria-label={
                                mostrarSenhaEdicao
                                  ? "Ocultar senha"
                                  : "Mostrar senha"
                              }
                            >
                              <img
                                src={
                                  mostrarSenhaEdicao
                                    ? olhoFechado
                                    : olhoAberto
                                }
                                alt={
                                  mostrarSenhaEdicao
                                    ? "Ocultar senha"
                                    : "Mostrar senha"
                                }
                                className="icone-olho"
                              />
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="action-btn"
                              onClick={salvarEdicao}
                              disabled={salvando}
                            >
                              {salvando ? "Salvando..." : "Salvar"}
                            </button>

                            <button
                              className="action-btn secondary"
                              onClick={cancelarEdicao}
                              disabled={salvando}
                            >
                              Cancelar
                            </button>

                            <button
                              className="action-btn secondary"
                              onClick={() => excluirUsuario(user._id)}
                              disabled={salvando}
                            >
                              Excluir usuário
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Mensagens do admin"
            subtitle="Envio de avisos para grupos"
            open={mostrarMensagensAdmin}
            onToggle={() => setMostrarMensagensAdmin(!mostrarMensagensAdmin)}
            rightContent={
              <button
                type="button"
                className="action-btn secondary section-inline-btn"
                onClick={limparMensagensAdmin}
              >
                Limpar
              </button>
            }
          >
            <div className="actions">
              <input
                className="input"
                placeholder="Título da mensagem"
                value={tituloMensagem}
                onChange={(e) => setTituloMensagem(e.target.value)}
              />

              <textarea
                className="input"
                placeholder="Escreva a mensagem"
                value={conteudoMensagem}
                onChange={(e) => setConteudoMensagem(e.target.value)}
                rows={5}
                style={{ resize: "vertical" }}
              />

              <select
                className="input"
                value={grupoDestinoMensagem}
                onChange={(e) => setGrupoDestinoMensagem(e.target.value)}
              >
                <option value="todos">Enviar para todos</option>
                <option value="next">Enviar para o grupo Next</option>
                <option value="ge">Enviar para o grupo GE</option>
              </select>

              <button
                className="action-btn"
                onClick={enviarMensagemAdmin}
                disabled={enviandoMensagem}
              >
                {enviandoMensagem ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ color: "#fff", marginBottom: 10 }}>
                Mensagens enviadas
              </h4>

              {mensagensAdmin.length === 0 ? (
                <p style={{ color: "#ccc" }}>Nenhuma mensagem enviada ainda.</p>
              ) : (
                mensagensAdmin.map((msg) => (
                  <div
                    className="extrato-item"
                    key={msg._id}
                    style={{ flexDirection: "column", alignItems: "stretch" }}
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
                      <div style={{ flex: 1 }}>
                        <strong>{msg.titulo}</strong>
                        <div className="extrato-data">
                          {new Date(msg.createdAt).toLocaleString("pt-BR")}
                        </div>
                        <div style={{ marginTop: 8, color: "#dfe8ef" }}>
                          {msg.conteudo}
                        </div>
                        <div className="extrato-data" style={{ marginTop: 8 }}>
                          {formatarGrupoMensagem(msg.grupo_destino)}
                        </div>
                      </div>

                      <button
                        className="action-btn secondary"
                        onClick={() => excluirMensagemAdmin(msg._id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Personalização do layout"
            subtitle="Tema visual da aplicação"
            open={mostrarLayout}
            onToggle={() => setMostrarLayout(!mostrarLayout)}
          >
            <div className="actions">
              <div className="color-field">
                <label className="color-label">Cor principal</label>
                <div className="color-input-wrap">
                  <input
                    type="color"
                    value={layoutCorPrimaria}
                    onChange={(e) => setLayoutCorPrimaria(e.target.value)}
                  />
                  <span>{layoutCorPrimaria}</span>
                </div>
              </div>

              <div className="color-field">
                <label className="color-label">Cor secundária</label>
                <div className="color-input-wrap">
                  <input
                    type="color"
                    value={layoutCorSecundaria}
                    onChange={(e) => setLayoutCorSecundaria(e.target.value)}
                  />
                  <span>{layoutCorSecundaria}</span>
                </div>
              </div>

              <div className="color-field">
                <label className="color-label">Cor de destaque</label>
                <div className="color-input-wrap">
                  <input
                    type="color"
                    value={layoutCorDestaque}
                    onChange={(e) => setLayoutCorDestaque(e.target.value)}
                  />
                  <span>{layoutCorDestaque}</span>
                </div>
              </div>

              <div style={{ width: "100%" }}>
                <label className="color-label">Fonte</label>
                <select
                  className="input"
                  value={layoutFonte}
                  onChange={(e) => setLayoutFonte(e.target.value)}
                >
                  {fontesPermitidas.map((fonte) => (
                    <option key={fonte} value={fonte}>
                      {fonte}
                    </option>
                  ))}
                </select>
              </div>

              <div className="layout-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={layoutMostrarNuvens}
                    onChange={(e) => setLayoutMostrarNuvens(e.target.checked)}
                  />
                  Mostrar nuvens no fundo
                </label>
              </div>

              <div style={{ width: "100%" }}>
                <label className="color-label">Logo</label>
                <input
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    setLayoutLogoArquivo(e.target.files?.[0] || null)
                  }
                />
              </div>

              <button
                className="action-btn"
                onClick={salvarLayout}
                disabled={salvandoLayout}
              >
                {salvandoLayout ? "Salvando..." : "Salvar layout"}
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Gerar QR Code"
            subtitle="Criar novas campanhas com QR"
            open={mostrarGerarQR}
            onToggle={() => setMostrarGerarQR(!mostrarGerarQR)}
          >
            <div className="actions">
              <input
                className="input"
                placeholder="Nome da campanha"
                value={qrNome}
                onChange={(e) => setQrNome(e.target.value)}
              />

              <input
                className="input"
                placeholder="Valor em coins"
                type="number"
                value={qrValor}
                onChange={(e) => setQrValor(e.target.value)}
              />

              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="Data de início (DD/MM/AAAA)"
                value={qrDataInicio}
                onChange={(e) =>
                  setQrDataInicio(aplicarMascaraData(e.target.value))
                }
              />

              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Hora de início (HH:mm)"
                value={qrHoraInicio}
                onChange={(e) =>
                  setQrHoraInicio(aplicarMascaraHora(e.target.value))
                }
              />

              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="Data de fim (DD/MM/AAAA)"
                value={qrDataFim}
                onChange={(e) =>
                  setQrDataFim(aplicarMascaraData(e.target.value))
                }
              />

              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Hora de fim (HH:mm)"
                value={qrHoraFim}
                onChange={(e) =>
                  setQrHoraFim(aplicarMascaraHora(e.target.value))
                }
              />

              <input
                className="input"
                placeholder="Raio em metros (opcional)"
                type="number"
                value={qrRaio}
                onChange={(e) => setQrRaio(e.target.value)}
              />

              <button
                type="button"
                className="action-btn secondary"
                onClick={() => setMostrarMapa(true)}
              >
                Adicionar local
              </button>

              <button
                className="action-btn"
                onClick={criarQRCode}
                disabled={salvandoQRCode}
              >
                {salvandoQRCode ? "Gerando..." : "Gerar QR Code"}
              </button>
            </div>

            {qrLocais.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ color: "#fff", marginBottom: 10 }}>
                  Locais adicionados:
                </p>

                {qrLocais.map((local, index) => (
                  <div
                    className="extrato-item"
                    key={`${local.latitude}-${local.longitude}-${index}`}
                  >
                    <div>
                      <strong>Local {index + 1}</strong>
                      <div className="extrato-data">{local.endereco}</div>
                    </div>

                    <button
                      className="action-btn secondary"
                      onClick={() => removerLocal(index)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#ccc", marginTop: 16 }}>
                Nenhum local adicionado. Se continuar assim, o QR ficará livre.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="QR Codes gerados"
            subtitle={`Total: ${qrcodes.length}`}
            open={mostrarQRCodesGerados}
            onToggle={() => setMostrarQRCodesGerados(!mostrarQRCodesGerados)}
          >
            {carregandoQRCodes ? (
              <p style={{ color: "#ccc" }}>Carregando QR Codes...</p>
            ) : qrcodes.length === 0 ? (
              <p style={{ color: "#ccc" }}>Nenhum QR Code gerado.</p>
            ) : (
              qrcodes.map((item) => (
                <div
                  className="extrato-item"
                  key={item._id}
                  style={{ flexDirection: "column", alignItems: "stretch" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 20,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{item.nome}</strong>
                      <div className="extrato-data">Código: {item.codigo}</div>
                      <div className="extrato-data">
                        Valor: {item.valor} coins
                      </div>

                      {item.locais_permitidos?.length > 0 ? (
                        <>
                          <div className="extrato-data">
                            Locais permitidos: {item.locais_permitidos.length}
                          </div>

                          {item.locais_permitidos.map((local, index) => (
                            <div className="extrato-data" key={index}>
                              {index + 1}. {local.endereco} | raio{" "}
                              {local.raio_metros} m
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="extrato-data">
                          QR livre, sem restrição de localização
                        </div>
                      )}

                      <div className="extrato-data">
                        Início: {new Date(item.inicio).toLocaleString("pt-BR")}
                      </div>
                      <div className="extrato-data">
                        Fim: {new Date(item.fim).toLocaleString("pt-BR")}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      {item.qr_image_base64 && (
                        <>
                          <img
                            src={item.qr_image_base64}
                            alt={`QR ${item.nome}`}
                            style={{
                              width: 160,
                              height: 160,
                              borderRadius: 12,
                              background: "#fff",
                              padding: 8,
                            }}
                          />

                          <div style={{ marginTop: 10 }}>
                            <button
                              className="action-btn"
                              onClick={() =>
                                baixarQRCode(item.qr_image_base64, item.codigo)
                              }
                            >
                              Baixar imagem
                            </button>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <button
                              className="action-btn secondary"
                              onClick={() => excluirQRCode(item._id)}
                            >
                              Excluir QR Code
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Ranking Next"
            subtitle="Faixa etária de 11 a 13 anos"
            open={mostrarRankingNext}
            onToggle={() => setMostrarRankingNext(!mostrarRankingNext)}
          >
            {carregandoRankingsAdmin ? (
              <p style={{ color: "#ccc" }}>Carregando ranking Next...</p>
            ) : rankingNext.length === 0 ? (
              <p style={{ color: "#ccc" }}>
                Nenhum usuário encontrado no ranking Next.
              </p>
            ) : (
              rankingNext.map((item, index) => {
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
                      
                      <div className="ranking-direita">
                        <div className="ranking-nivel">{nivelRanking}</div>
                        <div className="ranking-saldo">
                          {Number(item.saldo || 0).toLocaleString("pt-BR")} Coins
                        </div>
                      </div>
                );
              })
            )}
          </SectionCard>

          <SectionCard
            title="Ranking GE"
            subtitle="Faixa etária de 14 a 17 anos"
            open={mostrarRankingGE}
            onToggle={() => setMostrarRankingGE(!mostrarRankingGE)}
          >
            {carregandoRankingsAdmin ? (
              <p style={{ color: "#ccc" }}>Carregando ranking GE...</p>
            ) : rankingGE.length === 0 ? (
              <p style={{ color: "#ccc" }}>
                Nenhum usuário encontrado no ranking GE.
              </p>
            ) : (
              rankingGE.map((item, index) => {
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
          </SectionCard>
        </div>

        <Footer />
      </div>

      {mostrarMapa && (
        <ModalMapa
          onClose={() => setMostrarMapa(false)}
          onConfirm={adicionarLocal}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
