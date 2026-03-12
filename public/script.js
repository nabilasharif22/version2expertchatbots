// script.js
// Orchestrates the expert conversation with error handling

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

// --- Utility Functions ---
function setStatus(msg, type = "") {
  statusDiv.textContent = msg;
  statusDiv.style.color = type === "error" ? "red" : "green";
}

function renderTranscript(messages) {
  transcriptDiv.innerHTML = "";
  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `message ${m.model}`;
    div.innerHTML = `<strong>${m.speaker} (${m.model})</strong><br>${m.text}`;
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
      countdownRemaining--;
      countdownDiv.textContent = `Next in: ${countdownRemaining}s`;
      if (countdownRemaining <= 0) {
        clearCountdown();
        jumpBtn.disabled = true;
        onDone(pendingUserText || null);
      }
    }
  }, 1000);
}

// --- Jump-in / Resume button ---
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

// --- Validate Experts ---
validateBtn.onclick = async () => {
  const expertA = expertAInput.value.trim();
  const expertB = expertBInput.value.trim();

  if (!expertA || !expertB) {
    setStatus("Both experts are required.", "error");
    chatBtn.disabled = true;
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

    if (!res.ok) {
      setStatus(data.error || "Validation failed.", "error");
      chatBtn.disabled = true;
      return;
    }

    setStatus(`Experts validated. Papers: ${expertA} (${data.counts[expertA]}), ${expertB} (${data.counts[expertB]})`);
    chatBtn.disabled = false;

  } catch (err) {
    console.error("Validation failed:", err);
    setStatus("Failed to validate experts.", "error");
    chatBtn.disabled = true;
  }
};

// --- Call OpenAI ---
async function callOpenAI(prompt) {
  setActiveModel("openai");
  try {
    const res = await fetch("/api/openaiChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) {
      setStatus(`OpenAI error: ${data.error}`, "error");
      return "";
    }
    return data.text || "";
  } catch (err) {
    console.error("OpenAI fetch failed:", err);
    setStatus("Failed to get response from OpenAI.", "error");
    return "";
  }
}

// --- Call Claude ---
async function callClaude(prompt) {
  setActiveModel("claude");
  try {
    const res = await fetch("/api/claudeChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (data.error) {
      setStatus(`Claude error: ${data.error}`, "error");
      return "";
    }
    return data.text || "";
  } catch (err) {
    console.error("Claude fetch failed:", err);
    setStatus("Failed to get response from Claude.", "error");
    return "";
  }
}

// --- Build prompt ---
function buildPrompt(expertName, role, topic, lastText, userAddition, otherExpertName) {
  const base = `
You are impersonating: ${expertName}.
Topic: "${topic}".

Rules:
- Only claims supported by real papers authored or referenced by you.
- Cite every factual statement.
- If no paper exists, say so.
- Respond to ${otherExpertName}'s last message.

Other's last message:
"${lastText || "(starting discussion)"}"
`;

  return role === "initial"
    ? `${base}\nBegin discussion.${userAddition ? `\nUser adds: "${userAddition}"` : ""}`
    : `${base}\nRespond now.${userAddition ? `\nUser adds: "${userAddition}"` : ""}`;
}

// --- Main conversation ---
chatBtn.onclick = async () => {
  const expertA = expertAInput.value.trim();
  const expertB = expertBInput.value.trim();
  const topic = topicInput.value.trim();
  const totalMessages = Number(turnsInput.value) || 10;
  const delaySeconds = Number(delayInput.value) || 5;

  if (!expertA || !expertB || !topic) {
    setStatus("Please fill in experts and topic.", "error");
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
  let currentModel = "openai";
  let messageIndex = 0;

  // First message
  const firstPrompt = buildPrompt(expertA, "initial", topic, "", null, expertB);
  const firstText = await callOpenAI(firstPrompt);
  transcript.push({ speaker: expertA, model: "openai", text: firstText });
  lastMessageText = firstText;
  messageIndex++;
  renderTranscript(transcript);

  // Conversation loop
  while (conversationRunning && messageIndex < totalMessages) {
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
    const otherExpertName = isOpenAI ? expertB : expertA;

    const prompt = buildPrompt(expertName, "reply", topic, lastMessageText, userAddition, otherExpertName);
    const text = isOpenAI ? await callOpenAI(prompt) : await callClaude(prompt);

    transcript.push({ speaker: expertName, model: isOpenAI ? "openai" : "claude", text });
    lastMessageText = text;
    messageIndex++;
    renderTranscript(transcript);

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