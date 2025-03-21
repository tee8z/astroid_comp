async function loadTopScores() {
  console.log("Attempting to load top scores...");
  try {
    const tableBody = document.getElementById("start-scores-body");
    if (tableBody) {
      tableBody.innerHTML =
        '<tr><td colspan="4" class="has-text-centered">Loading scores...</td></tr>';
    }

    const response = await fetch(`${API_BASE}/api/v1/game/scores/top`);
    console.log("Score fetch response status:", response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch scores: ${response.statusText}`);
    }

    const scores = await response.json();
    console.log("Received scores:", scores);

    displayStartScreenScores(scores);
    displayFullLeaderboard(scores);
  } catch (error) {
    console.error("Error loading top scores:", error);
    const errorMsg = document.getElementById("start-error-message");
    if (errorMsg) {
      errorMsg.textContent =
        "Failed to load top scores. Please try again later.";
    }
  }
}

// Function to display scores on the start screen
function displayStartScreenScores(scores) {
  console.log("Displaying scores on start screen");
  const tableBody = document.getElementById("start-scores-body");
  if (!tableBody) {
    console.error("Start scores table body not found");
    return;
  }

  tableBody.innerHTML = "";

  if (!scores || scores.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="4" class="has-text-centered">No scores available yet!</td>';
    tableBody.appendChild(row);
    return;
  }

  // Take only top 5 scores for the start screen
  const topScores = scores.slice(0, 5);

  topScores.forEach((score, index) => {
    const row = document.createElement("tr");
    const username = score.username || "Anonymous";

    // Create a simplified table row for the start screen
    row.innerHTML = `
      <td class="has-text-centered">${index + 1}</td>
      <td class="has-text-centered nes-text is-primary">${username}</td>
      <td class="has-text-centered nes-text is-success">${score.score}</td>
      <td class="has-text-centered">${score.level}</td>
    `;

    tableBody.appendChild(row);
  });
}

// Function to show the full leaderboard section
function showLeaderboard() {
  // Hide both welcome screen and game section
  const welcomeScreen = document.getElementById("welcome-screen");
  if (welcomeScreen) {
    welcomeScreen.style.display = "none";
  }

  const gameSection = document.getElementById("game-section");
  if (gameSection) {
    gameSection.style.display = "none";
  }

  // Show the leaderboard section
  const leaderboardSection = document.getElementById("leaderboard-section");
  if (leaderboardSection) {
    leaderboardSection.style.display = "block";
  }

  // Refresh scores
  loadTopScores();
}

// Function to return to the game section
function showGame() {
  // Hide leaderboard section
  const leaderboardSection = document.getElementById("leaderboard-section");
  if (leaderboardSection) {
    leaderboardSection.style.display = "none";
  }

  // Show appropriate screen based on auth status
  if (window.gameAuth && window.gameAuth.isLoggedIn()) {
    // User is logged in, show game section
    const welcomeScreen = document.getElementById("welcome-screen");
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }

    const gameSection = document.getElementById("game-section");
    if (gameSection) {
      gameSection.style.display = "block";
    }

    // Also make sure the game content is visible
    const gameSectionContent = document.querySelector(".game-section-content");
    if (gameSectionContent) {
      gameSectionContent.style.display = "block";
    }
  } else {
    // User is not logged in, show welcome screen
    const welcomeScreen = document.getElementById("welcome-screen");
    if (welcomeScreen) {
      welcomeScreen.style.display = "flex";
    }

    const gameSection = document.getElementById("game-section");
    if (gameSection) {
      gameSection.style.display = "none";
    }
  }
}

// Function to display the full leaderboard
function displayFullLeaderboard(scores) {
  const tableBody = document.getElementById("top-scores-body");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!scores || scores.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="6" class="has-text-centered">No scores available yet!</td>';
    tableBody.appendChild(row);
    return;
  }

  scores.forEach((score, index) => {
    const row = document.createElement("tr");
    const username = score.username || "Anonymous";

    // Format the date
    let formattedDate;
    try {
      const scoreDate = new Date(score.created_at);
      formattedDate =
        scoreDate.toLocaleDateString() + " " + scoreDate.toLocaleTimeString();
    } catch (e) {
      formattedDate = score.created_at || "Unknown";
    }

    // Create a detailed table row for the full leaderboard
    row.innerHTML = `
      <td class="has-text-centered">${index + 1}</td>
      <td class="has-text-centered nes-text is-primary">${username}</td>
      <td class="has-text-centered nes-text is-success">${score.score}</td>
      <td class="has-text-centered">${score.level}</td>
      <td class="has-text-centered">${score.play_time || 0}s</td>
      <td class="has-text-centered">${formattedDate}</td>
    `;

    tableBody.appendChild(row);
  });
}

// Load the scores immediately when this script runs
console.log("Leaderboard.js loaded, loading scores...");
loadTopScores();

// Set up a periodic refresh of the scores
setInterval(loadTopScores, 60000); // Refresh every minute

// When the DOM is fully loaded, set up the navigation buttons
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, setting up leaderboard navigation...");

  // Set up navigation buttons
  const showLeaderboardBtn = document.getElementById("show-leaderboard");
  if (showLeaderboardBtn) {
    showLeaderboardBtn.addEventListener("click", showLeaderboard);
  }

  const backToGameBtn = document.getElementById("back-to-game");
  if (backToGameBtn) {
    backToGameBtn.addEventListener("click", showGame);
  }

  const viewLeaderboardBtn = document.getElementById("view-leaderboard-button");
  if (viewLeaderboardBtn) {
    viewLeaderboardBtn.addEventListener("click", function () {
      gameOverDialog.style.display = "none";
      showLeaderboard();
    });
  }
});

// Explicitly export the functions for use in other scripts
window.gameLeaderboard = {
  loadTopScores,
  showLeaderboard,
  showGame,
};
