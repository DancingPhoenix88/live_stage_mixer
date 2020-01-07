let all_bgms     = [];
let all_sfxs     = [];
let selected_bgm_index = -1;
let selected_sfx_index = -1;
let playing_bgm_index  = -1;
let next_track_order = -1;
//------------------------------------------------------------------

// SCREEN
document.body.onload = setupScreen;
function setupScreen () {
  let sources = document.getElementsByTagName('audio');
  let bgm_list = document.getElementById('bgm-list');
  let sfx_list = document.getElementById('sfx-list');
  let bgm_prototype_html = bgm_list.innerHTML;
  let sfx_prototype_html = sfx_list.innerHTML;
  let bgm_list_html      = [];
  let sfx_list_html      = [];

  // create HTML tags
  for (var i = 0; i < sources.length; ++i) {
    let track = data[sources[i].id];
    track.player          = sources[i];
    track.duration        = Math.ceil(sources[i].duration);
    track.stepDuckVolume  = track.duck_fade_duration > 0 ? ((1 - track.duck_volume) * 0.1 / track.duck_fade_duration) : 1;
    track.order           = i;

    let track_prototype = track.is_bgm ? bgm_prototype_html : sfx_prototype_html;
    let container = track.is_bgm ? bgm_list_html : sfx_list_html;
    container.push(
      track_prototype
        .replace(/\{track\-id\}/g,      track.name)
        .replace(/\{bgm\-or\-sfx\}/g,   track.is_bgm ? 'bgm' : 'sfx')
        .replace(/\{track\-time\}/g,    `${track.duration}s`)
        .replace(/\{elapsed\}/g,        0)
        .replace(/\{duration\}/g,       track.duration)
        .replace(/\{cue\-begin\}/g,     track.cue_begin)
        .replace(/\{cue\-end\}/g,       track.cue_end)
        .replace(/\{fade\-info\}/g,     track.fade_out_duration <= 0 ? '' : `*FADE OUT trong ${track.fade_out_duration}s`)
        .replace(/\{duck\-info\}/g,     track.duck_fade_duration <= 0 ? '' : `*DUCK TOGGLE trong ${track.duck_fade_duration}s`)
        .replace(/\{track\-effect\}/g,  '')
    );
  }
  bgm_list.innerHTML = bgm_list_html.join('');
  sfx_list.innerHTML = sfx_list_html.join('');

  // fetch references
  for (var i = 0; i < bgm_list.children.length; ++i) {
    let node  = bgm_list.children[i];
    let track = data[node.id];
    track.controllers = {
      'radio':    node.getElementsByTagName('input')[0],
      'status':   node.getElementsByClassName('track-status')[0],
      'progress': node.getElementsByTagName('progress')[0],
      'time':     node.getElementsByClassName('track-time')[0],
      'effect':   node.getElementsByClassName('track-effect')[0]
    };
    all_bgms.push(track);
  }
  for (var i = 0; i < sfx_list.children.length; ++i) {
    let node  = sfx_list.children[i];
    let track = data[node.id];
    track.controllers = {
      'radio':    node.getElementsByTagName('input')[0],
      'status':   node.getElementsByClassName('track-status')[0],
      'progress': node.getElementsByTagName('progress')[0],
      'time':     node.getElementsByClassName('track-time')[0]
    };
    all_sfxs.push(track);
  }

  // register events
  let all_tracks = all_bgms.concat(all_sfxs);
  for (var i = 0; i < all_tracks.length; ++i) {
    let track = all_tracks[i];
    track.player.onplay = onTrackPlay.bind(null, track);
    track.player.onpause = onTrackPause.bind(null, track);
    track.player.ontimeupdate = onTrackUpdate.bind(null, track);
    track.player.onended = onTrackEnd.bind(null, track);
  }

  // default
  selectBGM(0);
  selectSFX(0);
  setNextCandidate(0);

  setupInteractions();
}

