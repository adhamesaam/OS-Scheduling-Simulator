// ====================== Import API ======================
import { analyzeScheduling } from "./api.js";

let processes = [];
let nextProcessNumber = 1;
let editingProcessId = null;

// ====================== Gantt Color Palette ======================
const GANTT_COLORS = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
    "#f97316",
    "#06b6d4",
    "#a855f7",
    "#84cc16",
    "#e11d48",
];

function getColor(index) {
    return GANTT_COLORS[index % GANTT_COLORS.length];
}

function getNextProcessNumber() {
    const highestProcessNumber = processes.reduce((highest, process) => {
        const match = process.name.match(/^(?:Process|P)(\d+)$/);
        return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return highestProcessNumber + 1;
}

function getNonNegativeInteger(inputId, fallback = 0) {
    const input = document.getElementById(inputId);
    const value = Number.parseInt(input.value, 10);
    const sanitizedValue = Number.isNaN(value) ? fallback : Math.max(0, value);

    input.value = sanitizedValue;
    return sanitizedValue;
}

function getProcessColor(pid, fallbackIndex = 0) {
    const processIndex = processes.findIndex((process) => process.name === pid);
    return getColor(processIndex === -1 ? fallbackIndex : processIndex);
}

// ====================== Process Table ======================

function renderTable() {
    const tbody = document.getElementById("processes-tbody");
    tbody.innerHTML = "";

    if (processes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-12 text-center text-gray-400 text-lg">
                    No processes added yet.<br>
                    Click "ADD A NEW PROCESS" to start
                </td>
            </tr>
        `;
        return;
    }

    processes.forEach((p, index) => {
        const row = document.createElement("tr");
        row.className = "border-b hover:bg-gray-50 transition cursor-pointer";
        row.addEventListener("click", () => editProcess(p.id));
        row.innerHTML = `
            <td class="px-6 py-5 font-medium flex items-center gap-3">
                <div class="w-5 h-5 rounded-lg shrink-0" style="background-color: ${getColor(index)}"></div>
                ${p.name}
            </td>
            <td class="px-6 py-5">${p.arrival}</td>
            <td class="px-6 py-5">${p.burst}</td>
            <td class="px-6 py-5 text-center">
                <button data-id="${p.id}" class="delete-btn text-red-500 hover:text-red-700 text-xl">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Bind delete buttons after rendering rows.
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            deleteProcess(Number(btn.dataset.id));
        });
    });
}

function deleteProcess(id) {
    processes = processes.filter((p) => p.id !== id);
    if (editingProcessId === id) {
        editingProcessId = null;
        closeModal();
    }
    nextProcessNumber = getNextProcessNumber();
    renderTable();
}

function addNewProcess() {
    editingProcessId = null;
    nextProcessNumber = getNextProcessNumber();
    const newName = `Process${nextProcessNumber}`;
    document.getElementById("modal-title").textContent = "Add New Process";
    document.getElementById("modal-add-btn").textContent = "Add Process";
    document.getElementById("modal-process-name").value = newName;
    document.getElementById("modal-arrival").value = 0;
    document.getElementById("modal-burst").value = 0;
    document.getElementById("add-modal").classList.remove("hidden");
    document.getElementById("modal-arrival").focus();
}

function closeModal() {
    document.getElementById("add-modal").classList.add("hidden");
    editingProcessId = null;
}

function submitAddProcess() {
    const name = document.getElementById("modal-process-name").value;
    const arrival = getNonNegativeInteger("modal-arrival");
    const burst = getNonNegativeInteger("modal-burst");

    if (burst <= 0) {
        alert("CPU Burst must be a positive number (greater than 0)!");
        document.getElementById("modal-burst").focus();
        return;
    }

    if (editingProcessId !== null) {
        const process = processes.find((item) => item.id === editingProcessId);

        if (process) {
            process.arrival = arrival;
            process.burst = burst;
        }

        renderTable();
        closeModal();
        return;
    }

    processes.push({ id: Date.now(), name, arrival, burst });
    nextProcessNumber = getNextProcessNumber();
    renderTable();
    closeModal();
}

