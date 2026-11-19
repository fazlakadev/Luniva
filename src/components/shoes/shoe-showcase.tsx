"use client";

import { useRouter } from "next/navigation";
import SneakerProductHero, { type SneakerVariant } from "@/components/ui/sneaker-product-hero";

const VARIANTS: SneakerVariant[] = [
    {
        name: "بلومي",
        swatch: "#422837",
        tint: "#6d3f55",
        src: "/shoes/luniva-plum.svg",
    },
    {
        name: "وردي",
        swatch: "#a95d73",
        tint: "#d494a7",
        src: "/shoes/luniva-rose.svg",
    },
    {
        name: "كريمي",
        swatch: "#e7d8c6",
        tint: "#d6bda5",
        src: "/shoes/luniva-cream.svg",
    },
];

const SIZES = Array.from({ length: 9 }, (_, i) => ({ label: String(36 + i) }));

/** The public site has no cart: choosing a pair opens the contact page instead. */
export default function ShoeShowcase() {
    const router = useRouter();

    return (
        <SneakerProductHero
            eyebrow="مجموعة لونيفا للأحذية"
            title="سنيكر لونيفا"
            description="سنيكر يومي بتصميم ناعم وخفيف، يجمع بين راحة تدوم طول اليوم ولمسة أناقة تليق بإطلالتك. اختاري اللون والمقاس، ثم أرسلينا طلبك بخطوة واحدة."
            variants={VARIANTS}
            sizes={SIZES}
            price={1290}
            currency="ج.م"
            rating={4.7}
            reviews={128}
            lowStock={3}
            toast="تم تسجيل اختيارك · سنحوّلك إلى صفحة التواصل"
            likeColor="#a95d73"
            height="min(760px, 88svh)"
            onAddToCart={() => {
                router.push("/contact?product=sneaker");
            }}
        />
    );
}
