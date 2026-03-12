// ═══════════════════════════════════════════
//  状態
// ═══════════════════════════════════════════
const S = {
  tabs: [], active: null, dark: false,
  bookmarks: [],      // スペース0のブックマーク（後方互換）
  bookmarks2: [],     // スペース1のブックマーク（後方互換）
  currentSpace: 0,
  // 動的スペース管理
  spaces: null,       // 初期化後に設定
  pinnedApps: [
    { name:'Slack',   url:'https://app.slack.com' },
    { name:'Gmail',   url:'https://mail.google.com' },
    { name:'Zoom',    url:'https://zoom.us' },
    { name:'Classroom', url:'https://classroom.google.com', isAdd:false },
    { name:'Gemini',  url:'https://gemini.google.com' },
    { name:'ChatGPT', url:'https://chat.openai.com' },
    { name:'Drive',   url:'https://drive.google.com' },
    { name:'YouTube', url:'https://youtube.com' },
  ],
};

// ═══════════════════════════════════════════
//  要素
// ═══════════════════════════════════════════
const sb      = document.getElementById('sb');
const track   = document.getElementById('sb-track');
const trig    = document.getElementById('trig');
const urlDisp = document.getElementById('tb-url');
const overlay = document.getElementById('url-ov');
const urlInp  = document.getElementById('url-inp');
const esc     = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

// ═══════════════════════════════════════════
//  サイドバー開閉
// ═══════════════════════════════════════════
let hideT = null;

function openSB() {
  clearTimeout(hideT);
  sb.classList.add('open');
  window.browser.sbOpen();
}
function closeSB(delay = 280) {
  clearTimeout(hideT);
  hideT = setTimeout(() => {
    sb.classList.remove('open');
    window.browser.sbClose();
  }, delay);
}

function isModalOpen() {
  return document.getElementById('import-modal').classList.contains('show')
      || document.getElementById('bm2-date-modal').classList.contains('show')
      || document.getElementById('bm1-add-modal').classList.contains('show')
      || document.getElementById('sp-edit-modal').classList.contains('show')
      || document.getElementById('notif-modal').classList.contains('show')
      || document.getElementById('history-modal').classList.contains('show')
      || document.getElementById('download-modal').classList.contains('show')
      || overlay.classList.contains('show');
}

sb.addEventListener('mouseenter', () => { clearTimeout(hideT); openSB(); });
sb.addEventListener('mouseleave', e => {
  if (isModalOpen()) return; // モーダル開いてる間は閉じない
  if (e.relatedTarget && trig.contains(e.relatedTarget)) return;
  closeSB(300);
});
trig.addEventListener('mouseenter', openSB);
trig.addEventListener('mouseleave', e => {
  if (isModalOpen()) return;
  if (e.relatedTarget && sb.contains(e.relatedTarget)) return;
  closeSB(150);
});
document.addEventListener('click', e => {
  if (isModalOpen()) return;
  if (!sb.contains(e.target) && !trig.contains(e.target)) {
    closeSB(0);
  }
});

// ═══════════════════════════════════════════
//  スペース（ペイン）切り替え - 動的対応
// ═══════════════════════════════════════════
function goToSpace(idx, animated = true) {
  const count = S.spaces ? S.spaces.length : 2;
  idx = Math.max(0, Math.min(count - 1, idx));
  S.currentSpace = idx;
  if (!animated) track.style.transition = 'none';
  track.style.transform = `translateX(${-idx * 100}%)`;
  if (!animated) setTimeout(() => track.style.transition = '', 20);
  document.querySelectorAll('.sdot').forEach((d, i) => {
    d.classList.toggle('on', i === idx);
  });
  // タブリストをそのスペース用に再描画
  renderTabs();
  updateNav();
}

// スペースを切り替える（タブ保存・復元付き）
async function switchSpace(newIdx) {
  if (!S.spaces || newIdx === S.currentSpace) return;

  // 現スペースのタブURLを保存
  S.spaces[S.currentSpace].tabs = S.tabs.map(t => ({ url: t.url, title: t.title }));
  saveSpaces();

  // 全タブを閉じる（BrowserViewを破棄）
  for (const t of [...S.tabs]) {
    await window.browser.closeTab(t.id);
  }
  S.tabs = [];
  S.active = null;
  updateUrl('');

  // 新スペースに切り替え
  goToSpace(newIdx);

  // 新スペースのタブを復元
  const savedTabs = S.spaces[newIdx].tabs || [];
  if (savedTabs.length > 0) {
    for (const t of savedTabs) {
      await newTab(t.url);
    }
  } else {
    await newTab('https://www.google.com');
  }
}

// ═══════════════════════════════════════════
//  2本指スワイプ
// ═══════════════════════════════════════════
let swipeAccum = 0;
let swipeTimer = null;

