let gameState = {
  score: 0,
  level: 1,
  startTime: Date.now(),
  gameTime: 0,
};

// Sound effects
const sounds = {
  shoot: new Audio(),
  explosion: new Audio(),
  levelUp: new Audio(),
};

// Game config
let gameConfig = null;
let sessionId = null;
let lastConfigUpdate = 0;
let pendingGameStart = false;

// Game entities
let ship = {};
let asteroids = [];
let bullets = [];

// Game objects
let canvas;
let ctx;
let scoreElement;
let levelElement;
let timeElement;
let gameOverDialog;
let finalScoreElement;
let restartButton;
let welcomeScreen;
let gameSectionContent;

// Try to load sounds but handle errors gracefully
try {
  sounds.shoot.src =
    "https://www.soundjay.com/mechanical/sounds/laser-gun-19.mp3";
  sounds.explosion.src =
    "https://www.soundjay.com/mechanical/sounds/explosion-01.mp3";
  sounds.levelUp.src = "https://www.soundjay.com/mechanical/sounds/beep-07.mp3";

  Object.values(sounds).forEach((sound) => {
    sound.volume = 0.3;
  });
} catch (e) {
  console.warn("Error loading sounds:", e);
}

function checkAuthStatus() {
  if (!welcomeScreen) welcomeScreen = document.getElementById("welcome-screen");
  if (!gameSectionContent)
    gameSectionContent = document.querySelector(".game-section-content");

  if (window.gameAuth && window.gameAuth.isLoggedIn()) {
    // User is logged in

    // Hide welcome screen
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }

    // Show game section and content
    document.getElementById("game-section").style.display = "block";

    if (gameSectionContent) {
      gameSectionContent.style.display = "block";
    }

    // Show start screen, hide game container
    const startScreen = document.getElementById("start-screen");
    if (startScreen) {
      startScreen.style.display = "flex";
    }

    const gameContainer = document.querySelector(".game-container");
    if (gameContainer) {
      gameContainer.style.display = "none";
    }

    // Show the Play Game button
    const playGameButton = document.getElementById("show-game");
    if (playGameButton) {
      playGameButton.style.display = "inline-block";
    }
  } else {
    // User is not logged in, show welcome screen and hide game
    if (welcomeScreen) {
      welcomeScreen.style.display = "flex";
    }
    if (gameSectionContent) {
      gameSectionContent.style.display = "none";
    }

    // Hide the Play Game button
    const playGameButton = document.getElementById("show-game");
    if (playGameButton) {
      playGameButton.style.display = "none";
    }

    document.getElementById("game-section").style.display = "none";
  }
}

function startGame() {
  console.log("Starting game...");

  // Disable the start button while processing
  const startGameBtn = document.getElementById("startGameBtn");
  if (startGameBtn) {
    startGameBtn.disabled = true;
    startGameBtn.textContent = "Loading...";
  }

  // Make sure the payment handler is initialized
  window
    .initializePaymentHandler()
    .then((paymentHandler) => {
      console.log("Payment handler ready, requesting game session");
      return paymentHandler.requestGameSession();
    })
    .then((result) => {
      // Re-enable the button
      if (startGameBtn) {
        startGameBtn.disabled = false;
        startGameBtn.textContent = "Start Game";
      }

      if (result && result.success) {
        // Session created successfully, start the game
        startGameWithConfig(result.data);
      } else if (result && result.requiresPayment) {
        // Payment required - this is handled by the payment handler
        console.log("Waiting for payment to complete...");
        pendingGameStart = true;
      } else {
        // Some other error
        console.error(
          "Failed to start game:",
          result ? result.error : "Unknown error",
        );
        alert("Failed to start game. Please try again.");
      }
    })
    .catch((error) => {
      console.error("Error starting game:", error);
      if (startGameBtn) {
        startGameBtn.disabled = false;
        startGameBtn.textContent = "Start Game";
      }

      // Fall back to the old way if there's an error
      console.warn("Payment handler error, falling back to legacy mode");

      // Hide the start screen
      const startScreen = document.getElementById("start-screen");
      if (startScreen) {
        startScreen.style.display = "none";
      }

      // Show the game container
      const gameContainer = document.querySelector(".game-container");
      if (gameContainer) {
        gameContainer.style.display = "block";
      }

      // Initialize game the old way
      initGame();
    });
}

