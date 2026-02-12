const API_URL =
  "https://script.google.com/macros/s/AKfycbyVt9RHPNWWgzbOpjlyMk014Ir7MoePNCcrO9QPPh2RIg3VqZM03rpoE4wF1JIjr3LTGw/exec";

/* ================= FETCH ================= */
async function fetchData() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    alert("API ERROR: " + e.message);
    throw e;
  }
}

/* ================= RENDER TRANSACTIONS (SHARED) ================= */
function renderTransactions(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = "<p>ไม่มีข้อมูล</p>";
    return;
  }

  list.forEach(t => {
    const div = document.createElement("div");
    div.className = "tx-row";

    div.innerHTML = `
      <div class="tx-top">
        <span class="tx-date">${t.date}</span>
        <span class="tx-amount ${t.amount >= 0 ? "tx-plus" : "tx-minus"}">
          ${t.amount >= 0 ? "+" : "-"}฿${Math.abs(t.amount).toLocaleString()}
        </span>
      </div>
      <div class="tx-desc">
        ${t.category || ""}
        ${t.description ? " · " + t.description : ""}
        ${t.location ? " · 📍" + t.location : ""}
      </div>
    `;
    el.appendChild(div);
  });
}

/* ================= HOME ================= */
/* ================= HOME ================= */
/* ================= HOME ================= */
async function initHome() {
  const data = await fetchData();
  const tx = data.allTransactions || [];

  if (tx.length === 0) {
    setHomeValues(0, 0, 0, 0);
    return;
  }

  /* =========================
     1. TOTAL BALANCE (ตรงชีต 100%)
     ========================= */
  const totalBalance = tx.reduce((sum, t) => {
    return sum + Number(t.amount);
  }, 0);

  /* =========================
     2. ใช้เดือนปัจจุบันจริง
     ========================= */
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  let income = 0;
  let expense = 0;

  tx.forEach(t => {
    const d = new Date(t.date);
    const amount = Number(t.amount);

    if (
      d.getMonth() + 1 === currentMonth &&
      d.getFullYear() === currentYear
    ) {
      if (amount >= 0) income += amount;
      else expense += Math.abs(amount);
    }
  });

  /* =========================
     3. ใส่ค่าลงหน้าเว็บ
     ========================= */
  setHomeValues(totalBalance, income, expense, income - expense);

  /* =========================
     4. เปลี่ยนชื่อเดือนอัตโนมัติ
     ========================= */
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const titleEl = document.getElementById("homeMonthTitle");
  if (titleEl) {
    titleEl.textContent =
      `${monthNames[currentMonth - 1]} ${currentYear} - Monthly Summary`;
  }

  /* =========================
     5. แสดงรายการล่าสุด (เรียงใหม่ก่อน)
     ========================= */
  const sorted = [...tx].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  renderTransactions("transaction-list", sorted.slice(0, 20));
}


/* =========================
   Helper ใส่ค่า DOM
   ========================= */
function setHomeValues(balance, income, expense, monthlyBalance) {
  const balEl = document.getElementById("cumulative-balance");
  const incEl = document.getElementById("monthly-income");
  const expEl = document.getElementById("monthly-expense");
  const monthBalEl = document.getElementById("monthly-balance");

  if (balEl) balEl.textContent = "฿" + balance.toLocaleString();
  if (incEl) incEl.textContent = "฿" + income.toLocaleString();
  if (expEl) expEl.textContent = "฿" + expense.toLocaleString();
  if (monthBalEl) monthBalEl.textContent = "฿" + monthlyBalance.toLocaleString();
}
/* ================= TRANSACTIONS PAGE ================= */
let ALL_TX = [];

async function initTransactions() {
  const raw = await fetchData();
  ALL_TX = raw.allTransactions || [];

  if (ALL_TX.length === 0) return;

  populateMonthYearSelects();
  filterTransactions();
}

function populateMonthYearSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (!monthSelect || !yearSelect) return;

  const dates = ALL_TX.map(t => new Date(t.date));
  const years = [...new Set(dates.map(d => d.getFullYear()))].sort((a,b)=>b-a);

  yearSelect.innerHTML = "";
  years.forEach(y => yearSelect.add(new Option(y, y)));

  function updateMonths() {
    const y = Number(yearSelect.value);
    const months = [...new Set(
      dates.filter(d => d.getFullYear() === y).map(d => d.getMonth()+1)
    )].sort((a,b)=>b-a);

    monthSelect.innerHTML = "";
    months.forEach(m => monthSelect.add(new Option(`เดือน ${m}`, m)));
  }

  yearSelect.onchange = () => { updateMonths(); filterTransactions(); };
  monthSelect.onchange = filterTransactions;

  yearSelect.value = years[0];
  updateMonths();
}

function filterTransactions() {
  const m = Number(document.getElementById("month-select").value);
  const y = Number(document.getElementById("year-select").value);

  const filtered = ALL_TX.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  });

  renderTransactions("all-transaction-list", filtered);
}

/* ================= ANALYTICS ================= */
/* ================= ANALYTICS ================= */
let ANALYTICS_TX = [];
let CAT_CHART = null;
let MONTH_CHART = null;
let STACKED_CHART = null;

async function initAnalytics() {
  const data = await fetchData();
  ANALYTICS_TX = data.allTransactions || [];
  if (ANALYTICS_TX.length === 0) return;

  initAnalyticsSelectors();
  renderAnalytics();
}

/* ===== SELECTORS ===== */
function initAnalyticsSelectors() {
  const yearEl = document.getElementById("analytics-year");
  const monthEl = document.getElementById("analytics-month");
  const locEl = document.getElementById("analytics-location");
  const catEl = document.getElementById("analytics-category");

  const dates = ANALYTICS_TX.map(t => new Date(t.date));
  const years = [...new Set(dates.map(d => d.getFullYear()))].sort((a,b)=>b-a);

  yearEl.innerHTML = "";
  years.forEach(y => yearEl.add(new Option(y, y)));

  function updateMonths() {
    const y = Number(yearEl.value);
    const months = [...new Set(
      dates.filter(d => d.getFullYear() === y).map(d => d.getMonth()+1)
    )].sort((a,b)=>b-a);

    monthEl.innerHTML = "";
    months.forEach(m => monthEl.add(new Option(`เดือน ${m}`, m)));
  }

  yearEl.onchange = () => {
    updateMonths();
    renderAnalytics();
  };
  monthEl.onchange = renderAnalytics;
  locEl.onchange = renderAnalytics;
  catEl.onchange = renderAnalytics;

  yearEl.value = years[0];
  updateMonths();
}

/* ===== MAIN RENDER ===== */
function renderAnalytics() {
  const y = Number(document.getElementById("analytics-year").value);
  const m = Number(document.getElementById("analytics-month").value);
  const loc = document.getElementById("analytics-location").value;
  const cat = document.getElementById("analytics-category").value;

  const monthTx = ANALYTICS_TX.filter(t => {
    const d = new Date(t.date);
    return (
      d.getFullYear() === y &&
      d.getMonth() + 1 === m &&
      (!loc || t.location === loc)
    );
  });

  populateLocationSelector(monthTx);

  renderStackedChart(monthTx, cat);

  const listTx = cat
    ? monthTx.filter(t => t.category === cat)
    : monthTx;

  renderTransactionList(listTx, cat);
}

