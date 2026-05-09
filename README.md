# CPU Scheduling Simulator — Round Robin vs SRTF

A full-stack CPU scheduling simulator that implements and compares **Round Robin (RR)** and **Shortest Remaining Time First (SRTF)** scheduling algorithms through an animated, interactive Gantt chart interface.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Team Members](#team-members)
- [Project Objective](#project-objective)
- [Features & Interface Sections](#features--interface-sections)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Build & Run Instructions](#build--run-instructions)
- [Test Scenarios](#test-scenarios)
- [Analysis Questions & Answers](#analysis-questions--answers)
- [Final Conclusion](#final-conclusion)
- [Screenshots](#screenshots)
- [API Reference](#api-reference)

---

## Project Overview

This project compares two CPU scheduling algorithms:

| Algorithm            | Strategy                            | Focus                                        |
| -------------------- | ----------------------------------- | -------------------------------------------- |
| **Round Robin (RR)** | Time-slicing with a fixed quantum   | Fairness — every process gets a regular turn |
| **SRTF**             | Preemptive shortest remaining burst | Efficiency — minimize average waiting time   |

The simulator accepts a dynamic number of processes at runtime, validates all inputs, runs both algorithms through a compiled C engine, and presents the results side-by-side with animated Gantt charts, detailed metrics tables, a performance comparison panel, and a written analytical conclusion.

---

## Team Members

| Name               | Student ID |
| ------------------ | ---------- |
| Adham Essam        | 20240110   |
| Ammar Moamen       | 20240618   |
| Khalid hessain     |            |
| Eissa Mohamed      | 20240673   |
| Belal AbdElhady    |            |
| Youssef Mahmoud    | 20241191   |
| Abd El-rahman Rizk |            |

> **Team Number:** _(Add team number)_

---

## Project Objective

The purpose of this project is to compare a **fairness-oriented time-slicing scheduler (Round Robin)** with an **efficiency-oriented shortest-remaining-time scheduler (SRTF)**. The analysis reveals how the following factors affect overall system behavior:

- Response time and waiting time under each algorithm
- Fairness of CPU distribution across all processes
- The role of preemption in SRTF versus time-slicing in RR
- The impact of quantum size on Round Robin behavior
- The degree to which SRTF advantages short jobs over long ones

---

## Features & Interface Sections

The interface is organized into all required sections:

### 1. Input Panel

- Dynamic process table — add or delete processes at runtime
- Each process requires: **Process Name**, **Arrival Time**, **CPU Burst**
- Validation rejects empty process lists, non-positive burst times, and invalid quantum values
- Five preloaded test scenarios (A–E) accessible via a dropdown

### 2. Quantum Input Field

- Accepts a user-defined time quantum for Round Robin
- Validates that the quantum is a positive integer before simulation runs
- Frontend blocks submission with an alert if the quantum is zero or negative

### 3. Ready Queue View for Round Robin

- The animated Gantt chart serves as a live visualization of the ready queue state — each process row shows exactly when it is waiting and when it is executing, making the time-slicing behavior directly observable

### 4. Gantt Chart — Round Robin

- Animated playback with play/pause, step forward/back, jump to end, and speed control (0.25× – 5×)
- Per-process color-coded rows with a moving playhead and time axis
- Tooltip on each block showing PID, start time, end time, and duration

### 5. Gantt Chart — SRTF

- Identical player interface with independent state from the RR chart
- Preemption points are clearly visible as rapid process switches in the timeline

### 6. Results Table — Round Robin

- Per-process columns: Arrival, Burst, Waiting Time (WT), Turnaround Time (TAT), Response Time (RT)
- Footer row showing: Average WT, Average TAT, Average RT

### 7. Results Table — SRTF

- Same structure as the RR table for direct side-by-side comparison

### 8. Comparison Summary Panel

- Three metric cards showing RR vs SRTF values side-by-side:
  - Average Waiting Time
  - Average Turnaround Time
  - Average Response Time
- Color-coded: blue for RR, orange for SRTF

### 9. Final Conclusion Area

- Five dynamically generated analytical paragraphs, updated after each simulation run, covering:
  - Fairness versus efficiency
  - Effect of time slicing versus shortest-job preference
  - Effect on first response time
  - Effect of quantum size on Round Robin behavior
  - Whether SRTF gives a strong advantage to short jobs

---

## Project Structure

```
project-root/
│
├── C/                                        # Scheduling engine (C source)
│   ├── Scheduling Algorithms/
│   │   ├── Round_Robin.c                     # Round Robin implementation
│   │   └── SRTF.c                            # SRTF implementation
│   ├── Data Structures/
│   │   ├── Doubly_sorted_linked_queue.c      # Doubly sorted linked list
│   │   ├── Doubly_sorted_linked_queue.h
│   │   ├── Circular_Linked_queue.c           # Circular linked queue
│   │   └── Circular_Linked_queue.h
│   ├── main.c                                # Entry point; parses input & outputs JSON
│   ├── scheduler.h                           # Shared structs: Process, GanttSegment, SimulationResult
│   ├── Makefile                              # Build file for the C engine
│   └── datafromC.json                        # Sample JSON output for reference
│
├── BackEnd/                                  # Node.js API server
│   ├── app.js                                # HTTP server; validates payload & invokes C engine
│   ├── package.json
│   └── package-lock.json
│
├── FrontEnd/                                 # Static web client
│   ├── index.html                            # Main UI (Tailwind CSS)
│   ├── script.js                             # UI logic, Gantt player engine, analysis rendering
│   ├── api.js                                # Fetch wrapper for the backend API
│   └── style.css                             # Custom Gantt chart and control styles
│
├── assets/
│   └── screenshots/                          # Interface and Gantt chart screenshots
│
├── test-cases/                               # Documented test scenarios with inputs and outputs
│   ├── scenario-A.md
│   ├── scenario-B.md
│   ├── scenario-C.md
│   ├── scenario-D.md
│   └── scenario-E.md
│
├── run.js                                    # One-command launcher for both servers
├── .gitignore
└── README.md
```

---

## Requirements

### C Engine

- GCC compiler (`gcc`)
- C17 standard or higher
- Standard libraries only: `stdio.h`, `stdlib.h`, `string.h`, `stdbool.h`, `limits.h`

### Backend

- **Node.js** v18 or higher
- **npm** v9 or higher
- Only dev dependency: `nodemon` (auto-installed by `run.js`)

### Frontend

- Any modern browser (Chrome, Firefox, Edge, Safari)
- No build step required — served as static files
- CDN dependencies loaded automatically:
  - [Tailwind CSS](https://cdn.tailwindcss.com)
  - [Font Awesome 6.5.1](https://cdnjs.cloudflare.com)
  - [Google Fonts — Inter & JetBrains Mono](https://fonts.google.com)

---

## Build & Run Instructions

### Step 1 — Compile the C Scheduling Engine

```bash
cd C
make
```

This produces the `scheduler_engine` binary. The backend references it at `../C/scheduler_engine`.

> **Windows users:** Run the following from inside the `C/` directory:
>
> ```bash
> gcc -Wall -Wextra -O2 -o main.exe main.c "Scheduling Algorithms/Round_Robin.c" "Scheduling Algorithms/SRTF.c"
> ```
>
> Then confirm that the `enginePath` variable in `BackEnd/app.js` is set to `"../C/main.exe"`.

---

### Step 2 — Start Both Servers

From the project root:

```bash
node run.js
```

This single command:

1. Starts a static file server for the frontend at `http://localhost:5500`
2. Installs backend `node_modules` automatically if missing
3. Starts the Node.js API server at `http://localhost:3000`

To verify the setup without starting anything:

```bash
node run.js --dry-run
```

---

### Step 3 — Open the Application

Navigate to **[http://localhost:5500](http://localhost:5500)** in your browser.

---

### Alternative: Start Servers Manually

**Backend only:**

```bash
cd BackEnd
npm install
npm run server
# API available at http://localhost:3000
```

**Frontend only:**

```bash
# Open FrontEnd/index.html directly in a browser, or serve it:
npx serve FrontEnd
```

---

## Test Scenarios

All five scenarios are preloaded in the UI via the **"Load Test Scenario"** dropdown. Each scenario can be loaded and run without manual data entry.

---

### Scenario A — Basic Mixed Workload

**Quantum:** 4

| Process | Arrival Time | CPU Burst |
| ------- | ------------ | --------- |
| P1      | 0            | 10        |
| P2      | 2            | 5         |
| P3      | 4            | 8         |
| P4      | 5            | 2         |

**Purpose:** Establishes a baseline with a normal mixed workload — a variety of burst lengths arriving at different times. Both algorithms are compared under standard conditions with a moderate quantum.

**Expected behavior:**

- **SRTF** immediately preempts longer jobs when P4 (burst=2) and P2 (burst=5) arrive, finishing short jobs early and achieving a lower average WT and TAT.
- **RR** with quantum=4 gives each process a fair turn; P1 and P3 are not starved, and response times are more evenly distributed.
- SRTF is more efficient on average metrics; RR is more fair to all processes.

---

### Scenario B — Quantum Sensitivity Case

**Quantum:** 1 (same processes as Scenario A)

| Process | Arrival Time | CPU Burst |
| ------- | ------------ | --------- |
| P1      | 0            | 10        |
| P2      | 2            | 5         |
| P3      | 4            | 8         |
| P4      | 5            | 2         |

**Purpose:** Demonstrates how reducing the quantum drastically changes Round Robin behavior. The quantum is set to 1 — the smallest meaningful value — to expose the cost of excessive context switching and the corresponding gain in responsiveness.

**Expected behavior:**

- **RR** Gantt chart becomes highly fragmented with many individual segments. Context-switch overhead increases significantly, raising average TAT compared to Scenario A.
- **RR** response time for each process improves because every process gets a CPU slice within 1 time unit of any other process receiving one.
- **SRTF** results are identical to Scenario A — it is unaffected by the quantum.
- **Key insight:** A very small quantum improves first response time but degrades throughput efficiency in RR.

---

### Scenario C — Short-Job-Heavy Case

**Quantum:** 3

| Process | Arrival Time | CPU Burst |
| ------- | ------------ | --------- |
| P1      | 0            | 15        |
| P2      | 1            | 2         |
| P3      | 2            | 1         |
| P4      | 3            | 3         |
| P5      | 4            | 2         |

**Purpose:** Places one long job alongside four short jobs to make SRTF's preemption behavior and the starvation risk clearly visible.

**Expected behavior:**

- **SRTF** immediately preempts P1 each time a shorter job arrives. P3 (burst=1) completes by time 3; P2 and P5 complete shortly after. P1 is continuously deferred and finishes last despite arriving first, resulting in a very high waiting time for that one process.
- **RR** allocates time slices to P1 regularly every quantum interval, preventing starvation and giving P1 a predictable, bounded completion time.
- **Key insight:** SRTF minimizes the system's average WT at the direct expense of long jobs. RR prevents starvation through guaranteed time slicing.

---

### Scenario D — Interactive-Style Fairness Case

**Quantum:** 2

| Process | Arrival Time | CPU Burst |
| ------- | ------------ | --------- |
| P1      | 0            | 8         |
| P2      | 0            | 8         |
| P3      | 0            | 8         |
| P4      | 0            | 8         |

**Purpose:** All four processes arrive simultaneously with identical burst times — the ideal scenario for evaluating Round Robin's fairness guarantee and exposing SRTF's inability to differentiate equal-length jobs.

**Expected behavior:**

- **RR** distributes CPU perfectly and equally. All four processes receive their first response within the first 2 time units. All finish at similar times with nearly equal WT, TAT, and RT — the ideal result for an interactive workload.
- **SRTF** degenerates to First-Come-First-Served (FCFS) since all remaining times are always equal. P1 finishes first; P4 finishes last with a waiting time of 24 — nearly three times that of P1.
- **Key insight:** RR is strictly fairer than SRTF for simultaneous equal-burst workloads, giving all processes fast first response.

---

### Scenario E — Validation Case

**Quantum:** -2 | **Processes:** none

**Purpose:** Tests all layers of input validation in the frontend before any request reaches the backend.

**Expected behavior:**

- With no processes in the table, clicking **"Run Simulation"** shows:
  > _"⚠️ Please add at least one process!"_
- If at least one process is added but the quantum remains -2, clicking **"Run Simulation"** shows:
  > _"⚠️ Time Quantum must be a positive number (greater than 0)!"_
- No API request is ever sent; the C engine is never invoked.
- The backend additionally validates payload structure and rejects malformed requests with a `400 Bad Request` error response.
- **Key insight:** Input validation is enforced at the frontend layer with clear alerts, and enforced again at the backend layer for API-level safety.

---

## Analysis Questions & Answers

### 1. Which algorithm gave better average waiting time?

**SRTF** consistently gives a lower average waiting time across all scenarios. By always running the process with the shortest remaining burst, it minimizes the time processes spend idle in the ready queue. In Scenario A (quantum=4) the advantage is measurable; in Scenario C (short-job-heavy) the gap widens substantially as short jobs skip ahead of P1.

### 2. Which algorithm gave better response time?

It depends on the workload composition. **Round Robin** gave better and more predictable average response time across all processes, because every process receives its first CPU slice within at most `(n−1) × quantum` time units — a hard upper bound. **SRTF** gives excellent first response to short jobs, but can delay long jobs significantly if short jobs keep arriving, making its response time highly variable and unfair to long-burst processes.

### 3. Did Round Robin appear fairer across all processes?

**Yes.** Round Robin guaranteed that no process waited indefinitely. In Scenario D, all four processes with equal burst times and arrival times received identical waiting and turnaround times — a result that SRTF could not achieve. In Scenario C, RR continued to give P1 regular CPU time even as short jobs arrived, preventing the starvation that SRTF imposed on P1.

### 4. Did SRTF complete short jobs faster?

**Yes.** SRTF immediately preempts the running process the moment a shorter job arrives. In Scenario C, P3 (burst=1) completed by time 3 and P2 (burst=2) completed shortly after — well ahead of their RR completion times. The benefit to short jobs is significant and directly visible in the Gantt chart as bursts of rapid completion early in the timeline.

### 5. How did the selected quantum affect the Round Robin results?

Quantum size is the single most important tuning parameter for Round Robin:

- A **smaller quantum** (Scenario B, quantum=1) improves first response time for all processes but fragments the Gantt chart heavily, increasing context-switch overhead and raising average TAT compared to Scenario A.
- A **larger quantum** (Scenario A, quantum=4) reduces overhead and improves throughput but increases the time a process must wait before its first CPU slice, degrading interactivity.
- If the quantum exceeds the maximum burst time in the workload, RR degenerates to FCFS — losing all its fairness and responsiveness advantages.

### 6. Which algorithm would you recommend for the tested workload, and why?

- **For interactive or time-sharing systems** (Scenario D workload): **Round Robin** is recommended. Its fairness guarantee means no process is neglected, response times are bounded and predictable, and all users experience similar wait times.
- **For batch systems dominated by short jobs** (Scenario C workload): **SRTF** is recommended. It minimizes average waiting time and maximizes throughput when burst times vary widely and starvation of long jobs is acceptable.
- **For general mixed workloads** (Scenario A): SRTF offers better overall efficiency, but RR should be chosen if starvation prevention or predictable response time is a system requirement.

---

## Final Conclusion

### Which algorithm performed better on each major metric?

| Metric                     | Better Algorithm | Notes                                                                            |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| Average Waiting Time       | **SRTF**         | Always runs the shortest remaining job, minimizing idle time system-wide         |
| Average Turnaround Time    | **SRTF**         | Shorter jobs finish earlier, pulling the overall average down                    |
| Average Response Time      | **Round Robin**  | Every process gets its first turn within a bounded time frame                    |
| Fairness across processes  | **Round Robin**  | Time slicing prevents starvation; no process is indefinitely delayed             |
| Short-job completion speed | **SRTF**         | Immediate preemption lets short jobs complete without waiting behind longer ones |

### Did Round Robin appear fairer?

**Yes.** Round Robin demonstrated consistent fairness in every test scenario. No process was starved. In Scenario D, all four processes with equal burst times and arrival times received identical WT, TAT, and RT — a result that SRTF (which ran them sequentially like FCFS) could not achieve. In Scenario C, Round Robin continued to give P1 regular CPU time throughout the simulation, bounding its waiting time even as short jobs arrived continuously. RR's time-slicing mechanism is a structural fairness guarantee, not a coincidence of workload.

### Did SRTF appear more efficient?

**Yes.** SRTF produced the minimum possible average waiting time in every scenario. By immediately preempting the running process when a shorter job arrives, it directs CPU time where it yields the fastest overall completion. In Scenario C this advantage is dramatic: the four short jobs (burst 1–3) all complete before time 10, while the system's average WT and TAT are far lower than under RR. This efficiency comes at a direct cost — long jobs can suffer severe starvation, as clearly shown by P1's high waiting time in Scenario C.

### What was the observed effect of the selected quantum?

The quantum is the critical tuning parameter that determines Round Robin's character. Scenario B (quantum=1 vs Scenario A's quantum=4) makes this concrete: the smaller quantum fragmented the Gantt chart into many short slices, increasing context-switch overhead and raising average TAT, while improving first response time for all processes. A quantum that is too large causes RR to behave like FCFS — processes wait through the full burst of every process ahead of them before getting their first turn. The ideal quantum is one that keeps response time acceptable while allowing enough CPU time per slice for meaningful progress, typically calibrated close to the median burst time of the expected workload.

## Screenshots

Place all screenshots in [screenshots](screenshots/). Recommended captures:

---

## API Reference

The backend exposes a single endpoint.

### `POST /api/analyze`

**Request body:**

```json
{
  "quantum": 4,
  "processes": [
    { "pid": "P1", "at": 0, "bt": 10 },
    { "pid": "P2", "at": 2, "bt": 5 },
    { "pid": "P3", "at": 4, "bt": 8 },
    { "pid": "P4", "at": 5, "bt": 2 }
  ]
}
```

**Successful response `200`:**

```json
{
  "success": true,
  "data": {
    "rr": {
      "gantt": [
        { "pid": "P1", "arrival": 0, "start": 0, "end": 4 },
        { "pid": "P2", "arrival": 2, "start": 4, "end": 8 }
      ],
      "metrics": { "avg_wt": 5.25, "avg_tat": 10.75, "avg_rt": 2.0 },
      "processes": [
        { "pid": "P1", "arrival": 0, "burst": 10, "wt": 8, "tat": 18, "rt": 0 }
      ]
    },
    "srtf": { "...": "..." }
  }
}
```

**Validation error response `400`:**

```json
{
  "error": "Invalid payload",
  "expected": {
    "quantum": "number",
    "processes": [{ "pid": "string", "at": "number", "bt": "number" }]
  }
}
```

---

## License

MIT
