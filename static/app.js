
let adminKey = "";

const $ = (id) => document.getElementById(id);

async function api(url, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "X-Admin-Key": adminKey,
      "Content-Type": "application/json"
    }
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json();
}

$("loadBtn").addEventListener("click", async () => {
  adminKey = $("adminKey").value.trim();

  if (!adminKey) {
    $("status").textContent = "Enter Admin Key first.";
    return;
  }

  try {
    const data = await api("/api/config");

    $("auto_reply_enabled").checked = data.auto_reply_enabled;
    $("welcome_enabled").checked = data.welcome_enabled;
    $("away_enabled").checked = data.away_enabled;

    $("welcome_text").value = data.welcome_text;
    $("auto_reply_text").value = data.auto_reply_text;
    $("away_text").value = data.away_text;

    $("dashboard").classList.remove("hidden");
    $("status").textContent = "Connected successfully!";

    showLogs(data.logs || []);
  } catch (error) {
    adminKey = "";
    $("status").textContent =
      "Login failed. Check your Admin Key.";
  }
});

$("saveBtn").addEventListener("click", async () => {
  const settings = {
    auto_reply_enabled: $("auto_reply_enabled").checked,
    welcome_enabled: $("welcome_enabled").checked,
    away_enabled: $("away_enabled").checked,
    welcome_text: $("welcome_text").value,
    auto_reply_text: $("auto_reply_text").value,
    away_text: $("away_text").value
  };

  try {
    await api("/api/config", "POST", settings);
    $("saveStatus").textContent = "Settings saved successfully!";
  } catch (error) {
    $("saveStatus").textContent = "Could not save settings.";
  }
});

function showLogs(logs) {
  const container = $("logs");
  container.replaceChildren();

  if (!logs.length) {
    container.textContent = "No activity yet.";
    return;
  }

  logs.forEach((item) => {
    const row = document.createElement("p");
    row.textContent = item.time + " — " + item.event;
    container.appendChild(row);
  });
}
