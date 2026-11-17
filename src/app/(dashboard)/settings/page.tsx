import SettingsForm from "@/components/settings-form";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="page-enter">
      <div className="mb-7">
        <p className="eyebrow">Luniva settings</p>
        <h1 className="page-title mt-1">الإعدادات</h1>
        <p className="page-subtitle mt-2 max-w-xl">اضبطي بيانات الشركة وشروط التحصيل مرة واحدة، لتظهر تلقائيًا في كل مستند.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
