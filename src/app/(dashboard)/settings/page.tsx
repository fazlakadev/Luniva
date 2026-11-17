import AccountSettingsForm from "@/components/account-settings-form";
import SettingsForm from "@/components/settings-form";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, session] = await Promise.all([getSettings(), getSession()]);

  return (
    <div className="page-enter">
      <div className="mb-7">
        <p className="eyebrow">إعدادات لونيفا</p>
        <h1 className="page-title mt-1">الإعدادات</h1>
        <p className="page-subtitle mt-2 max-w-xl">اضبطي بيانات الشركة وشروط التحصيل وبيانات الدخول مرة واحدة، لتظهر تلقائيًا في كل مستند.</p>
      </div>
      <SettingsForm initial={settings} />
      <div className="mt-6">
        <AccountSettingsForm username={session?.username ?? ""} />
      </div>
    </div>
  );
}
