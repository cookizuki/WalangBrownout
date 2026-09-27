<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/AuditLog', ['auditLogs' => AuditLog::orderByDesc('timestamp')->orderByDesc('id')->limit(500)->get()]);
    }
}
