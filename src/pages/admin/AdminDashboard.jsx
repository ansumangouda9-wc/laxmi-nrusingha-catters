
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  LogOut,
  UtensilsCrossed,
  Layers,
  ImagePlus,
  X,
  RefreshCw,
} from "lucide-react";
import "./Admin.css";

const emptyDish = {
  name: "",
  category_id: "",
  price: "",
  image_url: "",
  is_available: true,
};

function AdminDashboard() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [dishForm, setDishForm] = useState(emptyDish);
  const [editingId, setEditingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  async function loadDashboard() {
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

      setCategories(categoryResult.data || []);
      setDishes(dishResult.data || []);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function showNotice(message) {
    setNotice(message);
    setError("");
  }

  function resetDishForm() {
    setDishForm(emptyDish);
    setEditingId(null);
    setSelectedImage(null);
  }

  function editDish(dish) {
    setDishForm({
      name: dish.name || "",
      category_id: dish.category_id || "",
      price: dish.price ?? "",
      image_url: dish.image_url || "",
      is_available: dish.is_available ?? true,
    });

    setEditingId(dish.id);
    setSelectedImage(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadDishImage(file) {
    if (!file) return dishForm.image_url || null;

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be smaller than 5 MB.");
    }

    const extension = file.name.split(".").pop().toLowerCase();
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveDish(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      if (!dishForm.name.trim()) {
        throw new Error("Enter the dish name.");
      }

      if (!dishForm.category_id) {
        throw new Error("Please select a category.");
      }

      const imageUrl = await uploadDishImage(selectedImage);

      const dishData = {
        name: dishForm.name.trim(),
        category_id: dishForm.category_id,
        price:
          dishForm.price === "" ? null : Number(dishForm.price),
        image_url: imageUrl,
        is_available: dishForm.is_available,
      };

      if (
        dishData.price !== null &&
        (!Number.isFinite(dishData.price) || dishData.price < 0)
      ) {
        throw new Error("Enter a valid non-negative price.");
      }

      let result;

      if (editingId) {
        result = await supabase
          .from("menu_items")
          .update(dishData)
          .eq("id", editingId);
      } else {
        result = await supabase
          .from("menu_items")
          .insert([dishData]);
      }

      if (result.error) throw result.error;

      showNotice(editingId ? "Dish updated successfully!" : "Dish added successfully!");
      resetDishForm();
      await loadDashboard();
    } catch (err) {
      console.error("Saving dish error:", err);
      setError(err.message || "Unable to save dish.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(dish) {
    setError("");
    setNotice("");

    const { error: updateError } = await supabase
      .from("menu_items")
      .update({ is_available: !dish.is_available })
      .eq("id", dish.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    showNotice(`${dish.name} availability updated.`);
    await loadDashboard();
  }

  async function deleteDish(dish) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${dish.name}"?`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", dish.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    showNotice("Dish deleted successfully!");
    await loadDashboard();
  }

  async function addCategory(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = newCategory.trim();

    if (!name) return;

    const { error: insertError } = await supabase
      .from("categories")
      .insert([{ name }]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewCategory("");
    showNotice("Category added successfully!");
    await loadDashboard();
  }

  async function renameCategory(categoryId) {
    const name = editingCategoryName.trim();

    if (!name) {
      setError("Category name cannot be empty.");
      return;
    }

    const { error: updateError } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", categoryId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    showNotice("Category renamed successfully!");
    await loadDashboard();
  }

  async function toggleCategory(category) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    showNotice("Category status updated.");
    await loadDashboard();
  }

  async function deleteCategory(category) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? Categories containing dishes cannot be deleted.`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (deleteError) {
      setError(
        "Unable to delete this category. Remove or move its dishes first."
      );
      return;
    }

    showNotice("Category deleted successfully!");
    await loadDashboard();
  }

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    navigate("/admin", { replace: true });
  }

  const availableCount = dishes.filter(
    (dish) => dish.is_available
  ).length;

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw size={24} />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <div>
          <span className="admin-topbar-label">LAXMI NRUSINGHA CATTERS</span>
          <h1>Admin Dashboard</h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Return to menu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              minHeight: "42px",
              padding: "10px 16px",
              border: "1px solid rgba(212, 175, 95, 0.55)",
              borderRadius: "10px",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={17} />
            Back to Menu
          </button>

          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <section className="admin-stats">
        <div className="admin-stat-card">
          <UtensilsCrossed size={23} />
          <div>
            <span>Total Dishes</span>
            <strong>{dishes.length}</strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <Layers size={23} />
          <div>
            <span>Categories</span>
            <strong>{categories.length}</strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <ImagePlus size={23} />
          <div>
            <span>Available Dishes</span>
            <strong>{availableCount}</strong>
          </div>
        </div>
      </section>

      {notice && <div className="admin-success">{notice}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-section-label">MENU MANAGEMENT</span>
            <h2>{editingId ? "Edit Dish" : "Add New Dish"}</h2>
          </div>

          {editingId && (
            <button className="admin-cancel-btn" onClick={resetDishForm}>
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        <form className="admin-dish-form" onSubmit={saveDish}>
          <div className="admin-form-grid">
            <div>
              <label>Dish Name *</label>
              <input
                type="text"
                value={dishForm.name}
                onChange={(e) =>
                  setDishForm({ ...dishForm, name: e.target.value })
                }
                placeholder="Example: Paneer Butter Masala"
                required
              />
            </div>

            <div>
              <label>Category *</label>
              <select
                value={dishForm.category_id}
                onChange={(e) =>
                  setDishForm({
                    ...dishForm,
                    category_id: e.target.value,
                  })
                }
                required
              >
                <option value="">Select category</option>
                {categories
                  .filter((category) => category.is_active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dishForm.price}
                onChange={(e) =>
                  setDishForm({ ...dishForm, price: e.target.value })
                }
                placeholder="Leave blank if price is on request"
              />
            </div>

            <div>
              <label>Food Photo (Maximum 5 MB)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setSelectedImage(e.target.files?.[0] || null)
                }
              />
              {dishForm.image_url && !selectedImage && (
                <small>Existing photo will be retained.</small>
              )}
            </div>
          </div>

          <label className="admin-availability-check">
            <input
              type="checkbox"
              checked={dishForm.is_available}
              onChange={(e) =>
                setDishForm({
                  ...dishForm,
                  is_available: e.target.checked,
                })
              }
            />
            Dish available to customers
          </label>

          <button className="admin-primary-btn" type="submit" disabled={saving}>
            <Plus size={18} />
            {saving
              ? "Saving..."
              : editingId
                ? "Update Dish"
                : "Add Dish"}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-section-label">YOUR MENU</span>
            <h2>Manage Dishes</h2>
          </div>

          <button className="admin-refresh-btn" onClick={loadDashboard}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {dishes.length === 0 ? (
          <p className="admin-empty">
            No dishes yet. Add your first dish above.
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {dishes.map((dish) => {
                  const category = categories.find(
                    (item) => item.id === dish.category_id
                  );

                  return (
                    <tr key={dish.id}>
                      <td>
                        <div className="admin-dish-cell">
                          {dish.image_url ? (
                            <img src={dish.image_url} alt={dish.name} />
                          ) : (
                            <div className="admin-no-image">
                              <ImagePlus size={18} />
                            </div>
                          )}
                          <strong>{dish.name}</strong>
                        </div>
                      </td>

                      <td>{category?.name || "Unknown"}</td>

                      <td>
                        {dish.price == null
                          ? "On request"
                          : `₹${Number(dish.price).toFixed(2)}`}
                      </td>

                      <td>
                        <label className="admin-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(dish.is_available)}
                            onChange={() => toggleAvailability(dish)}
                          />
                          <span className="admin-switch-slider" />
                        </label>
                      </td>

                      <td>
                        <div className="admin-actions">
                          <button
                            title="Edit dish"
                            onClick={() => editDish(dish)}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            title="Delete dish"
                            className="admin-delete-action"
                            onClick={() => deleteDish(dish)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-section-label">ORGANIZE YOUR MENU</span>
            <h2>Manage Categories</h2>
          </div>
        </div>

        <form className="admin-category-form" onSubmit={addCategory}>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter new category name"
            required
          />

          <button type="submit" className="admin-primary-btn">
            <Plus size={17} /> Add Category
          </button>
        </form>

        <div className="admin-category-list">
          {categories.map((category) => (
            <div className="admin-category-row" key={category.id}>
              {editingCategoryId === category.id ? (
                <input
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                />
              ) : (
                <strong>{category.name}</strong>
              )}

              <span className={category.is_active ? "status-active" : "status-inactive"}>
                {category.is_active ? "Active" : "Hidden"}
              </span>

              <div className="admin-actions">
                {editingCategoryId === category.id ? (
                  <>
                    <button onClick={() => renameCategory(category.id)}>
                      Save
                    </button>
                    <button onClick={() => setEditingCategoryId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      title="Rename category"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      title="Show or hide category"
                      onClick={() => toggleCategory(category)}
                    >
                      {category.is_active ? "Hide" : "Show"}
                    </button>

                    <button
                      title="Delete category"
                      className="admin-delete-action"
                      onClick={() => deleteCategory(category)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <p className="admin-empty">
              No categories yet. Add your first category above.
            </p>
          )}
        </div>
      </section>

      <footer className="admin-footer">
        Laxmi Nrusingha Catters · Menu Administration
      </footer>
    </main>
  );
}

export default AdminDashboard;
