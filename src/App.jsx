
import { useState } from "react";
import "./App.css";

const menu = [
  {
    category: "🥗 Plate Counter",
    items: [
      "Green Salad", "Pasta Salad", "Khira Sagar Salad",
      "Italian Salad", "Papad", "Pineapple Jelly",
      "Ambasadha Jelly", "Tomato Fruits Jelly",
    ],
  },
  {
    category: "🥤 Welcome",
    items: ["Mocktail", "Fruit Juice", "Fruit Salad"],
  },
  {
    category: "🍲 Veg Soup",
    items: [
      "Lemon Coriander Soup", "Veg Bond Garlic Soup",
      "Veg Manchow Soup",
    ],
  },
  {
    category: "🍗 Non-Veg Soup",
    items: [
      "Chicken Bond Garlic Soup", "Chicken Hot and Sour Soup",
      "Chicken Manchow Soup",
    ],
  },
  {
    category: "🥦 Veg Starters",
    items: [
      "Gupchup", "Pastry Counter", "Dahi Papdi Chaat",
      "Mini Dosa", "Corn Cheese Ball", "Crispy Baby Corn",
      "Paneer Tikka", "Veg Spring Roll",
    ],
  },
  {
    category: "🍗 Non-Veg Starters",
    items: [
      "Chicken Tangdi Kabab", "Chicken Cutlet",
      "Chicken Lollipop", "Prawn Gold Coin",
      "Fish Finger", "Crab Stick", "Mutton Cutlet",
    ],
  },
  {
    category: "🍛 Veg Main Course",
    items: [
      "Paneer Butter Masala", "Paneer Chilli",
      "Mushroom Masala", "Palak Corn", "Navratan Kurma",
    ],
  },
  {
    category: "🍖 Non-Veg Main Course",
    items: [
      "Chicken Mughlai", "Chicken Butter Masala",
      "Mutton Rogan Josh", "Fish Kalia",
      "Prawn Masala", "Crab Curry",
    ],
  },
  {
    category: "🍚 Rice & Breads",
    items: [
      "Plain Rice", "Jeera Rice", "Fried Rice",
      "Biryani", "Chapati", "Rumali Roti", "Naan", "Kulcha",
    ],
  },
  {
    category: "🍨 Sweets",
    items: [
      "Ice Cream", "Rasmalai", "Gulab Jamun",
      "Apple Jalebi", "Kheer Sagar", "Gajar Halwa",
    ],
  },
];

