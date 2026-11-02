const $ = (selector) => document.querySelector(selector);
const foregroundInput = $('#foregroundInput');
const backgroundInput = $('#backgroundInput');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const state = { foreground: null, background: null, foregroundUrl: null, backgroundUrl: null };

document.querySelectorAll('.browse-btn').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.input).click());
});
foregroundInput.addEventListener('change', (event) => loadImage(event.target.files[0], 'foreground'));
backgroundInput.addEventListener('change', (event) => loadImage(event.target.files[0], 'background'));
$('#tolerance').addEventListener('input', (event) => { $('#toleranceValue').textContent = event.target.value; render(); });
$('#softness').addEventListener('input', (event) => { $('#softnessValue').textContent = event.target.value; render(); });
$('#resetBtn').addEventListener('click', () => { $('#tolerance').value = 42; $('#softness').value = 12; $('#toleranceValue').textContent = 42; $('#softnessValue').textContent = 12; render(); });
$('#downloadBtn').addEventListener('click', () => { if (!state.foreground) return; const link = document.createElement('a'); link.download = 'greenly-composite.png'; link.href = canvas.toDataURL('image/png'); link.click(); });

function loadImage(file, type) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (state[type + 'Url']) URL.revokeObjectURL(state[type + 'Url']);
    state[type] = image; state[type + 'Url'] = url;
    const name = file.name.length > 25 ? file.name.slice(0, 22) + '…' : file.name;
    $(`#${type}Name`).textContent = name;
    $(`#${type}Card`).classList.add('selected');
    render();
  };
  image.src = url;
}

function render() {
  if (!state.foreground) return;
  const fg = state.foreground;
  canvas.width = fg.naturalWidth; canvas.height = fg.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.background) drawCover(state.background, canvas.width, canvas.height);
  const temp = document.createElement('canvas'); temp.width = canvas.width; temp.height = canvas.height;
  const tempCtx = temp.getContext('2d'); tempCtx.drawImage(fg, 0, 0, temp.width, temp.height);
  const pixels = tempCtx.getImageData(0, 0, temp.width, temp.height); const data = pixels.data;
  const tolerance = Number($('#tolerance').value); const softness = Number($('#softness').value);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Green dominance avoids removing neutral skin, white, and grey pixels.
    const greenDistance = Math.max(0, g - (r * .78 + b * .55));
    const brightness = (r + g + b) / 3;
    const score = greenDistance + Math.max(0, g - brightness) * .4;
    const edge = Math.max(1, softness);
    const alpha = 255 - Math.max(0, Math.min(255, ((score - tolerance + edge) / edge) * 255));
    if (g > r * .92 && g > b * .92 && score > tolerance - edge) data[i + 3] = Math.round(alpha);
    if (data[i + 3] < 12) data[i + 3] = 0;
  }
  tempCtx.putImageData(pixels, 0, 0); ctx.drawImage(temp, 0, 0);
  $('#canvasWrap').classList.add('ready'); $('#downloadBtn').disabled = false;
  $('#imageSize').textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} px`;
}
function drawCover(image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}
