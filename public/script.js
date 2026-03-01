// script.js
// Orchestrates the conversation on the front end
// Integrated with Vercel serverless APIs

const API_BASE = "https://version2expertchatbots.vercel.app/api"; // <-- REPLACE with your Vercel URL

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

// Utility: set status text and color
function setStatus(msg, type = "") {
  statusDiv.textContent = msg;
  statusDiv.style.color = type === "error" ? "red" : "green";
}

// Utility: render transcript messages
function renderTranscript(messages) {
  transcriptDiv.innerHTML = "";
  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `message ${m.model}`;
    div.innerHTML = `<strong>${m.speaker} (${m.model})</strong><br>${m.text}`;
    transcriptDiv.appendChild(div);
  });
}

// Utility: control pulsing dots
function setActiveModel(model) {
  dotsOpenAI.classList.remove("active");
  dotsClaude.classList.remove("active");
  if (model === "openai") dotsOpenAI.classList.add("active");
  if (model === "claude") dotsClaude.classList.add("active");
}

// Utility: clear countdown
function clearCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
  countdownDiv.textContent = "";
}

// Start a countdown with jump-in enabled
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

// Jump-in / Resume button behavior
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

// Validate experts via Semantic Scholar
validateBtn.onclick = async () => {
  const expertA = expertAInput.value.trim();
  const expertB = expertBInput.value.trim();

  if (!expertA || !expertB) {
    setStatus("Please enter both experts.", "error");
    return;
  }

  setStatus("Validating experts...");
  try {
    const res = await fetch(`${API_BASE}/checkExperts`, {
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

    setStatus("Experts validated. You can start the conversation.");
    chatBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus("Error connecting to backend.", "error");
    chatBtn.disabled = true;
  }
};

// Main conversation runner
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

  function buildPrompt(expertName, role, topic, lastText, userAddition, otherExpertName) {
    const baseInstruction = `
You are impersonating the expert: ${expertName}.
Topic: "${topic}".

Rules:
- You may only make claims supported by papers you have authored or papers you explicitly reference.
- Every factual statement must include a citation to a real paper.
- If you cannot support a claim with a paper, explicitly say so.
- Acknowledge the other expert, ${otherExpertName}, by name and respond to their last message.
- Maintain a concise, scholarly tone.

The other expert's last message was:
"${lastText || "(no previous message; you are starting the discussion)"}"
`;

    const userPart = userAddition
      ? `\nThe user adds the following question/comment that you must address explicitly:\n"${userAddition}"\n`
      : "";

    if (role === "initial") {
      return `${baseInstruction}
Begin the discussion by:
- Stating your perspective on the topic.
- Acknowledging ${otherExpertName}.
- Asking ${otherExpertName} for their input.
${userPart}`;
    }

    return `${baseInstruction}
Respond now, taking into account both the other expert's message and your own expertise.
${userPart}`;
  }

  async function callOpenAI(prompt) {
    setActiveModel("openai");
    const res = await fetch(`${API_BASE}/openaiChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return data.text || "";
  }

  async function callClaude(prompt) {
    setActiveModel("claude");
    const res = await fetch(`${API_BASE}/claudeChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return data.text || "";
  }

  // First message: OpenAI initial response
  {
    const prompt = buildPrompt(expertA, "initial", topic, "", null, expertB);
    const text = await callOpenAI(prompt);
    transcript.push({ speaker: expertA, model: "openai", text });
    lastMessageText = text;
    messageIndex++;
    renderTranscript(transcript);
  }

  // Loop for remaining messages
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

    const prompt = buildPrompt(
      expertName,
      "reply",
      topic,
      lastMessageText,
      userAddition,
      otherExpertName
    );

    const text = isOpenAI ? await callOpenAI(prompt) : await callClaude(prompt);

    transcript.push({
      speaker: expertName,
      model: isOpenAI ? "openai" : "claude",
      text
    });
    lastMessageText = text;
    messageIndex++;
    renderTranscript(transcript);

    currentModel = isOpenAI ? "claude" : "openai";
  }

  // End of conversation
  conversationRunning = false;
  setActiveModel(null);
  clearCountdown();
  jumpBtn.disabled = true;
  jumpInput.style.display = "none";
  setStatus("Conversation finished.");
  chatBtn.disabled = false;
  validateBtn.disabled = false;
};