import { Metadata } from "next";
import { listContactMessages } from "@/lib/messages";
import AdminMessagesHub from "@/components/admin-messages-hub";

export const metadata: Metadata = {
  title: "رسائل وتواصل العميلات | Luniva",
  description: "متابعة رسائل نموذج التواصل والدعم والرد المباشر على بريد العميلات.",
};

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await listContactMessages();

  return (
    <div className="space-y-6">
      <AdminMessagesHub initialMessages={messages} />
    </div>
  );
}
