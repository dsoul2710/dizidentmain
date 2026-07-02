/**
 * U4 frontend restructure — move files and rewrite imports to @/ alias paths.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

const moves = [
  ["App.jsx", "app/App.jsx"],
  ["pages/auth/LoginPage.jsx", "features/auth/pages/LoginPage.jsx"],
  ["pages/dashboards/UnifiedDashboard.jsx", "features/dashboard/pages/UnifiedDashboard.jsx"],
  ["pages/org/OrgOverview.jsx", "features/org/pages/OrgOverview.jsx"],
  ["pages/PatientEntry.jsx", "features/patient/pages/PatientEntry.jsx"],
  ["pages/PatientAdd.jsx", "features/patient/pages/PatientAdd.jsx"],
  ["pages/patient/PatientSchedulePage.jsx", "features/patient/pages/PatientSchedulePage.jsx"],
  ["pages/patient/PatientBillingPage.jsx", "features/patient/pages/PatientBillingPage.jsx"],
  ["pages/patient/PatientOverviewPage.jsx", "features/patient/pages/PatientOverviewPage.jsx"],
  ["pages/patient/PatientDocumentsPage.jsx", "features/patient/pages/PatientDocumentsPage.jsx"],
  ["pages/patient/PatientReportsPage.jsx", "features/patient/pages/PatientReportsPage.jsx"],
  ["pages/patient/VisitPicker.jsx", "features/patient/pages/VisitPicker.jsx"],
  ["pages/doctor/DoctorOverview.jsx", "features/doctor/pages/DoctorOverview.jsx"],
  ["pages/doctor/DentalCarePage.jsx", "features/doctor/pages/DentalCarePage.jsx"],
  ["pages/DoctorEntry.jsx", "features/doctor/pages/DoctorEntry.jsx"],
  ["pages/super-admin/SuperAdminOverview.jsx", "features/admin/pages/SuperAdminOverview.jsx"],
  ["pages/super-admin/ManageOrganizations.jsx", "features/admin/pages/ManageOrganizations.jsx"],
  ["pages/super-admin/ManageDoctors.jsx", "features/admin/pages/ManageDoctors.jsx"],
  ["pages/super-admin/ManagePatients.jsx", "features/admin/pages/ManagePatients.jsx"],
  ["pages/super-admin/ManageServiceProviders.jsx", "features/admin/pages/ManageServiceProviders.jsx"],
  ["pages/provider/ProviderOverview.jsx", "features/provider/pages/ProviderOverview.jsx"],
  ["pages/provider/LabOrdersView.jsx", "features/provider/pages/LabOrdersView.jsx"],
  ["pages/provider/BedsAllocationView.jsx", "features/provider/pages/BedsAllocationView.jsx"],
  ["pages/provider/GenericProviderPortalView.jsx", "features/provider/pages/GenericProviderPortalView.jsx"],
  ["pages/chat/ChatPage.jsx", "features/chat/pages/ChatPage.jsx"],
  ["pages/chat/chat.css", "features/chat/pages/chat.css"],
  ["pages/BillingView.jsx", "features/billing/pages/BillingView.jsx"],
  ["pages/InventoryView.jsx", "features/inventory/pages/InventoryView.jsx"],
  ["pages/VendorEntry.jsx", "features/inventory/pages/VendorEntry.jsx"],
  ["pages/LabEntryView.jsx", "features/inventory/pages/LabEntryView.jsx"],
  ["pages/ScheduleView.jsx", "features/schedule/pages/ScheduleView.jsx"],
  ["pages/ScheduleView.css", "features/schedule/pages/ScheduleView.css"],
  ["pages/ReportsView.jsx", "features/reports/pages/ReportsView.jsx"],
  ["pages/DiagnosisView.jsx", "features/clinical/pages/DiagnosisView.jsx"],
  ["pages/TreatmentPlanView.jsx", "features/clinical/pages/TreatmentPlanView.jsx"],
  ["pages/ConsentPostOpView.jsx", "features/clinical/pages/ConsentPostOpView.jsx"],
  ["components/layout/HeaderPatientSelector.jsx", "shared/components/layout/HeaderPatientSelector.jsx"],
  ["components/layout/HeaderProfile.jsx", "shared/components/layout/HeaderProfile.jsx"],
  ["components/layout/WowDashLayout.jsx", "shared/components/layout/WowDashLayout.jsx"],
  ["components/common/UserManager.jsx", "shared/components/common/UserManager.jsx"],
  ["components/common/ToastProvider.jsx", "shared/components/common/ToastProvider.jsx"],
  ["components/common/GlobalLoader.jsx", "shared/components/common/GlobalLoader.jsx"],
  ["components/common/PatientSelect.jsx", "shared/components/common/PatientSelect.jsx"],
  ["components/chat/NotificationPanel.jsx", "shared/components/chat/NotificationPanel.jsx"],
  ["components/chat/ChatBell.jsx", "shared/components/chat/ChatBell.jsx"],
  ["components/billing/BillingInvoice.jsx", "shared/components/billing/BillingInvoice.jsx"],
  ["components/clinical/ClinicalExam.jsx", "shared/components/clinical/ClinicalExam.jsx"],
  ["components/print/Prescription.jsx", "shared/components/print/Prescription.jsx"],
  ["components/print/DentalConsent.jsx", "shared/components/print/DentalConsent.jsx"],
  ["components/print/PostOperativeGuide.jsx", "shared/components/print/PostOperativeGuide.jsx"],
  ["components/print/ExamTreatmentSummary.jsx", "shared/components/print/ExamTreatmentSummary.jsx"],
  ["components/print/print-common.css", "shared/components/print/print-common.css"],
  ["components/odontogram/Odontogram.jsx", "shared/components/odontogram/Odontogram.jsx"],
  ["components/odontogram/AdultRaphaelChart.jsx", "shared/components/odontogram/AdultRaphaelChart.jsx"],
  ["components/odontogram/ChildRaphaelChart.jsx", "shared/components/odontogram/ChildRaphaelChart.jsx"],
  ["components/rx/RxSection.jsx", "features/clinical/components/rx/RxSection.jsx"],
  ["hooks/useNotifications.js", "shared/hooks/useNotifications.js"],
  ["utils/dateFormat.js", "shared/utils/dateFormat.js"],
  ["utils/initials.js", "shared/utils/initials.js"],
  ["utils/patientList.js", "shared/utils/patientList.js"],
  ["api/api.js", "api/client.js"],
];

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn("Skip missing:", fromRel);
    return;
  }
  ensureDirFor(to);
  fs.renameSync(from, to);
  console.log("Moved:", fromRel, "->", toRel);
}

const importReplacements = [
  [/from\s+["']\.\.\/api\/api["']/g, 'from "@/api/client"'],
  [/from\s+["']\.\.\/\.\.\/api\/api["']/g, 'from "@/api/client"'],
  [/from\s+["']\.\/api\/api["']/g, 'from "@/api/client"'],
  [/from\s+["']\.\.\/config["']/g, 'from "@/config"'],
  [/from\s+["']\.\.\/\.\.\/config["']/g, 'from "@/config"'],
  [/from\s+["']\.\/config["']/g, 'from "@/config"'],
  [/from\s+["']\.\.\/utils\/dateFormat["']/g, 'from "@/shared/utils/dateFormat"'],
  [/from\s+["']\.\.\/\.\.\/utils\/dateFormat["']/g, 'from "@/shared/utils/dateFormat"'],
  [/from\s+["']\.\.\/\.\.\/\.\.\/utils\/dateFormat["']/g, 'from "@/shared/utils/dateFormat"'],
  [/from\s+["']\.\.\/utils\/initials["']/g, 'from "@/shared/utils/initials"'],
  [/from\s+["']\.\.\/\.\.\/utils\/initials["']/g, 'from "@/shared/utils/initials"'],
  [/from\s+["']\.\.\/utils\/patientList["']/g, 'from "@/shared/utils/patientList"'],
  [/from\s+["']\.\.\/\.\.\/utils\/patientList["']/g, 'from "@/shared/utils/patientList"'],
  [/from\s+["']\.\.\/hooks\/useNotifications["']/g, 'from "@/shared/hooks/useNotifications"'],
  [/from\s+["']\.\.\/\.\.\/hooks\/useNotifications["']/g, 'from "@/shared/hooks/useNotifications"'],
  [/from\s+["']\.\/App\.jsx["']/g, 'from "@/app/App.jsx"'],
  [/from\s+["']\.\/pages\/auth\/LoginPage["']/g, 'from "@/features/auth/pages/LoginPage"'],
  [/from\s+["']\.\/pages\/dashboards\/UnifiedDashboard["']/g, 'from "@/features/dashboard/pages/UnifiedDashboard"'],
  [/from\s+["']\.\/components\/common\/ToastProvider["']/g, 'from "@/shared/components/common/ToastProvider"'],
  [/from\s+["']\.\/components\/common\/GlobalLoader["']/g, 'from "@/shared/components/common/GlobalLoader"'],
  [/from\s+["']\.\.\/components\/odontogram\/Odontogram\.jsx["']/g, 'from "@/shared/components/odontogram/Odontogram.jsx"'],
  [/from\s+["']\.\.\/components\/clinical\/ClinicalExam\.jsx["']/g, 'from "@/shared/components/clinical/ClinicalExam.jsx"'],
  [/from\s+["']\.\.\/components\/billing\/BillingInvoice\.jsx["']/g, 'from "@/shared/components/billing/BillingInvoice.jsx"'],
  [/from\s+["']\.\.\/components\/print\/Prescription\.jsx["']/g, 'from "@/shared/components/print/Prescription.jsx"'],
  [/from\s+["']\.\.\/components\/print\/DentalConsent\.jsx["']/g, 'from "@/shared/components/print/DentalConsent.jsx"'],
  [/from\s+["']\.\.\/components\/print\/PostOperativeGuide\.jsx["']/g, 'from "@/shared/components/print/PostOperativeGuide.jsx"'],
  [/from\s+["']\.\.\/components\/print\/ExamTreatmentSummary\.jsx["']/g, 'from "@/shared/components/print/ExamTreatmentSummary.jsx"'],
  [/from\s+["']\.\.\/components\/common\/PatientSelect["']/g, 'from "@/shared/components/common/PatientSelect"'],
  [/from\s+["']\.\.\/common\/PatientSelect["']/g, 'from "@/shared/components/common/PatientSelect"'],
  [/from\s+["']\.\.\/print\/Prescription\.jsx["']/g, 'from "@/shared/components/print/Prescription.jsx"'],
  [/from\s+["']\.\.\/org\/OrgOverview\.jsx["']/g, 'from "@/features/org/pages/OrgOverview.jsx"'],
  [/from\s+["']\.\.\/PatientEntry\.jsx["']/g, 'from "@/features/patient/pages/PatientEntry.jsx"'],
  [/from\s+["']\.\.\/PatientAdd\.jsx["']/g, 'from "@/features/patient/pages/PatientAdd.jsx"'],
  [/from\s+["']\.\.\/DoctorEntry\.jsx["']/g, 'from "@/features/doctor/pages/DoctorEntry.jsx"'],
  [/from\s+["']\.\.\/ScheduleView\.jsx["']/g, 'from "@/features/schedule/pages/ScheduleView.jsx"'],
  [/from\s+["']\.\.\/BillingView\.jsx["']/g, 'from "@/features/billing/pages/BillingView.jsx"'],
  [/from\s+["']\.\.\/InventoryView\.jsx["']/g, 'from "@/features/inventory/pages/InventoryView.jsx"'],
  [/from\s+["']\.\.\/ReportsView\.jsx["']/g, 'from "@/features/reports/pages/ReportsView.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/rx\/RxSection\.jsx["']/g, 'from "@/features/clinical/components/rx/RxSection.jsx"'],
  [/from\s+["']\.\.\/TreatmentPlanView\.jsx["']/g, 'from "@/features/clinical/pages/TreatmentPlanView.jsx"'],
  [/from\s+["']\.\.\/ConsentPostOpView\.jsx["']/g, 'from "@/features/clinical/pages/ConsentPostOpView.jsx"'],
  [/from\s+["']\.\.\/LabEntryView\.jsx["']/g, 'from "@/features/inventory/pages/LabEntryView.jsx"'],
  [/from\s+["']\.\.\/VendorEntry\.jsx["']/g, 'from "@/features/inventory/pages/VendorEntry.jsx"'],
  [/from\s+["']\.\.\/chat\/ChatPage\.jsx["']/g, 'from "@/features/chat/pages/ChatPage.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/chat\/ChatBell\.jsx["']/g, 'from "@/shared/components/chat/ChatBell.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/chat\/NotificationPanel\.jsx["']/g, 'from "@/shared/components/chat/NotificationPanel.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/layout\/WowDashLayout\.jsx["']/g, 'from "@/shared/components/layout/WowDashLayout.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/layout\/HeaderProfile\.jsx["']/g, 'from "@/shared/components/layout/HeaderProfile.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/layout\/HeaderPatientSelector\.jsx["']/g, 'from "@/shared/components/layout/HeaderPatientSelector.jsx"'],
  [/from\s+["']\.\.\/\.\.\/components\/common\/UserManager\.jsx["']/g, 'from "@/shared/components/common/UserManager.jsx"'],
  [/from\s+["']\.\.\/doctor\/DoctorOverview\.jsx["']/g, 'from "@/features/doctor/pages/DoctorOverview.jsx"'],
  [/from\s+["']\.\.\/doctor\/DentalCarePage\.jsx["']/g, 'from "@/features/doctor/pages/DentalCarePage.jsx"'],
  [/from\s+["']\.\.\/patient\/PatientOverviewPage["']/g, 'from "@/features/patient/pages/PatientOverviewPage"'],
  [/from\s+["']\.\.\/patient\/PatientBillingPage["']/g, 'from "@/features/patient/pages/PatientBillingPage"'],
  [/from\s+["']\.\.\/patient\/PatientReportsPage["']/g, 'from "@/features/patient/pages/PatientReportsPage"'],
  [/from\s+["']\.\.\/patient\/PatientDocumentsPage["']/g, 'from "@/features/patient/pages/PatientDocumentsPage"'],
  [/from\s+["']\.\.\/patient\/PatientSchedulePage\.jsx["']/g, 'from "@/features/patient/pages/PatientSchedulePage.jsx"'],
  [/from\s+["']\.\.\/provider\/ProviderOverview\.jsx["']/g, 'from "@/features/provider/pages/ProviderOverview.jsx"'],
  [/from\s+["']\.\.\/provider\/LabOrdersView\.jsx["']/g, 'from "@/features/provider/pages/LabOrdersView.jsx"'],
  [/from\s+["']\.\.\/provider\/BedsAllocationView\.jsx["']/g, 'from "@/features/provider/pages/BedsAllocationView.jsx"'],
  [/from\s+["']\.\.\/provider\/GenericProviderPortalView\.jsx["']/g, 'from "@/features/provider/pages/GenericProviderPortalView.jsx"'],
  [/from\s+["']\.\.\/super-admin\/SuperAdminOverview\.jsx["']/g, 'from "@/features/admin/pages/SuperAdminOverview.jsx"'],
  [/from\s+["']\.\.\/super-admin\/ManageOrganizations\.jsx["']/g, 'from "@/features/admin/pages/ManageOrganizations.jsx"'],
  [/from\s+["']\.\.\/super-admin\/ManageDoctors\.jsx["']/g, 'from "@/features/admin/pages/ManageDoctors.jsx"'],
  [/from\s+["']\.\.\/super-admin\/ManagePatients\.jsx["']/g, 'from "@/features/admin/pages/ManagePatients.jsx"'],
  [/from\s+["']\.\.\/super-admin\/ManageServiceProviders\.jsx["']/g, 'from "@/features/admin/pages/ManageServiceProviders.jsx"'],
  [/from\s+["']\.\/VisitPicker\.jsx["']/g, 'from "@/features/patient/pages/VisitPicker.jsx"'],
  [/from\s+["']\.\/VisitPicker["']/g, 'from "@/features/patient/pages/VisitPicker"'],
  [/import\s+["']\.\/chat\/chat\.css["']/g, 'import "@/features/chat/pages/chat.css"'],
  [/import\s+["']\.\/ScheduleView\.css["']/g, 'import "@/features/schedule/pages/ScheduleView.css"'],
  [/import\s+["']\.\/chat\.css["']/g, 'import "@/features/chat/pages/chat.css"'],
  [/import\s+["']\.\/print-common\.css["']/g, 'import "@/shared/components/print/print-common.css"'],
];

function rewriteImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [pattern, replacement] of importReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
}

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, fn);
    } else if (/\.(jsx?|css)$/.test(entry.name)) {
      fn(full);
    }
  }
}

console.log("=== U4 Frontend Migration ===");
for (const [from, to] of moves) {
  moveFile(from, to);
}

walk(SRC, rewriteImports);

// api.js backward-compat re-export
const apiShim = `export { default } from "./client.js";\n`;
fs.writeFileSync(path.join(SRC, "api/api.js"), apiShim);

// Fix client.js config import
const clientPath = path.join(SRC, "api/client.js");
if (fs.existsSync(clientPath)) {
  let c = fs.readFileSync(clientPath, "utf8");
  c = c.replace(/from\s+["']\.\.\/config["']/g, 'from "@/config"');
  fs.writeFileSync(clientPath, c);
}

console.log("Done.");
