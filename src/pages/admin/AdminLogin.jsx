
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { supabase } from "../../lib/supabase";
import "./Admin.css";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  // If an admin is already logged in, send them to the menu page.
  useEffect(() => {
    let active = true;

    async function checkExistingAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) return;

        const { data: admin, error: adminError } =
          await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (adminError) throw adminError;

        if (active && admin) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Existing admin session check:", err);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkExistingAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // Authenticate with Supabase.
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) throw loginError;

      if (!data.user) {
        throw new Error("Unable to verify your account.");
      }

      // Confirm that this user is registered as an admin.
      const { data: admin, error: adminError } =
        await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        await supabase.auth.signOut();

        throw new Error(
          "You are not authorised to access this admin panel."
        );
      }

      // Successful login: open the menu page.
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);

      setError(
        err.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : err.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="admin-loading">
        <p>Checking admin access...</p>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-icon">
            <Lock size={28} />
          </div>

          <h1>LAXMI NRUSINGHA CATTERS</h1>
          <p>ADMIN LOGIN</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="admin-form-group">
            <label htmlFor="admin-email">Email Address</label>

            <div className="admin-input-wrapper">
              <Mail size={18} />

              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter admin email"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="admin-password">Password</label>

            <div className="admin-input-wrapper">
              <Lock size={18} />

              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login to Admin Panel"}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Authorized catering owner access only</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
