import { supabase } from './SUPABASE.js';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs';

// Inicializar IndexedDB via Dexie.js
const db = new Dexie('PontoFacialDB');
db.version(1).stores({
  registrosOffline: '++id, funcionario_id, tipo, timestamp_registro, status_frequencia, minutos_desvio, hash_contingencia, synced'
});

// Referências aos elementos DOM
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const detectionMsg = document.getElementById('detection-msg');
const resultBox = document.getElementById('result-box');
const recentLogsTbody = document.getElementById('recent-logs-tbody');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const offlineCountBadge = document.getElementById('offline-count-badge');

let faceapiModule = null;
let activeEmployees = [];
let isProcessingRecognition = false;
let lastRecordedTime = {}; // Cooldown de registro por funcionário (5 min)

// Identificador único do Terminal
const TERMINAL_ID = 'TERMINAL_01';

// Função para re-inicializar Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Atualizar contador de registros offline pendentes
async function updateOfflineBadgeCount() {
  if (!offlineCountBadge) return;
  try {
    const pendingCount = await db.registrosOffline.where('synced').equals(0).count();
    if (pendingCount > 0) {
      offlineCountBadge.textContent = `${pendingCount} pendente(s)`;
      offlineCountBadge.style.display = 'inline-flex';
    } else {
      offlineCountBadge.style.display = 'none';
    }
  } catch (err) {
    console.warn('Erro ao ler contagem offline:', err);
  }
}

// Atualizar indicador de Conexão Online/Offline
function updateConnectionStatus() {
  if (navigator.onLine) {
    statusDot.className = 'dot dot-online';
    statusText.textContent = 'Online';
    syncOfflineRecords();
  } else {
    statusDot.className = 'dot dot-offline';
    statusText.textContent = 'Offline';
    updateOfflineBadgeCount();
  }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Tocar bip sonoro sintetizado usando Web Audio API ao registrar ponto
function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.warn('Não foi possível reproduzir aviso sonoro:', err);
  }
}

// Enviar alertas para a tabela `alertas_terminal`
async function sendTerminalAlert(level, message) {
  try {
    if (navigator.onLine) {
      await supabase.from('alertas_terminal').insert([{
        terminal_id: TERMINAL_ID,
        nivel: level,
        mensagem: message
      }]);
    }
  } catch (err) {
    console.warn('Falha ao enviar alerta do terminal:', err);
  }
}

// Carregar funcionários ativos e vetores faciais do Supabase
async function loadActiveEmployees() {
  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('ativo', true);

    if (error) throw error;
    activeEmployees = data || [];
  } catch (err) {
    console.error('Erro ao carregar funcionários:', err);
    sendTerminalAlert('WARNING', 'Erro ao carregar lista de funcionários: ' + err.message);
  }
}

// Sincronizar registros offline com o Supabase
async function syncOfflineRecords() {
  if (!navigator.onLine) return;
  try {
    const pendingRecords = await db.registrosOffline.where('synced').equals(0).toArray();
    if (pendingRecords.length === 0) return;

    for (const rec of pendingRecords) {
      const { error } = await supabase.from('registros_ponto').insert([{
        funcionario_id: rec.funcionario_id,
        tipo: rec.tipo,
        timestamp_registro: rec.timestamp_registro,
        status_frequencia: rec.status_frequencia,
        minutos_desvio: rec.minutos_desvio,
        modo_offline: true,
        hash_contingencia: rec.hash_contingencia
      }]);

      if (!error) {
        await db.registrosOffline.update(rec.id, { synced: 1 });
      }
    }
    await updateOfflineBadgeCount();
    await sendTerminalAlert('INFO', `Sincronizados ${pendingRecords.length} registros salvos offline.`);
  } catch (err) {
    console.error('Erro ao sincronizar registros offline:', err);
  }
}