function renderStackedChart(tx, selectedCategory) {
  const incomeMap = {};
  const expenseMap = {};

  tx.forEach(t => {
    const cat = t.category || "Other";
    if (selectedCategory && cat !== selectedCategory) return;

    if (t.amount >= 0) {
      incomeMap[cat] = (incomeMap[cat] || 0) + t.amount;
    } else {
      expenseMap[cat] = (expenseMap[cat] || 0) + Math.abs(t.amount);
    }
  });

  const categories = Array.from(
    new Set([...Object.keys(incomeMap), ...Object.keys(expenseMap)])
  );

  // update category selector (ไม่พัง state)
  const catEl = document.getElementById("analytics-category");
  const current = catEl.value;
  catEl.innerHTML = `<option value="">All Categories</option>`;
  categories.forEach(c => catEl.add(new Option(c, c)));
  if (categories.includes(current)) catEl.value = current;

  const datasets = categories.map(c => ({
    label: c,
    data: [
      incomeMap[c] || 0,
      expenseMap[c] || 0
    ],
    stack: "stack1"
  }));

  const ctx = document.getElementById("stackedChart");
  if (STACKED_CHART) STACKED_CHART.destroy();

  STACKED_CHART = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          ticks: {
            callback: v => "฿" + v.toLocaleString()
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: c =>
              `${c.dataset.label}: ฿${c.parsed.y.toLocaleString()}`
          }
        }
      },
      onClick: (_, els) => {
        if (!els.length) return;
        const ds = datasets[els[0].datasetIndex];
        catEl.value = ds.label;
        renderAnalytics();
      }
    }
  });
}

/* ===== LOCATION SELECT ===== */
function populateLocationSelector(tx) {
  const locEl = document.getElementById("analytics-location");
  const current = locEl.value;

  const locations = [...new Set(
    tx.map(t => t.location).filter(Boolean)
  )];

  locEl.innerHTML = `<option value="">All Locations</option>`;
  locations.forEach(l => locEl.add(new Option(l, l)));

  if (locations.includes(current)) locEl.value = current;
}

/* ===== CATEGORY PIE ===== */
function renderCategoryChart(tx) {
  const map = {};
  tx.forEach(t => {
    if (t.amount < 0) {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const labels = Object.keys(map);
  const values = Object.values(map);

  const catEl = document.getElementById("analytics-category");
  catEl.innerHTML = `<option value="">All Categories</option>`;
  labels.forEach(c => catEl.add(new Option(c, c)));

  const ctx = document.getElementById("categoryChart");
  if (CAT_CHART) CAT_CHART.destroy();

  CAT_CHART = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: c => `${c.label}: ฿${c.parsed.toLocaleString()}`
          }
        }
      },
      onClick: (_, el) => {
        if (!el.length) return;
        catEl.value = labels[el[0].index];
        renderAnalytics();
      }
    }
  });
}

/* ===== MONTHLY SUMMARY ===== */
function renderMonthlyChart(tx) {
  let income = 0, expense = 0;
  tx.forEach(t => {
    if (t.amount >= 0) income += t.amount;
    else expense += Math.abs(t.amount);
  });

  const ctx = document.getElementById("monthlyChart");
  if (MONTH_CHART) MONTH_CHART.destroy();

  MONTH_CHART = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [income, expense]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: c => `฿${c.parsed.y.toLocaleString()}`
          }
        }
      }
    }
  });
}

/* ===== TRANSACTION LIST ===== */
function renderTransactionList(tx, category) {
  const el = document.getElementById("categoryTxList");
  const title = document.getElementById("categoryTitle");

  el.innerHTML = "";

  title.textContent = category
    ? `Transactions: ${category}`
    : "Transactions";

  if (tx.length === 0) {
    el.innerHTML = "<p>ไม่มีข้อมูล</p>";
    return;
  }

  tx.forEach(t => {
    const div = document.createElement("div");
    div.className = "tx-row";
    div.innerHTML = `
      <div class="tx-top">
        <span class="tx-date">${t.date}</span>
        <span class="tx-amount ${t.amount>=0?'tx-plus':'tx-minus'}">
          ฿${Math.abs(t.amount).toLocaleString()}
        </span>
      </div>
      <div class="tx-desc">
        ${t.category} · ${t.location || ""} ${t.description ? "· "+t.description : ""}
      </div>
    `;
    el.appendChild(div);
  });
}


/* ================= NAV ================= */
function goHome() { location.href = "index.html"; }
function goFund() { location.href = "fund.html"; }
function goAnalytics() { location.href = "analytics.html"; }
function goTransactionsAll() { location.href = "transactions.html"; }
