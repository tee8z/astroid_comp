window.paymentHandlerStatus = {
  initialized: false,
  initializing: false,
  handler: null,
  initPromise: null,
};

class PaymentHandler {
  constructor() {
    console.log("PaymentHandler constructor called");

    this.paymentModal = document.getElementById("paymentModal");
    this.paymentRequest = document.getElementById("paymentRequest");
    this.copyFeedback = document.getElementById("copyFeedback");
    this.qrContainer = document.getElementById("qrContainer");
    this.paymentStatus = document.getElementById("paymentStatus");
    this.copyInvoiceBtn = document.getElementById("copyInvoiceBtn");
    this.checkPaymentBtn = document.getElementById("checkPaymentBtn");
    this.cancelPaymentBtn = document.getElementById("cancelPaymentBtn");

    this.currentPaymentId = null;
    this.paymentCheckInterval = null;
    this.paymentData = null;

    // Check if all elements are available
    if (this.checkElements()) {
      this.setupEventListeners();
      window.paymentHandlerStatus.initialized = true;
      window.paymentHandlerStatus.handler = this;
      console.log("Payment handler fully initialized");
    } else {
      console.warn("Payment elements not found during initialization");
    }
  }

  checkElements() {
    // Check if all required elements exist
    return !!(
      this.paymentModal &&
      this.paymentRequest &&
      this.copyFeedback &&
      this.qrContainer &&
      this.paymentStatus &&
      this.copyInvoiceBtn &&
      this.checkPaymentBtn &&
      this.cancelPaymentBtn
    );
  }

  setupEventListeners() {
    // Copy invoice button
    this.copyInvoiceBtn.addEventListener("click", () =>
      this.copyInvoiceToClipboard(),
    );

    // Check payment button
    this.checkPaymentBtn.addEventListener("click", () =>
      this.checkPaymentStatus(),
    );

    // Cancel button
    this.cancelPaymentBtn.addEventListener("click", () =>
      this.hidePaymentModal(),
    );
  }

  // Rest of the PaymentHandler class methods remain the same
  // ...

