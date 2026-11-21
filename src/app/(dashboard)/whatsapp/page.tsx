import { Metadata } from "next";
import {
  getWhatsAppTemplates,
  getWhatsAppLogs,
  getWhatsAppStats,
  getBroadcastAudience,
} from "@/lib/whatsapp";
import WhatsAppHub from "@/components/whatsapp-hub";

export const metadata: Metadata = {
  title: "أتمتة الواتساب والتسويق | Luniva",
  description: "مركز أتمتة رسائل وحملات الواتساب المجانية بدون تكلفة.",
};

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const [templates, logs, stats, audience] = await Promise.all([
    getWhatsAppTemplates(),
    getWhatsAppLogs(100),
    getWhatsAppStats(),
    getBroadcastAudience("all"),
  ]);

  return (
    <div className="space-y-6">
      <WhatsAppHub
        initialTemplates={templates}
        initialLogs={logs}
        initialStats={stats}
        initialAudience={audience}
      />
    </div>
  );
}
