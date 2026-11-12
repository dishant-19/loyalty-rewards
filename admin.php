<?php
require __DIR__ . '/config.php';
$admin = require_admin();
$pdo = db(); $errors = []; $genErrors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = post_string('action');
    if ($action === 'mark_notifications_read') {
        mark_user_notifications_read($admin);
        flash('Notifications marked as read.');
        redirect('admin.php#notifications');
    } elseif ($action === 'clear_notifications') {
        $pdo->exec("DELETE FROM notifications WHERE recipient_role='admin' AND recipient_user_id IS NULL");
        flash('Admin reward notifications have been cleared.');
        redirect('admin.php#notifications');
    } elseif ($action === 'clear_activity') {
        $pdo->exec('DELETE FROM activity_log');
        flash('Recent activity history has been cleared.');
        redirect('admin.php#recent-activity');
    } elseif ($action === 'generate') {
        $qty = filter_var(post_string('quantity'), FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>100]]);
        $points = filter_var(post_string('points'), FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>1000]]);
        $genErrors = [];
        if ($qty === false) $genErrors['quantity'] = 'Number of codes must be a whole number between 1 and 100.';
        if ($points === false) $genErrors['points'] = 'Points per box must be a whole number between 1 and 1000.';
        if ($genErrors) $errors = array_merge($errors, array_values($genErrors));
        else {
            $codes = [];
            $stmt = $pdo->prepare('INSERT INTO box_codes(code_hash,points) VALUES(?,?)');
            for ($i=0; $i<$qty; $i++) {
                $code = strtoupper(bin2hex(random_bytes(6)));
                $stmt->execute([hash('sha256',$code),$points]);
                $codes[] = $code;
            }
            $_SESSION['new_codes'] = $codes;
            flash($qty.' unique box codes generated. Print and place one inside each box.');
            redirect('admin.php');
        }
    } elseif ($action === 'redemption') {
        $id = filter_var(post_string('redemption_id'), FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
        $decision = post_string('decision');
        if (!$id || !in_array($decision, ['approved', 'rejected'], true)) {
            $errors[] = 'That redemption request is invalid.';
        } else {
            try {
                $pdo->beginTransaction();
                // Lock the request so simultaneous admin actions cannot approve/reject it twice.
                $stmt = $pdo->prepare('SELECT * FROM redemptions WHERE id=? FOR UPDATE');
                $stmt->execute([$id]);
                $redemption = $stmt->fetch();
                if (!$redemption || $redemption['status'] !== 'pending') {
                    throw new RuntimeException('That redemption request is no longer pending.');
                }
                if ($decision === 'rejected') {
                    $pdo->prepare('UPDATE users SET points=points+?,reward_progress=reward_progress+? WHERE id=?')->execute([(int)$redemption['points_cost'], (int)$redemption['reward_progress_before'], (int)$redemption['user_id']]);
                }
                $update = $pdo->prepare("UPDATE redemptions SET status=? WHERE id=? AND status='pending'");
                $update->execute([$decision, $id]);
                if ($update->rowCount() !== 1) {
                    throw new RuntimeException('That redemption request has already been processed.');
                }
                $detail = $decision === 'rejected'
                    ? 'Reward request rejected; ' . (int)$redemption['points_cost'] . ' points refunded'
                    : 'Reward request approved';
                if ($decision === 'approved') {
                    create_notification($pdo, 'customer', (int)$redemption['user_id'], (int)$redemption['id'], 'request_approved', 'Reward request approved', 'Your ' . $redemption['reward_name'] . ' request #' . (int)$redemption['id'] . ' has been approved.');
                } else {
                    create_notification($pdo, 'customer', (int)$redemption['user_id'], (int)$redemption['id'], 'request_rejected', 'Reward request rejected', 'Your ' . $redemption['reward_name'] . ' request #' . (int)$redemption['id'] . ' was rejected.');
                    create_notification($pdo, 'customer', (int)$redemption['user_id'], (int)$redemption['id'], 'points_refunded', (int)$redemption['points_cost'] . ' points refunded', (int)$redemption['points_cost'] . ' points have been returned to your balance. Your reward progress has also been restored.');
                }
                $pdo->prepare('INSERT INTO activity_log(user_id,action,detail) VALUES(?,?,?)')
                    ->execute([(int)$redemption['user_id'], 'redemption_'.$decision, $detail]);
                $pdo->commit();
                flash('Redemption '.$decision.'.'.($decision === 'rejected' ? ' Points returned to customer.' : ''));
                redirect('admin.php');
            } catch (RuntimeException $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errors[] = $ex->getMessage();
            } catch (Throwable $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errors[] = 'We could not update that reward request. Please try again.';
            }
        }
    }
}
$newCodes = $_SESSION['new_codes'] ?? []; unset($_SESSION['new_codes']);
$stats = [
 'customers'=>(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='customer'")->fetchColumn(),
 'codes'=>(int)$pdo->query("SELECT COUNT(*) FROM box_codes")->fetchColumn(),
 'redeemed'=>(int)$pdo->query("SELECT COUNT(*) FROM box_codes WHERE status='redeemed'")->fetchColumn(),
 'points'=>(int)$pdo->query("SELECT COALESCE(SUM(points),0) FROM users")->fetchColumn()
];
$pending = $pdo->query("SELECT r.*,u.name,u.email FROM redemptions r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.id DESC LIMIT 30")->fetchAll();
$recent = $pdo->query("SELECT a.*,u.name FROM activity_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 12")->fetchAll();
$notifications = user_notifications($admin, 25);
$unreadNotifications = notification_unread_count($admin);
$pageTitle = 'Factory control centre';
require __DIR__ . '/partials/header.php';
?>
<div class="page-heading"><div><span class="eyebrow">FACTORY CONTROL CENTRE</span><h1 id="adminGreeting" data-admin-greeting>Welcome, Admin.</h1><p class="muted">Your loyalty programme at a glance.</p></div><span class="admin-chip">● SYSTEM LIVE</span></div>
<?php if ($errors): ?><div class="error-list" role="alert"><?php foreach ($errors as $error): ?><p><?= e($error) ?></p><?php endforeach; ?></div><?php endif; ?>
<section class="metric-grid">
 <?php foreach ([['Customers',$stats['customers'],'♙'],['Codes generated',$stats['codes'],'▣'],['Codes redeemed',$stats['redeemed'],'✓'],['Points in circulation',$stats['points'],'✦']] as $metric): ?><div class="panel metric-card"><div class="metric-icon"><?= $metric[2] ?></div><small><?= e($metric[0]) ?></small><strong><?= number_format($metric[1]) ?></strong></div><?php endforeach; ?>
</section>
<section class="content-grid admin-content">
 <div class="panel"><span class="eyebrow">PACKAGING OPERATIONS</span><h2>Generate box codes</h2><p class="muted">Create unique, one-time codes to print on product inserts. The plain codes are shown only once.</p>
 <form method="post" class="stack"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="generate"><div class="form-two"><label>Number of codes<input type="number" name="quantity" min="1" max="100" step="1" value="<?= e(post_string('quantity') !== '' ? post_string('quantity') : '10') ?>" required inputmode="numeric" data-validate="int" data-label="Number of codes" data-server-error="<?= e($genErrors['quantity'] ?? '') ?>"></label><label>Points per box<input type="number" name="points" min="1" max="1000" step="1" value="<?= e(post_string('points') !== '' ? post_string('points') : (string)POINTS_PER_BOX) ?>" required inputmode="numeric" data-validate="int" data-label="Points per box" data-server-error="<?= e($genErrors['points'] ?? '') ?>"></label></div><button class="btn btn-primary" type="submit">Generate secure codes →</button></form>
 <?php if ($newCodes): ?><div class="codes-output"><div class="section-head"><strong>New codes — save or print now</strong><button class="btn btn-quiet btn-small" type="button" data-copy-codes>Copy all</button></div><div class="code-list"><?php foreach ($newCodes as $code): ?><code><?= e($code) ?></code><?php endforeach; ?></div><small>These codes cannot be viewed again. Store/print them securely.</small></div><?php endif; ?>
 </div>
 <div class="panel"><span class="eyebrow">PROGRAM HEALTH</span><h2>Redemption rate</h2><?php $rate = $stats['codes'] ? round($stats['redeemed']/$stats['codes']*100) : 0; ?><div class="gauge-wrap"><canvas data-three-gauge data-value="<?= (int)$rate ?>" role="img" aria-label="3D gauge: <?= (int)$rate ?> percent of codes redeemed. Drag to rotate." tabindex="0"></canvas><div class="big-rate"><?= $rate ?><small>%</small></div></div><div class="progress-track large"><span style="width:<?= $rate ?>%"></span></div><p class="muted"><?= $stats['redeemed'] ?> of <?= $stats['codes'] ?> generated codes have been redeemed.</p><div class="health-note"><span>●</span> Codes are hashed at rest and single-use.</div></div>
</section>
<section class="panel table-panel notifications-panel" id="notifications"><div class="section-head"><div><span class="eyebrow">ADMIN INBOX</span><h2>Reward notifications</h2><p class="muted">New customer requests and reward workflow updates.</p></div><div class="inline-actions"><?php if ($unreadNotifications): ?><form method="post"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="mark_notifications_read"><button class="btn btn-quiet btn-small" type="submit">Mark all read</button></form><?php endif; ?><form method="post" onsubmit="return confirm('Delete all admin reward notifications? This cannot be undone.');"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="clear_notifications"><button class="btn btn-quiet btn-small" type="submit">Clear</button></form></div></div>
<?php if (!$notifications): ?><p class="muted">No notifications yet. New reward requests will appear here.</p><?php else: ?><div class="notification-list"><?php foreach ($notifications as $notice): ?><article class="notification-item <?= $notice['read_at'] === null ? 'is-unread' : '' ?>"><span class="notification-icon" aria-hidden="true">✦</span><div class="notification-copy"><div class="notification-title-row"><strong><?= e($notice['title']) ?></strong><?php if ($notice['read_at'] === null): ?><span class="unread-label">NEW</span><?php endif; ?></div><p><?= e($notice['message']) ?></p><small><?= e($notice['created_at']) ?></small></div></article><?php endforeach; ?></div><?php endif; ?></section>
<section class="panel table-panel"><div class="section-head"><div><span class="eyebrow">CUSTOMER SERVICE</span><h2>Pending reward requests</h2></div><span class="count-badge"><?= count($pending) ?> pending</span></div>
<?php if (!$pending): ?><p class="muted">No pending reward requests.</p><?php else: ?><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Reward</th><th>Points</th><th>Requested</th><th>Action</th></tr></thead><tbody><?php foreach ($pending as $r): ?><tr><td><strong><?= e($r['name']) ?></strong><small><?= e($r['email']) ?></small></td><td><?= e($r['reward_name']) ?></td><td><?= (int)$r['points_cost'] ?></td><td><?= e($r['created_at']) ?></td><td><form method="post" class="inline-actions"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="redemption"><input type="hidden" name="redemption_id" value="<?= (int)$r['id'] ?>"><button class="btn btn-small btn-primary" name="decision" value="approved">Approve</button><button class="btn btn-small btn-quiet" name="decision" value="rejected">Reject</button></form></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
</section>
<section class="panel table-panel" id="recent-activity"><div class="section-head"><div><span class="eyebrow">LIVE MONITORING</span><h2>Recent activity</h2></div><form method="post" onsubmit="return confirm('Delete all recent activity history for every customer? This cannot be undone.');"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="clear_activity"><button class="btn btn-quiet btn-small" type="submit">Clear</button></form></div><?php if (!$recent): ?><p class="muted">No activity recorded yet.</p><?php else: ?><div class="activity-list"><?php foreach ($recent as $item): ?><div class="activity-item"><span class="activity-dot"></span><div><strong><?= e($item['name'] ?? 'System') ?> · <?= e($item['detail']) ?></strong><small><?= e($item['created_at']) ?></small></div><span class="muted tiny"><?= e($item['action']) ?></span></div><?php endforeach; ?></div><?php endif; ?></section>
<?php require __DIR__ . '/partials/footer.php'; ?>
