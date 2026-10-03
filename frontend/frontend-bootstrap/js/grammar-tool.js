/**
 * The illustrative Burmese spell & grammar review. Same sample
 * document, same rule list, same apply / apply-all / drop-a-file
 * behaviour as the React GrammarToolSection.
 */
import confetti from "canvas-confetti";
import { onOverlayOpen } from "./overlay.js";
const SAMPLE_GRAMMAR_DOC = {
  rawText: `ယနေ႕ခေတ္ နည်းပညာ တို႕တက်လာမူကြောင့် ကျွန်တော်တို အလုပ်လုပ်ရာတွင် အဆင်ပြေခြင်များစွာ ရှိလာပါတယ္။ ရုံးစာရွက်စာတမ်းမျာကို စနစ်တကျ မသိမ်းစည်းပါက အချက်လက် ဆုံးရှုံးနိုင်ပါသည်။`,
  issues: [
    {
      id: "iss-1",
      original: "တို႕တက်လာမူ",
      suggestion: "တိုးတက်လာမှု",
      reason: "Zawgyi font artifact + Grammatical suffix 'မှု' vs 'မူ'",
      ruleCategory: "Spelling",
      index: 18,
    },
    {
      id: "iss-2",
      original: "ကျွန်တော်တို",
      suggestion: "ကျွန်တော်တို့",
      reason: "Missing tone marker (အောက်မြစ် 'တို့')",
      ruleCategory: "Spelling",
      index: 34,
    },
    {
      id: "iss-3",
      original: "အဆင်ပြေခြင်များစွာ",
      suggestion: "အဆင်ပြေခြင်းများစွာ",
      reason: "Missing dot below/consonant sign 'ခြင်း'",
      ruleCategory: "Spelling",
      index: 52,
    },
    {
      id: "iss-4",
      original: "စာရွက်စာတမ်းမျာကို",
      suggestion: "စာရွက်စာတမ်းများကို",
      reason: "Missing final killer/diacritic 'များ'",
      ruleCategory: "Grammar",
      index: 82,
    },
    {
      id: "iss-5",
      original: "မသိမ်းစည်းပါက",
      suggestion: "မသိမ်းဆည်းပါက",
      reason: "Correct spelling in Myanmar Orthography is 'သိမ်းဆည်း'",
      ruleCategory: "Spelling",
      index: 104,
    },
    {
      id: "iss-6",
      original: "အချက်လက်",
      suggestion: "အချက်အလက်",
      reason: "Compound noun completeness: 'အချက်အလက်'",
      ruleCategory: "Grammar",
      index: 119,
    },
  ],
};
const DROP_ISSUES = [
  {
    id: "drop-iss-1",
    original: "မူ",
    suggestion: "မှု",
    reason: "နာမ်နောက်ဆက် 'မှု' သတ်ပုံမှန်ကန်ရေး",
    ruleCategory: "Spelling",
    index: 10,
  },
  {
    id: "drop-iss-2",
    original: "တို",
    suggestion: "တို့",
    reason: "အောက်မြစ်လိုအပ်ပါသည် (တို့)",
    ruleCategory: "Spelling",
    index: 25,
  },
];
const CHECK_CIRCLE =
  '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-circle-check"></use></svg>';
