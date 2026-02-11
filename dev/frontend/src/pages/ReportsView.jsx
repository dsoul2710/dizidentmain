// src/pages/ReportsView.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { formatDateDMY } from "../utils/dateFormat";

const currency = (val) => {
  const num = Number(val ?? 0);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
const formatDateCell = (value) => formatDateDMY(value) || value || "-";

export default function ReportsView() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const iso = (date) => (date instanceof Date ? date.toISOString().slice(0, 10) : date);

  const [activeTab, setActiveTab] = useState("revenue");
  const [revenueSubTab, setRevenueSubTab] = useState("daywise");
  const [revenuePreset, setRevenuePreset] = useState("month");
  const [revenueFilters, setRevenueFilters] = useState({
    fromDate: monthStartIso,
    toDate: todayIso,
    doctorId: "",
  });

  const [daywiseRows, setDaywiseRows] = useState([]);
  const [doctorRevenue, setDoctorRevenue] = useState([]);
  const [treatmentRevenue, setTreatmentRevenue] = useState([]);
  const [treatmentCategory, setTreatmentCategory] = useState("");
  const [treatmentCategories, setTreatmentCategories] = useState([]);
  const [outstandingRows, setOutstandingRows] = useState([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [revenueSummary, setRevenueSummary] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    billCount: 0,
    paymentCount: 0,
  });
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState("");

  const [lowStockItems, setLowStockItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventorySubTab, setInventorySubTab] = useState("low");
  const [inventoryFilters, setInventoryFilters] = useState({
    fromDate: monthStartIso,
    toDate: todayIso,
  });
  const [consumptionRows, setConsumptionRows] = useState([]);
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [valuationRows, setValuationRows] = useState([]);
  const [valuationTotal, setValuationTotal] = useState(0);

  const revenueTabs = [
    { id: "daywise", label: "1) Day-wise collections" },
    { id: "doctor", label: "2) Doctor-wise revenue" },
    { id: "treatment", label: "3) Treatment-wise revenue" },
    { id: "outstanding", label: "4) Outstanding / dues" },
  ];

  const updateRevenueFilter = (key, value) =>
    setRevenueFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

  const buildUrl = (path, filters) => {
    const qs = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        qs.append(k, v);
      }
    });
    const query = qs.toString();
    return `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;
  };

  const applyPreset = (preset) => {
    const now = new Date();
    let from = revenueFilters.fromDate;
    let to = revenueFilters.toDate;

    switch (preset) {
      case "today":
        from = iso(now);
        to = iso(now);
        break;
      case "week": {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        from = iso(weekStart);
        to = iso(now);
        break;
      }
      case "month":
      default:
        from = monthStartIso;
        to = iso(now);
        break;
    }

    const nextFilters = { ...revenueFilters, fromDate: from, toDate: to };
    setRevenuePreset(preset);
    setRevenueFilters(nextFilters);
    loadRevenueData(nextFilters);
  };

  const loadRevenueData = async (filters = revenueFilters) => {
    setRevenueLoading(true);
    setRevenueError("");
    try {
      const [daywiseRes, doctorRes, treatmentRes, outstandingRes] = await Promise.all([
        fetch(buildUrl("/reports/revenue/daywise", filters)),
        fetch(buildUrl("/reports/revenue/doctor", filters)),
        fetch(
          buildUrl("/reports/revenue/treatments", {
            ...filters,
            categoryKey: treatmentCategory || undefined,
          })
        ),
        fetch(buildUrl("/reports/revenue/outstanding", filters)),
      ]);

      if (!daywiseRes.ok) throw new Error("Failed to load day-wise collections");
      if (!doctorRes.ok) throw new Error("Failed to load doctor-wise revenue");
      if (!treatmentRes.ok) throw new Error("Failed to load treatment-wise revenue");
      if (!outstandingRes.ok) throw new Error("Failed to load outstanding dues");

      const daywise = await daywiseRes.json();
      const doctors = await doctorRes.json();
      const treatments = await treatmentRes.json();
      const outstanding = await outstandingRes.json();

      setDaywiseRows(daywise.rows || []);
      setRevenueSummary({
        totalBilled: Number(daywise.totalBilled ?? 0),
        totalCollected: Number(daywise.totalCollected ?? 0),
        totalOutstanding: Number(daywise.totalOutstanding ?? 0),
        billCount: Number(daywise.billCount ?? 0),
        paymentCount: Number(daywise.paymentCount ?? 0),
      });
      setDoctorRevenue(Array.isArray(doctors) ? doctors : []);
      setTreatmentRevenue(treatments?.summary || []);
      setOutstandingRows(outstanding?.rows || []);
      setOutstandingTotal(Number(outstanding?.totalPending ?? 0));
    } catch (err) {
      console.error("Error loading revenue reports", err);
      setRevenueError("Unable to load revenue data. Please try again.");
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadInventoryReport = async (type = inventorySubTab, filters = inventoryFilters) => {
    setInventoryLoading(true);
    setInventoryError("");
    try {
      let res;
      switch (type) {
        case "low": {
          const qs = new URLSearchParams();
          if (filters.fromDate) qs.append("fromDate", filters.fromDate);
          if (filters.toDate) qs.append("toDate", filters.toDate);
          res = await fetch(`${API_BASE_URL}/reports/inventory/low-stock${qs.toString() ? `?${qs.toString()}` : ""}`);
          if (!res.ok) throw new Error("Failed to load low stock");
          setLowStockItems((await res.json()) || []);
          break;
        }
        case "consumption": {
          const qs = new URLSearchParams();
          if (filters.fromDate) qs.append("fromDate", filters.fromDate);
          if (filters.toDate) qs.append("toDate", filters.toDate);
          res = await fetch(`${API_BASE_URL}/reports/inventory/consumption?${qs.toString()}`);
          if (!res.ok) throw new Error("Failed to load consumption");
          setConsumptionRows((await res.json()) || []);
          break;
        }
        case "purchase": {
          const qs = new URLSearchParams();
          if (filters.fromDate) qs.append("fromDate", filters.fromDate);
          if (filters.toDate) qs.append("toDate", filters.toDate);
          res = await fetch(`${API_BASE_URL}/reports/inventory/purchase?${qs.toString()}`);
          if (!res.ok) throw new Error("Failed to load purchase summary");
          setPurchaseRows((await res.json()) || []);
          break;
        }
        case "valuation":
          res = await fetch(`${API_BASE_URL}/reports/inventory/valuation`);
          if (!res.ok) throw new Error("Failed to load valuation");
          const val = await res.json();
          setValuationRows(val?.rows || []);
          setValuationTotal(Number(val?.totalValue || 0));
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("Inventory report error", err);
      setInventoryError(err.message || "Unable to load inventory report.");
      if (type === "low") setLowStockItems([]);
      if (type === "consumption") setConsumptionRows([]);
      if (type === "purchase") setPurchaseRows([]);
      if (type === "valuation") {
        setValuationRows([]);
        setValuationTotal(0);
      }
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
    loadInventoryReport("low");
    fetch(`${API_BASE_URL}/masters/treatments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTreatmentCategories(Array.isArray(data) ? data : []))
      .catch(() => setTreatmentCategories([]));
  }, []);

  useEffect(() => {
    loadInventoryReport(inventorySubTab);
  }, [inventorySubTab]);

  return (
    <section id="view-reports" className="view show">
      <div className="page-header">
        <div>
          <h2>Reports &amp; Analytics</h2>
          <div className="page-subtitle">
            Clinic performance snapshots, revenue, treatments, doctors, inventory &amp; patient mix.
          </div>
        </div>
        <div className="report-actions">
          <button className="btn sm" onClick={() => loadRevenueData()}>
            Refresh
          </button>
          <button className="btn sm" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="panel reports-panel">
          <div className="reports-tabs">
            {[
              { id: "revenue", label: "Revenue" },
              { id: "appointments", label: "Appointments" },
              { id: "inventory", label: "Inventory" },
              { id: "patients", label: "Patients" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`btn sm${activeTab === tab.id ? " primary" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "revenue" && (
            <RevenueSection
              filters={revenueFilters}
              preset={revenuePreset}
              tabs={revenueTabs}
              activeTab={revenueSubTab}
              setActiveTab={setRevenueSubTab}
              daywise={daywiseRows}
              doctorRevenue={doctorRevenue}
              treatmentRevenue={treatmentRevenue}
              outstanding={outstandingRows}
              outstandingTotal={outstandingTotal || revenueSummary.totalOutstanding}
              treatmentCategory={treatmentCategory}
              setTreatmentCategory={setTreatmentCategory}
              treatmentCategories={treatmentCategories}
              loading={revenueLoading}
              error={revenueError}
              summary={revenueSummary}
              onReload={() => loadRevenueData(revenueFilters)}
              onApplyPreset={applyPreset}
              onFilterChange={updateRevenueFilter}
            />
          )}

          {activeTab === "appointments" && <AppointmentSection />}
          {activeTab === "inventory" && (
            <InventorySection
              subTab={inventorySubTab}
              setSubTab={setInventorySubTab}
              filters={inventoryFilters}
              setFilters={setInventoryFilters}
              lowStock={lowStockItems}
              consumption={consumptionRows}
              purchase={purchaseRows}
              valuation={{ rows: valuationRows, total: valuationTotal }}
              loading={inventoryLoading}
              error={inventoryError}
              onRefresh={() =>
                loadInventoryReport(inventorySubTab, inventoryFilters)
              }
            />
          )}
          {activeTab === "patients" && <PatientSection />}
        </div>
      </div>
    </section>
  );
}

function RevenueSection({
  filters,
  preset,
  tabs,
  activeTab,
  setActiveTab,
  daywise,
  doctorRevenue,
  treatmentRevenue,
  outstanding,
  outstandingTotal,
  treatmentCategory,
  setTreatmentCategory,
  treatmentCategories,
  loading,
  error,
  summary,
  onReload,
  onApplyPreset,
  onFilterChange,
}) {
  const presetOptions = [
    { id: "today", label: "Today" },
    { id: "week", label: "This week" },
    { id: "month", label: "This month" },
  ];

  const summaryCards = [
    { key: "billed", label: "Billed", value: summary?.totalBilled ?? 0 },
    { key: "collected", label: "Collected", value: summary?.totalCollected ?? 0 },
    { key: "outstanding", label: "Outstanding", value: outstandingTotal ?? 0 },
    { key: "bills", label: "Bills", value: summary?.billCount ?? 0 },
  ];

  const hasData = (arr) => Array.isArray(arr) && arr.length > 0;

  return (
    <div>
      <div className="neo-card mb-3">
        <div className="neo-card-header reports-section-header">
          <div>
            <strong>Revenue &amp; collections</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
          </div>
          <div className="row-gap">
            <div className="filter-block">
              <span className="filter-label">From</span>
              <input
                type="date"
                className="neo-input"
                value={filters.fromDate}
                onChange={(e) => onFilterChange("fromDate", e.target.value)}
              />
            </div>
            <div className="filter-block">
              <span className="filter-label">To</span>
              <input
                type="date"
                className="neo-input"
                value={filters.toDate}
                onChange={(e) => onFilterChange("toDate", e.target.value)}
              />
            </div>
            <div className="filter-block">
              <span className="filter-label">Doctor (optional)</span>
              <input
                className="neo-input"
                placeholder="Doctor ID for dues"
                value={filters.doctorId}
                onChange={(e) => onFilterChange("doctorId", e.target.value)}
              />
            </div>
            <button className="btn sm primary" onClick={onReload} disabled={loading}>
              Apply
            </button>
          </div>
        </div>
        <div className="neo-card-body">
          <div className="reports-metrics-row">
            {summaryCards.map((m) => (
              <div className="neo-card metric-card" key={m.key}>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "#7b8899" }}>{m.label}</div>
                  <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>
                    {m.key === "bills" ? Number(m.value ?? 0).toLocaleString("en-IN") : `Rs. ${currency(m.value)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row-gap" style={{ margin: "12px 0" }}>
            {presetOptions.map((p) => (
              <button
                key={p.id}
                className={`btn sm${preset === p.id ? " primary" : ""}`}
                onClick={() => onApplyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && <div className="alert error" style={{ marginBottom: 10 }}>{error}</div>}
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}

          <div className="reports-tabs" style={{ marginBottom: 10 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn sm${activeTab === tab.id ? " primary" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "daywise" && (
            <>
              {hasData(daywise) ? (
                <ReportTable
                  columns={["Date", "Billed", "Collected", "Bills", "Payments"]}
                  rows={daywise.map((r) => [
                    formatDateCell(r.date),
                    `Rs. ${currency(r.billedAmount)}`,
                    `Rs. ${currency(r.collection)}`,
                    r.bills ?? 0,
                    r.payments ?? 0,
                  ])}
                />
              ) : (
                <div className="muted-small">
                  {loading ? "Loading..." : "No data available."}
                </div>
              )}
            </>
          )}

          {activeTab === "doctor" && (
            <>
              {hasData(doctorRevenue) ? (
                <ReportTable
                  columns={["Doctor", "Billed", "Collected", "Outstanding", "Bills", "Payments"]}
                  rows={doctorRevenue.map((r) => [
                    r.doctor,
                    `Rs. ${currency(r.billed)}`,
                    `Rs. ${currency(r.collected)}`,
                    `Rs. ${currency(r.outstanding)}`,
                    r.bills ?? 0,
                    r.payments ?? 0,
                  ])}
                />
              ) : (
                <div className="muted-small">
                  {loading ? "Loading..." : "No data available."}
                </div>
              )}
            </>
          )}

          {activeTab === "treatment" && (
            <>
              <ReportFilters>
                <FilterBlock label="Category">
                  <select
                    className="neo-input"
                    value={treatmentCategory}
                    onChange={(e) => setTreatmentCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {(treatmentCategories || []).map((cat) => (
                      <option key={cat.key || cat.id} value={cat.key}>
                        {cat.title || cat.key}
                      </option>
                    ))}
                  </select>
                </FilterBlock>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn sm primary" onClick={onReload} disabled={loading}>
                    Apply
                  </button>
                </div>
              </ReportFilters>
              {hasData(treatmentRevenue) ? (
                <ReportTable
                  columns={["Procedure / Service", "Category", "Cases", "Value"]}
                  rows={treatmentRevenue.map((t) => [
                    t.procedure,
                    t.categoryTitle || t.categoryKey || "-",
                    t.cases ?? 0,
                    `Rs. ${currency(t.value)}`,
                  ])}
                />
              ) : (
                <div className="muted-small">
                  {loading ? "Loading..." : "No data available."}
                </div>
              )}
            </>
          )}

          {activeTab === "outstanding" && (
            <>
              <div className="muted-small" style={{ marginBottom: 8 }}>
                {loading ? "Loading..." : "Pending dues are shown after subtracting all payments made on each bill."}
              </div>
              {hasData(outstanding) ? (
                <ReportTable
                  columns={["Bill #", "Patient", "Doctor", "Bill date", "Net", "Paid", "Pending"]}
                  rows={outstanding.map((o) => [
                    o.billNo,
                    o.patient,
                    o.doctor,
                    formatDateCell(o.billDate),
                    `Rs. ${currency(o.netAmount)}`,
                    `Rs. ${currency(o.paidAmount)}`,
                    `Rs. ${currency(o.pendingAmount)}`,
                  ])}
                />
              ) : (
                <div className="muted-small">
                  {loading ? "Loading..." : "No data available."}
                </div>
              )}
              <div style={{ marginTop: 8, fontWeight: 600 }}>Total pending: Rs. {currency(outstandingTotal)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TreatmentSection({ summary, loading, onRefresh }) {
  const rows = Array.isArray(summary) ? summary : [];

  return (
    <div className="neo-card">
      <div className="neo-card-header reports-section-header">
        <div>
          <strong>Treatment mix</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
        </div>
        <div className="report-actions">
          <button className="btn sm" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      <div className="neo-card-body table-wrap">
        {rows.length > 0 ? (
          <table className="neo-table">
            <thead>
              <tr>
                <th>Procedure</th>
                <th>Cases</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.procedure}>
                  <td>{t.procedure}</td>
                  <td>{t.cases ?? 0}</td>
                  <td className="text-right">Rs. {currency(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted-small">
            {loading ? "Loading..." : "No data available."}
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorSection({ rows, loading, onRefresh }) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <div className="neo-card">
      <div className="neo-card-header reports-section-header">
        <div>
          <strong>Doctor performance</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
        </div>
        <div className="report-actions">
          <button className="btn sm" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      <div className="neo-card-body table-wrap">
        {data.length > 0 ? (
          <table className="neo-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th className="text-right">Billed</th>
                <th className="text-right">Collected</th>
                <th className="text-right">Outstanding</th>
                <th>Bills</th>
                <th>Payments</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.doctor}>
                  <td>{d.doctor}</td>
                  <td className="text-right">Rs. {currency(d.billed)}</td>
                  <td className="text-right">Rs. {currency(d.collected)}</td>
                  <td className="text-right">Rs. {currency(d.outstanding)}</td>
                  <td>{d.bills ?? 0}</td>
                  <td>{d.payments ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted-small">
            {loading ? "Loading..." : "No data available."}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentSection() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [activeAppointmentReport, setActiveAppointmentReport] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [appointmentFilters, setAppointmentFilters] = useState({
    fromDate: monthStartIso,
    toDate: todayIso,
    doctorId: "",
  });

  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    rescheduled: 0,
    pending: 0,
    statusBreakdown: [],
  });
  const [doctorLoad, setDoctorLoad] = useState([]);
  const [procedureReport, setProcedureReport] = useState({ summary: [], rows: [] });
  const [outcomeReport, setOutcomeReport] = useState({ summary: [], rows: [] });

  const appointmentTabs = [
    { id: "summary", label: "1) Appointment summary" },
    { id: "doctor", label: "2) Doctor-wise load" },
    { id: "procedure", label: "3) Procedure-wise" },
    { id: "outcome", label: "4) Appointment outcomes" },
  ];

  const updateFilter = (key, value) =>
    setAppointmentFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

  const fetchAppointmentReport = async (endpoint, params, setter) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const url = `${API_BASE_URL}/reports/appointments/${endpoint}${qs.toString() ? `?${qs.toString()}` : ""}`;
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load appointment report");
      const data = await res.json();
      setter(data);
    } catch (err) {
      console.error(`Error loading appointment report: ${endpoint}`, err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = () =>
    fetchAppointmentReport(
      "summary",
      {
        fromDate: appointmentFilters.fromDate,
        toDate: appointmentFilters.toDate,
        doctorId: appointmentFilters.doctorId,
      },
      (data) =>
        setSummary({
          total: data.total ?? 0,
          completed: data.completed ?? 0,
          cancelled: data.cancelled ?? 0,
          noShow: data.noShow ?? 0,
          rescheduled: data.rescheduled ?? 0,
          pending: data.pending ?? 0,
          statusBreakdown: data.statusBreakdown || [],
        })
    );

  const loadDoctorLoad = () =>
    fetchAppointmentReport(
      "doctor-load",
      {
        fromDate: appointmentFilters.fromDate,
        toDate: appointmentFilters.toDate,
      },
      (data) => setDoctorLoad(Array.isArray(data) ? data : [])
    );

  const loadProcedures = () =>
    fetchAppointmentReport(
      "procedures",
      {
        fromDate: appointmentFilters.fromDate,
        toDate: appointmentFilters.toDate,
      },
      (data) =>
        setProcedureReport({
          summary: data?.summary || [],
          rows: data?.rows || [],
        })
    );

  const loadOutcomes = () =>
    fetchAppointmentReport(
      "outcomes",
      {
        fromDate: appointmentFilters.fromDate,
        toDate: appointmentFilters.toDate,
      },
      (data) =>
        setOutcomeReport({
          summary: data?.summary || [],
          rows: data?.rows || [],
        })
    );

  useEffect(() => {
    switch (activeAppointmentReport) {
      case "summary":
        loadSummary();
        break;
      case "doctor":
        loadDoctorLoad();
        break;
      case "procedure":
        loadProcedures();
        break;
      case "outcome":
        loadOutcomes();
        break;
      default:
        break;
    }
  }, [activeAppointmentReport]);

  const summaryCards = [
    { key: "total", label: "Total appointments", value: summary.total },
    { key: "completed", label: "Completed", value: summary.completed },
    { key: "cancelled", label: "Cancelled", value: summary.cancelled },
    { key: "noShow", label: "No-show", value: summary.noShow },
    { key: "rescheduled", label: "Rescheduled", value: summary.rescheduled },
    { key: "pending", label: "Pending / open", value: summary.pending },
  ];

  return (
    <div>
      <div className="reports-metrics-row">
        {summaryCards.map((m) => (
          <div className="neo-card metric-card" key={m.key}>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: "0.8rem", color: "#7b8899" }}>{m.label}</div>
              <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{m.value?.toLocaleString?.("en-IN") ?? m.value ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="neo-card" style={{ marginBottom: 12 }}>
        <div className="neo-card-header">
          <strong>Section 2 - Appointment Reports (4)</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
        </div>
        <div className="neo-card-body">
          <div className="reports-tabs" style={{ marginBottom: 10 }}>
            {appointmentTabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn sm${activeAppointmentReport === tab.id ? " primary" : ""}`}
                onClick={() => setActiveAppointmentReport(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeAppointmentReport === "summary" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={appointmentFilters.fromDate} onChange={(e) => updateFilter("fromDate", e.target.value)} />
                    <input type="date" className="neo-input" value={appointmentFilters.toDate} onChange={(e) => updateFilter("toDate", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Doctor (optional)">
                  <input className="neo-input" placeholder="Doctor ID" value={appointmentFilters.doctorId} onChange={(e) => updateFilter("doctorId", e.target.value)} />
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadSummary}>Apply</button>
              <ReportTable columns={["Status", "Appointments"]} rows={(summary.statusBreakdown || []).map((r) => [r.status, r.count])} />
            </>
          )}

          {activeAppointmentReport === "doctor" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={appointmentFilters.fromDate} onChange={(e) => updateFilter("fromDate", e.target.value)} />
                    <input type="date" className="neo-input" value={appointmentFilters.toDate} onChange={(e) => updateFilter("toDate", e.target.value)} />
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadDoctorLoad}>Apply</button>
              <ReportTable
                columns={["Doctor", "Total", "Completed", "Cancelled", "No-show", "Rescheduled"]}
                rows={doctorLoad.map((r) => [r.doctor, r.total, r.completed, r.cancelled, r.noShow, r.rescheduled])}
              />
            </>
          )}

          {activeAppointmentReport === "procedure" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={appointmentFilters.fromDate} onChange={(e) => updateFilter("fromDate", e.target.value)} />
                    <input type="date" className="neo-input" value={appointmentFilters.toDate} onChange={(e) => updateFilter("toDate", e.target.value)} />
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadProcedures}>Apply</button>
              <ReportTable columns={["Procedure", "Appointments"]} rows={(procedureReport.summary || []).map((r) => [r.procedure, r.count])} />
              <div style={{ marginTop: 8 }}>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
                <ReportTable
                  columns={["Date", "Slot", "Patient", "Doctor", "Procedure", "Status"]}
                  rows={(procedureReport.rows || []).map((r) => [
                    formatDateCell(r.date),
                    r.slot,
                    r.patient,
                    r.doctor,
                    r.procedure,
                    r.status,
                  ])}
                />
              </div>
            </>
          )}

          {activeAppointmentReport === "outcome" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={appointmentFilters.fromDate} onChange={(e) => updateFilter("fromDate", e.target.value)} />
                    <input type="date" className="neo-input" value={appointmentFilters.toDate} onChange={(e) => updateFilter("toDate", e.target.value)} />
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadOutcomes}>Apply</button>
              <ReportTable columns={["Outcome", "Appointments"]} rows={(outcomeReport.summary || []).map((r) => [r.outcome, r.count])} />
              <div style={{ marginTop: 8 }}>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
                <ReportTable
                  columns={["Date", "Slot", "Patient", "Doctor", "Outcome", "Procedure", "Status"]}
                  rows={(outcomeReport.rows || []).map((r) => [
                    formatDateCell(r.date),
                    r.slot,
                    r.patient,
                    r.doctor,
                    r.outcome,
                    r.procedure,
                    r.status,
                  ])}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InventorySection({
  subTab,
  setSubTab,
  filters,
  setFilters,
  lowStock,
  consumption,
  purchase,
  valuation,
  loading,
  error,
  onRefresh,
}) {
  const tabs = [
    { id: "low", label: "1) Low Stock" },
    { id: "consumption", label: "2) Stock Consumption" },
    { id: "purchase", label: "3) Purchase Summary" },
    { id: "valuation", label: "4) Valuation (Detailed)" },
  ];

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const hasData = (arr) => Array.isArray(arr) && arr.length > 0;

  return (
    <div className="neo-card">
      <div className="neo-card-header reports-section-header">
        <div>
          <strong>Inventory Reports</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
        </div>
        <div className="report-actions">
          <button className="btn sm" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>
      <div className="neo-card-body">
        <div className="reports-tabs" style={{ marginBottom: 10 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`btn sm${subTab === t.id ? " primary" : ""}`}
              onClick={() => setSubTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="alert error" style={{ marginBottom: 10 }}>{error}</div>}
        {subTab !== "valuation" && (
          <ReportFilters>
            <FilterBlock label="Date range">
              <div className="row-flex-wrap">
                <input
                  type="date"
                  className="neo-input"
                  value={filters.fromDate}
                  onChange={(e) => updateFilter("fromDate", e.target.value)}
                />
                <input
                  type="date"
                  className="neo-input"
                  value={filters.toDate}
                  onChange={(e) => updateFilter("toDate", e.target.value)}
                />
              </div>
            </FilterBlock>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="btn sm primary" onClick={onRefresh} disabled={loading}>
                Apply
              </button>
            </div>
          </ReportFilters>
        )}

        {subTab === "low" && (
          <ReportTable
            columns={["Item", "Qty", "Min", "Vendor"]}
            rows={
              hasData(lowStock)
                ? lowStock.map((i) => [
                    i.name,
                    i.currentQty ?? i.qty,
                    i.minStock ?? i.min,
                    i.vendor ?? i.vendorName ?? "-",
                  ])
                : []
            }
          />
        )}

        {subTab === "consumption" && (
          <ReportTable
            columns={["Item", "Category", "Qty (OUT)", "Value", "Entries"]}
            rows={
              hasData(consumption)
                ? consumption.map((r) => [
                    r.name,
                    r.category || "-",
                    r.qty ?? 0,
                    `Rs. ${currency(r.value)}`,
                    r.entries ?? 0,
                  ])
                : []
            }
          />
        )}

        {subTab === "purchase" && (
          <ReportTable
            columns={["Vendor", "Qty (IN)", "Value", "Items"]}
            rows={
              hasData(purchase)
                ? purchase.map((r) => [
                    r.vendor,
                    r.qty ?? 0,
                    `Rs. ${currency(r.value)}`,
                    Array.isArray(r.items) ? r.items.join(", ") : "",
                  ])
                : []
            }
          />
        )}

        {subTab === "valuation" && (
          <>
            <div style={{ marginBottom: 8 }}>
              Total value: Rs. {currency(valuation?.total || valuation?.totalValue || valuation?.total_value || 0)}
              {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
            </div>
            <ReportTable
              columns={["Item", "Category", "Qty", "Price", "Value", "Vendor"]}
              rows={
                hasData(valuation?.rows)
                  ? valuation.rows.map((r) => [
                      r.name,
                      r.category || "-",
                      r.currentQty ?? r.qty ?? 0,
                      `Rs. ${currency(r.price)}`,
                      `Rs. ${currency(r.value)}`,
                      r.vendor || r.vendorName || "-",
                    ])
                  : []
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
function PatientSection() {
  const [activePatientReport, setActivePatientReport] = useState("age");
  const [loading, setLoading] = useState(false);
  const [patientFilters, setPatientFilters] = useState({
    dateFrom: "",
    dateTo: "",
    ageGroup: "",
    doctor: "",
    gender: "",
    area: "",
    pin: "",
    referral: "",
    activeWindow: "12",
    lastVisitBefore: "",
    newExisting: "all",
    birthdayRange: "month",
    onlyActive: true,
    search: "",
    firstVisitFrom: "",
    firstVisitTo: "",
    lastVisitFrom: "",
    lastVisitTo: "",
    status: "all",
  });

  const [ageSummary, setAgeSummary] = useState([]);
  const [agePatients, setAgePatients] = useState([]);
  const [areaReport, setAreaReport] = useState({ summary: [], patients: [] });
  const [birthdayReport, setBirthdayReport] = useState({ patients: [] });
  const [genderReport, setGenderReport] = useState({ summary: [], patients: [] });
  const [activeReport, setActiveReport] = useState({ count: 0, patients: [] });
  const [inactiveReport, setInactiveReport] = useState({ count: 0, patients: [] });
  const [referralReport, setReferralReport] = useState({ summary: [], patients: [] });
  const [newPatientsReport, setNewPatientsReport] = useState({ count: 0, patients: [] });
  const [masterReport, setMasterReport] = useState({ patients: [] });

  const patientTabs = [
    { id: "age", label: "1) Age / Age Range" },
    { id: "area", label: "2) Area wise" },
    { id: "birthday", label: "3) Birthday wise" },
    { id: "gender", label: "4) Gender wise" },
    { id: "active", label: "5) Active patients" },
    { id: "inactive", label: "6) Inactive patients" },
    { id: "referral", label: "7) Referral wise" },
    { id: "new", label: "8) New patients" },
    { id: "master", label: "9) Patient master" },
  ];

  const updateFilter = (key, value) => setPatientFilters((prev) => ({ ...prev, [key]: value }));

  const fetchReport = async (endpoint, params, setter) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const url = `${API_BASE_URL}/reports/patients/${endpoint}${qs.toString() ? `?${qs.toString()}` : ""}`;
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setter(data);
    } catch (err) {
      console.error(`Error loading ${endpoint} report`, err);
    } finally {
      setLoading(false);
    }
  };

  const loadAge = () =>
    fetchReport(
      "age",
      {
        fromDate: patientFilters.dateFrom,
        toDate: patientFilters.dateTo,
        ageGroup: patientFilters.ageGroup,
        doctorId: patientFilters.doctor,
        gender: patientFilters.gender,
      },
      (data) => {
        setAgeSummary(data.summary || []);
        setAgePatients(data.patients || []);
      }
    );

  const loadArea = () =>
    fetchReport(
      "area",
      {
        fromDate: patientFilters.dateFrom,
        toDate: patientFilters.dateTo,
        area: patientFilters.area,
        doctorId: patientFilters.doctor,
        newExisting: patientFilters.newExisting,
      },
      setAreaReport
    );

  const loadBirthday = () =>
    fetchReport(
      "birthdays",
      {
        scope: patientFilters.birthdayRange || "month",
        date: patientFilters.dateFrom,
        ageRange: patientFilters.ageGroup,
        activeOnly: patientFilters.onlyActive,
      },
      setBirthdayReport
    );

  const loadGender = () =>
    fetchReport(
      "gender",
      {
        fromDate: patientFilters.dateFrom,
        toDate: patientFilters.dateTo,
        ageRange: patientFilters.ageGroup,
        area: patientFilters.area,
      },
      setGenderReport
    );

  const loadActive = () =>
    fetchReport(
      "active",
      {
        windowMonths: patientFilters.activeWindow,
        doctorId: patientFilters.doctor,
        area: patientFilters.area,
        ageRange: patientFilters.ageGroup,
        gender: patientFilters.gender,
      },
      setActiveReport
    );

  const loadInactive = () =>
    fetchReport(
      "inactive",
      {
        lastVisitBefore: patientFilters.lastVisitBefore || new Date().toISOString().slice(0, 10),
        doctorId: patientFilters.doctor,
        area: patientFilters.area,
        ageRange: patientFilters.ageGroup,
        gender: patientFilters.gender,
      },
      setInactiveReport
    );

  const loadReferral = () =>
    fetchReport(
      "referrals",
      {
        fromDate: patientFilters.dateFrom,
        toDate: patientFilters.dateTo,
        source: patientFilters.referral,
        newExisting: patientFilters.newExisting,
        doctorId: patientFilters.doctor,
      },
      setReferralReport
    );

  const loadNewPatients = () =>
    fetchReport(
      "new",
      {
        fromDate: patientFilters.dateFrom,
        toDate: patientFilters.dateTo,
        doctorId: patientFilters.doctor,
        referral: patientFilters.referral,
        area: patientFilters.area,
        gender: patientFilters.gender,
        ageRange: patientFilters.ageGroup,
      },
      setNewPatientsReport
    );

  const loadMaster = () =>
    fetchReport(
      "master",
      {
        search: patientFilters.search,
        ageRange: patientFilters.ageGroup,
        gender: patientFilters.gender,
        area: patientFilters.area,
        firstVisitFrom: patientFilters.firstVisitFrom,
        firstVisitTo: patientFilters.firstVisitTo,
        lastVisitFrom: patientFilters.lastVisitFrom,
        lastVisitTo: patientFilters.lastVisitTo,
        referral: patientFilters.referral,
        status: patientFilters.status,
      },
      setMasterReport
    );

  useEffect(() => {
    switch (activePatientReport) {
      case "age":
        loadAge();
        break;
      case "area":
        loadArea();
        break;
      case "birthday":
        loadBirthday();
        break;
      case "gender":
        loadGender();
        break;
      case "active":
        loadActive();
        break;
      case "inactive":
        loadInactive();
        break;
      case "referral":
        loadReferral();
        break;
      case "new":
        loadNewPatients();
        break;
      case "master":
        loadMaster();
        break;
      default:
        break;
    }
  }, [activePatientReport]);

  return (
    <div>
      <div className="reports-metrics-row">
        {ageSummary.map((p) => (
          <div className="neo-card metric-card" key={p.bracket}>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: "0.8rem", color: "#7b8899" }}>{p.bracket}</div>
              <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{p.count}</div>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="neo-card" style={{ marginBottom: 12 }}>
        <div className="neo-card-header">
          <strong>Section 1  Patient Reports (9)</strong>
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
        </div>
        <div className="neo-card-body">
          <div className="reports-tabs" style={{ marginBottom: 10 }}>
            {patientTabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn sm${activePatientReport === tab.id ? " primary" : ""}`}
                onClick={() => setActivePatientReport(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activePatientReport === "age" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range (first/last visit)">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                    <input type="date" className="neo-input" value={patientFilters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Age / Age group">
                  <select className="neo-input" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)}>
                    <option value="">All</option>
                    <option value="0-12">0-12</option>
                    <option value="13-19">13-19</option>
                    <option value="20-30">20-30</option>
                    <option value="31-45">31-45</option>
                    <option value="46-60">46-60</option>
                    <option value="60+">60+</option>
                  </select>
                </FilterBlock>
                <FilterBlock label="Doctor (optional)">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Gender (optional)">
                  <select className="neo-input" value={patientFilters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                    <option value="">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadAge}>Apply</button>
              <ReportTable
                columns={["Patient", "Age", "Gender", "City", "First Visit", "Last Visit", "Referral"]}
                rows={agePatients.map((r) => [
                  r.patient,
                  r.age,
                  r.gender,
                  r.city,
                  formatDateCell(r.firstVisit),
                  formatDateCell(r.lastVisit),
                  r.referredBy,
                ])}
              />
            </>
          )}

          {activePatientReport === "area" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                    <input type="date" className="neo-input" value={patientFilters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Area / City">
                  <input className="neo-input" placeholder="Area / city" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Doctor (optional)">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="New vs existing">
                  <select className="neo-input" value={patientFilters.newExisting} onChange={(e) => updateFilter("newExisting", e.target.value)}>
                    <option value="all">All</option>
                    <option value="new">New only</option>
                    <option value="existing">Existing only</option>
                  </select>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadArea}>Apply</button>
              <ReportTable
                columns={["Patient", "Area", "First Visit", "Last Visit", "Type"]}
                rows={(areaReport.patients || []).map((r) => [
                  r.patient,
                  r.area,
                  formatDateCell(r.firstVisit),
                  formatDateCell(r.lastVisit),
                  r.type,
                ])}
              />
            </>
          )}

          {activePatientReport === "birthday" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date scope">
                  <select className="neo-input" value={patientFilters.birthdayRange} onChange={(e) => updateFilter("birthdayRange", e.target.value)}>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="custom">Custom date</option>
                  </select>
                </FilterBlock>
                <FilterBlock label="Custom date (if chosen)">
                  <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Age range (optional)">
                  <input className="neo-input" placeholder="e.g., 20-40" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Active only">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={patientFilters.onlyActive} onChange={(e) => updateFilter("onlyActive", e.target.checked)} />
                  {loading && <span className="muted-small" style={{ marginLeft: 6 }}>...</span>}
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadBirthday}>Apply</button>
              <ReportTable
                columns={["Patient", "DOB", "Age", "Mobile"]}
                rows={(birthdayReport.patients || []).map((r) => [
                  r.patient,
                  formatDateCell(r.dob),
                  r.age,
                  r.mobile,
                ])}
              />
            </>
          )}

          {activePatientReport === "gender" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                    <input type="date" className="neo-input" value={patientFilters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Age range (optional)">
                  <input className="neo-input" placeholder="e.g., 20-40" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Area (optional)">
                  <input className="neo-input" placeholder="Area / city" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadGender}>Apply</button>
              <ReportTable columns={["Gender", "Patients"]} rows={(genderReport.summary || []).map((r) => [r.gender, r.count])} />
            </>
          )}

          {activePatientReport === "active" && (
            <>
              <ReportFilters>
                <FilterBlock label="Active window">
                  <select className="neo-input" value={patientFilters.activeWindow} onChange={(e) => updateFilter("activeWindow", e.target.value)}>
                    <option value="6">Last 6 months</option>
                    <option value="12">Last 12 months</option>
                    <option value="24">Last 24 months</option>
                  </select>
                </FilterBlock>
                <FilterBlock label="Doctor">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Area / Age / Gender">
                  <div className="row-flex-wrap">
                    <input className="neo-input" placeholder="Area" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                    <input className="neo-input" placeholder="Age range" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                    <select className="neo-input" value={patientFilters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadActive}>Apply</button>
              <ReportTable
                columns={["Patient", "Age", "Gender", "Last Visit", "City", "Referral"]}
                rows={(activeReport.patients || []).map((r) => [
                  r.patient,
                  r.age,
                  r.gender,
                  formatDateCell(r.lastVisit),
                  r.city,
                  r.referredBy,
                ])}
              />
            </>
          )}

          {activePatientReport === "inactive" && (
            <>
              <ReportFilters>
                <FilterBlock label="Last visit before">
                  <input type="date" className="neo-input" value={patientFilters.lastVisitBefore} onChange={(e) => updateFilter("lastVisitBefore", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Doctor">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Area / Age / Gender">
                  <div className="row-flex-wrap">
                    <input className="neo-input" placeholder="Area" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                    <input className="neo-input" placeholder="Age range" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                    <select className="neo-input" value={patientFilters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadInactive}>Apply</button>
              <ReportTable
                columns={["Patient", "Age", "Gender", "Last Visit", "City", "Referral"]}
                rows={(inactiveReport.patients || []).map((r) => [
                  r.patient,
                  r.age,
                  r.gender,
                  formatDateCell(r.lastVisit),
                  r.city,
                  r.referredBy,
                ])}
              />
            </>
          )}

          {activePatientReport === "referral" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                    <input type="date" className="neo-input" value={patientFilters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Referral source">
                  <input className="neo-input" placeholder="e.g., Google" value={patientFilters.referral} onChange={(e) => updateFilter("referral", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="New vs existing">
                  <select className="neo-input" value={patientFilters.newExisting} onChange={(e) => updateFilter("newExisting", e.target.value)}>
                    <option value="all">All</option>
                    <option value="new">New only</option>
                    <option value="existing">Existing only</option>
                  </select>
                </FilterBlock>
                <FilterBlock label="Doctor (optional)">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadReferral}>Apply</button>
              <ReportTable columns={["Referral Source", "Patients", "New Patients"]} rows={(referralReport.summary || []).map((r) => [r.source, r.patients, r.newPatients])} />
            </>
          )}

          {activePatientReport === "new" && (
            <>
              <ReportFilters>
                <FilterBlock label="Date range (first visit)">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" value={patientFilters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
                    <input type="date" className="neo-input" value={patientFilters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Doctor">
                  <input className="neo-input" placeholder="Any" value={patientFilters.doctor} onChange={(e) => updateFilter("doctor", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Referral source">
                  <input className="neo-input" placeholder="e.g., Google" value={patientFilters.referral} onChange={(e) => updateFilter("referral", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Area / Gender / Age">
                  <div className="row-flex-wrap">
                    <input className="neo-input" placeholder="Area" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                    <select className="neo-input" value={patientFilters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="neo-input" placeholder="Age" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                  </div>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadNewPatients}>Apply</button>
              <ReportTable
                columns={["Patient", "First Visit", "Referral", "City", "Gender", "Age"]}
                rows={(newPatientsReport.patients || []).map((r) => [
                  r.patient,
                  formatDateCell(r.firstVisit),
                  r.referredBy,
                  r.city,
                  r.gender,
                  r.age,
                ])}
              />
            </>
          )}

          {activePatientReport === "master" && (
            <>
              <ReportFilters>
                <FilterBlock label="Search name / mobile">
                  <input className="neo-input" placeholder="Search" value={patientFilters.search} onChange={(e) => updateFilter("search", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Age / Gender / Area">
                  <div className="row-flex-wrap">
                    <input className="neo-input" placeholder="Age or range" value={patientFilters.ageGroup} onChange={(e) => updateFilter("ageGroup", e.target.value)} />
                    <select className="neo-input" value={patientFilters.gender} onChange={(e) => updateFilter("gender", e.target.value)}>
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input className="neo-input" placeholder="Area" value={patientFilters.area} onChange={(e) => updateFilter("area", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="First & Last visit range">
                  <div className="row-flex-wrap">
                    <input type="date" className="neo-input" placeholder="First visit from" value={patientFilters.firstVisitFrom} onChange={(e) => updateFilter("firstVisitFrom", e.target.value)} />
                    <input type="date" className="neo-input" placeholder="First visit to" value={patientFilters.firstVisitTo} onChange={(e) => updateFilter("firstVisitTo", e.target.value)} />
                  </div>
                  <div className="row-flex-wrap" style={{ marginTop: 6 }}>
                    <input type="date" className="neo-input" placeholder="Last visit from" value={patientFilters.lastVisitFrom} onChange={(e) => updateFilter("lastVisitFrom", e.target.value)} />
                    <input type="date" className="neo-input" placeholder="Last visit to" value={patientFilters.lastVisitTo} onChange={(e) => updateFilter("lastVisitTo", e.target.value)} />
                  </div>
                </FilterBlock>
                <FilterBlock label="Referral source">
                  <input className="neo-input" placeholder="e.g., Google" value={patientFilters.referral} onChange={(e) => updateFilter("referral", e.target.value)} />
                </FilterBlock>
                <FilterBlock label="Status">
                  <select className="neo-input" value={patientFilters.status} onChange={(e) => updateFilter("status", e.target.value)}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FilterBlock>
              </ReportFilters>
              <button className="btn sm primary" onClick={loadMaster}>Apply</button>
              <ReportTable
                columns={["Patient", "Mobile", "Age", "Gender", "Area", "First Visit", "Last Visit", "Referral", "Status"]}
                rows={(masterReport.patients || []).map((r) => [
                  r.patient,
                  r.mobile,
                  r.age,
                  r.gender,
                  r.area,
                  formatDateCell(r.firstVisit),
                  formatDateCell(r.lastVisit),
                  r.referral,
                  r.status,
                ])}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function ReportFilters({ children }) {
  return (
    <div className="neo-card mb-3">
      <div className="neo-card-body row-gap">{children}</div>
    </div>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div className="filter-block" style={{ minWidth: 220 }}>
      <span className="filter-label">{label}</span>
      {children}
    </div>
  );
}

function ReportTable({ columns, rows }) {
  return (
    <div className="neo-card">
      <div className="neo-card-body table-wrap">
        <table className="neo-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, idx) => (
              <tr key={idx}>
                {r.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const colors = { Paid: "#22c55e", Partial: "#eab308", Pending: "#ef4444" };
  const bg = { Paid: "rgba(34,197,94,0.12)", Partial: "rgba(234,179,8,0.12)", Pending: "rgba(239,68,68,0.12)" };

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 600,
        color: colors[status] || "#4b587c",
        background: bg[status] || "rgba(0,0,0,0.06)",
      }}
    >
      {status}
    </span>
  );
}