sb.addEventListener('wheel', e => {
  if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.5) return;
  e.preventDefault(); e.stopPropagation();
  swipeAccum += e.deltaX;
  clearTimeout(swipeTimer);
  swipeTimer = setTimeout(() => { swipeAccum = 0; }, 300);
  const count = S.spaces ? S.spaces.length : 2;
  if (swipeAccum > 60 && S.currentSpace < count - 1) { swipeAccum = 0; switchSpace(S.currentSpace + 1); }
  else if (swipeAccum < -60 && S.currentSpace > 0) { swipeAccum = 0; switchSpace(S.currentSpace - 1); }
}, { passive: false });

let touchStartX = 0;
sb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
sb.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const count = S.spaces ? S.spaces.length : 2;
  if (dx > 60 && S.currentSpace > 0) switchSpace(S.currentSpace - 1);
  if (dx < -60 && S.currentSpace < count - 1) switchSpace(S.currentSpace + 1);
}, { passive: true });

// ═══════════════════════════════════════════
//  URL表示
// ═══════════════════════════════════════════
function updateUrl(url) {
  if (!url) { urlDisp.textContent = '新しいタブ'; return; }
  try {
    const u = new URL(url);
    urlDisp.textContent = u.hostname.replace(/^www\./, '');
  } catch { urlDisp.textContent = url.slice(0, 40); }
}

urlDisp.addEventListener('click', () => {
  overlay.classList.add('show');
  const t = S.tabs.find(x => x.id === S.active);
  urlInp.value = t?.url || '';
  setTimeout(() => { urlInp.focus(); urlInp.select(); }, 40);
});
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });

async function commitUrl() {
  const v = urlInp.value.trim();
  overlay.classList.remove('show');
  if (!v) return;
  if (S.active) await window.browser.navigate(S.active, v);
  else await newTab(v);
}
document.getElementById('url-go-btn').addEventListener('click', commitUrl);
urlInp.addEventListener('keydown', e => {
  if (e.key === 'Enter') commitUrl();
  if (e.key === 'Escape') overlay.classList.remove('show');
});

// ═══════════════════════════════════════════
//  タブ管理
// ═══════════════════════════════════════════
async function newTab(url) {
  const id = await window.browser.createTab(url || 'https://www.google.com');
  S.tabs.push({ id, title: '読み込み中...', url: url || 'https://www.google.com', fav: null, loading: true });
  await activateTab(id);
}

async function activateTab(id) {
  S.active = id;
  await window.browser.activateTab(id);
  const t = S.tabs.find(x => x.id === id);
  updateUrl(t?.url || '');
  renderTabs();
  updateNav();
}

async function closeTab(id, e) {
  e?.stopPropagation();
  // タブが1つの場合は閉じない
  if (S.tabs.length <= 1) return;
  await window.browser.closeTab(id);
  const idx = S.tabs.findIndex(x => x.id === id);
  S.tabs.splice(idx, 1);
  if (S.active === id) {
    if (S.tabs.length) await activateTab(S.tabs[Math.max(0, idx - 1)].id);
    else { S.active = null; updateUrl(''); }
  }
  renderTabs();
}

function renderTabs() {
  // スペース0はpane-0の #tabs-list へ、それ以外は #sp-tabs-{idx} へ
  const idx = S.currentSpace;
  const elId = idx === 0 ? 'tabs-list' : `sp-tabs-${idx}`;
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  const onlyOne = S.tabs.length <= 1;
  S.tabs.forEach(t => {
    const d = document.createElement('div');
    d.className = 'tab-item' + (t.id === S.active ? ' active' : '');
    let fav = t.fav || (t.url ? getFavicon(t.url) : '');
    const ico = t.loading ? '<div class="tab-spin"></div>'
      : fav ? `<img class="tab-fav" src="${fav}" onerror="this.outerHTML='<div class=tab-fav-ph></div>'">`
      : '<div class="tab-fav-ph"></div>';
    const xStyle = onlyOne ? 'style="display:none"' : '';
    d.innerHTML = `${ico}<span class="tab-title">${esc(t.title || 'New Tab')}</span><button class="tab-x" ${xStyle}>✕</button>`;
    d.addEventListener('click', () => activateTab(t.id));
    d.querySelector('.tab-x').addEventListener('click', e => closeTab(t.id, e));
    el.appendChild(d);
  });
}

// ═══════════════════════════════════════════
//  ファビコン取得
// ═══════════════════════════════════════════
function getFavicon(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return ''; }
}

// ═══════════════════════════════════════════
//  動的スペース管理
// ═══════════════════════════════════════════

// スペースのデフォルト
function createDefaultSpaces() {
  return [
    { id: 'sp_0', name: 'メイン', bookmarks: [], emoji: '📌', tabs: [] },
    { id: 'sp_1', name: 'あとで', bookmarks: [], emoji: '⏰', tabs: [] },
  ];
}

// 保存
function saveSpaces() {
  window.browser.saveSpaces({
    spaces: S.spaces,
    currentSpace: S.currentSpace,
  });
}