const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function initGrammarTool() {
  const editor = document.getElementById("grEditor");
  const drop = document.getElementById("grDrop");
  const list = document.getElementById("grIssues");
  const count = document.getElementById("grCount");
  const issueCount = document.getElementById("grIssueCount");
  const fixAll = document.getElementById("grFixAll");
  const status = document.getElementById("grammarStatus");
  const exportLink = document.getElementById("grExport");
  const toast = document.getElementById("grToast");
  const toastText = document.getElementById("grToastText");
  let issues = SAMPLE_GRAMMAR_DOC.issues.slice();
  let toastTimer = 0;
  function showToast(message) {
    toastText.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2500);
  }
  function renderEditorState() {
    count.textContent = `${editor.value.length} Characters`;
    exportLink.href = `data:text/plain;charset=utf-8,${encodeURIComponent(editor.value)}`;
  }
  function renderIssues() {
    issueCount.textContent = String(issues.length);
    fixAll.style.display = issues.length > 0 ? "" : "none";
    status.lastChild.textContent = issues.length
      ? `${issues.length} sample suggestion${issues.length > 1 ? "s" : ""}`
      : "Sample reviewed";
    if (issues.length === 0) {
      list.innerHTML = `
        <div class="gr-empty">
          <div class="gr-empty-ico">${CHECK_CIRCLE}</div>
          <h4>No sample suggestions remaining</h4>
          <p>No remaining matches were found in this illustrative frontend rule set.</p>
          <button type="button" data-reload>Reload Sample To Test</button>
        </div>`;
      list.querySelector("[data-reload]").addEventListener("click", loadSample);
      return;
    }
    list.innerHTML = issues
      .map(
        (issue) => `
        <div class="gr-issue">
          <div class="gr-issue-top">
            <span class="gr-issue-cat">${issue.ruleCategory}</span>
            <button type="button" class="gr-issue-fix" data-fix="${issue.id}">Apply Fix</button>
          </div>
          <div class="gr-issue-diff">
            <span class="gr-issue-old">${escapeHtml(issue.original)}</span>
            <span class="gr-issue-arrow">→</span>
            <span class="gr-issue-new">${escapeHtml(issue.suggestion)}</span>
          </div>
          <p class="gr-issue-why">${escapeHtml(issue.reason)}</p>
        </div>`
      )
      .join("");
    list.querySelectorAll("[data-fix]").forEach((button) =>
      button.addEventListener("click", () => {
        const issue = issues.find((item) => item.id === button.dataset.fix);
        if (!issue) return;
        editor.value = editor.value.replace(issue.original, issue.suggestion);
        issues = issues.filter((item) => item.id !== issue.id);
        renderEditorState();
        renderIssues();
        showToast(`Fixed: "${issue.original}" → "${issue.suggestion}"`);
      })
    );
  }
  function loadSample() {
    editor.value = SAMPLE_GRAMMAR_DOC.rawText;
    issues = SAMPLE_GRAMMAR_DOC.issues.slice();
    renderEditorState();
    renderIssues();
    showToast("Restored original test document.");
  }
  function processFile(file) {
    showToast(`Parsing "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = (event) => {
      window.setTimeout(() => {
        editor.value =
          (typeof event.target?.result === "string" && event.target.result) ||
          "မြန်မာစာ သတ်ပုံ စစ်ဆေးရန် စာသားများ ဖြစ်ပါသည်။";
        issues = DROP_ISSUES.slice();
        renderEditorState();
        renderIssues();
        showToast("Document uploaded successfully! Found 2 suggestions.");
      }, 700);
    };
    reader.readAsText(file);
  }
  editor.value = SAMPLE_GRAMMAR_DOC.rawText;
  renderEditorState();
  renderIssues();
  editor.addEventListener("input", renderEditorState);
  document.getElementById("grLoadSample").addEventListener("click", loadSample);
  fixAll.addEventListener("click", () => {
    let text = editor.value;
    issues.forEach((issue) => {
      text = text.replace(issue.original, issue.suggestion);
    });
    editor.value = text;
    issues = [];
    renderEditorState();
    renderIssues();
    showToast("All Burmese spelling and grammar issues resolved!");
    confetti({ particleCount: 60, spread: 80 });
  });
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
  });
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
    const [file] = event.dataTransfer.files;
    if (file) processFile(file);
  });
  document.getElementById("grFile").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) processFile(file);
  });
  document.getElementById("grCopy").addEventListener("click", () => {
    navigator.clipboard.writeText(editor.value);
    showToast("Copied to clipboard!");
  });
  onOverlayOpen("grammar", () => {});
}