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
              setMensagem("QR Code lido. Processando...");

              await pararScanner();

              let latitude;
              let longitude;

              try {
                const posicao = await new Promise((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                  });
                });

                latitude = posicao.coords.latitude;
                longitude = posicao.coords.longitude;
              } catch {
                latitude = undefined;
                longitude = undefined;
              }

              let codigo = decodedText;

              try {
                const parsed = JSON.parse(decodedText);
                if (parsed.codigo) {
                  codigo = parsed.codigo;
                }
              } catch {
                // usa o texto puro
              }

              const response = await api.post("/user/resgatar-qrcode", {
                codigo,
                latitude,
                longitude,
              });

              setMensagem(
                response.data.message || "QR Code resgatado com sucesso",
              );
              setErro("");

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
          "Não foi possível acessar a câmera. No celular, isso pode exigir HTTPS ou permissão do navegador.",
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