// スペースのDOMを全て再生成
function buildSpacePanes() {
  // 既存の動的スペースペインを全削除（pane-0だけ保持）
  document.querySelectorAll('.space-pane.dynamic-pane').forEach(el => el.remove());

  const track = document.getElementById('sb-track');

  // ドットも再生成
  const dotsEl = document.getElementById('space-dots');
  dotsEl.innerHTML = '';
  S.spaces.forEach((sp, i) => {
    const dot = document.createElement('div');
    dot.className = 'sdot' + (i === S.currentSpace ? ' on' : '');
    dot.dataset.idx = i;
    dot.title = sp.name;
    dot.addEventListener('click', () => switchSpace(i));
    // 長押しでスペース名編集
    let pressTimer = null;
    dot.addEventListener('mousedown', () => {
      pressTimer = setTimeout(() => openSpaceEditModal(i), 600);
    });
    dot.addEventListener('mouseup', () => clearTimeout(pressTimer));
    dot.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    dotsEl.appendChild(dot);
  });

  // ＋ボタン（スペース追加）
  const addDot = document.createElement('div');
  addDot.className = 'sdot-add';
  addDot.title = 'スペースを追加';
  addDot.textContent = '+';
  addDot.addEventListener('click', () => addSpace());
  dotsEl.appendChild(addDot);

  // 各スペースのペインを生成
  S.spaces.forEach((sp, i) => {
    // pane-0は既存HTMLを使う（特別扱い）
    let pane = document.getElementById(`pane-${i}`);
    if (!pane) {
      pane = buildSpacePane(sp, i);
      track.appendChild(pane);
    } else {
      // 既存pane-0のヘッダー名を更新
      const nameEl = pane.querySelector('.acct-name');
      if (nameEl) nameEl.textContent = sp.name;
    }
    // ブックマーク描画
    renderSpaceBookmarks(i);
  });

  // pane-0より後ろの孤立ペインを削除（スペース減った時）
  const allPanes = track.querySelectorAll('.space-pane');
  allPanes.forEach(p => {
    const idx = parseInt(p.id.replace('pane-', ''));
    if (idx >= S.spaces.length) p.remove();
  });
}

function buildSpacePane(sp, idx) {
  const pane = document.createElement('div');
  pane.className = 'space-pane dynamic-pane';
  pane.id = `pane-${idx}`;
  pane.innerHTML = `
    <div class="acct-bar">
      <div class="acct-avatar" style="font-size:16px;background:transparent">${esc(sp.emoji || '📁')}</div>
      <div class="acct-name" id="sp-name-${idx}">${esc(sp.name)}</div>
      <button class="space1-add-btn sp-edit-btn" id="sp-edit-${idx}" title="スペースを編集" style="margin-left:auto">…</button>
    </div>
    <div class="scroll">
      <div style="display:flex;align-items:center;padding:2px 8px 6px;">
        <span style="font-size:12px;font-weight:500;color:var(--text2);flex:1">ブックマーク</span>
        <button id="sp-addbm-${idx}" style="background:transparent;border:none;color:var(--accent);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;border-radius:6px;" title="現在のページを追加">+</button>
      </div>
      <div class="bm-list-dynamic" id="bm-list-${idx}"></div>
      <div class="sep"></div>
      <div class="new-tab-row sp-new-tab-${idx}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Tab
      </div>
      <div id="sp-tabs-${idx}"></div>
    </div>
  `;

  // ブックマーク追加ボタン
  pane.querySelector(`#sp-addbm-${idx}`).addEventListener('click', () => addCurrentPageToSpace(idx));
  // 編集ボタン
  pane.querySelector(`#sp-edit-${idx}`).addEventListener('click', () => openSpaceEditModal(idx));
  // New Tab
  pane.querySelector(`.sp-new-tab-${idx}`).addEventListener('click', () => newTab());

  return pane;
}

function renderSpaceBookmarks(idx) {
  const sp = S.spaces[idx];
  if (!sp) return;

  // pane-0は既存の bm-list を使う
  if (idx === 0) {
    const el = document.getElementById('bm-list');
    if (!el) return;
    el.innerHTML = '';
    sp.bookmarks.forEach(b => renderBmItem(el, b, idx));
    return;
  }

  const el = document.getElementById(`bm-list-${idx}`);
  if (!el) return;
  el.innerHTML = '';
  if (!sp.bookmarks.length) {
    el.innerHTML = '<div style="color:var(--text2);font-size:12px;padding:16px 12px;text-align:center">ページを追加するには + を押してください</div>';
    return;
  }
  sp.bookmarks.forEach(b => renderBmItem(el, b, idx));
}