//------------------------------------------------------------------
// Register key events
function setupInteractions () {
  let btnPrevBGM = document.getElementById('btn-prev-bgm');
  let btnNextBGM = document.getElementById('btn-next-bgm');
  let btnPlayBGM = document.getElementById('btn-play-bgm');
  let btnFadeBGM = document.getElementById('btn-fade-bgm');
  let btnDuckBGM = document.getElementById('btn-duck-bgm');
  let btnPrevSFX = document.getElementById('btn-prev-sfx');
  let btnNextSFX = document.getElementById('btn-next-sfx');
  let btnPlaySFX = document.getElementById('btn-play-sfx');
  let btnPlayNextCandidate = document.getElementById('btn-play-next-candidate');
  document.addEventListener('keyup', (e) => {
    let btn = null;
    switch (e.code) {
      case 'Digit1':
      case 'KeyQ': { btn = btnPrevBGM; break; }

      case 'Digit2':
      case 'KeyW': { btn = btnNextBGM; break; }

      case 'Digit3':
      case 'KeyE': { btn = btnPlayBGM; break; }

      case 'Digit4':
      case 'KeyR': { btn = btnFadeBGM; break; }

      case 'Digit5':
      case 'KeyT': { btn = btnDuckBGM; break; }

      case 'Digit8':
      case 'KeyI': { btn = btnPrevSFX; break; }

      case 'Digit9':
      case 'KeyO': { btn = btnNextSFX; break; }

      case 'Digit0':
      case 'KeyP': { btn = btnPlaySFX; break; }

      case 'Space': { btn = btnPlayNextCandidate; break; }
    }
    if (btn == null) return;
    btn.click();
    btn.classList.remove('shortcut-active');
    setTimeout(function () { btn.classList.add('shortcut-active'); }, 10);
  });
}

//------------------------------------------------------------------
// Handlers
function onRequestPlayStopBGM ()      { console.log('RequestPlayStopBGM');    playStopBGM(); }
function onRequestFadeOutBGM ()       { console.log('RequestFadeOutBGM');     fadeOutPlayingBGM(); }
function onRequestToggleDuckBGM ()    { console.log('RequestToggleDuckBGM');  toggleDuckPlayingBGM(); }
function onRequestPreviousBGM ()      { console.log('RequestPreviousBGM');    selectPrevBGM(); }
function onRequestNextBGM ()          { console.log('RequestNextBGM');        selectNextBGM(); }
//------------------------------------------------------------------
function onRequestPlayStopSFX ()      { console.log('RequestPlayStopSFX');    playStopSFX(); }
function onRequestPreviousSFX ()      { console.log('RequestPreviousSFX');    selectPrevSFX(); }
function onRequestNextSFX ()          { console.log('RequestNextSFX');        selectNextSFX(); }

//------------------------------------------------------------------
// Functions - BGM
function selectBGM (track_index) {
  all_bgms[track_index].controllers.radio.checked = true;
  selected_bgm_index = track_index;
  all_bgms[track_index].controllers.time.scrollIntoView({behavior: 'smooth', block:'center'});
}
//------------------------------------------------------------------
function findPrevBGM () {
  if (selected_bgm_index == -1) return 0;
  return (selected_bgm_index + all_bgms.length - 1) % all_bgms.length;
}
//------------------------------------------------------------------
function findNextBGM () {
  if (selected_bgm_index == -1) return 0;
  return (selected_bgm_index + 1) % all_bgms.length;
}
//------------------------------------------------------------------
function selectPrevBGM () {
  selectBGM(findPrevBGM());
}
//------------------------------------------------------------------
function selectNextBGM () {
  selectBGM(findNextBGM());
}
//------------------------------------------------------------------
function findBGM (track_name) {
  return all_bgms.findIndex((track) => track.name == track_name);
}
//------------------------------------------------------------------
function onRequestSelectBGM (track_name) {
  selectBGM(findBGM(track_name));
}
//------------------------------------------------------------------
function playStopBGM () {
  let track = all_bgms[selected_bgm_index];
  if (isTrackPaused(track)) {
    fadeOutPlayingBGM(); // fade out playing track automatically
    playTrack(track);
    playing_bgm_index = selected_bgm_index;
  } else {
    pauseTrack(track);
    playing_bgm_index = -1;
  }
}
//------------------------------------------------------------------
function fadeOutPlayingBGM () {
  if (playing_bgm_index == -1) return;
  fadeOutBGM(playing_bgm_index);
  playing_bgm_index = -1;
}
//------------------------------------------------------------------
function fadeOutBGM (track_index) {
  let track = all_bgms[track_index];
  if (isTrackPaused(track)) return;
  if (!isNaN(track.interval) && track.interval > 0) return;
  if (track.fade_out_duration <= 0) {
    pauseTrack(track);
    playing_bgm_index = -1;
    return;
  }
  fadeOutTrack(track);
}
//------------------------------------------------------------------
function toggleDuckPlayingBGM () {
  if (playing_bgm_index == -1) return;
  toggleDuckBGM(playing_bgm_index);
}
//------------------------------------------------------------------
function toggleDuckBGM (track_index) {
  let track = all_bgms[track_index];
  if (isTrackPaused(track)) return;
  if (!isNaN(track.interval) && track.interval > 0) return;
  
  if (track.duck_fade_duration <= 0) {
    if (track.player.volume == 1) onCompleteDuckOutTrack(track);
    else onCompleteDuckInTrack(track);
  } else {
    if (track.player.volume == 1) duckInTrack(track);
    else duckOutTrack(track);
  }
}

