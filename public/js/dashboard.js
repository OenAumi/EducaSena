// ===== UI Helpers: Modal & Toast =====
function openModal(title, html){
  const elTitle = document.getElementById('appModalTitle');
  const elBody  = document.getElementById('appModalBody');
  const elModal = document.getElementById('appModal');

  // fallback jika modal belum ada
  if (!elTitle || !elBody || !elModal) {
    window.alert((title || 'Info') + '\n\n' + (html || '').replace(/<[^>]+>/g,''));
    return;
  }

  // jaga konten panjang: bungkus dengan pre-wrap & word-break
  elTitle.textContent = title || 'Info';
  elBody.innerHTML = `<div style="white-space:pre-wrap;word-break:break-word;">${html || ''}</div>`;

  const modal = new bootstrap.Modal(elModal);
  modal.show();
}

/** Modal dengan tombol Confirm (fallback ke window.confirm jika tidak ada tombol confirm di HTML) */
function openActionModal({title, html, confirmText='Save', onConfirm, confirmVariant='modal'}){
  const elTitle   = document.getElementById('appModalTitle');
  const elBody    = document.getElementById('appModalBody');
  const elModal   = document.getElementById('appModal');
  let   elConfirm = document.getElementById('appModalConfirm');

  // Fallback tanpa struktur modal lengkap
  if(!elTitle || !elBody || !elModal || !elConfirm){
    const ok = window.confirm((title||'Confirm') + '\n\n' + (html||'').replace(/<[^>]+>/g,''));
    if (ok && typeof onConfirm === 'function') onConfirm();
    return;
  }

  elTitle.textContent = title || 'Confirm';
  elBody.innerHTML = `<div style="white-space:pre-wrap;word-break:break-word;">${html || ''}</div>`;
  elConfirm.textContent = confirmText;

  // ganti kelas tombol confirm utk tema (btn-modal = hover pink di CSS)
  elConfirm.className = 'btn btn-' + confirmVariant;

  // reset handler (clone)
  const fresh = elConfirm.cloneNode(true);
  elConfirm.parentNode.replaceChild(fresh, elConfirm);
  elConfirm = document.getElementById('appModalConfirm');

  const modal = new bootstrap.Modal(elModal);
  modal.show();

  // Enter to confirm
  elBody.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); elConfirm.click(); }
  });

  elConfirm.onclick = function(){
    const keep = (typeof onConfirm === 'function') ? onConfirm() === false : false;
    if (!keep) modal.hide();
  };
}

function showToast(msg, theme='dark'){
  const toastEl = document.getElementById('appToast');
  const body    = document.getElementById('appToastMsg');

  if (!toastEl || !body) { console.log('[toast]', msg); return; }

  body.textContent = msg;
  toastEl.className = `toast align-items-center text-bg-${theme} border-0`;
  const t = new bootstrap.Toast(toastEl, { delay: 2500 });
  t.show();
}

// ===== Skeleton helpers =====
function hideSkeleton(){ const sk = document.getElementById('dashSkeleton'); if(sk) sk.style.display='none'; }
function showSkeleton(){ const sk = document.getElementById('dashSkeleton'); if(sk) sk.style.display='block'; }

// ===== Snapshot/token helpers =====
function getProjectIdFromLocal(){
  try {
    const raw  = localStorage.getItem('educasena_snapshot');
    const data = raw ? JSON.parse(raw) : null;
    return data && data.project && data.project.id ? data.project.id : null;
  } catch(e){ return null; }
}
function getEditToken(){ return localStorage.getItem('educasena_edit_token') || null; }
function setEditToken(t){ localStorage.setItem('educasena_edit_token', t); }

