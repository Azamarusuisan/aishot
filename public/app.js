// DOM Elements
const urlInput = document.getElementById('urlInput');
const startBtn = document.getElementById('startBtn');
const btnText = startBtn.querySelector('.btn-text');
const btnLoading = startBtn.querySelector('.btn-loading');
const optionsToggle = document.getElementById('optionsToggle');
const optionsSection = document.getElementById('optionsSection');
const maxPagesInput = document.getElementById('maxPages');
const maxDepthInput = document.getElementById('maxDepth');
const concurrencyInput = document.getElementById('concurrency');
const progressSection = document.getElementById('progressSection');
const progressStatus = document.getElementById('progressStatus');
const progressCount = document.getElementById('progressCount');
const progressFill = document.getElementById('progressFill');
const logOutput = document.getElementById('logOutput');
const resultSection = document.getElementById('resultSection');
const resultMessage = document.getElementById('resultMessage');
const openFolderBtn = document.getElementById('openFolderBtn');
const resetBtn = document.getElementById('resetBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const gallery = document.getElementById('gallery');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxName = document.getElementById('lightboxName');
const lightboxClose = document.getElementById('lightboxClose');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const toast = document.getElementById('toast');

let isProcessing = false;
let eventSource = null;
let currentHost = '';
let currentImages = [];

// Options toggle
optionsToggle.addEventListener('click', () => {
  const isHidden = optionsSection.hidden;
  optionsSection.hidden = !isHidden;
  optionsToggle.textContent = isHidden ? '詳細オプション ▲' : '詳細オプション ▼';
});

// Start button
startBtn.addEventListener('click', startCrawl);

// Enter key
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    startCrawl();
  }
});

// Reset button
resetBtn.addEventListener('click', resetUI);
retryBtn.addEventListener('click', resetUI);

// Open folder button
openFolderBtn.addEventListener('click', () => {
  fetch('/api/open-folder', { method: 'POST' })
    .catch(() => {});
});

// Lightbox
lightboxClose.addEventListener('click', closeLightbox);
lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) {
    closeLightbox();
  }
});

// Copy & Download
copyBtn.addEventListener('click', copyCurrentImage);
downloadBtn.addEventListener('click', downloadCurrentImage);
downloadAllBtn.addEventListener('click', downloadAllImages);

function startCrawl() {
  if (isProcessing) return;

  const url = urlInput.value.trim();

  if (!url) {
    showError('URLを入力してください');
    return;
  }

  if (!isValidUrl(url)) {
    showError('有効なURL（http:// または https://）を入力してください');
    return;
  }

  isProcessing = true;
  setButtonLoading(true);
  hideAllSections();
  showProgress();
  clearLog();

  const params = new URLSearchParams({
    url: url,
    maxPages: maxPagesInput.value,
    maxDepth: maxDepthInput.value,
    concurrency: concurrencyInput.value
  });

  eventSource = new EventSource(`/api/crawl?${params}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleEvent(data);
  };

  eventSource.onerror = () => {
    eventSource.close();
    if (isProcessing) {
      showError('接続が切断されました');
      isProcessing = false;
      setButtonLoading(false);
    }
  };
}

function handleEvent(data) {
  switch (data.type) {
    case 'log':
      addLog(data.message, data.level);
      break;
    case 'progress':
      updateProgress(data.current, data.total, data.status);
      break;
    case 'complete':
      eventSource.close();
      isProcessing = false;
      setButtonLoading(false);
      currentHost = data.host;
      showResult(data.count, data.outputDir, data.host);
      break;
    case 'error':
      eventSource.close();
      isProcessing = false;
      setButtonLoading(false);
      showError(data.message);
      break;
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function setButtonLoading(loading) {
  startBtn.disabled = loading;
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

function hideAllSections() {
  progressSection.hidden = true;
  resultSection.hidden = true;
  errorSection.hidden = true;
}

function showProgress() {
  progressSection.hidden = false;
  progressFill.style.width = '0%';
  progressStatus.textContent = '開始中...';
  progressCount.textContent = '0 / 0';
}

function updateProgress(current, total, status) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = `${percent}%`;
  progressStatus.textContent = status;
  progressCount.textContent = `${current} / ${total}`;
}

function clearLog() {
  logOutput.innerHTML = '';
}

function addLog(message, level = 'info') {
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  line.textContent = message;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight;
}

async function showResult(count, outputDir, host) {
  hideAllSections();
  resultSection.hidden = false;
  resultMessage.textContent = `${count} ページのスクリーンショットを保存しました`;

  // Load gallery
  gallery.innerHTML = '<p style="color: var(--text-muted);">画像を読み込み中...</p>';

  try {
    const res = await fetch(`/api/images?host=${encodeURIComponent(host)}`);
    const data = await res.json();

    if (data.images.length === 0) {
      gallery.innerHTML = '<p style="color: var(--text-muted);">画像が見つかりません</p>';
      return;
    }

    currentImages = data.images;
    gallery.innerHTML = '';
    data.images.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const pageName = img.name.replace('.png', '');
      item.innerHTML = `
        <div class="gallery-number">${index + 1}</div>
        <img src="${img.url}" alt="${img.name}" loading="lazy">
        <div class="gallery-label">${pageName}</div>
      `;
      item.addEventListener('click', () => openLightbox(img.url, img.name, index + 1));
      gallery.appendChild(item);
    });
  } catch {
    gallery.innerHTML = '<p style="color: var(--text-muted);">画像の読み込みに失敗しました</p>';
  }
}

function showError(message) {
  hideAllSections();
  errorSection.hidden = false;
  errorMessage.textContent = message;
}

function resetUI() {
  if (eventSource) {
    eventSource.close();
  }
  isProcessing = false;
  setButtonLoading(false);
  hideAllSections();
  gallery.innerHTML = '';
  urlInput.focus();
}

function openLightbox(url, name, pageNum) {
  lightboxImage.src = url;
  const pageName = name.replace('.png', '');
  lightboxName.textContent = `${pageNum}ページ目: ${pageName}`;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  lightboxImage.src = '';
}

// Copy image to clipboard
async function copyCurrentImage() {
  try {
    const res = await fetch(lightboxImage.src);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    showToast('クリップボードにコピーしました');
  } catch (err) {
    showToast('コピーに失敗しました');
  }
}

// Download single image
function downloadCurrentImage() {
  const a = document.createElement('a');
  a.href = lightboxImage.src;
  a.download = lightboxName.textContent;
  a.click();
}

// Download all images as ZIP
async function downloadAllImages() {
  if (currentImages.length === 0) return;

  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = 'ZIP作成中...';

  try {
    const zip = new JSZip();

    for (let i = 0; i < currentImages.length; i++) {
      const img = currentImages[i];
      downloadAllBtn.textContent = `ZIP作成中... (${i + 1}/${currentImages.length})`;
      const res = await fetch(img.url);
      const blob = await res.blob();
      zip.file(img.name, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${currentHost}_screenshots.zip`;
    a.click();
    URL.revokeObjectURL(a.href);

    showToast('ZIPダウンロード完了');
  } catch (err) {
    showToast('ZIP作成に失敗しました');
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = '一括ダウンロード (ZIP)';
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}
