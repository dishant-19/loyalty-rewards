<?php
$pageTitle = $pageTitle ?? APP_NAME;
$flashMessage = take_flash();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b1020">
  <title><?= e($pageTitle) ?> · <?= APP_NAME ?></title>
  <link rel="stylesheet" href="assets/style.css">
  <link rel="stylesheet" href="assets/design-3d.css">
  <script defer src="assets/app.js"></script>
  <script defer src="assets/ux.js"></script>
  <script type="module" src="assets/three-fx.js"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
<header class="topbar">
  <a class="brand" href="index.php"><span class="brand-mark">B</span><span>box<span class="brand-accent">bonus</span></span></a>
  <div class="top-actions">
    <button class="theme-toggle" type="button" aria-label="Toggle theme">☼ <span>Theme</span></button>
    <?php if ($navUser = current_user()): ?>
      <?php $navUnread = notification_unread_count($navUser); $inboxHref = $navUser['role'] === 'admin' ? 'admin.php#notifications' : 'dashboard.php#notifications'; ?>
      <a class="notification-nav" href="<?= e($inboxHref) ?>" aria-label="Notifications<?= $navUnread ? ', ' . $navUnread . ' unread' : '' ?>"><span aria-hidden="true">♧</span><span class="notification-nav-label">Inbox</span><?php if ($navUnread): ?><b><?= $navUnread > 99 ? '99+' : $navUnread ?></b><?php endif; ?></a>
      <span class="nav-name"><?= e($navUser['name']) ?></span>
      <a class="btn btn-quiet btn-small" href="logout.php">Sign out</a>
    <?php endif; ?>
  </div>
</header>
<main class="container" id="main">
<?php if ($flashMessage): ?>
  <div class="notice <?= e($flashMessage['type']) ?>"><?= e($flashMessage['message']) ?></div>
<?php endif; ?>
