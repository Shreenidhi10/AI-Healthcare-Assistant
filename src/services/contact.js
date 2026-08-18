import apiClient from "@/lib/axios";
import { API } from "@/constants/api";

export async function submitContactForm({ name, email, message }) {
  const response = await apiClient.post(API.CONTACT, {
    name,
    email,
    message,
  });
  return response.data;
}