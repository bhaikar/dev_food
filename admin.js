// API Base URL - Update this with your backend URL
const API_BASE_URL = 'https://dev-hack.onrender.com/api';

let allTeams = [];

// Load all data on page load
window.addEventListener('load', () => {
    loadAllData();
});

// Load all data (stats + teams)
async function loadAllData() {
    await loadStats();
    await loadTeams();
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`);
        const data = await response.json();

        if (response.ok && data.success) {
            document.getElementById('totalTeams').textContent = data.stats.total;
            document.getElementById('checkedInCount').textContent = data.stats.checkedIn;
            document.getElementById('pendingCount').textContent = data.stats.pending;
            
            const rate = data.stats.total > 0 
                ? Math.round((data.stats.checkedIn / data.stats.total) * 100)
                : 0;
            document.getElementById('attendanceRate').textContent = rate + '%';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load all teams
async function loadTeams() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/all-teams`);
        const data = await response.json();

        if (response.ok && data.success) {
            allTeams = data.teams;
            renderTeams(allTeams);
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        document.getElementById('teamsTableBody').innerHTML = `
            <tr><td colspan="7" style="text-align: center; color: #dc2626;">
                Error loading teams. Please refresh.
            </td></tr>
        `;
    }
}

// Render teams table
function renderTeams(teams) {
    const tbody = document.getElementById('teamsTableBody');
    
    if (teams.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" style="text-align: center; color: #888;">
                No teams found
            </td></tr>
        `;
        return;
    }

    tbody.innerHTML = teams.map((team, index) => {
        // Ensure isCheckedIn is a boolean
        const checkedIn = team.isCheckedIn === true || team.isCheckedIn === 'true';
        
        // Format members list (vertical)
        let membersList = '-';
        if (team.members && team.members.length > 0) {
            membersList = team.members.map((member, idx) => 
                `<div class="member-item">${idx + 1}. ${member}</div>`
            ).join('');
        }
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${team.teamId}</td>
            <td>${team.teamName}</td>
            <td class="members-cell">${membersList}</td>
            <td>
                <span class="status-badge ${checkedIn ? 'status-checked-in' : 'status-pending'}">
                    ${checkedIn ? '✓ Checked In' : '⏳ Pending'}
                </span>
            </td>
            <td>${team.checkInTime ? new Date(team.checkInTime).toLocaleString() : '-'}</td>
            <td>
                ${checkedIn
                    ? `<button class="action-btn undo" onclick="undoCheckIn('${team.teamId}')">Undo</button>`
                    : `<button class="action-btn" onclick="manualCheckIn('${team.teamId}')">Check In</button>`
                }
            </td>
        </tr>
    `}).join('');
}

// Filter teams based on search
function filterTeams() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allTeams.filter(team => 
        team.teamId.toLowerCase().includes(searchTerm) ||
        team.teamName.toLowerCase().includes(searchTerm)
    );
    renderTeams(filtered);
}

// Manual check-in form
document.getElementById('manualCheckInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamId = document.getElementById('manualTeamId').value.trim().toUpperCase();
    await manualCheckIn(teamId);
    document.getElementById('manualTeamId').value = '';
});

// Manual check-in function
async function manualCheckIn(teamId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/manual-checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage('manualMessage', 'Team checked in successfully!', 'success');
            await loadAllData();
        } else {
            showMessage('manualMessage', data.message || 'Check-in failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('manualMessage', 'Network error', 'error');
    }
}

// Undo check-in
async function undoCheckIn(teamId) {
    if (!confirm(`Are you sure you want to undo check-in for ${teamId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/undo-checkin/${teamId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            await loadAllData();
        } else {
            alert(data.message || 'Failed to undo check-in');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error');
    }
}

// Export to Excel
async function exportToExcel() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/export`);
        
        if (!response.ok) {
            const data = await response.json();
            alert(data.message || 'Failed to export data');
            return;
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HACK_MCE_5.0_CheckedIn_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting:', error);
        alert('Failed to export data');
    }
}

// Show message
function showMessage(elementId, text, type) {
    const messageBox = document.getElementById(elementId);
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