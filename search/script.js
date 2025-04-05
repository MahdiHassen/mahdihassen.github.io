// Global variables.
let customResults = [];
let wikiResults = [];
let combinedResults = [];
let currentPage = 1;
const resultsPerPage = 10;
const accentClasses = ["me", "projects", "blog", "ep"];
let allResources = []; // For suggestions
let suggestionIndex = -1; // For keyboard navigation

// Load resources.txt once for suggestions.
fetch("resources.txt")
  .then(response => response.json())
  .then(data => {
    allResources = data;
  })
  .catch(err => {
    console.error("Error loading resources.txt for suggestions:", err);
  });

// Advanced options toggle.
const toggleAdvancedBtn = document.getElementById("toggleAdvanced");
const advancedMenu = document.getElementById("advancedMenu");
toggleAdvancedBtn.addEventListener("click", () => {
  if (advancedMenu.style.display === "none" || advancedMenu.style.display === "") {
    advancedMenu.style.display = "block";
    toggleAdvancedBtn.textContent = "Hide Options";
  } else {
    advancedMenu.style.display = "none";
    toggleAdvancedBtn.textContent = "Options";
  }
});

// Update fuzzy threshold display.
const fuzzyThresholdInput = document.getElementById("fuzzyThreshold");
const thresholdValueSpan = document.getElementById("thresholdValue");
fuzzyThresholdInput.addEventListener("input", () => {
  thresholdValueSpan.textContent = fuzzyThresholdInput.value;
});

// Dark Mode Toggle (Advanced Option).
const enableDarkModeCheckbox = document.getElementById("enableDarkMode");
// Set default dark mode based on user's device preference.
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add("dark-mode");
  enableDarkModeCheckbox.checked = true;
} else {
  document.body.classList.remove("dark-mode");
  enableDarkModeCheckbox.checked = false;
}
enableDarkModeCheckbox.addEventListener("change", () => {
  if (enableDarkModeCheckbox.checked) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
});

// Levenshtein distance algorithm.
function levenshteinDistance(a, b) {
  const matrix = [];
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Compute normalized fuzzy similarity.
function fuzzySimilarity(s, query) {
  s = s.toLowerCase();
  query = query.toLowerCase();
  const maxLen = Math.max(s.length, query.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(s, query);
  return (maxLen - dist) / maxLen;
}

// Compute weighted fuzzy score.
// Weights: title (0.5), keywords (0.3), description (0.2)
function weightedFuzzyScore(resource, query) {
  const scoreTitle = fuzzySimilarity(resource.title, query);
  const scoreKeywords = fuzzySimilarity(resource.keywords || "", query);
  const scoreDescription = fuzzySimilarity(resource.description, query);
  const weightTitle = 0.5, weightKeywords = 0.3, weightDescription = 0.2;
  return (weightTitle * scoreTitle) + (weightKeywords * scoreKeywords) + (weightDescription * scoreDescription);
}

// Fetch custom resources with weighted fuzzy matching.
function fetchCustom(query) {
  return fetch("resources.txt")
    .then(response => response.json())
    .then(data => {
      let filtered = data.map(resource => {
        resource.fuzzyScore = weightedFuzzyScore(resource, query);
        return resource;
      }).filter(resource => resource.fuzzyScore >= parseFloat(fuzzyThresholdInput.value));
      filtered.sort((a, b) => b.fuzzyScore - a.fuzzyScore);
      filtered.forEach(item => {
        item.source = "custom";
        item.accent = accentClasses[Math.floor(Math.random() * accentClasses.length)];
      });
      return filtered;
    });
}

// Fetch Wikipedia results.
function fetchWiki(query) {
  const endpoint = "https://en.wikipedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    format: "json",
    origin: "*",
    srsearch: query,
    srlimit: 20
  });
  const url = endpoint + "?" + params.toString();
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.query && data.query.search && data.query.search.length > 0) {
        return data.query.search.map(item => ({
          title: item.title,
          url: `https://en.wikipedia.org/?curid=${item.pageid}`,
          description: item.snippet.replace(/<\/?[^>]+(>|$)/g, "") + "...",
          source: "wiki"
        }));
      }
      return [];
    });
}

// Display a message.
function displayMessage(message) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `<div class="message">${message}</div>`;
}

// Display pagination.
function displayPagination() {
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "pagination";
  const limitedResults = combinedResults.slice(0, 5 * resultsPerPage);
  const totalPages = Math.ceil(limitedResults.length / resultsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) {
      btn.classList.add("active");
      btn.disabled = true;
    }
    btn.addEventListener("click", () => {
      currentPage = i;
      displayPage(currentPage);
    });
    paginationDiv.appendChild(btn);
  }
  return paginationDiv;
}

