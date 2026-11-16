
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "../../lib/supabase";
import {
  Search,
  RefreshCw,
  Eye,
  Printer,
  Download,
  X,
  ClipboardList,
} from "lucide-react";

const statusOptions = ["pending", "confirmed", "completed"];

function formatDate(value) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const [ordersResult, itemsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("order_items")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setOrders(ordersResult.data || []);
      setOrderItems(itemsResult.data || []);

      setSelectedOrder((current) => {
        if (!current) return null;
        return (ordersResult.data || []).find(
          (order) => order.id === current.id
        ) || null;
      });
    } catch (err) {
      console.error("Order history loading error:", err);
      setError(err.message || "Unable to load order history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        String(order.customer_name || "").toLowerCase().includes(term) ||
        String(order.phone || "").toLowerCase().includes(term) ||
        String(order.bill_number || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        String(order.status || "pending").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const selectedItems = selectedOrder
    ? orderItems.filter((item) => item.order_id === selectedOrder.id)
    : [];

  async function updateStatus(order, status) {
    setUpdatingId(order.id);
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", order.id);

      if (updateError) throw updateError;

      setOrders((previous) =>
        previous.map((item) =>
          item.id === order.id ? { ...item, status } : item
        )
      );

      setSelectedOrder((previous) =>
        previous?.id === order.id
          ? { ...previous, status }
          : previous
      );

      setNotice(`Order status updated to ${status}.`);
    } catch (err) {
      console.error("Order status update error:", err);
      setError(err.message || "Unable to update order status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function createOrderPdf(order, items) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let y = 18;

    function addLine(label, value) {
      const text = `${label}: ${value || "—"}`;
      const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);

      if (y + lines.length * 6 > pageHeight - 20) {
        pdf.addPage();
        y = 18;
      }

      pdf.text(lines, margin, y);
      y += lines.length * 6 + 2;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(120, 87, 39);
    pdf.text("LAXMI NRUSINGHA CATTERS", pageWidth / 2, y, {
      align: "center",
    });

    y += 9;
    pdf.setFontSize(12);
    pdf.text("CATERING ORDER DETAILS", pageWidth / 2, y, {
      align: "center",
    });

    y += 12;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(45, 40, 32);

    addLine("Bill Number", order.bill_number);
    addLine("Customer", order.customer_name);
    addLine("Phone", order.phone);
    addLine("Event Date", formatDate(order.event_date));
    addLine("Event Time", order.event_time || "Not specified");
    addLine("Guests", order.guests);
    addLine("Address", order.address);
    addLine("Per Plate Price", money(order.per_plate_price));
    addLine("Advance Amount", money(order.advance_amount));
    addLine("Total Amount", money(order.final_amount));
    addLine("Status", order.status || "pending");

    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text("SELECTED DISHES", margin, y);
    y += 8;

    pdf.setFont("helvetica", "normal");

    if (!items.length) {
      pdf.text("No dish details found.", margin, y);
    } else {
      items.forEach((item, index) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = 18;
        }

        const line =
          `${index + 1}. ${item.item_name}  |  Qty: ${item.quantity}` +
          `  |  Price: ${money(item.unit_price)}`;

        const lines = pdf.splitTextToSize(
          line,
          pageWidth - margin * 2
        );

        pdf.text(lines, margin, y);
        y += lines.length * 6 + 2;
      });
    }

    return pdf;
  }

  function downloadOrder(order) {
    const items = orderItems.filter(
      (item) => item.order_id === order.id
    );

    const pdf = createOrderPdf(order, items);
    const fileName = `${order.bill_number || "Catering-Order"}.pdf`;
    pdf.save(fileName);
  }

  function printOrder(order) {
    const items = orderItems.filter(
      (item) => item.order_id === order.id
    );

    const pdf = createOrderPdf(order, items);
    const blobUrl = URL.createObjectURL(pdf.output("blob"));
    const printWindow = window.open(blobUrl, "_blank");

    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      alert("Please allow pop-ups to print the order.");
      return;
    }

    printWindow.addEventListener("load", () => {
      printWindow.print();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    });
  }

  return (
    <section className="admin-panel" style={{ marginTop: 24 }}>
      <div className="admin-panel-heading">
        <div>
          <span className="admin-section-label">CUSTOMER BOOKINGS</span>
          <h2>
            <ClipboardList
              size={22}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            Order History
          </h2>
          <p style={{ color: "#9a896b", marginTop: 6 }}>
            View and manage previously saved catering orders.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {notice && (
        <div className="admin-success" style={{ marginBottom: 14 }}>
          {notice}
        </div>
      )}

      {error && (
        <div className="admin-error" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) minmax(150px, 220px)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <label style={{ position: "relative" }}>
          <Search
            size={17}
            style={{
              position: "absolute",
              left: 12,
              top: 13,
              color: "#98743b",
            }}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, phone or bill number"
            style={{
              width: "100%",
              minHeight: 43,
              padding: "10px 12px 10px 38px",
              border: "1px solid #ded1b8",
              borderRadius: 9,
              font: "inherit",
            }}
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            minHeight: 43,
            padding: "10px",
            border: "1px solid #ded1b8",
            borderRadius: 9,
            background: "#fffefa",
            font: "inherit",
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <p className="admin-empty">Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="admin-empty">
          No orders found. Saved catering orders will appear here.
        </p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Customer</th>
                <th>Event Date</th>
                <th>Guests</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.bill_number || "—"}</strong>
                  </td>
                  <td>
                    <strong>{order.customer_name}</strong>
                    <br />
                    <small>{order.phone}</small>
                  </td>
                  <td>{formatDate(order.event_date)}</td>
                  <td>{order.guests}</td>
                  <td>{money(order.final_amount)}</td>
                  <td>
                    <select
                      value={String(order.status || "pending").toLowerCase()}
                      disabled={updatingId === order.id}
                      onChange={(event) =>
                        updateStatus(order, event.target.value)
                      }
                      style={{
                        padding: "7px",
                        border: "1px solid #ded1b8",
                        borderRadius: 7,
                        background: "#fffefa",
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      title="View order details"
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        border: "1px solid #e2d2b2",
                        background: "#fffaf0",
                        color: "#72562b",
                        borderRadius: 8,
                        padding: 8,
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(20, 16, 10, .62)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fffdf8",
              border: "1px solid #e5d5b5",
              borderRadius: 15,
              padding: 22,
              color: "#342b20",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <span className="admin-section-label">ORDER DETAILS</span>
                <h2 style={{ margin: "6px 0" }}>
                  {selectedOrder.bill_number || "Catering Order"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X size={21} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                margin: "18px 0",
              }}
            >
              {[
                ["Customer", selectedOrder.customer_name],
                ["Phone", selectedOrder.phone],
                ["Event Date", formatDate(selectedOrder.event_date)],
                ["Event Time", selectedOrder.event_time || "Not specified"],
                ["Guests", selectedOrder.guests],
                ["Address", selectedOrder.address || "Not provided"],
                ["Per Plate", money(selectedOrder.per_plate_price)],
                ["Advance", money(selectedOrder.advance_amount)],
                ["Total Amount", money(selectedOrder.final_amount)],
                ["Status", selectedOrder.status || "pending"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 12,
                    background: "#f8f2e6",
                    border: "1px solid #eadfc9",
                    borderRadius: 9,
                  }}
                >
                  <small style={{ color: "#8c682f", fontWeight: 700 }}>
                    {label}
                  </small>
                  <div style={{ marginTop: 5, overflowWrap: "anywhere" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ color: "#8c682f" }}>Selected Dishes</h3>

            {selectedItems.length ? (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.quantity}</td>
                        <td>{money(item.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No dish details were saved for this order.</p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="admin-primary-btn"
                onClick={() => downloadOrder(selectedOrder)}
              >
                <Download size={17} /> Download PDF
              </button>

              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => printOrder(selectedOrder)}
              >
                <Printer size={17} /> Print Order
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
