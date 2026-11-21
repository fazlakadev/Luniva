import { Metadata } from "next";
import {
  getWhatsAppTemplates,
  getWhatsAppLogs,
  getWhatsAppStats,
  getBroadcastAudience,
} from "@/lib/whatsapp";
import { getBaileysChats } from "@/lib/whatsapp-baileys";
import WhatsAppHub from "@/components/whatsapp-hub";

export const metadata: Metadata = {
  title: "مركز الواتساب الذكي والمحادثات | Luniva",
  description: "نظام متكامل لإدارة محادثات الواتساب، الكيو ار كود، الربط بالعملاء، والأتمتة بواسطة Baileys.",
};

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const [templates, logs, stats, audience, chats] = await Promise.all([
    getWhatsAppTemplates(),
    getWhatsAppLogs(100),
    getWhatsAppStats(),
    getBroadcastAudience("all"),
    getBaileysChats("all").catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <WhatsAppHub
        initialTemplates={templates}
        initialLogs={logs}
        initialStats={stats}
        initialAudience={audience}
        initialChats={chats}
      />
    </div>
  );
}
