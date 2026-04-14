const audio = document.getElementById('audio-element');
const fileInput = document.getElementById('file-upload');
const folderInput = document.getElementById('folder-upload');

const playlistElement = document.getElementById('playlist');
const emptyState = document.getElementById('empty-state');

const trackNameDisplay = document.getElementById('track-name');
const artistNameDisplay = document.getElementById('artist-name');
const playlistCountDisplay = document.getElementById('playlist-count');

const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');

const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const btnClear = document.getElementById('btn-clear');

const searchInput = document.getElementById('search-input');
const volumeControl = document.getElementById('volume-control');

let playlist = [];
let currentIndex = -1;
let isShuffle = JSON.parse(localStorage.getItem('sonic_shuffle')) || false;
let isRepeat = JSON.parse(localStorage.getItem('sonic_repeat')) || false;
let currentFilter = '';

const supportedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus', '.webm'];

init();

function init() {
    audio.volume = parseFloat(localStorage.getItem('sonic_volume') ?? '1');
    volumeControl.value = audio.volume;

    btnShuffle.classList.toggle('text-[#1DB954]', isShuffle);
    btnRepeat.classList.toggle('text-[#1DB954]', isRepeat);

    updateTrackInfo();
    updatePlaylistCount();
    updatePlayPauseButton();
    toggleEmptyState();
}

fileInput.addEventListener('change', (e) => {
    handleSelection(e.target.files);
    fileInput.value = '';
});

folderInput.addEventListener('change', (e) => {
    handleSelection(e.target.files);
    folderInput.value = '';
});

searchInput.addEventListener('input', (e) => {
    currentFilter = e.target.value.trim().toLowerCase();
    renderPlaylist();
});

volumeControl.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    audio.volume = value;
    localStorage.setItem('sonic_volume', String(value));
});

btnPlayPause.addEventListener('click', togglePlayPause);
btnPrev.addEventListener('click', playPrevious);
btnNext.addEventListener('click', playNext);

btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    localStorage.setItem('sonic_shuffle', JSON.stringify(isShuffle));
    btnShuffle.classList.toggle('text-[#1DB954]', isShuffle);
});

btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat;
    localStorage.setItem('sonic_repeat', JSON.stringify(isRepeat));
    btnRepeat.classList.toggle('text-[#1DB954]', isRepeat);
});

btnClear.addEventListener('click', clearPlaylist);

progressContainer.addEventListener('click', (e) => {
    if (!audio.duration || isNaN(audio.duration)) return;

    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = ratio * audio.duration;
});

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('play', updatePlayPauseButton);
audio.addEventListener('pause', updatePlayPauseButton);

audio.addEventListener('ended', () => {
    if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
    }

    playNext();
});

document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName.toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea';

    if (e.code === 'Space' && !isTyping) {
        e.preventDefault();
        togglePlayPause();
    }

    if (e.code === 'ArrowRight' && !isTyping) {
        e.preventDefault();
        playNext();
    }

    if (e.code === 'ArrowLeft' && !isTyping) {
        e.preventDefault();
        playPrevious();
    }

    if (e.key.toLowerCase() === 'm' && !isTyping) {
        isShuffle = !isShuffle;
        localStorage.setItem('sonic_shuffle', JSON.stringify(isShuffle));
        btnShuffle.classList.toggle('text-[#1DB954]', isShuffle);
    }

    if (e.key.toLowerCase() === 'r' && !isTyping) {
        isRepeat = !isRepeat;
        localStorage.setItem('sonic_repeat', JSON.stringify(isRepeat));
        btnRepeat.classList.toggle('text-[#1DB954]', isRepeat);
    }
});

function isAudioFile(file) {
    const lowerName = file.name.toLowerCase();
    return (
        file.type.startsWith('audio/') ||
        supportedExtensions.some(ext => lowerName.endsWith(ext))
    );
}

