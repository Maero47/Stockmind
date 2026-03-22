"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Props {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}

const CROP_SIZE = 240;
const OUTPUT_SIZE = 400;

export default function AvatarCropModal({ file, onConfirm, onCancel }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = CROP_SIZE / Math.min(img.width, img.height);
      setImgSize({ w: img.width * scale, h: img.height * scale });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(0.5, z - e.deltaY * 0.002)));
  }, []);

  function handleConfirm() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;

    const scaledW = imgSize.w * zoom;
    const scaledH = imgSize.h * zoom;
    const drawX = (CROP_SIZE - scaledW) / 2 + offset.x;
    const drawY = (CROP_SIZE - scaledH) / 2 + offset.y;

    const ratio = OUTPUT_SIZE / CROP_SIZE;
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, drawX * ratio, drawY * ratio, scaledW * ratio, scaledH * ratio);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const cropped = new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" });
      onConfirm(cropped);
    }, "image/png", 0.92);
  }

  function handleReset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  if (!imgSrc) return null;

  const scaledW = imgSize.w * zoom;
  const scaledH = imgSize.h * zoom;
  const imgX = (CROP_SIZE - scaledW) / 2 + offset.x;
  const imgY = (CROP_SIZE - scaledH) / 2 + offset.y;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="rounded-2xl overflow-hidden w-[340px]"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Edit Photo</span>
          <button onClick={onCancel} className="p-1 rounded-md" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center px-4 py-5 gap-4">
          {/* Crop area */}
          <div
            className="relative overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              width: CROP_SIZE,
              height: CROP_SIZE,
              borderRadius: "50%",
              border: "2px solid var(--border-bright)",
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <img
              src={imgSrc}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: imgX,
                top: imgY,
                width: scaledW,
                height: scaledH,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full px-2">
            <ZoomOut size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "var(--accent-blue)" }}
            />
            <ZoomIn size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <button
              onClick={handleReset}
              className="p-1.5 rounded-md"
              style={{ color: "var(--text-muted)" }}
              title="Reset"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Drag to reposition, scroll to zoom
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex gap-2 justify-end" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            <Check size={12} /> Apply
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>,
    document.body
  );
}
