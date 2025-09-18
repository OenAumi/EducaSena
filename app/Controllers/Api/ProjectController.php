<?php
namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\ProjectModel;

class ProjectController extends ResourceController
{
    protected $format = 'json';

    /* ====================== *
     * Token sederhana (HMAC) *
     * ====================== */
    private function signToken(string $projectId, int $ttl = 3600): string
    {
        $payload = json_encode(['pid' => $projectId, 'exp' => time() + $ttl]);
        $sig     = hash_hmac('sha256', $payload, config('App')->baseURL); // simple secret
        return base64_encode($payload . '.' . $sig);
    }

    private function verifyToken(string $token, string $projectId): bool
    {
        $raw = base64_decode($token, true);
        if (!$raw || strpos($raw, '.') === false) return false;

        [$json, $sig] = explode('.', $raw, 2);
        $calc = hash_hmac('sha256', $json, config('App')->baseURL);
        if (!hash_equals($calc, $sig)) return false;

        $p = json_decode($json, true);
        if (!$p) return false;
        if (($p['pid'] ?? '') !== $projectId) return false;
        if (($p['exp'] ?? 0) < time()) return false;

        return true;
    }

    /* ========================= *
     * POST /api/project/register *
     * Body: { project_id, password, snapshot? }
     * ========================= */
    public function register()
    {
        $in  = $this->request->getJSON(true);
        $pid = $in['project_id'] ?? null;
        $pwd = $in['password'] ?? null;
        $snap = $in['snapshot'] ?? null;

        if (!$pid || !$pwd) {
            return $this->failValidationErrors('project_id & password required');
        }

        $m = new ProjectModel();
        if ($m->where('project_id', $pid)->first()) {
            return $this->failResourceExists('Project already registered');
        }

        $m->insert([
            'project_id'    => $pid,
            'password_hash' => password_hash($pwd, PASSWORD_BCRYPT),
            'snapshot'      => $snap ? json_encode($snap) : null,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);

        return $this->respondCreated(['ok' => true]);
    }

    /* ===================================== *
     * GET /api/project/{id}/snapshot (public)
     * ===================================== */
    public function snapshot($id = null)
    {
        $pid = $id; // nama param harus $id agar kompatibel
        $m = new ProjectModel();
        $row = $m->where('project_id', $pid)->first();

        if (!$row) {
            return $this->respond([
                'project'    => ['id' => $pid],
                'milestones' => [],
            ]);
        }

        $snap = $row['snapshot']
            ? json_decode($row['snapshot'], true)
            : ['project' => ['id' => $pid], 'milestones' => []];

        return $this->respond($snap);
    }

    /* ================================= *
     * POST /api/project/{id}/unlock
     * Body: { password }
     * ================================= */
    public function unlock($id = null)
    {
        $pid = $id;
        $in  = $this->request->getJSON(true);
        $pwd = $in['password'] ?? '';

        $m = new ProjectModel();
        $row = $m->where('project_id', $pid)->first();
        if (!$row) return $this->failNotFound('Project not found');

        if (!password_verify($pwd, $row['password_hash'])) {
            return $this->failUnauthorized('Invalid password');
        }

        return $this->respond([
            'edit_token' => $this->signToken($pid, 3600),
            'expires_in' => 3600,
        ]);
    }

    /* ===================================================== *
     * PUT /api/project/{id}/snapshot  (BUTUH Authorization)
     * Header: Authorization: Bearer <token>
     * Body  : snapshot JSON (project + milestones)
     * ===================================================== */
    public function update($id = null)  // <— SIGNATURE HARUS BEGITU
    {
        $pid = $id;

        $auth  = $this->request->getHeaderLine('Authorization');
        $token = preg_match('/Bearer\s+(.+)/', $auth, $m) ? $m[1] : null;
        if (!$token || !$this->verifyToken($token, $pid)) {
            return $this->failUnauthorized('Invalid or expired token');
        }

        $snap = $this->request->getJSON(true);
        if (!$snap) return $this->failValidationErrors('Snapshot JSON required');

        $model = new ProjectModel();
        $row = $model->where('project_id', $pid)->first();
        if (!$row) return $this->failNotFound('Project not found');

        $model->update($row['id'], [
            'snapshot'   => json_encode($snap),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['ok' => true]);
    }
}