function editProcess(id) {
    const process = processes.find((item) => item.id === id);
    if (!process) return;

    editingProcessId = id;
    document.getElementById("modal-title").textContent = "Edit Process";
    document.getElementById("modal-add-btn").textContent = "Save Changes";
    document.getElementById("modal-process-name").value = process.name;
    document.getElementById("modal-arrival").value = process.arrival;
    document.getElementById("modal-burst").value = process.burst;
    document.getElementById("add-modal").classList.remove("hidden");
    document.getElementById("modal-arrival").focus();
}

// ====================== Tab Switching ======================

function switchTab(tab) {
    document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
        if (btn.getAttribute("data-tab") !== tab) {
            btn.classList.add("text-gray-600");
        } else {
            btn.classList.remove("text-gray-600");
        }
    });
    document
        .getElementById("rr-section")
        .classList.toggle("hidden", tab !== "rr");
    document
        .getElementById("srtf-section")
        .classList.toggle("hidden", tab !== "srtf");
}

// ===========================================================================
//                    GANTT CHART PLAYER ENGINE (Smooth)
// ===========================================================================

const ganttPlayers = {};
const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 5];
const LABEL_WIDTH = 110;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 34;

function createGanttPlayer(key, ganttData) {
    if (ganttPlayers[key]) {
        cancelAnimationFrame(ganttPlayers[key].rafId);
    }

    const uniqueProcesses = [];
    ganttData.forEach((s) => {
        if (!uniqueProcesses.includes(s.pid)) uniqueProcesses.push(s.pid);
    });

    const totalTime = ganttData[ganttData.length - 1].end;

    // Group segments by process
    const segmentsByProcess = {};
    uniqueProcesses.forEach((pid) => {
        segmentsByProcess[pid] = [];
    });
    ganttData.forEach((seg, i) => {
        segmentsByProcess[seg.pid].push({ ...seg, globalIndex: i });
    });

    // Build per-process arrival & last-end info for the lifespan line
    // Each segment may carry an `arrival` field. Fall back to first `start` if absent.
    const processLifespan = {};
    uniqueProcesses.forEach((pid) => {
        const segs = segmentsByProcess[pid];
        const arrival =
            segs[0].arrival != null ? segs[0].arrival : segs[0].start;
        const lastEnd = Math.max(...segs.map((s) => s.end));
        processLifespan[pid] = { arrival, lastEnd };
    });

    const player = {
        key,
        ganttData,
        uniqueProcesses,
        segmentsByProcess,
        processLifespan,
        totalTime,
        PX_PER_UNIT: 0,
        totalWidth: 0,
        currentTime: 0,
        playing: false,
        speedIndex: 2,
        rafId: null,
        lastFrameTs: null,
        baseSpeed: 2.5,
    };

    ganttPlayers[key] = player;
    buildRowGanttDOM(player);
    document.getElementById(`${key}-controls`).style.display = "flex";

    return player;
}

/**
 * Build a row-based Gantt chart that fills all available width.
 * Each process row has:
 *  - A thin "lifespan" line from arrival to last end
 *  - Execution blocks (shell + fill) for each scheduled segment
 */
