import axios from "axios";

const hostname = window.location.hostname;

let baseURL = "http://localhost:5000/api";

// acesso pelo celular ou pela rede local
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  baseURL = `http://${hostname}:5000/api`;
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
