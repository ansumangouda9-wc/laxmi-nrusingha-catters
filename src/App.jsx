
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShoppingCart,
  Plus,
  Minus,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

import { jsPDF } from "jspdf";

import { supabase } from "./lib/supabase";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Checkout from "./pages/Checkout";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import "./App.css";

function OwnerMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState(location.state?.cart || []);
  const [loading, setLoading] = useState(true);
  const [sharingMenu, setSharingMenu] = useState(false);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    if (location.state?.cart) {
      setCart(location.state.cart);
    }
  }, [location.state]);

  async function loadMenu() {
    setLoading(true);
    setError("");

    try {
      const [categoryResult, dishResult] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true }),

        supabase
          .from("menu_items")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (dishResult.error) throw dishResult.error;

      const formattedMenu = (categoryResult.data || []).map((category) => ({
        id: category.id,
        name: category.name,
        is_active: category.is_active,
        items: (dishResult.data || []).filter(
          (dish) => dish.category_id === category.id
        ),
      }));

      setMenu(formattedMenu);
    } catch (err) {
      console.error("Menu loading error:", err);
      setError(err.message || "Unable to load menu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  function toggleGroup(groupId) {
    setExpandedGroups((previous) => ({
      ...previous,
      [groupId]: !previous[groupId],
    }));
  }

  function addItem(dish, categoryName = "") {
    if (dish.is_available === false) return;

    setCart((previous) => {
      const existing = previous.find(
        (item) => String(item.id) === String(dish.id)
      );

      if (existing) {
        return previous.map((item) =>
          String(item.id) === String(dish.id)
            ? {
                ...item,
                category_name: categoryName || item.category_name || "",
                quantity: Number(item.quantity || 0) + 1,
              }
            : item
        );
      }

      return [
        ...previous,
        {
          id: dish.id,
          name: dish.name,
          price: Number(dish.price || 0),
          quantity: 1,
          category_name: categoryName,
        },
      ];
    });
  }

  function changeQuantity(dishId, amount) {
    setCart((previous) =>
      previous
        .map((item) =>
          String(item.id) === String(dishId)
            ? {
                ...item,
                quantity: Number(item.quantity || 0) + amount,
              }
            : item
        )
        .filter((item) => Number(item.quantity || 0) > 0)
    );
  }

  function getCartItem(dishId) {
    return cart.find(
      (item) => String(item.id) === String(dishId)
    );
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  // ------------------------------------------------
  // PREMIUM MENU PDF
  // ------------------------------------------------

  function createMenuPDF() {
    if (!menu.length) {
      throw new Error("The menu is empty.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const gold = [151, 112, 48];
    const darkGold = [104, 75, 35];
    const paleGold = [246, 239, 224];
    const cream = [255, 253, 247];
    const ink = [58, 48, 35];
    const muted = [139, 119, 87];
    const unavailableColor = [157, 87, 69];

    let y = 16;
    let pageNumber = 1;

    function drawPageBackground() {
      pdf.setFillColor(...cream);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setDrawColor(...gold);
      pdf.setLineWidth(0.65);
      pdf.rect(7, 7, pageWidth - 14, pageHeight - 14);

      pdf.setDrawColor(220, 202, 165);
      pdf.setLineWidth(0.25);
      pdf.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);
    }

    function drawHeader() {
      drawPageBackground();

      pdf.setTextColor(...gold);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("✦", pageWidth / 2 - 37, y + 3, {
        align: "center",
      });
      pdf.text("✦", pageWidth / 2 + 37, y + 3, {
        align: "center",
      });

      y += 10;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(23);
      pdf.setTextColor(...darkGold);
      pdf.text("LAXMI NRUSINGHA", pageWidth / 2, y, {
        align: "center",
      });

      y += 9;
      pdf.setFontSize(17);
      pdf.setTextColor(...gold);
      pdf.text("CATTERS", pageWidth / 2, y, {
        align: "center",
      });

      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      pdf.text(
        "W E D D I N G   •   E V E N T S   •   C A T E R I N G",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      y += 7;
      pdf.setDrawColor(...gold);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 17, y, pageWidth - margin - 17, y);

      y += 9;

      pdf.setFillColor(...paleGold);
      pdf.roundedRect(
        pageWidth / 2 - 26,
        y - 5,
        52,
        10,
        2,
        2,
        "F"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...darkGold);
      pdf.text("OUR MENU", pageWidth / 2, y + 1.5, {
        align: "center",
      });

      y += 12;

      if (pageNumber === 1) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...muted);
        pdf.text(
          "A delightful selection for your special occasions",
          pageWidth / 2,
          y,
          { align: "center" }
        );
        y += 10;
      } else {
        y += 3;
      }
    }

    function addNewPage() {
      pdf.addPage();
      pageNumber += 1;
      y = 16;
      drawHeader();
    }

    function ensureSpace(requiredHeight) {
      if (y + requiredHeight > pageHeight - 20) {
        addNewPage();
      }
    }

    drawHeader();

    menu.forEach((category) => {
      const dishes = category.items || [];

      if (!dishes.length) return;

      ensureSpace(18);

      pdf.setFillColor(...paleGold);
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        10,
        1.5,
        1.5,
        "F"
      );

      pdf.setDrawColor(222, 205, 171);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(
        margin,
        y,
        contentWidth,
        10,
        1.5,
        1.5,
        "S"
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...darkGold);
      pdf.text(
        String(category.name || "Menu Category").toUpperCase(),
        margin + 4,
        y + 6.6
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text(
        `${dishes.length} ITEMS`,
        pageWidth - margin - 4,
        y + 6.5,
        { align: "right" }
      );

      y += 14;

      dishes.forEach((dish, index) => {
        const name = String(dish.name || "Dish");
        const isUnavailable = dish.is_available === false;
        const nameLines = pdf.splitTextToSize(name, contentWidth - 30);
        const rowHeight = Math.max(7, nameLines.length * 4.4 + 2);

        ensureSpace(rowHeight + 1);

        if (index % 2 === 1) {
          pdf.setFillColor(252, 249, 241);
          pdf.roundedRect(
            margin + 1,
            y - 1,
            contentWidth - 2,
            rowHeight,
            1,
            1,
            "F"
          );
        }

        pdf.setFillColor(...gold);
        pdf.circle(margin + 5, y + 3, 0.75, "F");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...ink);
        pdf.text(nameLines, margin + 10, y + 4);

        if (isUnavailable) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(6.5);
          pdf.setTextColor(...unavailableColor);
          pdf.text("Unavailable", pageWidth - margin - 3, y + 4, {
            align: "right",
          });
        }

        pdf.setDrawColor(235, 226, 209);
        pdf.setLineWidth(0.2);
        pdf.line(
          margin + 9,
          y + rowHeight,
          pageWidth - margin - 3,
          y + rowHeight
        );

        y += rowHeight + 1.5;
      });

      y += 5;
    });

    ensureSpace(23);

    y += 2;
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(0.45);
    pdf.line(margin + 12, y, pageWidth - margin - 12, y);

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...darkGold);
    pdf.text(
      "Thank you for considering Laxmi Nrusingha Catters",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    y += 5;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(
      "We look forward to being part of your special celebration.",
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

  async function shareMenuOnWhatsApp() {
    if (loading || !menu.length) {
      alert("The menu is not loaded yet. Please try again.");
      return;
    }

    if (sharingMenu) return;

    setSharingMenu(true);

    try {
      const pdf = createMenuPDF();
      const blob = pdf.output("blob");

      if (!blob || blob.size === 0) {
        throw new Error("The menu PDF could not be created.");
      }

      const file = new File(
        [blob],
        "Laxmi-Nrusingha-Premium-Catering-Menu.pdf",
        { type: "application/pdf" }
      );

      const caption =
        "🍽️ LAXMI NRUSINGHA CATTERS\n" +
        "WEDDING • EVENTS • CATERING\n\n" +
        "Please find our catering menu attached. We would be delighted to be part of your special occasion.";

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Laxmi Nrusingha Premium Catering Menu",
          text: caption,
          files: [file],
        });

        return;
      }

      pdf.save("Laxmi-Nrusingha-Premium-Catering-Menu.pdf");

      const whatsappUrl =
        "https://wa.me/?text=" +
        encodeURIComponent(
          caption +
            "\n\nThe menu PDF has been downloaded. Please attach the downloaded PDF before sending."
        );

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err?.name === "AbortError") return;

      console.error("Menu sharing error:", err);
      alert("Unable to prepare the menu PDF. Please try again.");
    } finally {
      setSharingMenu(false);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      alert(logoutError.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  // ------------------------------------------------
  // DISH DISPLAY
  // ------------------------------------------------

  function renderDish(dish, nested = false, categoryName = "") {
    const selectedItem = getCartItem(dish.id);
    const unavailable = dish.is_available === false;

    return (
      <div
        className={`menu-item ${nested ? "group-dish-item" : ""}`}
        key={dish.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          padding: "14px 10px",
          flexWrap: "wrap",
          ...(nested ? { paddingLeft: "24px" } : {}),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: "180px",
          }}
        >
          {dish.image_url && (
            <img
              src={dish.image_url}
              alt={dish.name}
              loading="lazy"
              style={{
                width: "58px",
                height: "58px",
                objectFit: "cover",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            />
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <strong>{dish.name}</strong>

              {unavailable && (
                <span className="unavailable-premium">
                  Currently Unavailable
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {unavailable ? (
            <span
              style={{
                color: "#9b7650",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              Not selectable
            </span>
          ) : selectedItem ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: "1px solid #b99a55",
                borderRadius: "8px",
                padding: "5px 9px",
              }}
            >
              <button
                type="button"
                onClick={() => changeQuantity(dish.id, -1)}
                style={quantityButtonStyle}
                aria-label={`Decrease ${dish.name}`}
              >
                <Minus size={15} />
              </button>

              <strong>{selectedItem.quantity}</strong>

              <button
                type="button"
                onClick={() => addItem(dish, categoryName)}
                style={quantityButtonStyle}
                aria-label={`Increase ${dish.name}`}
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addItem(dish, categoryName)}
              style={{
                padding: "9px 16px",
                background: "#b99a55",
                color: "#15130f",
                border: "none",
                borderRadius: "7px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // GROUP DISHES BY DISH GROUP NAME
  // ------------------------------------------------

  function renderCategoryItems(category) {
    const entries = [];
    const groups = new Map();

    (category.items || []).forEach((dish) => {
      const groupName = dish.group_name?.trim();

      // Dishes without a group name appear normally.
      if (!groupName) {
        entries.push({
          type: "dish",
          id: dish.id,
          dish,
        });

        return;
      }

      const normalizedName = groupName.toLowerCase();

      // Create a group only once.
      if (!groups.has(normalizedName)) {
        const group = {
          type: "group",
          id: `${category.id}-${normalizedName}`,
          name: groupName,
          items: [],
        };

        groups.set(normalizedName, group);
        entries.push(group);
      }

      // Add each dish to its matching group.
      groups.get(normalizedName).items.push(dish);
    });

    return entries.map((entry) => {
      if (entry.type === "dish") {
        return renderDish(entry.dish, false, category.name);
      }

      const expanded = Boolean(expandedGroups[entry.id]);

      return (
        <div
          className={`dish-group ${expanded ? "dish-group-expanded" : ""}`}
          key={entry.id}
        >
          <button
            type="button"
            className="dish-group-header"
            onClick={() => toggleGroup(entry.id)}
            aria-expanded={expanded}
          >
            <span className="dish-group-title">
              <span className="dish-group-icon">
                {expanded ? <Minus size={18} /> : <Plus size={18} />}
              </span>

              <span>
                <strong>{entry.name}</strong>
                <small>
                  {entry.items.length}{" "}
                  {entry.items.length === 1 ? "item" : "items"}
                </small>
              </span>
            </span>

            <span className="dish-group-indicator">
              {expanded ? "−" : "+"}
            </span>
          </button>

          <div
            className={`dish-group-content ${
              expanded ? "dish-group-content-open" : ""
            }`}
            aria-hidden={!expanded}
          >
            {expanded &&
              entry.items.map((dish) =>
                renderDish(dish, true, category.name)
              )}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="app">
      <style>{`
        .premium-menu-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }

        .premium-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 13px 19px;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .premium-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 18px rgba(0,0,0,.12);
        }

        .premium-action:disabled {
          opacity: .65;
          cursor: wait;
          transform: none;
        }

        .premium-share {
          color: #fff;
          border: 1px solid #147b43;
          background: linear-gradient(135deg,#1fa65a,#116b3c);
        }

        .premium-dashboard {
          color: #2c2111;
          border: 1px solid #b99a55;
          background: linear-gradient(135deg,#ead7a9,#b99a55);
        }

        .premium-logout {
          color: #b99a55;
          border: 1px solid #b99a55;
          background: transparent;
        }

        .premium-menu-note {
          color: #94794a;
          font-size: 12px;
          text-align: right;
          margin-top: -20px;
          margin-bottom: 24px;
        }

        /* Expandable dish groups */

        .dish-group {
          margin: 10px 0;
          border: 1px solid rgba(185,154,85,.35);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(185,154,85,.045);
          transition: border-color .25s ease, box-shadow .25s ease;
        }

        .dish-group-expanded {
          border-color: #b99a55;
          box-shadow: 0 5px 16px rgba(80,55,15,.07);
        }

        .dish-group-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          background: transparent;
          color: inherit;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background .2s ease;
        }

        .dish-group-header:hover {
          background: rgba(185,154,85,.10);
        }

        .dish-group-title {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .dish-group-title > span:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .dish-group-title strong {
          font-size: 16px;
          color: inherit;
        }

        .dish-group-title small {
          font-size: 12px;
          opacity: .65;
        }

        .dish-group-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 9px;
          background: rgba(185,154,85,.17);
          color: #9b783c;
        }

        .dish-group-indicator {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(185,154,85,.15);
          color: #9b783c;
          font-size: 20px;
          font-weight: 700;
        }

        .dish-group-content {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: opacity .25s ease;
        }

        .dish-group-content-open {
          grid-template-rows: 1fr;
          opacity: 1;
          border-top: 1px solid rgba(185,154,85,.22);
          animation: dishGroupSlide .28s ease;
        }

        .group-dish-item {
          background: rgba(255,255,255,.30);
          border-bottom: 1px solid rgba(185,154,85,.16);
        }

        .group-dish-item:last-child {
          border-bottom: none;
        }

        @keyframes dishGroupSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media(max-width:600px) {
          .premium-menu-actions {
            justify-content: stretch;
          }

          .premium-action {
            flex: 1 1 100%;
          }

          .premium-menu-note {
            text-align: center;
            margin-top: -15px;
          }

          .dish-group-header {
            padding: 13px 12px;
          }

          .dish-group-title strong {
            font-size: 15px;
          }

          .group-dish-item {
            padding-left: 12px !important;
          }
        }
      `}</style>

      <header className="header">
        <h1>LAXMI NRUSINGHA CATTERS</h1>
        <p>WEDDING • EVENTS • CATERING</p>
      </header>

      <main className="container">
        <div className="heading">
          <span>OWNER PANEL</span>
          <h2>Food Menu</h2>
          <p>Select dishes to prepare your customer bill</p>
        </div>

        <div className="premium-menu-actions">
          <button
            type="button"
            className="premium-action premium-share"
            onClick={shareMenuOnWhatsApp}
            disabled={loading || sharingMenu}
          >
            <MessageCircle size={18} />
            {sharingMenu
              ? "Preparing Menu PDF..."
              : "Share Premium Menu"}
          </button>

          <button
            type="button"
            className="premium-action premium-dashboard"
            onClick={() => navigate("/admin/dashboard")}
          >
            <LayoutDashboard size={18} />
            Admin Dashboard
          </button>

          <button
            type="button"
            className="premium-action premium-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>

        <p className="premium-menu-note">
          Share a beautifully formatted PDF of your complete catering menu.
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "30px" }}>
            <RefreshCw size={22} />
            <p>Loading menu...</p>
          </div>
        )}

        {error && (
          <div role="alert" className="admin-error">
            {error}
            <button
              type="button"
              onClick={loadMenu}
              style={{ marginLeft: "12px" }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && menu.length === 0 && (
          <p>No categories found. Add categories from Admin Dashboard.</p>
        )}

        {!loading &&
          !error &&
          menu.map((category) => (
            <section className="category" key={category.id}>
              <h3>
                {category.name}

                {!category.is_active && (
                  <small
                    style={{
                      marginLeft: "10px",
                      color: "#c87965",
                      fontSize: "12px",
                    }}
                  >
                    Hidden
                  </small>
                )}
              </h3>

              {category.items.length > 0 ? (
                renderCategoryItems(category)
              ) : (
                <p>No dishes in this category yet.</p>
              )}
            </section>
          ))}
      </main>

      {totalItems > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "0",
            left: "0",
            right: "0",
            zIndex: 1000,
            background: "#201b13",
            color: "#fff",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 -4px 18px rgba(0,0,0,0.2)",
          }}
        >
          <div>
            <strong>{totalItems} items selected</strong>
            <div style={{ color: "#d8bd83", fontSize: "13px" }}>
              Your selected dishes are ready for checkout.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/checkout", {
                state: { cart, menu },
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              padding: "13px 20px",
              background: "#b99a55",
              color: "#15130f",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <ShoppingCart size={18} />
            Proceed to Checkout
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

const quantityButtonStyle = {
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  color: "#8b6b32",
  cursor: "pointer",
};

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLogin />} />

      <Route element={<ProtectedAdminRoute />}>
        <Route path="/" element={<OwnerMenu />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
