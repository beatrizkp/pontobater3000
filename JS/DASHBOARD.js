import { supabase } from './SUPABASE.js';

// Elementos das Abas
const tabLogsBtn = document.getElementById('tab-logs-btn');
const tabEmployeesBtn = document.getElementById('tab-employees-btn');
const tabAlertsBtn = document.getElementById('tab-alerts-btn');

const sectionLogs = document.getElementById('section-logs');
const sectionEmployees = document.getElementById('section-employees');
const sectionAlerts = document.getElementById('section-alerts');

// Elementos de Tabelas
const logsTbody = document.getElementById('logs-tbody');
const employeesTbody = document.getElementById('employees-tbody');
const alertsTbody = document.getElementById('alerts-tbody');

// Botões de Recarregar
const refreshLogsBtn = document.getElementById('refresh-logs-btn');
const refreshAlertsBtn = document.getElementById('refresh-alerts-btn');

// Modal de Funcionário
const openAddEmployeeModalBtn = document.getElementById('open-add-employee-modal');
const employeeModal = document.getElementById('employee-modal');
const closeEmployeeModalBtn = document.getElementById('close-employee-modal');
const cancelEmployeeBtn = document.getElementById('cancel-employee-btn');
const employeeForm = document.getElementById('employee-form');
const captureFaceBtn = document.getElementById('capture-face-btn');
const modalVideo = document.getElementById('modal-video');
const faceStatusText = document.getElementById('face-status-text');
const empVetorFacialInput = document.getElementById('emp-vetor-facial');

let faceapiModule = null;
let cameraStream = null;
let capturedDescriptor = null;

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Controle de Navegação por Abas
function switchTab(tabName) {
  tabLogsBtn.className = tabName === 'logs' ? 'primary' : 'outline';
  tabEmployeesBtn.className = tabName === 'employees' ? 'primary' : 'outline';
  tabAlertsBtn.className = tabName === 'alerts' ? 'primary' : 'outline';

  sectionLogs.style.display = tabName === 'logs' ? 'block' : 'none';
  sectionEmployees.style.display = tabName === 'employees' ? 'block' : 'none';
  sectionAlerts.style.display = tabName === 'alerts' ? 'block' : 'none';

  if (tabName === 'logs') loadLogs();
  if (tabName === 'employees') loadEmployees();
  if (tabName === 'alerts') loadAlerts();
}

tabLogsBtn.addEventListener('click', () => switchTab('logs'));
tabEmployeesBtn.addEventListener('click', () => switchTab('employees'));
tabAlertsBtn.addEventListener('click', () => switchTab('alerts'));

refreshLogsBtn.addEventListener('click', loadLogs);
refreshAlertsBtn.addEventListener('click', loadAlerts);

// Carregar Registros de Ponto do Supabase
async function loadLogs() {
  logsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;"><i data-lucide="loader"></i> Carregando registros...</td></tr>';
  refreshIcons();

  try {
    const { data, error } = await supabase
      .from('registros_ponto')
      .select('*, funcionarios(nome, matricula)')
      .order('timestamp_registro', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      logsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">Nenhum registro de ponto encontrado.</td></tr>';
      refreshIcons();
      return;
    }

    logsTbody.innerHTML = data.map(log => {
      const dt = new Date(log.timestamp_registro);
      const dataHoraStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();

      let statusBadge = 'badge-success';
      if (log.status_frequencia === 'ATRASO') statusBadge = 'badge-warning';
      if (log.status_frequencia === 'SAIDA_ANTECIPADA' || log.status_frequencia === 'FALTA') statusBadge = 'badge-danger';

      return `
        <tr>
          <td>${dataHoraStr}</td>
          <td>${log.funcionarios ? log.funcionarios.matricula : 'N/A'}</td>
          <td><strong>${log.funcionarios ? log.funcionarios.nome : 'Desconhecido'}</strong></td>
          <td><span class="badge ${log.tipo === 'ENTRADA' ? 'badge-info' : 'badge-success'}">${log.tipo}</span></td>
          <td><span class="badge ${statusBadge}">${log.status_frequencia}</span></td>
          <td>${log.minutos_desvio > 0 ? `${log.minutos_desvio} min` : '-'}</td>
          <td>${log.modo_offline ? '<span class="badge badge-warning">Offline</span>' : '<span class="badge badge-info">Online</span>'}</td>
        </tr>
      `;
    }).join('');

    refreshIcons();
  } catch (err) {
    console.error('Erro ao carregar logs:', err);
    logsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #dc2626;">Erro ao carregar registros: ${err.message}</td></tr>`;
  }
}

// Carregar Funcionários
async function loadEmployees() {
  employeesTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8;"><i data-lucide="loader"></i> Carregando funcionários...</td></tr>';
  refreshIcons();

  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      employeesTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">Nenhum funcionário cadastrado.</td></tr>';
      refreshIcons();
      return;
    }

    employeesTbody.innerHTML = data.map(emp => {
      const hasBiometrics = emp.vetor_facial && Array.isArray(emp.vetor_facial) && emp.vetor_facial.length > 0;
      return `
        <tr>
          <td>${emp.matricula}</td>
          <td><strong>${emp.nome}</strong></td>
          <td>${emp.email}</td>
          <td>${emp.horario_entrada}</td>
          <td>${emp.horario_saida}</td>
          <td>
            ${hasBiometrics
              ? '<span class="badge badge-success"><i data-lucide="check"></i> Cadastrada</span>'
              : '<span class="badge badge-danger"><i data-lucide="x"></i> Pendente</span>'}
          </td>
          <td>
            ${emp.ativo
              ? '<span class="badge badge-success">Ativo</span>'
              : '<span class="badge badge-warning">Inativo</span>'}
          </td>
          <td>
            <button onclick="toggleEmployeeStatus('${emp.id}', ${!emp.ativo})" class="outlineSmall secondary">
              ${emp.ativo ? 'Desativar' : 'Ativar'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    refreshIcons();
  } catch (err) {
    console.error('Erro ao carregar funcionários:', err);
    employeesTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc2626;">Erro ao carregar funcionários: ${err.message}</td></tr>`;
  }
}

