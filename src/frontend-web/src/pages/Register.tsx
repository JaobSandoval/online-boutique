import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await register(String(form.get('email')), String(form.get('password')), String(form.get('displayName')))
      navigate('/')
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err && (err as any).response?.status === 409
          ? 'Ese email ya está registrado.'
          : 'No se pudo crear la cuenta. Verifica los datos.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Crear cuenta</h1>
      <input name="displayName" placeholder="Nombre" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" minLength={8} required />
      {error && <p className="status-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creando…' : 'Crear cuenta'}
      </button>
      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </form>
  )
}
