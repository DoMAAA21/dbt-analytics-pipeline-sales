import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL ?? "";
const apiVersion = import.meta.env.VITE_API_VERSION ?? "v1";

export const http = axios.create({
  baseURL: apiUrl + "/api/" + apiVersion,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