function renderBmItem(container, b, spaceIdx) {
  const d = document.createElement('div');
  d.className = 'bm-item';
  const fav = b.fav || (b.url ? getFavicon(b.url) : '');
  const ico = fav ? `<img class="bm-fav" src="${fav}" onerror="this.outerHTML='<div class=bm-fav-ph></div>'">` : '<div class="bm-fav-ph"></div>';

  let expiryStr = '';
  if (b.expiresAt) {
    const rem = b.expiresAt - Date.now();
    if (rem > 0) {
      const hrs = Math.floor(rem / 3600000);
      const mins = Math.floor((rem % 3600000) / 60000);
      if (hrs >= 24) expiryStr = `あと${Math.floor(hrs/24)}日で削除`;
      else if (hrs >= 1) expiryStr = `あと${hrs}時間で削除`;
      else if (mins > 0) expiryStr = `あと${mins}分で削除`;
      else expiryStr = 'まもなく削除';
    }
  }

  if (expiryStr) {
    d.innerHTML = `${ico}<div class="bm2-info"><span class="bm-name">${esc(b.name)}</span><span class="bm2-expiry">${esc(expiryStr)}</span></div>`;
  } else {
    d.innerHTML = `${ico}<span class="bm-name">${esc(b.name)}</span>`;
  }

  d.addEventListener('click', () => {
    if (b.url) { if (S.active) window.browser.navigate(S.active, b.url); else newTab(b.url); }
  });
  d.addEventListener('contextmenu', e => {
    e.preventDefault();
    const menuItems = [
      { label: '削除', action: () => {
        S.spaces[spaceIdx].bookmarks = S.spaces[spaceIdx].bookmarks.filter(x => x.id !== b.id);
        renderSpaceBookmarks(spaceIdx);
        saveSpaces();
      }},
    ];
    if (b.expiresAt !== undefined) {
      menuItems.push({ label: '期限を変更', action: () => openBM2DateModal(b.id, spaceIdx) });
    }
    showContextMenu(e.clientX, e.clientY, menuItems);
  });
  container.appendChild(d);
}

// 現在のページをスペースに追加
async function addCurrentPageToSpace(idx) {
  if (!S.active) return;
  const url = await window.browser.getUrl(S.active);
  if (!url) return;
  const t = S.tabs.find(x => x.id === S.active);
  const bm = { id: 'bm_' + Date.now(), name: (t?.title || url).slice(0, 32), url, fav: t?.fav || null };
  S.spaces[idx].bookmarks.push(bm);
  renderSpaceBookmarks(idx);
  saveSpaces();
}

// スペース追加
function addSpace() {
  const idx = S.spaces.length;
  const newSpace = { id: 'sp_' + Date.now(), name: `スペース${idx + 1}`, bookmarks: [], emoji: '📁' };
  S.spaces.push(newSpace);
  buildSpacePanes();
  goToSpace(idx);
  saveSpaces();
  // 追加直後に名前編集を開く
  setTimeout(() => openSpaceEditModal(idx), 200);
}

// スペース編集モーダル
function openSpaceEditModal(idx) {
  const sp = S.spaces[idx];
  if (!sp) return;
  document.getElementById('sp-edit-name').value = sp.name;
  document.getElementById('sp-edit-emoji').value = sp.emoji || '';
  document.getElementById('sp-edit-modal').classList.add('show');

  const confirmBtn = document.getElementById('sp-edit-confirm');
  const deleteBtn  = document.getElementById('sp-edit-delete');
  const cancelBtn  = document.getElementById('sp-edit-cancel');

  const cleanup = () => document.getElementById('sp-edit-modal').classList.remove('show');

  confirmBtn.onclick = () => {
    const name = document.getElementById('sp-edit-name').value.trim() || sp.name;
    const emoji = document.getElementById('sp-edit-emoji').value.trim();
    S.spaces[idx].name = name;
    S.spaces[idx].emoji = emoji;
    buildSpacePanes();
    goToSpace(S.currentSpace, false);
    saveSpaces();
    cleanup();
  };

  deleteBtn.onclick = () => {
    if (S.spaces.length <= 1) { alert('最後のスペースは削除できません'); return; }
    S.spaces.splice(idx, 1);
    const newIdx = Math.min(S.currentSpace, S.spaces.length - 1);
    buildSpacePanes();
    goToSpace(newIdx, false);
    saveSpaces();
    cleanup();
  };

  cancelBtn.onclick = cleanup;
}

// ブックマーク2 日時設定モーダル（汎用化）
function openBM2DateModal(bmId, spaceIdx) {
  const modal = document.getElementById('bm2-date-modal');
  const input = document.getElementById('bm2-date-input');
  const def = new Date(Date.now() + 86400000);
  input.value = def.toISOString().slice(0, 16);
  modal.classList.add('show');

  const confirmBtn = document.getElementById('bm2-date-confirm');
  const cancelBtn  = document.getElementById('bm2-date-cancel');
  const noExpBtn   = document.getElementById('bm2-date-noexp');
  const cleanup    = () => modal.classList.remove('show');

  confirmBtn.onclick = () => {
    const val = input.value;
    if (val) {
      const ts = new Date(val).getTime();
      const bm = S.spaces[spaceIdx]?.bookmarks.find(x => x.id === bmId);
      if (bm) { bm.expiresAt = ts; renderSpaceBookmarks(spaceIdx); saveSpaces(); }
    }
    cleanup();
  };
  noExpBtn.onclick = () => {
    const bm = S.spaces[spaceIdx]?.bookmarks.find(x => x.id === bmId);
    if (bm) { delete bm.expiresAt; renderSpaceBookmarks(spaceIdx); saveSpaces(); }
    cleanup();
  };
  cancelBtn.onclick = cleanup;
}

