"use client";

import { useState, useRef } from "react";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { optimizeImage } from "@/lib/image-client";

interface CustomerAvatarUploaderProps {
  customerId: string;
  initialImageUrl?: string | null;
  customerName: string;
  className?: string;
}

export default function CustomerAvatarUploader({
  customerId,
  initialImageUrl,
  customerName,
  className = "h-32 w-32 rounded-[2rem]",
}: CustomerAvatarUploaderProps) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      toast.error("صورة غير صالحة", "يرجى اختيار صورة بحجم لا يتجاوز 8 MB.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("جاري رفع الصورة...", "يتم حفظ وتحديث الصورة الشخصية للعميلة.");

    try {
      const optimized = await optimizeImage(file);
      const formData = new FormData();
      formData.append("photo", optimized);

      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل رفع الصورة");

      setImageUrl(data.imageUrl || URL.createObjectURL(optimized));
      toast.dismiss(toastId);
      toast.success("تم تحديث الصورة!", "تم حفظ الصورة الشخصية للعميلة بنجاح.");
      router.refresh();
    } catch (err: unknown) {
      toast.dismiss(toastId);
      toast.error("خطأ أثناء الرفع", err instanceof Error ? err.message : "تعذر تحديث الصورة.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initials = customerName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative group shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        className={`relative ${className} shrink-0 overflow-hidden border-4 shadow-xl transition-all duration-300 group-hover:shadow-2xl`}
        style={{
          borderColor: "var(--surface)",
          background: "var(--brand-soft)",
          color: "var(--brand-strong)",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={customerName}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold">
            {initials || customerName.charAt(0)}
          </div>
        )}

        {/* Hover Camera Overlay Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer disabled:cursor-not-allowed backdrop-blur-[2px]"
          title="تغيير أو رفع الصورة الشخصية"
        >
          {uploading ? (
            <LoaderCircle className="h-7 w-7 animate-spin text-white" />
          ) : (
            <>
              <Camera className="h-7 w-7 mb-1" />
              <span className="text-[11px] font-bold">رفع صورة</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Action Badge on mobile */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="sm:hidden absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background cursor-pointer"
        title="تغيير الصورة"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  );
}
