import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import WowDashLayout from "../../components/layout/WowDashLayout";
import HeaderProfile from "../../components/layout/HeaderProfile";
import SuperAdminOverview from "../super-admin/SuperAdminOverview.jsx";
import ManageOrganizations from "../super-admin/ManageOrganizations.jsx";
import ManageDoctors from "../super-admin/ManageDoctors.jsx";
import ManagePatients from "../super-admin/ManagePatients.jsx";
import ManageServiceProviders from "../super-admin/ManageServiceProviders.jsx";

export default function SuperAdminDashboard({ user, onLogout }) {
  const navItems = [
    { type: "link", label: "Overview", to: "/super-admin/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Administration" },
    { type: "link", label: "Organizations", to: "/super-admin/organizations", icon: "ri-government-line" },
    { type: "link", label: "Doctors", to: "/super-admin/doctors", icon: "ri-user-heart-line" },
    { type: "link", label: "Patients", to: "/super-admin/patients", icon: "ri-user-3-line" },
    { type: "link", label: "Service Providers", to: "/super-admin/service-providers", icon: "ri-customer-service-2-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Super Control Center"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search clinics..."
      headerActions={
        <HeaderProfile
          name="Super Admin"
          roleLabel="Super Admin"
        />
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<SuperAdminOverview />} />
        <Route path="organizations" element={<ManageOrganizations />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="patients" element={<ManagePatients />} />
        <Route path="service-providers" element={<ManageServiceProviders />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </WowDashLayout>
  );
}