// pane-0 の ＋ボタン：長押しでURL入力モーダル、クリックでワンタップ追加
document.getElementById('bm1-plus-btn').addEventListener('click', () => {
  addCurrentPageToSpace(0);
});
// 右クリックでURL手動入力モーダルを開く
document.getElementById('bm1-plus-btn').addEventListener('contextmenu', e => {
  e.preventDefault();
  const modal = document.getElementById('bm1-add-modal');
  document.getElementById('bm1-name-input').value = '';
  document.getElementById('bm1-url-input').value = '';
  modal.classList.add('show');
  setTimeout(() => document.getElementById('bm1-name-input').focus(), 40);
});
document.getElementById('bm1-modal-confirm').addEventListener('click', () => {
  const name = document.getElementById('bm1-name-input').value.trim();
  const url  = document.getElementById('bm1-url-input').value.trim();
  if (!url) return;
  let u = url;
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
  S.spaces[0].bookmarks.push({ id: 'bm_' + Date.now(), name: (name || u).slice(0, 32), url: u, fav: null });
  renderSpaceBookmarks(0);
  saveSpaces();
  document.getElementById('bm1-add-modal').classList.remove('show');
});
document.getElementById('bm1-modal-cancel').addEventListener('click', () => {
  document.getElementById('bm1-add-modal').classList.remove('show');
});
document.getElementById('bm1-url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('bm1-modal-confirm').click();
  if (e.key === 'Escape') document.getElementById('bm1-add-modal').classList.remove('show');
});
document.getElementById('bm1-name-input').addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('bm1-add-modal').classList.remove('show');
});

// 後方互換: renderBM, renderBM2
function renderBM()  { renderSpaceBookmarks(0); }
function renderBM2() { if (S.spaces && S.spaces[1]) renderSpaceBookmarks(1); }

// ═══════════════════════════════════════════
//  右クリックコンテキストメニュー
// ═══════════════════════════════════════════
let ctxMenu = null;
function showContextMenu(x, y, items) {
  removeContextMenu();
  ctxMenu = document.createElement('div');
  ctxMenu.className = 'ctx-menu';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'ctx-item';
    btn.textContent = item.label;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      item.action();
      removeContextMenu();
    });
    ctxMenu.appendChild(btn);
  });
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
  document.body.appendChild(ctxMenu);
  setTimeout(() => document.addEventListener('click', removeContextMenu, { once: true }), 50);
}
function removeContextMenu() {
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
}

// ═══════════════════════════════════════════
//  ピンアプリ
// ═══════════════════════════════════════════
function renderPins() {
  const el = document.getElementById('pin-grid');
  el.innerHTML = '';
  S.pinnedApps.forEach(p => {
    const d = document.createElement('div'); d.className = 'pin-item';
    let iconHtml;
    if (p.isAdd) {
      iconHtml = `<div class="pin-icon" style="font-size:22px;color:var(--text2)">+</div>`;
    } else {
      iconHtml = `<div class="pin-icon"><img src="${getFavicon(p.url)}" alt="" onerror="this.style.display='none'"></div>`;
    }
    d.innerHTML = `${iconHtml}<div class="pin-lbl">${esc(p.name)}</div>`;
    if (!p.isAdd && p.url) d.addEventListener('click', () => { if (S.active) window.browser.navigate(S.active, p.url); else newTab(p.url); });
    // ＋ボタンは新しいタブを開く
    if (p.isAdd) d.addEventListener('click', () => newTab());
    el.appendChild(d);
  });
}

// ═══════════════════════════════════════════
//  ナビ
// ═══════════════════════════════════════════
async function updateNav() {
  if (!S.active) return;
  const [b, f] = await Promise.all([window.browser.canGoBack(S.active), window.browser.canGoForward(S.active)]);
  document.getElementById('nb-back').disabled = !b;
  document.getElementById('nb-fwd').disabled = !f;
}

document.getElementById('nb-back').addEventListener('click', () => { if (S.active) window.browser.back(S.active); });
document.getElementById('nb-fwd').addEventListener('click', () => { if (S.active) window.browser.forward(S.active); });
document.getElementById('nb-reload').addEventListener('click', () => { if (S.active) window.browser.reload(S.active); });
document.getElementById('new-tab-row').addEventListener('click', () => newTab());
document.getElementById('tb-copy').addEventListener('click', async () => {
  if (!S.active) return;
  const url = await window.browser.getUrl(S.active);
  try { await navigator.clipboard.writeText(url); } catch {}
});
document.getElementById('tidy-btn').addEventListener('click', () => {
  S.tabs.sort((a, b) => a.title.localeCompare(b.title, 'ja')); renderTabs();
});
document.getElementById('clear-btn').addEventListener('click', async () => {
  for (const t of [...S.tabs]) await window.browser.closeTab(t.id);
  S.tabs = []; S.active = null; updateUrl(''); renderTabs(); newTab();
});

// ═══════════════════════════════════════════
//  テーマ
// ═══════════════════════════════════════════
document.getElementById('nb-theme').addEventListener('click', () => {
  S.dark = !S.dark;
  document.documentElement.setAttribute('data-theme', S.dark ? 'dark' : 'light');
  document.getElementById('ico-m').style.display = S.dark ? 'none' : '';
  document.getElementById('ico-s').style.display = S.dark ? '' : 'none';
});

