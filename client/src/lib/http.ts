import axios from "axios";

const apiVersion = import.meta.env.API_VERSION ?? "v1";
const apiUrl = import.meta.env.VITE_API_URL ?? "";

export const http = axios.create({
  baseURL: `${apiUrl}/api/${apiVersion}`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
