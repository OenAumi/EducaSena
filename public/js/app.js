// ============================
// API config & helpers (sama seperti sebelumnya)
// ============================
const API_BASE = 'http://localhost:8080/api'; // ganti kalau beda

function saveSnapshotLocally(payload){
  localStorage.setItem('educasena_snapshot', JSON.stringify(payload));
}

function setEditToken(t){
  if (t) localStorage.setItem('educasena_edit_token', t);
  else localStorage.removeItem('educasena_edit_token');
}

async function registerProjectOnServer(projectId, password, snapshot){
  const res = await fetch(`${API_BASE}/project/register`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ project_id: projectId, password, snapshot })
  });
  const json = await res.json();
  if (!res.ok){
    if ((json && /already registered/i.test(json.message||''))) {
      return { ok:true, already:true };
    }
    throw new Error(json.message || 'Register failed');
  }
  return { ok:true, already:false };
}

async function unlockProjectOnServer(projectId, password){
  const res = await fetch(`${API_BASE}/project/${encodeURIComponent(projectId)}/unlock`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ password })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Unlock failed');
  setEditToken(json.edit_token);
  return true;
}

// ============================
// HAVE (import JSON) — tetap
// ============================
var fileInput = document.getElementById('fileImport');
document.getElementById('btnHave').onclick = function(){ fileInput.click(); };
fileInput.onchange = function(e){
  var f = e.target.files[0];
  if (!f) return;

  var reader = new FileReader();
  reader.onload = function(){
    try{
      var data = JSON.parse(reader.result);
      if(!data || !data.project || !data.milestones) {
        alert('Invalid file format. Please select a valid EducaSena JSON file.');
        return;
      }
      saveSnapshotLocally(data);
      window.location.href = '/dashboard.html';
    }catch(err){
      alert('Failed to read JSON: ' + err.message);
    }
  };
  reader.onerror = function(){ alert('Failed to read file!'); };
  reader.readAsText(f);
};

// ============================
// DONT HAVE (open modal + create)
// ============================
const btnDont   = document.getElementById('btnDont');
const npModalEl = document.getElementById('newProjectModal');
const npForm    = document.getElementById('newProjectForm');
const npTitle   = document.getElementById('npTitle');
const npPass    = document.getElementById('npPassword');

let npModal;

if (btnDont && npModalEl && npForm){
  // buka modal saat klik "I don't have"
  btnDont.addEventListener('click', function(){
    if (!npModal) npModal = new bootstrap.Modal(npModalEl);
    // reset form
    npTitle.value = '';
    npPass.value  = '';
    npModal.show();
  });

  // submit modal → create project (+ optional register & unlock)
  npForm.addEventListener('submit', async function(e){
    e.preventDefault();

    const title = (npTitle.value||'').trim() || 'New Thesis';
    const pwd   = (npPass.value||'').trim();

    // 1) snapshot awal
    const snap = {
      project: { id: 'proj_' + Date.now(), title, deadline: '' },
      milestones: [
        { name:'Topic',       status:'todo', due:'', notes:'' },
        { name:'Method',      status:'todo', due:'', notes:'' },
        { name:'Data',        status:'todo', due:'', notes:'' },
        { name:'Use Data',    status:'todo', due:'', notes:'' },
        { name:'Bab',         status:'todo', due:'', notes:'' },
        { name:'Publication', status:'todo', due:'', notes:'' }
      ]
    };
    saveSnapshotLocally(snap);

    // 2) kalau password diisi & panjang cukup → register + unlock
    if (pwd){
      if (pwd.length < 6){
        // small feedback, tetap di modal
        npPass.classList.add('is-invalid');
        npPass.setCustomValidity('Password minimal 6 karakter');
        return;
      } else {
        npPass.classList.remove('is-invalid');
        npPass.setCustomValidity('');
      }

      try{
        await registerProjectOnServer(snap.project.id, pwd, snap);
        await unlockProjectOnServer(snap.project.id, pwd);
        // sukses → tutup modal & lanjut
        npModal.hide();
        window.location.href = '/journey.html';
        return;
      }catch(err){
        // gagal server → tetap lanjut view-only biar tidak menghambat
        console.warn('[register/unlock]', err.message);
        // beri notif sederhana—kalau mau fancy pakai Toast di index juga
        alert('Server unreachable or register failed.\nContinuing in view-only mode.');
        npModal.hide();
        window.location.href = '/journey.html';
        return;
      }
    }

    // 3) password kosong → lanjut view-only
    npModal.hide();
    window.location.href = '/journey.html';
  });
}