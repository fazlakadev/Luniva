import SettingsHub from "@/components/settings-hub";
import { getAdminEmail } from "@/lib/admin-email";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, session, adminEmail] = await Promise.all([
    getSettings(),
    getSession(),
    getAdminEmail(),
  ]);

  return (
    <div className="page-enter">
      <div className="mb-7">
        <p className="eyebrow">إدارة إعدادات لونيفا</p>
        <h1 className="page-title mt-1">مركز الإعدادات والتحكم</h1>
        <p className="page-subtitle mt-2 max-w-xl">
          إدارة هوية الأتيليه والمستندات، إعدادات الأمان والتحقق الثنائي 2FA، منظومة أتمتة الواتساب، وحالة خوادم النظام.
        </p>
      </div>

      <SettingsHub
        initialSettings={settings}
        username={session?.username ?? ""}
        adminEmail={adminEmail}
      />
    </div>
  );
}