function buildRowGanttDOM(player) {
    const {
        key,
        ganttData,
        uniqueProcesses,
        segmentsByProcess,
        processLifespan,
        totalTime,
    } = player;
    const timeline = document.getElementById(`gantt-${key}-timeline`);

    // Measure from #simulation-area; always visible regardless of active tab.
    const simArea = document.getElementById("simulation-area");
    const outerWidth = simArea.clientWidth - 32;
    const bodyWidth = Math.max(outerWidth - LABEL_WIDTH, 200);

    const MIN_PX_PER_UNIT = 32;
    const stretchPx = bodyWidth / totalTime;
    const PX_PER_UNIT = Math.max(stretchPx, MIN_PX_PER_UNIT);
    const totalWidth = totalTime * PX_PER_UNIT;

    player.PX_PER_UNIT = PX_PER_UNIT;
    player.totalWidth = totalWidth;

    // Tick interval
    let tickInterval = 1;
    if (totalTime > 80) tickInterval = 10;
    else if (totalTime > 40) tickInterval = 5;
    else if (totalTime > 20) tickInterval = 2;

    // ----- Left labels -----
    let labelsHTML = `<div class="gantt-label-header" style="height:${HEADER_HEIGHT}px;">Process</div>`;
    uniqueProcesses.forEach((pid, i) => {
        const color = getProcessColor(pid, i);
        labelsHTML += `
            <div class="gantt-label-row" style="height:${ROW_HEIGHT}px;">
                <div class="gantt-label-swatch" style="background:${color};"></div>
                ${pid}
            </div>`;
    });

    // ----- Time header -----
    let timeHeaderHTML = "";
    for (let t = 0; t < totalTime; t += tickInterval) {
        const left = t * PX_PER_UNIT;
        const width = Math.min(tickInterval, totalTime - t) * PX_PER_UNIT;
        timeHeaderHTML += `<div class="gantt-time-label" style="left:${left}px; width:${width}px;">${t}</div>`;
    }

    // ----- Vertical grid lines -----
    let vLinesHTML = "";
    for (let t = 0; t <= totalTime; t += tickInterval) {
        vLinesHTML += `<div class="gantt-vline" style="left:${t * PX_PER_UNIT}px;"></div>`;
    }

    // ----- Rows with lifespan lines + execution blocks -----
    let rowsHTML = "";
    uniqueProcesses.forEach((pid, rowIndex) => {
        const color = getProcessColor(pid, rowIndex);
        const { arrival, lastEnd } = processLifespan[pid];

        // Lifespan line: shell spans arrival to lastEnd, fill grows with playhead.
        const lineLeft = arrival * PX_PER_UNIT;
        const lineWidth = (lastEnd - arrival) * PX_PER_UNIT;
        const lifespanLine = `
            <div class="process-lifespan-line"
                 style="left:${lineLeft}px; width:${lineWidth}px;">
                <div class="lifespan-fill" id="lifespan-${key}-${rowIndex}"
                     style="background:${color}; width:0%;"></div>
            </div>`;

        // Execution blocks
        let blocksInRow = "";
        segmentsByProcess[pid].forEach((seg) => {
            const left = seg.start * PX_PER_UNIT;
            const width = (seg.end - seg.start) * PX_PER_UNIT;
            const duration = seg.end - seg.start;
            const showLabel = width > 36;

            blocksInRow += `
                <div class="gantt-block" id="gantt-block-${key}-${seg.globalIndex}"
                     style="left:${left}px; width:${width}px; border-color:${color}; color:${color};"
                     data-start="${seg.start}" data-end="${seg.end}">
                    <span class="block-tip">${pid} | ${seg.start}->${seg.end} (${duration}u)</span>
                    <div class="block-fill" id="block-fill-${key}-${seg.globalIndex}"
                         style="background-color:${color}; width:0%;">
                        ${showLabel ? `<span class="block-label">${seg.start}-${seg.end}</span>` : ""}
                    </div>
                </div>`;
        });

        rowsHTML += `
            <div class="gantt-row" style="height:${ROW_HEIGHT}px;">
                ${lifespanLine}
                ${blocksInRow}
            </div>`;
    });

    const bodyHeight = uniqueProcesses.length * ROW_HEIGHT;

    timeline.innerHTML = `
        <div class="gantt-chart-area">
            <div class="gantt-chart-inner">
                <div class="gantt-labels" style="width:${LABEL_WIDTH}px; min-width:${LABEL_WIDTH}px;">
                    ${labelsHTML}
                </div>
                <div class="gantt-body" style="width:${totalWidth}px; min-width:${totalWidth}px;">
                    <div class="gantt-time-header" style="height:${HEADER_HEIGHT}px;">
                        ${timeHeaderHTML}
                        <div class="gantt-playhead-header" id="playhead-header-${key}" style="left:0px;"></div>
                    </div>
                    <div class="gantt-rows" style="position:relative; height:${bodyHeight}px;">
                        ${vLinesHTML}
                        ${rowsHTML}
                        <div class="gantt-playhead" id="playhead-${key}" style="left:0px;"></div>
                    </div>
                </div>
            </div>
        </div>`;

    // Legend
    document.getElementById(`gantt-${key}-legend`).innerHTML = uniqueProcesses
        .map(
            (pid, i) => `
        <div class="gantt-legend-item">
            <div class="gantt-legend-swatch" style="background:${getProcessColor(pid, i)};"></div>
            <span>${pid}</span>
        </div>
    `,
        )
        .join("");

    updateTimeDisplay(player);
    updateSpeedLabel(player);
}

