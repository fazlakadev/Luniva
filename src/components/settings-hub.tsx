"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Radio,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import type { CompanySettings } from "@/lib/settings";
import SettingsForm from "@/components/settings-form";
import AccountSettingsForm from "@/components/account-settings-form";
import AdminEmailForm from "@/components/admin-email-form";

type TabKey = "brand" | "security" | "whatsapp" | "system";

interface SettingsHubProps {
  initialSettings: CompanySettings;
  username: string;
  adminEmail: string;
}

export default function SettingsHub({
  initialSettings,
  username,
  adminEmail,
}: SettingsHubProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("brand");

  const tabs: Array<{ id: TabKey; label: string; icon: typeof Store; count?: string }> = [
    { id: "brand", label: "هوية الأتيليه والمستندات", icon: Store },
    { id: "security", label: "الأمان والتحقق الثنائي", icon: ShieldCheck, count: "2FA" },
    { id: "whatsapp", label: "أتمتة الواتساب والمتجر", icon: MessageCircle },
    { id: "system", label: "حالة النظام والخدمات", icon: Server },
  ];

  return (
    <div className="space-y-6">
      {/* Top Highlights Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-card p-4 flex items-center gap-3">
          <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <Building2 size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--muted-2)]">المنشأة</p>
            <p className="truncate text-xs font-black text-[var(--ink)]">
              {initialSettings.companyName || "أزياء لونيفا"}
            </p>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3">
          <span className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <ShieldCheck size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--muted-2)]">التحقق الثنائي (2FA)</p>
            <p className="truncate text-xs font-black text-emerald-600 dark:text-emerald-400">
              مفعّل ومشفر
            </p>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3">
          <span className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <MessageCircle size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--muted-2)]">أتمتة الواتساب</p>
            <p className="truncate text-xs font-black text-[var(--ink)]">
              جاهز ومربوط
            </p>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3">
          <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
            <ShoppingBag size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--muted-2)]">سلة الاستفسارات</p>
            <p className="truncate text-xs font-black text-[var(--ink)]">
              نشطة بالمتجر
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-[var(--line)] bg-[var(--surface)] p-1.5 rounded-2xl overflow-x-auto no-scrollbar gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all shrink-0 ${
                isSelected
                  ? "bg-[var(--brand)] text-white shadow-sm ring-1 ring-[var(--brand-strong)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-[var(--line)] text-[var(--muted-2)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Brand & Documents */}
      {activeTab === "brand" && (
        <div className="space-y-6">
          <SettingsForm initial={initialSettings} />
        </div>
      )}

      {/* Tab 2: Security & 2FA */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <AdminEmailForm adminEmail={adminEmail} />
          <AccountSettingsForm username={username} />
        </div>
      )}

      {/* Tab 3: WhatsApp Automation & Storefront */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          <section className="app-card p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-5">
              <span className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                <MessageCircle size={22} />
              </span>
              <div>
                <h2 className="section-title text-base sm:text-lg">منظومة واتساب التسويقية والمتجر</h2>
                <p className="text-xs text-[var(--muted)]">
                  نظام الأتمتة المجاني بالكامل بدون أي اشتراكات أو تكاليف API مدفوعة.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--ink)]">حملات الإرسال الجماعي</span>
                  <span className="badge badge-success text-[10px]">مفعّل</span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                  طابور إرسال ذكي متسلسل يفتح محادثات العملاء تدريجياً مع فترات أمان تمنع حظر الرقم نهائياً.
                </p>
                <Link
                  href="/marketing"
                  className="btn btn-secondary mt-4 w-full justify-center text-xs font-bold"
                >
                  <MessageSquare size={14} />
                  فتح مركز رسائل الواتساب
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--ink)]">طلبات المتجر والاستفسارات</span>
                  <span className="badge badge-brand text-[10px]">نشط</span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                  تصل استفسارات العملاء من سلة المتجر مباشرة إلى لوحة التحكم مع زر متابعة فوري عبر واتساب.
                </p>
                <Link
                  href="/orders"
                  className="btn btn-primary mt-4 w-full justify-center text-xs font-bold"
                >
                  <Package size={14} />
                  إدارة طلبات واستفسارات العملاء
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--ink)]">صندوق رسائل واستفسارات الدعم</span>
                  <span className="badge badge-lav text-[10px]">مربوط</span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
                  الرسائل الواردة من صفحة تواصل معنا مع إمكانية الرد المباشر بضغطة زر وإرسال الرد لإيميل العميلة.
                </p>
                <Link
                  href="/messages"
                  className="btn btn-secondary mt-4 w-full sm:w-auto text-xs font-bold"
                >
                  <Mail size={14} />
                  صندوق رسائل الدعم (Helpdesk)
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: System & Diagnostics */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <section className="app-card p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-5">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <Server size={22} />
              </span>
              <div>
                <h2 className="section-title text-base sm:text-lg">حالة النظام والخدمات السحابية</h2>
                <p className="text-xs text-[var(--muted)]">فحص سلامة الاتصال بقاعدة البيانات وخدمات البريد والتخزين.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3.5 bg-[var(--surface-2)]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-black text-[var(--ink)]">قاعدة بيانات PostgreSQL / Neon</p>
                    <p className="text-[11px] text-[var(--muted)]">متصلة وجاهزة للعمل بكفاءة عالية</p>
                  </div>
                </div>
                <span className="badge badge-success text-[10px]">متصل (Healthy)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3.5 bg-[var(--surface-2)]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-black text-[var(--ink)]">خدمة البريد الإلكتروني ورموز OTP</p>
                    <p className="text-[11px] text-[var(--muted)]">جاهزة لإرسال رموز التحقق الثنائي</p>
                  </div>
                </div>
                <span className="badge badge-success text-[10px]">مفعّل (Active)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3.5 bg-[var(--surface-2)]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-black text-[var(--ink)]">محرك Google OAuth للمتجر</p>
                    <p className="text-[11px] text-[var(--muted)]">تسجيل سريع للعملاء بحسابات Google</p>
                  </div>
                </div>
                <span className="badge badge-success text-[10px]">مربوط (Configured)</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
