import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Read a File into base64 (no data: prefix) plus its MIME type, for sending an
// uploaded pay-rate sheet (PDF or image) to the interpreter function.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      const comma = result.indexOf(",");
      resolve({ base64: comma >= 0 ? result.slice(comma + 1) : result, mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

// Calls the deployed Cloud Function. Returns { config, summary, sample }.
// The caller recomputes the worked example locally with tested code, the AI
// result is only ever the structured config, never a money figure to trust.
export async function interpretPayStructure({ text, file }) {
  const payload = {};
  if (text && text.trim()) payload.text = text.trim();
  if (file) {
    const { base64, mimeType } = await fileToBase64(file);
    payload.fileBase64 = base64;
    payload.mimeType = mimeType;
  }
  const callable = httpsCallable(functions, "interpretPayStructure");
  const res = await callable(payload);
  return res.data;
}
