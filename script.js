document.addEventListener('DOMContentLoaded', () => {
    const donorsTableBody = document.querySelector('#donors-table tbody');
    const inventoryTableBody = document.querySelector('#inventory-table tbody');
    const donorForm = document.getElementById('donor-form');
    const formMessage = document.getElementById('form-message');
    const loadingOverlay = document.getElementById('loading');
    const bloodInventoryChartCtx = document.getElementById('bloodInventoryChart').getContext('2d');
    let bloodInventoryChart;

    // Show loading overlay
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    // Fetch and display donors
    async function loadDonors() {
        showLoading();
        const response = await fetch('/api/donors');
        const donors = await response.json();
        donorsTableBody.innerHTML = '';
        donors.forEach(donor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${donor.name}</td>
                <td>${donor.blood_type}</td>
                <td>${donor.quantity}</td>
                <td><button class="delete-btn" data-id="${donor.id}">Delete</button></td>
            `;
            donorsTableBody.appendChild(row);
        });
        attachDeleteEventListeners();
        hideLoading();
    }

    // Attach event listeners to delete buttons
    function attachDeleteEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const donorId = button.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this donor?')) {
                    showLoading();
                    const response = await fetch(`/api/donors/${donorId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        await loadDonors();
                        await loadInventory();
                        updateChart();
                    } else {
                        alert('Failed to delete donor.');
                    }
                    hideLoading();
                }
            });
        });
    }

    // Fetch and display blood inventory
    async function loadInventory() {
        showLoading();
        const response = await fetch('/api/blood_inventory');
        const inventory = await response.json();
        inventoryTableBody.innerHTML = '';
        for (const [bloodType, quantity] of Object.entries(inventory)) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bloodType}</td>
                <td>${quantity}</td>
            `;
            inventoryTableBody.appendChild(row);
        }
        updateChart(inventory);
        hideLoading();
    }

    // Handle form submission
    donorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';
        const name = document.getElementById('name').value.trim();
        const blood_type = document.getElementById('blood_type').value;
        const quantity = parseInt(document.getElementById('quantity').value);

        if (!name || !blood_type || quantity <= 0) {
            formMessage.textContent = 'Please fill all fields correctly.';
            formMessage.style.color = '#ff6f61';
            return;
        }

        showLoading();
        const response = await fetch('/api/donors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, blood_type, quantity })
        });

        if (response.ok) {
            formMessage.textContent = 'Donor added successfully!';
            formMessage.style.color = '#4caf50';
            donorForm.reset();
            await loadDonors();
            await loadInventory();
        } else {
            const errorData = await response.json();
            formMessage.textContent = errorData.error || 'Error adding donor.';
            formMessage.style.color = '#ff6f61';
        }
        hideLoading();
    });

    // Animate new entries in donors table
    function animateNewEntry() {
        const rows = donorsTableBody.querySelectorAll('tr');
        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            lastRow.classList.add('new-entry');
            setTimeout(() => {
                lastRow.classList.remove('new-entry');
            }, 2000);
        }
    }

    // Initialize or update the pie chart
    function updateChart(inventoryData) {
        if (!inventoryData) return;
        const labels = Object.keys(inventoryData);
        const data = Object.values(inventoryData);
        const backgroundColors = [
            '#e74c3c', '#c0392b', '#e67e22', '#d35400',
            '#f1c40f', '#f39c12', '#2ecc71', '#27ae60'
        ];

        if (bloodInventoryChart) {
            bloodInventoryChart.data.labels = labels;
            bloodInventoryChart.data.datasets[0].data = data;
            bloodInventoryChart.update();
        } else {
            bloodInventoryChart = new Chart(bloodInventoryChartCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 2000,
                        easing: 'easeOutBounce'
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#b30000',
                                padding: 20,
                                boxWidth: 20,
                                boxHeight: 20,
                                textAlign: 'center',
                                usePointStyle: true,
                                pointStyle: 'circle',
                                pointStyleWidth: 15,
                                pointStyleHeight: 15
                            }
                        },
                        title: {
                            display: true,
                            text: 'Blood Inventory Distribution',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            color: '#b30000',
                            padding: {
                                top: 10,
                                bottom: 30
                            }
                        }
                    }
                }
            });
        }
    }

    // Initial load
    loadDonors();
    loadInventory();
});
