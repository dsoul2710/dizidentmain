// src/pages/BillingView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config";
import BillingInvoice from "../components/billing/BillingInvoice.jsx";
import PatientSelect from "../components/common/PatientSelect";
import { formatDateDMY } from "../utils/dateFormat";

const toCurrency = (n) =>
  `Rs. ${(Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BillingView({ currentUser }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");
  const [billDate, setBillDate] = useState(() => {
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    return today;
  });
  const [billNumber, setBillNumber] = useState("");
  const [billId, setBillId] = useState(null);
  const [totals, setTotals] = useState({ gross: 0, tax: 0, net: 0, paid: 0, pending: 0 });
  const [payments, setPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({ amount: "", method: "CASH", reference: "", notes: "" });
  const [invoiceData, setInvoiceData] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState("");

  // Load patients on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/patients`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]));
  }, []);

  // Load visits when patient changes
  useEffect(() => {
    if (!patientId) {
      setVisits([]);
      setVisitId("");
      setItems([]);
      return;
    }
    fetch(`${API_BASE}/api/patients/${patientId}/visits`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setVisits(Array.isArray(data) ? data : []))
      .catch(() => setVisits([]));
  }, [patientId]);

  // Load billable items when visit changes
  useEffect(() => {
    if (!visitId) {
      setItems([]);
      return;
    }
    const load = async () => {
      setLoadingItems(true);
      try {
        // 1) Try existing bill detail
        const billRes = await fetch(`${API_BASE}/api/billing/visits/${visitId}`);
        if (billRes.ok) {
          const data = await billRes.json();
          hydrateFromBillDetail(data);
          return; // when bill exists, do not fetch billable items
        }
        // 2) No bill yet: load billable items
        const data = await fetch(`${API_BASE}/api/billing/visits/${visitId}/items`).then((r) => r.ok ? r.json() : []);
        const mapped = Array.isArray(data)
          ? data.map((it) => ({
              treatmentItemId: it.treatmentItemId,
              description: it.description || "",
              qty: Number(it.quantity) || 1,
              rate: it.rate != null ? Number(it.rate) : "",
              gst: it.gstPercent != null ? Number(it.gstPercent) : 0,
            }))
          : [];
        setItems(mapped);
        setBillNumber(""); // auto on save
        setBillId(null);
        setTotals({ gross: 0, tax: 0, net: 0, paid: 0, pending: 0 });
        setPayments([]);
      } catch {
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };
    load();
  }, [visitId]);

  // Totals
  const subTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
        0
      ),
    [items]
  );

  const gstTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const base = (Number(item.qty) || 0) * (Number(item.rate) || 0);
        const gstAmt = (base * (Number(item.gst) || 0)) / 100;
        return sum + gstAmt;
      }, 0),
    [items]
  );

  const grandTotal = useMemo(() => subTotal + gstTotal, [subTotal, gstTotal]);

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "qty" || field === "rate" || field === "gst"
                  ? value === ""
                    ? ""
                    : Number(value)
                  : value,
            }
          : item
      )
    );
  };

  // Apply bill detail response to state
  const hydrateFromBillDetail = (data) => {
    setBillNumber(data.billNo || "");
    setBillId(data.id || null);
    const savedItems = Array.isArray(data.items)
      ? data.items.map((it) => ({
          treatmentItemId: it.treatmentItemId,
          description: it.description || "",
          qty: Number(it.quantity) || 1,
          rate: it.rate != null ? Number(it.rate) : "",
          gst: it.gstPercent != null ? Number(it.gstPercent) : 0,
          lineTotal: it.lineTotal,
        }))
      : [];
    setItems(savedItems);
    setTotals({
      gross: Number(data.grossAmount || 0),
      tax: Number(data.taxAmount || 0),
      net: Number(data.netAmount || 0),
      paid: Number(data.paidAmount || 0),
      pending: Number(data.pendingAmount || 0),
    });
    setPayments(Array.isArray(data.payments) ? data.payments : []);
    setShowInvoice(false);
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      { description: "", qty: 1, rate: "", gst: 0 },
    ]);
  };

  const handleDeleteRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBill = () => {
    setErrors("");
    if (!patientId) {
      setErrors("Please select a patient.");
      return;
    }
    if (!visitId) {
      setErrors("Please select a visit.");
      return;
    }
    if (!items.length) {
      setErrors("Please add at least one billing item.");
      return;
    }

    const payload = {
      patientUserId: Number(patientId),
      visitId: Number(visitId),
      billDate,
      createdByUserId: currentUser?.id ?? currentUser?.userId ?? null,
      items: items.map((it) => ({
        treatmentItemId: it.treatmentItemId || null,
        description: it.description,
        quantity: it.qty === "" ? 0 : Number(it.qty),
        rate: it.rate === "" ? 0 : Number(it.rate),
        gstPercent: Number(it.gst) || 0,
      })),
    };

    setSaving(true);
    fetch(`${API_BASE}/api/billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to save bill");
        }
        return res.json();
      })
      .then((data) => {
        setBillNumber(data.billNo || "");
        setBillId(data.id || null);
        // lock UI to saved items from backend
        hydrateFromBillDetail(data);
        alert("Bill saved successfully.");
      })
      .catch((err) => setErrors(err.message || "Failed to save bill"))
      .finally(() => setSaving(false));
  };

  const buildInvoiceData = () => {
    const patient = patients.find(
      (p) => String(p.userId || p.id) === String(patientId)
    ) || {};
    const visit = visits.find((v) => String(v.id) === String(visitId)) || {};

    const itemsForInvoice = items.map((it, idx) => {
      const base = (Number(it.qty) || 0) * (Number(it.rate) || 0);
      const gstAmt = (base * (Number(it.gst) || 0)) / 100;
      return {
        sr: idx + 1,
        description: it.description || "Procedure",
        qty: it.qty || 0,
        rate: Number(it.rate) || 0,
        amount: base + gstAmt,
      };
    });
    const invoice = {
      hospital: {
        name: "Clinic",
        tagline: "Billing Summary",
        address: "",
        contactLine: "",
        regNo: "",
        logo: "/images/logo.png",
      },
      formMeta: {
        title: "Bill / Tax Invoice",
        subtitle: "Visit Billing Summary",
      },
      billDetails: {
        billNo: billNumber || `BILL-${billId || ""}`,
        billDate: billDate,
        visitNo: visit.id ? `VIS-${visit.id}` : "",
        paymentMode: payments.length
          ? payments[payments.length - 1].method || "CASH"
          : "PENDING",
        gstin: "",
        pan: "",
      },
      patientDetails: {
        patientName: patient.name || "",
        uhid: patient.userId || patient.id || "",
        ageSex: patient.age != null
          ? `${patient.age} | ${patient.gender || ""}`
          : patient.gender || "",
        mobile: patient.mobile || "",
        consultant: visit.doctorName || "",
        department: "",
        admissionDate: "",
        dischargeDate: "",
      },
      items: itemsForInvoice,
      summary: {
        gross: totals.gross,
        discount: 0,
        taxPercent: 0,
        tax: totals.tax,
        roundOff: 0,
        netPayable,
        amountInWords: `Net payable: ${toCurrency(netPayable)} only`,
      },
      paymentInfo: {
        paid: totals.paid,
        pending: totals.pending,
        modeDetails: payments.length
          ? `${payments[payments.length - 1].method || ""} ${payments[payments.length - 1].referenceNo || ""}`
          : "",
      },
      footer: {
        note: "Computer generated invoice.",
        signLine: "Authorised Signatory",
      },
    };
    setInvoiceData(invoice);
    setShowInvoice(true);
    setTimeout(() => window.print(), 150);
  };

  return (
    <>
    <section id="view-billing" className="view show no-print">
      <div className="page-header">
        <div>
          <h2>Billing</h2>
          <div className="page-subtitle">Create bills, capture payments, and print invoices.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="form-grid">
        {/* Bill / patient header */}
        <div>
          <label>Bill Number</label>
          <input type="text" value={billNumber || "Auto"} readOnly />
        </div>

        <div>
          <label>Bill Date</label>
          <input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
          />
        </div>

        <div>
          <label>Patient</label>
          <PatientSelect
            patients={patients}
            selectedId={patientId}
            onChange={(value) => {
              setPatientId(value);
              setVisitId("");
            }}
          />
        </div>

        <div>
          <label>Visit</label>
          <select
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            disabled={!patientId}
          >
            <option value="">- Select Visit -</option>
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {formatDateDMY(v.visitDate)} {v.visitType ? `(${v.visitType})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="colspan" style={{ marginTop: "10px" }}>
          <div
            style={{
              background: "var(--greyLight-1)",
              borderRadius: "1.4rem",
              padding: "14px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#4b587c",
                }}
              >
                Bill Details
              </h3>
              <button
                type="button"
                className="btn sm"
                onClick={handleAddRow}
                disabled={!visitId}
              >
                + Add Item
              </button>
            </div>

            {/* Bill table */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "var(--greyLight-2)",
                  boxShadow: "var(--shadow)",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  fontSize: "0.9rem",
                }}
              >
                <thead
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--white)",
                    fontWeight: 600,
                  }}
                >
                  <tr>
                    <th style={{ padding: "10px 14px", textAlign: "left" }}>
                      Description
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>
                      Qty
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>
                      Rate
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>
                      GST %
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>
                      Amount
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems && (
                    <tr>
                      <td colSpan={6} style={{ padding: "10px 14px", textAlign: "center" }}>
                        Loading items...
                      </td>
                    </tr>
                  )}

                  {!loadingItems && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "10px 14px",
                          textAlign: "center",
                          color: "var(--greyDark)",
                          background: "var(--greyLight-1)",
                        }}
                      >
                          No items. Select a visit to load procedures.
                      </td>
                    </tr>
                  )}

                  {items.map((item, index) => {
                    const base =
                      (Number(item.qty) || 0) * (Number(item.rate) || 0);
                    const gstAmt =
                      (base * (Number(item.gst) || 0)) / 100;
                    const amount = base + gstAmt;

                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor:
                            index % 2 === 0
                              ? "var(--greyLight-1)"
                              : "var(--greyLight-2)",
                          borderBottom: "1px solid var(--greyLight-3)",
                        }}
                      >
                        <td style={{ padding: "8px 14px" }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Procedure / Service"
                          />
                        </td>
                        <td
                          style={{
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: "70px",
                          }}
                        >
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(index, "qty", e.target.value)
                            }
                            style={{ textAlign: "center" }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "8px 14px",
                            textAlign: "right",
                            minWidth: "90px",
                          }}
                        >
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(index, "rate", e.target.value)
                            }
                            style={{ textAlign: "right" }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: "80px",
                          }}
                        >
                          <select
                            value={item.gst}
                            onChange={(e) =>
                              handleItemChange(index, "gst", e.target.value)
                            }
                            style={{ textAlign: "center" }}
                          >
                            {[0, 5].map((g) => (
                              <option key={g} value={g}>
                                {g}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          style={{
                            padding: "8px 14px",
                            textAlign: "right",
                            minWidth: "110px",
                            fontWeight: 600,
                            color: "#4b587c",
                          }}
                        >
                          {amount.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "8px 14px",
                            textAlign: "center",
                            minWidth: "60px",
                          }}
                        >
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleDeleteRow(index)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr
                      style={{
                        background: "var(--greyLight-1)",
                        fontWeight: 600,
                      }}
                    >
                      <td
                        colSpan={2}
                        style={{ padding: "8px 14px", textAlign: "left" }}
                      >
                        Summary
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                          color: "#4b587c",
                        }}
                      >
                        Subtotal:
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                          color: "#4b587c",
                        }}
                      >
                        {subTotal.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                    <tr
                      style={{
                        background: "var(--greyLight-1)",
                        fontWeight: 600,
                      }}
                    >
                      <td colSpan={3} />
                      <td
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                          color: "#4b587c",
                        }}
                      >
                        GST:
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                          color: "#4b587c",
                        }}
                      >
                        {gstTotal.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                    <tr
                      style={{
                        background: "var(--greyLight-1)",
                        fontWeight: 700,
                      }}
                    >
                      <td colSpan={3} />
                      <td
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                        }}
                      >
                        Grand Total:
                      </td>
                      <td
                        style={{
                          padding: "8px 14px",
                          textAlign: "right",
                        }}
                      >
                        {grandTotal.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Actions row */}
        {errors && (
          <div className="colspan" style={{ color: "crimson" }}>
            {errors}
          </div>
        )}

        {billId && (
          <div className="colspan" style={{ marginTop: "8px" }}>
            <div
              style={{
                padding: "12px 14px",
                background: "#f6f8ff",
                borderRadius: 10,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "8px",
                alignItems: "stretch",
              }}
            >
              <div><strong>Gross</strong><div>Rs. {totals.gross.toFixed(2)}</div></div>
              <div><strong>Tax</strong><div>Rs. {totals.tax.toFixed(2)}</div></div>
              <div><strong>Net</strong><div>Rs. {totals.net.toFixed(2)}</div></div>
              <div><strong>Paid</strong><div style={{ color: "#0a7a3c" }}>Rs. {totals.paid.toFixed(2)}</div></div>
              <div><strong>Pending</strong><div style={{ color: "#b30000" }}>Rs. {totals.pending.toFixed(2)}</div></div>
            </div>
          </div>
        )}

        <div className="actions" style={{ marginTop: "12px", gap: "8px" }}>
          <button
            type="button"
            className="btn primary"
            onClick={handleSaveBill}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Bill"}
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              if (!billId) {
                setErrors("Save the bill before printing.");
                return;
              }
              buildInvoiceData();
            }}
          >
            Print
          </button>
        </div>

        {billId && (
          <div className="colspan" style={{ marginTop: "12px" }}>
            <div className="billing-header">
              <h3>Payments / Khatabook</h3>
              <button
                type="button"
                className="btn sm primary"
                onClick={() => {
                  if (!newPayment.amount) {
                    setErrors("Enter payment amount.");
                    return;
                  }
                  setErrors("");
                  fetch(
                    `${API_BASE}/api/billing/${billId}/payments?amount=${Number(
                      newPayment.amount
                    )}&method=${encodeURIComponent(
                      newPayment.method
                    )}&reference=${encodeURIComponent(
                      newPayment.reference || ""
                    )}&notes=${encodeURIComponent(newPayment.notes || "")}`,
                    { method: "POST" }
                  )
                    .then(async (res) => {
                      if (!res.ok) throw new Error(await res.text());
                      return res.json();
                    })
                    .then((data) => {
                      setPayments(Array.isArray(data.payments) ? data.payments : []);
                      setTotals({
                        gross: Number(data.grossAmount || 0),
                        tax: Number(data.taxAmount || 0),
                        net: Number(data.netAmount || 0),
                        paid: Number(data.paidAmount || 0),
                        pending: Number(data.pendingAmount || 0),
                      });
                      setNewPayment({ amount: "", method: "CASH", reference: "", notes: "" });
                    })
                    .catch((err) => setErrors(err.message || "Payment failed"));
                }}
              >
                Add Payment
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="number"
                placeholder="Amount"
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment((p) => ({ ...p, amount: e.target.value }))
                }
              />
              <select
                value={newPayment.method}
                onChange={(e) =>
                  setNewPayment((p) => ({ ...p, method: e.target.value }))
                }
              >
                {["CASH", "CARD", "UPI", "NEFT", "CHEQUE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Reference"
                value={newPayment.reference}
                onChange={(e) =>
                  setNewPayment((p) => ({ ...p, reference: e.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Notes"
                value={newPayment.notes}
                onChange={(e) =>
                  setNewPayment((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>

            {payments.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                    {payments.map((p) => (
                      <li key={p.id}>
                        {formatDateDMY(p.paymentDate) || p.paymentDate} - Rs. {p.amount} ({p.method}){" "}
                        {p.referenceNo ? `ref: ${p.referenceNo}` : ""}{" "}
                        {p.notes ? `- ${p.notes}` : ""}
                      </li>
                    ))}
                  </ul>
            )}
          </div>
        )}
        </div>
      </div>
    </section>
    {showInvoice && invoiceData && (
      <div className="print-surface">
        <BillingInvoice data={invoiceData} />
      </div>
    )}
    </>
  );
}





