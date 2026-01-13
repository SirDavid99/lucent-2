// Gestione del localStorage
const STORAGE_KEY = 'monthlySaving';

// Carica il risparmio mensile salvato
function loadMonthlySaving() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
}

// Salva il risparmio mensile
function saveMonthlySaving(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Formatta valuta
function formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Formatta valuta USD
function formatCurrencyUSD(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Gestione convertitore valuta EUR/USD
let exchangeRate = 1.08; // Tasso di cambio di default (1 EUR = 1.08 USD)
const EXCHANGE_RATE_CACHE_KEY = 'eurUsdExchangeRate';
const EXCHANGE_RATE_CACHE_TIMESTAMP_KEY = 'eurUsdExchangeRateTimestamp';
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 ora

// Recupera il tasso di cambio EUR/USD dal web
async function fetchExchangeRate() {
    // Controlla la cache
    const cachedRate = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(EXCHANGE_RATE_CACHE_TIMESTAMP_KEY);
    
    if (cachedRate && cachedTimestamp) {
        const now = Date.now();
        if (now - parseInt(cachedTimestamp) < EXCHANGE_RATE_CACHE_DURATION) {
            return parseFloat(cachedRate);
        }
    }
    
    try {
        // Usa exchangerate-api.com (gratuito, senza API key per EUR/USD)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
        if (!response.ok) {
            throw new Error('Errore nel recupero tasso di cambio');
        }
        
        const data = await response.json();
        if (data.rates && data.rates.USD) {
            const rate = data.rates.USD;
            // Salva in cache
            localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, rate.toString());
            localStorage.setItem(EXCHANGE_RATE_CACHE_TIMESTAMP_KEY, Date.now().toString());
            return rate;
        }
    } catch (error) {
        console.warn('Errore nel recupero tasso di cambio:', error);
        // Usa il valore di default o dalla cache anche se vecchio
        if (cachedRate) {
            return parseFloat(cachedRate);
        }
    }
    
    return exchangeRate; // Tasso di default
}

// Aggiorna il tasso di cambio
async function updateExchangeRate() {
    const rate = await fetchExchangeRate();
    exchangeRate = rate;
    document.getElementById('exchangeRate').textContent = `1 EUR = $${rate.toFixed(4)}`;
    // Ricalcola la conversione se c'è un valore inserito
    const eurAmount = parseFloat(document.getElementById('eurAmount').value) || 0;
    if (eurAmount > 0) {
        convertEURtoUSD();
    }
}

// Converte EUR a USD
function convertEURtoUSD() {
    const eurAmount = parseFloat(document.getElementById('eurAmount').value) || 0;
    const usdAmount = eurAmount * exchangeRate;
    document.getElementById('usdAmount').value = usdAmount.toFixed(2);
}

// Converte USD a EUR
function convertUSDtoEUR() {
    const usdAmount = parseFloat(document.getElementById('usdAmount').value) || 0;
    const eurAmount = usdAmount / exchangeRate;
    document.getElementById('eurAmount').value = eurAmount.toFixed(2);
}

// Inizializza il convertitore valuta
function setupCurrencyConverter() {
    const eurInput = document.getElementById('eurAmount');
    const usdInput = document.getElementById('usdAmount');
    const updateRateBtn = document.getElementById('updateRateBtn');
    const quickConvertBtns = document.querySelectorAll('.btn-quick-convert');
    
    if (!eurInput || !usdInput) return;
    
    // Carica il tasso di cambio iniziale
    updateExchangeRate();
    
    // Event listener per conversione EUR -> USD
    eurInput.addEventListener('input', function() {
        convertEURtoUSD();
    });
    
    // Event listener per conversione USD -> EUR (se l'utente modifica manualmente)
    usdInput.addEventListener('input', function() {
        if (!usdInput.hasAttribute('readonly')) {
            convertUSDtoEUR();
        }
    });
    
    // Aggiorna il tasso di cambio
    if (updateRateBtn) {
        updateRateBtn.addEventListener('click', async function() {
            updateRateBtn.textContent = '⏳ Aggiornamento...';
            updateRateBtn.disabled = true;
            await updateExchangeRate();
            updateRateBtn.textContent = '🔄 Aggiorna';
            updateRateBtn.disabled = false;
        });
    }
    
    // Pulsanti rapidi per importi comuni
    quickConvertBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseFloat(this.getAttribute('data-amount'));
            eurInput.value = amount;
            convertEURtoUSD();
        });
    });
}

// Gestione checkbox risparmio di gruppo
function setupGroupSavingToggle() {
    const checkbox = document.getElementById('groupSaving');
    const groupFields = document.getElementById('groupFields');
    const individualFields = document.getElementById('individualFields');
    const monthlySavingInput = document.getElementById('monthlySaving');
    
    if (!checkbox || !groupFields || !individualFields) return;
    
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            groupFields.style.display = 'block';
            individualFields.style.display = 'none';
            monthlySavingInput.required = false;
            updateCalculatedTotal();
        } else {
            groupFields.style.display = 'none';
            individualFields.style.display = 'block';
            monthlySavingInput.required = true;
        }
    });
    
    // Calcola totale quando cambiano i valori
    const peopleCountInput = document.getElementById('peopleCount');
    const perPersonAmountInput = document.getElementById('perPersonAmount');
    const investorNamesInput = document.getElementById('investorNames');
    
    if (peopleCountInput) {
        peopleCountInput.addEventListener('input', updateCalculatedTotal);
    }
    if (perPersonAmountInput) {
        perPersonAmountInput.addEventListener('input', updateCalculatedTotal);
    }
    if (investorNamesInput) {
        investorNamesInput.addEventListener('input', function() {
            // Conta i nomi inseriti (separati da virgola)
            const namesText = this.value.trim();
            let namesCount = 0;
            
            if (namesText) {
                // Dividi per virgola e conta solo i nomi non vuoti
                const names = namesText.split(',').map(n => n.trim()).filter(n => n.length > 0);
                namesCount = names.length;
            }
            
            // Aggiorna automaticamente il campo "Numero di persone"
            const peopleCountInput = document.getElementById('peopleCount');
            if (peopleCountInput) {
                if (namesCount > 0) {
                    peopleCountInput.value = namesCount;
                } else {
                    // Se non ci sono nomi, lascia vuoto o 0
                    peopleCountInput.value = '';
                }
            }
            
            // Aggiorna i risultati se il risparmio di gruppo è attivo
            if (document.getElementById('groupSaving').checked) {
                const peopleCount = namesCount > 0 ? namesCount : (parseInt(document.getElementById('peopleCount').value) || 0);
                const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
                const monthlyTotal = peopleCount * perPersonAmount;
                if (monthlyTotal > 0) {
                    updateResultsInRealTime(monthlyTotal, peopleCount, perPersonAmount);
                }
                // Aggiorna anche il totale calcolato
                updateCalculatedTotal();
            }
        });
    }
    if (monthlySavingInput) {
        monthlySavingInput.addEventListener('input', function() {
            if (!document.getElementById('groupSaving').checked) {
                const monthlySaving = parseFloat(this.value) || 0;
                const years = getYearsCount();
                const months = years * 12;
                if (monthlySaving > 0 && years > 0) {
                    const totalSaving = calculateTotalSaving(monthlySaving);
                    document.getElementById('totalSaved').textContent = formatCurrency(totalSaving);
                    document.getElementById('monthlySavingDisplay').textContent = formatCurrency(monthlySaving);
                    document.getElementById('monthsDisplay').textContent = `${months} mesi`;
                    document.getElementById('yearsDisplay').textContent = `${years} anni`;
                    document.getElementById('yearsInfo').textContent = years;
                    document.getElementById('monthsInfo').textContent = months;
                    document.getElementById('groupResultCard').style.display = 'none';
                    
                    // Il campo "Capitale da Investire" viene lasciato vuoto per permettere inserimento manuale
                } else {
                    document.getElementById('totalSaved').textContent = formatCurrency(0);
                    document.getElementById('monthlySavingDisplay').textContent = formatCurrency(monthlySaving || 0);
                    document.getElementById('monthsDisplay').textContent = years > 0 ? `${months} mesi` : '0 mesi';
                    document.getElementById('yearsDisplay').textContent = years > 0 ? `${years} anni` : '0 anni';
                    document.getElementById('yearsInfo').textContent = years || 0;
                    document.getElementById('monthsInfo').textContent = months || 0;
                }
            }
        });
    }
    
    // Aggiorna quando cambiano gli anni
    const yearsInput = document.getElementById('yearsCount');
    if (yearsInput) {
        yearsInput.addEventListener('input', function() {
            updateResult();
            // Se è attivo il risparmio di gruppo, aggiorna anche quello
            const isGroup = document.getElementById('groupSaving').checked;
            if (isGroup) {
                const peopleCount = parseInt(document.getElementById('peopleCount').value) || 0;
                const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
                const monthlyTotal = peopleCount * perPersonAmount;
                if (monthlyTotal > 0) {
                    updateResultsInRealTime(monthlyTotal, peopleCount, perPersonAmount);
                    // Aggiorna la timeline
                    updateTimeline(monthlyTotal);
                }
            } else {
                const monthlySaving = parseFloat(document.getElementById('monthlySaving').value) || 0;
                    const years = getYearsCount();
                if (monthlySaving > 0 && years > 0) {
                    const months = years * 12;
                    const totalSaving = calculateTotalSaving(monthlySaving);
                    document.getElementById('totalSaved').textContent = formatCurrency(totalSaving);
                    document.getElementById('monthsDisplay').textContent = `${months} mesi`;
                    document.getElementById('yearsDisplay').textContent = `${years} anni`;
                    document.getElementById('yearsInfo').textContent = years;
                    document.getElementById('monthsInfo').textContent = months;
                    
                    // Aggiorna la timeline
                    updateTimeline(monthlySaving);
                } else {
                    // Se gli anni sono 0 o non inseriti, mostra 0
                    document.getElementById('totalSaved').textContent = formatCurrency(0);
                    document.getElementById('monthsDisplay').textContent = '0 mesi';
                    document.getElementById('yearsDisplay').textContent = '0 anni';
                    document.getElementById('yearsInfo').textContent = years || 0;
                    document.getElementById('monthsInfo').textContent = 0;
                    
                    const timelineCard = document.getElementById('timelineCard');
                    if (timelineCard) timelineCard.style.display = 'none';
                }
            }
        });
    }
}

// Aggiorna il totale calcolato e i risultati
function updateCalculatedTotal() {
    const peopleCount = parseInt(document.getElementById('peopleCount').value) || 0;
    const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
    const total = peopleCount * perPersonAmount;
    
    const calculatedTotalElement = document.getElementById('calculatedTotal');
    if (calculatedTotalElement) {
        calculatedTotalElement.textContent = formatCurrency(total);
    }
    
    // Aggiorna anche i risultati se il risparmio di gruppo è attivo
    const isGroup = document.getElementById('groupSaving').checked;
    if (isGroup && total > 0) {
        updateResultsInRealTime(total, peopleCount, perPersonAmount);
        // Aggiorna anche le caselle individuali
        if (perPersonAmount > 0) {
            updateIndividualSaversInRealTime(perPersonAmount);
        }
    }
}

