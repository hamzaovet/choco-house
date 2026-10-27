"use client";

import React, { useState, useRef } from "react";
import { uploadToImgbb } from "@/lib/uploadToImgbb";
import { playSound } from "@/lib/sounds";
import { UploadCloud, Image as ImageIcon, Loader2, Check, X, Link as LinkIcon } from "lucide-react";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = "صورة المنتج" }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الصورة يجب ألا يتجاوز 10 ميجابايت");
      return;
    }

    setUploading(true);
    setError(null);
    playSound("click");

    try {
      const url = await uploadToImgbb(file);
      onChange(url);
      playSound("success");
    } catch (err: any) {
      setError(err?.message || "فشل رفع الصورة إلى ImgBB");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <div style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "#b0957e",
          marginBottom: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span>{label}</span>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            style={{
              background: "transparent",
              border: "none",
              color: "#cca043",
              fontSize: "11px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <LinkIcon size={12} />
            <span>{showUrlInput ? "إخفاء الرابط المباشر" : "إدخال رابط بدلاً من الرفع"}</span>
          </button>
        </div>
      )}

      {/* Preview if image exists */}
      {value ? (
        <div style={{
          position: "relative",
          width: "100%",
          height: "140px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid rgba(204, 160, 67, 0.35)",
          marginBottom: "10px",
          background: "#120a05",
        }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "8px 12px",
          }}>
            <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
              <Check size={13} /> تم رفع الصورة بنجاح
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "rgba(204, 160, 67, 0.9)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#180e06",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                تغيير
              </button>
              <button
                type="button"
                onClick={() => { onChange(""); playSound("click"); }}
                style={{
                  background: "rgba(239, 68, 68, 0.85)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Trigger Box */
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: "2px dashed rgba(204, 160, 67, 0.3)",
            borderRadius: "14px",
            padding: "20px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: "rgba(255, 255, 255, 0.02)",
            transition: "all 0.15s ease",
            marginBottom: "10px",
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = "#cca043";
          }}
          onMouseLeave={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.3)";
          }}
        >
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <Loader2 size={28} className="animate-spin" color="#cca043" />
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#cca043" }}>
                جاري الرفع إلى ImgBB الآن...
              </div>
              <div style={{ fontSize: "11px", color: "#8a7565" }}>برجاء الانتظار ثوانٍ معدودة</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(204, 160, 67, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cca043",
              }}>
                <UploadCloud size={22} />
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f5ede4" }}>
                اضغط هنا لرفع صورة من جهازك
              </div>
              <div style={{ fontSize: "11px", color: "#8a7565" }}>
                يدعم JPG, PNG, WEBP (يتم الرفع المباشر عبر سيرفر ImgBB)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Optional Direct URL Input */}
      {showUrlInput && (
        <div style={{ marginTop: "6px" }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="أو الصق رابط الصورة المباشر هنا (https://...)"
            style={{
              width: "100%",
              height: "40px",
              padding: "0 12px",
              background: "#140b04",
              border: "1px solid rgba(204, 160, 67, 0.25)",
              borderRadius: "10px",
              color: "#ffffff",
              fontSize: "12px",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: "6px",
          fontSize: "12px",
          color: "#ef4444",
          fontWeight: 700,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