// ====================== Smooth Playback ======================

function playPause(player) {
    player.playing ? pause(player) : play(player);
}

function play(player) {
    if (player.currentTime >= player.totalTime) {
        resetPlayer(player);
    }
    player.playing = true;
    player.lastFrameTs = null;
    updatePlayIcon(player);
    player.rafId = requestAnimationFrame((ts) => animationLoop(player, ts));
}

function animationLoop(player, timestamp) {
    if (!player.playing) return;

    if (player.lastFrameTs === null) {
        player.lastFrameTs = timestamp;
    }

    const deltaMs = timestamp - player.lastFrameTs;
    player.lastFrameTs = timestamp;

    const speed = SPEEDS[player.speedIndex];
    const deltaTime = (deltaMs / 1000) * player.baseSpeed * speed;
    player.currentTime = Math.min(
        player.currentTime + deltaTime,
        player.totalTime,
    );

    updateAllBlocks(player);
    setPlayheadPosition(player, player.currentTime);
    updateTimeDisplay(player);

    if (player.currentTime >= player.totalTime) {
        pause(player);
        return;
    }

    player.rafId = requestAnimationFrame((ts) => animationLoop(player, ts));
}

function pause(player) {
    player.playing = false;
    player.lastFrameTs = null;
    if (player.rafId) {
        cancelAnimationFrame(player.rafId);
        player.rafId = null;
    }
    updatePlayIcon(player);
}

function stepForward(player) {
    pause(player);
    const nextEnd = player.ganttData
        .map((s) => s.end)
        .filter((t) => t > Math.ceil(player.currentTime * 100) / 100)
        .sort((a, b) => a - b)[0];

    player.currentTime = nextEnd != null ? nextEnd : player.totalTime;
    updateAllBlocks(player);
    setPlayheadPosition(player, player.currentTime);
    updateTimeDisplay(player);
}

function stepBack(player) {
    pause(player);
    const prevStarts = player.ganttData
        .map((s) => s.start)
        .filter((t) => t < player.currentTime - 0.01)
        .sort((a, b) => b - a);

    player.currentTime = prevStarts.length > 0 ? prevStarts[0] : 0;
    updateAllBlocks(player);
    setPlayheadPosition(player, player.currentTime);
    updateTimeDisplay(player);
}

function resetPlayer(player) {
    pause(player);
    player.currentTime = 0;
    updateAllBlocks(player);
    setPlayheadPosition(player, 0);
    updateTimeDisplay(player);
}

function jumpToEnd(player) {
    pause(player);
    player.currentTime = player.totalTime;
    updateAllBlocks(player);
    setPlayheadPosition(player, player.totalTime);
    updateTimeDisplay(player);
}

function changeSpeed(player, delta) {
    const newIdx = player.speedIndex + delta;
    if (newIdx >= 0 && newIdx < SPEEDS.length) {
        player.speedIndex = newIdx;
        updateSpeedLabel(player);
    }
}

// ====================== Block + Lifespan Updates (every RAF frame) ======================

function updateAllBlocks(player) {
    const t = player.currentTime;

    // --- Execution blocks ---
    player.ganttData.forEach((seg, i) => {
        const shell = document.getElementById(`gantt-block-${player.key}-${i}`);
        const fill = document.getElementById(`block-fill-${player.key}-${i}`);
        if (!shell || !fill) return;

        const duration = seg.end - seg.start;

        if (t < seg.start) {
            shell.classList.remove("visible", "current");
            fill.style.width = "0%";
            fill.classList.remove("wide");
        } else {
            shell.classList.add("visible");

            const progress = Math.min((t - seg.start) / duration, 1);
            const pct = progress * 100;
            fill.style.width = pct + "%";

            const fillPx = (pct / 100) * shell.offsetWidth;
            fill.classList.toggle("wide", fillPx > 38);

            const isCurrent = t >= seg.start && t < seg.end;
            shell.classList.toggle("current", isCurrent);
        }
    });

    // --- Lifespan lines ---
    player.uniqueProcesses.forEach((pid, rowIndex) => {
        const lifeFill = document.getElementById(
            `lifespan-${player.key}-${rowIndex}`,
        );
        if (!lifeFill) return;

        const { arrival, lastEnd } = player.processLifespan[pid];
        const span = lastEnd - arrival;

        if (t < arrival) {
            lifeFill.style.width = "0%";
        } else {
            const progress = Math.min((t - arrival) / span, 1);
            lifeFill.style.width = progress * 100 + "%";
        }
    });
}