// Aggiorna i risultati in tempo reale
function updateResultsInRealTime(monthlyTotal, peopleCount, perPersonAmount) {
    const years = getYearsCount();
    const months = years * 12;
    
    // Se gli anni non sono inseriti, mostra 0
    const totalSaving = years > 0 ? calculateTotalSaving(monthlyTotal) : 0;
    const perPersonTotal = years > 0 ? calculateTotalSaving(perPersonAmount) : 0;
    
    // Aggiorna il risultato principale
    document.getElementById('totalSaved').textContent = formatCurrency(totalSaving);
    document.getElementById('monthlySavingDisplay').textContent = formatCurrency(monthlyTotal);
    document.getElementById('monthsDisplay').textContent = years > 0 ? `${months} mesi` : '0 mesi';
    document.getElementById('yearsDisplay').textContent = years > 0 ? `${years} anni` : '0 anni';
    document.getElementById('yearsInfo').textContent = years || 0;
    document.getElementById('monthsInfo').textContent = months || 0;
    
    // Il campo "Capitale da Investire" viene lasciato vuoto per permettere inserimento manuale
    
    // Aggiorna la sezione gruppo se esiste
    const groupResultCard = document.getElementById('groupResultCard');
    if (groupResultCard) {
        groupResultCard.style.display = 'block';
        
        document.getElementById('groupTotal5Years').textContent = formatCurrency(totalSaving);
        document.getElementById('groupTotalBreakdown').textContent = formatCurrency(totalSaving);
        document.getElementById('groupMonthlyTotal').textContent = formatCurrency(monthlyTotal);
        document.getElementById('groupPerPersonMonthly').textContent = formatCurrency(perPersonAmount);
        document.getElementById('groupPeopleCount').textContent = peopleCount;
        document.getElementById('perPersonTotal').textContent = formatCurrency(perPersonTotal);
        
        // Aggiorna il calcolo
        if (years > 0) {
        const calculationText = `${peopleCount} persone × ${formatCurrency(perPersonAmount)}/mese × ${months} mesi = ${formatCurrency(totalSaving)}`;
            const calculationElement = document.getElementById('groupCalculation');
            if (calculationElement) {
                calculationElement.textContent = calculationText;
            }
        }
        
        // Aggiorna i nomi se disponibili
        const investorNamesInput = document.getElementById('investorNames');
        let names = [];
        if (investorNamesInput && investorNamesInput.value && investorNamesInput.value.trim()) {
            // Sostituisci Pietro con X, Simone/Michela con L, Leo con L, Davide con D prima di riordinare
            let namesString = investorNamesInput.value
                .replace(/Pietro/gi, 'X')
                .replace(/Simone/gi, 'L')
                .replace(/Michela/gi, 'L')
                .replace(/Leo/gi, 'L')
                .replace(/Davide/gi, 'D');
            names = reorderNames(namesString);
            const membersList = document.getElementById('groupMembersList');
            if (membersList) {
                membersList.innerHTML = names.map(name => 
                    `<span class="member-tag">${name}</span>`
                ).join('');
            }
        }
        
        // Aggiorna le caselle individuali
        updateIndividualSavers(perPersonAmount, names);
        
        // Aggiorna la timeline fino a 5 anni
        updateTimeline(monthlyTotal);
    } else {
        document.getElementById('individualSaversSection').style.display = 'none';
        document.getElementById('timelineCard').style.display = 'none';
    }
}

// Aggiorna la timeline del risparmio progressivo fino a 5 anni
function updateTimeline(monthlySaving) {
    const timelineCard = document.getElementById('timelineCard');
    const timelineGrid = document.getElementById('timelineGrid');
    
    if (!timelineCard || !timelineGrid || !monthlySaving || monthlySaving <= 0) {
        if (timelineCard) timelineCard.style.display = 'none';
        return;
    }
    
    timelineCard.style.display = 'block';
    timelineGrid.innerHTML = '';
    
    // Crea una card per ogni anno da 1 a 5
    for (let year = 1; year <= 5; year++) {
        const months = year * 12;
        const totalSaved = calculateSavingForPeriod(monthlySaving, year);
        const isHighlight = year === 5;
        
        const yearCard = document.createElement('div');
        yearCard.className = `timeline-year-card ${isHighlight ? 'highlight-year' : ''}`;
        yearCard.innerHTML = `
            <div class="timeline-year-header">
                <div class="timeline-year-number">${year}</div>
                <div class="timeline-year-label">${year === 1 ? 'Anno' : 'Anni'}</div>
            </div>
            <div class="timeline-year-content">
                <div class="timeline-year-amount">${formatCurrency(totalSaved)}</div>
                <div class="timeline-year-details">
                    <div class="timeline-detail-item">
                        <span class="timeline-detail-label">Mesi:</span>
                        <span class="timeline-detail-value">${months}</span>
                    </div>
                    <div class="timeline-detail-item">
                        <span class="timeline-detail-label">Mensile:</span>
                        <span class="timeline-detail-value">${formatCurrency(monthlySaving)}</span>
                    </div>
                </div>
            </div>
        `;
        
        timelineGrid.appendChild(yearCard);
    }
}

// Aggiorna le caselle individuali quando cambiano i valori in tempo reale
function updateIndividualSaversInRealTime(perPersonAmount) {
    const investorNamesInput = document.getElementById('investorNames');
    let names = [];
    if (investorNamesInput && investorNamesInput.value && investorNamesInput.value.trim()) {
        // Sostituisci Pietro con X, Simone/Michela con L prima di riordinare
        let namesString = investorNamesInput.value
            .replace(/Pietro/gi, 'X')
            .replace(/Simone/gi, 'L')
            .replace(/Michela/gi, 'L')
            .replace(/Leo/gi, 'L')
            .replace(/Davide/gi, 'D');
        names = reorderNames(namesString);
    }
    updateIndividualSavers(perPersonAmount, names);
}

// Ottieni il numero di anni dal campo
function getYearsCount() {
    const yearsInput = document.getElementById('yearsCount');
    const years = yearsInput ? parseInt(yearsInput.value) : 0;
    return years > 0 ? years : 0;
}

// Calcola il risparmio per un periodo specifico
function calculateSavingForPeriod(monthlySaving, years) {
    const months = years * 12;
    return monthlySaving * months;
}

// Calcola il risparmio totale per gli anni selezionati
function calculateTotalSaving(monthlySaving) {
    const years = getYearsCount();
    return calculateSavingForPeriod(monthlySaving, years);
}

// Riordina i nomi per mettere X al centro, Y a destra di X, e L a destra di Y
function reorderNames(names) {
    if (!Array.isArray(names)) {
        names = names.split(',').map(n => n.trim()).filter(n => n);
    }
    
    // Sostituisci Pietro con X se presente
    names = names.map(n => n.replace(/Pietro/gi, 'X'));
    
    // Trova le posizioni dei nomi (cerca esattamente i nomi, case-insensitive)
    const dIndex = names.findIndex(n => n.toLowerCase() === 'd' || n.toLowerCase() === 'davide');
    const lIndex = names.findIndex(n => n.toLowerCase() === 'l' || n.toLowerCase() === 'leo');
    const xIndex = names.findIndex(n => n.toLowerCase() === 'x');
    const yIndex = names.findIndex(n => n.toLowerCase() === 'y');
    
    // Costruisci l'array con i nomi trovati nell'ordine corretto
    const reordered = [];
    if (lIndex !== -1) reordered.push(names[lIndex]);
    if (xIndex !== -1) reordered.push(names[xIndex]);
    if (yIndex !== -1) reordered.push(names[yIndex]);
    if (dIndex !== -1) reordered.push(names[dIndex]);
    
    // Aggiungi eventuali altri nomi non standard nell'ordine in cui compaiono
    names.forEach((name, index) => {
        const lowerName = name.toLowerCase();
        if (lowerName !== 'd' && lowerName !== 'davide' && lowerName !== 'l' && lowerName !== 'leo' && lowerName !== 'x' && lowerName !== 'y' && lowerName !== 'pietro') {
            if (!reordered.includes(name)) {
                reordered.push(name);
            }
        }
    });
    
    return reordered;
}

// Aggiorna le caselle individuali dei risparmiatori
function updateIndividualSavers(perPersonAmount, investorNames) {
    const individualSection = document.getElementById('individualSaversSection');
    if (!individualSection) return;
    
    if (!perPersonAmount || perPersonAmount <= 0) {
        individualSection.style.display = 'none';
        return;
    }
    
    individualSection.style.display = 'block';
    
    // Estrai i nomi e riordina
    const names = investorNames 
        ? reorderNames(investorNames)
        : [];
    
    // Ottieni gli anni selezionati
    const totalYears = getYearsCount();
    
    // Calcola i risparmi per ogni periodo
    const monthly = perPersonAmount;
    const oneYear = calculateSavingForPeriod(monthly, 1);
    const threeYears = calculateSavingForPeriod(monthly, 3);
    const totalSaving = calculateSavingForPeriod(monthly, totalYears);
    
    // Aggiorna le 4 caselle
    for (let i = 0; i < 4; i++) {
        const name = names[i] || '';
        const saverIndex = i + 1;
        
        // Aggiorna nome
        document.getElementById(`saverName${saverIndex}`).textContent = name;
        
        // Aggiorna valori
        document.getElementById(`saverTotal${saverIndex}`).textContent = formatCurrency(totalSaving);
        document.getElementById(`saverMonthly${saverIndex}`).textContent = formatCurrency(monthly);
        document.getElementById(`saver1Year${saverIndex}`).textContent = formatCurrency(oneYear);
        document.getElementById(`saver3Years${saverIndex}`).textContent = formatCurrency(threeYears);
        document.getElementById(`saver5Years${saverIndex}`).textContent = formatCurrency(totalSaving);
    }
}

// Aggiorna il risultato
function updateResult() {
    const savedData = loadMonthlySaving();
    const years = getYearsCount();
    const months = years * 12;
    
    // Controlla se il risparmio di gruppo è attivo
    const isGroup = document.getElementById('groupSaving').checked;
    let monthlySaving = 0;
    
    if (isGroup) {
        // Se il risparmio di gruppo è attivo, calcola dal form
        const peopleCount = parseInt(document.getElementById('peopleCount').value) || 0;
        const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
        monthlySaving = peopleCount * perPersonAmount;
        
        if (monthlySaving > 0 && years > 0) {
            updateResultsInRealTime(monthlySaving, peopleCount, perPersonAmount);
            return; // updateResultsInRealTime aggiorna già tutto
        }
    } else {
        // Risparmio individuale
        const monthlySavingInput = document.getElementById('monthlySaving');
        if (monthlySavingInput && monthlySavingInput.value) {
            monthlySaving = parseFloat(monthlySavingInput.value) || 0;
        } else if (savedData && savedData.monthlySaving) {
            monthlySaving = savedData.monthlySaving;
        }
    }
    
    // Se non c'è risparmio mensile o anni non inseriti, resetta tutto
    if (!monthlySaving || monthlySaving === 0 || years === 0) {
        document.getElementById('totalSaved').textContent = formatCurrency(0);
        document.getElementById('monthlySavingDisplay').textContent = formatCurrency(monthlySaving || 0);
        document.getElementById('monthsDisplay').textContent = years > 0 ? `${months} mesi` : '0 mesi';
        document.getElementById('yearsDisplay').textContent = years > 0 ? `${years} anni` : '0 anni';
        document.getElementById('yearsInfo').textContent = years || 0;
        document.getElementById('monthsInfo').textContent = months || 0;
        document.getElementById('groupResultCard').style.display = 'none';
        
        const timelineCard = document.getElementById('timelineCard');
        if (timelineCard) timelineCard.style.display = 'none';
        return;
    }
    
    const totalSaved = calculateTotalSaving(monthlySaving);
    
    document.getElementById('totalSaved').textContent = formatCurrency(totalSaved);
    document.getElementById('monthlySavingDisplay').textContent = formatCurrency(monthlySaving);
    document.getElementById('monthsDisplay').textContent = `${months} mesi`;
    document.getElementById('yearsDisplay').textContent = `${years} anni`;
    document.getElementById('yearsInfo').textContent = years;
    document.getElementById('monthsInfo').textContent = months;
    
    // Aggiorna la sezione risparmio di gruppo se applicabile
    if (savedData && savedData.isGroup && savedData.peopleCount && savedData.perPersonAmount) {
        updateGroupResult(savedData);
    } else {
        document.getElementById('groupResultCard').style.display = 'none';
        document.getElementById('individualSaversSection').style.display = 'none';
    }
    
    // Aggiorna sempre la timeline se c'è un risparmio mensile
    if (monthlySaving > 0) {
        updateTimeline(monthlySaving);
    } else {
        const timelineCard = document.getElementById('timelineCard');
        if (timelineCard) timelineCard.style.display = 'none';
    }
}

