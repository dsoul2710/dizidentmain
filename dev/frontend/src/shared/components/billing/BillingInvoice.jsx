// Printable billing invoice (adapted from /billing preview app)
import React from "react";
import { formatDateDMY } from "@/shared/utils/dateFormat";
import "../print/print-common.css";

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return "₹ 0.00";
  return `₹ ${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function BillingInvoice({ data }) {
  if (!data) return null;
  const d = data;
  const totals = d.summary || {};
  const payment = d.paymentInfo || {};

  return (
    <div className="ed-wrapper">
      <button
        className="ed-print-btn no-print"
        onClick={() => window.print()}
      >
        Print / Save as PDF
      </button>

      <div className="ed-page">
        <div className="ed-top-bar" />

        <header className="ed-header">
          <div className="ed-logo-wrap">
            {d.hospital.logo ? (
              <img
                src={d.hospital.logo}
                alt={d.hospital.name}
                className="ed-logo-img"
              />
            ) : (
              <div className="ed-logo-img" />
            )}
          </div>
          <div className="ed-header-main">
            <h1 className="ed-hospital-name">{d.hospital.name}</h1>
            <p className="ed-tagline">{d.hospital.tagline}</p>
            <p className="ed-contact">{d.hospital.address}</p>
            <p className="ed-contact">
              {d.hospital.contactLine} • {d.hospital.regNo}
            </p>
          </div>
        </header>

        <div className="ed-title-row">
          <div className="ed-title-left">
            <h2>{d.formMeta.title}</h2>
          </div>
          <div className="ed-title-right">
            <span className="ed-subtitle">{d.formMeta.subtitle}</span>
          </div>
        </div>

        <div className="ed-divider" />

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Bill Details</span>
          </div>
          <div className="ed-section-body">
            <div className="ed-grid ed-grid-2">
              <div className="ed-field">
                <span className="ed-label">Bill No.</span>
                <span className="ed-value">{d.billDetails.billNo}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Bill Date</span>
                <span className="ed-value">
                  {formatDateDMY(d.billDetails.billDate) || d.billDetails.billDate}
                </span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Visit</span>
                <span className="ed-value">{d.billDetails.visitNo}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Payment Mode</span>
                <span className="ed-value">{d.billDetails.paymentMode}</span>
              </div>
              {d.billDetails.gstin && (
                <div className="ed-field">
                  <span className="ed-label">GSTIN</span>
                  <span className="ed-value">{d.billDetails.gstin}</span>
                </div>
              )}
              {d.billDetails.pan && (
                <div className="ed-field">
                  <span className="ed-label">PAN</span>
                  <span className="ed-value">{d.billDetails.pan}</span>
                </div>
              )}
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
                <span className="ed-value">{d.patientDetails.patientName}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Patient ID</span>
                <span className="ed-value">{d.patientDetails.uhid}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Age / Gender</span>
                <span className="ed-value">{d.patientDetails.ageSex}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Mobile</span>
                <span className="ed-value">{d.patientDetails.mobile}</span>
              </div>
              {d.patientDetails.consultant && (
                <div className="ed-field">
                  <span className="ed-label">Consultant</span>
                  <span className="ed-value">{d.patientDetails.consultant}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Charges Summary</span>
          </div>
          <div className="ed-section-body">
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
                {(d.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.sr || idx + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>{formatCurrency(item.rate)}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Bill Summary</span>
          </div>
          <div className="ed-section-body bill-summary-grid">
            <div className="bill-summary-left">
              <div className="ed-field">
                <span className="ed-label">Amount in Words</span>
                <p className="ed-multiline">
                  {totals.amountInWords || ""}
                </p>
              </div>
              <div className="ed-field">
                <span className="ed-label">Payment Status</span>
                <span className="ed-value">
                  {payment.paymentStatus || ""}
                </span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Payment Reference</span>
                <span className="ed-value">
                  {payment.modeDetails || ""}
                </span>
              </div>
            </div>

            <div className="bill-summary-right">
              <div className="bill-summary-row">
                <span className="bill-summary-label">Gross Amount</span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.grossAmount)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">Discount</span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.discount)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">Taxable Amount</span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.taxableAmount)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">
                  GST @ {totals.taxPercent || 0}%
                </span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.taxAmount)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">Round Off</span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.roundOff)}
                </span>
              </div>
              <div className="bill-summary-row bill-summary-total">
                <span className="bill-summary-label">Net Payable</span>
                <span className="bill-summary-value">
                  {formatCurrency(totals.netPayable)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">Amount Received</span>
                <span className="bill-summary-value">
                  {formatCurrency(payment.receivedAmount)}
                </span>
              </div>
              <div className="bill-summary-row">
                <span className="bill-summary-label">Balance Amount</span>
                <span className="bill-summary-value">
                  {formatCurrency(payment.balanceAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Authorisation</span>
          </div>
          <div className="ed-section-body">
            <p className="ed-multiline">
              {d.footer.note}
            </p>
            <div className="ed-sign-block">
              <div className="ed-sign-line" />
              <div className="ed-sign-text">{d.footer.signLine}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
