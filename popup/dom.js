window.PopupUI = {
  statusEl: document.getElementById('status'),
  xphanEl: document.getElementById('xphan'),
  runBtn: document.getElementById('run'),
  closeBtn: document.getElementById('close'),
  status(msg) {
    this.statusEl.textContent = msg
  }
}