// ====================== DOM Updaters ======================

function setPlayheadPosition(player, time) {
    const px = time * player.PX_PER_UNIT;
    const playhead = document.getElementById(`playhead-${player.key}`);
    const playheadHeader = document.getElementById(
        `playhead-header-${player.key}`,
    );
    if (playhead) playhead.style.left = `${px}px`;
    if (playheadHeader) playheadHeader.style.left = `${px}px`;
}

function updateTimeDisplay(player) {
    const display = document.getElementById(`${player.key}-time-display`);
    if (!display) return;
    const t = Math.round(player.currentTime * 10) / 10;
    display.innerHTML = `t=<span>${t}</span>/${player.totalTime}`;
}

function updatePlayIcon(player) {
    const btn = document.querySelector(
        `[data-action="play"][data-target="${player.key}"] i`,
    );
    if (btn) btn.className = player.playing ? "fas fa-pause" : "fas fa-play";
}

function updateSpeedLabel(player) {
    const label = document.getElementById(`${player.key}-speed-label`);
    if (label) label.textContent = `${SPEEDS[player.speedIndex]}x`;
}

// ====================== Results Table ======================

function renderResultsTable(tbodyId, results, tfootId, metrics) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if (!results || results.length === 0) return;

    results.forEach((p) => {
        const row = document.createElement("tr");
        row.className = "border-b hover:bg-gray-50";
        // Handle both short and long property names depending on API output
        const at =
            p.at !== undefined
                ? p.at
                : p.arrival !== undefined
                  ? p.arrival
                  : "--";
        const bt =
            p.bt !== undefined ? p.bt : p.burst !== undefined ? p.burst : "--";
        const wt =
            p.wt !== undefined
                ? p.wt
                : p.waiting_time !== undefined
                  ? p.waiting_time
                  : "--";
        const tat =
            p.tat !== undefined
                ? p.tat
                : p.turnaround_time !== undefined
                  ? p.turnaround_time
                  : "--";
        const rt =
            p.rt !== undefined
                ? p.rt
                : p.response_time !== undefined
                  ? p.response_time
                  : "--";

        row.innerHTML = `
            <td class="py-4 px-6 text-center font-medium">${p.pid || p.name || "--"}</td>
            <td class="py-4 px-6 text-center">${at}</td>
            <td class="py-4 px-6 text-center">${bt}</td>
            <td class="py-4 px-6 text-center">${wt}</td>
            <td class="py-4 px-6 text-center">${tat}</td>
            <td class="py-4 px-6 text-center">${rt}</td>
        `;
        tbody.appendChild(row);
    });

    // Populate averages in tfoot
    if (tfootId && metrics) {
        const tfoot = document.getElementById(tfootId);
        if (tfoot) {
            tfoot.classList.remove("hidden");
            const avgWt = tfootId.includes("rr")
                ? tfoot.querySelector("#rr-table-avg-wt")
                : tfoot.querySelector("#srtf-table-avg-wt");
            const avgTat = tfootId.includes("rr")
                ? tfoot.querySelector("#rr-table-avg-tat")
                : tfoot.querySelector("#srtf-table-avg-tat");
            const avgRt = tfootId.includes("rr")
                ? tfoot.querySelector("#rr-table-avg-rt")
                : tfoot.querySelector("#srtf-table-avg-rt");

            if (avgWt)
                avgWt.textContent =
                    metrics.avg_wt != null ? metrics.avg_wt.toFixed(2) : "--";
            if (avgTat)
                avgTat.textContent =
                    metrics.avg_tat != null ? metrics.avg_tat.toFixed(2) : "--";
            if (avgRt)
                avgRt.textContent =
                    metrics.avg_rt != null ? metrics.avg_rt.toFixed(2) : "--";
        }
    }
}

// ====================== Performance Summary ======================

