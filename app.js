const audio = document.getElementById('audio-element');
const fileInput = document.getElementById('file-upload');
const playlistElement = document.getElementById('playlist');
const trackNameDisplay = document.getElementById('track-name');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');

let playlist = [];
let currentIndex = -1;
let isShuffle = false;

// Cargar archivos
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        const track = {
            name: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
            url: URL.createObjectURL(file)
        };
        playlist.push(track);
    });

    renderPlaylist();
});

function renderPlaylist() {
    playlistElement.innerHTML = '';
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<p>${track.name}</p>`;
        li.dataset.index = index;
        if (index === currentIndex) li.classList.add('active');
        
        li.addEventListener('click', () => playSong(index));
        playlistElement.appendChild(li);
    });
}

function playSong(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    audio.src = playlist[index].url;
    audio.play();
    
    updateUI();
}

function updateUI() {
    trackNameDisplay.textContent = playlist[currentIndex].name;
    btnPlayPause.textContent = '⏸️';
    
    // Resaltar en lista
    document.querySelectorAll('.playlist li').forEach((li, idx) => {
        li.classList.toggle('active', idx === currentIndex);
    });

    // Scroll automático hacia la canción activa
    const activeItem = document.querySelector('.playlist li.active');
    if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Controles
btnPlayPause.addEventListener('click', () => {
    if (audio.paused) {
        if (currentIndex === -1 && playlist.length > 0) playSong(0);
        else audio.play();
        btnPlayPause.textContent = '⏸️';
    } else {
        audio.pause();
        btnPlayPause.textContent = '▶️';
    }
});

btnNext.addEventListener('click', () => playNext());

btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
});

function playNext() {
    if (playlist.length === 0) return;

    let nextIndex;
    if (isShuffle && playlist.length > 1) {
        do {
            nextIndex = Math.floor(Math.random() * playlist.length);
        } while (nextIndex === currentIndex); // Evitar repetir inmediata
    } else {
        nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    playSong(nextIndex);
}

// Auto-reproducción al terminar
audio.addEventListener('ended', playNext);