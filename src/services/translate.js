import apiClient from "@/lib/axios";
import { API } from "@/constants/api";

export async function translateText(text, targetLang) {
  const response = await apiClient.post(API.TRANSLATE, {
    text,
    target_lang: targetLang,
  });
  return response.data.translated_text;
}