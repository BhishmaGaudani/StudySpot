// Signup form. The browser does quick checks (required fields, email format,
// 8+ character password) for fast feedback, but the server repeats every
// check, since anyone can skip the browser and call the API directly.

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { AuthCard, Field, SubmitButton } from '../components/AuthCard'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.toLowerCase().endsWith('@stonybrook.edu')) {
      setError('Use your @stonybrook.edu email')
      return
    }
    setLoading(true)
    try {
      await signup(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Stony Brook students only">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="SBU email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stonybrook.edu" />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <SubmitButton loading={loading}>Sign up</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-sbu hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