// ═══════════════════════════════════════════
//  IPC
// ═══════════════════════════════════════════
window.browser.onNavigate(d => {
  const t = S.tabs.find(x => x.id === d.id);
  if (t) {
    t.url = d.url;
    if (d.title) t.title = d.title;
    if (d.id === S.active) updateUrl(d.url);
    renderTabs(); updateNav();
  }
});
window.browser.onTitle(({ id, title }) => { const t = S.tabs.find(x => x.id === id); if (t) { t.title = title; renderTabs(); } });
window.browser.onFavicon(({ id, favicon }) => { const t = S.tabs.find(x => x.id === id); if (t) { t.fav = favicon; renderTabs(); } });
window.browser.onLoading(({ id, loading }) => { const t = S.tabs.find(x => x.id === id); if (t) { t.loading = loading; renderTabs(); } });
window.browser.onOpenUrl(url => newTab(url));

// アップデート通知
window.browser.onUpdateAvailable(({ version }) => {
  const bar = document.getElementById('update-bar');
  if (bar) {
    document.getElementById('update-version').textContent = version;
    bar.style.display = 'flex';
  }
});
window.browser.onUpdateDownloaded(({ version }) => {
  const bar = document.getElementById('update-bar');
  if (bar) {
    bar.querySelector('.update-msg').textContent = `v${version} ダウンロード完了 — 再起動してインストール`;
    document.getElementById('update-install-btn').style.display = '';
  }
});
document.getElementById('update-install-btn')?.addEventListener('click', () => {
  window.browser.installUpdate();
});
document.getElementById('update-bar-close')?.addEventListener('click', () => {
  document.getElementById('update-bar').style.display = 'none';
});

// ── アップデート確認ボタン
document.getElementById('btn-check-update').addEventListener('click', async () => {
  const btn = document.getElementById('btn-check-update');
  btn.style.animation = 'sp .65s linear infinite';
  btn.disabled = true;
  await window.browser.checkUpdate();
  setTimeout(() => {
    btn.style.animation = '';
    btn.disabled = false;
  }, 3000);
});

window.browser.onUpdateNotAvailable(() => {
  const btn = document.getElementById('btn-check-update');
  if (btn) { btn.style.animation = ''; btn.disabled = false; }
  // 最新版である旨をアップデートバーで表示
  const bar = document.getElementById('update-bar');
  if (bar) {
    bar.querySelector('.update-msg').textContent = '最新バージョンです';
    document.getElementById('update-install-btn').style.display = 'none';
    bar.style.display = 'flex';
    setTimeout(() => { bar.style.display = 'none'; }, 3000);
  }
});


// ═══════════════════════════════════════════
//  キーボード
// ═══════════════════════════════════════════
document.addEventListener('keydown', e => {
  const m = e.metaKey || e.ctrlKey;
  if (m && e.key === 't') { e.preventDefault(); newTab(); }
  if (m && e.key === 'w') { e.preventDefault(); if (S.active) closeTab(S.active); }
  if (m && e.key === 'l') { e.preventDefault(); openSB(); overlay.classList.add('show'); setTimeout(() => { urlInp.focus(); urlInp.select(); }, 40); }
  if (m && e.key === 'r') { e.preventDefault(); if (S.active) window.browser.reload(S.active); }
  if (m && e.key === '[') { e.preventDefault(); if (S.active) window.browser.back(S.active); }
  if (m && e.key === ']') { e.preventDefault(); if (S.active) window.browser.forward(S.active); }
  if (m && e.key >= '1' && e.key <= '9') { const i = +e.key - 1; if (S.tabs[i]) activateTab(S.tabs[i].id); }
});

// ═══════════════════════════════════════════
//  インポートモーダル
// ═══════════════════════════════════════════
const importModal = document.getElementById('import-modal');
let selectedBrowser = null;

async function openImportModal() {
  importModal.classList.add('show');
  openSB();
  selectedBrowser = null;
  document.getElementById('import-go').disabled = true;
  document.getElementById('import-result').classList.remove('show');

  const bmList = document.getElementById('import-browser-list');
  bmList.innerHTML = '<div style="color:var(--textm);font-size:13px;padding:8px">検出中...</div>';

  const browsers = await window.browser.importDetect();
  if (!browsers.length) {
    bmList.innerHTML = '<div style="color:var(--textm);font-size:13px;padding:8px">対応ブラウザが見つかりませんでした</div>';
    return;
  }
  const icons = { chrome:'https://www.google.com/chrome/static/images/chrome-logo.svg', edge:'https://www.microsoft.com/favicon.ico', arc:'https://arc.net/favicon.ico', vivaldi:'https://vivaldi.com/favicon.ico' };
  bmList.innerHTML = '';
  browsers.forEach(b => {
    const el = document.createElement('button'); el.className = 'import-browser-item';
    el.innerHTML = `<img class="import-browser-icon" src="${icons[b.name]||''}" onerror="this.style.display='none'"><div><div class="import-browser-name">${b.name[0].toUpperCase()+b.name.slice(1)}</div><div class="import-browser-path">${b.profilePath}</div></div>`;
    el.addEventListener('click', () => {
      document.querySelectorAll('.import-browser-item').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
      selectedBrowser = b.name;
      document.getElementById('import-go').disabled = false;
    });
    bmList.appendChild(el);
  });
}

