// Normaliza arquivos no próprio navegador antes de enviar: fotos menores e PDFs conferidos.
import { ValidationError } from "../domain/catalog.js";

const MAX_PDF_MB = 25;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function decode(file) {
  if (!IMAGE_TYPES.includes(file.type))
    throw new ValidationError(`"${file.name}" não é uma imagem JPG, PNG ou WebP.`);
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ValidationError(`Não foi possível ler a imagem "${file.name}".`);
  }
}

function render(bitmap, maxSide, type, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export const browserMedia = {
  async photo(file) {
    return render(await decode(file), 1600, "image/jpeg", 0.82);
  },
  // PNG mantém o fundo transparente da logo.
  async logo(file) {
    return render(await decode(file), 800, "image/png");
  },
  async pdf(file) {
    if (file.size > MAX_PDF_MB * 1024 * 1024)
      throw new ValidationError(`"${file.name}" passa de ${MAX_PDF_MB} MB.`);
    const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (header !== "%PDF-") throw new ValidationError(`"${file.name}" não é um PDF válido.`);
    return file;
  },
};
