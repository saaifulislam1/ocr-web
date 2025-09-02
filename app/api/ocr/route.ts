// src/app/api/ocr/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Server route that proxies images to OCR.space and returns:
 *  [{ success: true, raw_text, keywords, ocrResponse: { ... } } | { success: false, error }]
 *
 * Accepts JSON body:
 * { images: string[] } where each string can be:
 *  - data URL (data:image/png;base64,...)
 *  - raw base64 string (will be treated as jpeg)
 *  - remote http/https URL
 *
 * Optional fields:
 *  { language: "jpn", OCREngine: "2", isOverlayRequired: true }
 *
 * IMPORTANT: set process.env.OCR_SPACE_API_KEY in your environment (don't commit the key).
 */

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = "K85469793588957"; // fallback for local testing ONLY

function splitKeywords(text: string) {
  const regex = /\s+|,|。|、|!|！|\?|？/g;
  return text
    .split(regex)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDataUrl(s: string) {
  return /^data:.*;base64,/.test(s);
}

async function preprocessImage(buffer: Buffer) {
  return await sharp(buffer)
    .grayscale() // convert to grayscale
    .normalize() // auto contrast
    .sharpen() // sharpen edges
    .toFormat("png") // output PNG
    .toBuffer();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.log("image rcved", body);

    let images: string[] = [];
    if (typeof body.image === "string" && body.image.length)
      images = [body.image];
    else if (Array.isArray(body.images)) images = body.images.filter(Boolean);
    else
      return NextResponse.json(
        { error: "Send { images: [dataUrlString, ...] }" },
        { status: 400 }
      );

    if (!images.length)
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );

    const language = body.language ?? "jpn";
    const ocrEngine = body.OCREngine ?? "2";
    const overlay = body.isOverlayRequired ? "true" : "false";

    const batchSize = 3; // process 3 images at a time
    const results: Array<any> = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const batchPromises = batch.map(async (imgStr) => {
        try {
          if (typeof imgStr !== "string")
            throw new Error("Each image must be a string (dataURL/base64/url)");

          const form = new FormData();
          form.append("apikey", OCR_API_KEY);
          form.append("language", language);
          form.append("OCREngine", String(ocrEngine));
          form.append("isOverlayRequired", overlay);

          if (isDataUrl(imgStr)) {
            // e.g. data:image/png;base64,AAA...
            form.append("base64Image", imgStr);
          } else if (
            imgStr.startsWith("http://") ||
            imgStr.startsWith("https://")
          ) {
            // remote image
            form.append("url", imgStr);
          } else {
            // treat as raw base64 (no prefix) -> assume jpeg
            form.append("base64Image", `data:image/jpeg;base64,${imgStr}`);
          }

          const ocrRes = await fetch(OCR_API_URL, {
            method: "POST",
            body: form,
          });
          const json = await ocrRes.json();

          if (json?.IsErroredOnProcessing) {
            return { success: false, error: json?.ErrorMessage ?? json };
          }

          const blocks = Array.isArray(json.ParsedResults)
            ? json.ParsedResults.map((r: any) => r.ParsedText || "")
            : [];
          const raw_text = blocks.join("\n---\n");

          return {
            success: true,
            raw_text,
            keywords: splitKeywords(raw_text),
            ocrResponse: {
              OCRExitCode: json?.OCRExitCode,
              ParsedResultsCount: Array.isArray(json.ParsedResults)
                ? json.ParsedResults.length
                : 0,
              // NOTE: we intentionally don't return the full service response that might contain sensitive metadata
            },
          };
        } catch (err: any) {
          return { success: false, error: String(err?.message ?? err) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
