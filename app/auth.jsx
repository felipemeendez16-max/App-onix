/* ============ App Onix — Tela de acesso ============ */

const _PWD_HASH = '0d287276f7c0714dd71899207d6211a4462a4af3d59608d3b85296cd80efd894';
const _AUTH_KEY = 'app-onix-auth-v1';

async function _hashPassword(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isAuthenticated() {
  return localStorage.getItem(_AUTH_KEY) === _PWD_HASH;
}

function logout() {
  localStorage.removeItem(_AUTH_KEY);
  location.reload();
}

function LoginScreen({ onAuth }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const hash = await _hashPassword(pwd);
    if (hash === _PWD_HASH) {
      localStorage.setItem(_AUTH_KEY, hash);
      onAuth();
    } else {
      setError(true);
      setPwd('');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface-solid)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--glow)',
          }}>
            <Icon name="sparkle" size={26} color="var(--on-accent)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>App Onix</div>
            <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 2 }}>Organização Financeira</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(false); }}
              placeholder="Senha de acesso"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 44px 12px 14px', borderRadius: 10,
                border: `1.5px solid ${error ? 'var(--neg)' : 'var(--border)'}`,
                background: 'var(--bg-2)', color: 'var(--text)',
                fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
                transition: 'border-color .15s',
              }}
            />
            <button type="button" onClick={() => setShow(s => !s)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2,
            }}>
              <Icon name={show ? 'eye' : 'eyeOff'} size={17} />
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--neg)', textAlign: 'center' }}>
              Senha incorreta. Tente novamente.
            </div>
          )}

          <button type="submit" disabled={!pwd || loading} style={{
            padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
            opacity: (!pwd || loading) ? 0.6 : 1, transition: 'opacity .15s',
            boxShadow: '0 0 16px var(--glow)',
          }}>
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { isAuthenticated, logout });
