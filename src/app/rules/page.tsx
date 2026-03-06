export default function RulesPage() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>IFSA Junior Handbook</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>2026 IFSA Junior Series Rules & Handbook</p>
      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', background: 'rgba(10,10,10,0.8)' }}>
        <iframe
          src="https://ifsafreeride.org/wp-content/uploads/2025/06/2026-English-IFSA-Junior-Series-Handbook-1.pdf"
          style={{ width: '100%', height: 'clamp(500px, 80vh, 900px)', border: 'none', display: 'block' }}
          title="IFSA Junior Handbook"
        />
      </div>
    </main>
  );
}
