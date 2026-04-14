import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div>
        <h1 style={{ fontSize: '6rem', fontWeight: 700, margin: 0, lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 400, color: '#808080', margin: '1rem 0 2rem' }}>
          Page not found
        </h2>
        <p style={{ color: '#606060', marginBottom: '2rem', maxWidth: '400px' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#6366f1',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