function handleSelection(files) {
    const fileList = Array.from(files);
    const audioFiles = fileList.filter(isAudioFile);

    if (audioFiles.length === 0) return;

    const existingKeys = new Set(
        playlist.map(track => `${track.name.toLowerCase()}-${track.file?.size ?? 0}`)
    );

    for (const file of audioFiles) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const key = `${cleanName.toLowerCase()}-${file.size}`;

        if (existingKeys.has(key)) continue;

        playlist.push({
            id: crypto.randomUUID(),
            name: cleanName,
            url: URL.createObjectURL(file),
            file
        });

        existingKeys.add(key);
    }

    if (currentIndex === -1 && playlist.length > 0) {
        currentIndex = 0;
    }

    renderPlaylist();
    toggleEmptyState();
    updateTrackInfo();
    updatePlaylistCount();
}

function renderPlaylist() {
    playlistElement.innerHTML = '';

    const visibleTracks = playlist
        .map((track, originalIndex) => ({ track, originalIndex }))
        .filter(({ track }) => track.name.toLowerCase().includes(currentFilter));

    if (visibleTracks.length === 0 && playlist.length > 0) {
        playlistElement.classList.remove('hidden');
        emptyState.classList.add('hidden');

        const li = document.createElement('li');
        li.className = 'text-center py-10 text-gray-500 text-sm';
        li.textContent = 'No hay resultados para tu búsqueda';
        playlistElement.appendChild(li);
        return;
    }

    visibleTracks.forEach(({ track, originalIndex }) => {
        const li = document.createElement('li');
        li.className = `group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all hover:bg-[#282828] ${
            originalIndex === currentIndex ? 'active-track' : ''
        }`;

        const left = document.createElement('div');
        left.className = 'flex items-center gap-3 min-w-0 flex-1';
        left.innerHTML = `
            <div class="w-10 h-10 bg-[#222] flex items-center justify-center rounded shadow-lg text-xs text-gray-500 shrink-0">                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.9983 17C18.9862 19.175 18.8897 20.3529 18.1213 21.1213C17.2426 22 15.8284 22 13 22H11C8.17157 22 6.75736 22 5.87868 21.1213C5 20.2426 5 18.8284 5 16V8C5 5.17157 5 3.75736 5.87868 2.87868C6.75736 2 8.17157 2 11 2H13C15.8284 2 17.2426 2 18.1213 2.87868C19 3.75736 19 5.17157 19 8V13" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M19 19.5C19.4645 19.5 19.6968 19.5 19.8911 19.4692C20.9608 19.2998 21.7998 18.4608 21.9692 17.3911C22 17.1968 22 16.9645 22 16.5V7.5C22 7.0355 22 6.80325 21.9692 6.60891C21.7998 5.53918 20.9608 4.70021 19.8911 4.53078C19.6968 4.5 19.4645 4.5 19 4.5" stroke="#1C274C" stroke-width="1.5"/>
                    <path d="M13 14V11V8" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="11" cy="14" r="2" stroke="#1C274C" stroke-width="1.5"/>
                    <path d="M15 10C13.8954 10 13 9.10457 13 8" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M5 19.5C4.5355 19.5 4.30325 19.5 4.10891 19.4692C3.03918 19.2998 2.20021 18.4608 2.03078 17.3911C2 17.1968 2 16.9645 2 16.5V7.5C2 7.0355 2 6.80325 2.03078 6.60891C2.20021 5.53918 3.03918 4.70021 4.10891 4.53078C4.30325 4.5 4.5355 4.5 5 4.5" stroke="#1C274C" stroke-width="1.5"/>
                </svg></div>
            <div class="min-w-0">
                <p class="text-sm font-medium line-clamp-1 ${originalIndex === currentIndex ? 'text-[#1DB954]' : 'text-white'}">${escapeHtml(track.name)}</p>
                <p class="text-xs text-gray-400">Archivo local</p>
            </div>
        `;

        left.addEventListener('click', () => playSong(originalIndex));

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-2 ml-3';

        const playBtn = document.createElement('button');
        playBtn.className = 'text-xs text-gray-400 hover:text-white transition-colors';
        playBtn.title = 'Reproducir';
        playBtn.innerHTML = originalIndex === currentIndex && !audio.paused ? '⏸' : '▶';
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (originalIndex === currentIndex) {
                togglePlayPause();
            } else {
                playSong(originalIndex);
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-xs text-gray-500 hover:text-red-400 transition-colors';
        deleteBtn.title = 'Eliminar';
        deleteBtn.innerHTML = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrack(originalIndex);
        });

        actions.appendChild(playBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(left);
        li.appendChild(actions);
        playlistElement.appendChild(li);
    });

    playlistElement.classList.remove('hidden');
}

