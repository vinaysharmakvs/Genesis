(() => {
  const menuButton = document.querySelector("[data-gims-menu]");
  const nav = document.querySelector("[data-gims-nav]");
  menuButton?.addEventListener("click", () => {
    nav?.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", nav?.classList.contains("open") ? "true" : "false");
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => nav.classList.remove("open")));

  const emit = (name, data = {}) => {
    window.dataLayer?.push?.({ event: name, ...data });
  };
  emit("scholarship_page_view");

  const modeTabs = [...document.querySelectorAll("[data-test-mode-tab]")];
  const modePanels = [...document.querySelectorAll("[data-test-mode-panel]")];
  const modeRegisterLinks = [...document.querySelectorAll("[data-mode-register]")];
  const selectTestMode = (mode) => {
    modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.testModeTab === mode));
    modePanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.testModePanel === mode));
    const testModeSelect = document.querySelector('[name="testMode"]');
    if (testModeSelect) testModeSelect.value = mode === "online" ? "Online supervised test" : "Offline at Genesis campus";
    emit("test_mode_selected", { mode });
  };
  modeTabs.forEach((tab) => tab.addEventListener("click", () => selectTestMode(tab.dataset.testModeTab)));
  modeRegisterLinks.forEach((link) => link.addEventListener("click", () => {
    const value = link.dataset.modeRegister || "";
    selectTestMode(value.toLowerCase().includes("online") ? "online" : "offline");
  }));

  const assessmentOutput = document.querySelector("[data-assessment-output]");
  const assessmentCopy = {
    objective: { title: "Sample objective question", text: "If a student solves 36 questions in 45 minutes, what does that say about speed and accuracy under time pressure?" },
    subjective: { title: "Sample subjective question", text: "Explain why regular revision is more effective than studying everything one night before the exam." }
  };
  document.querySelectorAll("[data-assessment]").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll("[data-assessment]").forEach((item) => item.classList.remove("active"));
      card.classList.add("active");
      const current = assessmentCopy[card.dataset.assessment];
      assessmentOutput.innerHTML = `<strong>${current.title}</strong><p>${current.text}</p>`;
    });
  });

  const patternData = {
    junior: { group: "Grades 7-8", subjects: ["Maths", "Science", "English", "Reasoning"], questions: "60", duration: "90 minutes", objective: 70, subjective: 30, mode: "Offline / online supervised", approach: "Accuracy + explanation quality", focus: "Foundation clarity", insight: "Best for students who need concept confidence before higher competition." },
    middle: { group: "Grades 9-10", subjects: ["Maths", "Science", "English", "Reasoning"], questions: "75", duration: "120 minutes", objective: 75, subjective: 25, mode: "Offline / online supervised", approach: "Concepts + speed + thinking", focus: "Board + competition readiness", insight: "Balanced for board discipline, speed and early competitive thinking." },
    senior: { group: "Grades 11-12", subjects: ["PCM/PCB", "Aptitude", "English", "Reasoning"], questions: "90", duration: "150 minutes", objective: 80, subjective: 20, mode: "Offline / online supervised", approach: "Competitive readiness + clarity", focus: "Entrance direction", insight: "Designed to reveal entrance-readiness, clarity and next academic direction." }
  };
  const panel = document.querySelector("[data-pattern-panel]");
  const renderPattern = (key = "junior") => {
    const row = patternData[key];
    panel.innerHTML = `
      <div class="pattern-live-card">
        <div class="pattern-visual-stage">
          <span class="pattern-signal-pill">Live structure preview</span>
          <div class="pattern-score-ring" style="--objective:${row.objective}%">
            <span>${row.objective}%</span>
            <small>Objective weight</small>
          </div>
          <div class="pattern-visual-meta">
            <strong>${row.questions} question structure</strong>
            <p>${row.approach} with a balanced mix of speed, clarity and explanation quality.</p>
            <div class="pattern-meter-row">
              <b>Objective focus</b>
              <div class="pattern-meter-track" style="--meter:${row.objective}%"><i></i></div>
            </div>
            <div class="pattern-meter-row">
              <b>Subjective focus</b>
              <div class="pattern-meter-track" style="--meter:${row.subjective}%"><i></i></div>
            </div>
          </div>
        </div>
        <div class="pattern-focus">
          <span>${row.group}</span>
          <h3>${row.focus}</h3>
          <p>${row.insight}</p>
          <div class="pattern-subjects">${row.subjects.map((subject) => `<em>${subject}</em>`).join("")}</div>
          <div class="pattern-bars" aria-hidden="true">
            <i style="--bar:${row.objective}%"><b>Objective</b></i>
            <i style="--bar:${row.subjective}%"><b>Subjective</b></i>
          </div>
        </div>
        <div class="pattern-stat-grid">
          <article><span>Questions</span><strong>${row.questions}</strong></article>
          <article><span>Duration</span><strong>${row.duration}</strong></article>
          <article><span>Mode</span><strong>${row.mode}</strong></article>
          <article><span>Marking</span><strong>${row.approach}</strong></article>
        </div>
      </div>`;
  };
  renderPattern();
  document.querySelectorAll("[data-pattern-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-pattern-tab]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    emit("grade_selected", { grade_group: button.dataset.patternTab });
    renderPattern(button.dataset.patternTab);
  }));

  const today = new Date();
  const milestones = [...document.querySelectorAll("[data-gims-timeline] article")];
  const upcoming = milestones.find((item) => new Date(item.dataset.date + "T00:00:00") >= today) || milestones[milestones.length - 1];
  upcoming?.classList.add("next");
  const dateDetail = document.querySelector("[data-date-detail]");
  const renderDateDetail = (item = upcoming) => {
    if (!item || !dateDetail) return;
    milestones.forEach((milestone) => milestone.classList.toggle("active", milestone === item));
    dateDetail.innerHTML = `
      <div class="date-detail-number">
        <span>${item.querySelector("span")?.textContent || ""}</span>
        <small>Milestone</small>
      </div>
      <div class="date-detail-copy">
        <div class="date-detail-status">
          <span>${item.classList.contains("next") ? "Next action" : "GIMS timeline"}</span>
          <em>${item.querySelector("p")?.textContent || ""}</em>
        </div>
        <strong>${item.querySelector("strong")?.textContent || ""}</strong>
        <p>${item.dataset.summary || ""}</p>
        <div class="date-detail-actions" aria-label="Timeline actions">
          <a href="#register">Register now</a>
          <a href="#pattern">View test pattern</a>
        </div>
      </div>
      <div class="date-detail-meter" aria-hidden="true">
        <b></b>
        <span>From registration to counselling</span>
      </div>`;
  };
  renderDateDetail();
  milestones.forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.addEventListener("click", () => renderDateDetail(item));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        renderDateDetail(item);
      }
    });
  });

  document.querySelectorAll(".faq-list details").forEach((item) => item.addEventListener("toggle", () => {
    if (item.open) emit("faq_opened", { faq: item.querySelector("summary")?.textContent || "" });
  }));

  const form = document.querySelector("[data-gims-form]");
  const error = document.querySelector("[data-gims-error]");
  const state = document.querySelector("[data-payment-state]");
  const payButton = document.querySelector("[data-pay-button]");
  const feeAmount = 14900;
  const publicKeyPlaceholder = "rzp_test_xe08dTmycCK44q";

  const setState = (type, html) => {
    state.hidden = false;
    state.className = `payment-state ${type}`;
    state.innerHTML = html;
    state.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validate = (data) => {
    const required = ["studentName","parentName","grade","schoolName","city","state","mobile","email","testMode"];
    for (const key of required) if (!String(data.get(key) || "").trim()) return "Please fill all required fields.";
    if (!/^[6-9]\d{9}$/.test(String(data.get("mobile")).trim())) return "Please enter a valid 10 digit Indian mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email")).trim())) return "Please enter a valid email address.";
    if (!data.get("consent")) return "Please accept the terms and privacy consent.";
    return "";
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    emit("registration_started");
    const data = new FormData(form);
    const validation = validate(data);
    error.textContent = validation;
    if (validation) return;

    payButton.disabled = true;
    payButton.textContent = "Creating secure order...";
    emit("payment_started");

    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout did not load. Please check your internet connection and try again.");
      }

      const registrationPayload = Object.fromEntries(data.entries());
      const response = await fetch("/api/scholarship/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationPayload)
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Payment backend is not configured yet.");

      const options = {
        key: order.keyId || publicKeyPlaceholder,
        amount: order.amount || feeAmount,
        currency: order.currency || "INR",
        name: "Genesis Educates",
        description: "GIMS Scholarship Test 2026",
        order_id: order.orderId,
        prefill: { name: registrationPayload.parentName, email: registrationPayload.email, contact: registrationPayload.mobile },
        handler: async (paymentResponse) => {
          try {
            payButton.textContent = "Verifying payment...";
            const verifyResponse = await fetch("/api/scholarship/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...paymentResponse, registrationId: order.registrationId })
            });
            const verified = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verified.error || "Payment verification failed.");
            emit("payment_success");
            setState("success", `<h3>Registration successful</h3><p>Student: ${registrationPayload.studentName}</p><p>Reference: ${verified.registrationId || order.registrationId}</p><p>Payment ID: ${paymentResponse.razorpay_payment_id}</p><p>Amount paid: Rs 149</p><a class="button primary" href="index.html">Return to homepage</a>`);
          } catch (verifyError) {
            emit("payment_failed", { reason: "verification_failed" });
            setState("failed", `<h3>Payment verification failed</h3><p>${verifyError.message}</p><p>If money was deducted, please contact Genesis with your Razorpay payment ID.</p><a class="button primary" href="#register">Retry Payment</a>`);
          } finally {
            payButton.disabled = false;
            payButton.textContent = "Proceed to Secure Payment";
          }
        },
        modal: { ondismiss: () => { emit("payment_failed", { reason: "cancelled" }); setState("cancelled", `<h3>Payment cancelled</h3><p>Your registration has not been confirmed. You can retry payment when ready.</p><a class="button primary" href="#register">Retry Payment</a>`); payButton.disabled = false; payButton.textContent = "Proceed to Secure Payment"; } }
      };
      const razorpay = new Razorpay(options);
      razorpay.on("payment.failed", (response) => { emit("payment_failed"); setState("failed", `<h3>Payment failed</h3><p>${response.error?.description || "The payment could not be completed."}</p><a class="button primary" href="#register">Retry Payment</a>`); });
      razorpay.open();
    } catch (err) {
      setState("failed", `<h3>Secure payment backend pending</h3><p>${err.message}</p><p>To activate payments, add the Vercel API routes and Razorpay environment variables described in the delivery notes.</p>`);
      payButton.disabled = false;
      payButton.textContent = "Proceed to Secure Payment";
    }
  });

  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
})();
