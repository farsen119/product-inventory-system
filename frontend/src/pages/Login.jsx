import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { showApiError, showError, showSuccess } from '../utils/toast'

const inputClass = (hasError) =>
  [
    'w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400',
    'transition focus:outline-none focus:ring-4',
    hasError
      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/15',
  ].join(' ')

function Field({ label, name, error, required, children }) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children(error, errorId)}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error.message || error}
        </p>
      )}
    </div>
  )
}

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { username: '', password: '' },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (values) => {
    try {
      await login(values.username, values.password)
      showSuccess(`Welcome back, ${values.username}!`)
      navigate('/dashboard')
    } catch (err) {
      if (!err.response) {
        showApiError(err, 'Cannot reach the server. Start Django with: python manage.py runserver')
      } else if (err.response.status === 401) {
        showError('Invalid username or password.')
      } else {
        showApiError(err, 'Login failed. Please try again.')
      }
    }
  }

  return (
    <div className="login-page min-h-screen flex">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-fuchsia-400/40 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-indigo-300/30 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm border border-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Inventory Portal
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Manage stock with clarity.
            </h2>
            <p className="mt-4 text-lg text-indigo-100/90 leading-relaxed">
              Track products, monitor movements, and stay ahead of low-stock alerts — all in one
              place.
            </p>

            <ul className="mt-8 space-y-3 text-indigo-100/80 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">
                  ✓
                </span>
                Real-time stock levels &amp; transactions
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">
                  ✓
                </span>
                Dashboard analytics &amp; movement charts
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">
                  ✓
                </span>
                Role-based access for staff &amp; admins
              </li>
            </ul>
          </div>

          <p className="text-sm text-indigo-200/70">
            Product Inventory &amp; Stock Management System
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-slate-50">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl font-bold shadow-lg shadow-indigo-600/30">
              I
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Inventory System</h1>
            <p className="mt-1 text-slate-500 text-sm">Sign in to your account</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="mt-2 text-slate-500">Enter your credentials to access the portal.</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <Field label="Username" name="username" error={errors.username} required>
                {(fieldError, errorId) => (
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. admin"
                    className={inputClass(fieldError)}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={errorId}
                    {...register('username', { required: 'Username is required.' })}
                  />
                )}
              </Field>

              <Field label="Password" name="password" error={errors.password} required>
                {(fieldError, errorId) => (
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`${inputClass(fieldError)} pr-12`}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={errorId}
                      {...register('password', { required: 'Password is required.' })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      onClick={() => setShowPassword((current) => !current)}
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                )}
              </Field>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none mt-2"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo: <span className="font-medium text-slate-500">admin / admin123</span>
            {' · '}
            <span className="font-medium text-slate-500">staff / staff123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
