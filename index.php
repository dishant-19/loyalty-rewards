<?php
require __DIR__ . '/config.php';
$user = current_user();
if ($user) redirect($user['role'] === 'admin' ? 'admin.php' : 'dashboard.php');
$pageTitle = 'Rewards, reimagined';
require __DIR__ . '/partials/header.php';
?>
<section class="landing-hero" aria-labelledby="landing-title">
  <div class="hero-grid-glow" aria-hidden="true"></div>
  <div class="landing-copy">
    <span class="eyebrow"><span class="live-dot"></span> THE REWARD EXPERIENCE, REIMAGINED</span>
    <h1 id="landing-title">A little joy.<br><span>A lot of</span> <em>bonus.</em></h1>
    <p class="landing-lede">Every box holds more than a product. Unlock points, collect little wins, and turn the things you love into rewards worth opening.</p>
    <div class="landing-actions">
      <a class="btn btn-primary landing-cta" href="register.php">Start collecting <span aria-hidden="true">↗</span></a>
      <a class="landing-text-link" href="login.php">I already have an account <span aria-hidden="true">→</span></a>
    </div>
    <div class="landing-proof" aria-label="How BoxBonus works">
      <div><strong>+10</strong><span>POINTS PER BOX</span></div>
      <i aria-hidden="true"></i>
      <div><strong>1 code</strong><span>ONE-TIME REDEEM</span></div>
      <i aria-hidden="true"></i>
      <div><strong>Real perks</strong><span>REWARDS THAT ADD UP</span></div>
    </div>
  </div>

  <div class="hero-visual" aria-label="Interactive three-dimensional BoxBonus gift box. Drag to rotate and click to open.">
    <div class="visual-noise" aria-hidden="true"></div>
    <div class="three-stage" data-three-stage>
      <canvas class="three-gift-canvas" data-three-gift tabindex="0" role="img" aria-label="Interactive 3D gift box. Drag to rotate. Press Enter or click to open and close the lid."></canvas>
      <span class="three-hint" aria-hidden="true"><i></i> DRAG TO EXPLORE <b>·</b> CLICK TO UNBOX</span>
    </div>
    <div class="orbit orbit-one" aria-hidden="true"></div>
    <div class="orbit orbit-two" aria-hidden="true"></div>
    <div class="orbit orbit-three" aria-hidden="true"></div>
    <div class="hero-spark spark-a" aria-hidden="true">✦</div>
    <div class="hero-spark spark-b" aria-hidden="true">✧</div>
    <div class="hero-spark spark-c" aria-hidden="true">·</div>
    <div class="bonus-token token-one" aria-hidden="true"><span>✦</span><small>+10</small></div>
    <div class="bonus-token token-two" aria-hidden="true"><span>✧</span></div>
    <div class="bonus-token token-three" aria-hidden="true"><span>+</span></div>
    <div class="hero-pedestal" aria-hidden="true"><span></span></div>
    <div class="gift-scene" data-tilt-scene>
      <div class="gift-shadow" aria-hidden="true"></div>
      <div class="gift-box" aria-hidden="true">
        <div class="gift-face gift-front"><span class="gift-brand">BOX<span>BONUS</span></span><strong>GOOD<br>THINGS<br>INSIDE.</strong><i>✦</i></div>
        <div class="gift-face gift-side"></div>
        <div class="gift-face gift-top"></div>
        <div class="gift-ribbon ribbon-front"></div>
        <div class="gift-ribbon ribbon-side"></div>
        <div class="gift-lid">
          <div class="lid-top"></div><div class="lid-front"></div><div class="lid-side"></div>
          <div class="gift-bow bow-left"></div><div class="gift-bow bow-right"></div><div class="gift-bow bow-knot"></div>
        </div>
      </div>
    </div>
    <div class="floating-caption caption-top"><span class="caption-icon">✦</span><span><b>A surprise in every box</b><small>Collect points as you go</small></span></div>
    <div class="floating-caption caption-bottom"><span class="caption-check">✓</span><span><b>Your next reward awaits</b><small>One code. One little win.</small></span></div>
    <div class="visual-index" aria-hidden="true">01 <span></span> UNBOX THE EXTRAORDINARY</div>
  </div>
  <a class="scroll-cue" href="#how-it-works"><span></span> SCROLL TO EXPLORE</a>
</section>

<section class="landing-section how-section" id="how-it-works">
  <div class="section-intro"><span class="eyebrow">THREE STEPS. MORE LITTLE WINS.</span><h2>From unboxing<br>to <em>unbelievable.</em></h2><p>Getting rewarded is refreshingly simple. Your next purchase could be your next perk.</p></div>
  <div class="how-steps">
    <article class="how-step"><div class="step-visual step-box"><span class="step-number">01</span><div class="mini-cube"><i></i><b></b></div></div><h3>Find your code</h3><p>Look for the unique BoxBonus code tucked inside your product box.</p></article>
    <article class="how-step"><div class="step-visual step-scan"><span class="step-number">02</span><div class="scan-card"><span>BOXBONUS</span><b>•••• ••••</b><i>✓</i></div></div><h3>Enter & collect</h3><p>Sign in, enter your code, and watch your points balance grow.</p></article>
    <article class="how-step"><div class="step-visual step-gift"><span class="step-number">03</span><div class="mini-gift"><i>✦</i><b>REWARD</b></div></div><h3>Enjoy the bonus</h3><p>Keep collecting and turn your points into rewards worth celebrating.</p></article>
  </div>
</section>

<section class="landing-banner">
  <div class="banner-orb" aria-hidden="true"></div>
  <div><span class="eyebrow">YOUR NEXT LITTLE WIN STARTS HERE</span><h2>Ready to make<br>every box <em>count?</em></h2></div>
  <a class="btn btn-primary landing-cta" href="register.php">Join BoxBonus <span aria-hidden="true">↗</span></a>
</section>
<?php require __DIR__ . '/partials/footer.php'; ?>
