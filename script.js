const state = {
    screen: 0,
    screens: [
        'screen-home',
        'screen-tutorial',
        'screen-form',
        'screen-result',
        'screen-action',
        'screen-history'
    ],
    formData: {},
    decision: null
};

// --- Navigation ---
function navTo(screenId) {
    // Basic validation for Form -> Result
    if (screenId === 'screen-result' && (!validateForm())) {
        alert("Preencha o Nome, WhatsApp e todos os sinais obrigatórios.");
        return;
    }

    // Hide all
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });

    // Show target
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Update Progress
    updateProgress(screenId);

    // Scroll top
    window.scrollTo(0, 0);

    // Tracking
    if (typeof console !== 'undefined') console.log('mdv_view_' + screenId);
}

function updateProgress(screenId) {
    const idx = state.screens.indexOf(screenId);
    const pct = ((idx) / 5) * 100;
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');

    document.documentElement.style.setProperty('--progress', `${pct}%`);
    text.innerText = `${idx}/6`;
}

// --- Form Interaction ---
document.querySelectorAll('.btn-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Toggle 'selected' in group
        const group = btn.closest('.btn-group');
        group.querySelectorAll('.btn-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Save to state (implicit via Calculate)
    });
});

function getSelectedVal(qName) {
    const group = document.querySelector(`.btn-group[data-q="${qName}"]`);
    const selected = group.querySelector('.selected');
    if (!selected) return null;
    const val = selected.getAttribute('data-val');
    // If it's a number, convert
    return isNaN(val) ? val : parseFloat(val);
}

function validateForm() {
    const name = document.getElementById('candName').value.trim();
    const phone = document.getElementById('candPhone').value.trim();

    if (!name || !phone) return false;

    // Check all signal groups have a selection
    const qs = ['prazo', 'instrucao', 'avisou', 'burlou', 'sumiu', 'ritmo', 'energia', 'execucao'];
    for (let q of qs) {
        if (getSelectedVal(q) === null) return false;
    }

    return true;
}

