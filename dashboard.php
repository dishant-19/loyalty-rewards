<?php
require __DIR__ . '/config.php';
$user = require_login();
if ($user['role'] === 'admin') redirect('admin.php');
$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = post_string('action') ?: 'redeem_code';

    if ($action === 'mark_notifications_read') {
        mark_user_notifications_read($user);
        flash('Notifications marked as read.');
        redirect('dashboard.php#notifications');
    } elseif ($action === 'clear_notifications') {
        $stmt = db()->prepare("DELETE FROM notifications WHERE recipient_role='customer' AND recipient_user_id=?");
        $stmt->execute([(int)$user['id']]);
        flash('Your notifications have been cleared.');
        redirect('dashboard.php#notifications');
    } elseif ($action === 'clear_activity') {
        $stmt = db()->prepare('DELETE FROM activity_log WHERE user_id=?');
        $stmt->execute([(int)$user['id']]);
        flash('Your recent activity has been cleared.');
        redirect('dashboard.php#recent-activity');
    } elseif ($action === 'clear_reward_requests') {
        // Keep pending requests intact so reserved points and admin review remain consistent.
        $stmt = db()->prepare("DELETE FROM redemptions WHERE user_id=? AND status IN ('approved','rejected')");
        $stmt->execute([(int)$user['id']]);
        flash('Processed reward request history has been cleared. Pending requests were kept.');
        redirect('dashboard.php#reward-requests');
    } elseif ($action === 'request_reward') {
        $pdo = db();
        try {
            $pdo->beginTransaction();
            // Lock the customer balance so two tabs cannot spend the same 100 points.
            $balanceStmt = $pdo->prepare('SELECT points,reward_progress FROM users WHERE id=? FOR UPDATE');
            $balanceStmt->execute([$user['id']]);
            $lockedBalance = $balanceStmt->fetch();
            $balance = (int)($lockedBalance['points'] ?? 0);
            $rewardProgressBefore = (int)($lockedBalance['reward_progress'] ?? 0);
            if ($balance < REWARD_REQUEST_POINTS || $rewardProgressBefore < REWARD_REQUEST_POINTS) {
                throw new RuntimeException('Earn 100 new points since your last reward request to unlock this reward.');
            }

            $deduct = $pdo->prepare('UPDATE users SET points=points-?,reward_progress=0 WHERE id=? AND points>=? AND reward_progress>=?');
            $deduct->execute([REWARD_REQUEST_POINTS, $user['id'], REWARD_REQUEST_POINTS, REWARD_REQUEST_POINTS]);
            if ($deduct->rowCount() !== 1) {
                throw new RuntimeException('Your point balance changed. Refresh and try again.');
            }

            $pdo->prepare('INSERT INTO redemptions(user_id,reward_name,points_cost,reward_progress_before,status) VALUES(?,?,?,?,\'pending\')')
                ->execute([$user['id'], REWARD_REQUEST_NAME, REWARD_REQUEST_POINTS, $rewardProgressBefore]);
            $redemptionId = (int)$pdo->lastInsertId();
            create_notification($pdo, 'customer', (int)$user['id'], $redemptionId, 'request_submitted', 'Reward request submitted', 'Your ' . REWARD_REQUEST_NAME . ' request #' . $redemptionId . ' is pending review. ' . REWARD_REQUEST_POINTS . ' points have been reserved.');
            create_notification($pdo, 'admin', null, $redemptionId, 'request_submitted', 'New reward request', $user['name'] . ' submitted request #' . $redemptionId . ' for ' . REWARD_REQUEST_NAME . ' (' . REWARD_REQUEST_POINTS . ' points).');
            $pdo->prepare('INSERT INTO activity_log(user_id,action,detail) VALUES(?,?,?)')
                ->execute([$user['id'], 'redemption_requested', 'Requested ' . REWARD_REQUEST_NAME . ' for ' . REWARD_REQUEST_POINTS . ' points']);
            $pdo->commit();
            flash('Reward request submitted! 100 points have been reserved. The factory team will review it.');
            redirect('dashboard.php');
        } catch (RuntimeException $ex) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $errors[] = $ex->getMessage();
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $errors[] = 'We could not submit your reward request. Please try again.';
        }
    } elseif ($action === 'redeem_code') {
        $rawCode = post_string('code');
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $rawCode));
        if ($rawCode === '') {
            $errors['code'] = 'Enter the 12-character code from inside your box.';
        } elseif (strlen($rawCode) > 40) {
            $errors['code'] = 'That code is too long. Codes are exactly 12 letters and numbers.';
        } elseif (strlen($code) < 12) {
            $errors['code'] = 'Code needs 12 characters — you entered ' . strlen($code) . '.';
        } elseif (strlen($code) > 12) {
            $errors['code'] = 'Code is too long. Codes are exactly 12 letters and numbers.';
        } else {
            $hash = hash('sha256', $code);
            $pdo = db();
            try {
                $pdo->beginTransaction();
                $stmt = $pdo->prepare("SELECT id,points,status FROM box_codes WHERE code_hash=?");
                $stmt->execute([$hash]); $box = $stmt->fetch();
                if (!$box) throw new RuntimeException('This code is not valid. Check the code and try again.');
                if ($box['status'] !== 'unused') throw new RuntimeException('This box code has already been redeemed.');
                $upd = $pdo->prepare("UPDATE box_codes SET status='redeemed',redeemed_by=?,redeemed_at=CURRENT_TIMESTAMP WHERE id=? AND status='unused'");
                $upd->execute([$user['id'], $box['id']]);
                if ($upd->rowCount() !== 1) throw new RuntimeException('This code has already been used.');
                $pdo->prepare('UPDATE users SET points=points+?,reward_progress=reward_progress+? WHERE id=?')->execute([$box['points'], $box['points'], $user['id']]);
                $pdo->prepare('INSERT INTO activity_log(user_id,action,detail) VALUES(?,?,?)')->execute([$user['id'],'code_redeemed','Earned '.$box['points'].' points']);
                $pdo->commit();
                flash('Success! '.$box['points'].' points have been added to your balance.');
                redirect('dashboard.php');
            } catch (RuntimeException $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errors[] = $ex->getMessage();
            } catch (Throwable $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errors[] = 'We could not redeem that code. Please try again.';
            }
        }
    }
}
$user = current_user();
$history = db()->prepare("SELECT action,detail,created_at FROM activity_log WHERE user_id=? ORDER BY id DESC LIMIT 6");
$history->execute([$user['id']]);
$redemptions = db()->prepare("SELECT reward_name,points_cost,status,created_at FROM redemptions WHERE user_id=? ORDER BY id DESC LIMIT 5");
$redemptions->execute([$user['id']]);
$rewardRequests = $redemptions->fetchAll();
$rewardProgress = min(REWARD_REQUEST_POINTS, (int)$user['reward_progress']);
$notifications = user_notifications($user, 20);
$unreadNotifications = notification_unread_count($user);
$pageTitle = 'My rewards';
require __DIR__ . '/partials/header.php';
?>
<div class="page-heading"><div><span class="eyebrow">MEMBER DASHBOARD</span><h1>Hey, <?= e($user['name']) ?> <span class="wave">✦</span></h1><p class="muted">Every box brings you closer to something good.</p></div><a class="btn btn-primary" href="#claim">+ Add box code</a></div>
<section class="dashboard-grid">
 <div class="panel points-card"><div class="points-orb">✦</div><canvas class="coin-3d" data-three-coin role="img" aria-label="Interactive 3D gold coin. Drag to spin, click for a flip." tabindex="0"></canvas><span class="eyebrow">YOUR POINT BALANCE</span><div class="points-number"><?= number_format((int)$user['points']) ?></div><p>points ready to redeem</p><div class="progress-track"><span style="width:<?= (int)$rewardProgress ?>%"></span></div><small><?= (int)$user['reward_progress'] >= REWARD_REQUEST_POINTS ? 'Reward request available now' : (REWARD_REQUEST_POINTS - (int)$user['reward_progress']) . ' new points to unlock your next request' ?></small></div>
 <div class="panel how-card"><span class="eyebrow">HOW IT WORKS</span><h3>Three simple steps</h3><div class="step"><b>01</b><span><strong>Open your box</strong><small>Find the unique code inside.</small></span></div><div class="step"><b>02</b><span><strong>Enter your code</strong><small>Each code can only be used once.</small></span></div><div class="step"><b>03</b><span><strong>Collect your points</strong><small>Use points to claim rewards.</small></span></div></div>
