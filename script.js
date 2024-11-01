// Konfigurasi partikel animasi hati
var settings = {
    particles: {
        length: 500, // Jumlah partikel
        duration: 2, // Durasi partikel dalam detik
        velocity: 100, // Kecepatan partikel dalam piksel per detik
        effect: -0.75, // Efek partikel (0 = tidak ada efek, -1 = reverse, 1 = normal)
        size: 30, // Ukuran partikel dalam piksel
    },
};

// Polyfill untuk requestAnimationFrame
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
            || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

// Kelas Point untuk mengelola posisi partikel
class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Point(this.x, this.y);
    }

    length(length) {
        if (typeof length === 'undefined') return Math.sqrt(this.x * this.x + this.y * this.y);
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    }

    normalize() {
        var len = this.length();
        this.x /= len;
        this.y /= len;
        return this;
    }
}

// Kelas Particle untuk partikel animasi
class Particle {
    constructor() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }

    initialize(x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    }

    update(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    }

    draw(context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }
        var size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    }
}

// Pool untuk mengelola partikel
class ParticlePool {
    constructor(length) {
        this.particles = new Array(length).fill().map(() => new Particle());
        this.firstActive = 0;
        this.firstFree = 0;
        this.duration = settings.particles.duration;
    }

    add(x, y, dx, dy) {
        this.particles[this.firstFree].initialize(x, y, dx, dy);
        this.firstFree = (this.firstFree + 1) % this.particles.length;
        if (this.firstActive === this.firstFree) {
            this.firstActive = (this.firstActive + 1) % this.particles.length;
        }
    }

    update(deltaTime) {
        let i;
        if (this.firstActive < this.firstFree) {
            for (i = this.firstActive; i < this.firstFree; i++) {
                this.particles[i].update(deltaTime);
            }
        } else {
            for (i = this.firstActive; i < this.particles.length; i++) {
                this.particles[i].update(deltaTime);
            }
            for (i = 0; i < this.firstFree; i++) {
                this.particles[i].update(deltaTime);
            }
        }

        while (this.particles[this.firstActive].age >= this.duration && this.firstActive !== this.firstFree) {
            this.firstActive = (this.firstActive + 1) % this.particles.length;
        }
    }

    draw(context, image) {
        if (this.firstActive < this.firstFree) {
            for (let i = this.firstActive; i < this.firstFree; i++) {
                this.particles[i].draw(context, image);
            }
        } else {
            for (let i = this.firstActive; i < this.particles.length; i++) {
                this.particles[i].draw(context, image);
            }
            for (let i = 0; i < this.firstFree; i++) {
                this.particles[i].draw(context, image);
            }
        }
    }
}

// Animasi hati
(function(canvas) {
    const context = canvas.getContext('2d');
    const particles = new ParticlePool(settings.particles.length);
    const particleRate = settings.particles.length / settings.particles.duration;
    let time;

    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }

    const image = (() => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;

        function to(t) {
            const point = pointOnHeart(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
            return point;
        }

        context.beginPath();
        let t = -Math.PI;
        let point = to(t);
        context.moveTo(point.x, point.y);

        while (t < Math.PI) {
            t += 0.01;
            point = to(t);
            context.lineTo(point.x, point.y);
        }

        context.closePath();
        context.fillStyle = '#ea80b0';
        context.fill();

        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    })();

    function render() {
        requestAnimationFrame(render);

        const newTime = Date.now() / 1000;
        const deltaTime = newTime - (time || newTime);
        time = newTime;

        context.clearRect(0, 0, canvas.width, canvas.height);

        const amount = particleRate * deltaTime;
        for (let i = 0; i < amount; i++) {
            const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            const dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }

        particles.update(deltaTime);
        particles.draw(context, image);
    }

    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.onresize = onResize;

    setTimeout(() => {
        onResize();
        render();
    }, 10);
})(document.getElementById('pinkboard'));

// Daftar kata untuk teks berjatuhan
const fallingWords = ["luvs", "bub", "panda", "darling", "boo", "hubby", "my lion king","babe"];

// Fungsi untuk membuat teks jatuh secara acak
function createFallingText() {
    const fallingText = document.createElement('div');
    fallingText.className = 'falling-text';
    
    // Pilih kata acak dari fallingWords
    fallingText.textContent = fallingWords[Math.floor(Math.random() * fallingWords.length)];
    
    // Tentukan posisi horizontal acak dan durasi animasi
    fallingText.style.left = Math.random() * window.innerWidth + 'px';
    fallingText.style.animationDuration = (2 + Math.random() * 3) + 's';
    
    // Tambahkan elemen teks ke dalam body
    document.body.appendChild(fallingText);

    // Hapus elemen setelah animasi selesai
    fallingText.addEventListener('animationend', () => {
        document.body.removeChild(fallingText);
    });
}

// Interval untuk membuat teks jatuh secara berkala
setInterval(createFallingText, 300);


setInterval(createFallingText, 300);
