import * as THREE from "https://esm.sh/three@0.175.0";
import { OrbitControls } from "https://esm.sh/three@0.175.0/examples/jsm/controls/OrbitControls.js";

document.addEventListener("DOMContentLoaded", function () {
  setupExpandingCirclesPreloader();

  // --- Core Simulation Parameters ---
  let machSpeed = 0.15;
  let altitude = 100.0; // in feet
  let yawAngle = 0.0; // degrees
  let pitchAngle = 0.0; // degrees

  // --- Derived Atmospheric & Physics Properties ---
  let ambientTemp = 288.15; // Kelvin
  let densityRatio = 1.0; // Ratio to sea level
  let speedOfSound = 343; // m/s
  let windSpeed = machSpeed * speedOfSound; // m/s
  let stagnationTemp = ambientTemp; // Kelvin

  const turbulence = 0.5; // Constant turbulence
  const GAMMA = 1.4; // Ratio of specific heats for air
  const R = 287.0; // Specific gas constant for air

  let lastUserActionTime = Date.now();
  let crypticMessageTimeout;
  let floatingParticles = [];
  let currentMessageIndex = 0;

  // --- Accurate Atmospheric Model ---
  function updateAtmosphericProperties(altitudeFt) {
    const altitudeM = altitudeFt * 0.3048;

    if (altitudeM < 11000) {
      // Troposphere
      ambientTemp = 288.15 - 0.0065 * altitudeM;
      const P = 101325 * Math.pow(ambientTemp / 288.15, 5.256);
      densityRatio = P / (R * ambientTemp) / 1.225;
    } else {
      // Stratosphere
      ambientTemp = 216.65;
      const P = 22632 * Math.exp(-0.000157 * (altitudeM - 11000));
      densityRatio = P / (R * ambientTemp) / 1.225;
    }

    speedOfSound = Math.sqrt(GAMMA * R * ambientTemp);
    windSpeed = machSpeed * speedOfSound;
    stagnationTemp =
      ambientTemp * (1 + ((GAMMA - 1) / 2) * Math.pow(machSpeed, 2));
  }

  function setupExpandingCirclesPreloader() {
    const canvas = document.getElementById("preloader-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let time = 0;
    let lastTime = 0;
    const maxRadius = 80;
    const circleCount = 5;
    const dotCount = 24;

    function animate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      time += deltaTime * 0.001;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 78, 66, 0.9)";
      ctx.fill();
      for (let c = 0; c < circleCount; c++) {
        const circlePhase = (time * 0.3 + c / circleCount) % 1;
        const radius = circlePhase * maxRadius;
        const opacity = 1 - circlePhase;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 78, 66, ${opacity * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const size = 2 * (1 - circlePhase * 0.5);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `rgba(255, 78, 66, ${opacity * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 78, 66, ${opacity * 0.9})`;
          ctx.fill();
        }
      }
      const loadingOverlay = document.getElementById("loading-overlay");
      if (loadingOverlay && loadingOverlay.style.display !== "none") {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }

  function initFloatingParticles() {
    const container = document.getElementById("floating-particles");
    if (!container) return;
    const numParticles = 1000;

    container.innerHTML = "";
    floatingParticles = [];

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    for (let i = 0; i < numParticles; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.position = "absolute";
      particle.style.width = "1.5px";
      particle.style.height = "1.5px";
      particle.style.backgroundColor = `rgba(255, ${
        Math.floor(Math.random() * 100) + 78
      }, ${Math.floor(Math.random() * 100) + 66}, ${
        Math.random() * 0.5 + 0.2
      })`;
      particle.style.borderRadius = "50%";

      const minDistance = 200;
      const maxDistance = Math.max(windowWidth, windowHeight) * 0.8;
      const angle = Math.random() * Math.PI * 2;
      const distanceFactor = Math.sqrt(Math.random());
      const distance =
        minDistance + distanceFactor * (maxDistance - minDistance);
      const x = Math.cos(angle) * distance + centerX;
      const y = Math.sin(angle) * distance + centerY;

      particle.style.left = x + "px";
      particle.style.top = y + "px";

      const particleObj = {
        element: particle,
        x: x,
        y: y,
        baseX: x,
        baseY: y,
        speed: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.02,
        amplitude: Math.random() * 50 + 20,
        size: 1.5,
        pulseSpeed: Math.random() * 0.04 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2
      };

      floatingParticles.push(particleObj);
      container.appendChild(particle);
    }

    animateFloatingParticles();
  }

  function animateFloatingParticles() {
    let time = 0;

    function updateParticles() {
      time += 0.01;

      floatingParticles.forEach((particle) => {
        const windRad = 0;
        const windForceX = Math.cos(windRad) * windSpeed * 0.02;
        const windForceY = Math.sin(windRad) * windSpeed * 0.01;

        const turbulenceX = (Math.random() - 0.5) * turbulence * 10;
        const turbulenceY = (Math.random() - 0.5) * turbulence * 10;

        particle.x += windForceX + turbulenceX;
        particle.y += windForceY + turbulenceY;

        if (particle.x > window.innerWidth + 100) {
          particle.x = -100;
        } else if (particle.x < -100) {
          particle.x = window.innerWidth + 100;
        }

        particle.element.style.left = particle.x + "px";
        particle.element.style.top = particle.y + "px";

        const speedFactor = Math.min(windSpeed / 300, 1);
        const baseOpacity = (0.2 + speedFactor * 0.6) * densityRatio;
        particle.element.style.opacity = baseOpacity;
      });

      requestAnimationFrame(updateParticles);
    }

    requestAnimationFrame(updateParticles);
  }

  const circularCanvas = document.getElementById("circular-canvas");
  let circularCtx;
  if (circularCanvas) circularCtx = circularCanvas.getContext("2d");

  function resizeCircularCanvas() {
    if (!circularCanvas) return;
    circularCanvas.width = circularCanvas.offsetWidth;
    circularCanvas.height = circularCanvas.offsetHeight;
  }

  if (circularCanvas) {
    resizeCircularCanvas();
    window.addEventListener("resize", resizeCircularCanvas);
  }

  function drawWindFlowVisualizer() {
    if (!circularCtx) return;
    const width = circularCanvas.width;
    const height = circularCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    circularCtx.clearRect(0, 0, width, height);

    const numLines = 20;
    const time = Date.now() * 0.001;

    for (let i = 0; i < numLines; i++) {
      const y = (height / numLines) * i;
      const offset = Math.sin(time * 2 + i * 0.5) * turbulence * 20;
      circularCtx.beginPath();
      circularCtx.moveTo(0, y + offset);
      for (let x = 0; x < width; x += 10) {
        const turbOffset = Math.sin(x * 0.01 + time + i) * turbulence * 10;
        circularCtx.lineTo(x, y + offset + turbOffset);
      }
      const speedNormalized = Math.min(windSpeed / 400, 1);
      circularCtx.strokeStyle = `rgba(255, 78, 66, ${
        (0.1 + speedNormalized * 0.5) * densityRatio
      })`;
      circularCtx.lineWidth = 1 + speedNormalized * 2;
      circularCtx.stroke();
    }

    if (machSpeed > 1) {
      const shockAngle = Math.asin(1 / machSpeed) * (180 / Math.PI);
      circularCtx.save();
      circularCtx.translate(centerX, centerY);
      circularCtx.rotate((-shockAngle * Math.PI) / 180);
      circularCtx.beginPath();
      circularCtx.moveTo(0, 0);
      circularCtx.lineTo(200, -100);
      circularCtx.moveTo(0, 0);
      circularCtx.lineTo(200, 100);
      circularCtx.strokeStyle = "rgba(255, 179, 171, 0.8)";
      circularCtx.lineWidth = 3;
      circularCtx.stroke();
      circularCtx.restore();
    }
  }

  const spectrumCanvas = document.getElementById("spectrum-canvas");
  let spectrumCtx;
  if (spectrumCanvas) spectrumCtx = spectrumCanvas.getContext("2d");

  function resizeSpectrumCanvas() {
    if (!spectrumCanvas) return;
    spectrumCanvas.width = spectrumCanvas.offsetWidth;
    spectrumCanvas.height = spectrumCanvas.offsetHeight;
  }

  if (spectrumCanvas) {
    resizeSpectrumCanvas();
    window.addEventListener("resize", resizeSpectrumCanvas);
  }

  function drawWindSpectrum() {
    if (!spectrumCtx) return;
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    spectrumCtx.clearRect(0, 0, width, height);

    const numBars = 64;
    const barWidth = width / numBars;

    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const pressure = Math.sin((i / numBars) * Math.PI) * (1 + turbulence);
      const barHeight =
        pressure * height * 0.8 * (windSpeed / 200) * densityRatio;
      const hue = 10 - windSpeed / 50;
      spectrumCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      spectrumCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }

    spectrumCtx.strokeStyle = "rgba(255, 78, 66, 0.2)";
    spectrumCtx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = height * (i / 4);
      spectrumCtx.beginPath();
      spectrumCtx.moveTo(0, y);
      spectrumCtx.lineTo(width, y);
      spectrumCtx.stroke();
    }
  }

  function updateWindMetrics() {
    const machNumber = machSpeed;
    const reynolds = (windSpeed * 2) / 0.000015;
    let el;

    el = document.getElementById("peak-value");
    if (el) el.textContent = `${windSpeed.toFixed(1)} M/S`;

    el = document.getElementById("amplitude-value");
    if (el) el.textContent = machNumber.toFixed(2);

    el = document.getElementById("stability-value");
    if (el) el.textContent = `${(reynolds / 1000000).toFixed(1)}M`;

    let stability = 0;
    if (reynolds < 2300) stability = 90;
    else if (reynolds < 4000) stability = 50;
    else stability = 20;

    el = document.getElementById("stability-bar");
    if (el) el.style.width = `${stability}%`;

    el = document.getElementById("mass-value");
    if (el)
      el.textContent = (1.225 * densityRatio * (1 + machNumber * 0.2)).toFixed(
        3
      );

    el = document.getElementById("energy-value");
    if (el)
      el.textContent = `${(
        (0.5 * (1.225 * densityRatio) * windSpeed * windSpeed) /
        1000
      ).toFixed(1)} KJ`;

    el = document.getElementById("variance-value");
    if (el) el.textContent = turbulence.toFixed(4);

    el = document.getElementById("phase-value");
    if (el) el.textContent = `${yawAngle.toFixed(1)}°`;

    el = document.getElementById("status-indicator");
    if (el) {
      if (machNumber < 0.8) el.style.color = "#00ff00";
      else if (machNumber < 1.2) el.style.color = "#ffae00";
      else el.style.color = "#ff4e42";
    }
  }

  function scheduleCrypticMessages() {
    if (crypticMessageTimeout) clearTimeout(crypticMessageTimeout);

    const delay = Math.random() * 15000 + 10000;

    crypticMessageTimeout = setTimeout(() => {
      if (Date.now() - lastUserActionTime > 10000) {
        const messages = [
          "ATMOSPHERIC DENSITY: " +
            densityRatio.toFixed(4) +
            " (SEA LEVEL RATIO)",
          "CALCULATING SHOCK WAVE PROPAGATION PATTERNS...",
          "AMBIENT TEMPERATURE: " + ambientTemp.toFixed(1) + " K",
          "STAGNATION TEMPERATURE: " + stagnationTemp.toFixed(0) + " K",
          "MACH_CONE.ANGLE = " +
            (machSpeed > 1
              ? (Math.asin(1 / machSpeed) * 180) / Math.PI
              : 0
            ).toFixed(1) +
            "°"
        ];
        const selectedMessage = messages[currentMessageIndex];
        addTerminalMessage(selectedMessage, true);
        currentMessageIndex = (currentMessageIndex + 1) % messages.length;
      }
      scheduleCrypticMessages();
    }, delay);
  }

  document.addEventListener(
    "mousemove",
    () => (lastUserActionTime = Date.now())
  );
  document.addEventListener("click", () => (lastUserActionTime = Date.now()));
  document.addEventListener("keydown", () => (lastUserActionTime = Date.now()));
  setTimeout(scheduleCrypticMessages, 10000);

  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) {
    setTimeout(() => {
      loadingOverlay.style.opacity = 0;
      setTimeout(() => {
        loadingOverlay.style.display = "none";
        initFloatingParticles();
      }, 500);
    }, 3000);
  }

  function updateTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const el = document.getElementById("timestamp");
    if (el) el.textContent = `TIME: ${hours}:${minutes}:${seconds}`;
  }
  setInterval(updateTimestamp, 1000);
  updateTimestamp();

  const terminalContent = document.getElementById("terminal-content");
  let typingLine;
  if (terminalContent) typingLine = terminalContent.querySelector(".typing");

  let messageQueue = [
    "WIND TUNNEL SYSTEM INITIALIZED.",
    "AERODYNAMIC ANALYSIS MODULE READY."
  ];

  function typeNextMessage() {
    if (!terminalContent || !typingLine) return;
    if (messageQueue.length === 0) return;
    const message = messageQueue.shift();
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < message.length) {
        typingLine.textContent = message.substring(0, charIndex + 1);
        charIndex++;
      } else {
        clearInterval(typingInterval);
        const newLine = document.createElement("div");
        newLine.className = "terminal-line command-line";
        newLine.textContent = message;
        terminalContent.insertBefore(newLine, typingLine);
        typingLine.textContent = "";
        terminalContent.scrollTop = terminalContent.scrollHeight;
        setTimeout(typeNextMessage, 5000);
      }
    }, 50);
  }

  function addTerminalMessage(message, isCommand = false) {
    if (!terminalContent || !typingLine) return;
    const newLine = document.createElement("div");
    newLine.className = isCommand
      ? "terminal-line command-line"
      : "terminal-line";
    newLine.textContent = message;
    terminalContent.insertBefore(newLine, typingLine);
    terminalContent.scrollTop = terminalContent.scrollHeight;
  }
  setTimeout(typeNextMessage, 3000);

  const waveformCanvas = document.getElementById("waveform-canvas");
  let waveformCtx;
  if (waveformCanvas) waveformCtx = waveformCanvas.getContext("2d");

  function resizeCanvas() {
    if (!waveformCanvas) return;
    waveformCanvas.width = waveformCanvas.offsetWidth * window.devicePixelRatio;
    waveformCanvas.height =
      waveformCanvas.offsetHeight * window.devicePixelRatio;
    waveformCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  if (waveformCanvas) {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  }

  function drawWaveform() {
    if (!waveformCtx) return;
    const width = waveformCanvas.width / window.devicePixelRatio;
    const height = waveformCanvas.height / window.devicePixelRatio;
    waveformCtx.clearRect(0, 0, width, height);
    waveformCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
    waveformCtx.fillRect(0, 0, width, height);
    waveformCtx.beginPath();
    waveformCtx.strokeStyle = "rgba(255, 78, 66, 0.8)";
    waveformCtx.lineWidth = 2;
    const time = Date.now() / 1000;
    const frequency = windSpeed / 10;
    for (let x = 0; x < width; x++) {
      const t = x / width;
      const y =
        height / 2 +
        (Math.sin(t * frequency + time * 2) * 20 * (1 + turbulence) +
          Math.sin(t * frequency * 2 + time * 3) * 10 * turbulence +
          (Math.random() - 0.5) * 5 * turbulence) *
          densityRatio;
      if (x === 0) {
        waveformCtx.moveTo(x, y);
      } else {
        waveformCtx.lineTo(x, y);
      }
    }
    waveformCtx.stroke();
    requestAnimationFrame(drawWaveform);
  }
  drawWaveform();

  let scene, camera, renderer, controls;
  let coneObject;
  let clock = new THREE.Clock();
  let isDraggingCone = false;
  let coneVelocity = new THREE.Vector2(0, 0);
  let coneTargetPosition = new THREE.Vector3(0, 0, 0);

  function initThreeJS() {
    const container = document.getElementById("three-container");
    if (!container) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.05);

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;
    controls.panSpeed = 0.8;
    controls.minDistance = 5;
    controls.maxDistance = 30;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    const pointLight1 = new THREE.PointLight(0xff4e42, 1, 10);
    pointLight1.position.set(2, 2, 2);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xc2362f, 1, 10);
    pointLight2.position.set(-2, -2, -2);
    scene.add(pointLight2);

    createConeObject();
    createBackgroundParticles();
    createWindStreamlines();

    window.addEventListener("resize", onWindowResize);
    setupConeDragging();
    animate();
  }

  function createConeObject() {
    if (coneObject) {
      scene.remove(coneObject);
    }
    coneObject = new THREE.Group();
    const coneGeometry = new THREE.ConeGeometry(1, 4, 32, 16);
    const coneMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        windSpeed: { value: windSpeed },
        turbulence: { value: turbulence },
        stagnationTemp: { value: stagnationTemp },
        yawAngle: { value: yawAngle },
        pitchAngle: { value: pitchAngle },
        color: { value: new THREE.Color(0xaaaaaa) }
      },
      vertexShader: `
        uniform float time;
        uniform float windSpeed;
        uniform float turbulence;
        varying vec3 vNormal;
        varying vec3 vPosition;
        float noise(vec3 p) {
          return sin(p.x * 2.0) * cos(p.y * 3.0) * sin(p.z * 2.0 + time);
        }
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position; 
          vec3 pos = position;
          float speedFactor = windSpeed / 400.0;
          float buffetAmplitude = speedFactor * turbulence * 0.1;
          vec3 vibration = vec3(0.0, noise(pos * 5.0 + time * speedFactor * 10.0) * buffetAmplitude, noise(pos * 7.0 + time * speedFactor * 15.0) * buffetAmplitude);
          if (windSpeed > 343.0) {
            float machEffect = windSpeed / 343.0;
            vibration += normal * sin(time * 100.0 * machEffect) * 0.02 * turbulence;
          }
          pos += vibration;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float stagnationTemp;
        uniform float yawAngle;
        uniform float pitchAngle;
        varying vec3 vNormal;
        varying vec3 vPosition;

        vec3 temperatureToColor(float tempK) {
            float t = clamp((tempK - 500.0) / 2500.0, 0.0, 1.0); // Temp range 500K to 3000K
            vec3 col;
            if (t < 0.2) {
                col = mix(vec3(0.2, 0.1, 0.1), vec3(0.6, 0.1, 0.05), t * 5.0);
            } else if (t < 0.4) {
                col = mix(vec3(0.6, 0.1, 0.05), vec3(1.0, 0.3, 0.1), (t - 0.2) * 5.0);
            } else if (t < 0.6) {
                col = mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.65, 0.2), (t - 0.4) * 5.0);
            } else if (t < 0.8) {
                col = mix(vec3(1.0, 0.65, 0.2), vec3(1.0, 0.9, 0.5), (t - 0.6) * 5.0);
            } else {
                col = mix(vec3(1.0, 0.9, 0.5), vec3(1.0, 1.0, 0.95), (t - 0.8) * 5.0);
            }
            return col;
        }

        void main() {
          float axialPosition = (vPosition.y + 2.0) / 4.0;
          float heatDistribution = pow(axialPosition, 2.0);
          float localTemp = stagnationTemp * heatDistribution;

          float yawRad = yawAngle * 0.0174533;
          float pitchRad = pitchAngle * 0.0174533;
          
          float pitchEffect = sin(pitchRad) * -vNormal.z;
          float yawEffect = sin(yawRad) * vNormal.x;
          
          float windwardFactor = 1.0 + 2.0 * pow(max(0.0, pitchEffect + yawEffect), 2.0);
          localTemp *= windwardFactor;
          
          vec3 baseColor = temperatureToColor(localTemp);
          
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
          fresnel = pow(fresnel, 2.0);

          vec3 finalColor = baseColor + fresnel * baseColor * 0.2;
          gl_FragColor = vec4(finalColor, 0.95);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    coneObject.add(cone);

    const glowGeometry = new THREE.ConeGeometry(1.3, 4.3, 32, 16);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        stagnationTemp: { value: stagnationTemp },
        yawAngle: { value: yawAngle },
        pitchAngle: { value: pitchAngle }
      },
      vertexShader: `
        varying vec3 vPosition_glow;
        void main() {
          vPosition_glow = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float stagnationTemp;
        uniform float yawAngle;
        uniform float pitchAngle;
        varying vec3 vPosition_glow;

        void main() {
          float axialPosition = (vPosition_glow.y + 2.0) / 4.0;
          float heatDistribution = pow(axialPosition, 2.0);
          float localTemp = stagnationTemp * heatDistribution;
          
          vec3 approxNormal = normalize(vec3(vPosition_glow.y, -vPosition_glow.x, -vPosition_glow.z));
          float pitchEffect = sin(pitchAngle * 0.0174533) * -approxNormal.z;
          float yawEffect = sin(yawAngle * 0.0174533) * approxNormal.x;
          float windwardFactor = 1.0 + 2.0 * pow(max(0.0, pitchEffect + yawEffect), 2.0);
          localTemp *= windwardFactor;

          float plasmaIntensity = smoothstep(2000.0, 3500.0, localTemp);

          if (plasmaIntensity < 0.01) discard;

          vec3 glowColor = vec3(1.0, 0.8, 1.0);
          gl_FragColor = vec4(glowColor, plasmaIntensity * 0.5);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    coneObject.add(glow);
    scene.add(coneObject);

    return function updateCone(time) {
      coneMaterial.uniforms.time.value = time;
      coneMaterial.uniforms.stagnationTemp.value = stagnationTemp;
      coneMaterial.uniforms.windSpeed.value = windSpeed;
      coneMaterial.uniforms.turbulence.value = turbulence;
      coneMaterial.uniforms.yawAngle.value = yawAngle;
      coneMaterial.uniforms.pitchAngle.value = pitchAngle;

      glowMaterial.uniforms.time.value = time;
      glowMaterial.uniforms.stagnationTemp.value = stagnationTemp;
      glowMaterial.uniforms.yawAngle.value = yawAngle;
      glowMaterial.uniforms.pitchAngle.value = pitchAngle;

      if (coneObject) {
        coneObject.rotation.y = (yawAngle * Math.PI) / 180;
        coneObject.rotation.z = (pitchAngle * Math.PI) / 180 + Math.PI / 2;
      }
    };
  }

  function createWindStreamlines() {
    const streamlineGroup = new THREE.Group();
    const numStreamlines = 10;
    for (let i = 0; i < numStreamlines; i++) {
      const points = [];
      const y = (i - numStreamlines / 2) * 0.8;
      for (let x = -10; x <= 10; x += 0.5) {
        points.push(new THREE.Vector3(x, y, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(geometry, material);
      streamlineGroup.add(line);
    }
    if (scene) scene.add(streamlineGroup);

    return function updateStreamlines(time) {
      streamlineGroup.children.forEach((line, index) => {
        const positions = line.geometry.attributes.position.array;
        const baseY = (index - numStreamlines / 2) * 0.8;
        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          positions[i + 1] =
            baseY + Math.sin(x * 0.5 + time) * turbulence * 0.5;
        }
        line.geometry.attributes.position.needsUpdate = true;
      });
    };
  }

  let updateStreamlines;

  function createBackgroundParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 3000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const color1 = new THREE.Color(0xff4e42);
    const color2 = new THREE.Color(0xc2362f);
    const color3 = new THREE.Color(0xffb3ab);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      let color;
      const colorChoice = Math.random();
      if (colorChoice < 0.33) color = color1;
      else if (colorChoice < 0.66) color = color2;
      else color = color3;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = 0.05;
    }
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particlesGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
    particlesGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const particlesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        windSpeed: { value: windSpeed },
        densityRatio: { value: densityRatio }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        uniform float windSpeed;
        void main() {
          vColor = color;
          vec3 pos = position;
          float windForce = windSpeed / 100.0;
          pos.x += time * windForce;
          pos.x = mod(pos.x + 50.0, 100.0) - 50.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float densityRatio;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5, 0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(vColor, glow * densityRatio);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    if (scene) scene.add(particles);

    return function updateParticles(time) {
      particlesMaterial.uniforms.time.value = time;
      particlesMaterial.uniforms.windSpeed.value = windSpeed;
      particlesMaterial.uniforms.densityRatio.value = densityRatio;
    };
  }

  let updateParticles;
  let updateCone;

  function setupConeDragging() {
    const container = document.getElementById("three-container");
    if (!container) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragStartPosition = new THREE.Vector2();
    const maxDragDistance = 3;

    container.addEventListener("mousedown", (event) => {
      if (!coneObject) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(coneObject, true);
      if (intersects.length > 0) {
        if (controls) controls.enabled = false;
        isDragging = true;
        isDraggingCone = true;
        dragStartPosition.x = mouse.x;
        dragStartPosition.y = mouse.y;
        addTerminalMessage("AERODYNAMIC BODY INTERACTION DETECTED.", true);
        showNotification("DRAG FORCE APPLIED");
      }
    });

    container.addEventListener("mousemove", (event) => {
      if (isDragging) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const deltaX = (mouse.x - dragStartPosition.x) * 5;
        const deltaY = (mouse.y - dragStartPosition.y) * 5;
        coneTargetPosition.x += deltaX;
        coneTargetPosition.y += deltaY;
        const distance = Math.sqrt(
          coneTargetPosition.x * coneTargetPosition.x +
            coneTargetPosition.y * coneTargetPosition.y
        );
        if (distance > maxDragDistance) {
          const scale = maxDragDistance / distance;
          coneTargetPosition.x *= scale;
          coneTargetPosition.y *= scale;
        }
        coneVelocity.x = deltaX * 2;
        coneVelocity.y = deltaY * 2;
        dragStartPosition.x = mouse.x;
        dragStartPosition.y = mouse.y;
      }
    });

    container.addEventListener("mouseup", () => {
      if (isDragging) {
        if (controls) controls.enabled = true;
        isDragging = false;
        isDraggingCone = false;
        addTerminalMessage(
          `DRAG_COEFFICIENT.UPDATE({CD: ${(0.5 + yawAngle * 0.01).toFixed(
            3
          )}});`,
          true
        );
      }
    });

    container.addEventListener("mouseleave", () => {
      if (isDragging) {
        if (controls) controls.enabled = true;
        isDragging = false;
        isDraggingCone = false;
      }
    });
  }

  function updateConePosition() {
    if (!coneObject) return;
    if (!isDraggingCone) {
      const maxPushDistance = 3.0;
      const maxWindSpeed = 8 * 343;
      const targetX =
        -(windSpeed / maxWindSpeed) * maxPushDistance * densityRatio;
      const smoothingFactor = 0.05;
      coneTargetPosition.x +=
        (targetX - coneTargetPosition.x) * smoothingFactor;
      coneTargetPosition.y += (0 - coneTargetPosition.y) * smoothingFactor;
    }
    coneObject.position.x +=
      (coneTargetPosition.x - coneObject.position.x) * 0.2;
    coneObject.position.y +=
      (coneTargetPosition.y - coneObject.position.y) * 0.2;
  }

  function onWindowResize() {
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
    resizeCanvas();
    resizeCircularCanvas();
    resizeSpectrumCanvas();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    const time = clock.getElapsedTime();
    drawWindFlowVisualizer();
    drawWindSpectrum();
    updateWindMetrics();
    updateConePosition();
    if (updateCone) updateCone(time);
    if (updateParticles) updateParticles(time);
    if (updateStreamlines) updateStreamlines(time);
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function showNotification(message) {
    const notification = document.getElementById("notification");
    if (notification) {
      notification.textContent = message;
      notification.style.opacity = 1;
      setTimeout(() => {
        notification.style.opacity = 0;
      }, 3000);
    }
  }

  initThreeJS();
  updateParticles = createBackgroundParticles();
  updateCone = createConeObject();
  updateStreamlines = createWindStreamlines();

  const machSpeedSlider = document.getElementById("rotation-slider");
  const altitudeSlider = document.getElementById("resolution-slider");
  const pitchSlider = document.getElementById("distortion-slider");
  const yawSlider = document.getElementById("reactivity-slider");

  let label;
  label = document.querySelector('[for="rotation-slider"]');
  if (label) label.textContent = "MACH SPEED";
  label = document.querySelector('[for="resolution-slider"]');
  if (label) label.textContent = "ALTITUDE";
  label = document.querySelector('[for="distortion-slider"]');
  if (label) label.textContent = "PITCH";
  label = document.querySelector('[for="reactivity-slider"]');
  if (label) label.textContent = "YAW";

  if (machSpeedSlider) {
    machSpeedSlider.min = "0";
    machSpeedSlider.max = "8";
    machSpeedSlider.value = machSpeed;
    machSpeedSlider.step = "0.1";
  }
  if (altitudeSlider) {
    altitudeSlider.min = "0";
    altitudeSlider.max = "100";
    altitudeSlider.value = "0";
    altitudeSlider.step = "1";
  }
  if (pitchSlider) {
    pitchSlider.min = "-60";
    pitchSlider.max = "60";
    pitchSlider.value = "0";
    pitchSlider.step = "1";
  }
  if (yawSlider) {
    yawSlider.min = "-20";
    yawSlider.max = "20";
    yawSlider.value = "0";
    yawSlider.step = "0.5";
  }

  if (machSpeedSlider) {
    machSpeedSlider.addEventListener("input", function () {
      machSpeed = parseFloat(this.value);
      updateAtmosphericProperties(altitude);
      const el = document.getElementById("rotation-value");
      if (el) el.textContent = `MACH ${machSpeed.toFixed(2)}`;
    });
  }
  if (altitudeSlider) {
    altitudeSlider.addEventListener("input", function () {
      const sliderValue = parseFloat(this.value);
      altitude = 100 + Math.pow(sliderValue / 100, 4) * (140000 - 100);
      updateAtmosphericProperties(altitude);
      const el = document.getElementById("resolution-value");
      if (el) el.textContent = `${Math.round(altitude).toLocaleString()} FT`;
    });
  }
  if (pitchSlider) {
    pitchSlider.addEventListener("input", function () {
      pitchAngle = parseFloat(this.value);
      const el = document.getElementById("distortion-value");
      if (el) el.textContent = pitchAngle.toFixed(1) + "°";
    });
  }
  if (yawSlider) {
    yawSlider.addEventListener("input", function () {
      yawAngle = parseFloat(this.value);
      const el = document.getElementById("reactivity-value");
      if (el) el.textContent = yawAngle.toFixed(1) + "°";
    });
  }

  let valueEl;
  valueEl = document.getElementById("rotation-value");
  if (valueEl) valueEl.textContent = `MACH ${machSpeed.toFixed(2)}`;
  valueEl = document.getElementById("resolution-value");
  if (valueEl) valueEl.textContent = `${altitude.toLocaleString()} FT`;
  valueEl = document.getElementById("distortion-value");
  if (valueEl) valueEl.textContent = pitchAngle.toFixed(1) + "°";
  valueEl = document.getElementById("reactivity-value");
  if (valueEl) valueEl.textContent = yawAngle.toFixed(1) + "°";

  const resetButton = document.getElementById("reset-btn");
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      machSpeed = 0.15;
      altitude = 100;
      updateAtmosphericProperties(altitude);
      pitchAngle = 0.0;
      yawAngle = 0.0;

      if (machSpeedSlider) machSpeedSlider.value = machSpeed;
      if (altitudeSlider) altitudeSlider.value = 0;
      if (pitchSlider) pitchSlider.value = pitchAngle;
      if (yawSlider) yawSlider.value = yawAngle;

      let valueEl;
      valueEl = document.getElementById("rotation-value");
      if (valueEl) valueEl.textContent = `MACH ${machSpeed.toFixed(2)}`;
      valueEl = document.getElementById("resolution-value");
      if (valueEl) valueEl.textContent = `${altitude.toLocaleString()} FT`;
      valueEl = document.getElementById("distortion-value");
      if (valueEl) valueEl.textContent = pitchAngle.toFixed(1) + "°";
      valueEl = document.getElementById("reactivity-value");
      if (valueEl) valueEl.textContent = yawAngle.toFixed(1) + "°";

      if (coneObject) {
      }

      showNotification("WIND TUNNEL PARAMETERS RESET");
    });
  }

  const analyzeButton = document.getElementById("analyze-btn");
  if (analyzeButton) {
    analyzeButton.addEventListener("click", function () {
      this.textContent = "ANALYZING...";
      this.disabled = true;

      setTimeout(() => {
        this.textContent = "ANALYZE";
        this.disabled = false;
        const dragCoeff = 0.5 + Math.abs(yawAngle) * 0.01;
        const liftCoeff = Math.sin((yawAngle * Math.PI) / 180) * 2;
        addTerminalMessage(
          `ANALYSIS COMPLETE. CD=${dragCoeff.toFixed(
            3
          )}, CL=${liftCoeff.toFixed(3)}`,
          true
        );
        showNotification("AERODYNAMIC ANALYSIS COMPLETE");
      }, 3000);
    });
  }

  const firstDataPanelTitle = document.querySelector(".data-panel-title");
  if (firstDataPanelTitle) {
    firstDataPanelTitle.textContent = "FLOW METRICS";
  }
  const allDataPanelTitles = document.querySelectorAll(".data-panel-title");
  if (allDataPanelTitles.length > 1) {
    allDataPanelTitles[1].textContent = "PRESSURE DISTRIBUTION";
  }
  const audioControls = document.querySelector(".audio-controls");
  if (audioControls) {
    audioControls.style.display = "none";
  }
  const spectrumHeader = document.querySelector(".spectrum-header span");
  if (spectrumHeader) {
    spectrumHeader.textContent = "PRESSURE FIELD ANALYZER";
  }

  function makePanelDraggable(element, handle = null) {
    if (typeof Draggable === "undefined" || !element) return;
    Draggable.create(element, {
      type: "x,y",
      edgeResistance: 0.65,
      bounds: "body",
      handle: handle || element,
      inertia: true,
      throwResistance: 0.85,
      onDragStart: function () {
        const panels = document.querySelectorAll(
          ".terminal-panel, .control-panel, .spectrum-analyzer, .data-panel"
        );
        let maxZ = 10;
        panels.forEach((panel) => {
          const z = parseInt(window.getComputedStyle(panel).zIndex) || 0;
          if (z > maxZ) maxZ = z;
        });
        this.target.style.zIndex = maxZ + 1;
      }
    });
  }

  makePanelDraggable(
    document.querySelector(".control-panel"),
    document.getElementById("control-panel-handle")
  );
  makePanelDraggable(document.querySelector(".terminal-panel"));
  makePanelDraggable(
    document.querySelector(".spectrum-analyzer"),
    document.getElementById("spectrum-handle")
  );

  // Initialize atmospheric properties on load
  updateAtmosphericProperties(altitude);
});
