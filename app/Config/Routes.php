<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', function() {
    return redirect()-> to('/index.html');
});

$routes->group('api', ['namespace' => 'App\Controllers\Api'], function($r){
    $r->post('project/register', 'ProjectController::register');          // POST
    $r->get('project/(:segment)/snapshot', 'ProjectController::snapshot/$1'); // GET
    $r->post('project/(:segment)/unlock', 'ProjectController::unlock/$1');    // POST
    $r->put('project/(:segment)/snapshot', 'ProjectController::update/$1');   // PUT
});
