// Game configuration object - this will eventually come from the server
// This object should be treated as immutable once the game starts
const gameConfig = {
  // Version and authentication (will be used later for server validation)
  version: "1.0.0",
  configId: "config-" + Date.now(),
  expirationTime: Date.now() + 5 * 60 * 1000, // 5 minutes from now

  // Game settings
  fps: 60,
  ship: {
    radius: 10,
    turnSpeed: 0.1,
    thrust: 0.1,
    friction: 0.05,
    invulnerabilityTime: 3000, // ms
  },
  bullets: {
    speed: 5,
    radius: 2,
    maxCount: 10,
    lifeTime: 60, // frames
  },
  asteroids: {
    initialCount: 5,
    speed: 1,
    size: 30,
    vertices: { min: 7, max: 15 },
  },
  scoring: {
    pointsPerAsteroid: 10,
    levelMultiplier: 1.5,
  },
};

const sounds = {
  shoot: new Audio(
    "https://www.soundjay.com/mechanical/sounds/laser-gun-19.mp3",
  ),
  explosion: new Audio(
    "https://www.soundjay.com/mechanical/sounds/explosion-01.mp3",
  ),
  levelUp: new Audio("https://www.soundjay.com/mechanical/sounds/beep-07.mp3"),
};

Object.values(sounds).forEach((sound) => {
  sound.volume = 0.3;
});

// Game state
let gameState = {
  score: 0,
  level: 1,
  startTime: Date.now(),
  gameTime: 0,
};

// Game objects
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const timeElement = document.getElementById("time");

// Game entities
const ship = {
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

    // Draw thruster
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

const asteroids = [];
const bullets = [];

// Initialize game
function initGame() {
  // Reset game state
  gameState.score = 0;
  gameState.level = 1;
  gameState.startTime = Date.now();

  // Reset ship
  ship.x = canvas.width / 2;
  ship.y = canvas.height / 2;
  ship.angle = 0;
  ship.rotation = 0;
  ship.thrust = { x: 0, y: 0 };
  ship.invulnerable = true;
  ship.invulnerableTime = Date.now() + gameConfig.ship.invulnerabilityTime;

  // Clear entities
  asteroids.length = 0;
  bullets.length = 0;

  // Create initial asteroids
  createAsteroids();

  // Start game loop
  update();
}

// Create asteroids
function createAsteroids() {
  // Calculate how many asteroids to create
  const count = Math.floor(
    gameConfig.asteroids.initialCount * Math.sqrt(gameState.level),
  );

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
  sounds.shoot.currentTime = 0;
  sounds.shoot.play().catch((e) => console.log("Audio play error:", e));
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

        // Update score
        gameState.score +=
          gameConfig.scoring.pointsPerAsteroid * gameState.level;
        scoreElement.textContent = gameState.score;

        // Check if all asteroids are destroyed
        if (asteroids.length === 0) {
          // Level up!
          gameState.level++;
          levelElement.textContent = gameState.level;

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
  requestAnimationFrame(update);

  // Check if config is expired (for future server implementation)
  if (Date.now() > gameConfig.expirationTime) {
    console.log(
      "Game config has expired - in a real implementation, we would fetch a new one from the server",
    );
    // In the future, this is where we'd request a new config from the server
    // For now, we'll just update the expiration time
    gameConfig.expirationTime = Date.now() + 5 * 60 * 1000;
  }
}

// Keyboard input
document.addEventListener("keydown", function (event) {
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

const gameOverDialog = document.getElementById("game-over-dialog");
const finalScoreElement = document.getElementById("final-score");
const restartButton = document.getElementById("restart-button");

// Add restart button event listener
restartButton.addEventListener("click", function () {
  gameOverDialog.style.display = "none";
  initGame();
});

// Modify the game over function to show dialog
function gameOver() {
  // Update final score
  finalScoreElement.textContent = gameState.score;

  // Show game over dialog
  gameOverDialog.style.display = "block";

  // Reset game state
  ship.x = canvas.width / 2;
  ship.y = canvas.height / 2;
  ship.thrust.x = 0;
  ship.thrust.y = 0;
  ship.invulnerable = true;
  ship.invulnerableTime = Date.now() + gameConfig.ship.invulnerabilityTime;

  // Clear entities but don't restart yet - player needs to click restart
  asteroids.length = 0;
  bullets.length = 0;
}

// Start the game
initGame();