function App() {
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    eventDate: "",
    guests: "",
    address: "",
  });

  const [billNumber] = useState(
    "LN" + Date.now().toString().slice(-7)
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  function addItem(name) {
    setCart((old) => {
      const found = old.find((item) => item.name === name);

      if (found) {
        return old.map((item) =>
          item.name === name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...old, { name, quantity: 1 }];
    });
  }

  function changeQuantity(name, amount) {
    setCart((old) =>
      old
        .map((item) =>
          item.name === name
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function updateCustomer(event) {
    const { name, value } = event.target;

    setCustomer((old) => ({
      ...old,
      [name]: value,
    }));
  }

  const previewInvoice = () => {
  if (
    !customer.name.trim() ||
    !customer.phone.trim() ||
    !customer.eventDate ||
    !customer.guests ||
    Number(customer.guests) <= 0
  ) {
    alert("Please fill all required customer details.");
    return;
  }

  if (totalItems === 0) {
    alert("Please add at least one menu item.");
    return;
  }

  setShowInvoice(true);
};

  function sendWhatsAppOrder(event) {
    event.preventDefault();

    const businessWhatsApp = "917606913324";

    if (businessWhatsApp.includes("X")) {
      alert("Please add the catering business WhatsApp number in App.jsx first.");
      return;
    }

    const orderItems = cart
      .map((item) => `${item.name} x ${item.quantity}`)
      .join("\n");

    const message = `
NEW CATERING ORDER

Name: ${customer.name}
Phone: ${customer.phone}
Event Date: ${customer.eventDate}
Number of Guests: ${customer.guests}
Address: ${customer.address}

SELECTED MENU:
${orderItems}

Total Items: ${totalItems}

Final Price: To be confirmed by Laxmi Nrusingha Catters.
    `;

    const url = `https://wa.me/${businessWhatsApp}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  return (
    <div className="app">
      <header className="header">
        <h1>LAXMI NRUSINGHA CATTERS</h1>
        <p>WEDDING • EVENTS • CATERING</p>
      </header>

      <main className="container">
        <div className="heading">
          <span>WELCOME TO OUR CATERING</span>
          <h2>{showCheckout ? "Checkout" : "Food Menu"}</h2>
          <p>
            {showCheckout
              ? "Please provide your event details"
              : "Choose your favourite dishes"}
          </p>
        </div>

        {!showCheckout ? (
          <>
            {menu.map((section) => (
              <section className="category" key={section.category}>
                <h3>{section.category}</h3>

                {section.items.map((name) => {
                  const selected = cart.find(
                    (item) => item.name === name
                  );

                  return (
                    <div className="menu-item" key={name}>
                      <span>{name}</span>

                      {selected ? (
                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() => changeQuantity(name, -1)}
                          >
                            −
                          </button>

                          <strong>{selected.quantity}</strong>

                          <button
                            type="button"
                            onClick={() => changeQuantity(name, 1)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="add"
                          onClick={() => addItem(name)}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}
          </>
        ) : (
          <section className="category checkout-section">
            <h3>Customer Details</h3>

            <form onSubmit={sendWhatsAppOrder}>
              <label>Your Name *</label>
              <input
                type="text"
                name="name"
                value={customer.name}
                onChange={updateCustomer}
                placeholder="Enter your full name"
                required
              />

              <label>Mobile Number *</label>
              <input
                name="phone"
                type="tel"
                value={customer.phone}
                onChange={updateCustomer}
                placeholder="Enter your mobile number"
                pattern="[0-9]{10}"
                maxLength="10"
                required
              />

              <label>Event Date *</label>
              <input
                name="eventDate"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={customer.eventDate}
                onChange={updateCustomer}
                required
              />

              <label>Number of Guests *</label>
              <input
                name="guests"
                type="number"
                min="1"
                value={customer.guests}
                onChange={updateCustomer}
                placeholder="Enter number of guests"
                required
              />

              <label>Event Address</label>
              <textarea
                name="address"
                value={customer.address}
                onChange={updateCustomer}
                placeholder="Enter event location"
                rows="3"
              />

              <h3 className="order-heading">Your Selected Menu</h3>

              {cart.map((item) => (
                <div className="menu-item" key={item.name}>
                  <span>{item.name}</span>
                  <strong>× {item.quantity}</strong>
                </div>
              ))}

              <div className="checkout-summary">
                <p>Total Selected Items: <strong>{totalItems}</strong></p>
                <p>Final Amount: <strong>To Be Confirmed</strong></p>
              </div>

              <button
                type="button"
                className="invoice-preview-btn"
                onClick={previewInvoice}
              >
                Preview Invoice
              </button>

              <button
                className="whatsapp-btn"
                type="submit"
                disabled={cart.length === 0}
              >
                Send Order on WhatsApp
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => {
                  setShowCheckout(false);
                  setShowInvoice(false);
                }}
              >
                ← Back to Menu
              </button>
            </form>

            {/* INVOICE POPUP */}
            {showInvoice && (
              <div
                className="invoice-overlay"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowInvoice(false);
                  }
                }}
              >
                <div className="invoice-modal">

                  <div className="invoice-modal-header">
                    <h2>Invoice Preview</h2>

                    <button
                      type="button"
                      onClick={() => setShowInvoice(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="print-bill">

                    <div className="invoice-brand">
                      <div className="invoice-logo">LN</div>
                      <h1>LAXMI NRUSINGHA CATTERS</h1>
                      <p>WEDDING • EVENTS • CATERING</p>
                      <p className="invoice-tagline">
                        Making Every Celebration Special
                      </p>
                    </div>

                    <div className="invoice-title">
                      <h2>ORDER INVOICE</h2>
                      <p><strong>Bill No:</strong> {billNumber}</p>
                      <p>
                        <strong>Invoice Date:</strong>{" "}
                        {new Date().toLocaleDateString("en-IN")}
                      </p>
                    </div>

                    <div className="invoice-customer">
                      <h3>Customer Information</h3>
                      <p><strong>Name:</strong> {customer.name}</p>
                      <p><strong>Phone:</strong> {customer.phone}</p>
                      <p><strong>Event Date:</strong> {customer.eventDate}</p>
                      <p><strong>Guests:</strong> {customer.guests}</p>
                      <p>
                        <strong>Address:</strong>{" "}
                        {customer.address || "Not provided"}
                      </p>
                    </div>

                    <h3 className="invoice-menu-title">Order Details</h3>

                    <table className="bill-table">
                      <thead>
                        <tr>
                          <th>Sl. No.</th>
                          <th>Food Item</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>

                      <tbody>
                        {cart.map((item, index) => (
                          <tr key={item.name}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="invoice-total">
                      <p>
                        Total Food Items: <strong>{cart.length}</strong>
                      </p>
                      <p>
                        Total Quantity: <strong>{totalItems}</strong>
                      </p>
                      <h2>Grand Total: Price To Be Confirmed</h2>
                    </div>

                    <div className="invoice-footer">
                      <p>Thank you for choosing Laxmi Nrusingha Catters!</p>
                      <p>We look forward to serving you.</p>
                    </div>

                  </div>

                  <div className="invoice-modal-actions">
                    <button
                      type="button"
                      className="invoice-close-btn"
                      onClick={() => setShowInvoice(false)}
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      className="invoice-print-btn"
                      onClick={() => window.print()}
                    >
                      🖨 Print Invoice
                    </button>
                  </div>

                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {!showCheckout && cart.length > 0 && (
        <div className="cart-bar">
          <div>
            <strong>{totalItems} Items Selected</strong>
            <p>Price on request</p>
          </div>

          <button
            className="checkout-btn"
            onClick={() => setShowCheckout(true)}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
