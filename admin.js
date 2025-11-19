// API Base URL - Automatically detect environment (local or deployed)
const API_BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

let allTeams = [];

// Load all data on page load
window.addEventListener('load', () => {
    loadAllData();
});

// Load all data
async function loadAllData() {
    await loadStats();
    await loadTeams();
}

// Load statistics
async function loadStats() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/food/admin/stats`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('totalParticipants').textContent = data.stats.total;
            document.getElementById('breakfastClaimed').textContent = data.stats.breakfast.claimed;
            document.getElementById('breakfastPercent').textContent = data.stats.breakfast.percentage + '%';
            document.getElementById('lunchClaimed').textContent = data.stats.lunch.claimed;
            document.getElementById('lunchPercent').textContent = data.stats.lunch.percentage + '%';
            document.getElementById('dinnerClaimed').textContent = data.stats.dinner.claimed;
            document.getElementById('dinnerPercent').textContent = data.stats.dinner.percentage + '%';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load all teams
async function loadTeams() {
    const container = document.getElementById('teamsContainer');
    
    try {
        console.log('Fetching teams from:', `${API_BASE_URL}/food/admin/all-participants`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/food/admin/all-participants`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status, 'ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok && data.success && data.teams) {
            console.log('Successfully loaded teams:', data.teams.length);
            allTeams = data.teams;
            renderTeams(allTeams);
        } else {
            const errorMsg = data.message || 'Failed to load teams';
            console.error('API error:', errorMsg);
            container.innerHTML = `
                <div class="loading">
                    <p style="color: #dc2626;">Error: ${errorMsg}. Please refresh.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        const errorMsg = error.name === 'AbortError' ? 'Request timeout' : error.message;
        container.innerHTML = `
            <div class="loading">
                <p style="color: #dc2626;">Error loading teams: ${errorMsg}. Please refresh.</p>
            </div>
        `;
    }
}

// Render teams
function renderTeams(teams) {
    const container = document.getElementById('teamsContainer');
    
    if (teams.length === 0) {
        container.innerHTML = '<div class="loading"><p>No teams found</p></div>';
        return;
    }

    container.innerHTML = teams.map(team => `
        <div class="team-card" onclick="toggleTeam(this)">
            <div class="team-header">
                <div class="team-info">
                    <h3>${team.teamId} - ${team.teamName}</h3>
                    <p>${team.members.length} members</p>
                </div>
                <div class="team-toggle">▼</div>
            </div>
            <div class="team-members">
                ${team.members.map(member => `
                    <div class="member-row">
                        <div>
                            <div class="member-name">${member.memberName}</div>
                            <div class="member-id">${member.participantId}</div>
                        </div>
                        <div></div>
                        <div class="meal-status ${member.meals.breakfast.claimed ? 'claimed' : 'pending'}">
                            ${member.meals.breakfast.claimed ? '✓' : '-'}
                        </div>
                        <div class="meal-status ${member.meals.lunch.claimed ? 'claimed' : 'pending'}">
                            ${member.meals.lunch.claimed ? '✓' : '-'}
                        </div>
                        <div class="meal-status ${member.meals.dinner.claimed ? 'claimed' : 'pending'}">
                            ${member.meals.dinner.claimed ? '✓' : '-'}
                        </div>
                        <div class="member-actions">
                            <button onclick="event.stopPropagation(); showUnclaimOptions('${member.participantId}', ${JSON.stringify(member.meals).replace(/"/g, '&quot;')})">
                                Manage
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Toggle team card
function toggleTeam(card) {
    card.classList.toggle('expanded');
}

// Filter teams
function filterTeams() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allTeams.filter(team => 
        team.teamId.toLowerCase().includes(searchTerm) ||
        team.teamName.toLowerCase().includes(searchTerm)
    );
    renderTeams(filtered);
}

// Manual claim form
document.getElementById('manualClaimForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const participantId = document.getElementById('manualParticipantId').value.trim().toUpperCase();
    const mealType = document.getElementById('manualMealType').value;
    
    if (!participantId || !mealType) {
        showManualMessage('Please fill all fields', 'error');
        return;
    }
    
    await manualClaim(participantId, mealType);
});

// Manual claim function
async function manualClaim(participantId, mealType) {
    try {
        const response = await fetch(`${API_BASE_URL}/food/admin/manual-claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, mealType })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showManualMessage('Meal claimed successfully!', 'success');
            document.getElementById('manualParticipantId').value = '';
            document.getElementById('manualMealType').value = '';
            await loadAllData();
        } else {
            showManualMessage(data.message || 'Claim failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showManualMessage('Network error', 'error');
    }
}

// Show unclaim options
function showUnclaimOptions(participantId, meals) {
    const claimedMeals = [];
    if (meals.breakfast.claimed) claimedMeals.push('breakfast');
    if (meals.lunch.claimed) claimedMeals.push('lunch');
    if (meals.dinner.claimed) claimedMeals.push('dinner');

    if (claimedMeals.length === 0) {
        alert('No meals claimed yet for this participant');
        return;
    }

    const mealType = prompt(`Unclaim which meal for ${participantId}?\nClaimed meals: ${claimedMeals.join(', ')}\n\nEnter meal type (breakfast/lunch/dinner):`);
    
    if (mealType && claimedMeals.includes(mealType.toLowerCase())) {
        unclaimMeal(participantId, mealType.toLowerCase());
    }
}

// Unclaim meal
async function unclaimMeal(participantId, mealType) {
    if (!confirm(`Are you sure you want to unclaim ${mealType} for ${participantId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/food/admin/unclaim`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, mealType })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Meal unclaimed successfully');
            await loadAllData();
        } else {
            alert(data.message || 'Failed to unclaim');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error');
    }
}

// Export to Excel
async function exportToExcel() {
    try {
        const response = await fetch(`${API_BASE_URL}/food/admin/export`);
        
        if (!response.ok) {
            const data = await response.json();
            alert(data.message || 'Failed to export');
            return;
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HACK_MCE_5.0_Food_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting:', error);
        alert('Failed to export data');
    }
}

// Show manual message
function showManualMessage(text, type) {
    const messageBox = document.getElementById('manualMessage');
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
    messageBox.style.display = 'block';
    
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

// Auto-refresh every 15 seconds
setInterval(loadAllData, 15000);







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