  async requestGameSession() {
    try {
      console.log("Requesting new game session...");
      const response = await window.gameAuth.post(
        `${API_BASE}/api/v1/game/session`,
      );

      if (response.status === 201 || response.status === 200) {
        // Success - game session created
        console.log("Game session created successfully");
        const data = await response.json();
        return {
          success: true,
          data,
        };
      } else if (response.status === 402) {
        // Payment required
        console.log("Payment required to start game");
        const data = await response.json();

        if (data.payment_required) {
          this.showPaymentModal(data);
          return {
            success: false,
            requiresPayment: true,
            data,
          };
        }
      } else {
        console.error("Unexpected response:", response.status);
        const errorText = await response.text();
        throw new Error(`Failed to create game session: ${errorText}`);
      }
    } catch (error) {
      console.error("Error requesting game session:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  showPaymentModal(paymentData) {
    console.log("Showing payment modal with data:", paymentData);
    this.paymentData = paymentData;
    this.currentPaymentId = paymentData.payment_id;

    // Clear any previous QR codes
    this.qrContainer.innerHTML = "";

    // Set payment request
    this.paymentRequest.value = paymentData.invoice;

    // Create Bitcoin QR code element
    const qrElement = document.createElement("bitcoin-qr");
    qrElement.setAttribute("lightning", paymentData.invoice);
    qrElement.setAttribute("width", 250);
    qrElement.setAttribute("height", 250);
    qrElement.setAttribute("dots-type", "rounded");
    qrElement.setAttribute("corners-square-type", "extra-rounded");
    qrElement.setAttribute("background-color", "#ffffff");
    qrElement.setAttribute("dots-color", "#000000");

    // Add the QR code to the container
    this.qrContainer.appendChild(qrElement);

    // Reset payment status
    this.paymentStatus.innerHTML = `
            <p>Waiting for payment...</p>
            <p class="nes-text is-primary">Amount: 500 sats</p>
        `;

    // Show the modal
    this.paymentModal.style.display = "block";

    // Start checking for payment status
    this.startPaymentCheck();
  }

  hidePaymentModal() {
    this.paymentModal.style.display = "none";
    this.stopPaymentCheck();
  }

  copyInvoiceToClipboard() {
    navigator.clipboard
      .writeText(this.paymentRequest.value)
      .then(() => {
        // Show feedback
        this.copyFeedback.classList.add("visible");

        // Hide feedback after 2 seconds
        setTimeout(() => {
          this.copyFeedback.classList.remove("visible");
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        alert("Failed to copy invoice to clipboard");
      });
  }

  startPaymentCheck() {
    // Clear any existing interval
    this.stopPaymentCheck();

    // Check immediately
    this.checkPaymentStatus();

    // Then check every 5 seconds
    this.paymentCheckInterval = setInterval(
      () => this.checkPaymentStatus(),
      5000,
    );
  }

  stopPaymentCheck() {
    if (this.paymentCheckInterval) {
      clearInterval(this.paymentCheckInterval);
      this.paymentCheckInterval = null;
    }
  }

  async checkPaymentStatus() {
    if (!this.currentPaymentId) {
      console.warn("No payment ID to check");
      return;
    }

    try {
      console.log("Checking payment status for:", this.currentPaymentId);

      // Show loading indicator
      this.paymentStatus.innerHTML = `
                <div class="spinner"></div>
                <p>Checking payment status...</p>
            `;

      const response = await window.gameAuth.get(
        `${API_BASE}/api/v1/payments/status/${this.currentPaymentId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to check payment status: ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("Payment status:", data);

      if (data.status === "paid") {
        this.handleSuccessfulPayment();
      } else if (data.status === "failed") {
        this.handleFailedPayment();
      } else {
        // Still pending
        this.paymentStatus.innerHTML = `
                    <p>Waiting for payment...</p>
                    <p class="nes-text is-primary">Amount: 500 sats</p>
                `;
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      this.paymentStatus.innerHTML = `
                <p class="nes-text is-error">Error checking payment</p>
                <p>${error.message}</p>
                <button id="retryCheckBtn" class="nes-btn is-warning">Retry</button>
            `;

      // Add event listener for retry button
      document
        .getElementById("retryCheckBtn")
        .addEventListener("click", () => this.checkPaymentStatus());
    }
  }

  handleSuccessfulPayment() {
    console.log("Payment successful! Starting game...");

    // Show success message
    this.paymentStatus.innerHTML = `
            <p class="nes-text is-success">Payment received!</p>
            <p>Starting game...</p>
        `;

    // Stop checking for payments
    this.stopPaymentCheck();

    // Wait a moment to let the user see the success message
    setTimeout(() => {
      // Hide the payment modal
      this.hidePaymentModal();

      // Create a new game session and start the game
      this.startGameAfterPayment();
    }, 2000);
  }

  handleFailedPayment() {
    console.log("Payment failed");

    // Show failure message
    this.paymentStatus.innerHTML = `
            <p class="nes-text is-error">Payment failed</p>
            <p>Please try again or use a different wallet</p>
            <button id="newInvoiceBtn" class="nes-btn is-warning">Get New Invoice</button>
        `;

    // Stop checking for payments
    this.stopPaymentCheck();

    // Add event listener for new invoice button
    document.getElementById("newInvoiceBtn").addEventListener("click", () => {
      // Request a new game session which will generate a new invoice
      this.requestGameSession();
    });
  }

  async startGameAfterPayment() {
    // Request a fresh game session now that we've paid
    const result = await this.requestGameSession();

    if (result.success) {
      // Start the game with the session data
      window.startGameWithConfig(result.data);
    } else {
      console.error("Failed to start game after payment:", result.error);
      alert("Payment successful but could not start game. Please try again.");
    }
  }
}

// Export a function that ensures the payment handler is initialized
window.initializePaymentHandler = function () {
  // If already initialized, return the handler
  if (
    window.paymentHandlerStatus.initialized &&
    window.paymentHandlerStatus.handler
  ) {
    console.log("Payment handler already initialized");
    return Promise.resolve(window.paymentHandlerStatus.handler);
  }

  // If currently initializing, return the existing promise
  if (
    window.paymentHandlerStatus.initializing &&
    window.paymentHandlerStatus.initPromise
  ) {
    console.log("Payment handler initialization already in progress");
    return window.paymentHandlerStatus.initPromise;
  }

  // Start new initialization
  console.log("Starting payment handler initialization");
  window.paymentHandlerStatus.initializing = true;

  window.paymentHandlerStatus.initPromise = new Promise((resolve, reject) => {
    // Try to initialize right away
    let handler = new PaymentHandler();

    // If successful, resolve immediately
    if (handler.checkElements()) {
      console.log("Payment handler initialized on first try");
      window.paymentHandlerStatus.initialized = true;
      window.paymentHandlerStatus.handler = handler;
      window.gamePayment = handler;
      resolve(handler);
      return;
    }

    // Otherwise, retry with a delay
    console.log("First attempt failed, will retry with delay");

    let attempts = 0;
    const maxAttempts = 10;

    const attemptInit = () => {
      attempts++;
      console.log(`Attempt ${attempts} to initialize payment handler`);

      handler = new PaymentHandler();

      if (handler.checkElements()) {
        console.log(`Payment handler initialized on attempt ${attempts}`);
        window.paymentHandlerStatus.initialized = true;
        window.paymentHandlerStatus.handler = handler;
        window.gamePayment = handler;
        resolve(handler);
      } else if (attempts < maxAttempts) {
        setTimeout(attemptInit, 500);
      } else {
        const error = new Error(
          "Failed to initialize payment handler after max attempts",
        );
        console.error(error);
        reject(error);
      }
    };

    setTimeout(attemptInit, 500);
  });

  return window.paymentHandlerStatus.initPromise;
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing payment handler");
  window
    .initializePaymentHandler()
    .then((handler) => {
      console.log("Payment handler ready");
    })
    .catch((error) => {
      console.error("Failed to initialize payment handler:", error);
    });
});
