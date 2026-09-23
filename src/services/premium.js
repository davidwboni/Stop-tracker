import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const getPremiumStatus = async () => {
  const { data } = await httpsCallable(functions, "getPremiumStatus")();
  return data;
};

const fileToBase64 = (fileOrBlob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Could not read the selected file."));
  reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
  reader.readAsDataURL(fileOrBlob);
});

const renderPdfToImages = async (file) => {
  // Loaded only when a PDF is chosen so normal app startup stays light.
  const pdfjs = await import("pdfjs-dist/webpack");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  // Delivery statements are normally a handful of pages. We cap both page
  // count and encoded size so the callable request stays comfortably bounded
  // on mobile Safari and Cloud Functions.
  const pageCount = Math.min(pdf.numPages, 10);
  const images = [];
  let encodedChars = 0;
  const MAX_ENCODED_CHARS = 18_000_000;

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the PDF for reading.");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    page.cleanup();
    canvas.width = 1;
    canvas.height = 1;

    if (!blob) throw new Error("This PDF page could not be prepared for AI reading.");
    const fileBase64 = await fileToBase64(blob);

    if (images.length > 0 && encodedChars + fileBase64.length > MAX_ENCODED_CHARS) {
      break;
    }
    encodedChars += fileBase64.length;
    images.push({ fileBase64, mimeType: "image/jpeg" });
  }

  if (!images.length) throw new Error("No readable pages were found in this PDF.");
  return images;
};

export const extractStatement = async (file) => {
  if (!file) throw new Error("Choose a statement file.");

  let images;
  if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
    images = await renderPdfToImages(file);
  } else {
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      throw new Error("Choose a PDF, JPEG, PNG or WebP statement.");
    }
    images = [{ fileBase64: await fileToBase64(file), mimeType: file.type }];
  }

  const { data } = await httpsCallable(functions, "extractStatement")({ images });
  return data;
};

export const consumeRouteOptimization = async () => {
  const { data } = await httpsCallable(functions, "consumeRouteOptimization")();
  return data;
};
