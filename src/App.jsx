
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
} from "lucide-react";

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

      const formattedMenu = (categoryResult.data || []).map(
        (category) => ({
          id: category.id,
          name: category.name,
          is_active: category.is_active,
          items: (dishResult.data || []).filter(
            (dish) => dish.category_id === category.id
          ),
        })
      );

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
        (item) => item.id === dish.id
      );

      if (existing) {
        return previous.map((item) =>
          item.id === dish.id
            ? {
                ...item,
                category_name:
                  categoryName || item.category_name || "",
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
          item.id === dishId
            ? {
                ...item,
                quantity: Number(item.quantity || 0) + amount,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function getCartItem(dishId) {
    return cart.find((item) => item.id === dishId);
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const totalAmount = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      alert(logoutError.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  function renderDish(dish, nested = false, categoryName = "") {
    const selectedItem = getCartItem(dish.id);
    const unavailable = dish.is_available === false;

    return (
      <div
        className="menu-item"
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

            <div
              style={{
                fontSize: "13px",
                opacity: 0.75,
                marginTop: "5px",
              }}
            >
              ₹{Number(dish.price || 0).toFixed(2)}
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

  function renderCategoryItems(category) {
    const entries = [];
    const groups = new Map();

    category.items.forEach((dish) => {
      const groupName = dish.group_name?.trim();

      if (!groupName) {
        entries.push({
          type: "dish",
          id: dish.id,
          dish,
        });
        return;
      }

      const normalizedName = groupName.toLowerCase();

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

      groups.get(normalizedName).items.push(dish);
    });

    return entries.map((entry) => {
      if (entry.type === "dish") {
        return renderDish(entry.dish, false, category.name);
      }

      const expanded = Boolean(expandedGroups[entry.id]);

      return (
        <div
          key={entry.id}
          style={{
            borderBottom: "1px solid rgba(185,154,85,0.2)",
          }}
        >
          <button
            type="button"
            onClick={() => toggleGroup(entry.id)}
            aria-expanded={expanded}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 10px",
              background: "transparent",
              color: "inherit",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            <span>
              {entry.name} ({entry.items.length} recipes)
            </span>
            <span>{expanded ? "−" : "+"}</span>
          </button>

          {expanded &&
            entry.items.map((dish) =>
              renderDish(dish, true, category.name)
            )}
        </div>
      );
    });
  }

  return (
    <div className="app">
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

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "30px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
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
              fontSize: "15px",
            }}
          >
            <LayoutDashboard size={18} />
            Go to Admin Dashboard
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "13px 18px",
              background: "transparent",
              color: "#b99a55",
              border: "1px solid #b99a55",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>

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
            <div style={{ color: "#d8bd83", fontSize: "14px" }}>
              Total: ₹{totalAmount.toFixed(2)}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/checkout", {
                state: { cart },
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

      <Route
        path="*"
        element={<Navigate to="/admin" replace />}
      />
    </Routes>
  );
}

export default App;
