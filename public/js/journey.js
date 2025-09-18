// =========================
// Storage helpers
// =========================
function loadSnapshot(){
  var raw = localStorage.getItem('educasena_snapshot');
  return raw ? JSON.parse(raw) : null;
}
function saveSnapshot(data){
  localStorage.setItem('educasena_snapshot', JSON.stringify(data));
}
// Helper aman: hanya sync jika fungsi globalnya ada
function trySync(){
  if (typeof syncSnapshotToServer === 'function') {
    syncSnapshotToServer();
  }
}

// =========================
// UI Helpers: Modal & Toast (fallback-friendly)
// =========================
function openModal(title, html){
  const elTitle = document.getElementById('appModalTitle');
  const elBody  = document.getElementById('appModalBody');
  const elModal = document.getElementById('appModal');
  const elConfirm = document.getElementById('appModalConfirm');

  if (!elTitle || !elBody || !elModal) {
    window.alert((title || 'Info') + '\n\n' + (html||'').replace(/<[^>]+>/g,''));
    return;
  }

  elTitle.textContent = title || 'Info';
  elBody.innerHTML = html || '';

  // Pastikan tombol confirm tidak muncul untuk modal info biasa
  if(elConfirm){
    elConfirm.classList.add('d-none');
  }

  const modal = new bootstrap.Modal(elModal);
  modal.show();
}

function showToast(msg, theme='dark'){
  const toastEl = document.getElementById('appToast');
  const body    = document.getElementById('appToastMsg');
  if (!toastEl || !body) {
    console.log('[toast]', msg);
    return;
  }
  body.textContent = msg;
  toastEl.className = `toast align-items-center text-bg-${theme} border-0`;
  const t = new bootstrap.Toast(toastEl, { delay: 2400 });
  t.show();
}

// =========================
// Action Modal (with confirm)
// =========================
function openActionModal(opts){
  // opts: { title, html, confirmText, confirmTheme, onShow(el), onConfirm() }
  const elTitle  = document.getElementById('appModalTitle');
  const elBody   = document.getElementById('appModalBody');
  const elModal  = document.getElementById('appModal');
  const elConfirm= document.getElementById('appModalConfirm');

  if(!elTitle || !elBody || !elModal || !elConfirm){
    // fallback
    window.alert((opts.title||'Confirm') + '\n\n' + (opts.plainText||''));
    if (typeof opts.onConfirm === 'function') opts.onConfirm();
    return;
  }

  elTitle.textContent = opts.title || 'Confirm';
  elBody.innerHTML    = opts.html || '';
  elConfirm.textContent = opts.confirmText || 'Save';

  elConfirm.className = 'btn';  
  /* tambahin sesuai theme */
  elConfirm.classList.add(opts.confirmTheme ? 'btn-' + opts.confirmTheme : 'btn-primary');
  elConfirm.classList.remove('d-none');

  // Clean previous handlers
  const newConfirm = elConfirm.cloneNode(true);
  elConfirm.parentNode.replaceChild(newConfirm, elConfirm);
  const confirmBtn = document.getElementById('appModalConfirm');

  const modal = new bootstrap.Modal(elModal);
  modal.show();

  if (typeof opts.onShow === 'function') opts.onShow(elBody);

  // allow Enter to submit if there's a form field
  elBody.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      e.preventDefault();
      confirmBtn.click();
    }
  });

  confirmBtn.onclick = function(){
    if (typeof opts.onConfirm === 'function') {
      const shouldClose = opts.onConfirm() !== false; // return false to keep modal open
      if (shouldClose) modal.hide();
    } else {
      modal.hide();
    }
  };
}

// =========================
/* AI suggestions (rule-based); jika mau via AJAX JSON,
   tambahkan loader sendiri dan override fungsi ini. */
