import axios from "axios";

const baseURL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://teleios-bank-back.onrender.com/api";

const api = axios.create({
  baseURL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deveTentarNovamente(error) {
  const status = error?.response?.status;

  if (!error?.response) return true;
  if (error.code === "ECONNABORTED") return true;
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500) return true;

  return false;
}

export async function requestWithRetry(
  requestFn,
  options = {},
) {
  const retries = Number(options.retries ?? 2);
  const delayMs = Number(options.delayMs ?? 1200);

  let ultimoErro;

  for (let tentativa = 0; tentativa <= retries; tentativa += 1) {
    try {
      return await requestFn();
    } catch (error) {
      ultimoErro = error;

      if (tentativa >= retries || !deveTentarNovamente(error)) {
        throw error;
      }

      await esperar(delayMs * (tentativa + 1));
    }
  }

  throw ultimoErro;
}

export default api;
