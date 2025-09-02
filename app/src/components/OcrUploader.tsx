"use client";
import React, { useState } from "react";

export default function OcrUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
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
    try {
      const imageData = await Promise.all(files.map((f) => toDataUrl(f)));
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imageData }),
      });
      const json = await res.json();
      setResults(json.results || json);
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={onFiles}
          className="block"
        />
      </div>

      <div className="mb-4">
        <button
          onClick={handleSubmit}
          disabled={loading || files.length === 0}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white"
        >
          {loading ? "Processing..." : `Upload ${files.length} file(s)`}
        </button>
      </div>

      <div>
        {results.map((r, idx) => (
          <pre key={idx} className="bg-black/50 p-3 rounded-md my-2 text-sm">
            {JSON.stringify(r, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}
