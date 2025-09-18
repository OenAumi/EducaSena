// ============================
// API config
// ============================
const API_BASE = 'http://localhost:8080/api'; // ganti ke domain backend-mu

// ambil Project ID dari localStorage snapshot
function getProjectIdFromLocal(){
  try {
    const raw  = localStorage.getItem('educasena_snapshot');
    const data = raw ? JSON.parse(raw) : null;
    return data && data.project && data.project.id ? data.project.id : null;
  } catch(e){ return null; }
}

// token edit (hasil unlock)
function getEditToken(){
  return localStorage.getItem('educasena_edit_token') || null;
}
function setEditToken(t){
  if (t) localStorage.setItem('educasena_edit_token', t);
  else localStorage.removeItem('educasena_edit_token');
}

// ============================
// Sync snapshot ke server
// ============================
async function syncSnapshotToServer(){
  const pid = getProjectIdFromLocal();
  if (!pid) return;

  const token = getEditToken();
  if (!token){
    console.warn('Belum unlock, tidak sync ke server.');
    return;
  }

  const raw = localStorage.getItem('educasena_snapshot');
  if (!raw) return;

  try {
    const res = await fetch(`${API_BASE}/project/${encodeURIComponent(pid)}/snapshot`, {
      method:'PUT',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+token
      },
      body: raw
    });
    const json = await res.json();
    if (!res.ok){
      console.error('Sync gagal:', json.message || res.status);
      return;
    }
    console.log('Snapshot synced:', json);
  } catch(err){
    console.error('Network error sync:', err);
  }
}

// ============================
// Unlock project untuk edit
// ============================
async function unlockProject(pid, password){
  try {
    const res = await fetch(`${API_BASE}/project/${encodeURIComponent(pid)}/unlock`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Unlock failed');
    setEditToken(json.edit_token);
    alert('Unlocked! Sekarang bisa edit & sync.');
    return true;
  } catch(err){
    alert('Unlock error: ' + err.message);
    return false;
  }
}