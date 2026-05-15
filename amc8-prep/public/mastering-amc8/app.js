(() => {
  const data = window.MAMC8_DATA;
  if (!data) return;

  const storageKey = "mamc8.completedChapters";
  const quizState = { correct: 0, total: 0, current: null };

  const els = {
    statDomains: document.getElementById("statDomains"),
    statChapters: document.getElementById("statChapters"),
    statSections: document.getElementById("statSections"),
    statFormulas: document.getElementById("statFormulas"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    domainTabs: document.getElementById("domainTabs"),
    chapterGrid: document.getElementById("chapterGrid"),
    chapterSearch: document.getElementById("chapterSearch"),
    formulaDomainFilter: document.getElementById("formulaDomainFilter"),
    formulaSearch: document.getElementById("formulaSearch"),
    formulaGrid: document.getElementById("formulaGrid"),
    sprintCard: document.getElementById("sprintCard"),
    newSprintCard: document.getElementById("newSprintCard"),
    quizBox: document.getElementById("quizBox"),
    nextQuiz: document.getElementById("nextQuiz"),
    quizScore: document.getElementById("quizScore"),
    jumpToMap: document.getElementById("jumpToMap"),
    jumpToQuiz: document.getElementById("jumpToQuiz"),
    mapSection: document.getElementById("mapSection"),
    sprintSection: document.getElementById("sprintSection")
  };

  const completed = new Set(loadCompleted());
  let activeDomain = "All";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function loadCompleted() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveCompleted() {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
  }

  function updateStats() {
    els.statDomains.textContent = data.meta.domains;
    els.statChapters.textContent = data.meta.chapters;
    els.statSections.textContent = data.meta.sections;
    els.statFormulas.textContent = data.meta.formulas;

    const done = completed.size;
    const total = data.meta.chapters;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    els.progressText.textContent = `${done} / ${total} chapters completed`;
    els.progressBar.style.width = `${pct}%`;
  }

  function renderDomainTabs() {
    const names = ["All", ...data.domains.map((d) => d.name)];
    els.domainTabs.innerHTML = names.map((name) => `
      <button
        class="tag-btn ${name === activeDomain ? "active" : ""}"
        data-domain="${escapeHtml(name)}"
        type="button"
      >
        ${escapeHtml(name)}
      </button>
    `).join("");

    els.domainTabs.querySelectorAll("[data-domain]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeDomain = btn.dataset.domain;
        renderDomainTabs();
        renderChapters();
      });
    });
  }

  function chapterMatchesSearch(chapter, search) {
    if (!search) return true;
    const haystack = [
      chapter.title,
      chapter.domain,
      chapter.focus,
      chapter.sections.join(" ")
    ].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
  }

  function renderChapters() {
    const search = els.chapterSearch.value.trim();
    const chapters = data.chapters.filter((chapter) => {
      const domainPass = activeDomain === "All" || chapter.domain === activeDomain;
      return domainPass && chapterMatchesSearch(chapter, search);
    });

    if (!chapters.length) {
      els.chapterGrid.innerHTML = `<div class="chapter-card"><h3>No matching chapters</h3><p class="chapter-focus">Try another keyword or domain.</p></div>`;
      return;
    }

    els.chapterGrid.innerHTML = chapters.map((chapter) => {
      const checked = completed.has(chapter.number) ? "checked" : "";
      const linkedFormulas = chapter.formulas
        .map((id) => data.formulas.find((f) => f.id === id))
        .filter(Boolean)
        .slice(0, 3);

      return `
        <article class="chapter-card">
          <div class="chapter-top">
            <span class="chapter-number">${chapter.number}</span>
            <span class="page-pill">p. ${chapter.page}</span>
          </div>
          <div>
            <div class="chapter-meta">
              <span class="domain-pill">${escapeHtml(chapter.domain)}</span>
            </div>
            <h3>${escapeHtml(chapter.title)}</h3>
            <p class="chapter-focus">${escapeHtml(chapter.focus)}</p>
          </div>
          <div>
            <strong>Key sections</strong>
            <ul class="section-list">
              ${chapter.sections.map((section) => `<li>${escapeHtml(section)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <strong>Formula anchors</strong>
            <ul class="formula-list">
              ${linkedFormulas.length
                ? linkedFormulas.map((formula) => `<li>${escapeHtml(formula.title)}</li>`).join("")
                : "<li>Strategy-focused chapter</li>"}
            </ul>
          </div>
          <div class="chapter-footer">
            <label class="complete-toggle">
              <input type="checkbox" data-complete="${chapter.number}" ${checked}/>
              Mark complete
            </label>
            <span class="page-pill">${chapter.sections.length} sections</span>
          </div>
        </article>
      `;
    }).join("");

    els.chapterGrid.querySelectorAll("[data-complete]").forEach((box) => {
      box.addEventListener("change", () => {
        const chapterNumber = Number(box.dataset.complete);
        if (box.checked) completed.add(chapterNumber);
        else completed.delete(chapterNumber);
        saveCompleted();
        updateStats();
      });
    });
  }

  function fillFormulaDomains() {
    const options = ["all", ...data.domains.map((d) => d.name)];
    els.formulaDomainFilter.innerHTML = options.map((domain) => `
      <option value="${escapeHtml(domain)}">${domain === "all" ? "All Domains" : escapeHtml(domain)}</option>
    `).join("");
  }

  function formulaMatchesSearch(formula, search) {
    if (!search) return true;
    const haystack = [
      formula.title,
      formula.prompt,
      formula.formula,
      formula.note,
      formula.domain
    ].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
  }

  function renderFormulas() {
    const selectedDomain = els.formulaDomainFilter.value;
    const search = els.formulaSearch.value.trim();

    const formulas = data.formulas.filter((formula) => {
      const domainPass = selectedDomain === "all" || formula.domain === selectedDomain;
      return domainPass && formulaMatchesSearch(formula, search);
    });

    if (!formulas.length) {
      els.formulaGrid.innerHTML = `<div class="formula-card"><h3>No matching formulas</h3><p class="formula-note">Try changing the filter or keyword.</p></div>`;
      return;
    }

    els.formulaGrid.innerHTML = formulas.map((formula) => `
      <article class="formula-card">
        <div class="formula-domain">${escapeHtml(formula.domain)} · Chapter ${formula.chapter}</div>
        <h3 class="formula-title">${escapeHtml(formula.title)}</h3>
        <p class="formula-prompt">${escapeHtml(formula.prompt)}</p>
        <div class="math-line">${escapeHtml(formula.formula)}</div>
        <p class="formula-note">${escapeHtml(formula.note)}</p>
      </article>
    `).join("");
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function renderSprintCard() {
    const formula = randomItem(data.formulas);
    els.sprintCard.innerHTML = `
      <div>
        <div class="formula-domain">${escapeHtml(formula.domain)} · Chapter ${formula.chapter}</div>
        <h3>${escapeHtml(formula.title)}</h3>
        <p>${escapeHtml(formula.prompt)}</p>
      </div>
      <button class="reveal-btn" type="button">Reveal formula</button>
      <div class="hidden-answer">
        <div class="math-line">${escapeHtml(formula.formula)}</div>
        <p class="formula-note">${escapeHtml(formula.note)}</p>
      </div>
    `;
    const button = els.sprintCard.querySelector(".reveal-btn");
    const answer = els.sprintCard.querySelector(".hidden-answer");
    button.addEventListener("click", () => {
      answer.classList.remove("hidden-answer");
      button.textContent = "Revealed";
      button.disabled = true;
    });
  }

  function makeQuizOptions(correctFormula) {
    const distractors = data.formulas
      .filter((formula) => formula.id !== correctFormula.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...distractors, correctFormula].sort(() => Math.random() - 0.5);
  }

  function renderQuiz() {
    const correct = randomItem(data.formulas);
    quizState.current = correct;
    const options = makeQuizOptions(correct);
    els.quizBox.innerHTML = `
      <div class="quiz-question">${escapeHtml(correct.prompt)}</div>
      <div class="option-list">
        ${options.map((option) => `
          <button class="option-btn" type="button" data-option="${escapeHtml(option.id)}">
            ${escapeHtml(option.formula)}
          </button>
        `).join("")}
      </div>
      <p class="quiz-feedback"></p>
    `;

    els.quizBox.querySelectorAll("[data-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.option;
        const isCorrect = selected === correct.id;
        quizState.total += 1;
        if (isCorrect) quizState.correct += 1;

        els.quizBox.querySelectorAll("[data-option]").forEach((choice) => {
          choice.disabled = true;
          if (choice.dataset.option === correct.id) choice.classList.add("correct");
          if (choice.dataset.option === selected && !isCorrect) choice.classList.add("incorrect");
        });

        const feedback = els.quizBox.querySelector(".quiz-feedback");
        feedback.textContent = isCorrect
          ? `Correct — ${correct.title}.`
          : `Not quite — the best match is ${correct.title}.`;
        els.quizScore.textContent = `Score: ${quizState.correct} / ${quizState.total}`;
      });
    });
  }

  els.chapterSearch.addEventListener("input", renderChapters);
  els.formulaDomainFilter.addEventListener("change", renderFormulas);
  els.formulaSearch.addEventListener("input", renderFormulas);
  els.newSprintCard.addEventListener("click", renderSprintCard);
  els.nextQuiz.addEventListener("click", renderQuiz);

  els.jumpToMap.addEventListener("click", () => {
    els.mapSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.jumpToQuiz.addEventListener("click", () => {
    els.sprintSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  fillFormulaDomains();
  renderDomainTabs();
  renderChapters();
  renderFormulas();
  renderSprintCard();
  renderQuiz();
  updateStats();
})();