function renderPerformanceSummary(rrMetrics, srtfMetrics) {
    const wtCompareEl = document.getElementById("perf-wt-compare");
    const tatCompareEl = document.getElementById("perf-tat-compare");
    const rtCompareEl = document.getElementById("perf-rt-compare");

    if (!wtCompareEl || !tatCompareEl || !rtCompareEl) return;

    const vals = {
        wt: [rrMetrics?.avg_wt, srtfMetrics?.avg_wt],
        tat: [rrMetrics?.avg_tat, srtfMetrics?.avg_tat],
        rt: [rrMetrics?.avg_rt, srtfMetrics?.avg_rt],
    };

    for (const [metric, [rrVal, srtfVal]] of Object.entries(vals)) {
        const el =
            metric === "wt"
                ? wtCompareEl
                : metric === "tat"
                  ? tatCompareEl
                  : rtCompareEl;

        const strRR = rrVal != null ? rrVal.toFixed(2) : "--";
        const strSRTF = srtfVal != null ? srtfVal.toFixed(2) : "--";

        // Render `<span class="blue">RR</span> vs <span class="orange">SRTF</span>` format
        el.innerHTML = `
            <span class="text-blue-500" title="Round Robin">${strRR}</span>
            <span class="text-gray-300 text-2xl mx-3 font-medium">vs</span>
            <span class="text-orange-500" title="SRTF">${strSRTF}</span>
        `;
    }
}

// ====================== Analytical Conclusion ======================

function renderAnalyticalConclusion(rrMetrics, srtfMetrics, quantumVal) {
    if (!rrMetrics || !srtfMetrics) return;

    const fairnessEl = document.getElementById("conc-fairness");
    const timeSlicingEl = document.getElementById("conc-time-slicing");
    const responseEl = document.getElementById("conc-response");
    const quantumEl = document.getElementById("conc-quantum");
    const srtfEl = document.getElementById("conc-srtf");

    if (!fairnessEl || !timeSlicingEl || !responseEl || !quantumEl || !srtfEl) return;

    const rrWT = rrMetrics.avg_wt.toFixed(2);
    const srtfWT = srtfMetrics.avg_wt.toFixed(2);
    const rrRT = rrMetrics.avg_rt.toFixed(2);
    const srtfRT = srtfMetrics.avg_rt.toFixed(2);
    const rrTAT = rrMetrics.avg_tat.toFixed(2);
    const srtfTAT = srtfMetrics.avg_tat.toFixed(2);

    // 1. Fairness vs efficiency
    let efficiencyStr = parseFloat(rrWT) > parseFloat(srtfWT) 
        ? `In this run, <strong class="text-orange-600">SRTF</strong> proved more efficient with an average waiting time of <strong>${srtfWT}</strong> compared to <strong class="text-blue-600">RR</strong>'s <strong>${rrWT}</strong>.` 
        : `Interestingly, in this run, efficiency was relatively close or RR was better (RR: ${rrWT}, SRTF: ${srtfWT}).`;
    
    fairnessEl.innerHTML = `<strong>Round Robin</strong> ensures high fairness by sharing CPU time equally through time slicing, preventing starvation. However, frequent context switching can reduce overall efficiency. <strong>SRTF</strong> maximizes efficiency by prioritizing short jobs. ${efficiencyStr}`;

    // 2. Effect of time slicing versus shortest-job preference
    timeSlicingEl.innerHTML = `<strong>Time slicing (RR)</strong> guarantees regular CPU allocation, making it ideal for interactive systems. <strong>Shortest-job preference (SRTF)</strong> heavily optimizes for throughput by quickly finishing tasks. The simulation reflects this with RR yielding a turnaround time of <strong>${rrTAT}</strong>, while SRTF achieved <strong>${srtfTAT}</strong>.`;

    // 3. Effect on first response time
    let responseStr = parseFloat(rrRT) < parseFloat(srtfRT) 
        ? `Here, <strong class="text-blue-600">RR</strong> provided a better average response time (<strong>${rrRT}</strong>) than <strong class="text-orange-600">SRTF</strong> (<strong>${srtfRT}</strong>), proving its strength for interactive responsiveness.`
        : `Here, <strong class="text-orange-600">SRTF</strong> provided a better average response time (<strong>${srtfRT}</strong>) than <strong class="text-blue-600">RR</strong> (<strong>${rrRT}</strong>), likely because short jobs quickly cleared out before long ones.`;
    
    responseEl.innerHTML = `<strong>Round Robin</strong> generally provides a better and more predictable first response time. <strong>SRTF</strong> provides lightning-fast response times for short jobs. ${responseStr}`;

    // 4. Effect of quantum size on Round Robin behavior
    let qComment = quantumVal <= 3 
        ? `The chosen small quantum of <strong>${quantumVal}</strong> heavily favors responsiveness but causes frequent context switches.` 
        : `The chosen larger quantum of <strong>${quantumVal}</strong> reduces context switches but makes RR behave more like FCFS.`;

    quantumEl.innerHTML = `A smaller quantum improves response time but increases context switching overhead, hurting overall throughput. A larger quantum reduces overhead but makes RR degrade into First-Come-First-Served (FCFS). ${qComment}`;

    // 5. Whether SRTF gives a strong advantage to short jobs
    let advantageStr = parseFloat(srtfWT) < parseFloat(rrWT)
        ? `This simulation confirms the theory: SRTF achieved a lower average waiting time (<strong>${srtfWT}</strong> vs <strong>${rrWT}</strong>), strongly advantaging the shorter processes.`
        : `In this specific scenario, the advantage wasn't as pronounced (SRTF WT: ${srtfWT} vs RR WT: ${rrWT}), which can happen depending heavily on arrival times.`;

    srtfEl.innerHTML = `<strong>Yes</strong>, SRTF heavily favors short jobs by immediately preempting currently running longer jobs. ${advantageStr}`;
}

