"use client";
import React, { useState } from "react";
import { Download, Copy, UploadCloud } from "lucide-react";
export default function OcrUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [textResult, setTextResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  }

  async function toDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setTextResult("");
    try {
      const imageData = await Promise.all(files.map((f) => toDataUrl(f))); // returns data URLs
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imageData,
          language: "jpn",
          OCREngine: "2",
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const texts: string[] = [];
      const errors: string[] = [];
      (json.results || []).forEach((r: any, idx: number) => {
        if (r.success) texts.push(r.raw_text || "");
        else errors.push(`Image ${idx + 1}: ${r.error}`);
      });

      if (errors.length) {
        console.warn("OCR errors:", errors);
        // optionally show errors to user in UI
      }

      setTextResult(texts.join("\n\n---\n\n"));
    } catch (err: any) {
      console.error(err);
      alert("OCR failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(textResult);
    // alert("Copied to clipboard!");
  }

  function handleDownload() {
    const blob = new Blob([textResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-result.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f044c] via-[#1a0033] to-[#000] text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8  tracking-widest text-cyan-400 drop-shadow-lg  ">
        Saiful OCR
      </h1>

      {/* Upload Section */}
      <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col items-center justify-center gap-4">
          <UploadCloud className="w-12 h-12 text-pink-500 animate-pulse " />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFilesSelected}
            className="block text-sm text-gray-300   file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-pink-600 file:text-white
              hover:file:bg-pink-500"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="px-6 py-3   rounded-xl bg-gradient-to-r from-pink-600 to-purple-700 
              text-white font-semibold shadow-lg hover:scale-105 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : `Extract Text (${files.length})`}
          </button>
        </div>
      </div>

      {/* Results */}
      {textResult && (
        <div className="max-w-3xl mx-auto mt-8 bg-white/5 backdrop-blur-md border border-pink-500/30 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl mb-4 text-cyan-300 font-semibold  ">
            Extracted Text
          </h2>
          <textarea
            value={textResult}
            readOnly
            className="w-full h-64 p-3 bg-black/70 font-body text-green-300 font-mono rounded-md resize-none border border-cyan-500/20"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleCopy}
              className="flex    font-bold items-center gap-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 transition"
            >
              <Copy size={18} /> Copy
            </button>
            <button
              onClick={handleDownload}
              className="flex   font-bold items-center gap-2 px-4 py-2 rounded-md bg-pink-600 hover:bg-pink-500 transition"
            >
              <Download size={18} /> Download .txt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
