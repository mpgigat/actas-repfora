const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const messages = document.getElementById('messages');
const fileName = document.getElementById('file-name');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const downloadSection = document.getElementById('download-section');
const downloadBtn = document.getElementById('download-btn');
const checkboxes = downloadSection.querySelectorAll('input[type="checkbox"]');
const previewContainer = document.getElementById('preview-container');
const previewContent = document.getElementById('preview-content');
const previewTitle = document.getElementById('preview-title');
const backToLoaderBtn = document.getElementById('back-to-loader');
const sidebar = document.getElementById('sidebar');
const sidebarToggles = document.querySelectorAll('.sidebar-toggle');
const historyList = document.getElementById('history-list');
const dropArea = document.getElementById('drop-area');
const toastContainer = document.getElementById('toast-container');
let currentId = null;
let isProcessing = false;

function fitPreview() {
  const wrapper = previewContent.querySelector('.docx-wrapper');
  if (!wrapper) return;
  const containerWidth = previewContainer.clientWidth;
  const docWidth = wrapper.offsetWidth;
  const scale = Math.min(1, containerWidth / docWidth);
  wrapper.style.transformOrigin = 'top center';
  wrapper.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitPreview);

if (backToLoaderBtn) {
  backToLoaderBtn.addEventListener('click', () => {
    currentId = null;
    downloadBtn.disabled = true;
    checkboxes.forEach((cb) => {
      cb.checked = false;
      cb.disabled = true;
    });
    hidePreview();
  });
}

downloadBtn.disabled = true;
checkboxes.forEach((cb) => (cb.disabled = true));

previewContainer.style.display = 'none';

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileName.textContent = file ? file.name : '';
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
  });
});

dropArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    fileInput.files = files;
    fileInput.dispatchEvent(new Event('change'));
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) return;

  currentId = null;
  isProcessing = true;
  downloadBtn.disabled = true;
  checkboxes.forEach((cb) => {
    cb.checked = false;
    cb.disabled = true;
  });

  addMessage(`Subiendo ${file.name}...`, 'user');

  messages.style.display = 'block';
  messages.innerHTML = '';
  hidePreview();
  previewTitle.textContent = 'Vista previa del documento';

  const data = new FormData();
  data.append('audio', file);

  progress.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.textContent = '0%';

  const xhr = new XMLHttpRequest();
    xhr.open('POST', window.API_BASE + '/transcribir');

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.error) throw new Error(json.error);

          const { id } = json;
          const sse = new EventSource(window.API_BASE + '/progreso/' + id);
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.progreso !== undefined) {
              const percent = Number(data.progreso);
              if (!Number.isNaN(percent)) {
                const limitado = Math.min(percent, 100);
                progressBar.style.width = `${limitado}%`;
                progressBar.textContent = `${limitado}%`;
              }
            }
            if (data.final) {
              isProcessing = false;
              if (data.id) currentId = data.id;
              renderHistory();
              sse.close();
              progress.style.display = 'none';
              progressBar.textContent = '';
              downloadBtn.disabled = false;
              checkboxes.forEach((cb) => (cb.disabled = false));
              showToast('Transcripción completada', 'success');

                fetch(`${window.API_BASE}/descargar?id=${currentId}&tipo=docx`)
                .then((res) => {
                  if (!res.ok)
                    throw new Error('No se pudo obtener el documento');
                  return res.blob();
                })
                .then((blob) =>
                  showPreviewDocument(blob, 'Vista previa del documento')
                )
                .catch((err) => {
                  messages.style.display = 'block';
                  addMessage('Error: ' + err.message, 'bot');
                  showToast('Error: ' + err.message, 'error');
                });
            }
            if (data.error) {
              isProcessing = false;
              addMessage('Error: ' + data.error, 'bot');
              showToast('Error: ' + data.error, 'error');
              sse.close();
              progress.style.display = 'none';
              progressBar.textContent = '';
            }
          } catch (err) {
            addMessage('Error: ' + err.message, 'bot');
            showToast('Error: ' + err.message, 'error');
          }
        };
      } catch (err) {
        isProcessing = false;
        addMessage('Error: ' + err.message, 'bot');
        showToast('Error: ' + err.message, 'error');
      }
    } else {
      isProcessing = false;
      addMessage(
        'Error del servidor: ' + xhr.status + ' ' + xhr.statusText,
        'bot'
      );
      showToast(
        'Error del servidor: ' + xhr.status + ' ' + xhr.statusText,
        'error'
      );
      progress.style.display = 'none';
      progressBar.textContent = '';
    }
  };

  xhr.onerror = () => {
    isProcessing = false;
    addMessage('Error de red', 'bot');
    showToast('Error de red', 'error');
    progress.style.display = 'none';
    progressBar.textContent = '';
  };

  xhr.onloadend = () => {};

  xhr.send(data);
});

