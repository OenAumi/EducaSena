<?php

namespace App\Models;
use CodeIgniter\Model;

class ProjectModel extends Model {
  protected $table = 'projects';
  protected $primaryKey = 'id';
  protected $allowedFields = ['project_id','password_hash','snapshot','created_at','updated_at'];
  protected $returnType = 'array';
}