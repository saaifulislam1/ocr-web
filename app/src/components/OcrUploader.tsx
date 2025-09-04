"use client";
import React, { useState } from "react";
import { Download, Copy, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
export default function OcrUploader() {
  const MAX_FILE_SIZE = 1 * 1024 * 1024;
  const [files, setFiles] = useState<File[]>([]);
  const [textResult, setTextResult] = useState<string>("");
  const [jsonResult, setJsonResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const oversizedFiles = selectedFiles.filter((f) => f.size > MAX_FILE_SIZE);

    if (oversizedFiles.length) {
      setError(
        `File(s) too large: ${oversizedFiles
          .map((f) => f.name)
          .join(", ")}. Max size is 1 MB.`
      );
      // Optionally, remove oversized files
      const validFiles = selectedFiles.filter((f) => f.size <= MAX_FILE_SIZE);
      setFiles(validFiles);
    } else {
      setError(null);
      setFiles(selectedFiles);
    }
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
    setJsonResult([]); // reset JSON each time
    try {
      const imageData = await Promise.all(files.map((f) => toDataUrl(f))); // returns data URLs
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imageData,
          language: "jpn",
          OCREngine: "1",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text);
        throw new Error(text || "OCR API error");
      }

      const json = await res.json();
      if (json.error) {
        setError(json.error);
        throw new Error(json.error);
      }

      // setJsonResult(json); // <-- store full response
      const texts: string[] = [];
      const transformed: any[] = [];

      (json.results || []).forEach((r: any, idx: number) => {
        if (!r.success) return; // skip errors

        // raw_text: replace newlines with commas
        const lines = (r.raw_text || "")
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map(
            (line: string, i: number, arr: string | any[]) =>
              i < arr.length - 1 ? line + "," : line // add comma except last line
          );

        texts.push(lines.join("\n"));

        transformed.push({
          fileName: files[idx]?.name || `file-${idx + 1}`,
          raw_text: lines,
          keywords: r.keywords || [],
        });
      });

      // if (errors.length) {
      //   console.warn("OCR errors:", errors);
      //   // optionally show errors to user in UI
      // }

      setTextResult(texts.join("\n\n---\n\n"));
      setJsonResult(transformed);
    } catch (err: any) {
      setError(err.message || "OCR failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(textResult).then(() => {
      toast.success("Copied to clipboard!");
    });
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
  function handleDownloadJson() {
    if (!jsonResult.length) return;
    const blob = new Blob([JSON.stringify(jsonResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-result.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f044c] via-[#1a0033] to-black text-white px-4 py-10">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-12 tracking-widest text-cyan-400 drop-shadow-lg">
        Saiful OCR
      </h1>

      {/* Upload Section */}
      <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-xl border border-dashed border-cyan-400 rounded-2xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center gap-5">
          {/* Upload Icon */}
          <UploadCloud className="w-14 h-14 text-cyan-400 opacity-80" />

          <p className="text-gray-300 text-lg">
            Drag & drop your images here, or{" "}
            <label className="text-pink-400 font-semibold cursor-pointer hover:underline">
              browse
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesSelected}
                className="hidden"
              />
            </label>
          </p>

          {/* Selected files */}
          {files.length > 0 && (
            <p className="text-sm text-green-300">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
          )}

          {/* Action Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="mt-4 px-8 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-700 
          text-white font-semibold shadow-lg hover:scale-105 hover:shadow-xl
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Start OCR"}
          </button>
        </div>
      </div>

      {/* Results */}
      {textResult && (
        <div className="max-w-3xl mx-auto mt-10 bg-white/10 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg md:text-xl mb-4 text-cyan-300 font-semibold">
            Extracted Text
          </h2>

          <textarea
            value={textResult}
            readOnly
            className="w-full h-64 p-4 bg-black/60 font-mono text-green-300 rounded-lg resize-none border border-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition font-semibold"
            >
              <Copy className="w-5 h-5" /> Copy
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 transition font-semibold"
            >
              <Download className="w-5 h-5" /> Download .txt
            </button>

            {jsonResult && (
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-semibold"
              >
                <Download className="w-5 h-5" /> Download .json
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-600/30 text-red-100 rounded-lg border border-red-400 text-center text-sm">
          ⚠ {error}
        </div>
      )}
    </main>
  );
}