</section>
<section class="content-grid">
 <div class="panel" id="claim"><span class="eyebrow">GOT A NEW BOX?</span><h2>Claim your points</h2><p class="muted">Enter the 12-character code found inside your product packaging.</p>
 <?php if ($errors): ?><div class="error-list" role="alert"><?php foreach ($errors as $error): ?><p><?= e($error) ?></p><?php endforeach; ?></div><?php endif; ?>
 <form method="post" class="claim-form" novalidate><input type="hidden" name="action" value="redeem_code"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input name="code" maxlength="24" placeholder="AB12CD34EF56" required autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" aria-label="Box code" data-validate="code" data-ok-text="Looks good — ready to redeem" data-server-error="<?= e($errors['code'] ?? '') ?>"><button class="btn btn-primary" type="submit">Redeem code →</button></form><small class="muted">Tip: Codes are case-insensitive. Keep your code private.</small>
 </div>
 <div class="panel reward-request-panel"><span class="eyebrow">REWARD REQUEST</span><h2>Turn points into rewards</h2><div class="reward-row"><div class="reward-icon">☕</div><div><strong><?= e(REWARD_REQUEST_NAME) ?></strong><small><?= REWARD_REQUEST_POINTS ?> points per request</small></div><span class="reward-tag">POPULAR</span></div><p class="muted">Submit a request after earning 100 new points. Each request deducts 100 from your balance and resets your reward progress for the next 100-point cycle.</p><?php if ((int)$user['points'] >= REWARD_REQUEST_POINTS && (int)$user['reward_progress'] >= REWARD_REQUEST_POINTS): ?><form method="post" class="reward-request-form"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="request_reward"><button class="btn btn-primary" type="submit">Request reward · 100 points →</button></form><?php else: ?><button class="btn btn-quiet" type="button" disabled>Need <?= max(REWARD_REQUEST_POINTS - (int)$user['reward_progress'], REWARD_REQUEST_POINTS - (int)$user['points'], 0) ?> more points</button><?php endif; ?><small class="muted">If the factory rejects your request, all 100 points are automatically returned.</small></div>
