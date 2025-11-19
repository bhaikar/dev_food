// API Base URL - Automatically detect environment (local or deployed)
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

// DOM Elements
const claimForm = document.getElementById('claimForm');
const participantIdInput = document.getElementById('participantId');
const claimBtn = document.getElementById('claimBtn');
const messageBox = document.getElementById('message');
const breakfastCount = document.getElementById('breakfastCount');
const lunchCount = document.getElementById('lunchCount');
const dinnerCount = document.getElementById('dinnerCount');
const recentList = document.getElementById('recentList');

// Load stats and recent claims on page load
loadStats();
loadRecentClaims();

// Form submission
claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const participantId = participantIdInput.value.trim().toUpperCase();
    const mealType = document.querySelector('input[name="mealType"]:checked');
    
    if (!participantId) {
        showMessage('Please enter a Participant ID', 'error');
        return;
    }

    if (!mealType) {
        showMessage('Please select a meal type', 'error');
        return;
    }

    await claimMeal(participantId, mealType.value);
});

// Claim meal function
async function claimMeal(participantId, mealType) {
    try {
        // Show loading state
        claimBtn.classList.add('loading');
        claimBtn.disabled = true;
        messageBox.style.display = 'none';

        // API call to claim meal
        const response = await fetch(`${API_BASE_URL}/food/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participantId, mealType })
        });

        const data = await response.json();

        // Reset button state
        claimBtn.classList.remove('loading');
        claimBtn.disabled = false;

        if (response.ok && data.success) {
            // Success
            showMessage(data.message, 'success', data.participant);
            participantIdInput.value = '';
            
            // Uncheck radio buttons
            document.querySelectorAll('input[name="mealType"]').forEach(radio => {
                radio.checked = false;
            });
            
            loadStats();
            loadRecentClaims();
            
            // Auto-clear message after 5 seconds
            setTimeout(() => {
                messageBox.style.display = 'none';
            }, 5000);
        } else {
            // Error
            showMessage(data.message || 'Meal claim failed. Please try again.', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        claimBtn.classList.remove('loading');
        claimBtn.disabled = false;
        showMessage('Network error. Please check your connection.', 'error');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/food/stats`);
        const data = await response.json();

        if (response.ok && data.success) {
            breakfastCount.textContent = `${data.stats.breakfast.claimed}/${data.stats.total}`;
            lunchCount.textContent = `${data.stats.lunch.claimed}/${data.stats.total}`;
            dinnerCount.textContent = `${data.stats.dinner.claimed}/${data.stats.total}`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent claims
async function loadRecentClaims() {
    try {
        const response = await fetch(`${API_BASE_URL}/food/recent?limit=10`);
        const data = await response.json();

        if (response.ok && data.success && data.claims.length > 0) {
            recentList.innerHTML = data.claims.map(claim => `
                <div class="recent-item">
                    <strong>${claim.participantId}</strong> - ${claim.memberName} 
                    (${claim.teamName}) claimed 
                    <strong>${claim.mealType.toUpperCase()}</strong> 
                    at ${new Date(claim.claimedAt).toLocaleTimeString()}
                </div>
            `).join('');
        } else {
            recentList.innerHTML = '<p class="loading-text">No recent claims yet</p>';
        }
    } catch (error) {
        console.error('Error loading recent claims:', error);
        recentList.innerHTML = '<p class="loading-text">Error loading claims</p>';
    }
}

// Show message function
function showMessage(text, type, participantData = null) {
    messageBox.className = `message ${type}`;
    
    let content = `<p>${text}</p>`;
    
    if (type === 'success' && participantData) {
        content += `
            <div class="participant-details">
                <p><strong>Participant ID:</strong> ${participantData.participantId}</p>
                <p><strong>Name:</strong> ${participantData.memberName}</p>
                <p><strong>Team:</strong> ${participantData.teamName}</p>
                <p><strong>Meal:</strong> ${participantData.mealType.toUpperCase()}</p>
                <p><strong>Time:</strong> ${new Date(participantData.claimedAt).toLocaleString()}</p>
            </div>
        `;
    }
    
    messageBox.innerHTML = content;
    messageBox.style.display = 'block';
}

// Auto-refresh stats every 10 seconds
setInterval(loadStats, 10000);

// Auto-refresh recent claims every 15 seconds
setInterval(loadRecentClaims, 15000);

// Focus on input field on page load
window.addEventListener('load', () => {
    participantIdInput.focus();
});

// Allow Enter key to focus on input
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement !== participantIdInput) {
        participantIdInput.focus();
    }
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