// Enable/disable kontrol edit (kompatibel dengan tombol lama jika ada)
function setEditMode(enabled){
  const ids = ['saveProject','exportJson','shareWA','aiSuggest','askAI','askAdminGlobal'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

// ===== Logout minimal =====
document.addEventListener('DOMContentLoaded', function(){
  const btnLogout = document.getElementById('logout');
  if (btnLogout){
    btnLogout.addEventListener('click', function(e){
      e.preventDefault();
      localStorage.removeItem('educasena_snapshot');
      window.location.href='index.html?ts=' + Date.now();
    });
  }
});

// ===== Main render =====
document.addEventListener('DOMContentLoaded', function(){
  showSkeleton();

  // DOM refs
  const elHeaderBox = document.getElementById('header');     // fallback header lama
  const hdrTitleEl  = document.getElementById('hdrTitle');    // header baru (judul kiri)
  const hdrDeadEl   = document.getElementById('hdrDeadline'); // header baru (deadline kanan)
  const elBar       = document.getElementById('bar');
  const elGrid      = document.getElementById('grid');

  const btnExport   = document.getElementById('exportJson');
  const btnShareWA  = document.getElementById('shareWA');               // ikon-only (baru)
  const btnAskAI    = document.getElementById('askAI') || document.getElementById('aiSuggest'); // support lama
  const btnAskAdmin = document.getElementById('askAdminGlobal');

  // Ambil snapshot
  const raw = localStorage.getItem('educasena_snapshot');
  if(!raw){
    if (elHeaderBox){
      elHeaderBox.innerHTML =
        '<div class="alert alert-warning d-flex justify-content-between align-items-center">'+
          '<span>No project data found. Please create or import a project first.</span>'+
          '<button id="seed" class="btn btn-sm btn-outline-secondary">Load sample</button>'+
        '</div>';
      const seedBtn = document.getElementById('seed');
      if (seedBtn) {
        seedBtn.onclick = function(){
          const sample = {
            project:{ id:'proj_sample', title:'My Thesis', deadline:'2025-10-15' },
            milestones:[
              {name:'Bab 1',status:'done',  due:'2025-06-01'},
              {name:'Bab 2',status:'doing', due:'2025-06-20'},
              {name:'Bab 3',status:'todo',  due:'2025-07-01'}
            ]
          };
          localStorage.setItem('educasena_snapshot', JSON.stringify(sample));
          location.reload();
        };
      }
    }
    [btnExport, btnShareWA, btnAskAI, btnAskAdmin].forEach(b=>{ if(b) b.disabled = true; });
    hideSkeleton();
    return;
  }

  let data;
  try { data = JSON.parse(raw); }
  catch(e){
    if (elHeaderBox) elHeaderBox.innerHTML = '<div class="alert alert-danger">Failed to parse project data. '+ e.message +'</div>';
    [btnExport, btnShareWA, btnAskAI, btnAskAdmin].forEach(b=>{ if(b) b.disabled = true; });
    hideSkeleton();
    return;
  }

  // ---------- Header (judul kiri & deadline kanan) ----------
  function renderHeader(){
    const title = (data.project && data.project.title) || 'Thesis';
    const deadline = (data.project && data.project.deadline) || '-';

    if (hdrTitleEl && hdrDeadEl){  // header baru
      hdrTitleEl.textContent = title;
      hdrDeadEl.textContent  = deadline;
    } else if (elHeaderBox){       // fallback header lama
      elHeaderBox.innerHTML =
        '<h1 class="h5 mb-1">'+ title +'</h1>'+
        '<div class="text-muted">Deadline: '+ deadline +'</div>';
    }
  }

  // ---------- Progress ----------
  function renderProgress(){
    if (!elBar) return 0;
    const ms = Array.isArray(data.milestones) ? data.milestones : [];
    const done = ms.filter(m => m.status === 'done').length;
    const pct  = ms.length ? Math.round(done / ms.length * 100) : 0;

    // jika 0%, tetap tampil "0%" dan beri class zero di wrapper
    const wrap = elBar.parentElement;
    if (pct === 0) wrap.classList.add('zero'); else wrap.classList.remove('zero');

    elBar.style.width = (pct || 1) + '%'; // tampil garis tipis saat 0
    elBar.textContent = pct + '%';
    return pct;
  }

  // ---------- Advice ----------
  function getAdvice(){
    const list = Array.isArray(data.milestones) ? data.milestones : [];
    const d = list.filter(m=>m.status==='done').length;
    const g = list.filter(m=>m.status==='doing').length;
    if (list.length===0) return "Belum ada milestone. Mulai dari Bab 1 (Pendahuluan).";
    if (d===0)            return "Mulailah dari Bab 1 dan susun kerangka Bab 2.";
    if (g>0)              return "Selesaikan yang sedang dikerjakan sebelum menambah yang baru.";
    return "Prioritaskan milestone yang paling dekat dengan due date.";
  }

  // ---------- Grid ----------
  function shadeTone(i){ const row = Math.floor(i/3); return Math.min(row, 4); }
  function renderGrid(){
    if (!elGrid) return;
    const ms = Array.isArray(data.milestones) ? data.milestones : [];
    elGrid.innerHTML = '';
    ms.forEach(function(item, i){
      const badge =
        item.status === 'done'  ? 'success' :
        item.status === 'doing' ? 'primary' : 'secondary';

      const col = document.createElement('div');
      col.className = 'col-6 col-lg-4';
      col.innerHTML =
        '<div class="card d-tone t'+shadeTone(i)+' h-100">'+
          '<div class="card-body">'+
            '<div class="d-flex justify-content-between align-items-start">'+
              '<h6 class="mb-1">'+ (item.name || '-') +'</h6>'+
              '<span class="badge bg-'+ badge +'">'+ (item.status || '-') +'</span>'+
            '</div>'+
            '<div class="small">Due: '+ (item.due || '-') +'</div>'+
          '</div>'+
        '</div>';
      elGrid.appendChild(col);
    });

    // Klik kartu -> modal notes (wrap aman, bisa panjang)
    elGrid.onclick = function(ev){
      const card = ev.target.closest('.card');
      if (!card) return;
      const idx = [...elGrid.children].indexOf(card.parentElement);
      const ms  = Array.isArray(data.milestones) ? data.milestones : [];
      if (idx < 0 || !ms[idx]) return;

      const item = ms[idx];
      const note = (item.notes || '(Tidak ada catatan)').toString();
      openActionModal({
        title: (item.name || '-') + ' Notes',
        confirmText: 'Close',
        onConfirm: function(){},
        html: note.replace(/\n/g,'<br>')
      });
    };
  }

  // ---------- Render awal ----------
  renderHeader();
  const pct = renderProgress();
  const elAdvice = document.getElementById('aiAdvice');
  if (elAdvice) elAdvice.textContent = getAdvice();
  renderGrid();

  // ---------- Edit Project via modal (pakai #editProjectBtn jika ada, fallback ke #saveProject) ----------
  const editBtn = document.getElementById('editProjectBtn') || document.getElementById('saveProject');
  if (editBtn){
    editBtn.onclick = function(){
      const currTitle = (data.project && data.project.title) || '';
      const currDate  = (data.project && data.project.deadline) || '';
      openActionModal({
        title:'Edit Project',
        confirmText:'Save Project',
        confirmVariant:'modal',
        html:
          '<div class="mb-3">'+
            '<label class="form-label">Project Title</label>'+
            '<input id="mdlTitle" class="form-control" value="'+ currTitle +'">'+
          '</div>'+
          '<div>'+
            '<label class="form-label">Deadline</label>'+
            '<input id="mdlDate" type="date" class="form-control" value="'+ currDate +'">'+
          '</div>',
        onConfirm: function(){
          if (!data.project) data.project = {};
          data.project.title    = document.getElementById('mdlTitle').value || 'Untitled Project';
          data.project.deadline = document.getElementById('mdlDate').value || '';
          localStorage.setItem('educasena_snapshot', JSON.stringify(data));
          renderHeader();
          showToast('Project info saved!', 'success');
        }
      });
    };
  }

  // ---------- Unlock via modal (pakai #unlockBtn & #unlockBtnBelow jika ada) ----------
  function isUnlocked(){ return !!getEditToken(); }
  function markUnlockedUI(){
    document.body.classList.toggle('is-unlocked', isUnlocked());
  }
  function bindUnlock(id){
    const b = document.getElementById(id);
    if(!b) return;
    b.onclick = function(){
      openActionModal({
        title:'Unlock Project',
        confirmText:'Unlock',
        confirmVariant:'modal',
        html:'<label class="form-label">Password</label><input id="mdlPwd" type="password" class="form-control" placeholder="Enter project password">',
        onConfirm: async function(){
          const pid = getProjectIdFromLocal();
          const pwd = document.getElementById('mdlPwd').value;
          if (!pid || !pwd){ showToast('Missing password or project id', 'danger'); return false; }
          try{
            const res  = await fetch(`${API_BASE}/project/${encodeURIComponent(pid)}/unlock`, {
              method:'POST',
              headers:{ 'Content-Type':'application/json' },
              body: JSON.stringify({ password: pwd })
            });
            const json = await res.json();
            if(!res.ok){ showToast(json.message || 'Unlock failed', 'danger'); return false; }
            setEditToken(json.edit_token);
            setEditMode(true);
            markUnlockedUI();
            showToast('Unlocked', 'success');
          }catch(err){
            showToast('Network error: ' + err.message, 'danger'); return false;
          }
        }
      });
    };
  }
  bindUnlock('unlockBtn');
  bindUnlock('unlockBtnBelow');
  markUnlockedUI();

  // ---------- Export JSON ----------
  if (btnExport){
    btnExport.onclick = function(){
      try{
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        let fileName = ((data.project && data.project.title) || 'educasena') + '.json';
        fileName = fileName.replace(/[\\/:*?"<>|]+/g, '-');
        const a = document.createElement('a');
        a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Exported JSON', 'success');
      }catch(err){ showToast('Export failed: ' + err.message, 'danger'); }
    };
  }

  // ---------- Share WA (ikon) ----------
  if (btnShareWA){
    btnShareWA.onclick = function(){
      const title    = (data.project && data.project.title)    || 'Thesis';
      const ms       = Array.isArray(data.milestones) ? data.milestones : [];
      const done     = ms.filter(m=>m.status==='done').length;
      const pctLocal = ms.length ? Math.round(done/ms.length*100) : 0;
      const deadline = (data.project && data.project.deadline) || '-';
      const message  = '[EducaSena] '+ title + '\n' +
                       'Progress: ' + pctLocal + '%\n' +
                       'Deadline: ' + deadline;
      const waUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
      const opened = window.open(waUrl, '_blank'); if (!opened) { window.location.href = waUrl; }
    };
  }

  // ---------- Ask to AI ----------
  if (btnAskAI){
    btnAskAI.onclick = function(){
      const tips = [
        'Tambahkan 2 referensi terbaru untuk Bab 2.',
        'Tetapkan due date realistis per milestone.',
        'Diskusikan metodologi ke pembimbing minggu ini.'
      ];
      const pick = tips[Math.floor(Math.random()*tips.length)];
      openActionModal({ title:'Ask to AI', html:`<p class="mb-0">${pick}</p>`, confirmText:'Close', confirmVariant:'modal', onConfirm:()=>{} });
    };
  }

  // ---------- Ask with Admin (WA) ----------
  if (btnAskAdmin){
    btnAskAdmin.onclick = function(){
      const list = Array.isArray(data.milestones) ? data.milestones : [];
      const msg = encodeURIComponent(
        "Halo Admin Educativa,%0A" +
        "Mohon saran untuk proyek saya.%0A" +
        "Project: " + ((data.project && data.project.title) || "My Thesis") + "%0A" +
        "Progress: " + list.map(function(m){return m.name+':'+m.status}).join(', ')
      );
      const adminNumber = "6281234567890"; // TODO: ganti nomor admin sesungguhnya
      const url = "https://wa.me/"+adminNumber+"?text="+msg;
      const w = window.open(url,'_blank'); if(!w) window.location.href = url;
    };
  }

  // Kunci kontrol jika belum unlock
  setEditMode( !!getEditToken() );

  hideSkeleton();
});