// =========================
function getAISuggestion(stepName){
  var tips = {
    "Topic": [
      "Pilih topik spesifik & relevan.",
      "Pastikan ada novelty vs riset sebelumnya.",
      "Tentukan 3 keyword untuk literatur."
    ],
    "Method": [
      "Tentukan metode (kualitatif/kuantitatif/mixed).",
      "Tulis alasan metodologis + referensi.",
      "Pastikan menjawab rumusan masalah."
    ],
    "Data": [
      "Tentukan sumber dataset & sampling.",
      "Cek kualitas & jumlah data.",
      "Rencana pembersihan data."
    ],
    "Use Data": [
      "Pilih teknik analisis (stat/ML) sesuai tujuan.",
      "Visualisasikan hasil.",
      "Tambahkan uji validitas/reliabilitas."
    ],
    "Bab": [
      "Ikuti IMRAD.",
      "Sitasi konsisten.",
      "Pastikan alur antar bab logis."
    ],
    "Publication": [
      "Pilih jurnal/konferensi + author guidelines.",
      "Sesuaikan gaya selingkung.",
      "Perkuat metode & hasil."
    ]
  };
  return tips[stepName] || ["Belum ada saran untuk step ini."];
}

// =========================
// WhatsApp Admin
// =========================
function askAdmin(stepName, snap){
  var msg = encodeURIComponent(
    "Halo Admin Educativa,\n" +
    "Saya butuh saran untuk step: " + stepName + "\n" +
    "Project: " + (snap.project && snap.project.title ? snap.project.title : "My Thesis") + "\n" +
    "Progress: " + (snap.milestones||[]).map(function(m){ return m.name+':'+m.status; }).join(', ')
  );
  var adminNumber = "6281234567890"; // TODO: ganti nomor admin sesungguhnya
  var url = "https://wa.me/"+adminNumber+"?text="+msg;
  var w = window.open(url, "_blank"); if (!w) window.location.href = url;
}