// ====================== Run Simulation ======================

async function runSimulation() {
    if (processes.length === 0) {
        alert("Please add at least one process!");
        return;
    }

    const quantumVal = parseInt(document.getElementById("time-quantum").value);
    if (isNaN(quantumVal) || quantumVal <= 0) {
        alert("Time Quantum must be a positive number (greater than 0)!");
        document.getElementById("time-quantum").focus();
        return;
    }

    const runBtn = document.getElementById("run-simulation-btn");
    const originalText = runBtn.innerHTML;
    runBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
    runBtn.disabled = true;

    try {
        const result = await analyzeScheduling(quantumVal, processes);
        console.log("Result from backend:", result);

        const data = result.data;

        // Round Robin
        const rrGantt = data.rr?.gantt ?? data.rr?.schedule;
        const rrMetrics = data.rr?.metrics ?? data.rr?.averages;
        const rrProcesses = data.rr?.processes;

        if (rrGantt?.length > 0) createGanttPlayer("rr", rrGantt);
        if (rrProcesses)
            renderResultsTable(
                "rr-table-body",
                rrProcesses,
                "rr-table-foot",
                rrMetrics,
            );

        // SRTF
        const srtfGantt = data.srtf?.gantt ?? data.srtf?.schedule;
        const srtfMetrics = data.srtf?.metrics ?? data.srtf?.averages;
        const srtfProcesses = data.srtf?.processes;

        if (srtfGantt?.length > 0) createGanttPlayer("srtf", srtfGantt);
        if (srtfProcesses)
            renderResultsTable(
                "srtf-table-body",
                srtfProcesses,
                "srtf-table-foot",
                srtfMetrics,
            );

        renderPerformanceSummary(rrMetrics, srtfMetrics);
        renderAnalyticalConclusion(rrMetrics, srtfMetrics, quantumVal);
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to connect to server:\n" + error.message);
    } finally {
        runBtn.innerHTML = originalText;
        runBtn.disabled = false;
    }
}

// ====================== Control Button Handler ======================

function handleControlClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const target = btn.dataset.target;
    const player = ganttPlayers[target];
    if (!player) return;

    switch (action) {
        case "play":
            playPause(player);
            break;
        case "reset":
            resetPlayer(player);
            break;
        case "step-back":
            stepBack(player);
            break;
        case "step-fwd":
            stepForward(player);
            break;
        case "end":
            jumpToEnd(player);
            break;
        case "speed-up":
            changeSpeed(player, 1);
            break;
        case "speed-down":
            changeSpeed(player, -1);
            break;
    }
}

// ====================== Test Scenarios ======================