function addMessage(text, role) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showToast(text, type = 'success') {
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.textContent = text;
  toastContainer.appendChild(div);
  requestAnimationFrame(() => div.classList.add('toast-show'));
  setTimeout(() => {
    div.classList.remove('toast-show');
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

function showPreviewDocument(blob, titleText = 'Vista previa del documento') {
  if (previewTitle) {
    previewTitle.textContent = titleText;
  }
  if (progress) {
    progress.style.display = 'none';
  }
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.textContent = '';
  }
  if (!previewContent) {
    return Promise.reject(new Error('Contenedor de vista previa no disponible'));
  }
  previewContent.innerHTML = '';
  return window.docx.renderAsync(blob, previewContent).then(() => {
    if (previewContainer) {
      previewContainer.style.display = 'flex';
    }
    messages.style.display = 'none';
    fitPreview();
  });
}

function hidePreview() {
  if (previewContainer) {
    previewContainer.style.display = 'none';
  }
  if (previewContent) {
    previewContent.innerHTML = '';
  }
  messages.style.display = 'block';
  if (isProcessing) {
    progress.style.display = 'block';
  }
}

function removeHistory(id) {
  fetch(`${window.API_BASE}/historial/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function downloadArchivo(id, tipo) {
  fetch(
    `${window.API_BASE}/descargar?id=${encodeURIComponent(id)}&tipo=${tipo}`
  )
    .then((res) => {
      if (res.status === 404) {
        removeHistory(id);
        renderHistory();
        throw new Error('Transcripción no encontrada');
      }
      if (!res.ok) throw new Error('No pude descargar ' + tipo);
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const nombre = match ? match[1] : `archivo.${tipo}`;
      return res.blob().then((blob) => ({ blob, nombre }));
    })
    .then(({ blob, nombre }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      addMessage('Error: ' + err.message, 'bot');
      showToast('Error: ' + err.message, 'error');
    });
}

function renderHistory() {
  historyList.innerHTML = '';
  fetch(`${window.API_BASE}/historial`)
    .then((res) => {
      if (!res.ok) throw new Error('No se pudo obtener historial');
      return res.json();
    })
    .then((history) => {
      history.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'list-group-item history-item d-flex align-items-start';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-file-lines text-sena me-2 mt-1';
        li.appendChild(icon);

        const content = document.createElement('div');
        content.className = 'flex-grow-1';

        const titulo = document.createElement('div');
        titulo.className = 'fw-semibold';
        titulo.textContent = item.nombre || `Transcripción ${item.id}`;
        content.appendChild(titulo);

        const fecha = item.fecha ? new Date(item.fecha).toLocaleString() : '';
        if (fecha) {
          const date = document.createElement('small');
          date.className = 'text-muted';
          date.textContent = fecha;
          content.appendChild(date);
        }

        li.appendChild(content);

        li.addEventListener('click', () => {
          currentId = item.id;
          if (!isProcessing) {
            progress.style.display = 'none';
          }
          progressBar.style.width = '0%';
          progressBar.textContent = '';
          fetch(
            `${window.API_BASE}/descargar?id=${encodeURIComponent(item.id)}&tipo=docx`
          )
            .then((res) => {
              if (res.status === 404) {
                removeHistory(item.id);
                renderHistory();
                throw new Error('Transcripción no encontrada');
              }
              if (!res.ok) throw new Error('No se pudo obtener el documento');
              return res.blob();
            })
            .then((blob) =>
              showPreviewDocument(
                blob,
                item.nombre || `Transcripción ${item.id}`
              )
            )
            .then(() => {
              downloadBtn.disabled = false;
              checkboxes.forEach((cb) => (cb.disabled = false));
              sidebar.classList.add('hidden');
              sidebar.classList.remove('visible');
            })
            .catch((err) => {
              addMessage('Error: ' + err.message, 'bot');
              showToast('Error: ' + err.message, 'error');
            });
        });
        historyList.appendChild(li);
      });
    })
    .catch((err) => {
      console.error('Error cargando historial:', err);
    });
}

downloadBtn.addEventListener('click', () => {
  if (!currentId) return;
  const formatos = Array.from(
    downloadSection.querySelectorAll('input[type="checkbox"]:checked')
  ).map((cb) => cb.value);
  if (formatos.length === 0) return;

  if (formatos.length === 1) {
      const tipo = formatos[0];
      fetch(`${window.API_BASE}/descargar?id=${encodeURIComponent(currentId)}&tipo=${tipo}`)
      .then((res) => {
        if (!res.ok) throw new Error('No pude descargar ' + tipo);
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = /filename="?([^";]+)"?/i.exec(disposition);
        const nombre = match ? match[1] : `archivo.${tipo}`;
        return res.blob().then((blob) => ({ blob, nombre }));
      })
      .then(({ blob, nombre }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        addMessage('Error: ' + err.message, 'bot');
        showToast('Error: ' + err.message, 'error');
      });
    return;
  }

    const urlZip = `${window.API_BASE}/descargar-zip?id=${encodeURIComponent(
      currentId
    )}&tipos=${formatos.join(',')}`;
  fetch(urlZip)
    .then((res) => {
      if (!res.ok) throw new Error('No pude descargar ZIP');
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const nombre = match ? match[1] : 'archivos.zip';
      return res.blob().then((blob) => ({ blob, nombre }));
    })
    .then(({ blob, nombre }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      addMessage('Error: ' + err.message, 'bot');
      showToast('Error: ' + err.message, 'error');
    });
});

sidebarToggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
    sidebar.classList.toggle('hidden');
  });
});

document.addEventListener('DOMContentLoaded', renderHistory);