// Display current page.
function displayPage(page) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  const limitedResults = combinedResults.slice(0, 5 * resultsPerPage);
  const start = (page - 1) * resultsPerPage;
  const end = page * resultsPerPage;
  const pageResults = limitedResults.slice(start, end);
  pageResults.forEach(result => {
    const resultDiv = document.createElement("div");
    resultDiv.className = "result";
    const titleLink = document.createElement("a");
    titleLink.href = result.url;
    titleLink.target = "_blank";
    titleLink.textContent = result.title;
    titleLink.className = "title";
    if (result.source === "custom") {
      titleLink.classList.add(result.accent);
    }
    resultDiv.appendChild(titleLink);
    const descPara = document.createElement("p");
    descPara.textContent = result.description;
    resultDiv.appendChild(descPara);
    resultsDiv.appendChild(resultDiv);
  });
  const pagination = displayPagination();
  resultsDiv.appendChild(pagination);
}

// Perform search.
function performSearch(query) {
  if (!query.trim()) {
    displayMessage("Please enter a search query.");
    return;
  }
  currentPage = 1;
  displayMessage("Searching custom resources...");
  fetchCustom(query).then(data => {
    customResults = data;
    combinedResults = customResults.slice();
    displayPage(currentPage);
  });
  // Check if Wikipedia results should be included.
  const includeWiki = document.getElementById("includeWiki").checked;
  if (includeWiki) {
    fetchWiki(query).then(data => {
      wikiResults = data;
      combinedResults = customResults.concat(wikiResults);
      displayPage(currentPage);
    }).catch(error => {
      console.error("Wiki search error: " + error.message);
    });
  }
}

// Suggestions functionality.
const searchInput = document.getElementById("searchInput");
const suggestionsDiv = document.getElementById("suggestions");
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  suggestionIndex = -1; // Reset suggestion index.
  if (query.length === 0) {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.style.display = "none";
    return;
  }
  const queryLower = query.toLowerCase();
  let suggestions = allResources.filter(resource => resource.title.toLowerCase().includes(queryLower));
  suggestions.sort((a, b) => fuzzySimilarity(b.title, query) - fuzzySimilarity(a.title, query));
  suggestions = suggestions.slice(0, 5);
  if (suggestions.length > 0) {
    let html = "<ul>";
    suggestions.forEach((suggestion, index) => {
      html += `<li data-index="${index}" data-title="${suggestion.title}">${suggestion.title}</li>`;
    });
    html += "</ul>";
    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = "block";
  } else {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.style.display = "none";
  }
});

// Keyboard navigation for suggestions.
searchInput.addEventListener("keydown", (e) => {
  const suggestionItems = suggestionsDiv.querySelectorAll("li");
  if (suggestionItems.length === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    suggestionIndex = (suggestionIndex + 1) % suggestionItems.length;
    updateSuggestionHighlight(suggestionItems);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    suggestionIndex = (suggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
    updateSuggestionHighlight(suggestionItems);
  } else if (e.key === "Enter") {
    if (suggestionIndex >= 0 && suggestionIndex < suggestionItems.length) {
      e.preventDefault();
      const selectedTitle = suggestionItems[suggestionIndex].getAttribute("data-title");
      searchInput.value = selectedTitle;
      suggestionsDiv.innerHTML = "";
      suggestionsDiv.style.display = "none";
      performSearch(selectedTitle);
    }
  }
});

// Helper to update suggestion highlight.
function updateSuggestionHighlight(items) {
  items.forEach((item, idx) => {
    if (idx === suggestionIndex) {
      item.classList.add("active-suggestion");
    } else {
      item.classList.remove("active-suggestion");
    }
  });
}

// Click on a suggestion.
suggestionsDiv.addEventListener("click", (e) => {
  if (e.target && e.target.nodeName === "LI") {
    const title = e.target.getAttribute("data-title");
    searchInput.value = title;
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.style.display = "none";
    performSearch(title);
  }
});

// Hide suggestions when clicking outside.
document.addEventListener("click", (e) => {
  if (!e.target.closest("#suggestions") && !e.target.closest(".search-box")) {
    suggestionsDiv.innerHTML = "";
    suggestionsDiv.style.display = "none";
  }
});

// Search button.
document.getElementById("searchBtn").addEventListener("click", () => {
  performSearch(searchInput.value);
});
