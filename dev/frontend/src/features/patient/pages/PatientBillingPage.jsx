// src/pages/patient/PatientBillingPage.jsx
import React, { useMemo } from "react";
import "@/shared/components/print/print-common.css";
import { formatDateDMY } from "@/shared/utils/dateFormat";

const defaultHospital = {
  name: "DHWANI MULTISPECIALITY HOSPITAL",
  tagline: "COMPASSION | PRECISION | TRUST",
  address: "31 SHYAM INDUSTRIAL PARK, MORAIYA GAM ROAD, AHMEDABAD, GUJARAT 382213",
  contactLine: "Phone: +91-98XXXXXXX0 | Email: info@dhwanihospital.in",
  regNo: "Reg. No: DHN/2025/0123",
  logo: "/images/logo.png",
};

const defaultMeta = {
  title: "Hospital Bill / Tax Invoice",
  subtitle: "OPD / IPD Billing Summary",
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "Rs. 0.00";
  return `Rs. ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fallbackValue = (text) => (text === 0 || text ? text : "-");

export default function PatientBillingPage({ patient, visits = [], billingByVisit = {}, billingLoading }) {
  const handlePrint = () => window.print();
  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Hospital Bill", url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard.");
      } else {
        alert(shareUrl);
      }
    } catch (err) {
      console.error("Share failed", err);
      alert("Unable to share. Please copy the link manually.");
    }
  };

  const hospital = useMemo(() => {
    const anyBill = Object.values(billingByVisit || {}).find(Boolean);
    return anyBill?.hospital || defaultHospital;
  }, [billingByVisit]);

  const visitSummaries = useMemo(() => {
    return visits.map((v) => {
      const vid = String(v.id);
      const bill = billingByVisit?.[vid] || null;
      const summary = bill?.summary || {};
      const payment = bill?.paymentInfo || {};
      const items = Array.isArray(bill?.items)
        ? bill.items
        : Array.isArray(bill?.charges)
        ? bill.charges
        : [];

      const gross = Number(summary.grossAmount ?? bill?.grossAmount ?? 0) || 0;
      const discount = Number(summary.discount ?? bill?.discount ?? 0) || 0;
      const tax = Number(summary.taxAmount ?? bill?.taxAmount ?? 0) || 0;
      const net = Number(summary.netPayable ?? bill?.netAmount ?? bill?.netPayable ?? bill?.totalAmount ?? 0) || 0;
      const received = Number(
        payment.receivedAmount ??
          bill?.paidAmount ??
          bill?.totalPaid ??
          0
      ) || 0;
      const balance = Number(
        payment.balanceAmount ??
          bill?.pendingAmount ??
          bill?.balanceAmount ??
          net - received
      ) || 0;
      const hasBill =
        Boolean(bill) &&
        Boolean(bill.id || bill.billNo || items.length || gross || net);

      return {
        vid,
        visit: v,
        bill,
        payments: Array.isArray(bill?.payments) ? bill.payments : [],
        items,
        gross,
        discount,
        tax,
        net,
        received,
        balance,
        hasBill,
        amountInWords: summary.amountInWords || bill?.amountInWords || "",
        billNo: bill?.billDetails?.billNo || bill?.billNo || "",
        billDate: formatDateDMY(
          bill?.billDetails?.billDate || bill?.billDate || v.visitDate || v.visit_date
        ),
        paymentMode: bill?.billDetails?.paymentMode || bill?.paymentMode || bill?.paymentInfo?.mode || "",
        visitMeta: [
          formatDateDMY(v.visitDate || v.visit_date),
          v.visitType,
          v.status,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    });
  }, [billingByVisit, visits]);

  const billedSummaries = useMemo(
    () => visitSummaries.filter((v) => v.hasBill),
    [visitSummaries]
  );

  const hasBills = billedSummaries.length > 0;

  const grandTotals = useMemo(() => {
    return billedSummaries.reduce(
      (acc, v) => {
        acc.gross += v.gross;
        acc.discount += v.discount;
        acc.tax += v.tax;
        acc.net += v.net;
        acc.received += v.received;
        acc.balance += v.balance;
        return acc;
      },
      { gross: 0, discount: 0, tax: 0, net: 0, received: 0, balance: 0 }
    );
  }, [billedSummaries]);

  return (
    <section className="view show">
      <style>
        {`
        @media print {
          body { background: #ffffff; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ed-page, .ed-page * { visibility: visible !important; }
          @page { size: A4; margin: 8mm; }
          .sidebar, .topbar, .quick-actions, .sidebar-backdrop, .no-print { display: none !important; }
          .main { padding: 0 !important; margin: 0 !important; }
          .ed-wrapper { padding: 0 !important; background: #ffffff; }
          .ed-page { box-shadow: none; width: 180mm; margin: 0 auto; padding: 10mm 10mm 6mm; background: #ffffff; }
          .view { display: block !important; }
          .ed-section { margin: 0 0 8px 0; padding: 4px 0; }
          .ed-section-header { margin-bottom: 4px; }
          .visit-card { page-break-inside: avoid; margin: 6px 0 10px; padding: 10px; }
          .bill-table th, .bill-table td { padding: 6px 6px; }
        }
        @media (max-width: 768px) {
          .ed-wrapper { padding: 8px; }
          .ed-page { width: 100%; padding: 12px; border-radius: 10px; }
          .ed-header { grid-template-columns: 1fr; gap: 10px; text-align: left; }
          .ed-logo-wrap { margin: 0 auto 8px; width: 64px; height: 64px; }
          .ed-title-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .ed-section-header { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
          .ed-header-main { align-items: center; text-align: center; }
          .ed-hospital-name { font-size: 14px; letter-spacing: 0.02em; white-space: normal; line-height: 1.3; word-break: break-word; }
          .ed-tagline { font-size: 9px; letter-spacing: 0.12em; white-space: normal; line-height: 1.3; }
          .ed-contact { word-break: break-word; line-height: 1.35; }
          .ed-section-title,
          .ed-subtitle { white-space: normal; word-break: break-word; }
          .ed-section-subtitle { white-space: normal; word-break: break-word; }
          .ed-value,
          .ed-multiline { overflow-wrap: anywhere; word-break: break-word; }
          .ed-grid, .ed-grid.ed-grid-2 { grid-template-columns: 1fr !important; }
          .bill-summary-grid { grid-template-columns: 1fr !important; }
          .bill-summary-right { border-left: none; padding-left: 0; }
          .visit-card { padding: 12px; }
        }
        .visit-card {
          border: 1px solid #dce1f0;
          border-radius: 10px;
          background: #ffffff;
          padding: 12px 14px;
          margin: 10px 0;
          box-shadow: 0 6px 16px rgba(14, 61, 183, 0.04);
        }
        .bill-table {
          width: 100%;
          border-collapse: collapse;
        }
        .bill-table th, .bill-table td {
          border: 1px solid #e4e8f5;
          padding: 8px 10px;
          font-size: 13px;
          text-align: left;
        }
        .bill-summary-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 10px;
        }
        .bill-summary-right {
          border-left: 1px solid #e4e8f5;
          padding-left: 12px;
        }
        .bill-summary-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          font-size: 13px;
        }
        .bill-summary-total {
          font-weight: 700;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }
        @media (max-width: 768px) {
          .ed-wrapper .no-print {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            flex-wrap: nowrap;
            justify-content: space-between;
            padding: 6px 8px;
            background: #e9f0ff;
            border-radius: 12px;
            width: 100%;
            box-sizing: border-box;
          }
          .ed-wrapper .no-print .ed-print-btn {
            flex: 1 1 0;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            min-width: 0;
            box-shadow: none;
            white-space: nowrap;
          }
          .ed-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          .ed-title-left h2 {
            font-size: 1.05rem;
          }
          .visit-card .ed-section-title {
            display: block;
            width: 100%;
            font-size: 12.5px;
            line-height: 1.35;
          }
          .visit-card .stat-grid .ed-label {
            font-size: 9.5px;
          }
          .visit-card .stat-grid .text-main {
            font-size: 12px;
          }
          .visit-card .stat-grid {
            gap: 6px 10px;
            padding: 0 6px;
          }
          .visit-card .stat-grid > div {
            padding: 0;
          }
          .visit-card {
            overflow: hidden;
            border: none;
            border-radius: 0;
            box-shadow: none;
            background: transparent;
            padding: 0;
          }
          .visit-card .stat-grid,
          .visit-card .bill-table {
            box-shadow: none;
          }
          .visit-card .bill-table,
          .visit-card .bill-table th,
          .visit-card .bill-table td {
            border-radius: 0;
            border-left: none;
            border-right: none;
          }
          .visit-card .stat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            min-width: 0;
          }
          .visit-card .ed-section-header {
            min-width: 0;
          }
          .bill-table {
            border: none;
            border-radius: 0;
            background: transparent;
          }
          .bill-table {
            min-width: 0;
            table-layout: fixed;
          }
          .bill-table th,
          .bill-table td {
            white-space: normal;
            font-size: 11px;
          }
          .bill-table th:nth-child(1),
          .bill-table td:nth-child(1) {
            width: 36px;
          }
          .bill-table th:nth-child(3),
          .bill-table td:nth-child(3) {
            width: 44px;
          }
          .bill-table th:nth-child(4),
          .bill-table td:nth-child(4) {
            width: 70px;
          }
          .bill-table th:nth-child(5),
          .bill-table td:nth-child(5) {
            width: 78px;
          }
          .bill-table {
            font-size: 12px;
          }
          .bill-table thead tr {
            background: linear-gradient(90deg, var(--primary-blue), var(--accent-blue));
            color: #ffffff;
          }
          .bill-table th,
          .bill-table td {
            padding: 6px 6px;
          }
        }
        `}
      </style>

      <div className="ed-wrapper">
        <div style={{ display: "flex", gap: 8 }} className="no-print">
          <button type="button" className="ed-print-btn" onClick={handlePrint}>
            Print / Save as PDF
          </button>
          <button type="button" className="ed-print-btn" onClick={handleShare}>
            Share
          </button>
        </div>

        <div className="ed-page">
          <div className="ed-top-bar" />

          <header className="ed-header">
            <div className="ed-logo-wrap">
              {hospital.logo ? <img src={hospital.logo} alt={hospital.name} className="ed-logo-img" /> : <div className="ed-logo-img" />}
            </div>
            <div className="ed-header-main">
              <h1 className="ed-hospital-name">{hospital.name}</h1>
              <p className="ed-tagline">{hospital.tagline}</p>
              <p className="ed-contact">{hospital.address}</p>
              <p className="ed-contact">
                {hospital.contactLine} | {hospital.regNo}
              </p>
            </div>
          </header>

          <div className="ed-title-row">
            <div className="ed-title-left">
              <h2>{defaultMeta.title}</h2>
            </div>
            <div className="ed-title-right">
              <span className="ed-subtitle">{defaultMeta.subtitle}</span>
            </div>
          </div>

          <div className="ed-divider" />

          {billingLoading && (
            <div className="muted-small" style={{ marginTop: 8 }}>
              Loading billing...
            </div>
          )}

          {!billingLoading && !hasBills && (
            <section className="ed-section">
              <div className="ed-section-header">
                <span className="ed-section-title">Billing</span>
              </div>
              <div className="ed-section-body">
                <p className="ed-multiline">No bills created yet for this patient.</p>
              </div>
            </section>
          )}

          {!billingLoading && hasBills && (
            <>
          <section className="ed-section">
            <div className="ed-section-header">
              <span className="ed-section-title">Bill Details</span>
            </div>
            <div className="ed-section-body">
              <div className="ed-grid ed-grid-2">
                <div className="ed-field">
                  <span className="ed-label">Total Visits</span>
                  <span className="ed-value">{billedSummaries.length || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Payment Mode</span>
                  <span className="ed-value">
                    {billedSummaries[0]?.paymentMode || billedSummaries[0]?.bill?.paymentMethod || "-"}
                  </span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Latest Bill Date</span>
                  <span className="ed-value">
                    {formatDateDMY(billedSummaries[0]?.billDate) || "-"}
                  </span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Invoice Range</span>
                  <span className="ed-value">
                    {billedSummaries[0]?.billNo || "-"} {billedSummaries.length > 1 ? "... multiple" : ""}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="ed-section">
            <div className="ed-section-header">
              <span className="ed-section-title">Patient Details</span>
            </div>
            <div className="ed-section-body">
              <div className="ed-grid ed-grid-2">
                <div className="ed-field">
                  <span className="ed-label">Patient Name</span>
                  <span className="ed-value">{patient?.name || patient?.fullName || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">UHID / Patient ID</span>
                  <span className="ed-value">{patient?.userId || patient?.id || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Age / Sex</span>
                  <span className="ed-value">
                    {patient?.age ? `${patient.age}` : "-"} | {patient?.gender || "-"}
                  </span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Consultant</span>
                  <span className="ed-value">{patient?.doctor || patient?.consultant || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Department</span>
                  <span className="ed-value">{patient?.department || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Contact</span>
                  <span className="ed-value">{patient?.mobile || patient?.phone || "-"}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="ed-title-row" style={{ marginTop: 6, marginBottom: 6 }}>
            <div className="ed-title-left">
              <h2>Visit Charges</h2>
            </div>
            <div className="ed-title-right">
              <span className="ed-subtitle">{billedSummaries.length ? `${billedSummaries.length} visit(s)` : "No bills yet"}</span>
            </div>
          </div>

          {billedSummaries.map((vb) => (
            <div className="visit-card" key={vb.vid}>
              <div className="ed-section-header" style={{ marginBottom: 6 }}>
                <span className="ed-section-title">
                  {vb.visitMeta ? `Visit #${vb.vid} - ${vb.visitMeta}` : `Visit #${vb.vid}`}
                </span>
              </div>

              <div className="stat-grid" style={{ marginBottom: 8 }}>
                <div>
                  <div className="ed-label">Bill No.</div>
                  <div className="text-main">{fallbackValue(vb.billNo)}</div>
                </div>
                <div>
                  <div className="ed-label">Bill Date</div>
                  <div className="text-main">
                    {fallbackValue(formatDateDMY(vb.billDate) || vb.billDate)}
                  </div>
                </div>
                <div>
                  <div className="ed-label">Payment Mode</div>
                  <div className="text-main">{fallbackValue(vb.paymentMode)}</div>
                </div>
              </div>

              <div className="ed-section-body" style={{ paddingTop: 4 }}>
                <table className="bill-table">
                  <thead>
                    <tr>
                      <th>Sr</th>
                      <th>Particulars</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vb.items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }} className="muted-small">
                          No items found for this visit.
                        </td>
                      </tr>
                    )}
                    {vb.items.map((item, idx) => {
                      const qty = item.qty ?? item.quantity ?? 1;
                      const rate = item.rate ?? item.price ?? item.unitPrice ?? "";
                      const amount =
                        item.amount ??
                        item.lineTotal ??
                        item.total ??
                        item.net ??
                        (rate && qty ? Number(rate) * Number(qty) : "") ??
                        "";
                      return (
                        <tr key={item.sr || item.id || idx}>
                          <td data-label="Sr">{item.sr || idx + 1}</td>
                          <td data-label="Particulars">{item.description || item.name || item.title || "-"}</td>
                          <td data-label="Qty">{fallbackValue(qty)}</td>
                          <td data-label="Rate">{rate === "" ? "-" : formatCurrency(rate)}</td>
                          <td data-label="Amount">{amount === "" ? "-" : formatCurrency(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ed-section-body" style={{ marginTop: 8 }}>
                <div className="bill-summary-left">
                  <div className="ed-field">
                    <span className="ed-label">Amount in Words</span>
                    <p className="ed-multiline">{vb.amountInWords || "-"}</p>
                  </div>
                  <div className="ed-field" style={{ marginTop: 8 }}>
                    <span className="ed-label">Payments</span>
                    {vb.payments.length === 0 ? (
                      <p className="ed-multiline">No payments recorded.</p>
                    ) : (
                      <table className="bill-table" style={{ marginTop: 6 }}>
                        <thead>
                          <tr>
                            <th>Sr</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vb.payments.map((pay, idx) => (
                            <tr key={pay.id || idx}>
                              <td data-label="Sr">{idx + 1}</td>
                              <td data-label="Amount">{formatCurrency(pay.amount)}</td>
                              <td data-label="Mode">{pay.method || pay.mode || "-"}</td>
                              <td data-label="Date">{formatDateDMY(pay.paymentDate || pay.date) || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <section className="ed-section">
            <div className="ed-section-header">
              <span className="ed-section-title">Grand Total (All Visits)</span>
            </div>
            <div className="ed-section-body bill-summary-grid">
              <div className="bill-summary-left">
                <div className="ed-field">
                  <span className="ed-label">Visits Covered</span>
                  <span className="ed-value">{billedSummaries.length || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Payment Status</span>
                  <span className="ed-value">{grandTotals.balance > 0 ? "PARTIAL" : "PAID"}</span>
                </div>
              </div>
              <div className="bill-summary-right">
                <div className="bill-summary-row">
                  <span className="bill-summary-label">Gross Amount</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.gross)}</span>
                </div>
                <div className="bill-summary-row">
                  <span className="bill-summary-label">Discount</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.discount)}</span>
                </div>
                <div className="bill-summary-row">
                  <span className="bill-summary-label">Tax</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.tax)}</span>
                </div>
                <div className="bill-summary-row bill-summary-total">
                  <span className="bill-summary-label">Net Payable</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.net)}</span>
                </div>
                <div className="bill-summary-row">
                  <span className="bill-summary-label">Amount Received</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.received)}</span>
                </div>
                <div className="bill-summary-row">
                  <span className="bill-summary-label">Balance Amount</span>
                  <span className="bill-summary-value">{formatCurrency(grandTotals.balance)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="ed-section">
            <div className="ed-section-header">
              <span className="ed-section-title">Authorisation</span>
            </div>
            <div className="ed-section-body">
              <p className="ed-multiline">This is a computer generated invoice and does not require a physical signature.</p>
              <div className="ed-sign-block">
                <div className="ed-sign-line" />
                <div className="ed-sign-text">Authorised Signatory</div>
              </div>
            </div>
          </section>
          </>
          )}

          <div className="ed-bottom-bar" />
        </div>
      </div>
    </section>
  );
}