function playSong(index) {
    if (playlist.length === 0) return;
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    audio.src = playlist[index].url;

    audio.play()
        .then(() => {
            updateTrackInfo();
            updatePlayPauseButton();
            renderPlaylist();
        })
        .catch((err) => {
            console.error('No se pudo reproducir:', err);
        });
}

function togglePlayPause() {
    if (playlist.length === 0) return;

    if (currentIndex === -1) {
        playSong(0);
        return;
    }

    if (audio.paused) {
        audio.play().catch((err) => {
            console.error('No se pudo reproducir:', err);
        });
    } else {
        audio.pause();
    }

    updatePlayPauseButton();
    renderPlaylist();
}

function playNext() {
    if (playlist.length === 0) return;

    let nextIndex;

    if (isShuffle) {
        if (playlist.length === 1) {
            nextIndex = 0;
        } else {
            do {
                nextIndex = Math.floor(Math.random() * playlist.length);
            } while (nextIndex === currentIndex);
        }
    } else {
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playlist.length;
    }

    playSong(nextIndex);
}

function playPrevious() {
    if (playlist.length === 0) return;

    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    let prevIndex;

    if (isShuffle) {
        if (playlist.length === 1) {
            prevIndex = 0;
        } else {
            do {
                prevIndex = Math.floor(Math.random() * playlist.length);
            } while (prevIndex === currentIndex);
        }
    } else {
        prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1;
    }

    playSong(prevIndex);
}

function removeTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    const removed = playlist[index];
    URL.revokeObjectURL(removed.url);

    const wasCurrent = index === currentIndex;
    playlist.splice(index, 1);

    if (playlist.length === 0) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        currentIndex = -1;
        progressBar.style.width = '0%';
        currentTimeDisplay.textContent = '00:00';
        totalTimeDisplay.textContent = '00:00';
    } else if (wasCurrent) {
        const newIndex = Math.min(index, playlist.length - 1);
        currentIndex = newIndex;
        playSong(newIndex);
    } else if (index < currentIndex) {
        currentIndex--;
    }

    renderPlaylist();
    toggleEmptyState();
    updateTrackInfo();
    updatePlaylistCount();
}

function clearPlaylist() {
    playlist.forEach(track => URL.revokeObjectURL(track.url));
    playlist = [];
    currentIndex = -1;

    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    searchInput.value = '';
    currentFilter = '';

    progressBar.style.width = '0%';
    currentTimeDisplay.textContent = '00:00';
    totalTimeDisplay.textContent = '00:00';

    renderPlaylist();
    toggleEmptyState();
    updateTrackInfo();
    updatePlaylistCount();
    updatePlayPauseButton();
}

function updateProgress() {
    const current = audio.currentTime || 0;
    const total = audio.duration || 0;

    currentTimeDisplay.textContent = formatTime(current);
    totalTimeDisplay.textContent = formatTime(total);

    if (!total || isNaN(total)) {
        progressBar.style.width = '0%';
        return;
    }

    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;
}

function updateTrackInfo() {
    if (currentIndex === -1 || !playlist[currentIndex]) {
        trackNameDisplay.textContent = 'Selecciona una pista';
        artistNameDisplay.textContent = 'Sonic Pro - Reproductor local';
        return;
    }

    trackNameDisplay.textContent = playlist[currentIndex].name;
    artistNameDisplay.textContent = 'Archivo local';
}

function updatePlaylistCount() {
    const total = playlist.length;
    playlistCountDisplay.textContent = `${total} ${total === 1 ? 'canción' : 'canciones'}`;
}

function toggleEmptyState() {
    const hasTracks = playlist.length > 0;

    emptyState.classList.toggle('hidden', hasTracks);
    playlistElement.classList.toggle('hidden', !hasTracks);
}

function updatePlayPauseButton() {
    const isPlaying = !audio.paused && !!audio.src;

    btnPlayPause.innerHTML = isPlaying
        ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
        </svg>
        `
        : `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
        </svg>
        `;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
    playlist.forEach(track => URL.revokeObjectURL(track.url));
});