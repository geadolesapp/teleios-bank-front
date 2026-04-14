import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

function QRCodeScanner({ onClose, onResgateSucesso }) {
  const html5QrCodeRef = useRef(null);
  const iniciadoRef = useRef(false);
  const fechandoRef = useRef(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function pararScanner() {
    try {
      const scanner = html5QrCodeRef.current;

      if (scanner) {
        try {
          await scanner.stop();
        } catch {
          // ignora erro se já estiver parado
        }

        try {
          await scanner.clear();
        } catch {
          // ignora erro se já estiver limpo
        }
      }
    } finally {
      html5QrCodeRef.current = null;
      iniciadoRef.current = false;
    }
  }

  async function handleFechar() {
    if (fechandoRef.current) return;

    fechandoRef.current = true;
    setCarregando(true);

    await pararScanner();

    setCarregando(false);
    fechandoRef.current = false;

    onClose();
  }

  function obterPosicao(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada neste navegador"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function traduzirErroGeolocalizacao(error) {
    if (!error) {
      return "Não foi possível obter sua localização.";
    }

    if (typeof error.code === "number") {
      switch (error.code) {
        case 1:
          return "Permissão de localização negada. Verifique o acesso à localização no Safari.";
        case 2:
          return "Não foi possível determinar sua localização.";
        case 3:
          return "A localização demorou demais para responder.";
        default:
          return "Não foi possível obter sua localização.";
      }
    }

    return error.message || "Não foi possível obter sua localização.";
  }

  async function obterLocalizacaoComFallback() {
    if (!navigator.geolocation) {
      return {
        latitude: undefined,
        longitude: undefined,
        aviso:
          "Este navegador não oferece suporte à localização. O resgate pode falhar em QR Codes com restrição de local.",
      };
    }

    try {
      const posicao = await obterPosicao({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 30000,
      });

      return {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        aviso: "",
      };
    } catch (erroInicial) {
      try {
        const posicao = await obterPosicao({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });

        return {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          aviso: "",
        };
      } catch (erroFinal) {
        return {
          latitude: undefined,
          longitude: undefined,
          aviso: traduzirErroGeolocalizacao(erroFinal || erroInicial),
        };
      }
    }
  }

  useEffect(() => {
    let ativo = true;

    async function iniciarScanner() {
      if (iniciadoRef.current) return;
      iniciadoRef.current = true;

      try {
        setErro("");
        setMensagem("Solicitando acesso à câmera...");

        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (!ativo || fechandoRef.current) return;

            try {
              setCarregando(true);
              setErro("");
              setMensagem("QR Code lido. Processando...");

              await pararScanner();

              let codigo = decodedText;

              try {
                const parsed = JSON.parse(decodedText);
                if (parsed.codigo) {
                  codigo = parsed.codigo;
                }
              } catch {
                // usa o texto puro
              }

              setMensagem("QR Code lido. Confirmando localização...");

              const {
                latitude,
                longitude,
                aviso: avisoLocalizacao,
              } = await obterLocalizacaoComFallback();

              const response = await api.post("/user/resgatar-qrcode", {
                codigo,
                latitude,
                longitude,
              });

              setMensagem(
                response.data.message || "QR Code resgatado com sucesso",
              );

              if (avisoLocalizacao) {
                setErro(avisoLocalizacao);
              } else {
                setErro("");
              }

              if (onResgateSucesso) {
                onResgateSucesso();
              }
            } catch (error) {
              const mensagemErro =
                error.response?.data?.message || "Erro ao resgatar QR Code";
              setErro(mensagemErro);
              setMensagem("");
            } finally {
              setCarregando(false);
            }
          },
          () => {
            // ignora erros contínuos de leitura
          },
        );

        setMensagem("Aponte a câmera para o QR Code");
      } catch (error) {
        console.error("Erro ao iniciar câmera:", error);
        setErro(
          "Não foi possível acessar a câmera. No iPhone, verifique a permissão da câmera e da localização no Safari.",
        );
        setMensagem("");
        iniciadoRef.current = false;
      }
    }

    iniciarScanner();

    return () => {
      ativo = false;
      pararScanner();
    };
  }, [onResgateSucesso]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <h3>Ler QR Code</h3>

        <div id="reader" />

        {mensagem && (
          <p style={{ color: "#00e676", marginTop: 12 }}>{mensagem}</p>
        )}

        {erro && <p style={{ color: "#ff6b6b", marginTop: 12 }}>{erro}</p>}

        <button
          className="action-btn secondary"
          onClick={handleFechar}
          disabled={carregando}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export default QRCodeScanner;
