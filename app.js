const App = {
    // 1. Ιδιότητες
    inputs: [], 
    problemContainer: null,
    lcmEquationContainer: null,
    checkBtn: null,
    practiceModeBtn: null,
    startGameBtn: null,
    resultContainer: null,
    gameProgress: null,
    practiceLink: null,

    // State
    currentNumbers: [], 
    isInGameMode: false,
    gameProblems: [],
    gameCurrentProblemIndex: 0,
    gameTotalCells: 0,
    gameCorrectCells: 0,
    gameReportData: [],

    // 2. Αρχικοποίηση
    initPracticeMode: function() {
        this.isInGameMode = false;
        this.inputs = [
            document.getElementById('num1'),
            document.getElementById('num2'),
            document.getElementById('num3'),
            document.getElementById('num4'),
            document.getElementById('num5')
        ];
        this.problemContainer = document.getElementById('problemContainer');
        this.lcmEquationContainer = document.getElementById('lcmEquationContainer');
        this.checkBtn = document.getElementById('checkBtn');
        this.practiceModeBtn = document.getElementById('practiceModeBtn');
        this.resultContainer = document.getElementById('resultContainer');

        this.checkBtn.addEventListener('click', this.handleCheck.bind(this));
        this.practiceModeBtn.addEventListener('click', this.generatePracticeProblem.bind(this));
        
        this.inputs.forEach(input => {
            if (input) {
                input.addEventListener('change', this.handleNumberChange.bind(this));
                input.addEventListener('keyup', (e) => {
                    if(e.key === 'Enter') { this.handleNumberChange(); e.target.blur(); }
                });
            }
        });
        
        // --- ΝΕΟ: Cheat Key (PageUp) και στην Εξάσκηση ---
        document.addEventListener('keydown', (e) => {
            // Ελέγχουμε αν ΔΕΝ είμαστε σε game mode (για να μην τρέξει διπλά αν αλλάξει η λογική αργότερα)
            // και αν πατήθηκε το PageUp
            if (!this.isInGameMode && e.key === 'PageUp') {
                e.preventDefault();
                this.fillCorrectAnswers();
            }
        });

        this.generatePracticeProblem();
    },

    initGameMode: function() {
        this.isInGameMode = true;
        this.inputs = [
            document.getElementById('num1'),
            document.getElementById('num2'),
            document.getElementById('num3')
        ];
        this.problemContainer = document.getElementById('problemContainer');
        this.lcmEquationContainer = document.getElementById('lcmEquationContainer');
        this.checkBtn = document.getElementById('checkBtn');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.resultContainer = document.getElementById('resultContainer');
        this.gameProgress = document.getElementById('gameProgress');
        this.practiceLink = document.querySelector('.practice-link');

        this.checkBtn.addEventListener('click', this.handleCheck.bind(this));
        this.startGameBtn.addEventListener('click', this.startGame.bind(this));
        
        window.addEventListener('beforeunload', (e) => {
            if (this.isInGameMode) {
                e.preventDefault();
                e.returnValue = 'Έχετε μη αποθηκευμένη πρόοδο.';
            }
        });
        
        // Cheat key (PageUp) στο Game Mode
        document.addEventListener('keydown', (e) => {
            if (this.isInGameMode && e.key === 'PageUp') {
                e.preventDefault();
                this.fillCorrectAnswers();
            }
        });

        this.startGame();
    },

    // 3. Μαθηματική Λογική & Helpers
    isPrime: function(num) {
        if (num < 2) return false;
        for (let i = 2; i * i <= num; i++) {
            if (num % i === 0) return false;
        }
        return true;
    },

    nextPrime: function(after) {
        let n = after + 1;
        while (!this.isPrime(n)) n++;
        return n;
    },

    solveCanonicalLCM: function(numbers) {
        let current = numbers.filter(n => n > 0);
        if (current.length < 1) return { steps: [], lcm: 0 };

        const steps = [];
        const factors = [];
        
        while (!current.every(n => n === 1)) {
            let divisor = 2;
            while (true) {
                if (current.some(n => n % divisor === 0)) break;
                divisor = this.nextPrime(divisor);
            }

            steps.push({
                rowValues: [...current],
                divisor: divisor
            });
            factors.push(divisor);

            current = current.map(n => (n % divisor === 0) ? n / divisor : n);
        }

        steps.push({
            rowValues: [...current], 
            divisor: null
        });

        const lcm = factors.reduce((a, b) => a * b, 1);
        return { steps, factors, lcm };
    },

    formatFactors: function(factors) {
        if (!factors || factors.length === 0) return "";
        
        const counts = {};
        factors.forEach(f => counts[f] = (counts[f] || 0) + 1);
        
        let parts = Object.keys(counts).sort((a,b)=>a-b).map(base => {
            return counts[base] > 1 ? `${base}<sup>${counts[base]}</sup>` : base;
        });
        return parts.join(' &middot; ');
    },

    // 4. Διαχείριση UI
    
    fillCorrectAnswers: function() {
        // Υπολογισμός της λύσης
        const solution = this.solveCanonicalLCM(this.currentNumbers);
        const steps = solution.steps;
        const rows = this.problemContainer.querySelectorAll('tr');
        
        // Συμπλήρωση πίνακα
        for (let i = 0; i < steps.length - 1; i++) {
            const currentRow = rows[i]; 
            const nextRow = rows[i+1];
            
            const divInput = currentRow.querySelector('.quiz-input.divisor');
            if (divInput) divInput.value = steps[i].divisor;

            const nextValues = steps[i+1].rowValues;
            const inputs = nextRow.querySelectorAll('.quiz-input.quotient');
            inputs.forEach((inp, idx) => {
                if (nextValues[idx] !== undefined) inp.value = nextValues[idx];
            });
        }
        
        // Ενημέρωση της εξίσωσης (ώστε να φανούν οι παράγοντες)
        this.updateLCMEquation();
        
        // Συμπλήρωση του τελικού αποτελέσματος (με μικρή καθυστέρηση για να προλάβει να δημιουργηθεί το input)
        setTimeout(() => {
            const finalInput = document.getElementById('finalLcmInput');
            if (finalInput) {
                finalInput.value = solution.lcm;
            }
        }, 50);
    },

    buildProblemUI: function(numbers) {
        this.resultContainer.classList.remove('visible');
        this.problemContainer.innerHTML = '';
        if (this.lcmEquationContainer) this.lcmEquationContainer.innerHTML = '';

        const validNums = numbers.filter(n => n > 1);

        // --- ΕΛΕΓΧΟΣ: Ελάχιστοι Αριθμοί ---
        if (validNums.length < 2 && this.isInGameMode === false && numbers.some(n=>n>0)) {
             this.problemContainer.innerHTML = '<p style="color:#d9534f; font-weight:bold;">Εισάγετε τουλάχιστον 2 αριθμούς μεγαλύτερους του 1.</p>';
             return;
        } else if (validNums.length === 0) return;

        // --- ΕΛΕΓΧΟΣ: Διπλότυποι Αριθμοί ---
        const uniqueNums = new Set(validNums);
        if (uniqueNums.size !== validNums.length) {
            this.problemContainer.innerHTML = '<p style="color:#d9534f; font-weight:bold;">Παρακαλώ μην εισάγετε τον ίδιο αριθμό δύο φορές.<br>Αλλάξτε τους αριθμούς για να συνεχίσετε.</p>';
            return;
        }

        this.currentNumbers = validNums;
        const solution = this.solveCanonicalLCM(validNums);
        const steps = solution.steps;

        const table = document.createElement('table');
        table.className = 'steps-table';
        const tbody = document.createElement('tbody');

        const trFirst = document.createElement('tr');
        validNums.forEach(n => {
            const td = document.createElement('td');
            td.textContent = n;
            trFirst.appendChild(td);
        });
        const tdDiv = document.createElement('td');
        tdDiv.className = 'divisor-col';
        tdDiv.innerHTML = `<input type="number" class="quiz-input divisor">`;
        trFirst.appendChild(tdDiv);
        tbody.appendChild(trFirst);

        for (let i = 1; i < steps.length - 1; i++) {
            const tr = document.createElement('tr');
            validNums.forEach(() => {
                const td = document.createElement('td');
                td.innerHTML = `<input type="number" class="quiz-input quotient">`;
                tr.appendChild(td);
            });
            const tdD = document.createElement('td');
            tdD.className = 'divisor-col';
            tdD.innerHTML = `<input type="number" class="quiz-input divisor">`;
            tr.appendChild(tdD);
            tbody.appendChild(tr);
        }

        const trLast = document.createElement('tr');
        validNums.forEach(() => {
            const td = document.createElement('td');
            td.textContent = '1';
            trLast.appendChild(td);
        });
        const tdEmpty = document.createElement('td'); 
        tdEmpty.className = 'divisor-col';
        trLast.appendChild(tdEmpty);
        tbody.appendChild(trLast);

        table.appendChild(tbody);
        this.problemContainer.appendChild(table);

        if (this.lcmEquationContainer) {
            this.updateLCMEquation();
            const divisorInputs = this.problemContainer.querySelectorAll('.quiz-input.divisor');
            divisorInputs.forEach(input => {
                input.addEventListener('input', this.updateLCMEquation.bind(this));
            });
        }
    },

    updateLCMEquation: function() {
        if (!this.lcmEquationContainer) return;

        const numbersStr = this.currentNumbers.join(', ');
        let html = `ΕΚΠ(${numbersStr}) = `;

        const divisorInputs = this.problemContainer.querySelectorAll('.quiz-input.divisor');
        const filledDivisors = [];
        
        divisorInputs.forEach(input => {
            const val = input.value.trim();
            if (val !== '') {
                filledDivisors.push(val);
            }
        });

        if (filledDivisors.length > 0) {
            html += filledDivisors.join(' &middot; ');
            html += ' &middot; ';
        }

        const lastDivisorInput = divisorInputs[divisorInputs.length - 1];
        
        if (lastDivisorInput && lastDivisorInput.value !== '') {
            html = html.slice(0, -10); 
            html += ` = <input type="number" id="finalLcmInput" class="lcm-final-input" placeholder="?">`;
        }

        this.lcmEquationContainer.innerHTML = html;
        
        const finalInput = document.getElementById('finalLcmInput');
        if (finalInput) {
            finalInput.addEventListener('keyup', (e) => {
                 if (e.key === 'Enter') this.handleCheck();
            });
        }
    },

    // 5. Logic: Validation
    validateCurrentProblem: function() {
        let runningValues = [...this.currentNumbers]; 
        let allCorrect = true;
        let correctCellsThisRound = 0;
        let userStepsReport = [];
        let userFactors = []; 
        let userFinalLCM = null;

        const rows = this.problemContainer.querySelectorAll('tbody tr');
        
        for (let i = 0; i < rows.length - 1; i++) {
            const row = rows[i];
            const divisorInput = row.querySelector('.quiz-input.divisor');
            let userDivisor = parseInt(divisorInput.value);

            if (!this.isInGameMode) divisorInput.classList.remove('wrong', 'correct');
            
            let isDivisorValid = false;
            if (!isNaN(userDivisor) && this.isPrime(userDivisor)) {
                if (runningValues.some(val => val > 1 && val % userDivisor === 0)) {
                    isDivisorValid = true;
                }
            }

            if (isDivisorValid) {
                if (!this.isInGameMode) divisorInput.classList.add('correct');
                correctCellsThisRound++;
                userFactors.push(userDivisor);
            } else {
                if (!this.isInGameMode) divisorInput.classList.add('wrong');
                allCorrect = false;
            }

            let rowReport = {
                stepIndex: i,
                userDivisor: isNaN(userDivisor) ? '-' : userDivisor,
                divCorrect: isDivisorValid,
                quotients: []
            };

            if (i < rows.length - 2) { 
                const nextRow = rows[i+1];
                const quotientInputs = nextRow.querySelectorAll('.quiz-input.quotient');
                
                let expectedNextValues;
                if (isDivisorValid) {
                    expectedNextValues = runningValues.map(val => {
                        if (val === 1) return 1;
                        return (val % userDivisor === 0) ? val / userDivisor : val;
                    });
                } else {
                    expectedNextValues = runningValues; 
                }

                let thisRowMathCorrect = true;

                quotientInputs.forEach((inp, idx) => {
                    let userVal = parseInt(inp.value);
                    let expectedVal = expectedNextValues[idx];
                    let qCorrect = false;

                    if (!this.isInGameMode) inp.classList.remove('wrong', 'correct');

                    if (isDivisorValid && userVal === expectedVal) {
                        if (!this.isInGameMode) inp.classList.add('correct');
                        correctCellsThisRound++;
                        qCorrect = true;
                    } else {
                        if (!this.isInGameMode) inp.classList.add('wrong');
                        allCorrect = false;
                        thisRowMathCorrect = false;
                    }
                    rowReport.quotients.push({ val: isNaN(userVal)?'-':userVal, correct: qCorrect });
                });

                if (isDivisorValid && thisRowMathCorrect) {
                    runningValues = expectedNextValues;
                }
            }
            
            userStepsReport.push(rowReport);
        }
        
        // Check Final LCM
        const finalInput = document.getElementById('finalLcmInput');
        const actualLcm = this.solveCanonicalLCM(this.currentNumbers).lcm;
        let finalLcmCorrect = false;

        if (finalInput) {
            userFinalLCM = finalInput.value;
            const userLcmVal = parseInt(finalInput.value);
            
            if (!this.isInGameMode) finalInput.classList.remove('correct', 'wrong');
            
            if (userLcmVal === actualLcm) {
                if (!this.isInGameMode) finalInput.classList.add('correct');
                correctCellsThisRound++; 
                finalLcmCorrect = true;
            } else {
                if (!this.isInGameMode) finalInput.classList.add('wrong');
                allCorrect = false;
            }
        } else {
            allCorrect = false;
        }

        return { allCorrect, correctCellsThisRound, userFactors, userStepsReport, userFinalLCM, actualLcm, finalLcmCorrect };
    },

    handleCheck: function() {
        const canonicalSolution = this.solveCanonicalLCM(this.currentNumbers);
        const { allCorrect, correctCellsThisRound, userFactors, userStepsReport, userFinalLCM, finalLcmCorrect } = this.validateCurrentProblem();

        if (this.isInGameMode) {
            this.gameCorrectCells += correctCellsThisRound;
            this.gameReportData.push({
                numbers: [...this.currentNumbers],
                wasCorrect: allCorrect,
                canonicalSolution: canonicalSolution, 
                userFactors: userFactors,
                userSteps: userStepsReport,
                userFinalLCM: userFinalLCM,     
                finalLcmCorrect: finalLcmCorrect
            });

            this.gameCurrentProblemIndex++;
            if (this.gameCurrentProblemIndex < 5) {
                this.loadGameProblem(this.gameCurrentProblemIndex);
            } else {
                this.showFinalScore();
            }
        } else {
            const numbersStr = this.currentNumbers.join(', ');
            let html = '';
            
            if (allCorrect) {
                html += `<strong>Μπράβο! Όλα σωστά!</strong><br>`;
            } else {
                html += `<strong>Υπάρχουν λάθη.</strong><br>`;
                html += `Έλεγξε τον πίνακα και το τελικό γινόμενο.<br>`;
                html += `Η σωστή απάντηση είναι: <strong>${canonicalSolution.lcm}</strong>`;
            }
            
            this.resultContainer.innerHTML = html;
            this.resultContainer.classList.add('visible');
        }
    },

    // 6. Γεννήτρια Προβλημάτων
    generatePracticeProblem: function() {
        this.isInGameMode = false;
        this.checkBtn.classList.remove('hidden');
        this.checkBtn.textContent = "Έλεγχος";
        this.resultContainer.classList.remove('visible');
        this.inputs.forEach(i => {
             if(i) i.disabled = false;
        });

        const count = Math.random() > 0.5 ? 2 : 3;
        const nums = [];
        
        while(nums.length < count) {
            let n = Math.floor(Math.random() * 28) + 3;
            if (!nums.includes(n)) {
                nums.push(n);
            }
        }
        
        for(let i=0; i < this.inputs.length; i++) {
            if (this.inputs[i]) {
                if (i < count) {
                    this.inputs[i].value = nums[i];
                } else {
                    this.inputs[i].value = ''; 
                }
            }
        }

        this.buildProblemUI(nums);
    },

    handleNumberChange: function() {
        if (this.isInGameMode) return;
        const nums = this.inputs
            .filter(i => i)
            .map(i => parseInt(i.value))
            .filter(n => !isNaN(n));
        
        this.buildProblemUI(nums);
    },

    startGame: function() {
        this.isInGameMode = true;
        this.gameProblems = [];
        this.gameCurrentProblemIndex = 0;
        this.gameTotalCells = 0;
        this.gameCorrectCells = 0;
        this.gameReportData = [];

        this.inputs.forEach(i => { 
            if(i) {
                i.value = ''; 
                i.disabled = true; 
            }
        });
        if(this.startGameBtn) this.startGameBtn.classList.add('hidden');
        if(this.practiceLink) this.practiceLink.classList.add('hidden');
        this.checkBtn.classList.remove('hidden');
        this.checkBtn.textContent = "Έλεγχος & Επόμενο";
        this.gameProgress.classList.remove('hidden');
        this.resultContainer.classList.remove('visible');
        
        this.problemContainer.classList.remove('hidden');
        if (this.lcmEquationContainer) this.lcmEquationContainer.innerHTML = '';

        while(this.gameProblems.length < 5) {
            const count = Math.random() > 0.7 ? 3 : 2; 
            const set = [];
            while(set.length < count) {
                let n = Math.floor(Math.random() * 25) + 4;
                if(!set.includes(n)) set.push(n);
            }
            this.gameProblems.push(set);
        }

        this.loadGameProblem(0);
    },

    loadGameProblem: function(index) {
        const nums = this.gameProblems[index];
        this.gameProgress.textContent = `Πρόβλημα ${index + 1} από 5`;
        
        if(this.inputs[0]) this.inputs[0].value = nums[0];
        if(this.inputs[1]) this.inputs[1].value = nums[1];
        if(this.inputs[2]) this.inputs[2].value = nums[2] || '';
        
        this.buildProblemUI(nums);
        
        const inputsCount = this.problemContainer.querySelectorAll('input').length;
        this.gameTotalCells += inputsCount + 1;

        if (index === 4) {
            this.checkBtn.textContent = "Τέλος & Βαθμολογία";
        }
    },

    showFinalScore: function() {
        this.isInGameMode = false;
        this.problemContainer.classList.add('hidden');
        if (this.lcmEquationContainer) this.lcmEquationContainer.innerHTML = '';
        this.checkBtn.classList.add('hidden');
        this.gameProgress.classList.add('hidden');
        
        if (this.startGameBtn) this.startGameBtn.classList.remove('hidden');
        if (this.practiceLink) this.practiceLink.classList.remove('hidden');
        
        const score = (this.gameTotalCells > 0) ? Math.round((this.gameCorrectCells / this.gameTotalCells) * 100) : 0;
        
        let html = `<h2>Τέλος Παιχνιδιού!</h2>
                    <p>Βαθμολογία: <strong>${score}%</strong> (${this.gameCorrectCells}/${this.gameTotalCells})</p>`;
        
        html += this.buildReportHTML();
        
        this.resultContainer.innerHTML = html;
        this.resultContainer.classList.add('visible');
    },

    buildReportHTML: function() {
        let html = '<div class="report-section"><h3>Αναλυτική Αναφορά</h3>';
        
        this.gameReportData.forEach((item, idx) => {
            const icon = item.wasCorrect ? '&#9989;' : '&#10060;';
            const cls = item.wasCorrect ? 'correct' : 'incorrect';
            
            html += `<div class="report-item ${cls}">
                <h4>${icon} Πρόβλημα ${idx+1}: ΕΚΠ(${item.numbers.join(',')})</h4>`;
            
            if (item.userSteps && item.userSteps.length > 0) {
                html += '<p><strong>Η προσπάθειά σου:</strong></p>';
                html += '<table class="report-table"><tbody>';
                
                html += '<tr>';
                item.numbers.forEach(n => {
                    html += `<td class="cell-neutral">${n}</td>`;
                });
                let firstStep = item.userSteps[0];
                let divClass = firstStep.divCorrect ? 'cell-correct' : 'cell-wrong';
                html += `<td class="divisor-col ${divClass}">${firstStep.userDivisor}</td>`;
                html += '</tr>';

                for (let i = 0; i < item.userSteps.length; i++) {
                    let step = item.userSteps[i];
                    
                    if (step.quotients && step.quotients.length > 0) {
                        html += '<tr>';
                        
                        step.quotients.forEach(q => {
                            let qClass = q.correct ? 'cell-correct' : 'cell-wrong';
                            html += `<td class="${qClass}">${q.val}</td>`;
                        });

                        if (i + 1 < item.userSteps.length) {
                            let nextStep = item.userSteps[i+1];
                            let nextDivClass = nextStep.divCorrect ? 'cell-correct' : 'cell-wrong';
                            html += `<td class="divisor-col ${nextDivClass}">${nextStep.userDivisor}</td>`;
                        } else {
                            html += `<td class="divisor-col" style="border:none"></td>`;
                        }
                        
                        html += '</tr>';
                    }
                }
                html += '</tbody></table>';
            }

            const userFinalVal = item.userFinalLCM || "-";
            const userFactorsFormatted = this.formatFactors(item.userFactors);
            let userFullAnswer = userFinalVal;
            
            if (userFactorsFormatted && userFactorsFormatted !== "") {
                userFullAnswer = `${userFactorsFormatted} = ${userFinalVal}`;
            }

            const ansClass = item.finalLcmCorrect ? 'color: #155724; font-weight: bold;' : 'color: #721c24; font-weight: bold;';
            
            html += `<p style="margin-top:10px;">Η απάντησή σου για το ΕΚΠ: <span style="${ansClass}">${userFullAnswer}</span></p>`;

            if (!item.wasCorrect) {
                 const correctFactors = this.formatFactors(item.canonicalSolution.factors);
                 html += `<div style="margin-top:10px; padding:10px; background:rgba(255,255,255,0.7); border-radius:5px;">
                            <strong>Σωστή Απάντηση:</strong><br>
                            ${correctFactors} = <strong>${item.canonicalSolution.lcm}</strong>
                          </div>`;
            } else {
                html += `<p style="color:#155724; font-weight:bold;">Άριστα!</p>`;
            }
            html += `</div>`;
        });
        
        html += '</div>';
        return html;
    }
};