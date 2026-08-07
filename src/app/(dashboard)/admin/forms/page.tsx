import { requireAdminUser } from "@/lib/auth";
import { getAdminFormOverview } from "@/lib/forms";
import { FormsOverview } from "./forms-overview";

export default async function AdminFormsPage() {
  const user = await requireAdminUser("/admin/forms");
  const forms = await getAdminFormOverview(user.tenantId!);

  return <FormsOverview initialForms={forms} />;
}
