import { NextResponse } from "next/server";
import sharp from "sharp";

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = process.env.OCR_SPACE_API_KEY ?? "K85469793588957";

function splitKeywords(text: string) {
  const regex = /\s+|,|。|、|!|！|\?|？/g;
  return text
    .split(regex)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Convert dataURL to Buffer
function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:.*;base64,/, "");
  return Buffer.from(base64, "base64");
}

// Preprocess image buffer with Sharp
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
    const body = await req.json();
    if (!body || !Array.isArray(body.images)) {
      return NextResponse.json(
        { error: "Send { images: [dataUrlString,...] }" },
        { status: 400 }
      );
    }

    const results: Array<any> = [];

    for (const imgStr of body.images) {
      try {
        if (typeof imgStr !== "string")
          throw new Error("Each image must be a string (dataURL/base64/url)");

        let base64Image = imgStr;

        // Only preprocess if data URL (not remote URL)
        if (imgStr.startsWith("data:")) {
          const buffer = dataUrlToBuffer(imgStr);
          const processedBuffer = await preprocessImage(buffer);
          base64Image = `data:image/png;base64,${processedBuffer.toString(
            "base64"
          )}`;
        }

        // Send to OCR.space
        const form = new FormData();
        form.append("apikey", OCR_API_KEY);
        form.append("language", body.language ?? "jpn");
        form.append("OCREngine", body.OCREngine ?? "2");
        form.append(
          "isOverlayRequired",
          body.isOverlayRequired ? "true" : "false"
        );
        if (imgStr.startsWith("http://") || imgStr.startsWith("https://")) {
          form.append("url", imgStr);
        } else {
          form.append("base64Image", base64Image);
        }

        const ocrRes = await fetch(OCR_API_URL, { method: "POST", body: form });
        const json = await ocrRes.json();

        if (json?.IsErroredOnProcessing) {
          results.push({ success: false, error: json?.ErrorMessage });
          continue;
        }

        const blocks = Array.isArray(json.ParsedResults)
          ? json.ParsedResults.map((r: any) => r.ParsedText || "")
          : [];
        const raw_text = blocks.join("\n---\n");

        results.push({
          success: true,
          raw_text,
          keywords: splitKeywords(raw_text),
          ocrResponse: {
            OCRExitCode: json?.OCRExitCode,
            ParsedResultsCount: blocks.length,
          },
        });
      } catch (err: any) {
        results.push({ success: false, error: String(err?.message ?? err) });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
