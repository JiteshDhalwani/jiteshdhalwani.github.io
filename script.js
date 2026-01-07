/**
 * Neural Network Animation Script
 * -------------------------------
 * This script creates an interactive particle system that simulates a neural network.
 * Nodes (particles) float randomly and connect with lines when they are close enough.
 * The system is interactive and responds to mouse movement by gently repelling particles.
 */

const canvas = document.getElementById('neuralNetworkCanvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions and configuration
let width, height;
let particles = [];
const particleCount = 80;        // Total number of nodes
const connectionDistance = 140;  // Max distance to draw a line between nodes
const mouseDistance = 300;       // Radius of mouse influence

/**
 * Resize Handler
 * Adjusts the canvas internal resolution to match its CSS display size
 * to ensure crisp rendering on all devices.
 */
function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    width = canvas.width;
    height = canvas.height;
    initParticles();
}

window.addEventListener('resize', resize);

// Mouse State Tracking
let mouse = { x: null, y: null };

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

/**
 * Particle Class
 * Represents a single node in the network.
 */
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Random velocity for organic movement
        this.vx = (Math.random() - 0.5) * 1.5; 
        this.vy = (Math.random() - 0.5) * 1.5; 
        this.size = Math.random() * 2 + 2;
    }

    update() {
        // Move particle
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off canvas edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Interactive Repulsion: Move away from mouse if close
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouseDistance) {
                // Calculate repulsion force inversely proportional to distance
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (mouseDistance - distance) / mouseDistance;
                
                // Apply force
                const directionX = forceDirectionX * force * 0.5;
                const directionY = forceDirectionY * force * 0.5;
                this.x -= directionX;
                this.y -= directionY;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
    }
}

/**
 * Initialize the particle system
 */
function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

/**
 * Animation Loop
 * Clears frame, draws connections, updates and draws particles.
 */
function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Draw connections (lines) between close particles
    // Nested loop checks every pair (optimization: j starts at i)
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
                ctx.beginPath();
                // Opacity decreases as distance increases for smooth fade
                ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / connectionDistance})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // 2. Update and draw individual particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Start the animation after a brief delay to ensure layout is stable
setTimeout(() => {
    resize();
    animate();
}, 100);
