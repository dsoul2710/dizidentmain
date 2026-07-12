import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/client";
import { formatDateDMY } from "@/shared/utils/dateFormat";
import SourceOrgBadge from "@/shared/components/attribution/SourceOrgBadge";

export default function DoctorOverview({ user, activeOrgId }) {
  const [loading, setLoading] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    todayCount: 0,
    completedCount: 0,
    patientsCount: 0,
    pendingCount: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgPerAppointment: 0,
  });

  const doctorId = user?.id ?? user?.userId ?? null;

  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const todayStr = fmt(today);

  const filteredToday = useMemo(() => {
    if (!doctorId) return todayAppointments;
    return (todayAppointments || []).filter(
      (a) => String(a.doctorUserId ?? "") === String(doctorId)
    );
  }, [todayAppointments, doctorId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [dayRes, patientsRes, billRes] = await Promise.all([
          api.get(`/appointments/day/${todayStr}`),
          api.get(`/patients`),
          api.get(`/bills`),
        ]);

        const dayData = dayRes.data || [];
        const patientsData = patientsRes.data || [];
        const billData = billRes.data || [];

        if (cancelled) return;

        const filteredDay = Array.isArray(dayData)
          ? dayData.filter((a) => String(a.doctorUserId ?? "") === String(doctorId))
          : [];

        const filteredBills = Array.isArray(billData)
          ? billData.filter((b) => String(b.doctorUserId ?? "") === String(doctorId))
          : [];

        const totalRevenue = filteredBills.reduce((sum, bill) => {
          return sum + (parseFloat(bill.totalAmount) || 0);
        }, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        const monthBills = filteredBills.filter((b) => {
          const billDate = new Date(b.createdDate || b.date);
          return billDate >= monthStart && billDate <= new Date();
        });
        const monthRevenue = monthBills.reduce((sum, bill) => {
          return sum + (parseFloat(bill.totalAmount) || 0);
        }, 0);

        const avgPerAppointment = filteredDay.length > 0 ? totalRevenue / filteredDay.length : 0;

        setTodayAppointments(filteredDay);

        const completedToday = filteredDay.filter(
          (a) => a.status?.toLowerCase() === "completed"
        ).length;
        const pendingToday = filteredDay.filter(
          (a) => {
            const s = a.status?.toLowerCase() || "";
            return s === "scheduled" || s === "booked" || !a.status;
          }
        ).length;

        setStats({
          todayCount: filteredDay.length,
          completedCount: completedToday,
          patientsCount: Array.isArray(patientsData) ? patientsData.length : 0,
          pendingCount: pendingToday,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          monthRevenue: Math.round(monthRevenue * 100) / 100,
          avgPerAppointment: Math.round(avgPerAppointment * 100) / 100,
        });
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load doctor overview", e);
          setError("Unable to load overview data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId, todayStr, activeOrgId]);

  const renderAppt = (appt, idx) => {
    const label = appt.patientName || "Patient";
    const dateLabel = appt.date ? formatDateDMY(appt.date) : "";
    const slot = appt.slot || "";
    const status = appt.status || "Scheduled";
    const statusLower = status.toLowerCase();
    const badgeColor = 
      statusLower === "completed" ? "success" : 
      statusLower === "cancelled" ? "danger" : 
      "warning";
    
    return (
      <div key={appt.id || idx} className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom">
        <div className="flex-grow-1 min-width-0">
          <p className="mb-0 text-dark text-xs fw-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </p>
          <p className="mb-0 text-xs text-secondary-light">
            {dateLabel}
            {slot && ` · ${slot}`}
          </p>
          {(appt.sourceType || appt.sourceOrgName) && (
            <div className="mt-1">
              <SourceOrgBadge sourceType={appt.sourceType} sourceOrgName={appt.sourceOrgName} />
            </div>
          )}
        </div>
        <span className={`badge bg-light-${badgeColor} text-${badgeColor} ms-2 flex-shrink-0 text-xs`}>
          {status}
        </span>
      </div>
    );
  };

  const StatCard = ({ icon, label, value, change, color }) => (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-secondary-light text-sm mb-2">{label}</p>
            <h3 className={`mb-0 fw-bold text-${color || "primary"}`}>{value}</h3>
            {change && (
              <p className={`text-sm mt-2 mb-0 ${change > 0 ? "text-success" : "text-danger"}`}>
                {change > 0 ? "+" : ""}{change}% vs last week
              </p>
            )}
          </div>
          <div className={`d-flex align-items-center justify-content-center w-50px h-50px rounded bg-light-${color || "primary"}`}>
            <i className={`ri-${icon} fs-4 text-${color || "primary"}`}></i>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="view show">
      <div className="row gy-4">
        {/* Statistics Cards */}
        <div className="col-12">
          <div className="row gy-3">
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="calendar-check-line"
                label="Today Appointments"
                value={stats.todayCount}
                color="primary"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="checkbox-circle-line"
                label="Completed Today"
                value={stats.completedCount}
                color="success"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="user-3-line"
                label="Total Patients"
                value={stats.patientsCount}
                color="info"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="hourglass-2-line"
                label="Pending Today"
                value={stats.pendingCount}
                color="warning"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="money-dollar-circle-line"
                label="Total Revenue"
                value={`₹${stats.totalRevenue.toLocaleString()}`}
                color="success"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="calendar-month-line"
                label="This Month"
                value={`₹${stats.monthRevenue.toLocaleString()}`}
                color="info"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="bar-chart-box-line"
                label="Avg per Appointment"
                value={`₹${stats.avgPerAppointment.toLocaleString()}`}
                color="primary"
              />
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="col-xxl-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header border-bottom bg-white py-3 px-4">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark text-sm">Today's Appointments</h6>
                <span className="badge bg-light-primary text-primary text-xs">{filteredToday.length} appointments</span>
              </div>
            </div>
            <div className="card-body p-4">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              {!loading && error && (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && filteredToday.length === 0 && (
                <div className="text-center py-5">
                  <i className="ri-calendar-blank-line fs-2 text-secondary-light mb-3 d-block"></i>
                  <p className="text-secondary-light">No appointments scheduled for today.</p>
                </div>
              )}
              {!loading && !error && filteredToday.length > 0 && (
                <div>
                  {filteredToday.map(renderAppt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats - Right Side */}
        <div className="col-xxl-6">
          <div className="row gy-3">
            {/* Appointment Distribution */}
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header border-bottom bg-white py-3 px-4">
                  <h6 className="mb-0 fw-bold text-dark text-sm">Appointment Status</h6>
                </div>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary-light d-flex align-items-center gap-2 text-xs">
                      <span className="w-10px h-10px rounded-circle bg-primary"></span>
                      Scheduled
                    </span>
                    <strong className="text-dark text-xs">{stats.pendingCount}</strong>
                  </div>
                  <div className="progress mb-4" style={{ height: "5px" }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${stats.todayCount > 0 ? (stats.pendingCount / stats.todayCount) * 100 : 0}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary-light d-flex align-items-center gap-2 text-xs">
                      <span className="w-10px h-10px rounded-circle bg-success"></span>
                      Completed
                    </span>
                    <strong className="text-dark text-xs">{stats.completedCount}</strong>
                  </div>
                  <div className="progress" style={{ height: "5px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${stats.todayCount > 0 ? (stats.completedCount / stats.todayCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