// Aggiorna la sezione risparmio di gruppo
function updateGroupResult(data) {
    const groupResultCard = document.getElementById('groupResultCard');
    if (!groupResultCard) return;
    
    groupResultCard.style.display = 'block';
    
    const years = getYearsCount();
    const months = years * 12;
    const monthlyTotal = data.monthlySaving;
    const perPersonMonthly = data.perPersonAmount;
    const peopleCount = data.peopleCount;
    const totalSaving = calculateTotalSaving(monthlyTotal);
    const perPersonTotal = calculateTotalSaving(perPersonMonthly);
    
    // Aggiorna i valori principali
    document.getElementById('groupTotal5Years').textContent = formatCurrency(totalSaving);
    document.getElementById('groupTotalBreakdown').textContent = formatCurrency(totalSaving);
    document.getElementById('groupMonthlyTotal').textContent = formatCurrency(monthlyTotal);
    document.getElementById('groupPerPersonMonthly').textContent = formatCurrency(perPersonMonthly);
    document.getElementById('groupPeopleCount').textContent = peopleCount;
    document.getElementById('perPersonTotal').textContent = formatCurrency(perPersonTotal);
    
    // Aggiorna il calcolo
    const calculationText = `${peopleCount} persone × ${formatCurrency(perPersonMonthly)}/mese × ${months} mesi = ${formatCurrency(totalSaving)}`;
    document.getElementById('groupCalculation').textContent = calculationText;
    
    // Aggiorna la lista dei risparmiatori
    const membersList = document.getElementById('groupMembersList');
    let names = [];
    if (membersList && data.investorNames && data.investorNames.trim()) {
        names = reorderNames(data.investorNames);
        
        if (names.length > 0) {
        membersList.innerHTML = names.map(name => 
            `<span class="member-tag">${name}</span>`
        ).join('');
        } else {
            membersList.innerHTML = '';
        }
    } else if (membersList) {
        membersList.innerHTML = '';
    }
    
    // Aggiorna le caselle individuali
    updateIndividualSavers(perPersonMonthly, names);
    
    // Aggiorna sempre la timeline se c'è un risparmio mensile
    if (monthlyTotal > 0) {
        updateTimeline(monthlyTotal);
    } else {
        const timelineCard = document.getElementById('timelineCard');
        if (timelineCard) timelineCard.style.display = 'none';
    }
}

// Il form ora si aggiorna automaticamente senza bisogno di un pulsante di submit
// I calcoli vengono eseguiti in tempo reale tramite gli event listener sugli input

// ========== BOT DI INVESTIMENTO IN BORSA ==========

// Profili di rischio con rendimenti annui attesi
const RISK_PROFILES = {
    conservative: {
        minReturn: 0.03,
        maxReturn: 0.05,
        volatility: 0.08,
        description: "Investimenti sicuri come obbligazioni governative e ETF a basso rischio"
    },
    moderate: {
        minReturn: 0.05,
        maxReturn: 0.07,
        volatility: 0.12,
        description: "Mix bilanciato tra azioni e obbligazioni, ETF diversificati"
    },
    aggressive: {
        minReturn: 0.07,
        maxReturn: 0.10,
        volatility: 0.18,
        description: "Portafoglio azionario aggressivo, ETF settoriali, crescita elevata"
    }
};

// Calcola il rendimento annuale basato sul profilo di rischio
function calculateAnnualReturn(riskProfile, year) {
    const profile = RISK_PROFILES[riskProfile];
    const baseReturn = (profile.minReturn + profile.maxReturn) / 2;
    // Simula volatilità annuale
    const volatility = (Math.random() - 0.5) * profile.volatility;
    return baseReturn + volatility;
}

// Calcola investimento con strategia DCA (Dollar Cost Averaging)
function calculateDCAInvestment(monthlyAmount, years, riskProfile) {
    // Usa il risparmio mensile totale dei 4 investitori come investimento mensile, oppure il valore inserito
    const monthlyInvestment = getCurrentMonthlySaving() || monthlyAmount;
    let totalInvested = 0;
    let currentValue = 0;
    
    for (let month = 0; month < years * 12; month++) {
        totalInvested += monthlyInvestment;
        const year = Math.floor(month / 12);
        const annualReturn = calculateAnnualReturn(riskProfile, year);
        const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
        currentValue = (currentValue + monthlyInvestment) * (1 + monthlyReturn);
    }
    
    return {
        totalInvested: totalInvested,
        finalValue: currentValue,
        gain: currentValue - totalInvested
    };
}

// Calcola investimento unico (lump sum)
function calculateLumpSumInvestment(amount, years, riskProfile) {
    let currentValue = amount;
    
    for (let year = 0; year < years; year++) {
        const annualReturn = calculateAnnualReturn(riskProfile, year);
        currentValue = currentValue * (1 + annualReturn);
    }
    
    return {
        totalInvested: amount,
        finalValue: currentValue,
        gain: currentValue - amount
    };
}

// Calcola investimento mensile ricorrente
function calculateMonthlyInvestment(monthlyAmount, years, riskProfile) {
    // Usa il risparmio mensile totale dei 4 investitori come investimento mensile, oppure il valore inserito
    const monthlyInvestment = getCurrentMonthlySaving() || monthlyAmount;
    let totalInvested = 0;
    let currentValue = 0;
    
    for (let month = 0; month < years * 12; month++) {
        totalInvested += monthlyInvestment;
        const year = Math.floor(month / 12);
        const annualReturn = calculateAnnualReturn(riskProfile, year);
        const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
        currentValue = currentValue * (1 + monthlyReturn) + monthlyInvestment;
    }
    
    return {
        totalInvested: totalInvested,
        finalValue: currentValue,
        gain: currentValue - totalInvested
    };
}

// Informazioni sulle società
const COMPANY_INFO = {
    growth: {
        name: 'Growth',
        fullName: 'Growth Corporation',
        description: 'Società focalizzata sulla crescita con focus su innovazione tecnologica e espansione di mercato.',
        sector: 'Tecnologia e Crescita',
        volatility: 1.2, // Volatilità leggermente superiore per azioni di crescita
        symbol: 'VUG' // Simbolo reale per recuperare dati: Vanguard Growth ETF (esempio di ETF crescita)
    }
};

// Cache per i dati delle azioni (per evitare troppe chiamate API)
const stockDataCache = {
    data: null,
    timestamp: null,
    cacheDuration: 5 * 60 * 1000 // 5 minuti di cache
};

