import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useRegisterMutation } from "../features/auth/authApiSlice";
import { setCredentials } from "../features/auth/authSlice";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, { isLoading, isError }] = useRegisterMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await register({ name, email, password }).unwrap();
      dispatch(setCredentials(result));
      navigate("/");
    } catch {
      // isError below already reflects the failed request
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-500">Sign up to start shopping.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {isError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Registration failed. Try a different email.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing up..." : "Sign up"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
