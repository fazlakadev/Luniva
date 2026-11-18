"use client";

import type { ChangeEvent, Ref } from "react";

type FolderUploadProps = {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef?: Ref<HTMLInputElement>;
  accept?: string;
  label?: string;
  hint?: string;
  preview?: string | null;
  previewAlt?: string;
  fallback?: string;
  compact?: boolean;
  className?: string;
};

/** Folder-style image picker adapted to Luniva's palette. The hidden input keeps every form's existing onChange/ref wiring. */
export default function FolderUpload({
  onChange,
  inputRef,
  accept = "image/png,image/jpeg,image/webp",
  label = "ارفع صورة",
  hint = "JPG · PNG · WEBP حتى 5 MB",
  preview,
  previewAlt = "معاينة الصورة",
  fallback,
  compact = false,
  className = "",
}: FolderUploadProps) {
  return (
    <label className={`luniva-folder ${compact ? "luniva-folder--compact" : ""} ${className}`.trim()}>
      <span className="luniva-folder__art" aria-hidden="true">
        <span className="luniva-folder__back" />
        <span className="luniva-folder__back-2" />
        <span className="luniva-folder__front">
          <span
            className="luniva-folder__cover"
            style={preview ? { backgroundImage: `url("${preview.replace(/"/g, "%22")}")` } : undefined}
          >
            {!preview && fallback ? <span className="luniva-folder__initials">{fallback}</span> : null}
          </span>
          <span className="luniva-folder__tab" />
        </span>
      </span>
      <span className="luniva-folder__text">
        <span className="luniva-folder__title">{label}</span>
        {!compact && <span className="luniva-folder__hint">{hint}</span>}
      </span>
      {preview && <span className="sr-only">{previewAlt}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="luniva-folder__input"
      />
    </label>
  );
}
