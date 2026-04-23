// Initialize Icons
lucide.createIcons();

// DOM Elements
const fileInput = document.getElementById("file-input");
const uploadZone = document.getElementById("upload-zone");
const uploadPrompt = document.getElementById("upload-prompt");
const previewContainer = document.getElementById("preview-container");
const imagePreview = document.getElementById("image-preview");
const fileNameDisplay = document.getElementById("file-name");
const removeBtn = document.getElementById("remove-btn");
const verifyBtn = document.getElementById("verify-btn");
const loadingState = document.getElementById("loading-state");
const resultSection = document.getElementById("result-section");

// Result Elements
const resultIconContainer = document.getElementById("result-icon-container");
const resultIcon = document.getElementById("result-icon");
const resultTitle = document.getElementById("result-title");
const resultDesc = document.getElementById("result-desc");
const confidenceBadge = document.getElementById("confidence-badge");

let currentFile = null;

// Handle Drag & Drop styling
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, () => {
    uploadZone.classList.add("border-brand-500", "bg-brand-50");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadZone.addEventListener(eventName, () => {
    uploadZone.classList.remove("border-brand-500", "bg-brand-50");
  });
});

// Handle file selection
fileInput.addEventListener("change", function (e) {
  handleFiles(this.files);
});

uploadZone.addEventListener("drop", function (e) {
  let dt = e.dataTransfer;
  let files = dt.files;
  fileInput.files = files; // Sync input
  handleFiles(files);
});

function handleFiles(files) {
  if (files.length === 0) return;

  const file = files[0];
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file.");
    return;
  }

  currentFile = file;
  fileNameDisplay.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    imagePreview.src = e.target.result;
    showPreview(true);
  };
  reader.readAsDataURL(file);
}

function showPreview(show) {
  if (show) {
    uploadPrompt.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    verifyBtn.disabled = false;
    resultSection.classList.add("hidden");
  } else {
    uploadPrompt.classList.remove("hidden");
    previewContainer.classList.add("hidden");
    verifyBtn.disabled = true;
    fileInput.value = "";
    currentFile = null;
    resultSection.classList.add("hidden");
  }
}

// Remove image
removeBtn.addEventListener("click", (e) => {
  e.preventDefault(); // Stop clicking input
  e.stopPropagation(); // Stop bubbling
  showPreview(false);
});

// Verification Logic connecting to the Go Backend
verifyBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  // UI State change for loading
  verifyBtn.disabled = true;
  verifyBtn.innerHTML =
    '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Processing...';
  lucide.createIcons();

  resultSection.classList.add("hidden");
  loadingState.classList.remove("hidden");
  uploadZone.classList.add("opacity-50", "pointer-events-none");

  // Prepare the file for sending
  const formData = new FormData();
  formData.append("file", currentFile);

  try {
    // Make sure your Go backend is running on port 8080
    const response = await fetch("http://localhost:8080/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Analysis failed");

    const data = await response.json();
    processResult(data);
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to analyze the image. Is your Go server running?");

    // Reset UI state on error
    verifyBtn.innerHTML =
      '<i data-lucide="scan" class="w-5 h-5"></i><span>Verify Image Content</span>';
    verifyBtn.disabled = false;
    lucide.createIcons();
    loadingState.classList.add("hidden");
    uploadZone.classList.remove("opacity-50", "pointer-events-none");
  }
});

function processResult(data) {
  // Restore UI
  verifyBtn.innerHTML =
    '<i data-lucide="scan" class="w-5 h-5"></i><span>Verify Image Content</span>';
  verifyBtn.disabled = false;
  loadingState.classList.add("hidden");
  uploadZone.classList.remove("opacity-50", "pointer-events-none");
  resultSection.classList.remove("hidden");

  // Map the data from your Go AIResponse struct
  const status = data.status; // "Illegal 🚫", "Toxic ⚠️", or "Safe ✅"
  const confidence = Math.round(data.confidence * 100);

  // Reset classes
  resultSection.className = "mt-6 p-5 rounded-xl border fade-in";
  resultIconContainer.className = "p-3 rounded-full flex-shrink-0";

  if (status === "Safe ✅") {
    // Safe Styling
    resultSection.classList.add("bg-brand-50", "border-brand-200");
    resultIconContainer.classList.add("bg-brand-100", "text-brand-600");
    resultIcon.setAttribute("data-lucide", "check-circle");

    resultTitle.textContent = data.plant;
    resultTitle.className = "text-2xl font-bold text-brand-700 capitalize";

    confidenceBadge.textContent = `${confidence}% Confidence`;
    confidenceBadge.className =
      "text-xs px-2 py-1 rounded-md font-semibold bg-white/50 border text-brand-700 border-brand-200";

    resultDesc.textContent = "This plant has passed all checks and is safe.";
    resultDesc.className = "text-sm text-brand-700/80";
  } else {
    // Illegal / Toxic Styling
    resultSection.classList.add("bg-red-50", "border-red-200");
    resultIconContainer.classList.add("bg-red-100", "text-red-600");
    resultIcon.setAttribute("data-lucide", "alert-triangle");

    resultTitle.textContent = `${data.plant} (${status})`;
    resultTitle.className = "text-2xl font-bold text-red-600 capitalize";

    confidenceBadge.textContent = `${confidence}% Confidence`;
    confidenceBadge.className =
      "text-xs px-2 py-1 rounded-md font-semibold bg-white/50 border text-red-700 border-red-200";

    resultDesc.textContent =
      "Warning: This plant violates safety or content policies.";
    resultDesc.className = "text-sm text-red-600/80";
  }

  lucide.createIcons();
}