document.getElementById('import-go').addEventListener('click', async () => {
  if (!selectedBrowser) return;
  const btn = document.getElementById('import-go');
  btn.disabled = true; btn.textContent = 'インポート中...';
  const res = await window.browser.importBookmarks(selectedBrowser);
  const resEl = document.getElementById('import-result');
  if (res.error) {
    resEl.textContent = 'エラー: ' + res.error; resEl.classList.add('show');
  } else {
    (res.bookmarks||[]).slice(0,50).forEach(b => {
      S.bookmarks.push({ id:'imp_'+Date.now()+Math.random(), name:b.name.slice(0,28), url:b.url, fav:null });
    });
    renderBM();
    resEl.textContent = `✓ ${(res.bookmarks||[]).length}件のブックマークをインポートしました`;
    resEl.classList.add('show');
    setTimeout(() => importModal.classList.remove('show'), 1800);
  }
  btn.disabled = false; btn.textContent = 'インポート';
});
document.getElementById('import-cancel').addEventListener('click', () => importModal.classList.remove('show'));
// モーダル外クリックでは閉じない（マウス移動で誤って閉じるのを防ぐ）
// Google signin removed
document.getElementById('btn-settings').addEventListener('click', () => { openSB(); openImportModal(); });

// ── フッター: 履歴
document.getElementById('btn-history').addEventListener('click', () => {
  openHistoryModal();
});

// ── フッター: ダウンロード
document.getElementById('btn-download').addEventListener('click', () => {
  openDownloadModal();
  closeSB(0);
});

// ═══════════════════════════════════════════
//  履歴モーダル
// ═══════════════════════════════════════════
let historyData = [];

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}日前`;
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function renderHistoryList(filter = '') {
  const el = document.getElementById('history-list');
  const items = filter
    ? historyData.filter(h => h.title?.includes(filter) || h.url?.includes(filter))
    : historyData;
  if (!items.length) {
    el.innerHTML = '<div class="history-empty">履歴がありません</div>';
    return;
  }
  el.innerHTML = '';
  items.forEach((h, i) => {
    const d = document.createElement('div');
    d.className = 'history-item';
    const favicon = h.url ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(h.url).hostname)}&sz=32` : '';
    d.innerHTML = `
      <img class="history-item-icon" src="${favicon}" onerror="this.style.display='none'">
      <div class="history-item-info">
        <div class="history-item-title">${esc(h.title || h.url || '')}</div>
        <div class="history-item-url">${esc(h.url || '')}</div>
      </div>
      <div class="history-item-time">${formatTime(h.visitedAt)}</div>
      <button class="history-item-del" title="削除">✕</button>
    `;
    d.addEventListener('click', e => {
      if (e.target.classList.contains('history-item-del')) return;
      closeHistoryModal();
      if (S.active) window.browser.navigate(S.active, h.url);
      else newTab(h.url);
    });
    d.querySelector('.history-item-del').addEventListener('click', e => {
      e.stopPropagation();
      const realIdx = historyData.indexOf(h);
      if (realIdx >= 0) historyData.splice(realIdx, 1);
      renderHistoryList(document.getElementById('history-search').value);
    });
    el.appendChild(d);
  });
}

async function openHistoryModal() {
  historyData = await window.browser.getHistory();
  document.getElementById('history-modal').classList.add('show');
  document.getElementById('history-search').value = '';
  renderHistoryList();
  openSB();
}

function closeHistoryModal() {
  document.getElementById('history-modal').classList.remove('show');
}

document.getElementById('history-close-btn').addEventListener('click', closeHistoryModal);
document.getElementById('history-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('history-modal')) closeHistoryModal();
});
document.getElementById('history-clear-btn').addEventListener('click', async () => {
  await window.browser.clearHistory();
  historyData = [];
  renderHistoryList();
});
document.getElementById('history-search').addEventListener('input', e => {
  renderHistoryList(e.target.value);
});

// ═══════════════════════════════════════════
//  ダウンロード履歴モーダル
// ═══════════════════════════════════════════
let downloadData = [];