// --- Logic ---
function calculateDecison() {
    if (!validateForm()) {
        alert("Preencha Nome, WhatsApp e todos os fatos.");
        return;
    }

    // Get Inputs
    const signals = {
        prazo: getSelectedVal('prazo'),
        instrucao: getSelectedVal('instrucao'),
        avisou: getSelectedVal('avisou'),
        burlou: getSelectedVal('burlou'), // negative
        sumiu: getSelectedVal('sumiu'), // negative
        ritmo: getSelectedVal('ritmo'),
        energia: getSelectedVal('energia'), // string
        execucao: getSelectedVal('execucao')
    };

    // 1. Calculate Score
    // Score = Sum of number values (negatives included)
    let score = signals.prazo + signals.instrucao + signals.avisou +
        signals.burlou + signals.sumiu + signals.ritmo + signals.execucao;

    // 2. Reliability
    let reliability = "Baixa";
    if (score >= 8) reliability = "Alta";
    else if (score >= 5) reliability = "Média";

    // 3. Brain Profile (Behavioral)
    let brain = "Indefinido";
    let brainDesc = "Perfil não detectado claramente.";

    // Executora: Prazo(sim[2]) + Instrucao(sim[2]) + Energia(constante) + Sumiu(nao[0])
    if (signals.prazo === 2 && signals.instrucao === 2 &&
        signals.energia === 'constante' && signals.sumiu === 0) {
        brain = "Executora";
        brainDesc = "Faz o combinado sem drama.";
    }
    // Iniciadora: Ritmo(rapido[2]) + (Energia(sprinter) OR Execucao(metade[1])) + Score(5-7)
    // Relaxed rule: Just high energy start
    else if (signals.ritmo === 2 && (signals.energia === 'sprinter' || signals.execucao === 1)) {
        brain = "Iniciadora";
        brainDesc = "Começa voando, mas precisa de regra.";
    }
    // Autonoma: (Burlar[yes] OR Instrucao[quase]) AND (Energia[crescer] OR Instrucao[quase])
    // Refined: (Burlou=-2 OR Instrucao=1) AND (Energia=crescer OR Instrucao=1)
    else if ((signals.burlou === -2 || signals.instrucao === 1) &&
        (signals.energia === 'crescer' || signals.instrucao === 1)) {
        brain = "Autônoma";
        brainDesc = "Pode escalar muito... ou quebrar padrão.";
    }
    // Fallback based on score
    if (brain === "Indefinido") {
        if (score >= 7) brain = "Executora"; // Default good
        else brain = "Iniciadora"; // Default chaotic
    }


    // 4. Team Profile
    let team = "Sprinter"; // Default
    let teamDesc = "Acelera resultado, mas precisa de limite.";

    if (signals.energia === 'constante' && score >= 7) {
        team = "Estável";
        teamDesc = "Segura o caixa e dá paz.";
    }
    else if (signals.energia === 'crescer' && score >= 7 && signals.burlou === 0) {
        team = "Empreendedora";
        teamDesc = "Puxa crescimento com responsabilidade.";
    }
    else if (signals.energia === 'sprinter' || (signals.ritmo === 2 && score <= 7)) {
        team = "Sprinter";
        teamDesc = "Acelera resultado, mas precisa de limite.";
    }


    // 5. Risk Calculation
    let risk = "MÉDIO";
    let color = "#F59E0B"; // yellow
    let pct = "50%";

    if (score <= 4 || signals.sumiu === -3 || (signals.burlou === -2 && score < 7)) {
        risk = "ALTO";
        color = "#FF4D4D"; // red
        pct = "90%";
    }
    else if (score >= 8 && signals.sumiu === 0 && signals.burlou === 0) {
        risk = "BAIXO";
        color = "#7CFFB2"; // green
        pct = "10%";
    }

    // 6. Decision
    let decision = "Aguardar";
    if (risk === "BAIXO") decision = "Aprovar";
    else if (risk === "MÉDIO") decision = "Aprovar com Limite"; // Or Aguardar depending on contradictons
    if (risk === "MÉDIO" && (signals.energia === 'neutro' || signals.execucao === 1)) decision = "Aguardar";
    if (risk === "ALTO") decision = "Recusar";


    // Save Result to local state logic
    state.decision = {
        name: document.getElementById('candName').value,
        phone: document.getElementById('candPhone').value,
        score,
        brain,
        brainDesc,
        team,
        teamDesc,
        risk,
        riskColor: color,
        riskPct: pct,
        decisionTxt: decision
    };

    // Render Results
    document.getElementById('resBrainProfile').innerText = brain;
    document.getElementById('resBrainDesc').innerText = brainDesc;

    const chip = document.getElementById('resTeamProfile');
    chip.innerText = team;
    // Reset chip logic color if needed, simplified for now
    document.getElementById('resTeamDesc').innerText = teamDesc;

    document.getElementById('resRiskLabel').innerText = risk;
    document.getElementById('gaugeFill').style.width = pct;
    document.getElementById('gaugeFill').style.backgroundColor = color;

    document.getElementById('resDecision').innerText = decision;
    if (risk === "ALTO") document.getElementById('resDecision').style.color = "#FF4D4D";
    else document.getElementById('resDecision').style.color = "#7CFFB2";

    // Prepare Action Plan content
    renderActionPlan(decision);

    navTo('screen-result');
}


