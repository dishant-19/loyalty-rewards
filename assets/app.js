(() => {
  const root = document.documentElement;

  // Show the admin greeting in the visitor's own time zone (not the server's).
  const adminGreeting = document.querySelector('[data-admin-greeting]');
  if (adminGreeting) {
    let localHour = new Date().getHours();
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const parts = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        ...(timeZone ? { timeZone } : {})
      }).formatToParts(new Date());
      const hourPart = parts.find(part => part.type === 'hour');
      if (hourPart) localHour = Number(hourPart.value);
    } catch (_) {
      // Fall back to the browser's local clock if Intl time-zone data is unavailable.
    }
    const greeting = localHour >= 5 && localHour < 12
      ? 'Good morning'
      : localHour >= 12 && localHour < 17
        ? 'Good afternoon'
        : 'Good evening';
    adminGreeting.textContent = `${greeting}, Admin.`;
  }

  const saved = localStorage.getItem('boxbonus-theme');
  if (saved) root.dataset.theme = saved;
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('boxbonus-theme', next);
  });
  const copy = document.querySelector('[data-copy-codes]');
  copy?.addEventListener('click', async () => {
    const codes = [...document.querySelectorAll('.code-list code')].map(el => el.textContent).join('\n');
    try {
      await navigator.clipboard.writeText(codes);
      copy.textContent = 'Copied!';
    } catch {
      copy.textContent = 'Select codes to copy';
    }
  });
  // Form validation, loading states and 3D tilt now live in ux.js.

  // Presentation-only motion: reveal content as it enters the viewport.
  const revealTargets = document.querySelectorAll('.page-heading, .dashboard-grid > *, .content-grid > *, .table-panel, .metric-card, .auth-panel');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    revealTargets.forEach((el, index) => {
      if (el.classList.contains('auth-panel')) return;
      el.classList.add('js-reveal');
      el.style.transitionDelay = `${Math.min(index % 4, 3) * 75}ms`;
      revealObserver.observe(el);
    });
  }

  // Real interactive Three.js gift scene. The legacy CSS gift remains as a
  // graceful fallback if WebGL or the external module cannot be loaded.
  const giftCanvas = document.querySelector('[data-three-gift]');
  const heroVisual = giftCanvas?.closest('.hero-visual');
  if (giftCanvas && heroVisual) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    (async () => {
      try {
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
        if (!giftCanvas.isConnected) return;

        const renderer = new THREE.WebGLRenderer({ canvas: giftCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(4.3, 3.15, 6.7);
        const clock = new THREE.Clock();

        scene.add(new THREE.HemisphereLight(0xdfffd0, 0x172039, 2.0));
        const keyLight = new THREE.DirectionalLight(0xfff4d9, 4.2);
        keyLight.position.set(-3.8, 7, 5.5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.left = -5; keyLight.shadow.camera.right = 5;
        keyLight.shadow.camera.top = 5; keyLight.shadow.camera.bottom = -5;
        keyLight.shadow.bias = -0.00015;
        scene.add(keyLight);
        const greenLight = new THREE.PointLight(0x9bff63, 34, 9, 2);
        greenLight.position.set(3.4, 1.8, -2.8); scene.add(greenLight);
        const rimLight = new THREE.PointLight(0x9382ff, 24, 8, 2);
        rimLight.position.set(-4, 1.5, -1); scene.add(rimLight);

        const giftRoot = new THREE.Group();
        scene.add(giftRoot);
        const box = new THREE.Group();
        giftRoot.add(box);

        const green = new THREE.MeshPhysicalMaterial({ color: 0x8edb5d, roughness: 0.29, metalness: 0.08, clearcoat: 0.8, clearcoatRoughness: 0.2 });
        const greenLightMat = new THREE.MeshPhysicalMaterial({ color: 0xc8f7a1, roughness: 0.24, metalness: 0.06, clearcoat: 1, clearcoatRoughness: 0.16 });
        const greenSide = new THREE.MeshPhysicalMaterial({ color: 0x4c963d, roughness: 0.36, metalness: 0.12, clearcoat: 0.45 });
        const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2c65d, metalness: 0.78, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
        const goldLight = new THREE.MeshPhysicalMaterial({ color: 0xffe6a0, metalness: 0.7, roughness: 0.18, clearcoat: 1 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x243b29, roughness: 0.55 });

        const addBox = (parent, size, material, position, bevel = 0) => {
          let geometry;
          if (bevel) {
            geometry = new THREE.BoxGeometry(...size, 4, 4, 4);
          } else geometry = new THREE.BoxGeometry(...size);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
          parent.add(mesh); return mesh;
        };

        // Main package: a true beveled, physically shaded 3D box.
        addBox(box, [2.25, 1.72, 1.9], green, [0, 0, 0], 0.025);
        // Front brand plaque uses a generated canvas texture (no external image).
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512; labelCanvas.height = 256;
        const ctx = labelCanvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 256);
        ctx.fillStyle = 'rgba(22,48,27,.78)'; ctx.roundRect(16, 16, 480, 224, 24); ctx.fill();
        ctx.fillStyle = '#d8ffb9'; ctx.font = '800 34px Arial'; ctx.letterSpacing = '8px'; ctx.fillText('BOXBONUS', 42, 82);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 65px Arial'; ctx.letterSpacing = '-2px';
        ctx.fillText('GOOD THINGS', 40, 158); ctx.fillText('INSIDE.', 40, 222);
        const labelTexture = new THREE.CanvasTexture(labelCanvas); labelTexture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.74), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, side: THREE.DoubleSide }));
        label.position.set(-0.12, -0.02, 0.956); box.add(label);

        // Satin ribbon wraps all visible sides and crosses the top.
        addBox(box, [0.28, 1.74, 1.925], gold, [0.18, 0, 0.012]);
        addBox(box, [2.27, 1.74, 0.25], goldLight, [0, 0, 0.02]);
        addBox(box, [2.27, 0.18, 1.93], gold, [0, 0.79, 0]);

        // Lid pivot lifts away on click / keyboard.
        const lidPivot = new THREE.Group();
        lidPivot.position.set(0, 0.82, -0.88);
        box.add(lidPivot);
        const lid = new THREE.Group(); lidPivot.add(lid);
        addBox(lid, [2.52, 0.38, 2.12], greenLightMat, [0, 0.15, 0.88], 0.025);
        addBox(lid, [0.32, 0.405, 2.14], gold, [0.18, 0.15, 0.88]);
        addBox(lid, [2.54, 0.405, 0.28], goldLight, [0, 0.15, 0.88]);
        // Sculpted bow loops and knot.
        const bowLeft = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.095, 18, 48), goldLight);
        bowLeft.position.set(-0.28, 0.53, 0.88); bowLeft.scale.set(1.12, 0.72, 0.7); bowLeft.rotation.z = 0.38; bowLeft.castShadow = true; lid.add(bowLeft);
        const bowRight = bowLeft.clone(); bowRight.position.x = 0.32; bowRight.rotation.z = -0.38; lid.add(bowRight);
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), gold);
        knot.position.set(0.02, 0.52, 0.9); knot.scale.set(1.05, 0.82, 0.8); knot.castShadow = true; lid.add(knot);

        // Floating coin tokens with metallic rims.
        const coins = [];
        for (let i = 0; i < 5; i++) {
          const coin = new THREE.Group();
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.055, 48), gold);
          disc.rotation.x = Math.PI / 2; disc.castShadow = true; coin.add(disc);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 10, 48), goldLight);
          rim.position.z = 0.032; coin.add(rim);
          const starShape = new THREE.Shape();
          for (let j = 0; j < 10; j++) {
            const radius = j % 2 === 0 ? 0.085 : 0.038;
            const angle = Math.PI / 2 + j * Math.PI / 5;
            const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
            if (j === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
          }
          starShape.closePath();
          const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshBasicMaterial({ color: 0x704a13, side: THREE.DoubleSide }));
          star.position.z = 0.062; coin.add(star);
          coin.userData.phase = i * 1.27; coin.userData.radius = 2.0 + (i % 2) * 0.45;
          coins.push(coin); giftRoot.add(coin);
        }

        // Glowing concentric orbit rings and a subtle reflective pedestal.
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x9df36e, transparent: true, opacity: 0.42 });
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.009, 8, 180), ringMat);
        ringA.rotation.x = Math.PI * 0.5; ringA.rotation.z = -0.24; ringA.position.y = -1.17; giftRoot.add(ringA);
        const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.006, 8, 180), new THREE.MeshBasicMaterial({ color: 0x9785ff, transparent: true, opacity: 0.3 }));
        ringB.rotation.x = Math.PI * 0.5; ringB.rotation.z = 0.38; ringB.position.y = -1.2; giftRoot.add(ringB);
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.12, 0.16, 96), new THREE.MeshPhysicalMaterial({ color: 0x26384a, metalness: 0.72, roughness: 0.25, clearcoat: 1 }));
        pedestal.position.y = -1.12; pedestal.receiveShadow = true; pedestal.castShadow = true; giftRoot.add(pedestal);
        const pedestalGlow = new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.025, 10, 96), new THREE.MeshBasicMaterial({ color: 0xa6f36b, transparent: true, opacity: 0.8 }));
        pedestalGlow.rotation.x = Math.PI / 2; pedestalGlow.position.y = -1.025; giftRoot.add(pedestalGlow);

        // Procedural particle field, softly drifting around the product.
        const particleCount = 260;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
          particlePositions[i * 3] = (Math.random() - 0.5) * 8.5;
          particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5.8;
          particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 5.5;
          particleSizes[i] = 0.35 + Math.random() * 0.9;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMaterial = new THREE.PointsMaterial({ color: 0xd9ffbc, size: 0.035, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        const particles = new THREE.Points(particleGeometry, particleMaterial); scene.add(particles);

        // Ground plane catches the product's soft shadow.
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -1.23; floor.receiveShadow = true; scene.add(floor);

        let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
        let dragging = false, downX = 0, downY = 0, moved = false, isOpen = false;
        const onPointerDown = event => { dragging = true; moved = false; downX = event.clientX; downY = event.clientY; giftCanvas.setPointerCapture?.(event.pointerId); };
        const onPointerMove = event => {
          if (dragging) {
            const dx = event.clientX - downX, dy = event.clientY - downY;
            if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
            targetY += dx * 0.008; targetX = THREE.MathUtils.clamp(targetX + dy * 0.005, -0.38, 0.38);
            downX = event.clientX; downY = event.clientY;
          } else if (finePointer) {
            const rect = giftCanvas.getBoundingClientRect();
            pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
          }
        };
        const onPointerUp = () => { if (!dragging) return; dragging = false; if (!moved) toggleLid(); };
        const toggleLid = () => { isOpen = !isOpen; lidPivot.userData.target = isOpen ? -1.12 : 0; };
        giftCanvas.addEventListener('pointerdown', onPointerDown);
        giftCanvas.addEventListener('pointermove', onPointerMove);
        giftCanvas.addEventListener('pointerup', onPointerUp);
        giftCanvas.addEventListener('pointercancel', () => { dragging = false; });
        giftCanvas.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleLid(); } });

        const resize = () => {
          const rect = heroVisual.getBoundingClientRect();
          const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
          renderer.setSize(width, height, false);
          camera.aspect = width / height; camera.fov = width < 560 ? 40 : width < 800 ? 37 : 34;
          camera.position.z = width < 560 ? 8.4 : width < 800 ? 7.6 : 6.7;
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(heroVisual); resize();
        heroVisual.classList.add('webgl-ready');

        let raf = 0;
        const render = () => {
          raf = requestAnimationFrame(render);
          const t = clock.getElapsedTime();
          const motion = reducedMotion ? 0 : 1;
          if (!dragging && !reducedMotion) targetY += 0.0018;
          giftRoot.rotation.y += (targetY - giftRoot.rotation.y) * 0.055;
          giftRoot.rotation.x += ((targetX + (reducedMotion ? 0 : Math.sin(t * 0.42) * 0.035)) - giftRoot.rotation.x) * 0.045;
          giftRoot.position.y = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.09;
          giftRoot.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.32) * 0.018;
          const lidTarget = lidPivot.userData.target || 0;
          lidPivot.rotation.x += (lidTarget - lidPivot.rotation.x) * 0.075;
          lid.position.y = lidPivot.rotation.x < -0.2 ? Math.sin(t * 2) * 0.025 : 0;
          coins.forEach((coin, i) => {
            const phase = t * (0.42 + i * 0.035) + coin.userData.phase;
            const radius = coin.userData.radius;
            coin.position.set(Math.cos(phase) * radius, Math.sin(phase * 1.3) * 0.72 + 0.15, Math.sin(phase) * radius * 0.72);
            coin.rotation.y = phase * 0.9; coin.rotation.z = Math.sin(phase) * 0.18;
          });
          ringA.rotation.z += reducedMotion ? 0 : 0.0018;
          ringB.rotation.z -= reducedMotion ? 0 : 0.0012;
          particles.rotation.y = reducedMotion ? 0 : t * 0.018;
          camera.position.x += ((4.3 + pointerX * 0.22) - camera.position.x) * 0.025;
          camera.position.y += ((3.15 - pointerY * 0.14) - camera.position.y) * 0.025;
          camera.lookAt(0, -0.02, 0);
          greenLight.intensity = 32 + (reducedMotion ? 0 : Math.sin(t * 1.6) * 3);
          renderer.render(scene, camera);
        };
        render();

        // Stop GPU work when the tab is hidden; resume cleanly when visible.
        const onVisibility = () => {
          if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
          else if (!raf) render();
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', () => {
          cancelAnimationFrame(raf); resizeObserver.disconnect(); document.removeEventListener('visibilitychange', onVisibility);
          renderer.dispose(); particleGeometry.dispose(); particleMaterial.dispose(); labelTexture.dispose();
        }, { once: true });
      } catch (error) {
        console.warn('BoxBonus 3D scene unavailable; using the built-in visual fallback.', error);
        giftCanvas.closest('.three-stage')?.remove();
      }
    })();
  }
})();