// Alterar Status do Funcionário (Ativo/Inativo)
window.toggleEmployeeStatus = async function(id, newStatus) {
  try {
    const { error } = await supabase
      .from('funcionarios')
      .update({ ativo: newStatus })
      .eq('id', id);

    if (error) throw error;
    await loadEmployees();
  } catch (err) {
    alert('Erro ao atualizar status: ' + err.message);
  }
};

// Carregar Alertas do Terminal
async function loadAlerts() {
  alertsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;"><i data-lucide="loader"></i> Carregando alertas...</td></tr>';
  refreshIcons();

  try {
    const { data, error } = await supabase
      .from('alertas_terminal')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      alertsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Nenhum alerta registrado.</td></tr>';
      refreshIcons();
      return;
    }

    alertsTbody.innerHTML = data.map(alert => {
      const dt = new Date(alert.created_at);
      let levelBadge = 'badge-info';
      if (alert.nivel === 'WARNING') levelBadge = 'badge-warning';
      if (alert.nivel === 'CRITICAL') levelBadge = 'badge-danger';

      return `
        <tr>
          <td>${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</td>
          <td><strong>${alert.terminal_id}</strong></td>
          <td><span class="badge ${levelBadge}">${alert.nivel}</span></td>
          <td>${alert.mensagem}</td>
          <td>${alert.resolvido ? '<span class="badge badge-success">Resolvido</span>' : '<span class="badge badge-warning">Pendente</span>'}</td>
          <td>
            ${!alert.resolvido ? `<button onclick="resolveAlert('${alert.id}')" class="outlineSmall success">Resolver</button>` : '-'}
          </td>
        </tr>
      `;
    }).join('');

    refreshIcons();
  } catch (err) {
    console.error('Erro ao carregar alertas:', err);
    alertsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626;">Erro ao carregar alertas: ${err.message}</td></tr>`;
  }
}

// Resolver Alerta
window.resolveAlert = async function(id) {
  try {
    const { error } = await supabase
      .from('alertas_terminal')
      .update({ resolvido: true })
      .eq('id', id);

    if (error) throw error;
    await loadAlerts();
  } catch (err) {
    alert('Erro ao resolver alerta: ' + err.message);
  }
};

// Abrir Modal de Cadastro
openAddEmployeeModalBtn.addEventListener('click', async () => {
  employeeForm.reset();
  capturedDescriptor = null;
  faceStatusText.textContent = 'Vetor facial não capturado.';
  faceStatusText.style.color = '#64748b';
  employeeModal.showModal();
  await startModalCamera();
});

// Fechar Modal
function closeModal() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  employeeModal.close();
}

closeEmployeeModalBtn.addEventListener('click', closeModal);
cancelEmployeeBtn.addEventListener('click', closeModal);

// Câmera no Modal
async function startModalCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    modalVideo.srcObject = cameraStream;
  } catch (err) {
    console.error('Erro ao abrir câmera no modal:', err);
    faceStatusText.textContent = 'Câmera inacessível para cadastro de biometria.';
    faceStatusText.style.color = '#dc2626';
  }
}

// Captura de Vetor Facial no Modal
captureFaceBtn.addEventListener('click', async () => {
  faceStatusText.textContent = 'Capturando e processando vetor facial...';
  faceStatusText.style.color = '#ca8a04';

  try {
    if (!faceapiModule) {
      faceapiModule = await import('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js');
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await faceapiModule.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    }

    const detection = await faceapiModule.detectSingleFace(modalVideo)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      capturedDescriptor = Array.from(detection.descriptor);
      empVetorFacialInput.value = JSON.stringify(capturedDescriptor);
      faceStatusText.textContent = 'Vetor facial capturado com sucesso!';
      faceStatusText.style.color = '#16a34a';
    } else {
      faceStatusText.textContent = 'Nenhum rosto detectado. Posicione-se em frente à câmera.';
      faceStatusText.style.color = '#dc2626';
    }
  } catch (err) {
    console.error('Erro ao capturar biometria:', err);
    faceStatusText.textContent = 'Erro ao processar biometria: ' + err.message;
    faceStatusText.style.color = '#dc2626';
  }
});

// Submissão do Formulário de Funcionário
employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('emp-nome').value;
  const matricula = document.getElementById('emp-matricula').value;
  const email = document.getElementById('emp-email').value;
  const horario_entrada = document.getElementById('emp-entrada').value + ':00';
  const horario_saida = document.getElementById('emp-saida').value + ':00';

  try {
    const { error } = await supabase.from('funcionarios').insert([{
      nome,
      matricula,
      email,
      horario_entrada,
      horario_saida,
      vetor_facial: capturedDescriptor || null,
      ativo: true
    }]);

    if (error) throw error;

    closeModal();
    await loadEmployees();
    alert('Funcionário cadastrado com sucesso!');
  } catch (err) {
    alert('Erro ao cadastrar funcionário: ' + err.message);
  }
});

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  loadLogs();
});