// Inicializar Câmera do Dispositivo
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    video.srcObject = stream;
  } catch (err) {
    console.error('Erro ao acessar a câmera:', err);
    detectionMsg.className = 'badge badge-danger';
    detectionMsg.innerHTML = '<i data-lucide="camera-off"></i> Câmera não acessível';
    refreshIcons();
    sendTerminalAlert('CRITICAL', 'Erro ao acessar a câmera do dispositivo: ' + err.message);
  }
}

// Carregar face-api.js e Modelos
async function initBiometrics() {
  try {
    detectionMsg.innerHTML = '<i data-lucide="loader"></i> Carregando biblioteca de biometria...';
    refreshIcons();

    faceapiModule = await import('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js');

    // Modelos via CDN SSD MobileNet e Landmarks
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await faceapiModule.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    detectionMsg.className = 'badge badge-success';
    detectionMsg.innerHTML = '<i data-lucide="check-circle"></i> Biometria Pronta';
    refreshIcons();

    await sendTerminalAlert('INFO', 'Terminal inicializado e pronto para operação.');
    startFaceDetectionLoop();
  } catch (err) {
    console.error('Erro ao carregar biometria:', err);
    detectionMsg.className = 'badge badge-danger';
    detectionMsg.innerHTML = '<i data-lucide="alert-triangle"></i> Falha ao carregar modelos faciais';
    refreshIcons();
    sendTerminalAlert('CRITICAL', 'Falha ao carregar modelos do face-api.js: ' + err.message);
  }
}

// Lógica para determinar Entrada/Saída, Tolerância e Atrasos
function calculatePointStatus(employee, now = new Date()) {
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [inH, inM] = employee.horario_entrada.split(':').map(Number);
  const entryTargetMinutes = inH * 60 + inM;

  const [outH, outM] = employee.horario_saida.split(':').map(Number);
  const exitTargetMinutes = outH * 60 + outM;

  const midDayMinutes = (entryTargetMinutes + exitTargetMinutes) / 2;

  let tipo = 'ENTRADA';
  let targetMinutes = entryTargetMinutes;

  if (currentMinutes > midDayMinutes) {
    tipo = 'SAIDA';
    targetMinutes = exitTargetMinutes;
  }

  const diffMinutes = currentMinutes - targetMinutes; // positivo = atraso / saída após o horário
  const absDiff = Math.abs(diffMinutes);

  let status_frequencia = 'NORMAL';
  let minutos_desvio = 0;

  // Tolerância de 10 minutos
  if (absDiff > 10) {
    minutos_desvio = absDiff;
    if (tipo === 'ENTRADA' && diffMinutes > 10) {
      status_frequencia = 'ATRASO';
    } else if (tipo === 'SAIDA' && diffMinutes < -10) {
      status_frequencia = 'SAIDA_ANTECIPADA';
    }
  }

  return { tipo, status_frequencia, minutos_desvio, timestamp: now.toISOString() };
}

// Calcular distância euclidiana entre dois vetores descritores
function euclideanDistance(arr1, arr2) {
  return Math.sqrt(
    arr1.reduce((sum, val, idx) => sum + Math.pow(val - arr2[idx], 2), 0)
  );
}

