document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const displayElement = document.getElementById('selectedAlgorithmDisplay');
    const nameElement = document.getElementById('selectedAlgorithmName');
    const dropdownButton = document.getElementById('algorithmDropdown');
    const quantumInputGroup = document.getElementById('quantumInputGroup');
    const priorityColumns = document.querySelectorAll('.priority-column');
    const processTableBody = document.getElementById('processTableBody');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const runSimulationBtn = document.getElementById('runSimulationBtn');
    const resultsSection = document.getElementById('resultsSection');
    
    let processCount = 1;
    let needsPriority = false;
    let currentAlgorithm = null;

    // Algorithm selection functionality
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const algo = this.getAttribute('data-algo');
            const needsQuantum = this.hasAttribute('data-needs-quantum');
            needsPriority = this.hasAttribute('data-needs-priority');
            currentAlgorithm = algo;
            
            // Update display
            nameElement.textContent = algo;
            displayElement.style.display = 'block';
            
            // Update dropdown button
            dropdownButton.textContent = algo;
            
            // Show/hide quantum input
            if (needsQuantum) {
                quantumInputGroup.classList.remove('hidden');
            } else {
                quantumInputGroup.classList.add('hidden');
            }
            
            // Show/hide priority column
            togglePriorityColumn(needsPriority);
        });
    });

    // Add process functionality
    addProcessBtn.addEventListener('click', function() {
        processCount++;
        const newRow = document.createElement('tr');
        
        let rowHtml = `
            <td>P${processCount}</td>
            <td><input type="number" class="form-control arrival-time" min="0" value="0"></td>
            <td><input type="number" class="form-control burst-time" min="1" value="1"></td>
        `;
        
        if (needsPriority) {
            rowHtml += `<td><input type="number" class="form-control priority" min="1" value="1"></td>`;
        }
        
        rowHtml += `<td class="text-center"><button class="btn btn-danger btn-sm delete-btn">Delete</button></td>`;
        
        newRow.innerHTML = rowHtml;
        processTableBody.appendChild(newRow);
        
        // Add event listener to delete button
        newRow.querySelector('.delete-btn').addEventListener('click', function() {
            processTableBody.removeChild(newRow);
        });
    });

    // Add delete functionality to initial row
    document.querySelector('.delete-btn').addEventListener('click', function() {
        processTableBody.removeChild(this.closest('tr'));
    });

    // Run simulation functionality
    runSimulationBtn.addEventListener('click', function() {
        if (!currentAlgorithm) {
            alert('Please select an algorithm first');
            return;
        }

        const processes = getProcessesFromTable();
        if (processes.length === 0) {
            alert('Please add at least one process');
            return;
        }

        let results;
        const contextSwitchTime = parseInt(document.getElementById('contextSwitchTime').value) || 0;

        switch(currentAlgorithm) {
            case 'FCFS':
                results = fcfs(processes, contextSwitchTime);
                break;
            case 'SJF':
                results = sjf(processes, contextSwitchTime);
                break;
            case 'SRTF':
                results = srtf(processes, contextSwitchTime);
                break;
            case 'Round Robin':
                const quantum = parseInt(document.getElementById('timeQuantum').value) || 4;
                results = roundRobin(processes, quantum, contextSwitchTime);
                break;
            case 'Priority':
                results = priority(processes, contextSwitchTime);
                break;
            default:
                alert('Invalid algorithm selected');
                return;
        }

        displayResults(processes, results);
        resultsSection.classList.remove('hidden');
    });

    function togglePriorityColumn(show) {
        priorityColumns.forEach(col => {
            col.style.display = show ? 'table-cell' : 'none';
        });
        
        // Update existing rows
        const rows = processTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const actionCell = cells[cells.length - 1]; // Last cell is action
            
            if (show) {
                if (cells.length === 4) { // Only if priority column doesn't exist
                    const newCell = document.createElement('td');
                    newCell.innerHTML = `<input type="number" class="form-control priority" min="1" value="1">`;
                    row.insertBefore(newCell, actionCell);
                }
            } else {
                if (cells.length === 5) { // Only if priority column exists
                    row.removeChild(cells[3]); // Remove priority cell
                }
            }
        });
    }

    function getProcessesFromTable() {
        const processes = [];
        const rows = processTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const processId = cells[0].textContent;
            const arrivalTime = parseInt(cells[1].querySelector('input').value) || 0;
            const burstTime = parseInt(cells[2].querySelector('input').value) || 1;
            let priority = 1;
            
            if (needsPriority && cells.length > 4) {
                priority = parseInt(cells[3].querySelector('input').value) || 1;
            }
            
            processes.push({
                id: processId,
                arrivalTime: arrivalTime,
                burstTime: burstTime,
                priority: priority,
                remainingTime: burstTime // Add this for SRTF and RR
            });
        });
        
        return processes;
    }

    // FIXED: FCFS Algorithm - First Come First Served
    function fcfs(processes, contextSwitchTime) {
        // Create a deep copy to avoid modifying the original processes
        const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        const result = [];

        for (const process of sortedProcesses) {
            // If there's a gap between current time and process arrival, add idle time
            if (currentTime < process.arrivalTime) {
                currentTime = process.arrivalTime;
            }
            
            const start = currentTime;
            const end = currentTime + process.burstTime;
            
            result.push({ id: process.id, start, end });
            
            // Update current time and add context switch time if not the last process
            currentTime = end;
            if (process !== sortedProcesses[sortedProcesses.length - 1]) {
                currentTime += contextSwitchTime;
            }
        }
        
        return result;
    }

    // FIXED: SJF Algorithm - Shortest Job First (Non-preemptive)
    function sjf(processes, contextSwitchTime) {
        // Create deep copies to avoid modifying the original processes
        const processesCopy = processes.map(p => ({...p, completed: false}));
        const result = [];
        let currentTime = 0;
        let completedCount = 0;
        
        while (completedCount < processesCopy.length) {
            // Find available processes at current time
            const availableProcesses = processesCopy.filter(
                p => p.arrivalTime <= currentTime && !p.completed
            );
            
            if (availableProcesses.length === 0) {
                // No process available yet, move time to next arrival
                const nextArrival = processesCopy
                    .filter(p => !p.completed && p.arrivalTime > currentTime)
                    .reduce((min, p) => Math.min(min, p.arrivalTime), Infinity);
                
                currentTime = nextArrival;
                continue;
            }
            
            // Find the process with shortest burst time
            const shortestJob = availableProcesses.reduce(
                (shortest, p) => p.burstTime < shortest.burstTime ? p : shortest,
                availableProcesses[0]
            );
            
            // Execute this process
            const start = currentTime;
            const end = currentTime + shortestJob.burstTime;
            
            result.push({ id: shortestJob.id, start, end });
            
            // Mark process as completed and update time
            shortestJob.completed = true;
            completedCount++;
            currentTime = end;
            
            // Add context switch time if there are more processes to execute
            if (completedCount < processesCopy.length) {
                currentTime += contextSwitchTime;
            }
        }
        
        return result;
    }

    // FIXED: SRTF Algorithm - Shortest Remaining Time First (Preemptive)
    function srtf(processes, contextSwitchTime) {
        // Create deep copies to avoid modifying the original processes
        const processesCopy = processes.map(p => ({
            ...p, 
            remainingTime: p.burstTime,
            completed: false
        }));
        
        const result = [];
        let currentTime = 0;
        let completedCount = 0;
        let currentProcess = null;
        let lastSwitchTime = 0;
        
        while (completedCount < processesCopy.length) {
            // Find the process with the shortest remaining time among arrived processes
            const availableProcesses = processesCopy.filter(
                p => p.arrivalTime <= currentTime && !p.completed && p.remainingTime > 0
            );
            
            if (availableProcesses.length === 0) {
                // No process available yet, find next arrival time
                const nextArrival = processesCopy
                    .filter(p => !p.completed && p.arrivalTime > currentTime)
                    .reduce((min, p) => Math.min(min, p.arrivalTime), Infinity);
                
                // If there was a process running before, end its execution block
                if (currentProcess) {
                    result[result.length - 1].end = currentTime;
                    currentProcess = null;
                }
                
                currentTime = nextArrival;
                continue;
            }
            
            // Find process with shortest remaining time
            const shortestProcess = availableProcesses.reduce(
                (shortest, p) => p.remainingTime < shortest.remainingTime ? p : shortest,
                availableProcesses[0]
            );
            
            // Process switch logic
            if (currentProcess !== shortestProcess.id) {
                // If a different process was running, end its block
                if (currentProcess !== null) {
                    result[result.length - 1].end = currentTime;
                    // Add context switch time
                    currentTime += contextSwitchTime;
                }
                
                // Start new process block
                result.push({ 
                    id: shortestProcess.id, 
                    start: currentTime,
                    end: null // End time will be set later
                });
                
                currentProcess = shortestProcess.id;
                lastSwitchTime = currentTime;
            }
            
            // Calculate how long this process will run
            let runUntil = currentTime + shortestProcess.remainingTime;
            
            // Check if another process will arrive earlier with shorter remaining time
            const nextInterruption = processesCopy
                .filter(p => p.arrivalTime > currentTime && p.arrivalTime < runUntil && p.remainingTime < (shortestProcess.remainingTime - (p.arrivalTime - currentTime)))
                .reduce((earliest, p) => Math.min(earliest, p.arrivalTime), Infinity);
            
            if (nextInterruption !== Infinity) {
                runUntil = nextInterruption;
            }
            
            // Calculate execution time in this interval
            const executionTime = runUntil - currentTime;
            shortestProcess.remainingTime -= executionTime;
            currentTime = runUntil;
            
            // Check if this process is completed
            if (shortestProcess.remainingTime === 0) {
                shortestProcess.completed = true;
                completedCount++;
                
                // End the current execution block
                result[result.length - 1].end = currentTime;
                currentProcess = null;
            }
        }
        
        // Ensure the last process has an end time
        if (result.length > 0 && result[result.length - 1].end === null) {
            result[result.length - 1].end = currentTime;
        }
        
        return result;
    }

    // FIXED: Round Robin Algorithm
    function roundRobin(processes, quantum, contextSwitchTime) {
        // Create deep copies to avoid modifying the original processes
        const processesCopy = processes.map(p => ({
            ...p, 
            remainingTime: p.burstTime,
            completed: false
        }));
        
        const result = [];
        let currentTime = 0;
        let completedCount = 0;
        
        // Find the earliest arrival time
        const earliestArrival = processesCopy.reduce(
            (min, p) => Math.min(min, p.arrivalTime), Infinity
        );
        currentTime = earliestArrival;
        
        // Ready queue to hold processes that have arrived and are waiting for CPU
        const readyQueue = [];
        
        // Initially, add all processes that arrive at the earliest time
        processesCopy
            .filter(p => p.arrivalTime === earliestArrival)
            .forEach(p => readyQueue.push(p));
        
        while (completedCount < processesCopy.length) {
            if (readyQueue.length === 0) {
                // No process in ready queue, find next arrival
                const notArrivedProcesses = processesCopy.filter(
                    p => !p.completed && p.arrivalTime > currentTime
                );
                
                if (notArrivedProcesses.length === 0) break; // All processes are completed
                
                const nextArrival = notArrivedProcesses.reduce(
                    (min, p) => Math.min(min, p.arrivalTime), Infinity
                );
                
                // Move time to next arrival and add all processes arriving at this time
                currentTime = nextArrival;
                processesCopy
                    .filter(p => p.arrivalTime === nextArrival && !p.completed)
                    .forEach(p => readyQueue.push(p));
                    
                continue;
            }
            
            // Get the next process from the ready queue
            const currentProcess = readyQueue.shift();
            
            // Calculate execution time for this quantum
            const executeTime = Math.min(currentProcess.remainingTime, quantum);
            const start = currentTime;
            const end = currentTime + executeTime;
            
            // Add to Gantt chart
            result.push({ id: currentProcess.id, start, end });
            
            // Update process remaining time and current time
            currentProcess.remainingTime -= executeTime;
            currentTime = end;
            
            // Check for newly arrived processes during this time quantum
            const arrivedProcesses = processesCopy.filter(
                p => p.arrivalTime > start && p.arrivalTime <= end && !p.completed
            );
            readyQueue.push(...arrivedProcesses);
            
            // Check if the process is completed
            if (currentProcess.remainingTime <= 0) {
                currentProcess.completed = true;
                completedCount++;
            } else {
                // Process still has remaining work, put it back in the queue
                readyQueue.push(currentProcess);
            }
            
            // Add context switch time if there are more processes to execute
            if (readyQueue.length > 0) {
                currentTime += contextSwitchTime;
            }
        }
        
        return result;
    }

    // FIXED: Priority Algorithm (Non-preemptive)
    function priority(processes, contextSwitchTime) {
        // Create deep copies to avoid modifying the original processes
        const processesCopy = processes.map(p => ({...p, completed: false}));
        const result = [];
        let currentTime = 0;
        let completedCount = 0;
        
        while (completedCount < processesCopy.length) {
            // Find available processes at current time
            const availableProcesses = processesCopy.filter(
                p => p.arrivalTime <= currentTime && !p.completed
            );
            
            if (availableProcesses.length === 0) {
                // No process available yet, move time to next arrival
                const nextArrival = processesCopy
                    .filter(p => !p.completed && p.arrivalTime > currentTime)
                    .reduce((min, p) => Math.min(min, p.arrivalTime), Infinity);
                
                currentTime = nextArrival;
                continue;
            }
            
            // Find the process with highest priority (lowest priority number)
            const highestPriorityProcess = availableProcesses.reduce(
                (highest, p) => p.priority < highest.priority ? p : highest,
                availableProcesses[0]
            );
            
            // Execute this process
            const start = currentTime;
            const end = currentTime + highestPriorityProcess.burstTime;
            
            result.push({ id: highestPriorityProcess.id, start, end });
            
            // Mark process as completed and update time
            highestPriorityProcess.completed = true;
            completedCount++;
            currentTime = end;
            
            // Add context switch time if there are more processes to execute
            if (completedCount < processesCopy.length) {
                currentTime += contextSwitchTime;
            }
        }
        
        return result;
    }

    function displayResults(processes, ganttResults) {
        // Calculate metrics for each process
        const processMap = {};
        processes.forEach(p => {
            processMap[p.id] = {
                ...p,
                completionTime: 0,
                turnaroundTime: 0,
                waitingTime: 0,
                responseTime: -1
            };
        });

        // Calculate completion time and response time
        ganttResults.forEach(block => {
            const process = processMap[block.id];
            if (block.end > process.completionTime) {
                process.completionTime = block.end;
            }
            if (process.responseTime === -1) {
                process.responseTime = block.start - process.arrivalTime;
            }
        });

        // Calculate turnaround and waiting time
        let totalTurnaround = 0, totalWaiting = 0, totalResponse = 0;
        Object.values(processMap).forEach(p => {
            p.turnaroundTime = p.completionTime - p.arrivalTime;
            p.waitingTime = p.turnaroundTime - p.burstTime;
            totalTurnaround += p.turnaroundTime;
            totalWaiting += p.waitingTime;
            totalResponse += p.responseTime;
        });

        const processCount = processes.length;
        const avgTurnaround = totalTurnaround / processCount;
        const avgWaiting = totalWaiting / processCount;
        const avgResponse = totalResponse / processCount;
        const throughput = processCount / ganttResults[ganttResults.length - 1].end;

        // Display Gantt Chart - Simplified version
        const ganttChart = document.getElementById('ganttChart');
        const ganttTime = document.getElementById('ganttTime');
        ganttChart.innerHTML = '';
        ganttTime.innerHTML = '';

        // Create a process-to-color mapping for consistency
        const processColors = {};
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
        let colorIndex = 0;
        
        // Assign colors to each unique process ID
        processes.forEach(process => {
            if (!processColors[process.id]) {
                processColors[process.id] = colors[colorIndex % colors.length];
                colorIndex++;
            }
        });
        
        let lastEnd = 0;
        
        // Create a container for both blocks and time labels
        const ganttContainer = document.createElement('div');
        ganttContainer.className = 'gantt-container';
        ganttChart.appendChild(ganttContainer);
        
        // Sort blocks by start time to ensure chronological display
        const sortedBlocks = [...ganttResults].sort((a, b) => a.start - b.start);
        
        sortedBlocks.forEach((block) => {
            const duration = block.end - block.start;
            
            // Check for idle time between blocks
            if (block.start > lastEnd) {
                const idleTime = block.start - lastEnd;
                
                // Create idle block
                const idleBlock = document.createElement('div');
                idleBlock.className = 'gantt-block idle-block';
                idleBlock.style.width = `${idleTime * 30}px`;
                idleBlock.style.backgroundColor = '#e0e0e0';
                idleBlock.innerHTML = `<span class="process-id">Idle</span>`;
                idleBlock.title = `Idle: ${lastEnd}-${block.start}`;
                ganttContainer.appendChild(idleBlock);
                
                // Add start time label for idle block
                const idleStartLabel = document.createElement('div');
                idleStartLabel.className = 'time-label';
                idleStartLabel.textContent = lastEnd;
                idleBlock.appendChild(idleStartLabel);
            }
            
            // Create process block
            const blockElement = document.createElement('div');
            blockElement.className = 'gantt-block';
            blockElement.style.width = `${duration * 30}px`;
            blockElement.style.backgroundColor = processColors[block.id] || '#808080';
            blockElement.innerHTML = `<span class="process-id">${block.id}</span>`;
            blockElement.title = `${block.id}: ${block.start}-${block.end}`;
            ganttContainer.appendChild(blockElement);
            
            // Add start time label
            if (block.start === 0 || block.start > lastEnd) {
                const startLabel = document.createElement('div');
                startLabel.className = 'time-label';
                startLabel.textContent = block.start;
                blockElement.appendChild(startLabel);
            }
            
            // Add end time label
            const endLabel = document.createElement('div');
            endLabel.className = 'time-label end-label';
            endLabel.textContent = block.end;
            blockElement.appendChild(endLabel);
            
            lastEnd = block.end;
        });

        // Display results table
        const resultsTableBody = document.getElementById('resultsTableBody');
        resultsTableBody.innerHTML = '';

        Object.values(processMap).forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.arrivalTime}</td>
                <td>${p.burstTime}</td>
                ${needsPriority ? `<td>${p.priority}</td>` : ''}
                <td>${p.completionTime}</td>
                <td>${p.turnaroundTime}</td>
                <td>${p.waitingTime}</td>
                <td>${p.responseTime}</td>
            `;
            resultsTableBody.appendChild(row);
        });

        // Display performance metrics
        document.getElementById('avgTurnaround').textContent = avgTurnaround.toFixed(2);
        document.getElementById('avgWaiting').textContent = avgWaiting.toFixed(2);
        document.getElementById('avgResponse').textContent = avgResponse.toFixed(2);
        document.getElementById('throughput').textContent = throughput.toFixed(4);
    }
});