// Recupera dati reali delle azioni dal web
async function fetchStockData(symbol) {
    // Controlla la cache
    if (stockDataCache.data && stockDataCache.timestamp) {
        const now = Date.now();
        if (now - stockDataCache.timestamp < stockDataCache.cacheDuration) {
            return stockDataCache.data;
        }
    }
    
    try {
        // Usa Yahoo Finance API pubblica tramite proxy CORS per evitare problemi di CORS
        // Alternativa: usa un proxy CORS o un servizio come Alpha Vantage con API key
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1mo&range=1y`)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error('Errore nel recupero dati');
        }
        
        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quotes = result.indicators?.quote?.[0] || {};
            
            const historicalData = [];
            const opens = quotes.open || [];
            const highs = quotes.high || [];
            const lows = quotes.low || [];
            const closes = quotes.close || [];
            const volumes = quotes.volume || [];
            
            // Prendi gli ultimi 12 mesi
            const startIndex = Math.max(0, timestamps.length - 12);
            
            for (let i = startIndex; i < timestamps.length; i++) {
                const date = new Date(timestamps[i] * 1000);
                const month = date.getMonth() + 1; // 1-12
                
                // Verifica che i dati siano validi
                if (opens[i] && closes[i] && highs[i] && lows[i]) {
                    historicalData.push({
                        month: month,
                        open: opens[i],
                        high: highs[i],
                        low: lows[i],
                        close: closes[i],
                        volume: volumes[i] || 0,
                        date: date
                    });
                }
            }
            
            // Se abbiamo dati validi, salvali in cache
            if (historicalData.length > 0) {
                stockDataCache.data = historicalData;
                stockDataCache.timestamp = Date.now();
                return historicalData;
            }
        }
        
        return null;
    } catch (error) {
        console.warn('Errore nel recupero dati azioni dal web:', error);
        // Ritorna null per usare dati simulati come fallback
        return null;
    }
}

// Genera raccomandazioni del bot
function generateBotRecommendations(result, riskProfile, strategy, amount, years, companyStock = 'growth') {
    const profile = RISK_PROFILES[riskProfile];
    const company = COMPANY_INFO[companyStock] || COMPANY_INFO.growth;
    const returnPercentage = (result.gain / result.totalInvested) * 100;
    const messages = [];
    
    // Informazioni sulla società
    messages.push({
        type: 'info',
        icon: '🏢',
        text: `Investimento in azioni ${company.name}: ${company.description}`
    });
    
    // Analisi del rendimento
    if (returnPercentage > 50) {
        messages.push({
            type: 'success',
            icon: '✅',
            text: `Eccellente! Il tuo investimento in ${company.name} ha generato un rendimento del ${returnPercentage.toFixed(2)}%.`
        });
    } else if (returnPercentage > 20) {
        messages.push({
            type: 'info',
            icon: '📊',
            text: `Buon risultato! Rendimento del ${returnPercentage.toFixed(2)}% in ${years} anni con azioni ${company.name}.`
        });
    } else {
        messages.push({
            type: 'warning',
            icon: '⚠️',
            text: `Rendimento moderato del ${returnPercentage.toFixed(2)}%. Considera un orizzonte temporale più lungo per ${company.name}.`
        });
    }
    
    // Suggerimenti strategici specifici per azioni
    if (strategy === 'lump' && amount > 50000) {
        messages.push({
            type: 'info',
            icon: '💡',
            text: `Per importi elevati in ${company.name}, considera il Dollar Cost Averaging per ridurre il rischio di timing del mercato.`
        });
    }
    
    if (riskProfile === 'conservative' && years > 10) {
        messages.push({
            type: 'suggestion',
            icon: '🎯',
            text: `Con un orizzonte lungo, potresti considerare un profilo moderato per ${company.name} per maggiori rendimenti.`
        });
    }
    
    if (riskProfile === 'aggressive' && years < 3) {
        messages.push({
            type: 'warning',
            icon: '⚠️',
            text: `Investimenti aggressivi in azioni ${company.name} richiedono almeno 5-10 anni per mitigare la volatilità.`
        });
    }
    
    // Raccomandazioni specifiche per azioni di crescita
    if (companyStock === 'growth') {
        messages.push({
            type: 'tip',
            icon: '📈',
            text: `${company.name} è una società di crescita: le azioni possono essere volatili ma offrono potenziale di apprezzamento a lungo termine.`
        });
    }
    
    // Raccomandazioni generali
    messages.push({
        type: 'tip',
        icon: '📚',
        text: profile.description
    });
    
    messages.push({
        type: 'tip',
        icon: '🔄',
        text: 'Ricorda: diversifica sempre il tuo portafoglio e investi solo ciò che puoi permetterti di perdere.'
    });
    
    return messages;
}

// Genera proiezione annuale
function generateYearlyProjection(monthlyAmount, years, riskProfile, strategy) {
    const projection = [];
    let currentValue = 0;
    let totalInvested = 0;
    
    // Usa il risparmio mensile totale dei 4 investitori come investimento mensile, oppure il valore inserito
    const monthlyInvestment = getCurrentMonthlySaving() || monthlyAmount;
    
    for (let year = 1; year <= years; year++) {
        let yearResult;
        
        if (strategy === 'dca') {
            const monthsThisYear = Math.min(12, (years * 12) - (year - 1) * 12);
            let yearValue = currentValue;
            
            for (let month = 0; month < monthsThisYear; month++) {
                totalInvested += monthlyInvestment;
                const annualReturn = calculateAnnualReturn(riskProfile, year - 1);
                const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
                yearValue = (yearValue + monthlyInvestment) * (1 + monthlyReturn);
            }
            
            currentValue = yearValue;
            yearResult = {
                year: year,
                invested: totalInvested,
                value: currentValue,
                gain: currentValue - totalInvested
            };
        } else if (strategy === 'monthly') {
            const monthsThisYear = Math.min(12, (years * 12) - (year - 1) * 12);
            let yearValue = currentValue;
            
            for (let month = 0; month < monthsThisYear; month++) {
                totalInvested += monthlyInvestment;
                const annualReturn = calculateAnnualReturn(riskProfile, year - 1);
                const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
                yearValue = yearValue * (1 + monthlyReturn) + monthlyInvestment;
            }
            
            currentValue = yearValue;
            yearResult = {
                year: year,
                invested: totalInvested,
                value: currentValue,
                gain: currentValue - totalInvested
            };
        } else {
            // Per lump sum, calcola come se avesse investito tutto il capitale totale iniziale
            const totalAmount = monthlyInvestment * years * 12;
            if (year === 1) {
                currentValue = totalAmount;
                totalInvested = totalAmount;
            }
            const annualReturn = calculateAnnualReturn(riskProfile, year - 1);
            currentValue = currentValue * (1 + annualReturn);
            yearResult = {
                year: year,
                invested: totalInvested,
                value: currentValue,
                gain: currentValue - totalInvested
            };
        }
        
        projection.push(yearResult);
    }
    
    return projection;
}

// Ottiene il risparmio mensile totale corrente
function getCurrentMonthlySaving() {
    // Prova prima con il risparmio di gruppo
    const calculatedTotalElement = document.getElementById('calculatedTotal');
    if (calculatedTotalElement) {
        const calculatedTotalText = calculatedTotalElement.textContent;
        const calculatedTotal = parseFloat(calculatedTotalText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (calculatedTotal > 0) {
            return calculatedTotal;
        }
    }
    
    // Se non c'è risparmio di gruppo, prova con il risparmio individuale
    const monthlySavingInput = document.getElementById('monthlySaving');
    if (monthlySavingInput) {
        const monthlySaving = parseFloat(monthlySavingInput.value) || 0;
        if (monthlySaving > 0) {
            return monthlySaving;
        }
    }
    
    // Se non c'è nulla, prova con il display
    const monthlySavingDisplay = document.getElementById('monthlySavingDisplay');
    if (monthlySavingDisplay) {
        const monthlySavingText = monthlySavingDisplay.textContent;
        const monthlySaving = parseFloat(monthlySavingText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (monthlySaving > 0) {
            return monthlySaving;
        }
    }
    
    return 0;
}

// Visualizza i risultati dell'investimento
function displayInvestmentResults(result, riskProfile, strategy, amount, years, companyStock = 'growth') {
    const resultsDiv = document.getElementById('investmentResults');
    resultsDiv.style.display = 'block';
    
    // Ottieni informazioni sulla società
    const company = COMPANY_INFO[companyStock] || COMPANY_INFO.growth;
    
    // Mostra informazioni sulla società
    const companyInfoDiv = document.getElementById('companyInfo');
    if (companyInfoDiv) {
        companyInfoDiv.innerHTML = `
            <div class="company-badge">
                <span class="company-name">🏢 ${company.fullName}</span>
                <span class="company-sector">${company.sector}</span>
            </div>
        `;
    }
    
    // Usa il risparmio mensile totale dei 4 investitori come investimento mensile, oppure il valore inserito
    const monthlyInvestment = getCurrentMonthlySaving() || amount;
    
    // Aggiorna summary
    const monthlyInvestmentElement = document.getElementById('monthlyInvestment');
    if (monthlyInvestmentElement) {
        monthlyInvestmentElement.textContent = monthlyInvestment > 0 
            ? formatCurrency(monthlyInvestment) 
            : 'N/A';
    }
    
    const finalCapitalElement = document.getElementById('finalCapital');
    if (finalCapitalElement) {
        finalCapitalElement.textContent = formatCurrency(result.finalValue);
    }
    
    const totalGainElement = document.getElementById('totalGain');
    if (totalGainElement) {
        totalGainElement.textContent = formatCurrency(result.gain);
    }
    
    const returnPercentageElement = document.getElementById('returnPercentage');
    if (returnPercentageElement) {
        const returnPercentage = (result.gain / result.totalInvested) * 100;
        returnPercentageElement.textContent = `${returnPercentage.toFixed(2)}%`;
    }
    
    // Genera raccomandazioni (amount è ora l'importo mensile)
    const recommendations = generateBotRecommendations(result, riskProfile, strategy, amount, years, companyStock);
    const messagesDiv = document.getElementById('botMessages');
    messagesDiv.innerHTML = recommendations.map(rec => `
        <div class="bot-message ${rec.type}">
            <span class="bot-icon">${rec.icon}</span>
            <span class="bot-text">${rec.text}</span>
        </div>
    `).join('');
    
    // Genera breakdown annuale (amount è l'importo mensile)
    const projection = generateYearlyProjection(amount, years, riskProfile, strategy);
    const breakdownDiv = document.getElementById('investmentBreakdown');
    breakdownDiv.innerHTML = projection.map(proj => {
        const returnPercentage = (proj.gain / proj.invested) * 100;
        // Logica corretta: quando compriamo azioni, i soldi che mettiamo sono l'investimento
        // Se le vendiamo a più di quanto abbiamo speso, la differenza è il guadagno
        // Quindi: Guadagno = Ricavo dalla vendita - Investimento iniziale
        // proj.value = valore totale quando vendiamo le azioni (Ricavo)
        // proj.invested = quanto abbiamo speso per comprare (Investimento)
        // proj.gain = proj.value - proj.invested (Guadagno)
        const revenue = proj.value; // Ricavo = valore totale dalla vendita delle azioni
        const gain = proj.value - proj.invested; // Guadagno = Ricavo - Investimento
        return `
        <div class="breakdown-year-card">
            <div class="year-header">Anno ${proj.year}</div>
            <div class="year-details">
                <div class="year-detail-item">
                    <span class="year-label">Investito:</span>
                    <span class="year-value">${formatCurrency(proj.invested)}</span>
                </div>
                <div class="year-detail-item">
                    <span class="year-label">Guadagno:</span>
                    <span class="year-value profit">${formatCurrency(revenue)}</span>
                </div>
                <div class="year-detail-item highlight">
                    <span class="year-label">Ricavo:</span>
                    <span class="year-value profit">${formatCurrency(gain)} (${returnPercentage.toFixed(2)}%)</span>
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    // Genera diagramma delle onde di Elliott
    renderElliottWaveChart(projection);
    
    // Genera diagramma originale della società Growth (con dati reali dal web)
    renderGrowthCompanyChart(companyStock);
    
    // Scrolla ai risultati
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Genera le onde di Elliott basate sulla proiezione
function generateElliottWaves(projection) {
    if (!projection || projection.length === 0) return [];
    
    const waves = [];
    const totalYears = projection.length;
    
    // Calcola i cambiamenti percentuali anno per anno
    const changes = projection.map((proj, index) => {
        if (index === 0) return 0;
        const prevValue = projection[index - 1].value;
        const change = ((proj.value - prevValue) / prevValue) * 100;
        return change;
    });
    
    // Pattern onde di Elliott: 5 onde impulsive + 3 correttive
    // Adattiamo il pattern ai dati disponibili
    const wavePattern = [];
    let waveIndex = 0;
    
    for (let i = 0; i < totalYears; i++) {
        const year = projection[i].year;
        const value = projection[i].value;
        const change = changes[i] || 0;
        
        // Assegna le onde secondo il pattern di Elliott
        let waveType;
        if (i < totalYears * 0.625) {
            // Prime 5 onde (impulsive)
            const phase = Math.floor((i / (totalYears * 0.625)) * 5);
            waveType = ['1', '2', '3', '4', '5'][phase] || '5';
        } else {
            // Ultime 3 onde (correttive)
            const phase = Math.floor(((i - totalYears * 0.625) / (totalYears * 0.375)) * 3);
            waveType = ['A', 'B', 'C'][phase] || 'C';
        }
        
        wavePattern.push({
            year: year,
            value: value,
            change: change,
            waveType: waveType,
            index: i,
            invested: projection[i].invested
        });
    }
    
    return wavePattern;
}

// Renderizza il diagramma delle onde di Elliott
function renderElliottWaveChart(projection) {
    const svg = document.getElementById('elliottWaveChart');
    const slider = document.getElementById('waveTimeSlider');
    if (!svg || !slider) return;
    
    const waves = generateElliottWaves(projection);
    if (waves.length === 0) return;
    
    const width = 1000;
    const height = 500;
    const padding = { top: 60, right: 80, bottom: 80, left: 100 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    
    // Trova min e max per la scala
    const values = waves.map(w => w.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    
    // Funzione per convertire valore in coordinata Y
    const scaleY = (value) => {
        return chartHeight - ((value - minValue) / valueRange) * chartHeight + padding.top;
    };
    
    // Funzione per convertire indice in coordinata X
    const scaleX = (index) => {
        return (index / (waves.length - 1)) * chartWidth + padding.left;
    };
    
    // Crea gruppo per gli elementi di sfondo
    const bgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bgGroup.setAttribute('class', 'chart-background');
    
    // Disegna griglia orizzontale (linee di valore)
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
        const value = minValue + (valueRange / gridLines) * i;
        const y = scaleY(value);
        
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', padding.left);
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', width - padding.right);
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', '#e0e0e0');
        gridLine.setAttribute('stroke-width', '1');
        gridLine.setAttribute('stroke-dasharray', '2,2');
        bgGroup.appendChild(gridLine);
        
        // Etichetta valore
        const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueLabel.setAttribute('x', padding.left - 10);
        valueLabel.setAttribute('y', y + 4);
        valueLabel.setAttribute('text-anchor', 'end');
        valueLabel.setAttribute('font-size', '11');
        valueLabel.setAttribute('fill', '#666');
        valueLabel.setAttribute('font-family', 'Georgia, serif');
        valueLabel.textContent = formatCurrency(value);
        bgGroup.appendChild(valueLabel);
    }
    
    // Disegna griglia verticale (linee temporali)
    waves.forEach((wave, index) => {
        const x = scaleX(index);
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', x);
        gridLine.setAttribute('y1', padding.top);
        gridLine.setAttribute('x2', x);
        gridLine.setAttribute('y2', height - padding.bottom);
        gridLine.setAttribute('stroke', '#f0f0f0');
        gridLine.setAttribute('stroke-width', '1');
        bgGroup.appendChild(gridLine);
    });
    
    svg.appendChild(bgGroup);
    
    // Disegna area sotto le onde (riempimento)
    const areaPathData = waves.map((wave, index) => {
        const x = scaleX(index);
        const y = scaleY(wave.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + 
    ` L ${scaleX(waves.length - 1)} ${scaleY(minValue)} L ${scaleX(0)} ${scaleY(minValue)} Z`;
    
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', areaPathData);
    areaPath.setAttribute('fill', 'url(#waveGradient)');
    areaPath.setAttribute('opacity', '0.2');
    svg.appendChild(areaPath);
    
    // Definisci gradiente per l'area
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'waveGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#3949ab');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#d4af37');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.insertBefore(defs, svg.firstChild);
    
    // Disegna le onde con linea più spessa
    const pathData = waves.map((wave, index) => {
        const x = scaleX(index);
        const y = scaleY(wave.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    const wavePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    wavePath.setAttribute('d', pathData);
    wavePath.setAttribute('fill', 'none');
    wavePath.setAttribute('stroke', '#1a237e');
    wavePath.setAttribute('stroke-width', '4');
    wavePath.setAttribute('class', 'elliott-wave-path');
    svg.appendChild(wavePath);
    
    // Disegna i punti delle onde con più dettagli
    waves.forEach((wave, index) => {
        const x = scaleX(index);
        const y = scaleY(wave.value);
        
        // Cerchio esterno per evidenziare
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', x);
        outerCircle.setAttribute('cy', y);
        outerCircle.setAttribute('r', '8');
        outerCircle.setAttribute('fill', 'rgba(212, 175, 55, 0.2)');
        outerCircle.setAttribute('class', 'wave-point-outer');
        svg.appendChild(outerCircle);
        
        // Punto principale
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#3949ab');
        circle.setAttribute('stroke', '#d4af37');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'wave-point');
        circle.setAttribute('data-index', index);
        svg.appendChild(circle);
        
        // Etichetta onda con sfondo
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', x - 12);
        labelBg.setAttribute('y', y - 35);
        labelBg.setAttribute('width', '24');
        labelBg.setAttribute('height', '18');
        labelBg.setAttribute('rx', '3');
        labelBg.setAttribute('fill', '#d4af37');
        labelBg.setAttribute('opacity', '0.9');
        svg.appendChild(labelBg);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y - 22);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '13');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', '#1a237e');
        label.setAttribute('font-family', 'Georgia, serif');
        label.textContent = wave.waveType;
        svg.appendChild(label);
        
        // Valore del punto
        const valueTextBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        valueTextBg.setAttribute('x', x - 35);
        valueTextBg.setAttribute('y', y - 55);
        valueTextBg.setAttribute('width', '70');
        valueTextBg.setAttribute('height', '16');
        valueTextBg.setAttribute('rx', '3');
        valueTextBg.setAttribute('fill', 'white');
        valueTextBg.setAttribute('opacity', '0.9');
        valueTextBg.setAttribute('stroke', '#1a237e');
        valueTextBg.setAttribute('stroke-width', '1');
        svg.appendChild(valueTextBg);
        
        const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valueText.setAttribute('x', x);
        valueText.setAttribute('y', y - 42);
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('font-size', '10');
        valueText.setAttribute('font-weight', '600');
        valueText.setAttribute('fill', '#1a237e');
        valueText.setAttribute('font-family', 'Georgia, serif');
        valueText.textContent = formatCurrency(wave.value);
        svg.appendChild(valueText);
        
        // Etichetta anno con sfondo
        const yearBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        yearBg.setAttribute('x', x - 25);
        yearBg.setAttribute('y', height - padding.bottom + 5);
        yearBg.setAttribute('width', '50');
        yearBg.setAttribute('height', '20');
        yearBg.setAttribute('rx', '3');
        yearBg.setAttribute('fill', '#1a237e');
        yearBg.setAttribute('opacity', '0.1');
        svg.appendChild(yearBg);
        
        const yearLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yearLabel.setAttribute('x', x);
        yearLabel.setAttribute('y', height - padding.bottom + 20);
        yearLabel.setAttribute('text-anchor', 'middle');
        yearLabel.setAttribute('font-size', '11');
        yearLabel.setAttribute('font-weight', '600');
        yearLabel.setAttribute('fill', '#1a237e');
        yearLabel.setAttribute('font-family', 'Georgia, serif');
        yearLabel.textContent = `Anno ${wave.year}`;
        svg.appendChild(yearLabel);
    });
    
    // Assi del grafico
    // Asse Y
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', padding.left);
    yAxis.setAttribute('y1', padding.top);
    yAxis.setAttribute('x2', padding.left);
    yAxis.setAttribute('y2', height - padding.bottom);
    yAxis.setAttribute('stroke', '#1a237e');
    yAxis.setAttribute('stroke-width', '2');
    svg.insertBefore(yAxis, svg.firstChild.nextSibling);
    
    // Asse X
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', padding.left);
    xAxis.setAttribute('y1', height - padding.bottom);
    xAxis.setAttribute('x2', width - padding.right);
    xAxis.setAttribute('y2', height - padding.bottom);
    xAxis.setAttribute('stroke', '#1a237e');
    xAxis.setAttribute('stroke-width', '2');
    svg.insertBefore(xAxis, svg.firstChild.nextSibling);
    
    // Etichette assi
    const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yAxisLabel.setAttribute('x', 15);
    yAxisLabel.setAttribute('y', height / 2);
    yAxisLabel.setAttribute('transform', `rotate(-90, 15, ${height / 2})`);
    yAxisLabel.setAttribute('text-anchor', 'middle');
    yAxisLabel.setAttribute('font-size', '12');
    yAxisLabel.setAttribute('font-weight', '600');
    yAxisLabel.setAttribute('fill', '#1a237e');
    yAxisLabel.setAttribute('font-family', 'Georgia, serif');
    yAxisLabel.textContent = 'Valore Investimento (€)';
    svg.appendChild(yAxisLabel);
    
    const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xAxisLabel.setAttribute('x', width / 2);
    xAxisLabel.setAttribute('y', height - 15);
    xAxisLabel.setAttribute('text-anchor', 'middle');
    xAxisLabel.setAttribute('font-size', '12');
    xAxisLabel.setAttribute('font-weight', '600');
    xAxisLabel.setAttribute('fill', '#1a237e');
    xAxisLabel.setAttribute('font-family', 'Georgia, serif');
    xAxisLabel.textContent = 'Tempo (Anni)';
    svg.appendChild(xAxisLabel);
    
    // Linea guida verticale per il cursore
    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('class', 'wave-guide-line');
    guideLine.setAttribute('stroke', '#d4af37');
    guideLine.setAttribute('stroke-width', '3');
    guideLine.setAttribute('stroke-dasharray', '8,4');
    guideLine.setAttribute('opacity', '0');
    svg.appendChild(guideLine);
    
    // Punto guida sul cursore
    const guidePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    guidePoint.setAttribute('class', 'wave-guide-point');
    guidePoint.setAttribute('r', '10');
    guidePoint.setAttribute('fill', '#d4af37');
    guidePoint.setAttribute('stroke', 'white');
    guidePoint.setAttribute('stroke-width', '3');
    guidePoint.setAttribute('opacity', '0');
    svg.appendChild(guidePoint);
    
    // Tooltip per informazioni dettagliate
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tooltip.setAttribute('class', 'wave-tooltip');
    tooltip.setAttribute('opacity', '0');
    
    const tooltipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    tooltipBg.setAttribute('width', '180');
    tooltipBg.setAttribute('height', '80');
    tooltipBg.setAttribute('rx', '5');
    tooltipBg.setAttribute('fill', '#1a237e');
    tooltipBg.setAttribute('opacity', '0.95');
    tooltip.appendChild(tooltipBg);
    
    const tooltipTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipTitle.setAttribute('x', '10');
    tooltipTitle.setAttribute('y', '20');
    tooltipTitle.setAttribute('font-size', '12');
    tooltipTitle.setAttribute('font-weight', 'bold');
    tooltipTitle.setAttribute('fill', 'white');
    tooltipTitle.setAttribute('font-family', 'Georgia, serif');
    tooltipTitle.textContent = 'Anno: 0';
    tooltip.appendChild(tooltipTitle);
    
    const tooltipValue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipValue.setAttribute('x', '10');
    tooltipValue.setAttribute('y', '40');
    tooltipValue.setAttribute('font-size', '11');
    tooltipValue.setAttribute('fill', '#d4af37');
    tooltipValue.setAttribute('font-family', 'Georgia, serif');
    tooltipValue.textContent = 'Valore: €0.00';
    tooltip.appendChild(tooltipValue);
    
    const tooltipChange = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipChange.setAttribute('x', '10');
    tooltipChange.setAttribute('y', '60');
    tooltipChange.setAttribute('font-size', '11');
    tooltipChange.setAttribute('fill', 'white');
    tooltipChange.setAttribute('font-family', 'Georgia, serif');
    tooltipChange.textContent = 'Variazione: 0%';
    tooltip.appendChild(tooltipChange);
    
    svg.appendChild(tooltip);
    
    // Aggiorna slider
    slider.setAttribute('max', waves.length - 1);
    slider.setAttribute('value', '0');
    
    // Funzione per aggiornare la posizione del cursore
    function updateWaveCursor(value) {
        const index = parseInt(value);
        const wave = waves[index];
        if (!wave) return;
        
        const x = scaleX(index);
        const y = scaleY(wave.value);
        
        // Aggiorna linea guida
        guideLine.setAttribute('x1', x);
        guideLine.setAttribute('y1', padding.top);
        guideLine.setAttribute('x2', x);
        guideLine.setAttribute('y2', height - padding.bottom);
        guideLine.setAttribute('opacity', '1');
        
        // Aggiorna punto guida
        guidePoint.setAttribute('cx', x);
        guidePoint.setAttribute('cy', y);
        guidePoint.setAttribute('opacity', '1');
        
        // Aggiorna tooltip
        tooltipTitle.textContent = `Anno: ${wave.year}`;
        tooltipValue.textContent = `Valore: ${formatCurrency(wave.value)}`;
        const changeText = wave.change >= 0 
            ? `+${wave.change.toFixed(2)}%` 
            : `${wave.change.toFixed(2)}%`;
        tooltipChange.textContent = `Variazione: ${changeText}`;
        
        // Posiziona tooltip
        const tooltipX = Math.min(x + 20, width - 200);
        const tooltipY = Math.max(y - 100, padding.top + 20);
        tooltip.setAttribute('transform', `translate(${tooltipX}, ${tooltipY})`);
        tooltip.setAttribute('opacity', '1');
        
        // Aggiorna etichette controllo
        document.getElementById('waveTimeLabel').textContent = `Anno: ${wave.year}`;
        document.getElementById('waveChangeLabel').textContent = `Variazione: ${changeText}`;
        
        // Calcola informazioni aggiuntive
        const investedLabel = document.getElementById('waveInvestedLabel');
        if (investedLabel) {
            investedLabel.textContent = `Investito: ${formatCurrency(wave.invested || projection[index]?.invested || 0)}`;
        }
        
        const gainLabel = document.getElementById('waveGainLabel');
        if (gainLabel) {
            const gain = wave.value - (wave.invested || projection[index]?.invested || 0);
            gainLabel.textContent = `Guadagno: ${formatCurrency(gain)}`;
        }
        
        // Evidenzia il punto corrente
        document.querySelectorAll('.wave-point').forEach((point, i) => {
            if (i === index) {
                point.setAttribute('r', '10');
                point.setAttribute('fill', '#d4af37');
                point.setAttribute('stroke-width', '3');
            } else {
                point.setAttribute('r', '6');
                point.setAttribute('fill', '#3949ab');
                point.setAttribute('stroke-width', '2');
            }
        });
        
        document.querySelectorAll('.wave-point-outer').forEach((point, i) => {
            if (i === index) {
                point.setAttribute('r', '15');
                point.setAttribute('opacity', '0.4');
            } else {
                point.setAttribute('r', '8');
                point.setAttribute('opacity', '0.2');
            }
        });
    }
    
    // Event listener per il cursore
    slider.addEventListener('input', function(e) {
        updateWaveCursor(e.target.value);
    });
    
    // Inizializza
    updateWaveCursor(0);
}

// Renderizza il diagramma originale della società Growth
async function renderGrowthCompanyChart(companyStock = 'growth') {
    const svg = document.getElementById('growthCompanyChart');
    if (!svg) return;
    
    const company = COMPANY_INFO[companyStock] || COMPANY_INFO.growth;
    
    // Mostra indicatore di caricamento
    svg.innerHTML = '<text x="500" y="200" text-anchor="middle" font-size="16" fill="#666">Caricamento dati...</text>';
    
    // Prova a recuperare dati reali dal web
    let historicalData = null;
    if (company.symbol) {
        historicalData = await fetchStockData(company.symbol);
    }
    
    // Se non ci sono dati reali, usa dati simulati come fallback
    if (!historicalData || historicalData.length === 0) {
        historicalData = [];
        const basePrice = 150; // Prezzo base simulato
        let currentPrice = basePrice;
        
        for (let month = 0; month < 12; month++) {
            // Simula variazioni mensili realistiche
            const monthlyChange = (Math.random() - 0.4) * 0.15; // Variazione tra -5% e +10%
            currentPrice = currentPrice * (1 + monthlyChange);
            
            const high = currentPrice * (1 + Math.random() * 0.05);
            const low = currentPrice * (1 - Math.random() * 0.05);
            const open = month === 0 ? basePrice : historicalData[month - 1].close;
            const close = currentPrice;
            
            historicalData.push({
                month: month + 1,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: Math.floor(Math.random() * 5000000 + 2000000)
            });
        }
    }
    
    const width = 1000;
    const height = 400;
    const padding = { top: 50, right: 60, bottom: 70, left: 100 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';
    
    // Trova min e max per la scala
    const allPrices = historicalData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    
    // Funzione per convertire prezzo in coordinata Y
    const scaleY = (price) => {
        return chartHeight - ((price - minPrice) / priceRange) * chartHeight + padding.top;
    };
    
    // Funzione per convertire mese in coordinata X
    const scaleX = (monthIndex) => {
        return (monthIndex / (historicalData.length - 1)) * chartWidth + padding.left;
    };
    
    // Crea gruppo per gli elementi di sfondo
    const bgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bgGroup.setAttribute('class', 'chart-background');
    
    // Disegna griglia orizzontale
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
        const price = minPrice + (priceRange / gridLines) * i;
        const y = scaleY(price);
        
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', padding.left);
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', width - padding.right);
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', '#e0e0e0');
        gridLine.setAttribute('stroke-width', '1');
        gridLine.setAttribute('stroke-dasharray', '2,2');
        bgGroup.appendChild(gridLine);
        
        // Etichetta prezzo
        const priceLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        priceLabel.setAttribute('x', padding.left - 10);
        priceLabel.setAttribute('y', y + 4);
        priceLabel.setAttribute('text-anchor', 'end');
        priceLabel.setAttribute('font-size', '11');
        priceLabel.setAttribute('fill', '#666');
        priceLabel.setAttribute('font-family', 'Georgia, serif');
        priceLabel.textContent = `€${price.toFixed(2)}`;
        bgGroup.appendChild(priceLabel);
    }
    
    svg.appendChild(bgGroup);
    
    // Crea gruppo per le candele
    const candlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    candlesGroup.setAttribute('class', 'candles-group');
    
    // Disegna candele giapponesi per ogni mese con più dettagli
    historicalData.forEach((data, index) => {
        const x = scaleX(index);
        const openY = scaleY(data.open);
        const closeY = scaleY(data.close);
        const highY = scaleY(data.high);
        const lowY = scaleY(data.low);
        
        const isUp = data.close >= data.open;
        const color = isUp ? '#4caf50' : '#f44336';
        const change = ((data.close - data.open) / data.open) * 100;
        
        // Crea gruppo per questa candela
        const candleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        candleGroup.setAttribute('class', 'candle-group');
        candleGroup.setAttribute('data-index', index);
        
        // Linea verticale (high-low) più spessa
        const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        wick.setAttribute('x1', x);
        wick.setAttribute('y1', highY);
        wick.setAttribute('x2', x);
        wick.setAttribute('y2', lowY);
        wick.setAttribute('stroke', color);
        wick.setAttribute('stroke-width', '3');
        wick.setAttribute('class', 'candle-wick');
        candleGroup.appendChild(wick);
        
        // Corpo della candela più grande
        const bodyHeight = Math.abs(closeY - openY) || 3;
        const bodyY = Math.min(openY, closeY);
        const bodyWidth = chartWidth / historicalData.length * 0.7;
        
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', x - bodyWidth / 2);
        body.setAttribute('y', bodyY);
        body.setAttribute('width', bodyWidth);
        body.setAttribute('height', bodyHeight);
        body.setAttribute('fill', color);
        body.setAttribute('stroke', '#1a237e');
        body.setAttribute('stroke-width', '1.5');
        body.setAttribute('opacity', '0.85');
        body.setAttribute('class', 'candle-body');
        body.setAttribute('rx', '2');
        candleGroup.appendChild(body);
        
        // Punti per evidenziare open e close
        const openPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        openPoint.setAttribute('cx', x);
        openPoint.setAttribute('cy', openY);
        openPoint.setAttribute('r', '3');
        openPoint.setAttribute('fill', '#1a237e');
        openPoint.setAttribute('stroke', 'white');
        openPoint.setAttribute('stroke-width', '1');
        openPoint.setAttribute('class', 'candle-point');
        candleGroup.appendChild(openPoint);
        
        const closePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        closePoint.setAttribute('cx', x);
        closePoint.setAttribute('cy', closeY);
        closePoint.setAttribute('r', '3');
        closePoint.setAttribute('fill', '#1a237e');
        closePoint.setAttribute('stroke', 'white');
        closePoint.setAttribute('stroke-width', '1');
        closePoint.setAttribute('class', 'candle-point');
        candleGroup.appendChild(closePoint);
        
        candlesGroup.appendChild(candleGroup);
        
        // Etichetta mese con sfondo
        const monthBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        monthBg.setAttribute('x', x - 20);
        monthBg.setAttribute('y', height - padding.bottom + 5);
        monthBg.setAttribute('width', '40');
        monthBg.setAttribute('height', '18');
        monthBg.setAttribute('rx', '3');
        monthBg.setAttribute('fill', '#1a237e');
        monthBg.setAttribute('opacity', '0.1');
        svg.appendChild(monthBg);
        
        const monthLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        monthLabel.setAttribute('x', x);
        monthLabel.setAttribute('y', height - padding.bottom + 18);
        monthLabel.setAttribute('text-anchor', 'middle');
        monthLabel.setAttribute('font-size', '11');
        monthLabel.setAttribute('font-weight', '600');
        monthLabel.setAttribute('fill', '#1a237e');
        monthLabel.setAttribute('font-family', 'Georgia, serif');
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        monthLabel.textContent = monthNames[data.month - 1] || `M${data.month}`;
        svg.appendChild(monthLabel);
    });
    
    svg.appendChild(candlesGroup);
    
    // Linea di tendenza (media mobile)
    const trendPath = historicalData.map((data, index) => {
        const x = scaleX(index);
        const avgPrice = (data.open + data.close) / 2;
        const y = scaleY(avgPrice);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    const trendLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trendLine.setAttribute('d', trendPath);
    trendLine.setAttribute('fill', 'none');
    trendLine.setAttribute('stroke', '#d4af37');
    trendLine.setAttribute('stroke-width', '3');
    trendLine.setAttribute('stroke-dasharray', '5,5');
    trendLine.setAttribute('opacity', '0.7');
    svg.appendChild(trendLine);
    
    // Assi del grafico
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', padding.left);
    yAxis.setAttribute('y1', padding.top);
    yAxis.setAttribute('x2', padding.left);
    yAxis.setAttribute('y2', height - padding.bottom);
    yAxis.setAttribute('stroke', '#1a237e');
    yAxis.setAttribute('stroke-width', '2');
    svg.insertBefore(yAxis, svg.firstChild.nextSibling);
    
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', padding.left);
    xAxis.setAttribute('y1', height - padding.bottom);
    xAxis.setAttribute('x2', width - padding.right);
    xAxis.setAttribute('y2', height - padding.bottom);
    xAxis.setAttribute('stroke', '#1a237e');
    xAxis.setAttribute('stroke-width', '2');
    svg.insertBefore(xAxis, svg.firstChild.nextSibling);
    
    // Etichette assi
    const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yAxisLabel.setAttribute('x', 15);
    yAxisLabel.setAttribute('y', height / 2);
    yAxisLabel.setAttribute('transform', `rotate(-90, 15, ${height / 2})`);
    yAxisLabel.setAttribute('text-anchor', 'middle');
    yAxisLabel.setAttribute('font-size', '12');
    yAxisLabel.setAttribute('font-weight', '600');
    yAxisLabel.setAttribute('fill', '#1a237e');
    yAxisLabel.setAttribute('font-family', 'Georgia, serif');
    yAxisLabel.textContent = 'Prezzo Azione (€)';
    svg.appendChild(yAxisLabel);
    
    const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xAxisLabel.setAttribute('x', width / 2);
    xAxisLabel.setAttribute('y', height - 20);
    xAxisLabel.setAttribute('text-anchor', 'middle');
    xAxisLabel.setAttribute('font-size', '12');
    xAxisLabel.setAttribute('font-weight', '600');
    xAxisLabel.setAttribute('fill', '#1a237e');
    xAxisLabel.setAttribute('font-family', 'Georgia, serif');
    xAxisLabel.textContent = 'Tempo (Ultimi 12 Mesi)';
    svg.appendChild(xAxisLabel);
    
    // Linea guida verticale per il cursore
    const guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    guideLine.setAttribute('class', 'company-guide-line');
    guideLine.setAttribute('stroke', '#d4af37');
    guideLine.setAttribute('stroke-width', '3');
    guideLine.setAttribute('stroke-dasharray', '8,4');
    guideLine.setAttribute('opacity', '0');
    svg.appendChild(guideLine);
    
    // Punto guida sul cursore
    const guidePoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    guidePoint.setAttribute('class', 'company-guide-point');
    guidePoint.setAttribute('r', '8');
    guidePoint.setAttribute('fill', '#d4af37');
    guidePoint.setAttribute('stroke', 'white');
    guidePoint.setAttribute('stroke-width', '3');
    guidePoint.setAttribute('opacity', '0');
    svg.appendChild(guidePoint);
    
    // Tooltip per informazioni dettagliate
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tooltip.setAttribute('class', 'company-tooltip');
    tooltip.setAttribute('opacity', '0');
    
    const tooltipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    tooltipBg.setAttribute('width', '200');
    tooltipBg.setAttribute('height', '120');
    tooltipBg.setAttribute('rx', '5');
    tooltipBg.setAttribute('fill', '#1a237e');
    tooltipBg.setAttribute('opacity', '0.95');
    tooltip.appendChild(tooltipBg);
    
    const tooltipTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipTitle.setAttribute('x', '10');
    tooltipTitle.setAttribute('y', '20');
    tooltipTitle.setAttribute('font-size', '13');
    tooltipTitle.setAttribute('font-weight', 'bold');
    tooltipTitle.setAttribute('fill', 'white');
    tooltipTitle.setAttribute('font-family', 'Georgia, serif');
    tooltipTitle.textContent = 'Mese: Gennaio';
    tooltip.appendChild(tooltipTitle);
    
    const tooltipOpen = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipOpen.setAttribute('x', '10');
    tooltipOpen.setAttribute('y', '40');
    tooltipOpen.setAttribute('font-size', '11');
    tooltipOpen.setAttribute('fill', '#d4af37');
    tooltipOpen.setAttribute('font-family', 'Georgia, serif');
    tooltipOpen.textContent = 'Apertura: €0.00';
    tooltip.appendChild(tooltipOpen);
    
    const tooltipClose = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipClose.setAttribute('x', '10');
    tooltipClose.setAttribute('y', '60');
    tooltipClose.setAttribute('font-size', '11');
    tooltipClose.setAttribute('fill', '#d4af37');
    tooltipClose.setAttribute('font-family', 'Georgia, serif');
    tooltipClose.textContent = 'Chiusura: €0.00';
    tooltip.appendChild(tooltipClose);
    
    const tooltipHigh = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipHigh.setAttribute('x', '10');
    tooltipHigh.setAttribute('y', '80');
    tooltipHigh.setAttribute('font-size', '11');
    tooltipHigh.setAttribute('fill', 'white');
    tooltipHigh.setAttribute('font-family', 'Georgia, serif');
    tooltipHigh.textContent = 'Massimo: €0.00';
    tooltip.appendChild(tooltipHigh);
    
    const tooltipLow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tooltipLow.setAttribute('x', '10');
    tooltipLow.setAttribute('y', '100');
    tooltipLow.setAttribute('font-size', '11');
    tooltipLow.setAttribute('fill', 'white');
    tooltipLow.setAttribute('font-family', 'Georgia, serif');
    tooltipLow.textContent = 'Minimo: €0.00';
    tooltip.appendChild(tooltipLow);
    
    svg.appendChild(tooltip);
    
    // Aggiorna slider
    const slider = document.getElementById('companyTimeSlider');
    if (slider) {
        slider.setAttribute('max', historicalData.length - 1);
        slider.setAttribute('value', '0');
        
        // Funzione per aggiornare la posizione del cursore
        function updateCompanyCursor(value) {
            const index = parseInt(value);
            const data = historicalData[index];
            if (!data) return;
            
            const x = scaleX(index);
            const closeY = scaleY(data.close);
            const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                               'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
            
            // Aggiorna linea guida
            guideLine.setAttribute('x1', x);
            guideLine.setAttribute('y1', padding.top);
            guideLine.setAttribute('x2', x);
            guideLine.setAttribute('y2', height - padding.bottom);
            guideLine.setAttribute('opacity', '1');
            
            // Aggiorna punto guida
            guidePoint.setAttribute('cx', x);
            guidePoint.setAttribute('cy', closeY);
            guidePoint.setAttribute('opacity', '1');
            
            // Aggiorna tooltip
            tooltipTitle.textContent = `Mese: ${monthNames[data.month - 1] || `Mese ${data.month}`}`;
            tooltipOpen.textContent = `Apertura: ${formatCurrency(data.open)}`;
            tooltipClose.textContent = `Chiusura: ${formatCurrency(data.close)}`;
            tooltipHigh.textContent = `Massimo: ${formatCurrency(data.high)}`;
            tooltipLow.textContent = `Minimo: ${formatCurrency(data.low)}`;
            
            // Posiziona tooltip
            const tooltipX = Math.min(x + 20, width - 220);
            const tooltipY = Math.max(closeY - 140, padding.top + 20);
            tooltip.setAttribute('transform', `translate(${tooltipX}, ${tooltipY})`);
            tooltip.setAttribute('opacity', '1');
            
            // Aggiorna etichette controllo
            document.getElementById('companyMonthLabel').textContent = `Mese: ${monthNames[data.month - 1] || `Mese ${data.month}`}`;
            document.getElementById('companyPriceLabel').textContent = `Prezzo: ${formatCurrency(data.close)}`;
            document.getElementById('companyOpenLabel').textContent = `Apertura: ${formatCurrency(data.open)}`;
            document.getElementById('companyCloseLabel').textContent = `Chiusura: ${formatCurrency(data.close)}`;
            document.getElementById('companyHighLabel').textContent = `Massimo: ${formatCurrency(data.high)}`;
            document.getElementById('companyLowLabel').textContent = `Minimo: ${formatCurrency(data.low)}`;
            document.getElementById('companyVolumeLabel').textContent = `Volume: ${(data.volume / 1000000).toFixed(2)}M`;
            
            const change = ((data.close - data.open) / data.open) * 100;
            const changeText = change >= 0 
                ? `+${change.toFixed(2)}%` 
                : `${change.toFixed(2)}%`;
            document.getElementById('companyChangeLabel').textContent = `Variazione: ${changeText}`;
            document.getElementById('companyChangeLabel').style.color = change >= 0 ? '#4caf50' : '#f44336';
            
            // Evidenzia la candela corrente
            document.querySelectorAll('.candle-group').forEach((candle, i) => {
                const body = candle.querySelector('.candle-body');
                const wick = candle.querySelector('.candle-wick');
                if (i === index) {
                    body.setAttribute('stroke-width', '3');
                    body.setAttribute('opacity', '1');
                    wick.setAttribute('stroke-width', '4');
                } else {
                    body.setAttribute('stroke-width', '1.5');
                    body.setAttribute('opacity', '0.85');
                    wick.setAttribute('stroke-width', '3');
                }
            });
        }
        
        // Event listener per il cursore
        slider.addEventListener('input', function(e) {
            updateCompanyCursor(e.target.value);
        });
        
        // Inizializza
        updateCompanyCursor(0);
    }
    
    // Aggiorna statistiche generali
    const latestData = historicalData[historicalData.length - 1];
    const previousData = historicalData[historicalData.length - 2] || historicalData[0];
    const dailyChange = ((latestData.close - previousData.close) / previousData.close) * 100;
    const totalVolume = historicalData.reduce((sum, d) => sum + d.volume, 0);
    const avgPrice = historicalData.reduce((sum, d) => sum + d.close, 0) / historicalData.length;
    const marketCap = latestData.close * 10000000; // Simulato
    
    document.getElementById('currentPrice').textContent = formatCurrency(latestData.close);
    const changeText = dailyChange >= 0 
        ? `+${dailyChange.toFixed(2)}%` 
        : `${dailyChange.toFixed(2)}%`;
    document.getElementById('dailyChange').textContent = changeText;
    document.getElementById('dailyChange').style.color = dailyChange >= 0 ? '#4caf50' : '#f44336';
    document.getElementById('volume').textContent = `${(totalVolume / 1000000).toFixed(1)}M`;
    document.getElementById('marketCap').textContent = formatCurrency(marketCap);
    
    // Imposta aggiornamento automatico ogni 5 minuti
    clearInterval(window.growthChartUpdateInterval);
    window.growthChartUpdateInterval = setInterval(() => {
        renderGrowthCompanyChart(companyStock);
    }, 5 * 60 * 1000); // 5 minuti
}

// Gestione form investimento
const investmentForm = document.getElementById('investmentForm');
if (investmentForm) {
    investmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const monthlyAmount = parseFloat(document.getElementById('investmentAmount').value);
        const years = parseInt(document.getElementById('investmentYears').value);
        const riskProfile = document.getElementById('riskProfile').value;
        const strategy = document.getElementById('investmentStrategy').value;
        const companyStock = document.getElementById('companyStock').value || 'growth';
        
        if (!monthlyAmount || monthlyAmount < 100) {
            alert('Inserisci un importo mensile valido (minimo €100)');
            return;
        }
        
        if (!years || years < 1) {
            alert('Inserisci un numero di anni valido');
            return;
        }
        
        let result;
        const totalAmount = monthlyAmount * years * 12; // Capitale totale per strategia lump
        
        switch(strategy) {
            case 'dca':
                result = calculateDCAInvestment(monthlyAmount, years, riskProfile);
                break;
            case 'monthly':
                result = calculateMonthlyInvestment(monthlyAmount, years, riskProfile);
                break;
            case 'lump':
            default:
                // Per lump sum, calcola come se avesse investito tutto il capitale totale iniziale
                result = calculateLumpSumInvestment(totalAmount, years, riskProfile);
                break;
        }
        
        displayInvestmentResults(result, riskProfile, strategy, monthlyAmount, years, companyStock);
    });
}

// Aggiorna i nomi nei dati salvati se contengono "Simone", "Michela" o "Pietro"
function updateSavedNames(data) {
    if (!data) return data;
    
    if (data.investorNames) {
        // Sostituisci "Simone" o "Michela" con "L", "Pietro" con "X", "Leo" con "L", "Davide" con "D" nei nomi salvati
        if (typeof data.investorNames === 'string') {
            data.investorNames = data.investorNames
                .replace(/Simone/gi, 'L')
                .replace(/Michela/gi, 'L')
                .replace(/Pietro/gi, 'X')
                .replace(/Leo/gi, 'L')
                .replace(/Davide/gi, 'D');
        } else if (Array.isArray(data.investorNames)) {
            data.investorNames = data.investorNames.map(name => 
                name.replace(/Simone/gi, 'L')
                    .replace(/Michela/gi, 'L')
                    .replace(/Pietro/gi, 'X')
                    .replace(/Leo/gi, 'L')
                    .replace(/Davide/gi, 'D')
            );
        }
        // Salva i dati aggiornati
        saveMonthlySaving(data);
    }
    
    return data;
}

// Rileva se è un dispositivo mobile
function isMobileDevice() {
    // Controlla user agent
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Controlla dimensioni schermo
    const isMobileSize = window.innerWidth <= 768 || window.innerHeight <= 768;
    
    // Controlla touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUA || (isMobileSize && hasTouch);
}

// Migliora lo scroll orizzontale per i grafici su mobile
function enhanceHorizontalScroll() {
    if (!isMobileDevice()) return;
    
    const scrollContainers = document.querySelectorAll('.elliott-wave-container, .company-chart-container');
    scrollContainers.forEach(container => {
        let isScrolling = false;
        let startX = 0;
        let scrollLeft = 0;
        
        container.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            container.style.scrollBehavior = 'auto';
        });
        
        container.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 2; // Velocità scroll
            container.scrollLeft = scrollLeft - walk;
        });
        
        container.addEventListener('touchend', () => {
            isScrolling = false;
            container.style.scrollBehavior = 'smooth';
        });
    });
}

// Ottimizza i bottoni per touch su mobile
function optimizeTouchTargets() {
    if (!isMobileDevice()) return;
    
    const buttons = document.querySelectorAll('button, .btn-primary, .btn-update-rate, .btn-quick-convert');
    buttons.forEach(btn => {
        // Assicura che i bottoni abbiano almeno 44x44px per touch
        if (btn.offsetHeight < 44) {
            btn.style.minHeight = '44px';
        }
        if (btn.offsetWidth < 44) {
            btn.style.minWidth = '44px';
        }
    });
}

// Previeni lo zoom su input quando si fa focus (iOS Safari)
function preventZoomOnInput() {
    if (!isMobileDevice()) return;
    
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    inputs.forEach(input => {
        // Assicura che font-size sia almeno 16px per prevenire zoom
        const computedStyle = window.getComputedStyle(input);
        if (parseFloat(computedStyle.fontSize) < 16) {
            input.style.fontSize = '16px';
        }
    });
}

// Migliora la visualizzazione dei tooltip su mobile
function enhanceMobileTooltips() {
    if (!isMobileDevice()) return;
    
    // Aumenta la dimensione dei tooltip SVG su mobile
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .wave-tooltip rect,
            .company-tooltip rect {
                width: 200px !important;
            }
            .wave-tooltip text,
            .company-tooltip text {
                font-size: 12px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Inizializza l'applicazione
// Funzione per pulire completamente la cache del browser per i campi di investimento
function clearBrowserCacheForInvestment() {
    try {
        // Pulisci tutto il localStorage
        const localStorageKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                localStorageKeys.push(key);
            }
        }
        localStorageKeys.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                // Rimuovi se contiene riferimenti a investment o valori 800/25
                if (key.includes('investment') || key.includes('Investment') || 
                    (value && (value.includes('800') || value.includes('25')))) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Ignora errori
            }
        });
        
        // Pulisci tutto il sessionStorage
        const sessionStorageKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
                sessionStorageKeys.push(key);
            }
        }
        sessionStorageKeys.forEach(key => {
            try {
                const value = sessionStorage.getItem(key);
                if (key.includes('investment') || key.includes('Investment') || 
                    (value && (value.includes('800') || value.includes('25')))) {
                    sessionStorage.removeItem(key);
                }
            } catch (e) {
                // Ignora errori
            }
        });
        
        // Pulisci i dati salvati nel nostro sistema
        const savedData = loadMonthlySaving();
        if (savedData) {
            delete savedData.investmentAmount;
            delete savedData.investmentYears;
            delete savedData.investmentMonthlyAmount;
            delete savedData.investmentYearsCount;
            saveMonthlySaving(savedData);
        }
        
        // Tenta di rimuovere i dati dall'autocomplete del browser
        const investmentAmountInput = document.getElementById('investmentAmount');
        const investmentYearsInput = document.getElementById('investmentYears');
        
        if (investmentAmountInput) {
            // Cambia temporaneamente il nome/id per forzare il browser a dimenticare i valori
            const oldName = investmentAmountInput.name;
            const oldId = investmentAmountInput.id;
            investmentAmountInput.name = oldName + '_cleared_' + Date.now();
            investmentAmountInput.id = oldId + '_cleared_' + Date.now();
            setTimeout(() => {
                investmentAmountInput.name = oldName;
                investmentAmountInput.id = oldId;
            }, 100);
            
            // Forza il valore a essere vuoto
            investmentAmountInput.value = '';
            investmentAmountInput.setAttribute('value', '');
            investmentAmountInput.removeAttribute('value');
            
            // Rimuovi anche dall'autocomplete
            if (investmentAmountInput.form) {
                investmentAmountInput.form.reset();
                investmentAmountInput.value = '';
            }
        }
        
        if (investmentYearsInput) {
            // Cambia temporaneamente il nome/id per forzare il browser a dimenticare i valori
            const oldName = investmentYearsInput.name;
            const oldId = investmentYearsInput.id;
            investmentYearsInput.name = oldName + '_cleared_' + Date.now();
            investmentYearsInput.id = oldId + '_cleared_' + Date.now();
            setTimeout(() => {
                investmentYearsInput.name = oldName;
                investmentYearsInput.id = oldId;
            }, 100);
            
            // Forza il valore a essere vuoto
            investmentYearsInput.value = '';
            investmentYearsInput.setAttribute('value', '');
            investmentYearsInput.removeAttribute('value');
            
            // Rimuovi anche dall'autocomplete
            if (investmentYearsInput.form) {
                investmentYearsInput.form.reset();
                investmentYearsInput.value = '';
            }
        }
        
        console.log('Cache del browser pulita per i campi di investimento');
    } catch (e) {
        console.error('Errore nella pulizia della cache:', e);
    }
}

