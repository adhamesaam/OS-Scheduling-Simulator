#include "../scheduler.h"
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <limits.h>

SimulationResult run_srtf(Process processes[], int num_processes) {
    SimulationResult res;
    res.gantt_count = 0;
    res.avg_wt = 0;
    res.avg_tat = 0;
    res.avg_rt = 0;

    int current_time = 0;
    int completed_count = 0;

    for (int i = 0; i < num_processes; i++) {
        processes[i].remaining_time = processes[i].burst_time;
        processes[i].first_start_time = -1;
    }

    int current_pid_idx = -1;

    while (completed_count < num_processes) {
        int shortest_idx = -1;
        int min_remaining = INT_MAX;

        for (int i = 0; i < num_processes; i++) {
            if (processes[i].arrival_time <= current_time && processes[i].remaining_time > 0) {
                if (processes[i].remaining_time < min_remaining) {
                    min_remaining = processes[i].remaining_time;
                    shortest_idx = i;
                } else if (processes[i].remaining_time == min_remaining) {
                    // Tie breaker: Arrival time
                    if (processes[i].arrival_time < processes[shortest_idx].arrival_time) {
                        shortest_idx = i;
                    }
                }
            }
        }

        if (shortest_idx == -1) {
            // No process available, jump time
            int next_arrival = INT_MAX;
            for (int i = 0; i < num_processes; i++) {
                 if (processes[i].remaining_time > 0 && processes[i].arrival_time < next_arrival) {
                     next_arrival = processes[i].arrival_time;
                 }
            }
            if (next_arrival != INT_MAX) {
                current_time = next_arrival;
            } 
            current_pid_idx = -1;
            continue;
        }

        if (processes[shortest_idx].first_start_time == -1) {
            processes[shortest_idx].first_start_time = current_time;
            processes[shortest_idx].response_time = current_time - processes[shortest_idx].arrival_time;
        }

        if (current_pid_idx != shortest_idx) {
            strcpy(res.gantt[res.gantt_count].process_id, processes[shortest_idx].process_id);
            res.gantt[res.gantt_count].start_time = current_time;
            res.gantt[res.gantt_count].end_time = current_time + 1;
            res.gantt_count++;
            current_pid_idx = shortest_idx;
        } else {
            res.gantt[res.gantt_count - 1].end_time = current_time + 1;
        }

        processes[shortest_idx].remaining_time--;
        current_time++;

        if (processes[shortest_idx].remaining_time == 0) {
            processes[shortest_idx].completion_time = current_time;
            processes[shortest_idx].turnaround_time = processes[shortest_idx].completion_time - processes[shortest_idx].arrival_time;
            processes[shortest_idx].waiting_time = processes[shortest_idx].turnaround_time - processes[shortest_idx].burst_time;
            completed_count++;
            current_pid_idx = -1;
        }
    }

    double total_wt = 0, total_tat = 0, total_rt = 0;
    if (num_processes > 0) {
        for (int i = 0; i < num_processes; i++) {
            total_wt += processes[i].waiting_time;
            total_tat += processes[i].turnaround_time;
            total_rt += processes[i].response_time;
        }
        res.avg_wt = total_wt / num_processes;
        res.avg_tat = total_tat / num_processes;
        res.avg_rt = total_rt / num_processes;
    }

    return res;
}
