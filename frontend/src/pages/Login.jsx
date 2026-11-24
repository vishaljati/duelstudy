
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { AuthLayout } from "../components/auth/AuthLayout";
import { PasswordInput } from "../components/auth/PasswordInput";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Handle form input changes
  const set = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      form: undefined,
    }));
  };

  // Handle login submission
  const onSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setErrors({});

    try {
      const result = await login(form);

      if (!result.ok) {
        setErrors(result.errors || {
          form: "Login failed. Please try again.",
        });
        return;
      }

      // Redirect to the originally requested page
      navigate(
        location.state?.from || "/dashboard",
        { replace: true }
      );
    } catch (error) {
      setErrors({
        form: "Something went wrong. Please try again.",
      });

      console.error("Login error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to continue your streak."
      footer={
        <>
          New to DUELSTUDY?{" "}
          <Link
            to="/signup"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {errors.form && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {errors.form}
          </p>
        )}

        <Field label="Email" error={errors.email}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
            />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={set("password")}
            />
          )}
        </Field>

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          disabled={submitting}
          className="mt-2"
        >
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