// Esponi la funzione globalmente per permettere la pulizia manuale
window.clearInvestmentCache = clearBrowserCacheForInvestment;

// Funzione per pulire i valori di default del bot di investimento
function clearInvestmentDefaults() {
    const investmentAmountInput = document.getElementById('investmentAmount');
    const investmentYearsInput = document.getElementById('investmentYears');
    
    // Forza i valori a essere vuoti se corrispondono ai default
    if (investmentAmountInput) {
        const amountValue = parseFloat(investmentAmountInput.value);
        const amountStr = String(investmentAmountInput.value).trim();
        if (amountValue === 800 || amountStr === '800' || amountStr === '800.0' || amountStr === '800.00') {
            investmentAmountInput.value = '';
            investmentAmountInput.setAttribute('value', '');
            investmentAmountInput.removeAttribute('value');
        }
    }
    if (investmentYearsInput) {
        const yearsValue = parseInt(investmentYearsInput.value);
        const yearsStr = String(investmentYearsInput.value).trim();
        if (yearsValue === 25 || yearsStr === '25' || yearsStr === '25.0') {
            investmentYearsInput.value = '';
            investmentYearsInput.setAttribute('value', '');
            investmentYearsInput.removeAttribute('value');
        }
    }
}

// Monitora i cambiamenti agli input per prevenire l'impostazione dei valori di default
function setupInvestmentDefaultsMonitor() {
    const investmentAmountInput = document.getElementById('investmentAmount');
    const investmentYearsInput = document.getElementById('investmentYears');
    
    if (investmentAmountInput && !investmentAmountInput.dataset.monitored) {
        investmentAmountInput.dataset.monitored = 'true';
        
        // Aggiungi listener per monitorare i cambiamenti
        investmentAmountInput.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (val === 800) {
                this.value = '';
            }
        });
        
        // Aggiungi listener per quando il campo riceve focus (per prevenire autocomplete)
        investmentAmountInput.addEventListener('focus', function() {
            const val = parseFloat(this.value);
            if (val === 800) {
                this.value = '';
            }
        });
        
        // Aggiungi listener per quando il campo perde il focus
        investmentAmountInput.addEventListener('blur', function() {
            const val = parseFloat(this.value);
            if (val === 800) {
                this.value = '';
            }
        });
    }
    
    if (investmentYearsInput && !investmentYearsInput.dataset.monitored) {
        investmentYearsInput.dataset.monitored = 'true';
        
        // Aggiungi listener per monitorare i cambiamenti
        investmentYearsInput.addEventListener('input', function() {
            const val = parseInt(this.value);
            if (val === 25) {
                this.value = '';
            }
        });
        
        // Aggiungi listener per quando il campo riceve focus (per prevenire autocomplete)
        investmentYearsInput.addEventListener('focus', function() {
            const val = parseInt(this.value);
            if (val === 25) {
                this.value = '';
            }
        });
        
        // Aggiungi listener per quando il campo perde il focus
        investmentYearsInput.addEventListener('blur', function() {
            const val = parseInt(this.value);
            if (val === 25) {
                this.value = '';
            }
        });
    }
}

