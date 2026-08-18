import axios from "axios";
import { API } from "@/constants/api";

const apiClient = axios.create({
  baseURL: API.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;