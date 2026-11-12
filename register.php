<?php
require __DIR__ . '/config.php';
if (current_user()) redirect('dashboard.php');

$errors = [];            // field => message (rendered inline AND in the summary for no-JS users)
$name = ''; $email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $name = post_string('name');
    $email = strtolower(post_string('email'));
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
    $confirm = is_string($_POST['password_confirm'] ?? null) ? $_POST['password_confirm'] : '';

    // Name: 2–80 characters, letters/marks/spaces/apostrophe/dot/hyphen only.
    if ($name === '') $errors['name'] = 'Enter your full name.';
    elseif (mb_strlen($name) < 2 || mb_strlen($name) > 80) $errors['name'] = 'Name must be 2–80 characters.';
    elseif (!preg_match('/^[\p{L}\p{M}][\p{L}\p{M}\s\'.\-]*$/u', $name)) $errors['name'] = 'Name may contain letters, spaces, apostrophes, dots and hyphens only.';

    // Email: required, valid, no whitespace, max 190.
    if ($email === '') $errors['email'] = 'Enter your email address.';
    elseif (strlen($email) > 190) $errors['email'] = 'Email address is too long (190 characters max).';
    elseif (preg_match('/\\s/', $email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';

    // Password: 8+ chars, <=72 bytes (bcrypt limit), uppercase, number.
    if ($password === '') $errors['password'] = 'Create a password.';
    elseif (strlen($password) < 8) $errors['password'] = 'Password must be at least 8 characters.';
    elseif (strlen($password) > 72) $errors['password'] = 'Password must be 72 bytes or fewer.';
    elseif (!preg_match('/[A-Z]/', $password)) $errors['password'] = 'Add at least one uppercase letter.';
    elseif (!preg_match('/[0-9]/', $password)) $errors['password'] = 'Add at least one number.';

    if ($confirm === '') $errors['password_confirm'] = 'Confirm your password.';
    elseif (!hash_equals($password, $confirm)) $errors['password_confirm'] = 'Passwords do not match.';

    // Friendly duplicate check (the UNIQUE index still guards against a race).
    if (!isset($errors['email'])) {
        $dup = db()->prepare('SELECT 1 FROM users WHERE email=? LIMIT 1');
        $dup->execute([$email]);
        if ($dup->fetchColumn()) $errors['email'] = 'That email address is already registered.';
    }

    if (!$errors) {
        try {
            $stmt = db()->prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)");
            $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            $_SESSION['user_id'] = (int)db()->lastInsertId();
            session_regenerate_id(true);
            flash('Welcome to BoxBonus! Your account is ready.');
            redirect('dashboard.php');
        } catch (PDOException $ex) {
            if ($ex->getCode() === '23000') $errors['email'] = 'That email address is already registered.';
            else $errors['form'] = 'We could not create your account. Please try again.';
        }
    }
}
$pageTitle = 'Create account';
require __DIR__ . '/partials/header.php';
?>
<section class="auth-layout">
 <div class="hero-copy"><span class="eyebrow">REWARDS THAT ADD UP</span><h1>Good things<br><span>come in boxes.</span></h1><p>Unlock points with every purchase. Redeem them for rewards you’ll love.</p><div class="mini-3d"><canvas data-three-mini role="img" aria-label="Interactive 3D gift box. Drag to rotate, click or press Enter to open the lid." tabindex="0"></canvas><div class="floating-box"><div class="box-top"></div><div class="box-front">+10</div><div class="box-side"></div></div></div></div>
 <div class="panel auth-panel"><span class="eyebrow">GET STARTED</span><h2>Create your account</h2><p class="muted">Join BoxBonus and start collecting points.</p>
 <?php if ($errors): ?><div class="error-list" role="alert"><?php foreach ($errors as $message): ?><p><?= e($message) ?></p><?php endforeach; ?></div><?php endif; ?>
 <form method="post" class="stack" novalidate>
  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
  <label>Full name<input name="name" value="<?= e($name) ?>" maxlength="80" required autocomplete="name" data-validate="name" data-server-error="<?= e($errors['name'] ?? '') ?>"></label>
  <label>Email address<input type="email" name="email" value="<?= e($email) ?>" maxlength="190" required autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" data-validate="email" data-server-error="<?= e($errors['email'] ?? '') ?>"></label>
  <label>Password<input type="password" name="password" minlength="8" maxlength="72" required autocomplete="new-password" data-validate="password-new" data-server-error="<?= e($errors['password'] ?? '') ?>"><small>At least 8 characters, one uppercase letter and one number.</small></label>
  <label>Confirm password<input type="password" name="password_confirm" maxlength="72" required autocomplete="new-password" data-validate="password-confirm" data-ok-text="Passwords match" data-server-error="<?= e($errors['password_confirm'] ?? '') ?>"></label>
  <button class="btn btn-primary btn-block" type="submit">Create account <span>→</span></button>
 </form><p class="form-foot">Already a member? <a href="login.php">Sign in</a></p>
 </div>
</section>
<?php require __DIR__ . '/partials/footer.php'; ?>
