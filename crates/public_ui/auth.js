import { NostrClientWrapper, SignerType } from "./dist/nostr_signer.js";

class AuthClient {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.nostrClient = null;
    this.sessionId = null;
    this.username = null;
  }

  async initialize() {
    try {
      this.nostrClient = new NostrClientWrapper();
      this.restoreSession();
      this.setupEventListeners();
      console.log("Auth client initialized");
    } catch (error) {
      console.error("Failed to initialize auth client:", error);
    }
  }

  setupEventListeners() {
    // Login related elements
    document
      .getElementById("loginBtn")
      .addEventListener("click", () => this.showLoginModal());
    document
      .getElementById("closeLoginModal")
      .addEventListener("click", () => this.hideLoginModal());
    document
      .getElementById("loginButton")
      .addEventListener("click", () => this.handlePrivateKeyLogin());
    document
      .getElementById("extensionLoginButton")
      .addEventListener("click", () => this.handleExtensionLogin());
    document
      .getElementById("showRegisterModal")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.hideLoginModal();
        this.showRegisterModal();
      });

    // Registration related elements
    document
      .getElementById("registerBtn")
      .addEventListener("click", () => this.showRegisterModal());
    document
      .getElementById("closeRegisterModal")
      .addEventListener("click", () => this.hideRegisterModal());
    document
      .getElementById("registerStep1Button")
      .addEventListener("click", () => this.handleRegistrationComplete());
    document
      .getElementById("extensionRegisterButton")
      .addEventListener("click", () => this.handleExtensionRegistration());
    document
      .getElementById("copyPrivateKey")
      .addEventListener("click", () => this.handleCopyPrivateKey());
    document
      .getElementById("privateKeySavedCheckbox")
      .addEventListener("change", (e) => {
        document.getElementById("registerStep1Button").disabled =
          !e.target.checked;
      });
    document.getElementById("showLoginModal").addEventListener("click", (e) => {
      e.preventDefault();
      this.hideRegisterModal();
      this.showLoginModal();
    });

    // Logout
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.handleLogout());

    // Tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const parent = tab.parentElement;
        const modal = parent.closest(".modal");

        // Remove active class from all tabs in this modal
        parent
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("is-active"));

        // Add active class to clicked tab
        tab.classList.add("is-active");

        // Hide all tab contents
        modal
          .querySelectorAll(".tab-content")
          .forEach((content) => content.classList.remove("is-active"));

        // Show the target tab content
        const targetId = tab.dataset.target;
        document.getElementById(targetId).classList.add("is-active");
      });
    });
  }

  showLoginModal() {
    console.log("Showing login modal");
    document.getElementById("loginModal").classList.add("is-active");
  }

  hideLoginModal() {
    document.getElementById("loginModal").classList.remove("is-active");
    document.getElementById("loginPrivateKey").value = "";
    document.getElementById("privateKeyError").textContent = "";
    document.getElementById("extensionLoginError").textContent = "";
  }

  showRegisterModal() {
    console.log("Showing register modal");
    // Initialize registration process
    this.handleRegisterInit();
    document.getElementById("registerModal").classList.add("is-active");
  }

  hideRegisterModal() {
    document.getElementById("registerModal").classList.remove("is-active");
    document.getElementById("extensionRegisterError").textContent = "";
  }

  async handleRegisterInit() {
    try {
      await this.nostrClient.initialize(SignerType.PrivateKey, null);
      const privateKeyDisplay = document.getElementById("privateKeyDisplay");
      privateKeyDisplay.value = await this.nostrClient.getPrivateKey();

      // Reset UI state
      document.getElementById("registerStep1").classList.remove("is-hidden");
      document.getElementById("registerStep2").classList.add("is-hidden");
      document.getElementById("registerStep1Button").disabled = true;
      document.getElementById("privateKeySavedCheckbox").checked = false;
    } catch (error) {
      console.error("Failed to generate private key:", error);
    }
  }

  async handleCopyPrivateKey() {
    const privateKey = document.getElementById("privateKeyDisplay").value;
    await navigator.clipboard.writeText(privateKey);

    // Visual feedback
    const copyBtn = document.getElementById("copyPrivateKey");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }

  async handlePrivateKeyLogin() {
    const errorElement = document.getElementById("privateKeyError");
    errorElement.textContent = "";

    const privateKey = document.getElementById("loginPrivateKey").value;
    if (!privateKey) {
      errorElement.textContent = "Please enter your private key";
      return;
    }

    try {
      await this.nostrClient.initialize(SignerType.PrivateKey, privateKey);
      await this.login();
    } catch (error) {
      console.error("Private key login failed:", error);
      errorElement.textContent = "Login failed. Please check your private key.";
    }
  }

  async handleExtensionLogin() {
    const errorElement = document.getElementById("extensionLoginError");
    errorElement.textContent = "";

    try {
      await this.nostrClient.initialize(SignerType.NIP07, null);
      await this.login();
    } catch (error) {
      console.error("Extension login failed:", error);

      if (error.toString().includes("No NIP-07")) {
        errorElement.textContent =
          "No Nostr extension found. Please install a compatible extension.";
      } else {
        errorElement.textContent = "Login failed. Please try again.";
      }
    }
  }

  async handleExtensionRegistration() {
    const errorElement = document.getElementById("extensionRegisterError");
    errorElement.textContent = "";

    try {
      await this.nostrClient.initialize(SignerType.NIP07, null);
      await this.register();
      await this.login();
    } catch (error) {
      console.error("Extension registration failed:", error);

      if (error.toString().includes("No NIP-07")) {
        errorElement.textContent =
          "No Nostr extension found. Please install a compatible extension.";
      } else {
        errorElement.textContent = "Registration failed. Please try again.";
      }
    }
  }

  async handleRegistrationComplete() {
    try {
      await this.register();
      this.showRegistrationSuccess();
      await this.login();
    } catch (error) {
      console.error("Registration failed:", error);
      // Show error message
    }
  }

  showRegistrationSuccess() {
    document.getElementById("registerStep1").classList.add("is-hidden");
    document.getElementById("registerStep2").classList.remove("is-hidden");

    // After 2 seconds, close the modal
    setTimeout(() => {
      this.hideRegisterModal();
    }, 2000);
  }

  handleLogout() {
    // Clear session data
    localStorage.removeItem("gameSession");
    localStorage.removeItem("gameUsername");

    // Reset client
    this.nostrClient = new NostrClientWrapper();
    this.sessionId = null;
    this.username = null;

    // Update UI
    document.getElementById("authButtons").classList.remove("is-hidden");
    document.getElementById("userInfoArea").classList.add("is-hidden");

    // Dispatch auth event
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }

  async createAuthHeader(url, method, body = null) {
    return this.nostrClient.getAuthHeader(url, method, body);
  }

  async get(url, options = {}) {
    const authHeader = await this.createAuthHeader(url, "GET", null);
    const response = await fetch(url, {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: authHeader,
      },
    });

    return response;
  }

  async post(url, body = null, options = {}) {
    const authHeader = await this.createAuthHeader(url, "POST", body);
    const response = await fetch(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: authHeader,
      },
      body: body ? JSON.stringify(body) : null,
    });

    return response;
  }

  async register() {
    const pubkey = await this.nostrClient.getPublicKey();
    const response = await this.post(`${this.apiBase}/api/v1/users/register`, {
      username: `player_${pubkey.substring(0, 8)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Registration failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async login() {
    const response = await this.post(`${this.apiBase}/api/v1/users/login`);

    if (!response.ok) {
      throw new Error(
        `Login failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    this.sessionId = data.session_id;
    this.username = data.username;

    // Save session data
    localStorage.setItem("gameSession", this.sessionId);
    localStorage.setItem("gameUsername", this.username);

    // Update UI
    this.updateAuthUI();

    // Hide modals
    this.hideLoginModal();
    this.hideRegisterModal();

    // Dispatch auth event
    window.dispatchEvent(
      new CustomEvent("auth:login", {
        detail: {
          sessionId: this.sessionId,
          username: this.username,
        },
      }),
    );

    return data;
  }

  restoreSession() {
    this.sessionId = localStorage.getItem("gameSession");
    this.username = localStorage.getItem("gameUsername");

    if (this.sessionId && this.username) {
      this.updateAuthUI();

      // Dispatch auth event
      window.dispatchEvent(
        new CustomEvent("auth:login", {
          detail: {
            sessionId: this.sessionId,
            username: this.username,
          },
        }),
      );
    }
  }

  updateAuthUI() {
    if (this.sessionId && this.username) {
      document.getElementById("authButtons").classList.add("is-hidden");
      document.getElementById("userInfoArea").classList.remove("is-hidden");
      document.getElementById("usernameDisplay").textContent = this.username;
    } else {
      document.getElementById("authButtons").classList.remove("is-hidden");
      document.getElementById("userInfoArea").classList.add("is-hidden");
    }
  }

  isLoggedIn() {
    return !!this.sessionId;
  }

  getSessionId() {
    return this.sessionId;
  }
}

// Initialize auth client
const auth = new AuthClient(API_BASE);
await auth.initialize();

// Export for use in other modules
window.gameAuth = auth;
window.gameAuth.showLoginModal = auth.showLoginModal.bind(auth);
window.gameAuth.showRegisterModal = auth.showRegisterModal.bind(auth);