//------------------------------------------------------------------
// Functions - SFX
function selectSFX (track_index) {
  all_sfxs[track_index].controllers.radio.checked = true;
  selected_sfx_index = track_index;
  all_sfxs[track_index].controllers.time.scrollIntoView({behavior: 'smooth', block:'center'});
}
//------------------------------------------------------------------
function findPrevSFX () {
  if (selected_sfx_index == -1) return 0;
  return (selected_sfx_index + all_sfxs.length - 1) % all_sfxs.length;
}
//------------------------------------------------------------------
function findNextSFX () {
  if (selected_sfx_index == -1) return 0;
  return (selected_sfx_index + 1) % all_sfxs.length;
}
//------------------------------------------------------------------
function selectPrevSFX () {
  selectSFX(findPrevSFX());
}
//------------------------------------------------------------------
function selectNextSFX () {
  selectSFX(findNextSFX());
}
//------------------------------------------------------------------
function findSFX (track_name) {
  return all_sfxs.findIndex((track) => track.name == track_name);
}
//------------------------------------------------------------------
function onRequestSelectSFX (track_name) {
  selectSFX(findSFX(track_name));
}
//------------------------------------------------------------------
function playStopSFX () {
  let track = all_sfxs[selected_sfx_index];
  if (isTrackPaused(track)) {
    playTrack(track);
    selectNextSFX();
  } else {
    pauseTrack(track);
  }
}