// Processar Registro de Ponto após Reconhecimento
async function processEmployeeCheckin(employee) {
  const now = new Date();
  const lastTime = lastRecordedTime[employee.id];

  // Cooldown de 2 minutos para evitar batidas duplicadas acidentais
  if (lastTime && (now - lastTime) < 2 * 60 * 1000) {
    return;
  }

  lastRecordedTime[employee.id] = now;

  const { tipo, status_frequencia, minutos_desvio, timestamp } = calculatePointStatus(employee, now);

  // Criar hash de contingência SHA-256 para auditoria
  const hashString = `${employee.id}_${timestamp}_${tipo}`;
  const msgUint8 = new TextEncoder().encode(hashString);
  const hashBuffer = window.crypto && window.crypto.subtle ? await crypto.subtle.digest('SHA-256', msgUint8) : null;
  const hashArray = hashBuffer ? Array.from(new Uint8Array(hashBuffer)) : [];
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('') || Math.random().toString(36).substring(2);

  const isOffline = !navigator.onLine;

  if (isOffline) {
    await db.registrosOffline.add({
      funcionario_id: employee.id,
      tipo,
      timestamp_registro: timestamp,
      status_frequencia,
      minutos_desvio,
      hash_contingencia: hashHex,
      synced: 0
    });
  } else {
    try {
      await supabase.from('registros_ponto').insert([{
        funcionario_id: employee.id,
        tipo,
        timestamp_registro: timestamp,
        status_frequencia,
        minutos_desvio,
        modo_offline: false,
        hash_contingencia: hashHex
      }]);
    } catch (err) {
      console.warn('Erro ao enviar ponto online. Salvando offline:', err);
      await db.registrosOffline.add({
        funcionario_id: employee.id,
        tipo,
        timestamp_registro: timestamp,
        status_frequencia,
        minutos_desvio,
        hash_contingencia: hashHex,
        synced: 0
      });
      await updateOfflineBadgeCount();
    }
  }

  // Tocar sinal sonoro
  playSuccessChime();

  // Atualizar UI de resultado
  let badgeClass = 'badge-success';
  if (status_frequencia === 'ATRASO') badgeClass = 'badge-warning';
  if (status_frequencia === 'SAIDA_ANTECIPADA') badgeClass = 'badge-danger';

  resultBox.innerHTML = `
    <div class="badge ${badgeClass}" style="font-size: 1.1rem; padding: 0.5rem 1rem;">
      <i data-lucide="user-check"></i> ${employee.nome}
    </div>
    <h3 style="margin-top: 0.5rem; margin-bottom: 0.25rem;">${tipo} REGISTRADA</h3>
    <p style="margin: 0; color: #475569;">
      Horário: <strong>${now.toLocaleTimeString()}</strong> |
      Status: <strong>${status_frequencia}</strong> ${minutos_desvio > 0 ? `(${minutos_desvio} min)` : ''}
      ${isOffline ? '<span class="badge badge-warning">Modo Offline</span>' : ''}
    </p>
  `;
  refreshIcons();

  // Adicionar à tabela recente
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${employee.nome}</strong></td>
    <td><span class="badge ${tipo === 'ENTRADA' ? 'badge-info' : 'badge-success'}">${tipo}</span></td>
    <td>${now.toLocaleTimeString()}</td>
    <td><span class="badge ${badgeClass}">${status_frequencia}</span></td>
  `;
  if (recentLogsTbody.children[0] && recentLogsTbody.children[0].children.length === 1) {
    recentLogsTbody.innerHTML = '';
  }
  recentLogsTbody.insertBefore(tr, recentLogsTbody.firstChild);
}

// Loop contínuo de detecção de rosto
function startFaceDetectionLoop() {
  setInterval(async () => {
    if (!faceapiModule || video.paused || video.ended || isProcessingRecognition) return;

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    try {
      isProcessingRecognition = true;
      const detections = await faceapiModule.detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (detections && detections.length > 0) {
        faceapiModule.draw.drawDetections(overlay, detections);

        for (const detection of detections) {
          const descriptor = Array.from(detection.descriptor);

          // Buscar funcionário correspondente por vetor_facial (Threshold 0.5)
          let matchedEmployee = null;
          let minDistance = 0.5;

          for (const emp of activeEmployees) {
            if (emp.vetor_facial && Array.isArray(emp.vetor_facial)) {
              const dist = euclideanDistance(descriptor, emp.vetor_facial);
              if (dist < minDistance) {
                minDistance = dist;
                matchedEmployee = emp;
              }
            }
          }

          if (matchedEmployee) {
            await processEmployeeCheckin(matchedEmployee);
          }
        }
      }
    } catch (err) {
      console.error('Erro na detecção facial:', err);
    } finally {
      isProcessingRecognition = false;
    }
  }, 1000);
}

// Inicialização Geral
window.addEventListener('DOMContentLoaded', async () => {
  refreshIcons();
  updateConnectionStatus();
  await loadActiveEmployees();
  await startCamera();
  await initBiometrics();
});
