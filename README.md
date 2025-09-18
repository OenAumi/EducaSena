# 🎓 EducaSena

EducaSena adalah platform berbasis web untuk membantu mahasiswa/peneliti mengelola *perjalanan riset* (research journey), mulai dari topik → metodologi → data → bab → publikasi.  
Fitur utama: milestone tracker, saran AI sederhana(hanya dummy), catatan per milestone, dan integrasi WhatsApp(nomor dummy) untuk bertanya langsung ke admin/mentor.

---

## 🚀 Fitur Utama

- *Index (Landing Page)*
  - Pilih: Import project (JSON) atau Create New project.
  - Tampilan hero dengan ilustrasi + speech bubble responsif (mobile/desktop).
  - Tombol bergaya khusus (black → pink hover).

- *Dashboard*
  - Header berisi judul & deadline project.
  - Progress bar otomatis berdasarkan milestone selesai.
  - Advice AI sederhana (rule-based).
  - CRUD milestone notes → klik milestone tampilkan catatan (modal/toast).
  - Export JSON project.
  - Share progress ke WhatsApp.
  - Unlock mode (password) untuk sinkronisasi data dengan server.

- *Journey*
  - Grid milestone dengan CRUD penuh:
    - Rename, Delete, Set Due, Toggle status.
    - Catatan (notes) per milestone.
    - AI Suggest (rule-based).
    - Ask Admin (kirim pesan via WA).
  - Tambah milestone baru (opsional).
  - Catatan terkait milestone tersimpan di snapshot.
  - Semua perubahan disimpan di localStorage dan (jika unlocked) tersinkron ke server.

- *Server (CodeIgniter 4 API)*
  - Register project dengan project_id & password.
  - Public snapshot endpoint (GET).
  - Unlock endpoint (POST) → balikan edit_token (Bearer JWT sederhana via HMAC).
  - Update snapshot endpoint (PUT) dengan Authorization.
  - Password tersimpan dengan bcrypt.

---

## 🛠️ Tech Stack

### Front-End
- HTML5 + Bootstrap 5.3
- CSS custom (Instrument Serif & Inria Sans fonts, black→pink theme)
- Vanilla JavaScript (no framework)
- LocalStorage untuk snapshot offline

### Back-End
- [CodeIgniter 4](https://codeigniter.com/) (PHP)
- RESTful Resource Controller
- MySQL / MariaDB
- Token HMAC untuk proteksi update


