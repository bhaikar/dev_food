// API Base URL - Automatically detect environment (local or deployed)
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

// DOM Elements
const checkInForm = document.getElementById('checkInForm');
const teamIdInput = document.getElementById('teamId');
const checkInBtn = document.getElementById('checkInBtn');
const messageBox = document.getElementById('message');
const checkedInCount = document.getElementById('checkedInCount');
const totalTeams = document.getElementById('totalTeams');
const pendingCount = document.getElementById('pendingCount');
const progress = document.querySelector('.progress-indicator');

// Load stats on page load
loadStats();

// Form submission
checkInForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const teamId = teamIdInput.value.trim().toUpperCase();

    if (!teamId) {
        showMessage('Please enter a Team ID', 'error');
        return;
    }

    await checkInTeam(teamId);
});

// Check-in team function
async function checkInTeam(teamId) {
    try {
        // Show loading state
        checkInBtn.classList.add('loading');
        checkInBtn.disabled = true;
        messageBox.style.display = 'none';
        progress.style.width = '30%';

        // API call to check-in
        const response = await fetch(`${API_BASE_URL}/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamId })
        });

        progress.style.width = '70%';
        const data = await response.json();

        // Reset button state
        checkInBtn.classList.remove('loading');
        checkInBtn.disabled = false;
        progress.style.width = '100%';

        if (response.ok && data.success) {
            // Success
            showMessage('Team checked in successfully!', 'success', data.team);
            teamIdInput.value = '';

            // Animate stats update
            await loadStats();
            animateStatUpdate();

            // Auto-clear message after 5 seconds
            setTimeout(() => {
                messageBox.style.display = 'none';
            }, 5000);
        } else {
            // Error
            showMessage(data.message || 'Check-in failed. Please try again.', 'error');
        }

        // Reset progress bar
        setTimeout(() => {
            progress.style.width = '0%';
        }, 500);

    } catch (error) {
        console.error('Error:', error);
        checkInBtn.classList.remove('loading');
        checkInBtn.disabled = false;
        progress.style.width = '0%';
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Load statistics with smooth animation
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`);
        const data = await response.json();

        if (response.ok && data.success) {
            animateValue(checkedInCount, parseInt(checkedInCount.textContent), data.stats.checkedIn, 500);
            animateValue(totalTeams, parseInt(totalTeams.textContent), data.stats.total, 500);
            animateValue(pendingCount, parseInt(pendingCount.textContent), data.stats.pending, 500);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Animate number changes
function animateValue(element, start, end, duration) {
    if (start === end) return;

    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Animate stat cards on update
function animateStatUpdate() {
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.transform = 'scale(1.1)';
            setTimeout(() => {
                item.style.transform = 'scale(1)';
            }, 200);
        }, index * 100);
    });
}

// Show message function
function showMessage(text, type, teamData = null) {
    messageBox.className = `message ${type}`;

    let content = `<p>${text}</p>`;

    if (type === 'success' && teamData) {
        content += `
         <div class="team-details">
             <p><strong>Team ID:</strong> ${teamData.teamId}</p>
             <p><strong>Team Name:</strong> ${teamData.teamName}</p>
             <p><strong>Check-in Time:</strong> ${new Date(teamData.checkInTime).toLocaleString()}</p>
         </div>
     `;
    }

    messageBox.innerHTML = content;
    messageBox.style.display = 'block';

    // Animate message appearance
    messageBox.style.animation = 'none';
    setTimeout(() => {
        messageBox.style.animation = 'slideIn 0.4s ease';
    }, 10);
}

// Auto-refresh stats every 10 seconds
setInterval(loadStats, 10000);

// Focus on input field on page load
window.addEventListener('load', () => {
    teamIdInput.focus();
});

// Input auto-format to uppercase
teamIdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Allow Enter key to submit from anywhere
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement !== teamIdInput) {
        teamIdInput.focus();
    }
});

// Add smooth transition to stat items
document.querySelectorAll('.stat-item').forEach(item => {
    item.style.transition = 'transform 0.2s ease';
});


// --- Three.js & H1 Animation Logic ---
let scene, camera, renderer, planeMesh;
let mouse = new THREE.Vector2();

const heroTitle = document.querySelector('#hero-title');
let currentTitleX = 0;

const vertexShader = `
            uniform float u_time;
            uniform vec2 u_mouse;
            varying float v_dist;

            void main() {
                vec3 pos = position;
                float dist = distance(vec2(pos.x, pos.y), u_mouse * 25.0);
                pos.z += sin(pos.x * 0.2 + u_time) * 2.0;
                pos.z += cos(pos.y * 0.2 + u_time) * 2.0;
                pos.z += sin(dist * 0.2 - u_time) * 3.0;
                
                v_dist = pos.z;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

const fragmentShader = `
            uniform float u_time;
            varying float v_dist;
            
            void main() {
                float opacity = abs(sin(v_dist * 0.1 - u_time * 0.5)) * 0.2 + 0.1;
                gl_FragColor = vec4(1.0, 0.0, 0.0, opacity); // Red color
            }
        `;

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 40;

    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg-canvas'),
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.PlaneGeometry(150, 150, 100, 100);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0.0 },
            u_mouse: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader,
        fragmentShader,
        wireframe: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });

    planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.rotation.x = -Math.PI / 2.5;
    scene.add(planeMesh);

    document.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    planeMesh.material.uniforms.u_time.value = elapsedTime;
    planeMesh.material.uniforms.u_mouse.value.lerp(mouse, 0.05);
    renderer.render(scene, camera);

    if (heroTitle) {
        const targetX = mouse.x * -25;
        currentTitleX += (targetX - currentTitleX) * 0.05;
        heroTitle.style.transform = `translateX(${currentTitleX}px)`;
    }
}

initThreeJS();


document.addEventListener('DOMContentLoaded', () => {

    // Get all logo elements ONCE when the page loads
    const logosTop = document.querySelectorAll('.logo-top');     // Your original logo.gif
    const logosBottom = document.querySelectorAll('.logo-bottom'); // Your new image

    // This variable tracks which logo is currently visible
    let isLogoOneVisible = true;

    // This function contains the logic to swap the logos
    const toggleLogoFade = () => {

        if (isLogoOneVisible) {
            // --- Fade OUT Logo 1 and Fade IN Logo 2 ---
            logosTop.forEach(logo => {
                logo.classList.remove('opacity-100');
                logo.classList.add('opacity-0');
            });
            logosBottom.forEach(logo => {
                logo.classList.remove('opacity-0');
                logo.classList.add('opacity-100');
            });

            // Update the state
            isLogoOneVisible = false;

        } else {
            // --- Fade IN Logo 1 and Fade OUT Logo 2 ---
            logosTop.forEach(logo => {
                logo.classList.remove('opacity-0');
                logo.classList.add('opacity-100');
            });
            logosBottom.forEach(logo => {
                logo.classList.remove('opacity-100');
                logo.classList.add('opacity-0');
            });

            // Update the state
            isLogoOneVisible = true;
        }
    };

    // Use setInterval to run the toggle function every 3000ms (3 seconds) REPEATEDLY
    setInterval(toggleLogoFade, 3000);

});