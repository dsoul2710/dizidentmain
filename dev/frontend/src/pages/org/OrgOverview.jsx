import React from "react";
import { formatDateDMY } from "../../utils/dateFormat";

export default function OrgOverview({
  overviewMetrics,
  formatValue,
  scheduleToday,
  recentActivity,
  loading,
}) {
  return (
    <section className="view show">
      <div className="row gy-4">
        {overviewMetrics.map((metric) => (
          <div className="col-xxl-3 col-sm-6" key={metric.key}>
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">
                    {formatValue(metric.value)}{" "}
                    <span className="text-secondary-light text-sm">
                      {metric.suffix}
                    </span>
                  </h6>
                  <span className="text-secondary-light text-sm">
                    {metric.label}
                  </span>
                </div>
                <span
                  className={`w-48-px h-48-px ${metric.tone} flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle`}
                >
                  <i className={`${metric.icon} text-xl`}></i>
                </span>
              </div>
              <div className="progress mt-3" style={{ height: 6 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${metric.percent}%` }}
                  role="progressbar"
                  aria-valuenow={metric.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          </div>
        ))}

        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Schedule for Today</h6>
            </div>
            <div className="card-body">
              {loading && (
                <div className="text-secondary-light">Loading schedule...</div>
              )}
              {!loading && (!scheduleToday || scheduleToday.length === 0) && (
                <div className="text-secondary-light">No schedule loaded.</div>
              )}
              {!loading && scheduleToday?.length > 0 && (
                <div className="d-flex flex-column gap-2">
                  {scheduleToday.slice(0, 6).map((appt) => (
                    <div key={appt.id} className="d-flex justify-content-between gap-2">
                      <div className="text-secondary-light">
                        {appt.patientName || "Patient"}
                      </div>
                      <div className="text-secondary-light">
                        {appt.slot || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Recent Activity</h6>
            </div>
            <div className="card-body">
              {loading && (
                <div className="text-secondary-light">Loading activity...</div>
              )}
              {!loading && (!recentActivity || recentActivity.length === 0) && (
                <div className="text-secondary-light">No recent activity.</div>
              )}
              {!loading && recentActivity?.length > 0 && (
                <ul className="mb-0 text-secondary-light">
                  {recentActivity.map((appt) => {
                    const activityDate =
                      formatDateDMY(appt.dateKey || appt.date) ||
                      appt.dateKey ||
                      appt.date ||
                      "date";
                    return (
                      <li key={`act-${appt.id}`}>
                        {appt.patientName || "Patient"} - {activityDate}{" "}
                        {appt.slot ? `@ ${appt.slot}` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