function startGameWithConfig(sessionData) {
  console.log("Starting game with config:", sessionData);

  // Hide the start screen
  const startScreen = document.getElementById("start-screen");
  if (startScreen) {
    startScreen.style.display = "none";
  }

  // Show the game container
  const gameContainer = document.querySelector(".game-container");
  if (gameContainer) {
    gameContainer.style.display = "block";
  }

  // Store the session data
  sessionId = sessionData.config.session_id;
  gameConfig = sessionData.config;

  // Initialize game
  initGame();

  // Reset the pending flag
  pendingGameStart = false;
}

function initializeLeaderboardButtons() {
  const viewLeaderboardButton = document.getElementById(
    "view-leaderboard-button",
  );
  if (viewLeaderboardButton) {
    viewLeaderboardButton.addEventListener("click", function () {
      if (gameOverDialog) {
        gameOverDialog.style.display = "none";
      }
      if (window.gameLeaderboard) {
        window.gameLeaderboard.showLeaderboard();
      } else {
        console.error("gameLeaderboard not found");
        document.getElementById("game-section").style.display = "none";
        document.getElementById("leaderboard-section").style.display = "block";
      }
    });
  }
}
function setupStartGameButton() {
  console.log("Setting up start game button");

  const startGameBtn = document.getElementById("startGameBtn");
  if (startGameBtn) {
    // Remove any existing event listeners
    startGameBtn.removeEventListener("click", startGame);

    // Add the event listener
    startGameBtn.addEventListener("click", startGame);
    console.log("Start game button event listener attached");
  } else {
    console.error("Start game button not found");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initializeElements();
  setupStartScreenButtons();
  setupStartGameButton();
  initializeLeaderboardButtons();
  setupNavButtons();

  setTimeout(function () {
    setupStartScreenButtons();
    initializeLeaderboardButtons();
    setupNavButtons();
    checkAuthStatus();
  }, 1000);
});

function setupNavButtons() {
  const showGameBtn = document.getElementById("show-game");
  if (showGameBtn) {
    showGameBtn.addEventListener("click", function () {
      // Hide leaderboard section
      document.getElementById("leaderboard-section").style.display = "none";

      // Show game section
      document.getElementById("game-section").style.display = "block";

      // Show game content
      document.querySelector(".game-section-content").style.display = "block";

      // Show start screen, hide game container
      document.getElementById("start-screen").style.display = "flex";
      document.querySelector(".game-container").style.display = "none";
    });
  }
}

function setupStartScreenButtons() {
  const startLoginBtn = document.getElementById("startLoginBtn");
  const startRegisterBtn = document.getElementById("startRegisterBtn");
  const startGameBtn = document.getElementById("startGameBtn");

  if (startLoginBtn) {
    startLoginBtn.addEventListener("click", function () {
      console.log("Login button clicked");
      if (window.gameAuth) {
        window.gameAuth.showLoginModal();
      } else {
        console.error("Auth client not initialized yet");
      }
    });
  }

  if (startRegisterBtn) {
    startRegisterBtn.addEventListener("click", function () {
      console.log("Register button clicked");
      if (window.gameAuth) {
        window.gameAuth.showRegisterModal();
      } else {
        console.error("Auth client not initialized yet");
      }
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener("click", function () {
      startGame();
    });
  }
}

// Helper function to play sound with error handling
function playSound(sound) {
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => {
      // Silently handle audio play errors
      console.warn("Could not play audio:", e);
    });
  }
}

// Initialize HTML elements once document is loaded
function initializeElements() {
  console.log("Initializing game elements");

  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("Game canvas element not found!");
    return false;
  }
  ctx = canvas.getContext("2d");
  scoreElement = document.getElementById("score");
  levelElement = document.getElementById("level");
  timeElement = document.getElementById("time");
  gameOverDialog = document.getElementById("game-over-dialog");
  finalScoreElement = document.getElementById("final-score");
  restartButton = document.getElementById("restart-button");

  if (restartButton) {
    restartButton.addEventListener("click", function () {
      gameOverDialog.style.display = "none";
      initGame();
    });
  }

  console.log("Game elements initialized successfully");
  return true;
}