// =========================
// Render grid + CRUD controls
// =========================
function render(container, snap, selectedIdx){
  container.innerHTML = '';
  (snap.milestones || []).forEach(function(ms, i){
    var badge =
      ms.status==="done"  ? "success" :
      ms.status==="doing" ? "primary" : "secondary";
    var due  = ms.due ? ms.due : "-";
    var noteIcon = ms.notes ? "📝" : "";

    // ----- ROW SHADE: asumsikan 3 kolom di desktop (col-lg-4).
    // Akan tetap terlihat bertahap di mobile walau per 2 item.
    var rowIndex = Math.floor(i / 3);
    var toneIdx  = Math.min(rowIndex, 5);   // batasi sampai tone-5

    var col = document.createElement('div');
    col.className = 'col-6 col-lg-4';
    col.innerHTML =
      '<div class="card step-card tone-'+toneIdx+' h-100 position-relative" data-index="'+i+'">'+
        '<div class="card-body pb-5">'+

          // Header: Name (kiri) — Status + Rename icon (kanan)
          '<div class="step-head mb-2">'+
            '<h6 class="mb-0 text-truncate">'+ (ms.name||'-') +' '+noteIcon+'</h6>'+
            '<div class="d-inline-flex align-items-center">'+
              '<span class="badge rounded-pill bg-'+badge+'">'+ (ms.status||'-') +'</span>'+
              '<button class="btn-icon btn-rename btn-rename-icon ms-1" type="button" aria-label="Rename" title="Rename">'+
                '<i class="bi bi-pencil"></i>'+
              '</button>'+
            '</div>'+
          '</div>'+

          // Due row: label kiri, icon kalender kanan
          '<div class="step-due mb-3">'+
            '<div>Due: <span class="due-val">'+ due +'</span></div>'+
            '<div class="d-flex align-items-center gap-2">'+
              '<button class="btn-icon btn-due" type="button" aria-label="Set Due" title="Set Due"><i class="bi bi-calendar-event"></i></button>'+
            '</div>'+
          '</div>'+

          // Centered NOTES
          '<div class="step-notes mb-2">'+
            '<button class="btn btn-sm btn-warning btn-notes" type="button">Notes</button>'+
          '</div>'+

          '<div class="hover-tools small text-center" style="color:#e5e7eb;">Klik tombol Notes untuk mengisi catatan</div>'+

          // Bottom-right actions
          '<div class="step-actions">'+
            '<button class="btn-icon btn-ai ai-btn me-1" data-step="'+(ms.name||'')+'" aria-label="AI Suggest" title="AI Suggest"><i class="bi bi-lightbulb"></i></button>'+
            '<button class="btn-icon btn-ask wa-btn me-1" data-step="'+(ms.name||'')+'" aria-label="Ask Admin (WhatsApp)" title="Ask Admin (WhatsApp)"><i class="bi bi-whatsapp"></i></button>'+
            '<button class="btn-icon btn-del btn-delete" type="button" aria-label="Delete" title="Delete"><i class="bi bi-trash3"></i></button>'+
          '</div>'+

        '</div>'+
      '</div>';
    container.appendChild(col);
  });

  // label area notes
  var label = document.querySelector('label[for="stuckText"]') || document.querySelector('.form-label');
  if (label){
    if (typeof selectedIdx === 'number' && snap.milestones[selectedIdx]){
      label.textContent = 'Notes for: '+ snap.milestones[selectedIdx].name;
    } else {
      label.textContent = 'Notes (pilih milestone → tombol Notes)';
    }
  }
}
// =========================
// Main
// =========================
document.addEventListener('DOMContentLoaded', function(){
  var snap = loadSnapshot();
  var container = document.getElementById('steps');
  var stuckInput = document.getElementById('stuckText');
  var stuckBtn   = document.getElementById('saveStuck');
  var addBtn     = document.getElementById('addMs');
  var newName    = document.getElementById('newName');

  if (!container) return;

  if(!snap){
    container.innerHTML = '<div class="alert alert-warning">No project found. Please start from wizard.</div>';
    return;
  }

  // Seed default steps jika kosong
  var defaultSteps = ["Topic","Method","Data","Use Data","Bab","Publication"];
  if(!snap.milestones || !snap.milestones.length){
    snap.milestones = defaultSteps.map(function(s){ return { name:s, status:"todo", due:"", notes:"" }; });
    saveSnapshot(snap);
    trySync();
  }

  // state: index milestone yang sedang diedit notenya
  var currentIdx = null;

  // Render awal
  render(container, snap, currentIdx);

  function syncNotesArea(){
    if (!stuckInput) return;
    if (currentIdx !== null && snap.milestones[currentIdx]){
      stuckInput.value = snap.milestones[currentIdx].notes || '';
    } else {
      stuckInput.value = '';
    }
  }
  syncNotesArea();

  // Satu listener untuk semua aksi di grid (event delegation)
  container.addEventListener('click', function(e){
    var card    = e.target.closest('.step-card');
    var aiBtn   = e.target.closest('.ai-btn');
    var waBtn   = e.target.closest('.wa-btn');
    var dueBtn  = e.target.closest('.btn-due');
    var renBtn  = e.target.closest('.btn-rename');
    var delBtn  = e.target.closest('.btn-delete');
    var noteBtn = e.target.closest('.btn-notes');

    if (!snap || !snap.milestones) return;

    // AI Suggest → Modal list
    if (aiBtn){
      var stepAI = aiBtn.getAttribute('data-step') || '';
      var ideas = getAISuggestion(stepAI);
      var html  = '<ul class="mb-0">' + ideas.map(function(s){ return '<li>'+s+'</li>'; }).join('') + '</ul>';
      openModal('AI Suggest — ' + stepAI, html);
      return;
    }

    // WhatsApp Admin
    if (waBtn){
      var stepWA = waBtn.getAttribute('data-step') || '';
      askAdmin(stepWA, snap);
      return;
    }

    if (!card) return;
    var idx = parseInt(card.dataset.index,10);

    // Set Due (Modal)
if (dueBtn){
  var idx = parseInt(card.dataset.index,10);
  var currentVal = snap.milestones[idx].due || '';
  openActionModal({
    title: 'Set Due — ' + (snap.milestones[idx].name || '-'),
    confirmText: 'Save Due',
    confirmTheme: 'primary',
    html:
      '<label class="form-label">Due date</label>' +
      '<input type="date" class="form-control" id="modalDue" value="'+ currentVal +'">' +
      '<div class="form-text">Kosongkan jika ingin menghapus due.</div>',
    onShow: function(body){ body.querySelector('#modalDue').focus(); },
    onConfirm: function(){
      var v = document.getElementById('modalDue').value.trim();
      snap.milestones[idx].due = v;
      saveSnapshot(snap); trySync();
      render(container, snap, currentIdx);
      showToast(v ? ('Due set to '+v) : 'Due cleared', v ? 'primary' : 'warning');
    }
  });
  return;
}

// Rename (Modal, icon di header)
if (renBtn){
  var idx = parseInt(card.dataset.index,10);
  var currentLabel = snap.milestones[idx].name || '';
  openActionModal({
    title: 'Rename Milestone',
    confirmText: 'Rename',
    confirmTheme: 'primary',
    html:
      '<label class="form-label">New name</label>' +
      '<input type="text" class="form-control" id="modalRename" value="'+ currentLabel +'" maxlength="80">',
    onShow: function(body){ 
      const el = body.querySelector('#modalRename');
      el.focus(); el.select();
    },
    onConfirm: function(){
      var v = document.getElementById('modalRename').value.trim();
      if(!v){ showToast('Nama tidak boleh kosong', 'warning'); return false; }
      snap.milestones[idx].name = v;
      saveSnapshot(snap); trySync();
      render(container, snap, currentIdx);
      showToast('Renamed', 'primary');
    }
  });
  return;
}

// Delete (Modal confirm)
if (delBtn){
  var idx = parseInt(card.dataset.index,10);
  var name = snap.milestones[idx].name || '-';
  openActionModal({
    title: 'Delete Milestone',
    confirmText: 'Delete',
    confirmTheme: 'danger',
    html:
      '<div class="d-flex align-items-start gap-3">' +
        '<i class="bi bi-exclamation-triangle-fill fs-4 text-danger"></i>' +
        '<div><p class="mb-1">Hapus <strong>'+name+'</strong>?</p>' +
        '<small class="text-muted">Tindakan ini tidak dapat dibatalkan.</small></div>' +
      '</div>',
    onConfirm: function(){
      snap.milestones.splice(idx,1);
      if (currentIdx === idx) currentIdx = null;
      else if (currentIdx !== null && idx < currentIdx) currentIdx -= 1;
      saveSnapshot(snap); trySync();
      render(container, snap, currentIdx);
      syncNotesArea();
      showToast('Milestone deleted', 'warning');
    }
  });
  return;
}

    // Notes: pilih milestone yang akan diisi notenya
    if (noteBtn){
      currentIdx = idx;
      render(container, snap, currentIdx);
      syncNotesArea();
      showToast('Editing notes for: ' + (snap.milestones[idx].name||'-'), 'info');
      return;
    }

    // Toggle status (klik area card selain tombol)
    if (!aiBtn && !waBtn && !dueBtn && !renBtn && !delBtn && !noteBtn){
      var st  = snap.milestones[idx].status;
      var next = (st==="todo") ? "doing" : (st==="doing" ? "done" : "todo");
      snap.milestones[idx].status = next;
      saveSnapshot(snap);
      trySync();
      render(container, snap, currentIdx);
      showToast('Status: ' + next, 'primary');
    }
  });

  // Save Notes → disimpan ke milestone terpilih
  if (stuckBtn && stuckInput){
    stuckBtn.onclick = function(){
      if (currentIdx === null || !snap.milestones[currentIdx]){
        showToast("Pilih milestone dulu (klik tombol Notes di kartu).", 'warning');
        return;
      }
      snap.milestones[currentIdx].notes = stuckInput.value || "";
      saveSnapshot(snap);
      trySync();
      render(container, snap, currentIdx); // update indikator 📝
      openModal('Notes Saved', `<p class="mb-0">Catatan disimpan untuk <strong>${snap.milestones[currentIdx].name}</strong>.</p>`);
    };
  }

  // Create (Add milestone) — opsional jika elemen ada
  if (addBtn && newName){
    addBtn.onclick = function(){
      var name = (newName.value||'').trim();
      if(!name) return;
      snap.milestones.push({ name:name, status:'todo', due:'', notes:'' });
      saveSnapshot(snap);
      trySync();
      newName.value = '';
      render(container, snap, currentIdx);
      showToast('Milestone added', 'success');
    };
  }
});