function renderDownloadList() {
  const el = document.getElementById('download-list');
  if (!downloadData.length) {
    el.innerHTML = '<div class="history-empty">ダウンロード履歴がありません</div>';
    return;
  }
  el.innerHTML = '';
  downloadData.forEach(d => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const stateLabel = d.state === 'completed' ? '✓' : d.state === 'cancelled' ? '✕' : '…';
    const stateColor = d.state === 'completed' ? '#4caf50' : d.state === 'cancelled' ? '#f44336' : 'var(--text2)';
    const size = d.totalBytes > 0 ? (d.totalBytes > 1048576
      ? `${(d.totalBytes / 1048576).toFixed(1)} MB`
      : `${(d.totalBytes / 1024).toFixed(0)} KB`) : '';
    item.innerHTML = `
      <div style="font-size:18px;color:${stateColor};flex-shrink:0;width:18px;text-align:center">${stateLabel}</div>
      <div class="history-item-info">
        <div class="history-item-title">${esc(d.filename || '')}</div>
        <div class="history-item-url">${esc(d.url || '')}${size ? ' · ' + size : ''}</div>
      </div>
      <div class="history-item-time">${formatTime(d.startedAt)}</div>
    `;
    el.appendChild(item);
  });
}

async function openDownloadModal() {
  downloadData = await window.browser.getDownloadHistory();
  document.getElementById('download-modal').classList.add('show');
  renderDownloadList();
  openSB();
}

function closeDownloadModal() {
  document.getElementById('download-modal').classList.remove('show');
}

document.getElementById('download-close-btn').addEventListener('click', closeDownloadModal);
document.getElementById('download-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('download-modal')) closeDownloadModal();
});
document.getElementById('download-clear-btn').addEventListener('click', async () => {
  await window.browser.clearDownloadHistory();
  downloadData = [];
  renderDownloadList();
});

// ダウンロード完了通知
window.browser.onDownloadDone(entry => {
  downloadData.unshift(entry);
});

// ═══════════════════════════════════════════
//  初期化（スペースデータを読み込んでから構築）
// ═══════════════════════════════════════════
renderPins();
renderTabs();

window.browser.onReady(async () => {
  // 保存済みスペースデータを読み込む
  const saved = await window.browser.loadSpaces();
  if (saved && saved.spaces && saved.spaces.length > 0) {
    S.spaces = saved.spaces;
    S.currentSpace = saved.currentSpace || 0;
    // 後方互換: S.bookmarks / S.bookmarks2 と同期
    S.bookmarks  = S.spaces[0]?.bookmarks || [];
    S.bookmarks2 = S.spaces[1]?.bookmarks || [];
  } else {
    // 初回: デフォルトスペース作成
    S.spaces = createDefaultSpaces();
    // 既存の S.bookmarks / S.bookmarks2 を引き継ぐ
    S.spaces[0].bookmarks = S.bookmarks || [];
    S.spaces[1].bookmarks = S.bookmarks2 || [];
    S.currentSpace = 0;
  }
  buildSpacePanes();
  goToSpace(S.currentSpace, false);
  newTab('https://www.google.com');
});

// ═══════════════════════════════════════════
//  通知設定
// ═══════════════════════════════════════════
let notifSettings = null;

const APP_ICONS = {
  gmail:   'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64',
  slack:   'https://www.google.com/s2/favicons?domain=app.slack.com&sz=64',
  discord: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64',
  chatgpt: 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64',
  youtube: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
};

function renderNotifModal() {
  if (!notifSettings) return;
  const masterToggle = document.getElementById('notif-master-toggle');
  masterToggle.checked = notifSettings.enabled;

  const list = document.getElementById('notif-app-list');
  list.innerHTML = '';
  Object.entries(notifSettings.apps).forEach(([key, app]) => {
    const item = document.createElement('div');
    item.className = 'notif-app-item';
    item.innerHTML = `
      <img class="notif-app-icon" src="${APP_ICONS[key] || ''}" onerror="this.style.display='none'">
      <span class="notif-app-lbl">${app.label}</span>
      <label class="toggle">
        <input type="checkbox" data-key="${key}" ${app.enabled ? 'checked' : ''} ${!notifSettings.enabled ? 'disabled' : ''}>
        <span class="toggle-slider"></span>
      </label>
    `;
    list.appendChild(item);
  });

  // マスタートグルで全アプリのdisabled制御
  masterToggle.onchange = () => {
    notifSettings.enabled = masterToggle.checked;
    list.querySelectorAll('input[data-key]').forEach(el => el.disabled = !notifSettings.enabled);
    saveNotifSettings();
  };

  list.addEventListener('change', e => {
    const key = e.target.dataset.key;
    if (key && notifSettings.apps[key]) {
      notifSettings.apps[key].enabled = e.target.checked;
      saveNotifSettings();
    }
  });
}

async function saveNotifSettings() {
  await window.browser.saveNotifSettings(notifSettings);
}

function openNotifModal() {
  document.getElementById('notif-modal').classList.add('show');
  openSB();
  renderNotifModal();
}

document.getElementById('notif-close-btn').addEventListener('click', () => {
  document.getElementById('notif-modal').classList.remove('show');
});

document.getElementById('btn-notif').addEventListener('click', openNotifModal);

// 通知設定を受信
window.browser.onNotifSettings(settings => {
  notifSettings = settings;
});

// 通知クリックでタブをアクティブに
window.browser.onNotifClick(({ tabId }) => {
  if (S.tabs.find(t => t.id === tabId)) activateTab(tabId);
});

// 起動時に設定を取得
window.browser.getNotifSettings().then(settings => {
  notifSettings = settings;
});