// Fetch game configuration from server
async function fetchGameConfig() {
  try {
    // Only attempt to fetch config if we have a session
    if (!window.gameAuth.isLoggedIn()) {
      throw new Error("Not logged in");
    }

    const currentSessionId = sessionId;

    let url = `${API_BASE}/api/v1/game/config`;
    if (currentSessionId) {
      url += `?session_id=${currentSessionId}`;
    }

    console.log("Fetching game config with session ID:", currentSessionId);
    const response = await window.gameAuth.get(url);

    if (!response.ok) {
      throw new Error(`Error fetching game config: ${response.statusText}`);
    }

    const config = await response.json();
    console.log("Received game config:", config);
    return config;
  } catch (error) {
    console.error("Failed to fetch game config:", error);
  }
}

// Start a new game session
async function startNewSession() {
  try {
    if (!window.gameAuth.isLoggedIn()) {
      throw new Error("Not logged in");
    }

    console.log("Current session ID before starting new session:", sessionId);

    const response = await window.gameAuth.post(
      `${API_BASE}/api/v1/game/session`,
    );

    if (!response.ok) {
      throw new Error(`Error starting new session: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Server response for new session:", data);

    if (data.config && data.config.sessionId) {
      sessionId = data.config.sessionId;
      console.log("Updated session ID to:", sessionId);
    }

    return data.config;
  } catch (error) {
    console.error("Failed to start new session:", error);
    return null;
  }
}

// Submit game score to server
async function submitScore(score, level, gameTime) {
  if (!window.gameAuth.isLoggedIn() || !sessionId) {
    console.warn("No session ID available, cannot submit score");
    return;
  }

  try {
    console.log("Submitting score with session ID:", sessionId);

    const response = await window.gameAuth.post(
      `${API_BASE}/api/v1/game/score`,
      {
        score: score,
        level: level,
        play_time: gameTime,
        session_id: sessionId,
      },
    );

    if (!response.ok) {
      throw new Error(`Error submitting score: ${response.statusText}`);
    }

    console.log("Score submitted successfully");
  } catch (error) {
    console.error("Failed to submit score:", error);
  }
}

// Initialize game
async function initGame() {
  debugSessionState();

  if (!canvas || !ctx) {
    console.log("Canvas not initialized, initializing elements first");
    initializeElements();

    // If still not initialized, we have a problem
    if (!canvas || !ctx) {
      console.error("Cannot initialize game: Canvas element not found");
      return; // Exit to prevent errors
    }
  }

  // Start a new session and get initial config if logged in
  if (window.gameAuth.isLoggedIn()) {
    const newSessionConfig = await startNewSession();
    gameConfig = newSessionConfig || (await fetchGameConfig());
  } else {
    gameConfig = await fetchGameConfig();
  }

  lastConfigUpdate = Date.now();

  // Reset game state
  gameState.score = 0;
  gameState.level = 1;
  gameState.startTime = Date.now();
  gameState.gameTime = 0;

  // Reset ship
  ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: gameConfig.ship.radius,
    angle: 0,
    rotation: 0,
    thrusting: false,
    thrust: { x: 0, y: 0 },
    invulnerable: true,
    invulnerableTime: Date.now() + gameConfig.ship.invulnerabilityTime,
    draw: function () {
      ctx.strokeStyle =
        this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0
          ? "gray"
          : "white";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Ship's nose
      const x1 = this.x + this.radius * Math.cos(this.angle);
      const y1 = this.y - this.radius * Math.sin(this.angle);

      // Ship's rear left
      const x2 =
        this.x - this.radius * (Math.cos(this.angle) + Math.sin(this.angle));
      const y2 =
        this.y + this.radius * (Math.sin(this.angle) - Math.cos(this.angle));

      // Ship's rear right
      const x3 =
        this.x - this.radius * (Math.cos(this.angle) - Math.sin(this.angle));
      const y3 =
        this.y + this.radius * (Math.sin(this.angle) + Math.cos(this.angle));

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.stroke();

      if (this.thrusting) {
        ctx.beginPath();
        ctx.moveTo(x2, y2);

        // Thruster point 1
        const tx1 = this.x - this.radius * 1.5 * Math.cos(this.angle);
        const ty1 = this.y + this.radius * 1.5 * Math.sin(this.angle);

        // Thruster point 2
        const tx2 =
          this.x - this.radius * (Math.cos(this.angle) - Math.sin(this.angle));
        const ty2 =
          this.y + this.radius * (Math.sin(this.angle) + Math.cos(this.angle));

        ctx.lineTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.strokeStyle = "orange";
        ctx.stroke();
      }
    },
  };

  // Clear entities
  asteroids.length = 0;
  bullets.length = 0;

  // Update UI
  scoreElement.textContent = gameState.score;
  levelElement.textContent = gameState.level;
  timeElement.textContent = gameState.gameTime;

  // Create initial asteroids
  createAsteroids();
  debugSessionState();

  // Start game loop
  requestAnimationFrame(update);
}

// Create asteroids
function createAsteroids() {
  if (!gameConfig || !gameConfig.asteroids) {
    console.error("Cannot create asteroids - no game config available");
    return;
  }

  console.log(
    "Game config when creating asteroids:",
    JSON.stringify(gameConfig),
  );

  // Calculate how many asteroids to create
  const count = Math.floor(
    gameConfig.asteroids.initialCount * Math.sqrt(gameState.level),
  );
  console.log(`Creating ${count} asteroids for level ${gameState.level}`);

  for (let i = 0; i < count; i++) {
    // Make sure asteroids don't spawn too close to the ship
    let x, y;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    } while (
      Math.sqrt(Math.pow(ship.x - x, 2) + Math.pow(ship.y - y, 2)) < 100
    );

    const asteroid = {
      x: x,
      y: y,
      xv:
        (Math.random() * 2 - 1) *
        gameConfig.asteroids.speed *
        (1 + 0.1 * (gameState.level - 1)),
      yv:
        (Math.random() * 2 - 1) *
        gameConfig.asteroids.speed *
        (1 + 0.1 * (gameState.level - 1)),
      radius: gameConfig.asteroids.size,
      angle: Math.random() * Math.PI * 2,
      vertices:
        Math.floor(
          Math.random() *
            (gameConfig.asteroids.vertices.max -
              gameConfig.asteroids.vertices.min +
              1),
        ) + gameConfig.asteroids.vertices.min,
      // Generate random points around the asteroid for a more realistic shape
      offsets: Array(gameConfig.asteroids.vertices.max)
        .fill(0)
        .map(() => Math.random() * 0.4 + 0.8), // Between 0.8 and 1.2
    };

    asteroids.push(asteroid);
  }

  console.log(`Successfully created ${asteroids.length} asteroids`);
}

// Shoot bullet
function shootBullet() {
  // Check if we haven't exceeded the maximum number of bullets
  if (bullets.length >= gameConfig.bullets.maxCount) return;

  const bullet = {
    x: ship.x + ship.radius * Math.cos(ship.angle),
    y: ship.y - ship.radius * Math.sin(ship.angle),
    xv: gameConfig.bullets.speed * Math.cos(ship.angle),
    yv: -gameConfig.bullets.speed * Math.sin(ship.angle),
    radius: gameConfig.bullets.radius,
    lifeTime: gameConfig.bullets.lifeTime,
  };

  bullets.push(bullet);

  // Play sound
  playSound(sounds.shoot);
}

// Check for collisions
function checkCollisions() {
  // Check if ship invulnerability has expired
  if (ship.invulnerable && Date.now() > ship.invulnerableTime) {
    ship.invulnerable = false;
  }

  // Check bullets hitting asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      const dx = asteroids[i].x - bullets[j].x;
      const dy = asteroids[i].y - bullets[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < asteroids[i].radius + bullets[j].radius) {
        // Remove the asteroid and bullet
        asteroids.splice(i, 1);
        bullets.splice(j, 1);

        // Play explosion sound
        playSound(sounds.explosion);

        // Update score
        gameState.score +=
          gameConfig.scoring.pointsPerAsteroid * gameState.level;
        scoreElement.textContent = gameState.score;

        // Check if all asteroids are destroyed
        if (asteroids.length === 0) {
          // Level up!
          gameState.level++;
          levelElement.textContent = gameState.level;

          // Play level up sound
          playSound(sounds.levelUp);

          // Create new asteroids for the new level
          createAsteroids();
        }

        break; // We've modified the arrays, so break and continue with the next asteroid
      }
    }
  }

  // Check ship collision with asteroids
  if (!ship.invulnerable) {
    for (let i = 0; i < asteroids.length; i++) {
      const dx = ship.x - asteroids[i].x;
      const dy = ship.y - asteroids[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < ship.radius + asteroids[i].radius) {
        // Game over
        gameOver();
        return;
      }
    }
  }
}

// Update game state
function update() {
  // Update game time
  gameState.gameTime = Math.floor((Date.now() - gameState.startTime) / 1000);
  timeElement.textContent = gameState.gameTime;

  // Periodically refresh game config (every 30 seconds)
  if (
    window.gameAuth &&
    window.gameAuth.isLoggedIn() &&
    gameState.gameTime > 0 &&
    gameState.gameTime % 30 === 0 &&
    Date.now() - lastConfigUpdate > 5000
  ) {
    lastConfigUpdate = Date.now();

    fetchGameConfig().then((newConfig) => {
      if (newConfig) {
        // Smoothly transition to new config
        const oldAsteroidCount = gameConfig.asteroids.initialCount;
        gameConfig = newConfig;

        // Visual indicator that difficulty has changed
        if (gameConfig.asteroids.initialCount > oldAsteroidCount) {
          console.log(
            "Difficulty increased! New asteroid count:",
            gameConfig.asteroids.initialCount,
          );
        }
      }
    });
  }

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Move ship
  ship.angle += ship.rotation;

  // Apply thrust
  if (ship.thrusting) {
    ship.thrust.x += gameConfig.ship.thrust * Math.cos(ship.angle);
    ship.thrust.y -= gameConfig.ship.thrust * Math.sin(ship.angle);
  } else {
    // Apply friction
    ship.thrust.x *= 1 - gameConfig.ship.friction;
    ship.thrust.y *= 1 - gameConfig.ship.friction;
  }

  // Update ship position
  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // Handle screen wrapping for the ship
  if (ship.x < 0) ship.x = canvas.width;
  if (ship.x > canvas.width) ship.x = 0;
  if (ship.y < 0) ship.y = canvas.height;
  if (ship.y > canvas.height) ship.y = 0;

  // Draw ship
  ship.draw();

  // Update and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    // Move bullet
    bullets[i].x += bullets[i].xv;
    bullets[i].y += bullets[i].yv;

    // Handle screen wrapping for bullets
    if (bullets[i].x < 0) bullets[i].x = canvas.width;
    if (bullets[i].x > canvas.width) bullets[i].x = 0;
    if (bullets[i].y < 0) bullets[i].y = canvas.height;
    if (bullets[i].y > canvas.height) bullets[i].y = 0;

    // Reduce bullet lifetime
    bullets[i].lifeTime--;

    // Remove bullet if lifetime is up
    if (bullets[i].lifeTime <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // Draw bullet
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(bullets[i].x, bullets[i].y, bullets[i].radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Update and draw asteroids
  for (let i = 0; i < asteroids.length; i++) {
    // Move asteroid
    asteroids[i].x += asteroids[i].xv;
    asteroids[i].y += asteroids[i].yv;

    // Handle screen wrapping for asteroids
    if (asteroids[i].x < -asteroids[i].radius)
      asteroids[i].x = canvas.width + asteroids[i].radius;
    if (asteroids[i].x > canvas.width + asteroids[i].radius)
      asteroids[i].x = -asteroids[i].radius;
    if (asteroids[i].y < -asteroids[i].radius)
      asteroids[i].y = canvas.height + asteroids[i].radius;
    if (asteroids[i].y > canvas.height + asteroids[i].radius)
      asteroids[i].y = -asteroids[i].radius;

    // Draw asteroid
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Draw a more interesting shaped asteroid
    for (let j = 0; j < asteroids[i].vertices; j++) {
      const angle = (j * Math.PI * 2) / asteroids[i].vertices;
      const offset = asteroids[i].offsets[j] || 1;
      const x =
        asteroids[i].x +
        asteroids[i].radius * offset * Math.cos(angle + asteroids[i].angle);
      const y =
        asteroids[i].y +
        asteroids[i].radius * offset * Math.sin(angle + asteroids[i].angle);

      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
  }

  // Check for collisions
  checkCollisions();

  // Request next frame
  if (
    !gameOverDialog.style.display ||
    gameOverDialog.style.display === "none"
  ) {
    requestAnimationFrame(update);
  }

  // Check if config has expired (for future server implementation)
  if (gameConfig.expirationTime && Date.now() > gameConfig.expirationTime) {
    console.log(
      "Game config has expired - fetching new config from the server",
    );
    fetchGameConfig().then((newConfig) => {
      if (newConfig) {
        gameConfig = newConfig;
      }
    });
  }
}

// Game over function
function gameOver() {
  // Update final score
  finalScoreElement.textContent = gameState.score;

  // Submit score to server if logged in
  if (window.gameAuth && window.gameAuth.isLoggedIn()) {
    submitScore(gameState.score, gameState.level, gameState.gameTime).then(
      () => {
        // After submitting the score, refresh the leaderboard
        if (window.gameLeaderboard) {
          window.gameLeaderboard.loadTopScores();
        }
      },
    );
  }

  // Show game over dialog
  gameOverDialog.style.display = "block";

  // Play explosion sound
  playSound(sounds.explosion);
}

// Keyboard input
document.addEventListener("keydown", function (event) {
  if (!gameConfig) return; // Game not initialized yet

  switch (event.key) {
    case "ArrowLeft":
      ship.rotation = gameConfig.ship.turnSpeed;
      break;
    case "ArrowRight":
      ship.rotation = -gameConfig.ship.turnSpeed;
      break;
    case "ArrowUp":
      ship.thrusting = true;
      break;
    case " ":
      shootBullet();
      break;
  }
});

document.addEventListener("keyup", function (event) {
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowRight":
      ship.rotation = 0;
      break;
    case "ArrowUp":
      ship.thrusting = false;
      break;
  }
});

window.addEventListener("auth:login", (event) => {
  console.log("Authentication successful", event.detail);

  // Only set sessionId if it's not already set
  if (!sessionId) {
    sessionId = event.detail.sessionId;
  }

  localStorage.setItem("currentGameSession", sessionId);

  // Hide welcome screen
  const welcomeScreen = document.getElementById("welcome-screen");
  if (welcomeScreen) {
    welcomeScreen.style.display = "none";
  }

  // Hide leaderboard if it's showing
  document.getElementById("leaderboard-section").style.display = "none";

  // Show game section and its content
  document.getElementById("game-section").style.display = "block";
  document.querySelector(".game-section-content").style.display = "block";

  // Show start screen, hide game container
  document.getElementById("start-screen").style.display = "flex";
  document.querySelector(".game-container").style.display = "none";

  // Show the Play Game button in the nav
  const playGameButton = document.getElementById("show-game");
  if (playGameButton) {
    playGameButton.style.display = "inline-block";
  }

  // Make sure start button works
  setupStartGameButton();
});

function getCurrentSessionId() {
  // First try from memory
  if (sessionId) return sessionId;

  // Then try from localStorage
  const savedSession = localStorage.getItem("currentGameSession");
  if (savedSession) return savedSession;

  // Finally, try from auth
  if (window.gameAuth && window.gameAuth.isLoggedIn()) {
    return window.gameAuth.getSessionId();
  }

  return null;
}

// Modify the auth logout event listener
window.addEventListener("auth:logout", () => {
  console.log("User logged out");
  sessionId = null;
  pendingGameStart = false; // Reset pending game start

  if (welcomeScreen) {
    welcomeScreen.style.display = "flex";
  }
  if (gameSectionContent) {
    gameSectionContent.style.display = "none";
  }

  const playGameButton = document.getElementById("show-game");
  if (playGameButton) {
    playGameButton.style.display = "none";
  }

  document.getElementById("game-section").style.display = "none";

  // If payment modal is open, close it
  if (window.gamePayment && window.gamePayment.paymentModal) {
    window.gamePayment.hidePaymentModal();
  }
});

function debugSessionState() {
  console.log({
    sessionId: sessionId,
    authSessionId: window.gameAuth ? window.gameAuth.getSessionId() : "No auth",
    gameConfigExists: !!gameConfig,
    asteroidsCount: asteroids.length,
  });
}