function loadScenario() {
    const scenario = document.getElementById("scenario-select").value;
    if (!scenario) {
        alert("Please select a scenario to load.");
        return;
    }

    processes = [];
    let quantum = 2;

    switch (scenario) {
        case "A":
            // Scenario A: Basic mixed workload
            quantum = 4;
            processes = [
                { id: Date.now() + 1, name: "P1", arrival: 0, burst: 10 },
                { id: Date.now() + 2, name: "P2", arrival: 2, burst: 5 },
                { id: Date.now() + 3, name: "P3", arrival: 4, burst: 8 },
                { id: Date.now() + 4, name: "P4", arrival: 5, burst: 2 }
            ];
            nextProcessNumber = 5;
            break;
        case "B":
            // Scenario B: Quantum sensitivity case (small quantum)
            // Same as A to show how a small quantum heavily increases context switches
            quantum = 1;
            processes = [
                { id: Date.now() + 1, name: "P1", arrival: 0, burst: 10 },
                { id: Date.now() + 2, name: "P2", arrival: 2, burst: 5 },
                { id: Date.now() + 3, name: "P3", arrival: 4, burst: 8 },
                { id: Date.now() + 4, name: "P4", arrival: 5, burst: 2 }
            ];
            nextProcessNumber = 5;
            break;
        case "C":
            // Scenario C: Short-job-heavy case
            // A long job arrived first, followed by many short jobs
            quantum = 3;
            processes = [
                { id: Date.now() + 1, name: "P1", arrival: 0, burst: 15 },
                { id: Date.now() + 2, name: "P2", arrival: 1, burst: 2 },
                { id: Date.now() + 3, name: "P3", arrival: 2, burst: 1 },
                { id: Date.now() + 4, name: "P4", arrival: 3, burst: 3 },
                { id: Date.now() + 5, name: "P5", arrival: 4, burst: 2 }
            ];
            nextProcessNumber = 6;
            break;
        case "D":
            // Scenario D: Interactive-style fairness case
            // Multiple jobs arriving at the same time to test responsiveness
            quantum = 2;
            processes = [
                { id: Date.now() + 1, name: "P1", arrival: 0, burst: 8 },
                { id: Date.now() + 2, name: "P2", arrival: 0, burst: 8 },
                { id: Date.now() + 3, name: "P3", arrival: 0, burst: 8 },
                { id: Date.now() + 4, name: "P4", arrival: 0, burst: 8 }
            ];
            nextProcessNumber = 5;
            break;
        case "E":
            // Scenario E: Validation case
            // Empty processes to show frontend validation without allowing negative input.
            quantum = 0;
            processes = [];
            nextProcessNumber = 1;
            break;
    }

    nextProcessNumber = getNextProcessNumber();
    document.getElementById("time-quantum").value = quantum;
    renderTable();
}

// ====================== Init ======================
document.addEventListener("DOMContentLoaded", () => {
    // Default example
    processes = [
        { id: Date.now() + 1, name: "Process1", arrival: 0, burst: 5 },
        { id: Date.now() + 2, name: "Process2", arrival: 2, burst: 3 },
        { id: Date.now() + 3, name: "Process3", arrival: 4, burst: 8 },
    ];
    nextProcessNumber = getNextProcessNumber();
    renderTable();
    switchTab("rr");

    document
        .getElementById("add-process-btn")
        .addEventListener("click", addNewProcess);
    document
        .getElementById("run-simulation-btn")
        .addEventListener("click", runSimulation);
    document
        .getElementById("modal-cancel-btn")
        .addEventListener("click", closeModal);
    document
        .getElementById("modal-add-btn")
        .addEventListener("click", submitAddProcess);
    document
        .getElementById("load-scenario-btn")
        .addEventListener("click", loadScenario);

    document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", () =>
            switchTab(btn.getAttribute("data-tab")),
        );
    });

    document.getElementById("add-modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("add-modal")) closeModal();
    });

    document
        .getElementById("rr-controls")
        .addEventListener("click", handleControlClick);
    document
        .getElementById("srtf-controls")
        .addEventListener("click", handleControlClick);

    ["time-quantum", "modal-arrival", "modal-burst"].forEach((inputId) => {
        const input = document.getElementById(inputId);
        input.addEventListener("input", () => getNonNegativeInteger(inputId));
    });
});
