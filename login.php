<?php
require __DIR__ . '/config.php';
if (current_user()) redirect(current_user()['role'] === 'admin' ? 'admin.php' : 'dashboard.php');
$error = ''; $fieldErrors = []; $email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $email = strtolower(post_string('email'));
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
    if ($email === '' || strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $fieldErrors['email'] = $email === '' ? 'Enter your email address.' : 'Enter a valid email address.';
    }
    if ($password === '') $fieldErrors['password'] = 'Enter your password.';
    elseif (strlen($password) > 1024) $fieldErrors['password'] = 'Password is too long.';
    if (!$fieldErrors) {
        $stmt = db()->prepare('SELECT id,password,role FROM users WHERE email=?');
        $stmt->execute([$email]); $record = $stmt->fetch();
        if ($record && password_verify($password, $record['password'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$record['id'];
            redirect($record['role'] === 'admin' ? 'admin.php' : 'dashboard.php');
        }
        // Deliberately generic: never reveal whether the email exists.
        $error = 'Email or password is incorrect.';
    }
}
$pageTitle = 'Sign in';
require __DIR__ . '/partials/header.php';
?>
<section class="auth-layout">
 <div class="hero-copy"><span class="eyebrow">YOUR PURCHASES. YOUR PERKS.</span><h1>Make every<br><span>box count.</span></h1><p>Enter the unique code inside your product box and watch your points grow.</p><div class="stats-mini"><div><strong>10</strong><small>POINTS PER BOX</small></div><div><strong>1 code</strong><small>ONE-TIME USE</small></div></div><div class="mini-3d"><canvas data-three-mini role="img" aria-label="Interactive 3D gift box. Drag to rotate, click or press Enter to open the lid." tabindex="0"></canvas></div></div>
 <div class="panel auth-panel"><span class="eyebrow">WELCOME BACK</span><h2>Sign in</h2><p class="muted">Your next reward is just around the corner.</p>
 <?php if ($error || $fieldErrors): ?><div class="error-list" role="alert"><?php foreach (array_filter([$error] + $fieldErrors) as $message): ?><p><?= e($message) ?></p><?php endforeach; ?></div><?php endif; ?>
 <form method="post" class="stack" novalidate>
  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
  <label>Email address<input type="email" name="email" value="<?= e($email) ?>" maxlength="190" required autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" data-validate="email" data-server-error="<?= e($fieldErrors['email'] ?? '') ?>"></label>
  <label>Password<input type="password" name="password" maxlength="1024" required autocomplete="current-password" data-validate="password-current" data-server-error="<?= e($fieldErrors['password'] ?? '') ?>"></label>
  <button class="btn btn-primary btn-block" type="submit">Sign in <span>→</span></button>
 </form><p class="form-foot">New to BoxBonus? <a href="register.php">Create an account</a></p>
 <p class="demo-hint">Demo admin: <strong>admin@example.com</strong> / <strong>Admin@12345</strong></p>
 </div>
</section>
<?php require __DIR__ . '/partials/footer.php'; ?>
