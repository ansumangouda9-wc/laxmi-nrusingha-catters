
import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";

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
  Utensils,
  CalendarDays,
  Users,
  Phone,
  MapPin,
  UserRound,
  Download,
} from "lucide-react";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const invoiceRef = useRef(null);

  const [items, setItems] = useState(
    location.state?.cart || []
  );

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    eventDate: "",
    guests: "",
    address: "",
  });

  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [preparedPdfFile, setPreparedPdfFile] = useState(null);

  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const billDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
          item.id === id
            ? {
                ...item,
                quantity:
                  Number(item.quantity || 0) + amount,
              }
            : item
        )
        .filter(
          (item) => Number(item.quantity || 0) > 0
        )
    );

    setShowPreview(false);
    setPreparedPdfFile(null);
  }

  function removeItem(id) {
    setItems((previous) =>
      previous.filter((item) => item.id !== id)
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

    try {
      const pdf = createInvoicePDF();
      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error("The invoice PDF is empty.");
      }

      const file = new File(
        [blob],
        "Laxmi-Nrusingha-Event-Invoice.pdf",
        { type: "application/pdf" }
      );

      setPreparedPdfFile(file);
      setShowPreview(true);
    } catch (error) {
      console.error("Invoice preparation error:", error);
      alert("Unable to prepare invoice PDF: " + (error?.message || "Please try again."));
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function printBill() {
    if (!showPreview) {
      alert("Please preview your bill first.");
      return;
    }

    window.print();
  }

  // ------------------------------------------------
  // DIRECT PDF GENERATION
  // No html2canvas or canvas is used here.
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
    const darkGold = [121, 87, 42];
    const lightGold = [242, 232, 212];
    const ink = [52, 43, 32];
    const muted = [130, 109, 75];

    let y = 15;

    function addPageIfNeeded(requiredHeight = 10) {
      if (y + requiredHeight > pageHeight - 15) {
        pdf.addPage();
        y = 18;
        return true;
      }

      return false;
    }

    function addWrappedText(
      text,
      x,
      currentY,
      maxWidth,
      fontSize = 10,
      color = ink,
      fontStyle = "normal"
    ) {
      pdf.setFont("helvetica", fontStyle);
      pdf.setFontSize(fontSize);
      pdf.setTextColor(...color);

      const lines = pdf.splitTextToSize(
        String(text || ""),
        maxWidth
      );

      pdf.text(lines, x, currentY);

      return lines.length * (fontSize * 0.42 + 1.5);
    }

    // Outer invoice border
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(0.8);

    pdf.rect(
      7,
      7,
      pageWidth - 14,
      pageHeight - 14
    );

    // Header
    pdf.setTextColor(...darkGold);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(23);

    pdf.text(
      "LAXMI NRUSINGHA",
      pageWidth / 2,
      y + 8,
      { align: "center" }
    );

    y += 14;

    pdf.setFontSize(19);

    pdf.text(
      "CATTERS",
      pageWidth / 2,
      y + 5,
      { align: "center" }
    );

    y += 11;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);

    pdf.text(
      "WEDDING  |  EVENTS  |  CATERING",
      pageWidth / 2,
      y + 2,
      { align: "center" }
    );

    y += 8;

    // Gold divider
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(0.5);

    pdf.line(
      margin,
      y,
      pageWidth - margin,
      y
    );

    y += 9;

    // Event bill title
    pdf.setFillColor(...gold);

    pdf.roundedRect(
      pageWidth / 2 - 30,
      y - 5,
      60,
      12,
      1,
      1,
      "F"
    );

    pdf.setTextColor(255, 250, 240);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);

    pdf.text(
      "EVENT BILL",
      pageWidth / 2,
      y + 3,
      { align: "center" }
    );

    y += 17;

    pdf.setTextColor(...muted);
    pdf.setFontSize(8);

    pdf.text(
      `ISSUED: ${billDate}`,
      margin,
      y
    );

    pdf.text(
      `CUSTOMER: ${customer.name}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );

    y += 10;

    // Customer and event information
    pdf.setFillColor(248, 242, 230);

    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      35,
      2,
      2,
      "F"
    );

    pdf.setTextColor(...darkGold);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);

    pdf.text("CUSTOMER DETAILS", margin + 4, y + 7);
    pdf.text(
      "EVENT DETAILS",
      margin + contentWidth / 2 + 3,
      y + 7
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...ink);

    const leftX = margin + 4;
    const rightX = margin + contentWidth / 2 + 3;

    pdf.text(`Name: ${customer.name}`, leftX, y + 14);
    pdf.text(`Phone: ${customer.phone}`, leftX, y + 20);

    const addressLines = pdf.splitTextToSize(
      `Address: ${customer.address || "Not provided"}`,
      contentWidth / 2 - 9
    );

    pdf.text(addressLines, leftX, y + 26);

    pdf.text(
      `Event Date: ${customer.eventDate}`,
      rightX,
      y + 14
    );

    pdf.text(
      `Guests: ${customer.guests}`,
      rightX,
      y + 20
    );

    pdf.text(
      `Menu Items: ${items.length}`,
      rightX,
      y + 26
    );

    y += 44;

    // Selected menu heading
    pdf.setTextColor(...darkGold);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);

    pdf.text(
      "YOUR SELECTED MENU",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 7;

    // Table column positions
    const columns = {
      number: margin + 2,
      dish: margin + 13,
      category: margin + 83,
      quantity: margin + 126,
      amount: pageWidth - margin - 2,
    };

    function drawTableHeader() {
      pdf.setFillColor(...lightGold);

      pdf.rect(
        margin,
        y,
        contentWidth,
        10,
        "F"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...darkGold);

      pdf.text("NO.", columns.number, y + 6.5);
      pdf.text("DISH", columns.dish, y + 6.5);
      pdf.text("CATEGORY", columns.category, y + 6.5);

      pdf.text(
        "QTY",
        columns.quantity,
        y + 6.5,
        { align: "center" }
      );

      pdf.text(
        "AMOUNT",
        columns.amount,
        y + 6.5,
        { align: "right" }
      );

      y += 10;
    }

    drawTableHeader();

    items.forEach((item, index) => {
      const dishLines = pdf.splitTextToSize(
        String(item.name || "Dish"),
        65
      );

      const categoryLines = pdf.splitTextToSize(
        String(item.category_name || "Uncategorized"),
        39
      );

      const rowHeight =
        Math.max(
          dishLines.length,
          categoryLines.length,
          1
        ) * 4.5 + 5;

      if (y + rowHeight > pageHeight - 32) {
        pdf.addPage();
        y = 18;
        drawTableHeader();
      }

      if (index % 2 === 0) {
        pdf.setFillColor(252, 248, 239);

        pdf.rect(
          margin,
          y,
          contentWidth,
          rowHeight,
          "F"
        );
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...ink);

      pdf.text(String(index + 1), columns.number, y + 5);

      pdf.text(
        dishLines,
        columns.dish,
        y + 5
      );

      pdf.text(
        categoryLines,
        columns.category,
        y + 5
      );

      pdf.text(
        String(item.quantity || 0),
        columns.quantity,
        y + 5,
        { align: "center" }
      );

      const amount =
        Number(item.price || 0) *
        Number(item.quantity || 0);

      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs. ${amount.toFixed(2)}`,
        columns.amount,
        y + 5,
        { align: "right" }
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

    // Grand total
    addPageIfNeeded(30);

    y += 8;

    pdf.setFillColor(247, 237, 218);
    pdf.setDrawColor(...gold);

    pdf.roundedRect(
      margin,
      y,
      contentWidth,
      19,
      2,
      2,
      "FD"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...darkGold);

    pdf.text(
      "GRAND TOTAL",
      margin + 5,
      y + 12
    );

    pdf.setFontSize(16);

    pdf.text(
      `Rs. ${total.toFixed(2)}`,
      pageWidth - margin - 5,
      y + 12,
      { align: "right" }
    );

    y += 31;

    addPageIfNeeded(22);

    // Footer
    pdf.setDrawColor(...gold);

    pdf.line(
      margin,
      y,
      pageWidth - margin,
      y
    );

    y += 9;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...darkGold);

    pdf.text(
      "Thank you for choosing Laxmi Nrusingha Catters!",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);

    pdf.text(
      "We look forward to making your event special.",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    return pdf;
  }

  // ------------------------------------------------
  // DOWNLOAD PDF
  // ------------------------------------------------

  function downloadInvoice(pdf) {
    try {
      if (!pdf || typeof pdf.output !== "function") {
        throw new Error("A valid invoice PDF was not created.");
      }

      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error("The generated PDF is empty.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Laxmi-Nrusingha-Event-Invoice.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      return true;
    } catch (error) {
      console.error("Invoice download error:", error);
      alert("Unable to download invoice: " + error.message);

      return false;
    }
  }

  // ------------------------------------------------
  // WHATSAPP / INSTAGRAM / FACEBOOK SHARING
  // The PDF is prepared when Preview Bill is clicked.
  // navigator.share is called immediately inside this
  // separate user click, before any await or long work.
  // ------------------------------------------------

  async function shareInvoice(platform) {
    if (!showPreview || !preparedPdfFile) {
      alert("Please click Preview Bill first so your PDF is ready.");
      return;
    }

    if (sharing) return;

    const caption =
      `LAXMI NRUSINGHA CATTERS\\n` +
      `Event Bill for ${customer.name}\\n` +
      `Event Date: ${customer.eventDate}\\n` +
      `Grand Total: Rs. ${total.toFixed(2)}`;

    const shareData = {
      title: "Laxmi Nrusingha Event Invoice",
      text: caption,
      files: [preparedPdfFile],
    };

    // IMPORTANT: call navigator.share directly from this button click.
    // Do not generate the PDF, open a popup, or await anything first.
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [preparedPdfFile] })
    ) {
      try {
        setSharing(true);
        const sharePromise = navigator.share(shareData);
        await sharePromise;
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;

        console.error("Native invoice sharing error:", error);
        alert(
          "Your browser could not open the share menu. The PDF will be downloaded instead."
        );
      } finally {
        setSharing(false);
      }
    }

    // Desktop/unsupported-browser fallback: download the PDF.
    const blob = preparedPdfFile;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = preparedPdfFile.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    if (platform === "whatsapp") {
      const whatsappUrl =
        "https://wa.me/?text=" +
        encodeURIComponent(
          caption + "\\n\\nThe invoice PDF has been downloaded. Please attach it before sending."
        );

      // Navigate in the same tab to avoid popup-blocker failures.
      window.location.href = whatsappUrl;
      return;
    }

    if (platform === "instagram") {
      alert(
        "The PDF has been downloaded. Instagram does not accept PDF files for feed posts; use an image version for a post or share the PDF through a supported messaging app."
      );
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      return;
    }

    if (platform === "facebook") {
      alert(
        "The PDF has been downloaded. Open Facebook and attach it where document sharing is supported. For a normal post, use an image version."
      );
      window.open("https://www.facebook.com/", "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="checkout-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap');

        .checkout-page {
          --gold: #b18a43;
          --gold-dark: #80602d;
          --gold-light: #e5cf9f;
          --ivory: #fffdf8;
          --cream: #f8f2e6;
          --ink: #342b20;
          --muted: #8d806c;
          max-width: 1120px;
          margin: 35px auto;
          padding: 22px;
          color: var(--ink);
          font-family: 'DM Sans', Arial, sans-serif;
          animation: checkoutFade .55s ease both;
        }

        .checkout-page * {
          box-sizing: border-box;
        }

        @keyframes checkoutFade {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes invoiceEnter {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes goldShine {
          0%, 100% { box-shadow: 0 8px 25px rgba(177,138,67,.10); }
          50% { box-shadow: 0 12px 35px rgba(177,138,67,.23); }
        }

        .checkout-page h1,
        .checkout-page h2,
        .checkout-page h3 {
          font-family: 'Playfair Display', Georgia, serif;
        }

        .checkout-heading {
          text-align: center;
          margin: 28px 0;
        }

        .checkout-heading h1 {
          color: #98743b;
          font-size: clamp(28px, 4vw, 39px);
          margin: 0 0 8px;
        }

        .checkout-heading p {
          color: #9a896b;
          letter-spacing: 3px;
          font-size: 11px;
          font-weight: 800;
        }

        .checkout-card {
          background: linear-gradient(145deg, #fff, #fcf9f1);
          border: 1px solid #e8dcc4;
          border-radius: 18px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 12px 35px rgba(66,48,16,.055);
          transition: box-shadow .3s ease, transform .3s ease;
        }

        .checkout-card:hover {
          box-shadow: 0 16px 42px rgba(66,48,16,.10);
          transform: translateY(-2px);
        }

        .checkout-card h2 {
          color: #98743b;
          margin: 0 0 22px;
          font-size: 24px;
        }

        .checkout-page input,
        .checkout-page textarea {
          width: 100%;
          padding: 13px 14px;
          border: 1px solid #ded1b8;
          border-radius: 9px;
          margin-top: 8px;
          background: #fffefa;
          color: var(--ink);
          font: inherit;
          transition: border .25s, box-shadow .25s;
        }

        .checkout-page input:focus,
        .checkout-page textarea:focus {
          outline: none;
          border-color: #b18a43;
          box-shadow: 0 0 0 4px rgba(177,138,67,.13);
        }

        .checkout-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 19px;
        }

        .checkout-fields label {
          font-weight: 700;
          font-size: 13px;
          color: #514630;
        }

        .checkout-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }

        .checkout-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 1px solid #b18a43;
          border-radius: 9px;
          padding: 13px 20px;
          background: linear-gradient(135deg, #ead8ad, #c4a467);
          color: #352613;
          font-weight: 800;
          cursor: pointer;
          transition: transform .25s, box-shadow .25s, filter .25s;
        }

        .checkout-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 20px rgba(153,117,48,.22);
          filter: brightness(1.04);
        }

        .checkout-btn:active,
        .share-btn:active {
          transform: scale(.97);
        }

        .checkout-btn.secondary {
          background: #fffaf0;
          color: #72562b;
          border-color: #e2d2b2;
        }

        .bill-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 17px 0;
          border-bottom: 1px solid #eee7da;
          animation: checkoutFade .35s ease both;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantity-controls button {
          width: 33px;
          height: 33px;
          display: grid;
          place-items: center;
          border: 1px solid #d6c49f;
          background: #fffaf0;
          color: #805e25;
          border-radius: 8px;
          cursor: pointer;
          transition: background .2s, color .2s, transform .2s;
        }

        .quantity-controls button:hover {
          background: #b18a43;
          color: white;
          transform: scale(1.08);
        }

        .bill-total {
          text-align: right;
          font-size: 24px;
          font-weight: 800;
          color: #8b6b32;
          margin-top: 23px;
        }

        .dish-category {
          display: inline-block;
          margin-top: 6px;
          padding: 5px 10px;
          border: 1px solid #e5d3ad;
          border-radius: 20px;
          background: #fff9ed;
          color: #896a32;
          font-size: 11px;
          font-weight: 700;
        }

        .remove-dish {
          border: 0;
          background: transparent;
          color: #b34b3d;
          cursor: pointer;
          padding: 7px;
          border-radius: 7px;
          transition: background .2s, transform .2s;
        }

        .remove-dish:hover {
          background: #fff0ed;
          transform: scale(1.12);
        }

        /* PREMIUM INVOICE CARD */

        .invoice-print {
          width: 100%;
          max-width: 850px;
          margin: 28px auto;
          padding: 18px;
          background: #fffdf8;
          color: #342b20;
          border: 2px solid #b18a43;
          border-radius: 8px;
          box-shadow: 0 18px 55px rgba(77,55,20,.12);
          animation: invoiceEnter .55s ease both;
          position: relative;
          overflow: hidden;
        }

        .invoice-inner {
          position: relative;
          z-index: 1;
          border: 1px solid #e5d5b5;
          padding: 24px;
          background:
            radial-gradient(circle at 0 0, rgba(229,207,159,.13), transparent 28%),
            radial-gradient(circle at 100% 100%, rgba(229,207,159,.13), transparent 28%),
            #fffdf8;
        }

        .invoice-ornament {
          text-align: center;
          color: #b18a43;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 30px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .invoice-header {
          text-align: center;
          padding: 17px 12px 23px;
          border-bottom: 1px solid #e4d3b1;
          position: relative;
        }

        .invoice-brand {
          color: #79572a;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(29px, 5vw, 43px);
          font-weight: 700;
          letter-spacing: 2px;
          line-height: 1.05;
          margin: 0;
        }

        .invoice-brand-sub {
          color: #98743b;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 25px;
          letter-spacing: 5px;
          font-weight: 600;
          margin: 4px 0 12px;
        }

        .invoice-subtitle {
          margin: 0;
          color: #9a825b;
          font-size: 11px;
          letter-spacing: 3px;
          font-weight: 800;
        }

        .invoice-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #b18a43;
          margin: 18px auto 12px;
          max-width: 430px;
        }

        .invoice-divider::before,
        .invoice-divider::after {
          content: '';
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, transparent, #b18a43);
        }

        .invoice-divider::after {
          background: linear-gradient(90deg, #b18a43, transparent);
        }

        .invoice-title {
          display: inline-block;
          margin-top: 4px;
          padding: 9px 35px;
          background: linear-gradient(135deg, #8b672f, #c5a568, #8b672f);
          border: 1px solid #9a743b;
          color: #fffaf0;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 21px;
          letter-spacing: 4px;
          box-shadow: 0 5px 14px rgba(139,103,47,.16);
        }

        .invoice-meta {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
          color: #927b54;
          font-size: 11px;
          font-weight: 700;
        }

        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          padding: 24px 0;
        }

        .invoice-detail-box {
          background: linear-gradient(145deg, #fffefa, #f8f2e6);
          border: 1px solid #e8d8b9;
          border-radius: 8px;
          padding: 17px;
          min-width: 0;
        }

        .invoice-detail-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 14px;
          color: #8c682f;
          font-family: 'DM Sans', Arial, sans-serif;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 800;
          padding-bottom: 9px;
          border-bottom: 1px solid #eadfc9;
        }

        .invoice-detail-box p {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin: 9px 0;
          font-size: 12px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .invoice-detail-box p strong {
          color: #70562f;
          min-width: 83px;
        }

        .invoice-menu-heading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 12px 0 15px;
          color: #8c682f;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          letter-spacing: 1px;
          text-align: center;
        }

        .invoice-menu-heading::before,
        .invoice-menu-heading::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #dfc99e;
        }

        .invoice-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .invoice-table th {
          background: #f2e8d4;
          color: #715329;
          padding: 13px 9px;
          text-align: left;
          border-top: 1px solid #d9c295;
          border-bottom: 2px solid #b18a43;
          font-size: 11px;
          letter-spacing: .3px;
        }

        .invoice-table td {
          padding: 13px 9px;
          border-bottom: 1px solid #eee5d4;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .invoice-table tbody tr:nth-child(even) {
          background: #fcf8ef;
        }

        .invoice-table .amount-cell {
          text-align: right;
          white-space: nowrap;
          font-weight: 700;
          color: #705329;
        }

        .invoice-total-box {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-top: 25px;
          padding: 19px 22px;
          background: linear-gradient(135deg, #f7edda, #fffaf0, #f1e4c9);
          border: 1px solid #c6a76c;
          border-radius: 5px;
          animation: goldShine 3s ease-in-out infinite;
        }

        .invoice-total-box span {
          font-size: 13px;
          font-weight: 800;
          color: #75572a;
          letter-spacing: 2px;
        }

        .invoice-total-box strong {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 33px;
          color: #79572a;
        }

        .invoice-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #e5d5b5;
          text-align: center;
          color: #846a42;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 18px;
          font-style: italic;
        }

        .invoice-footer p {
          margin: 5px 0;
        }

        .invoice-footer .footer-small {
          margin-top: 12px;
          font-family: 'DM Sans', Arial, sans-serif;
          font-style: normal;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #a58b5c;
        }

        /* SHARE PANEL */

        .share-section {
          margin: 28px auto;
          padding: 28px;
          background: linear-gradient(135deg, #352b1d, #51412b);
          border: 1px solid rgba(197,165,104,.4);
          border-radius: 17px;
          color: white;
          box-shadow: 0 16px 40px rgba(0,0,0,.14);
          animation: invoiceEnter .5s ease both;
        }

        .share-section h2 {
          color: #ead6a9;
          margin: 0 0 10px;
          font-size: 24px;
        }

        .share-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 20px;
        }

        .share-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 105px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 13px;
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .28s ease, box-shadow .28s ease, filter .28s ease;
        }

        .share-btn:hover {
          transform: translateY(-6px) scale(1.025);
          filter: brightness(1.08);
        }

        .share-btn:disabled {
          opacity: .6;
          cursor: wait;
          transform: none;
        }

        .share-btn.whatsapp {
          background: linear-gradient(135deg, #20bd5a, #128c45);
        }

        .share-btn.whatsapp:hover {
          box-shadow: 0 12px 28px rgba(37,211,102,.28);
        }

        .share-btn.instagram {
          background: linear-gradient(135deg, #833ab4, #e1306c, #f77737);
        }

        .share-btn.instagram:hover {
          box-shadow: 0 12px 28px rgba(225,48,108,.28);
        }

        .share-btn.facebook {
          background: linear-gradient(135deg, #1877f2, #1059bd);
        }

        .share-btn.facebook:hover {
          box-shadow: 0 12px 28px rgba(24,119,242,.28);
        }

        .print-btn {
          width: 100%;
          margin-top: 14px;
          padding: 16px;
          background: linear-gradient(135deg, #ead8ad, #c4a467);
          color: #352613;
          border: 1px solid #d1b675;
          border-radius: 10px;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform .25s, box-shadow .25s;
        }

        .print-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(197,165,104,.25);
        }

        @media(max-width: 650px) {
          .checkout-page {
            margin: 12px auto;
            padding: 13px;
          }

          .checkout-fields,
          .invoice-details {
            grid-template-columns: 1fr;
          }

          .checkout-card {
            padding: 18px;
          }

          .invoice-print {
            padding: 9px;
          }

          .invoice-inner {
            padding: 13px 9px;
          }

          .invoice-brand {
            font-size: 27px;
          }

          .invoice-brand-sub {
            font-size: 21px;
          }

          .invoice-subtitle {
            font-size: 9px;
            letter-spacing: 1.5px;
          }

          .invoice-title {
            font-size: 17px;
            padding: 8px 22px;
          }

          .invoice-table {
            font-size: 10px;
          }

          .invoice-table th,
          .invoice-table td {
            padding: 8px 4px;
          }

          .invoice-detail-box {
            padding: 13px;
          }

          .invoice-total-box {
            padding: 14px;
          }

          .invoice-total-box strong {
            font-size: 27px;
          }

          .share-section {
            padding: 18px;
          }

          .share-grid {
            gap: 8px;
          }

          .share-btn {
            min-height: 85px;
            font-size: 11px;
            gap: 7px;
          }

          .bill-row {
            flex-wrap: wrap;
          }

          .bill-total {
            font-size: 21px;
          }
        }

        /* PRINT ONLY THE INVOICE CARD */

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fffdf8 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .no-print {
            display: none !important;
          }

          .invoice-print,
          .invoice-print * {
            visibility: visible !important;
          }

          .invoice-print {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 9px !important;
            box-sizing: border-box !important;
            background: #fffdf8 !important;
            color: #342b20 !important;
            border: 2px solid #b18a43 !important;
            border-radius: 5px !important;
            box-shadow: none !important;
            animation: none !important;
            overflow: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .invoice-inner {
            padding: 18px !important;
            background: #fffdf8 !important;
            border: 1px solid #e5d5b5 !important;
          }

          .invoice-header {
            padding: 14px 10px 18px !important;
          }

          .invoice-brand {
            font-size: 32px !important;
            color: #79572a !important;
          }

          .invoice-brand-sub {
            font-size: 22px !important;
          }

          .invoice-details {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
            padding: 16px 0 !important;
          }

          .invoice-detail-box {
            background: #f8f2e6 !important;
            border: 1px solid #e8d8b9 !important;
            padding: 11px !important;
            break-inside: avoid;
          }

          .invoice-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }

          .invoice-table th {
            background: #f2e8d4 !important;
            color: #715329 !important;
            border-bottom: 2px solid #b18a43 !important;
            padding: 9px 6px !important;
          }

          .invoice-table td {
            padding: 8px 6px !important;
            border-bottom: 1px solid #eee5d4 !important;
          }

          .invoice-total-box {
            background: #f7edda !important;
            border: 1px solid #c6a76c !important;
            padding: 14px !important;
            animation: none !important;
            break-inside: avoid;
          }

          .invoice-footer {
            border-top: 1px solid #e5d5b5 !important;
            margin-top: 18px !important;
          }

          .invoice-menu-heading {
            margin: 8px 0 12px !important;
          }

          .invoice-print tr {
            break-inside: avoid;
          }
        }

        @media(prefers-reduced-motion: reduce) {
          .checkout-page *,
          .checkout-page *::before,
          .checkout-page *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* CHECKOUT FORM */}

      <div className="no-print">
        <button
          className="checkout-btn secondary"
          onClick={goBack}
        >
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

                <div
                  style={{
                    fontSize: 13,
                    color: "#777",
                    marginTop: 5,
                  }}
                >
                  ₹{Number(item.price || 0).toFixed(2)} each
                </div>
              </div>

              <div className="quantity-controls">
                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, -1)}
                >
                  <Minus size={13} />
                </button>

                <strong>{item.quantity}</strong>

                <button
                  type="button"
                  onClick={() => changeQuantity(item.id, 1)}
                >
                  <Plus size={13} />
                </button>
              </div>

              <strong>
                ₹{(
                  Number(item.price || 0) *
                  Number(item.quantity || 0)
                ).toFixed(2)}
              </strong>

              <button
                type="button"
                className="remove-dish"
                onClick={() => removeItem(item.id)}
                title="Remove dish"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}

          <div className="bill-total">
            Total: ₹{total.toFixed(2)}
          </div>
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
            <button
              className="checkout-btn"
              onClick={createBill}
            >
              <Receipt size={17} />
              Preview Bill
              <Sparkles size={15} />
            </button>
          </div>
        </section>
      </div>

      {/* INVOICE PREVIEW */}

      {showPreview && (
        <>
          <section className="invoice-print" ref={invoiceRef}>
            <div className="invoice-inner">
              <div className="invoice-header">
                <div className="invoice-ornament">
                  ✦ ❧ ✦
                </div>

                <h1 className="invoice-brand">
                  LAXMI NRUSINGHA
                </h1>

                <div className="invoice-brand-sub">
                  CATTERS
                </div>

                <p className="invoice-subtitle">
                  WEDDING • EVENTS • CATERING
                </p>

                <div className="invoice-divider">
                  <Sparkles size={17} />
                </div>

                <div className="invoice-title">
                  EVENT BILL
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
                    <span>
                      {customer.address || "Not provided"}
                    </span>
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
                    <Users size={13} />
                    <strong>Guests:</strong>
                    <span>{customer.guests}</span>
                  </p>

                  <p>
                    <Utensils size={13} />
                    <strong>Menu Items:</strong>
                    <span>{items.length} dishes</span>
                  </p>
                </div>
              </div>

              <div className="invoice-menu-heading">
                YOUR SELECTED MENU
              </div>

              <div className="invoice-table-wrap">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th style={{ width: "7%" }}>No.</th>
                      <th style={{ width: "35%" }}>Dish</th>
                      <th style={{ width: "28%" }}>Category</th>
                      <th
                        style={{
                          width: "10%",
                          textAlign: "center",
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          width: "20%",
                          textAlign: "right",
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          {item.category_name || "Uncategorized"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {item.quantity}
                        </td>
                        <td className="amount-cell">
                          ₹{(
                            Number(item.price || 0) *
                            Number(item.quantity || 0)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-total-box">
                <span>GRAND TOTAL</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>

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

          {/* PRINT AND SHARE BUTTONS */}

          <section className="share-section no-print">
            <h2>
              <Share2
                size={21}
                style={{
                  verticalAlign: "middle",
                  marginRight: 8,
                }}
              />
              Print & Share Invoice
            </h2>

            <p
              style={{
                color: "#e3d8c2",
                fontSize: 13,
              }}
            >
              Your premium ivory and gold event bill is ready.
            </p>

            <button
              className="print-btn"
              onClick={printBill}
            >
              <Printer size={19} />
              Print Invoice
            </button>

            <button
              className="print-btn"
              onClick={() => {
                const pdf = createInvoicePDF();
                downloadInvoice(pdf);
              }}
            >
              <Download size={19} />
              Download PDF Invoice
            </button>

            <div className="share-grid">
              <button
                type="button"
                className="share-btn whatsapp"
                onClick={() => shareInvoice("whatsapp")}
                disabled={sharing}
              >
                <MessageCircle size={29} />
                {sharing ? "Preparing..." : "WhatsApp"}
              </button>

              <button
                type="button"
                className="share-btn instagram"
                onClick={() => shareInvoice("instagram")}
                disabled={sharing}
              >
                <Share2 size={27} />
                Instagram
              </button>

              <button
                type="button"
                className="share-btn facebook"
                onClick={() => shareInvoice("facebook")}
                disabled={sharing}
              >
                <Share2 size={27} />
                Facebook
              </button>
            </div>

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
                  ? "Your PDF invoice is ready. On supported devices, choose WhatsApp or another app from the share menu."
                  : "Preview your bill to prepare the PDF before sharing."}
            </p>

            <div className="checkout-actions">
              <button
                className="checkout-btn secondary"
                onClick={() => setShowPreview(false)}
              >
                Edit Bill
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Checkout;
