
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabase";

import {
  ArrowLeft,
  Printer,
  Trash2,
  Plus,
  Minus,
  Receipt,
  MessageCircle,
  Share2,
  Sparkles,
  CalendarDays,
  Users,
  Phone,
  MapPin,
  UserRound,
  Download,
  Clock,
  Wallet,
  Utensils,
} from "lucide-react";

function Checkout() {
  const [savingOrder, setSavingOrder] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedBillNumber, setSavedBillNumber] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState(location.state?.cart || []);
  const [menu] = useState(location.state?.menu || []);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    eventDate: "",
    eventTime: "",
    guests: "",
    address: "",
    advanceAmount: "",
    perPlatePrice: "",
    totalAmount: "",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [preparedPdfFile, setPreparedPdfFile] = useState(null);

  const billDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  function formatEventTime(time) {
    if (!time) return "Not specified";

    const [hours, minutes] = time.split(":");
    const hour = Number(hours);

    if (
      !Number.isFinite(hour) ||
      !Number.isFinite(Number(minutes))
    ) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;

    return `${String(formattedHour).padStart(2, "0")}:${minutes} ${period}`;
  }

  // Use the selected cart items as a fallback if the full menu is unavailable.
  const completeMenu = menu.length
    ? menu
    : [
        {
          id: "selected-menu",
          name: "Selected Dishes",
          items: items.map((item) => ({
            ...item,
            category_name: item.category_name || "Uncategorized",
          })),
        },
      ];

  const selectedItems = new Map(
    items.map((item) => [String(item.id), item])
  );

  // Keep only selected dishes, grouped under their original categories.
  const selectedMenu = completeMenu
    .map((category) => ({
      ...category,
      items: (category.items || []).filter((dish) =>
        selectedItems.has(String(dish.id))
      ),
    }))
    .filter((category) => category.items.length > 0);

  function updateCustomer(e) {
    setCustomer((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));

    setShowPreview(false);
    setPreparedPdfFile(null);
  }

  function changeQuantity(id, amount) {
    setItems((previous) =>
      previous
        .map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                quantity: Number(item.quantity || 0) + amount,
              }
            : item
        )
        .filter((item) => Number(item.quantity || 0) > 0)
    );

    setShowPreview(false);
    setPreparedPdfFile(null);
  }

  function removeItem(id) {
    setItems((previous) =>
      previous.filter((item) => String(item.id) !== String(id))
    );

    setShowPreview(false);
    setPreparedPdfFile(null);
  }

  function goBack() {
    navigate("/", {
      state: { cart: items },
    });
  }

  function createBill() {
    if (!items.length) {
      alert("Please select at least one dish.");
      return;
    }

    if (
      !customer.name.trim() ||
      !customer.phone.trim() ||
      !customer.eventDate ||
      !customer.guests ||
      Number(customer.guests) < 1
    ) {
      alert("Please fill in all required customer details.");
      return;
    }

    const totalAmount = Number(customer.totalAmount);

    if (
      !customer.totalAmount.trim() ||
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      alert("Please enter a valid Total Amount greater than zero.");
      return;
    }

    if (
      Number(customer.advanceAmount || 0) < 0 ||
      Number(customer.perPlatePrice || 0) < 0
    ) {
      alert("Advance and per plate price cannot be negative.");
      return;
    }

    try {
      const pdf = createInvoicePDF();
      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error("The PDF is empty.");
      }

      const file = new File(
        [blob],
        "Laxmi-Nrusingha-Catering-Order-Details.pdf",
        { type: "application/pdf" }
      );

      setPreparedPdfFile(file);
      setShowPreview(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Invoice preparation error:", error);
      alert(
        "Unable to prepare the PDF: " +
          (error?.message || "Please try again.")
      );
    }
  }

  function printBill() {
    if (!showPreview) {
      alert("Please preview your document first.");
      return;
    }

    window.print();
  }

  async function saveOrderToHistory() {
    if (!showPreview) {
      alert("Please preview the catering order first.");
      return;
    }

    if (savedOrderId) {
      alert("This order has already been saved to Order History.");
      return;
    }

    if (savingOrder) return;

    setSavingOrder(true);

    try {
      const guests = Number(customer.guests);
      const perPlatePrice = Number(customer.perPlatePrice || 0);
      const advanceAmount = Number(customer.advanceAmount || 0);
      const totalAmount = Number(customer.totalAmount);

      if (!Number.isInteger(guests) || guests < 1) {
        throw new Error("Please enter a valid number of guests.");
      }

      if (!Number.isFinite(perPlatePrice) || perPlatePrice < 0) {
        throw new Error("Please enter a valid per-plate price.");
      }

      if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
        throw new Error("Please enter a valid advance amount.");
      }

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new Error("Please enter a valid total amount greater than zero.");
      }

      const orderPayload = {
        customer_name: customer.name.trim(),
        phone: customer.phone.trim(),
        event_date: customer.eventDate,
        event_time: customer.eventTime || "",
        guests,
        address: customer.address.trim(),
        per_plate_price: perPlatePrice,
        advance_amount: advanceAmount,
        final_amount: totalAmount,
      };

      const itemPayload = items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity || 0),
        price: item.price ?? null,
      }));

      if (
        itemPayload.some(
          (item) =>
            !item.id ||
            !item.name ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )
      ) {
        throw new Error("One or more selected dishes have invalid details.");
      }

      const { data: orderId, error: saveError } = await supabase.rpc(
        "create_catering_order",
        {
          p_order: orderPayload,
          p_items: itemPayload,
        }
      );

      if (saveError) throw saveError;

      if (!orderId) {
        throw new Error("The database did not return an order ID.");
      }

      setSavedOrderId(orderId);

      const { data: savedOrder, error: fetchError } = await supabase
        .from("orders")
        .select("bill_number")
        .eq("id", orderId)
        .single();

      if (fetchError) {
        console.error("Bill number lookup error:", fetchError);
      }

      setSavedBillNumber(savedOrder?.bill_number || "");

      alert(
        `Order saved successfully!${
          savedOrder?.bill_number
            ? ` Bill Number: ${savedOrder.bill_number}`
            : ""
        }`
      );
    } catch (err) {
      console.error("Order saving error:", err);
      alert(
        "Unable to save order: " +
          (err.message || "Please try again.")
      );
    } finally {
      setSavingOrder(false);
    }
  }

  // ------------------------------------------------
  // CATERING ORDER PDF
  // ------------------------------------------------

  function createInvoicePDF() {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const gold = [139, 103, 47];
    const darkGold = [105, 76, 36];
    const lightGold = [242, 232, 212];
    const cream = [255, 253, 247];
    const ink = [52, 43, 32];
    const muted = [130, 109, 75];

    let y = 15;

    function drawBorder() {
      pdf.setFillColor(...cream);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setDrawColor(...gold);
      pdf.setLineWidth(0.65);
      pdf.rect(7, 7, pageWidth - 14, pageHeight - 14);

      pdf.setDrawColor(225, 210, 181);
      pdf.setLineWidth(0.25);
      pdf.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);
    }

    function drawHeader() {
      pdf.setTextColor(...darkGold);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(21);
      pdf.text("LAXMI NRUSINGHA", pageWidth / 2, y + 7, {
        align: "center",
      });

      y += 13;

      pdf.setFontSize(17);
      pdf.setTextColor(...gold);
      pdf.text("CATTERS", pageWidth / 2, y + 4, {
        align: "center",
      });

      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(
        "WEDDING  |  EVENTS  |  CATERING",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 7;
      pdf.setDrawColor(...gold);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 9;

      pdf.setFillColor(...gold);
      pdf.roundedRect(
        pageWidth / 2 - 43,
        y - 5,
        86,
        12,
        1.5,
        1.5,
        "F"
      );

      pdf.setTextColor(255, 250, 240);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(
        "CATERING ORDER DETAILS",
        pageWidth / 2,
        y + 3,
        { align: "center" }
      );

      y += 16;
    }

    function addNewPage() {
      pdf.addPage();
      y = 15;
      drawBorder();
      drawHeader();
    }

    function ensureSpace(height) {
      if (y + height > pageHeight - 20) {
        addNewPage();
      }
    }

    drawBorder();
    drawHeader();

    pdf.setTextColor(...muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    pdf.text(`ISSUED: ${billDate}`, margin, y);
    pdf.text(
      `CUSTOMER: ${customer.name}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );

    y += 9;

    // Customer and event information panel.
    const detailsHeight = 65;

    pdf.setFillColor(248, 242, 230);
    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      detailsHeight,
      2,
      2,
      "F"
    );

    pdf.setDrawColor(225, 210, 181);
    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      detailsHeight,
      2,
      2,
      "S"
    );

    const leftX = margin + 4;
    const rightX = margin + contentWidth / 2 + 3;

    pdf.setTextColor(...darkGold);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);

    pdf.text("CUSTOMER DETAILS", leftX, y + 7);
    pdf.text("EVENT DETAILS", rightX, y + 7);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.3);
    pdf.setTextColor(...ink);

    pdf.text(`Name: ${customer.name}`, leftX, y + 14);
    pdf.text(`Phone: ${customer.phone}`, leftX, y + 20);

    const addressLines = pdf.splitTextToSize(
      `Address: ${customer.address || "Not provided"}`,
      contentWidth / 2 - 9
    );

    pdf.text(addressLines.slice(0, 3), leftX, y + 27);

    pdf.text(`Event Date: ${customer.eventDate}`, rightX, y + 14);
    pdf.text(
      `Event Time: ${formatEventTime(customer.eventTime)}`,
      rightX,
      y + 20
    );
    pdf.text(`Guests: ${customer.guests}`, rightX, y + 26);

    let eventDetailY = y + 32;

    if (Number(customer.perPlatePrice || 0) > 0) {
      pdf.text(
        `Per Plate: Rs. ${Number(customer.perPlatePrice).toFixed(2)}`,
        rightX,
        eventDetailY
      );
      eventDetailY += 6;
    }

    if (Number(customer.advanceAmount || 0) > 0) {
      pdf.text(
        `Advance: Rs. ${Number(customer.advanceAmount).toFixed(2)}`,
        rightX,
        eventDetailY
      );
      eventDetailY += 6;
    }

    pdf.setFont("helvetica", "bold");
    pdf.text(
      `Total Amount: Rs. ${Number(customer.totalAmount).toFixed(2)}`,
      rightX,
      eventDetailY
    );
    eventDetailY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.text(`Selected Dishes: ${items.length}`, rightX, eventDetailY);

    y += detailsHeight + 9;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...darkGold);
    pdf.text(
      "SELECTED DISHES",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 8;

    const columns = {
      number: margin + 2,
      dish: margin + 12,
      status: pageWidth - margin - 38,
      quantity: pageWidth - margin - 8,
    };

    function drawTableHeader() {
      pdf.setFillColor(...lightGold);
      pdf.rect(margin, y, contentWidth, 9, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...darkGold);

      pdf.text("NO.", columns.number, y + 6);
      pdf.text("DISH", columns.dish, y + 6);
      pdf.text("STATUS", columns.status, y + 6);
      pdf.text("QTY", columns.quantity, y + 6, {
        align: "center",
      });

      y += 9;
    }

    drawTableHeader();

    let rowNumber = 0;

    selectedMenu.forEach((category) => {
      const categoryItems = category.items || [];

      ensureSpace(12);

      pdf.setFillColor(248, 242, 230);
      pdf.rect(margin, y, contentWidth, 7, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...darkGold);
      pdf.text(
        String(category.name || "Category"),
        margin + 3,
        y + 5
      );

      y += 7;

      categoryItems.forEach((dish) => {
        rowNumber += 1;

        const selected = selectedItems.get(String(dish.id));
        const dishLines = pdf.splitTextToSize(
          String(dish.name || "Dish"),
          72
        );

        const rowHeight = Math.max(7, dishLines.length * 4.1 + 3);
        ensureSpace(rowHeight + 1);

        if (rowNumber % 2 === 0) {
          pdf.setFillColor(252, 248, 239);
          pdf.rect(margin, y, contentWidth, rowHeight, "F");
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...ink);

        pdf.text(String(rowNumber), columns.number, y + 5);
        pdf.text(dishLines, columns.dish, y + 5);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(35, 125, 75);
        pdf.text("SELECTED", columns.status, y + 5);

        pdf.setTextColor(...ink);
        pdf.text(
          String(selected?.quantity || 0),
          columns.quantity,
          y + 5,
          { align: "center" }
        );

        pdf.setDrawColor(230, 220, 201);
        pdf.line(
          margin,
          y + rowHeight,
          pageWidth - margin,
          y + rowHeight
        );

        y += rowHeight;
      });

      y += 3;
    });

    ensureSpace(22);

    y += 4;
    pdf.setDrawColor(...gold);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...darkGold);
    pdf.text(
      "Thank you for choosing Laxmi Nrusingha Catters!",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 6;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(
      "We look forward to making your event special.",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    const totalPages = pdf.internal.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text(
        `LAXMI NRUSINGHA CATTERS  •  ${page} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: "center" }
      );
    }

    return pdf;
  }

  // ------------------------------------------------
  // DOWNLOAD PDF
  // ------------------------------------------------

  function downloadInvoice() {
    try {
      const pdf = createInvoicePDF();
      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error("The generated PDF is empty.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Laxmi-Nrusingha-Catering-Order-Details.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Unable to download PDF: " + error.message);
    }
  }

  // ------------------------------------------------
  // SHARE PDF
  // ------------------------------------------------

  async function shareInvoice() {
    if (!showPreview || !preparedPdfFile) {
      alert("Please preview the document first.");
      return;
    }

    if (sharing) return;

    const captionLines = [
      "LAXMI NRUSINGHA CATTERS",
      `Catering Order Details for ${customer.name}`,
      `Event Date: ${customer.eventDate}`,
      `Event Time: ${formatEventTime(customer.eventTime)}`,
      `Guests: ${customer.guests}`,
    ];

    if (Number(customer.perPlatePrice || 0) > 0) {
      captionLines.push(
        `Per Plate: Rs. ${Number(customer.perPlatePrice).toFixed(2)}`
      );
    }

    if (Number(customer.advanceAmount || 0) > 0) {
      captionLines.push(
        `Advance: Rs. ${Number(customer.advanceAmount).toFixed(2)}`
      );
    }

    captionLines.push(
      `Total Amount: Rs. ${Number(customer.totalAmount).toFixed(2)}`
    );

    const caption = captionLines.join("\n");

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [preparedPdfFile] })
      ) {
        setSharing(true);

        await navigator.share({
          title: "Laxmi Nrusingha Catering Order Details",
          text: caption,
          files: [preparedPdfFile],
        });

        return;
      }

      downloadInvoice();

      const whatsappUrl =
        "https://wa.me/?text=" +
        encodeURIComponent(
          caption +
            "\n\nThe PDF has been downloaded. Please attach it before sending."
        );

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error?.name === "AbortError") return;

      console.error("Sharing error:", error);
      alert(
        "Unable to open sharing. Please download the PDF and attach it manually."
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="checkout-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap');

        .checkout-page {
          --gold:#b18a43;
          --gold-dark:#80602d;
          --ink:#342b20;
          max-width:1120px;
          margin:35px auto;
          padding:22px;
          color:var(--ink);
          font-family:'DM Sans',Arial,sans-serif;
        }
        .checkout-page * {box-sizing:border-box;}
        .checkout-page h1,.checkout-page h2,.checkout-page h3 {
          font-family:'Playfair Display',Georgia,serif;
        }
        .checkout-heading {text-align:center;margin:28px 0;}
        .checkout-heading h1 {
          color:#98743b;
          font-size:clamp(28px,4vw,39px);
          margin:0 0 8px;
        }
        .checkout-heading p {
          color:#9a896b;
          letter-spacing:3px;
          font-size:11px;
          font-weight:800;
        }
        .checkout-card {
          background:linear-gradient(145deg,#fff,#fcf9f1);
          border:1px solid #e8dcc4;
          border-radius:18px;
          padding:28px;
          margin-bottom:24px;
          box-shadow:0 12px 35px rgba(66,48,16,.055);
        }
        .checkout-card h2 {
          color:#98743b;
          margin:0 0 22px;
          font-size:24px;
        }
        .checkout-page input,.checkout-page textarea {
          width:100%;
          padding:13px 14px;
          border:1px solid #ded1b8;
          border-radius:9px;
          margin-top:8px;
          background:#fffefa;
          color:var(--ink);
          font:inherit;
        }
        .checkout-page input:focus,.checkout-page textarea:focus {
          outline:none;
          border-color:#b18a43;
          box-shadow:0 0 0 4px rgba(177,138,67,.13);
        }
        .checkout-fields {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:19px;
        }
        .checkout-fields label {
          font-weight:700;
          font-size:13px;
          color:#514630;
        }
        .checkout-actions {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-top:22px;
        }
        .checkout-btn {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:9px;
          border:1px solid #b18a43;
          border-radius:9px;
          padding:13px 20px;
          background:linear-gradient(135deg,#ead8ad,#c4a467);
          color:#352613;
          font-weight:800;
          cursor:pointer;
        }
        .checkout-btn.secondary {
          background:#fffaf0;
          color:#72562b;
          border-color:#e2d2b2;
        }
        .bill-row {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          padding:17px 0;
          border-bottom:1px solid #eee7da;
        }
        .quantity-controls {
          display:flex;
          align-items:center;
          gap:10px;
        }
        .quantity-controls button {
          width:33px;
          height:33px;
          display:grid;
          place-items:center;
          border:1px solid #d6c49f;
          background:#fffaf0;
          color:#805e25;
          border-radius:8px;
          cursor:pointer;
        }
        .dish-category {
          display:inline-block;
          margin-top:6px;
          padding:5px 10px;
          border:1px solid #e5d3ad;
          border-radius:20px;
          background:#fff9ed;
          color:#896a32;
          font-size:11px;
          font-weight:700;
        }
        .remove-dish {
          border:0;
          background:transparent;
          color:#b34b3d;
          cursor:pointer;
          padding:7px;
        }

        /* PREMIUM DOCUMENT PREVIEW */
        .invoice-print {
          width:100%;
          max-width:850px;
          margin:28px auto;
          padding:18px;
          background:#fffdf8;
          color:#342b20;
          border:2px solid #b18a43;
          border-radius:8px;
          box-shadow:0 18px 55px rgba(77,55,20,.12);
        }
        .invoice-inner {
          border:1px solid #e5d5b5;
          padding:24px;
          background:#fffdf8;
        }
        .invoice-header {
          text-align:center;
          padding:17px 12px 23px;
          border-bottom:1px solid #e4d3b1;
        }
        .invoice-ornament {
          color:#b18a43;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:30px;
          margin-bottom:8px;
        }
        .invoice-brand {
          color:#79572a;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:clamp(29px,5vw,43px);
          font-weight:700;
          letter-spacing:2px;
          line-height:1.05;
          margin:0;
        }
        .invoice-brand-sub {
          color:#98743b;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:25px;
          letter-spacing:5px;
          font-weight:600;
          margin:4px 0 12px;
        }
        .invoice-subtitle {
          margin:0;
          color:#9a825b;
          font-size:11px;
          letter-spacing:3px;
          font-weight:800;
        }
        .invoice-title {
          display:inline-block;
          margin-top:15px;
          padding:10px 25px;
          background:linear-gradient(135deg,#8b672f,#c5a568,#8b672f);
          border:1px solid #9a743b;
          color:#fffaf0;
          font-family:'Playfair Display',Georgia,serif;
          font-size:18px;
          letter-spacing:2px;
        }
        .invoice-meta {
          display:flex;
          justify-content:space-between;
          flex-wrap:wrap;
          gap:8px;
          margin-top:14px;
          color:#927b54;
          font-size:11px;
          font-weight:700;
        }
        .invoice-details {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:15px;
          padding:24px 0;
        }
        .invoice-detail-box {
          background:linear-gradient(145deg,#fffefa,#f8f2e6);
          border:1px solid #e8d8b9;
          border-radius:8px;
          padding:17px;
          min-width:0;
        }
        .invoice-detail-heading {
          display:flex;
          align-items:center;
          gap:8px;
          margin:0 0 14px;
          color:#8c682f;
          font-family:'DM Sans',Arial,sans-serif;
          font-size:12px;
          letter-spacing:1px;
          text-transform:uppercase;
          font-weight:800;
          padding-bottom:9px;
          border-bottom:1px solid #eadfc9;
        }
        .invoice-detail-box p {
          display:flex;
          align-items:flex-start;
          gap:7px;
          margin:9px 0;
          font-size:12px;
          line-height:1.55;
          overflow-wrap:anywhere;
        }
        .invoice-detail-box p strong {
          color:#70562f;
          min-width:83px;
        }
        .invoice-menu-heading {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          margin:12px 0 15px;
          color:#8c682f;
          font-family:'Playfair Display',Georgia,serif;
          font-size:19px;
          letter-spacing:1px;
          text-align:center;
        }
        .invoice-menu-heading::before,.invoice-menu-heading::after {
          content:'';
          flex:1;
          height:1px;
          background:#dfc99e;
        }
        .invoice-category-heading {
          margin-top:18px;
          padding:10px 12px;
          background:#f2e8d4;
          color:#715329;
          font-weight:800;
          font-size:13px;
          border:1px solid #e3d2ad;
        }
        .invoice-table-wrap {width:100%;overflow-x:auto;}
        .invoice-table {
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }
        .invoice-table th {
          background:#faf6ec;
          color:#715329;
          padding:11px 9px;
          text-align:left;
          border-bottom:1px solid #d9c295;
          font-size:10px;
          letter-spacing:.3px;
        }
        .invoice-table td {
          padding:11px 9px;
          border-bottom:1px solid #eee5d4;
          vertical-align:top;
          overflow-wrap:anywhere;
        }
        .invoice-table tbody tr:nth-child(even) {background:#fcf8ef;}
        .selected-label {color:#237d4b;font-weight:800;}
        .not-selected-label {color:#93846c;}
        .unavailable-label {color:#a05041;font-weight:700;}
        .invoice-footer {
          margin-top:28px;
          padding-top:20px;
          border-top:1px solid #e5d5b5;
          text-align:center;
          color:#846a42;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:18px;
          font-style:italic;
        }
        .invoice-footer p {margin:5px 0;}
        .invoice-footer .footer-small {
          margin-top:12px;
          font-family:'DM Sans',Arial,sans-serif;
          font-style:normal;
          font-size:9px;
          font-weight:700;
          letter-spacing:2px;
          color:#a58b5c;
        }
        .share-section {
          margin:28px auto;
          padding:28px;
          background:linear-gradient(135deg,#352b1d,#51412b);
          border:1px solid rgba(197,165,104,.4);
          border-radius:17px;
          color:white;
        }
        .share-section h2 {
          color:#ead6a9;
          margin:0 0 10px;
          font-size:24px;
        }
        .share-btn {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          min-height:48px;
          margin:8px 8px 0 0;
          padding:12px 20px;
          border:0;
          border-radius:9px;
          color:white;
          font-size:14px;
          font-weight:800;
          cursor:pointer;
        }
        .share-btn.whatsapp {
          background:linear-gradient(135deg,#20bd5a,#128c45);
        }
        .share-btn:disabled {opacity:.6;cursor:wait;}
        .print-btn {
          width:100%;
          margin-top:14px;
          padding:15px;
          background:linear-gradient(135deg,#ead8ad,#c4a467);
          color:#352613;
          border:1px solid #d1b675;
          border-radius:10px;
          font-weight:900;
          font-size:15px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
        }

        @media(max-width:650px) {
          .checkout-page {margin:12px auto;padding:13px;}
          .checkout-fields,.invoice-details {grid-template-columns:1fr;}
          .checkout-card {padding:18px;}
          .invoice-print {padding:9px;}
          .invoice-inner {padding:13px 9px;}
          .invoice-brand {font-size:27px;}
          .invoice-brand-sub {font-size:21px;}
          .invoice-subtitle {font-size:9px;letter-spacing:1.5px;}
          .invoice-title {font-size:14px;padding:8px 14px;}
          .invoice-table {font-size:10px;}
          .invoice-table th,.invoice-table td {padding:8px 4px;}
          .invoice-detail-box {padding:13px;}
          .share-section {padding:18px;}
          .bill-row {flex-wrap:wrap;}
        }

        @media print {
          @page {size:A4 portrait;margin:10mm;}
          html,body {
            margin:0!important;
            padding:0!important;
            background:#fffdf8!important;
          }
          body * {visibility:hidden!important;}
          .no-print {display:none!important;}
          .invoice-print,.invoice-print * {visibility:visible!important;}
          .invoice-print {
            display:block!important;
            position:relative!important;
            width:100%!important;
            max-width:none!important;
            margin:0 auto!important;
            padding:8px!important;
            background:#fffdf8!important;
            border:2px solid #b18a43!important;
            box-shadow:none!important;
            overflow:visible!important;
            print-color-adjust:exact!important;
            -webkit-print-color-adjust:exact!important;
          }
          .invoice-inner {padding:15px!important;}
          .invoice-details {
            display:grid!important;
            grid-template-columns:1fr 1fr!important;
            gap:10px!important;
            padding:15px 0!important;
          }
          .invoice-detail-box {
            background:#f8f2e6!important;
            break-inside:avoid;
          }
          .invoice-table {
            width:100%!important;
            font-size:9px!important;
          }
          .invoice-table tr {break-inside:avoid;}
          .invoice-category-heading {break-after:avoid;}
        }
      `}</style>

      {/* CHECKOUT FORM */}

      <div className="no-print">
        <button className="checkout-btn secondary" onClick={goBack}>
          <ArrowLeft size={16} />
          Back to Menu
        </button>

        <div className="checkout-heading">
          <h1>Customer Checkout</h1>
          <p>LAXMI NRUSINGHA CATTERS</p>
        </div>

        <section className="checkout-card">
          <h2>Selected Dishes</h2>

          {!items.length && (
            <p>No dishes selected. Go back to the menu.</p>
          )}

          {items.map((item) => (
            <div className="bill-row" key={item.id}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <strong>{item.name}</strong>
                <div className="dish-category">
                  {item.category_name || "Uncategorized"}
                </div>
              </div>

              <div className="quantity-controls">
                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, -1)}
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus size={13} />
                </button>

                <strong>{item.quantity}</strong>

                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, 1)}
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                type="button"
                className="remove-dish"
                onClick={() => removeItem(item.id)}
                title="Remove dish"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </section>

        <section className="checkout-card">
          <h2>Customer & Event Details</h2>

          <div className="checkout-fields">
            <label>
              Customer Name *
              <input
                name="name"
                value={customer.name}
                onChange={updateCustomer}
                placeholder="Enter customer name"
              />
            </label>

            <label>
              Phone Number *
              <input
                name="phone"
                type="tel"
                value={customer.phone}
                onChange={updateCustomer}
                placeholder="Enter phone number"
              />
            </label>

            <label>
              Event Date *
              <input
                type="date"
                name="eventDate"
                value={customer.eventDate}
                onChange={updateCustomer}
              />
            </label>

            <label>
              Event Time
              <input
                type="time"
                name="eventTime"
                value={customer.eventTime}
                onChange={updateCustomer}
              />
              {customer.eventTime && (
                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#896a32",
                    fontWeight: 700,
                  }}
                >
                  Display time: {formatEventTime(customer.eventTime)}
                </small>
              )}
            </label>

            <label>
              Number of Guests *
              <input
                type="number"
                min="1"
                name="guests"
                value={customer.guests}
                onChange={updateCustomer}
                placeholder="Number of guests"
              />
            </label>

            <label>
              Per Plate Price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                name="perPlatePrice"
                value={customer.perPlatePrice}
                onChange={updateCustomer}
                placeholder="Enter per plate price"
              />
            </label>

            <label>
              Advance Amount (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                name="advanceAmount"
                value={customer.advanceAmount}
                onChange={updateCustomer}
                placeholder="Enter advance amount"
              />
            </label>

            <label>
              Total Amount (₹) *
              <input
                type="number"
                min="0.01"
                step="0.01"
                name="totalAmount"
                value={customer.totalAmount}
                onChange={updateCustomer}
                placeholder="Enter total amount"
                required
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Event Address
              <textarea
                name="address"
                value={customer.address}
                onChange={updateCustomer}
                placeholder="Enter event address"
                rows="3"
              />
            </label>
          </div>

          <div className="checkout-actions">
            <button className="checkout-btn" onClick={createBill}>
              <Receipt size={17} />
              Preview Catering Order Details
              <Sparkles size={15} />
            </button>
          </div>
        </section>
      </div>

      {/* DOCUMENT PREVIEW */}

      {showPreview && (
        <>
          <section className="invoice-print">
            <div className="invoice-inner">
              <div className="invoice-header">
                <div className="invoice-ornament">✦ ❧ ✦</div>

                <h1 className="invoice-brand">LAXMI NRUSINGHA</h1>
                <div className="invoice-brand-sub">CATTERS</div>

                <p className="invoice-subtitle">
                  WEDDING • EVENTS • CATERING
                </p>

                <div className="invoice-title">
                  CATERING ORDER DETAILS
                </div>

                <div className="invoice-meta">
                  <span>ISSUED: {billDate}</span>
                  <span>PREPARED FOR: {customer.name}</span>
                </div>
              </div>

              <div className="invoice-details">
                <div className="invoice-detail-box">
                  <h3 className="invoice-detail-heading">
                    <UserRound size={16} />
                    Customer Details
                  </h3>

                  <p>
                    <strong>Name:</strong>
                    <span>{customer.name}</span>
                  </p>

                  <p>
                    <Phone size={13} />
                    <strong>Phone:</strong>
                    <span>{customer.phone}</span>
                  </p>

                  <p>
                    <MapPin size={13} />
                    <strong>Address:</strong>
                    <span>{customer.address || "Not provided"}</span>
                  </p>
                </div>

                <div className="invoice-detail-box">
                  <h3 className="invoice-detail-heading">
                    <CalendarDays size={16} />
                    Event Details
                  </h3>

                  <p>
                    <strong>Event Date:</strong>
                    <span>{customer.eventDate}</span>
                  </p>

                  <p>
                    <Clock size={13} />
                    <strong>Event Time:</strong>
                    <span>{formatEventTime(customer.eventTime)}</span>
                  </p>

                  <p>
                    <Users size={13} />
                    <strong>Guests:</strong>
                    <span>{customer.guests}</span>
                  </p>

                  {Number(customer.perPlatePrice || 0) > 0 && (
                    <p>
                      <Utensils size={13} />
                      <strong>Per Plate:</strong>
                      <span>
                        ₹{Number(customer.perPlatePrice).toFixed(2)}
                      </span>
                    </p>
                  )}

                  {Number(customer.advanceAmount || 0) > 0 && (
                    <p>
                      <Wallet size={13} />
                      <strong>Advance:</strong>
                      <span>
                        ₹{Number(customer.advanceAmount).toFixed(2)}
                      </span>
                    </p>
                  )}

                  <p>
                    <Wallet size={13} />
                    <strong>Total Amount:</strong>
                    <span>
                      ₹{Number(customer.totalAmount || 0).toFixed(2)}
                    </span>
                  </p>

                  <p>
                    <Utensils size={13} />
                    <strong>Menu Items:</strong>
                    <span>{items.length} selected dishes</span>
                  </p>
                </div>
              </div>

              <div className="invoice-menu-heading">
                SELECTED DISHES
              </div>

              {selectedMenu.map((category) => (
                <div key={category.id || category.name}>
                  <div className="invoice-category-heading">
                    {category.name}
                  </div>

                  <div className="invoice-table-wrap">
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th style={{ width: "9%" }}>No.</th>
                          <th style={{ width: "51%" }}>Dish</th>
                          <th style={{ width: "25%" }}>Selection</th>
                          <th style={{ width: "15%", textAlign: "center" }}>
                            Qty
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {(category.items || []).map((dish, index) => {
                          const selected = selectedItems.get(String(dish.id));

                          return (
                            <tr key={dish.id}>
                              <td>{index + 1}</td>
                              <td>
                                <strong>{dish.name}</strong>
                              </td>
                              <td>
                                <span className="selected-label">
                                  ✓ Selected
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {selected ? selected.quantity : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="invoice-footer">
                <p>
                  Thank you for choosing Laxmi Nrusingha Catters!
                </p>
                <p>
                  We look forward to making your event special.
                </p>
                <p className="footer-small">
                  WEDDING • EVENTS • CATERING
                </p>
                <div
                  className="invoice-ornament"
                  style={{ marginTop: 12 }}
                >
                  ✦ ❧ ✦
                </div>
              </div>
            </div>
          </section>

          <section className="share-section no-print">
            <h2>
              <Share2
                size={21}
                style={{ verticalAlign: "middle", marginRight: 8 }}
              />
              Print & Share Catering Details
            </h2>

            <p style={{ color: "#e3d8c2", fontSize: 13 }}>
              Only the dishes selected for this order are included in this document.
            </p>

            <button
              type="button"
              className="print-btn"
              onClick={saveOrderToHistory}
              disabled={savingOrder || Boolean(savedOrderId)}
              style={{
                marginBottom: 12,
                background: savedOrderId
                  ? "#dcebdc"
                  : "linear-gradient(135deg,#ead8ad,#c4a467)",
                opacity: savingOrder ? 0.7 : 1,
              }}
            >
              <Receipt size={19} />
              {savingOrder
                ? "Saving Order..."
                : savedOrderId
                  ? "Order Saved Successfully"
                  : "Save Order to History"}
            </button>

            {savedOrderId && (
              <p
                style={{
                  color: "#dcebdc",
                  fontSize: 13,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Saved successfully
                {savedBillNumber ? ` · Bill No: ${savedBillNumber}` : ""}
              </p>
            )}

            <button className="print-btn" onClick={printBill}>
              <Printer size={19} />
              Print Document
            </button>

            <button
              className="print-btn"
              onClick={downloadInvoice}
            >
              <Download size={19} />
              Download PDF
            </button>

            <button
              type="button"
              className="share-btn whatsapp"
              onClick={shareInvoice}
              disabled={sharing}
            >
              <MessageCircle size={22} />
              {sharing ? "Preparing..." : "Share PDF"}
            </button>

            <p
              style={{
                fontSize: 11,
                color: "#e0d3ba",
                textAlign: "center",
                marginTop: 17,
              }}
            >
              {sharing
                ? "Opening your device share menu..."
                : preparedPdfFile
                  ? "Your PDF is ready. Choose WhatsApp from the share menu on supported devices."
                  : "Preview the document to prepare the PDF."}
            </p>

            <div className="checkout-actions">
              <button
                className="checkout-btn secondary"
                onClick={() => setShowPreview(false)}
              >
                Edit Details
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Checkout;