//------------------------------------------------------------------
// Functions - TRACK
//------------------------------------------------------------------
function isTrackPaused (track) {
  return track.player.paused;
}
//------------------------------------------------------------------
function playTrack (track) {
  let player = track.player;
  player.currentTime = 0;
  player.volume = 1;
  player.play();
  setNextCandidate(track.order + 1);
  console.log(`PLAY ${track.name}`);
}
//------------------------------------------------------------------
function pauseTrack (track) {
  track.player.pause();
  console.log(`PAUSE ${track.name}`);
}
//------------------------------------------------------------------
function fadeOutTrack (track) {
  track.interval = setInterval(stepFadeOut.bind(null, track), 100);
  console.log(`FADE OUT ${track.name}`);
}
//------------------------------------------------------------------
function onTrackPlay (track) {
  track.controllers.status.classList.add('playing');
}
//------------------------------------------------------------------
function onTrackPause (track) {
  onTrackEnd(track);
}
//------------------------------------------------------------------
function onTrackUpdate (track) {
  track.controllers.progress.value = track.player.currentTime;
  track.controllers.time.innerText = `${Math.floor(track.player.currentTime)}/${track.duration}s`;
}
//------------------------------------------------------------------
function onTrackEnd (track) {
  track.controllers.status.classList.replace('playing', 'played');
  track.controllers.time.innerText = `${track.duration}s`;
  track.controllers.progress.value = track.duration;

  if (track.is_bgm && all_bgms[playing_bgm_index] == track) playing_bgm_index = -1;
}
//------------------------------------------------------------------
function stepFadeOut (track) {
  let p = Math.max(0, track.player.volume - 0.1 / track.fade_out_duration);
  track.player.volume = p;

  p = Math.floor(100 - p * 100);
  track.controllers.effect.innerText = `Fading out (${p}%)`;

  if (p >= 100 || isTrackPaused(track)) {
    onFadedOut(track);
  }
}
//------------------------------------------------------------------
function onFadedOut (track) {
  clearInterval(track.interval);
  track.controllers.effect.innerText = '';
  track.interval = 0;
  pauseTrack(track);
}
//------------------------------------------------------------------
function duckInTrack (track) {
  track.interval = setInterval(stepDuckInTrack.bind(null, track), 100);
  console.log(`DUCK IN ${track.name}`);
}
//------------------------------------------------------------------
function stepDuckInTrack (track) {
  let p = Math.max(0, track.player.volume - track.stepDuckVolume);
  track.player.volume = p;
  track.controllers.effect.innerText = `Ducking in (${Math.floor(p * 100)}%)`;

  if (isTrackPaused(track)) { // if audio ends before ducking-in completes -> restore
    onCompleteDuckOutTrack(track);
    return;
  }
  if (p <= track.duck_volume) {
    onCompleteDuckInTrack(track);
  }
}
//------------------------------------------------------------------
function duckOutTrack (track) {
  track.interval = setInterval(stepDuckOutTrack.bind(null, track), 100);
  console.log(`DUCK OUT ${track.name}`);
}
//------------------------------------------------------------------
function stepDuckOutTrack (track) {
  let p = Math.min(1, track.player.volume + track.stepDuckVolume);
  track.player.volume = p;
  track.controllers.effect.innerText = `Ducking out (${Math.floor(p * 100)}%)`;

  if (isTrackPaused(track)) { // if audio ends before ducking-out completes -> restore
    onCompleteDuckOutTrack(track);
    return;
  }
  if (p >= 1) {
    onCompleteDuckOutTrack(track);
  }
}
//------------------------------------------------------------------
function onCompleteDuckInTrack (track) {
  clearInterval(track.interval);
  track.controllers.effect.innerText = `DUCKING (${Math.floor(track.duck_volume * 100)}%)`;
  track.controllers.effect.classList.add('blink');
  track.player.volume = track.duck_volume;
  track.interval = 0;
}
//------------------------------------------------------------------
function onCompleteDuckOutTrack (track) {
  clearInterval(track.interval);
  track.controllers.effect.innerText = '';
  track.controllers.effect.classList.remove('blink');
  track.player.volume = 1;
  track.interval = 0;
}
//------------------------------------------------------------------
function findTrackByOrder (track_order) {
  let track = null;
  let track_index = all_bgms.findIndex((track) => track.order == track_order);
  if (track_index != -1) track = all_bgms[track_index];
  else {
    track_index = all_sfxs.findIndex((track) => track.order == track_order);
    if (track_index != -1) track = all_sfxs[track_index];
  }
  return track;
}
//------------------------------------------------------------------
function setNextCandidate (track_order) {
  // Find new candidate
  let track = findTrackByOrder(track_order);
  if (track == null) return;

  // Remove highlight from old candidate
  if (next_track_order != -1) {
    let lastTrack = findTrackByOrder(next_track_order);
    if (lastTrack != null) lastTrack.controllers.status.classList.remove('next-candidate');
  }

  // Save new candidate & highlight it
  next_track_order = track_order;
  if (isTrackPaused(track)) track.controllers.status.classList.add('next-candidate');
  console.log(`setNextCandidate ${track_order} = ${track.name}`);
}
//------------------------------------------------------------------
function onRequestPlayNextCandidate () {
  let track = findTrackByOrder(next_track_order);
  if (track == null) return;

  if (track.is_bgm) {
    selectBGM(all_bgms.indexOf(track));
    playStopBGM();
  } else {
    selectSFX(all_sfxs.indexOf(track));
    playStopSFX();
  }
}
