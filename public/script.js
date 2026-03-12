// script.js
// AI Expert conversation loop, jump-in support, error handling

const expertAInput = document.getElementById("expertA");
const expertBInput = document.getElementById("expertB");
const topicInput = document.getElementById("topic");
const turnsInput = document.getElementById("turns");
const delayInput = document.getElementById("delay");

const validateBtn = document.getElementById("validateBtn");
const chatBtn = document.getElementById("chatBtn");
const statusDiv = document.getElementById("status");
const countdownDiv = document.getElementById("countdown");
const transcriptDiv = document.getElementById("transcript");

const dotsOpenAI = document.getElementById("dots-openai");
const dotsClaude = document.getElementById("dots-claude");

const jumpBtn = document.getElementById("jumpBtn");
const jumpInput = document.getElementById("jumpInput");

let conversationRunning = false;
let countdownTimer = null;
let countdownRemaining = 0;
let jumpMode = false;
let pendingUserText = "";

// --- Utility functions ---
function setStatus(msg, type = "") {
  statusDiv.textContent = msg;
  statusDiv.style.color = type === "error" ? "red" : "green";
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTranscript(messages) {
  transcriptDiv.innerHTML = "";
  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `message ${m.model}`;
    div.innerHTML = `<strong>${escapeHTML(m.speaker)} (${m.model})</strong><br>${escapeHTML(m.text)}`;
    transcriptDiv.appendChild(div);
  });
}

function setActiveModel(model) {
  dotsOpenAI.classList.remove("active");
  dotsClaude.classList.remove("active");
  if (model === "openai") dotsOpenAI.classList.add("active");
  if (model === "claude") dotsClaude.classList.add("active");
}

function clearCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
  countdownDiv.textContent = "";
}

function startDelay(delaySeconds, onDone) {
  clearCountdown();
  countdownRemaining = delaySeconds;
  countdownDiv.textContent = `Next in: ${countdownRemaining}s`;
  jumpBtn.disabled = false;
  jumpBtn.textContent = "Jump-in";
  jumpInput.style.display = "none";
  jumpInput.value = "";
  jumpMode = false;
  pendingUserText = "";

  countdownTimer = setInterval(() => {
    if (!jumpMode) {
      countdownRemaining -= 1;
      countdownDiv.textContent = `Next in: ${countdownRemaining}s`;
      if (countdownRemaining <= 0) {
        clearCountdown();
        jumpBtn.disabled = true;
        onDone(pendingUserText || null);
      }
    }
  }, 1000);
}

// --- Jump-in / Resume ---
jumpBtn.onclick = () => {
  if (!conversationRunning) return;

  if (!jumpMode) {
    jumpMode = true;
    jumpBtn.textContent = "Resume conversation";
    jumpInput.style.display = "block";
  } else {
    jumpMode = false;
    pendingUserText = jumpInput.value.trim();
    clearCountdown();
    jumpBtn.disabled = true;
    jumpInput.style.display = "none";
  }
};

// --- Validate experts ---
validateBtn.onclick = async () => {
  const expertA = expertAInput.value.trim();
  const expertB = expertBInput.value.trim();

  if (!expertA || !expertB) {
    setStatus("Both expertA and expertB are required.", "error");
    return;
  }

  setStatus("Validating experts...");
  try {
    const res = await fetch("/api/checkExperts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expertA, expertB })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Validation failed");

    setStatus("Experts validated. Ready to start conversation.");
    chatBtn.disabled = false;

  } catch (err) {
    console.error("Expert validation error:", err);
    setStatus("Server failed to validate experts.", "error");
    chatBtn.disabled = true;
  }
};

// --- AI fetch functions ---
async function callOpenAI(prompt) {
  setActiveModel("openai");
  try {
    const res = await fetch("/api/openaiChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "OpenAI API failed");
    return data.text || "";
  } catch (err) {
    console.error("OpenAI fetch error:", err);
    return `Error: Failed to get response from OpenAI.`;
  }
}

async function callClaude(prompt) {
  setActiveModel("claude");
  try {
    const res = await fetch("/api/claudeChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Claude API failed");
    return data.text || "";
  } catch (err) {
    console.error("Claude fetch error:", err);
    return `Error: Failed to get response from Claude.`;
  }
}

// --- Main conversation loop ---
chatBtn.onclick = async () => {
  const expertA = expertAInput.value.trim();
  const expertB = expertBInput.value.trim();
  const topic = topicInput.value.trim();
  const totalMessages = Number(turnsInput.value) || 10;
  const delaySeconds = Number(delayInput.value) || 5;

  if (!expertA || !expertB || !topic) {
    setStatus("Fill in experts and topic.", "error");
    return;
  }

  conversationRunning = true;
  chatBtn.disabled = true;
  validateBtn.disabled = true;
  setStatus("Conversation running...");
  transcriptDiv.innerHTML = "";
  setActiveModel(null);
  clearCountdown();
  jumpBtn.disabled = true;
  jumpInput.style.display = "none";

  const transcript = [];
  let lastMessageText = "";
  let currentModel = "openai"; // Start with Expert A

  for (let messageIndex = 0; messageIndex < totalMessages; messageIndex++) {
    // Delay with jump-in
    await new Promise(resolve => {
      startDelay(delaySeconds, userText => {
        pendingUserText = userText || pendingUserText;
        resolve();
      });
      const checkResume = setInterval(() => {
        if (!jumpMode && pendingUserText !== "") {
          clearInterval(checkResume);
          resolve();
        }
      }, 200);
    });

    clearCountdown();
    jumpBtn.disabled = true;
    const userAddition = pendingUserText || null;
    pendingUserText = "";

    const isOpenAI = currentModel === "openai";
    const expertName = isOpenAI ? expertA : expertB;
    const otherExpert = isOpenAI ? expertB : expertA;

    const prompt = `
You are impersonating ${expertName} on the topic "${topic}".
Rules:
- Only make claims supported by papers you authored or explicitly reference.
- Cite real papers when possible.
- Respond to the other expert (${otherExpert}).
${userAddition ? "\nUser added: " + userAddition : ""}
Previous message: "${lastMessageText || "(start)"}"
`;

    const text = isOpenAI ? await callOpenAI(prompt) : await callClaude(prompt);

    transcript.push({ speaker: expertName, model: isOpenAI ? "openai" : "claude", text });
    renderTranscript(transcript);
    lastMessageText = text;

    // Alternate model
    currentModel = isOpenAI ? "claude" : "openai";
  }

  conversationRunning = false;
  setActiveModel(null);
  clearCountdown();
  jumpBtn.disabled = true;
  jumpInput.style.display = "none";
  setStatus("Conversation finished.");
  chatBtn.disabled = false;
  validateBtn.disabled = false;
};