function renderActionPlan(decision) {
    const container = document.getElementById('actionContent');
    const title = document.getElementById('actionTitle');
    const pdForm = document.getElementById('personalDataForm');

    let html = '';
    pdForm.classList.add('hidden');

    if (decision === "Aprovar") {
        html = `
            <div class="card">
                <h3>✅ Aprovar (Padrão)</h3>
                <ul style="padding-left:20px; color:#C9D1D9; margin-bottom:10px">
                    <li>Cadastrar dados completos</li>
                    <li>Onboarding rápido</li>
                    <li>Definir meta simples da semana</li>
                    <li>Revisão em 7 dias</li>
                </ul>
            </div>
        `;
        pdForm.classList.remove('hidden');
    }
    else if (decision === "Aprovar com Limite") {
        html = `
            <div class="card">
                <h3>⚠️ Aprovar com Limite (7 dias)</h3>
                <p class="desc">Define limite inicial e regra clara.</p>
                <div class="btn-group vertical">
                    <button class="btn-option selected">Limite Baixo (Teste)</button>
                    <button class="btn-option">Limite Médio</button>
                    <button class="btn-option">Limite Padrão</button>
                </div>
                <p style="margin-top:10px; font-size:0.9rem">Regra: <strong>"Só sobe se cumprir a meta X"</strong></p>
            </div>
        `;
    }
    else if (decision === "Aguardar") {
        html = `
            <div class="card">
                <h3>⏳ Aguardar (Novo teste)</h3>
                <p class="desc">Sinais mistos. Não descarte, mas não ative.</p>
                <div class="bullet">
                    <p>Enviar novo desafio simples</p>
                </div>
                <div class="bullet">
                    <p>Voltar para o Recrutamento Relâmpago</p>
                </div>
                <p style="margin-top:10px">"Não é não. É 'não agora'."</p>
            </div>
        `;
    }
    else { // Recusar
        html = `
            <div class="card" style="border-color:var(--danger)">
                <h3 style="color:var(--danger)">🚫 Recusar (Alto Risco)</h3>
                <p class="desc">Melhor cortar agora do que ter prejuízo.</p>
                <div class="form-block" style="background:rgba(0,0,0,0.3)">
                    <p style="font-size:0.8rem; margin-bottom:5px">Mensagem para WhatsApp:</p>
                    <p style="font-style:italic; color:white">"Olá ${state.decision.name}, agradecemos seu teste. Neste momento não seguiremos com a vaga, mas manteremos seu contato para o futuro."</p>
                    <button class="btn-secondary mt-4" onclick="copyToClip()">Copiar Mensagem</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function copyToClip() {
    // Simple copy mock
    navigator.clipboard.writeText(`Olá ${state.decision.name}, agradecemos seu teste. Neste momento não seguiremos com a vaga, mas manteremos seu contato para o futuro.`);
    alert("Mensagem copiada!");
}

// --- Persistence ---
function saveCandidate() {
    if (!state.decision) return;

    const history = JSON.parse(localStorage.getItem('mdv_history') || '[]');
    state.decision.timestamp = new Date().toLocaleString();
    history.unshift(state.decision);
    localStorage.setItem('mdv_history', JSON.stringify(history));

    alert("Candidata salva com sucesso!");
    renderHistory();
    // Reset form? Optional.
}

function renderHistory(filter = 'all') {
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('mdv_history') || '[]');

    list.innerHTML = '';

    const filtered = history.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'Aprovar') return item.decisionTxt.includes('Aprovar');
        if (filter === 'Recusar') return item.decisionTxt.includes('Recusar');
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-msg">Nenhuma candidata encontrada.</p>';
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <h4>${item.name}</h4>
                <p>${item.timestamp}</p>
            </div>
            <div class="status" style="color:${item.riskColor}">${item.decisionTxt}</div>
        `;
        list.appendChild(div);
    });

    // Update Filter Buttons UI
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    // Simplistic active check based on text click
}

function filterHistory(filter) {
    renderHistory(filter);
}

function getActionSummary(decisionTxt) {
    if (decisionTxt.includes("Aprovar") && !decisionTxt.includes("Limite")) {
        return [
            "Cadastrar dados completos (CPF, Pix)",
            "Realizar Onboarding rápido",
            "Definir meta da semana",
            "Revisão em 7 dias"
        ];
    } else if (decisionTxt.includes("Limite")) {
        return [
            "Aprovar com Limite (Baixo/Teste)",
            "Monitorar 7 dias com regra rígida",
            "Só subir nível se bater meta"
        ];
    } else if (decisionTxt.includes("Aguardar")) {
        return [
            "Não ativar agora (Stand-by)",
            "Enviar novo desafio simples",
            "Testar novamente em breve"
        ];
    } else { // Recusar
        return [
            "Encerrar processo seletivo",
            "Enviar mensagem de agradecimento",
            "Não enviar novos materiais"
        ];
    }
}

function exportPDF() {
    const history = JSON.parse(localStorage.getItem('mdv_history') || '[]');

    if (history.length === 0) {
        alert("Nenhum histórico para gerar relatório.");
        return;
    }

    const container = document.getElementById('print-content');
    container.innerHTML = '';

    history.forEach(item => {
        const actions = getActionSummary(item.decisionTxt);
        const actionList = actions.map(act => `<li>${act}</li>`).join('');

        const div = document.createElement('div');
        div.className = 'print-item';
        div.innerHTML = `
            <div class="print-item-header">
                <div>
                    <div class="print-item-title">${item.name}</div>
                    <div class="print-item-meta">${item.phone} • ${item.timestamp}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:700; color:${item.riskColor}">${item.decisionTxt}</div>
                    <div style="font-size:0.8rem">Risco: ${item.risk}</div>
                </div>
            </div>
            
            <div class="print-grid">
                <div class="print-stat">
                    <strong>Perfil Cerebral</strong>
                    <span>${item.brain}</span>
                </div>
                <div class="print-stat">
                    <strong>Perfil Equipe</strong>
                    <span>${item.team}</span>
                </div>
            </div>

            <div class="print-actions">
                <h4>Ações Recomendadas:</h4>
                <ul>${actionList}</ul>
            </div>
        `;
        container.appendChild(div);
    });

    // Trigger Browser Print
    window.print();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage
    renderHistory();
});
