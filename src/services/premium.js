import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const getPremiumStatus = async () => {
  const { data } = await httpsCallable(functions, "getPremiumStatus")();
  return data;
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Could not read the selected file."));
  reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
  reader.readAsDataURL(file);
});

export const extractStatement = async (file) => {
  if (!file) throw new Error("Choose a statement image.");
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("AI statement checking currently supports JPEG, PNG and WebP. PDFs can still be checked manually.");
  const fileBase64 = await fileToBase64(file);
  const { data } = await httpsCallable(functions, "extractStatement")({ fileBase64, mimeType: file.type });
  return data;
};

export const consumeRouteOptimization = async () => {
  const { data } = await httpsCallable(functions, "consumeRouteOptimization")();
  return data;
};
