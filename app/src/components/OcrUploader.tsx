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
            {jsonResult && (
              <button
                onClick={handleDownloadJson}
                className="flex font-bold items-center gap-2 px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 transition"
              >
                <Download size={18} /> Download .json
              </button>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-3xl mx-auto mt-4 p-4 bg-red-600/30 text-red-100 rounded-lg border border-red-400">
          ⚠ {error}
        </div>
      )}
    </main>
  );
}
