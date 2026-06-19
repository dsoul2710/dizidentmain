import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function SuperAdminOverview() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/organizations")
      .then((res) => {
        const list = res.data || [];
        const active = list.filter((o) => o.isActive).length;
        setStats({
          total: list.length,
          active,
          inactive: list.length - active,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <h4 className="mb-4 fw-bold">Platform Overview</h4>
      {loading ? (
        <div className="text-secondary">Loading metrics...</div>
      ) : (
        <div className="row gy-4">
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.total}</h6>
                  <span className="text-secondary-light text-sm">Total Organizations</span>
                </div>
                <span className="w-48-px h-48-px bg-primary-100 text-primary-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-government-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.active}</h6>
                  <span className="text-secondary-light text-sm">Active Clinics</span>
                </div>
                <span className="w-48-px h-48-px bg-success-100 text-success-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-checkbox-circle-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.inactive}</h6>
                  <span className="text-secondary-light text-sm">Suspended Clinics</span>
                </div>
                <span className="w-48-px h-48-px bg-danger-100 text-danger-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-close-circle-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