</section>
<section class="panel table-panel notifications-panel" id="notifications"><div class="section-head"><div><span class="eyebrow">INBOX</span><h2>Your notifications</h2><p class="muted">Updates about submitted, approved and rejected reward requests.</p></div><div class="inline-actions"><?php if ($unreadNotifications): ?><form method="post"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="mark_notifications_read"><button class="btn btn-quiet btn-small" type="submit">Mark all read</button></form><?php endif; ?><form method="post" onsubmit="return confirm('Delete all your notifications? This cannot be undone.');"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="clear_notifications"><button class="btn btn-quiet btn-small" type="submit">Clear</button></form></div></div>
<?php if (!$notifications): ?><p class="muted">You are all caught up. Reward updates will appear here.</p><?php else: ?><div class="notification-list"><?php foreach ($notifications as $notice): ?><article class="notification-item <?= $notice['read_at'] === null ? 'is-unread' : '' ?>"><span class="notification-icon" aria-hidden="true"><?= $notice['notification_type'] === 'request_approved' ? '✓' : ($notice['notification_type'] === 'request_rejected' ? '!' : ($notice['notification_type'] === 'points_refunded' ? '↺' : '✦')) ?></span><div class="notification-copy"><div class="notification-title-row"><strong><?= e($notice['title']) ?></strong><?php if ($notice['read_at'] === null): ?><span class="unread-label">NEW</span><?php endif; ?></div><p><?= e($notice['message']) ?></p><small><?= e($notice['created_at']) ?></small></div></article><?php endforeach; ?></div><?php endif; ?></section>
<section class="panel table-panel" id="reward-requests"><div class="section-head"><div><span class="eyebrow">REWARD TRACKER</span><h2>Your reward requests</h2></div><div class="inline-actions"><form method="post" onsubmit="return confirm('Delete processed reward request history? Pending requests will remain.');"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="clear_reward_requests"><button class="btn btn-quiet btn-small" type="submit">Clear</button></form><span class="count-badge"><?= count($rewardRequests) ?> recent</span></div></div>
<?php if (!$rewardRequests): ?><p class="muted">Your reward requests and their approval status will appear here.</p><?php else: ?><div class="activity-list"><?php foreach ($rewardRequests as $request): ?><div class="activity-item"><span class="activity-dot"></span><div><strong><?= e($request['reward_name']) ?> · <?= (int)$request['points_cost'] ?> points</strong><small><?= e($request['created_at']) ?></small></div><span class="request-status status-<?= e($request['status']) ?>"><?= e(ucfirst($request['status'])) ?></span></div><?php endforeach; ?></div><?php endif; ?></section>
<section class="panel table-panel" id="recent-activity"><div class="section-head"><div><span class="eyebrow">YOUR ACTIVITY</span><h2>Recent activity</h2></div><form method="post" onsubmit="return confirm('Delete your recent activity history? This cannot be undone.');"><input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="clear_activity"><button class="btn btn-quiet btn-small" type="submit">Clear</button></form></div>
<?php if (!$history->rowCount()): ?><p class="muted">Your activity will appear here when you redeem your first box code.</p><?php else: ?><div class="activity-list"><?php foreach ($history as $item): ?><div class="activity-item"><span class="activity-dot"></span><div><strong><?= e($item['detail']) ?></strong><small><?= e($item['created_at']) ?></small></div><span class="status-pill">Complete</span></div><?php endforeach; ?></div><?php endif; ?>
</section>
<?php require __DIR__ . '/partials/footer.php'; ?>