// Esegui la pulizia immediatamente quando il DOM è disponibile
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        clearBrowserCacheForInvestment();
        clearInvestmentDefaults();
    });
} else {
    clearBrowserCacheForInvestment();
    clearInvestmentDefaults();
}

// Usa MutationObserver per monitorare i cambiamenti agli attributi value
function setupInvestmentValueObserver() {
    const investmentAmountInput = document.getElementById('investmentAmount');
    const investmentYearsInput = document.getElementById('investmentYears');
    
    if (investmentAmountInput) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    const val = parseFloat(investmentAmountInput.value);
                    if (val === 800) {
                        investmentAmountInput.value = '';
                        investmentAmountInput.removeAttribute('value');
                    }
                }
            });
        });
        observer.observe(investmentAmountInput, { attributes: true, attributeFilter: ['value'] });
    }
    
    if (investmentYearsInput) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    const val = parseInt(investmentYearsInput.value);
                    if (val === 25) {
                        investmentYearsInput.value = '';
                        investmentYearsInput.removeAttribute('value');
                    }
                }
            });
        });
        observer.observe(investmentYearsInput, { attributes: true, attributeFilter: ['value'] });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setupGroupSavingToggle();
    setupCurrencyConverter();
    
    // Pulisci completamente la cache del browser per i campi di investimento
    clearBrowserCacheForInvestment();
    
    // Pulisci i valori di default del bot di investimento dal localStorage e dagli input
    clearInvestmentDefaults();
    
    // Imposta il monitoraggio per prevenire l'impostazione dei valori di default
    setTimeout(() => {
        setupInvestmentDefaultsMonitor();
        setupInvestmentValueObserver();
        clearInvestmentDefaults(); // Esegui di nuovo dopo un breve delay
    }, 100);
    
    // Esegui la pulizia anche dopo che tutti gli script sono stati caricati
    setTimeout(() => {
        clearInvestmentDefaults();
    }, 500);
    
    // Esegui la pulizia periodicamente per i primi secondi (per catturare valori impostati dal browser)
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        clearInvestmentDefaults();
        checkCount++;
        if (checkCount >= 10) { // Controlla per 5 secondi (10 * 500ms)
            clearInterval(checkInterval);
        }
    }, 500);
    
    // La pulizia completa della cache è già stata eseguita da clearBrowserCacheForInvestment()
    // Esegui un'ulteriore pulizia per sicurezza
    clearBrowserCacheForInvestment();
    
    // Miglioramenti per mobile
    if (isMobileDevice()) {
        enhanceHorizontalScroll();
        optimizeTouchTargets();
        preventZoomOnInput();
        enhanceMobileTooltips();
        
        // Aggiungi classe mobile al body per styling specifico
        document.body.classList.add('mobile-device');
        
        // Migliora lo scroll smooth su mobile
        document.documentElement.style.scrollBehavior = 'smooth';
    }
    
    // Carica i dati salvati
    let savedData = loadMonthlySaving();
    
    // Pulisci i nomi dal localStorage se presenti
    if (savedData) {
        if (savedData.investorNames) {
            savedData.investorNames = '';
            saveMonthlySaving(savedData);
        }
        // Rimuovi anche eventuali valori di default vecchi
        if (savedData.perPersonAmount === 200 || savedData.perPersonAmount === 150) {
            delete savedData.perPersonAmount;
        }
        if (savedData.peopleCount === 4 || savedData.peopleCount === 3) {
            delete savedData.peopleCount;
        }
        if (savedData.years === 5 || savedData.years === 10) {
            delete savedData.years;
        }
        saveMonthlySaving(savedData);
    }
    
    // Carica i dati salvati senza valori di default
    if (savedData) {
        // Carica gli anni se salvati
        if (savedData.years) {
            document.getElementById('yearsCount').value = savedData.years;
        }
        
        if (savedData.isGroup) {
            document.getElementById('groupSaving').checked = true;
            document.getElementById('groupFields').style.display = 'block';
            document.getElementById('individualFields').style.display = 'none';
            
            // Carica i valori solo se esistono, senza default
            if (savedData.peopleCount) {
                document.getElementById('peopleCount').value = savedData.peopleCount;
            }
            if (savedData.perPersonAmount) {
                document.getElementById('perPersonAmount').value = savedData.perPersonAmount;
            }
            
            // I nomi sono sempre vuoti
            document.getElementById('investorNames').value = '';
            
            // Aggiorna il totale solo se ci sono valori
            const peopleCount = parseInt(document.getElementById('peopleCount').value) || 0;
            const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
            if (peopleCount > 0 && perPersonAmount > 0) {
            updateCalculatedTotal();
            }
        } else {
            if (savedData.monthlySaving) {
                document.getElementById('monthlySaving').value = savedData.monthlySaving;
            }
        }
    }
    
    // Gestisci il campo risparmiatori se contiene valori
    const investorNamesInput = document.getElementById('investorNames');
    if (investorNamesInput && investorNamesInput.value) {
        // Sostituisci nomi vecchi se presenti
        investorNamesInput.value = investorNamesInput.value
            .replace(/Simone/gi, 'L')
            .replace(/Michela/gi, 'L')
            .replace(/Pietro/gi, 'X')
            .replace(/Leo/gi, 'L')
            .replace(/Davide/gi, 'D');
        
        // Riordina i nomi se ci sono
        const currentNames = investorNamesInput.value.split(',').map(n => n.trim()).filter(n => n);
        if (currentNames.length > 0) {
            const reorderedNames = reorderNames(currentNames);
            investorNamesInput.value = reorderedNames.join(', ');
            
            // Aggiorna anche le caselle individuali se necessario
            const perPersonAmount = parseFloat(document.getElementById('perPersonAmount').value) || 0;
            if (perPersonAmount > 0) {
                updateIndividualSavers(perPersonAmount, reorderedNames);
            }
        }
    }
    
    updateResult();
});
