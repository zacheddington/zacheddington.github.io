document.addEventListener('DOMContentLoaded', function() {
    // Load the menu
    fetch('../html/menu.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('hamburger-menu').innerHTML = html;

            // Remove current page link from menu
            const path = window.location.pathname.split("/").filter(Boolean);
            let pageKey = '';
            if (path.includes('welcome')) pageKey = 'welcome';
            else if (path.includes('enter_eeg')) pageKey = 'enter_eeg';
            else if (path.includes('view_eeg')) pageKey = 'view_eeg';
            else if (path.includes('profile')) pageKey = 'profile';

            document.querySelectorAll('.side-menu a[data-page]').forEach(link => {
                if (link.getAttribute('data-page') === pageKey) {
                    link.parentElement.style.display = 'none';
                }
            });

            // Hamburger menu logic
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            const sideMenu = document.getElementById('sideMenu');
            const logoutLink = document.getElementById('logoutLink');

            if (hamburgerBtn && sideMenu) {
                hamburgerBtn.onclick = function() {
                    sideMenu.classList.toggle('open');
                    hamburgerBtn.classList.toggle('open'); // Toggle the open class for color flip
                };
            }

            document.querySelectorAll('.side-menu a').forEach(link => {
                link.addEventListener('click', function(e) {
                    const href = link.getAttribute('href');
                    if (href && href !== '#') {
                        e.preventDefault();
                        sideMenu.classList.remove('open');
                        hamburgerBtn.classList.remove('open'); // Remove open class when closing
                        document.body.classList.add('fade-out');
                        setTimeout(() => {
                            window.location.href = href;
                        }, 450);
                    }
                });
            });

            if (logoutLink) {
                logoutLink.onclick = function(e) {
                    e.preventDefault();
                    document.body.classList.add('fade-out');
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 450);
                };
            }

            // Close side menu when clicking outside
            document.addEventListener('click', function(event) {
                const sideMenu = document.getElementById('sideMenu');
                const hamburgerBtn = document.getElementById('hamburgerBtn');
                if (
                    sideMenu &&
                    hamburgerBtn &&
                    sideMenu.classList.contains('open') &&
                    !sideMenu.contains(event.target) &&
                    !hamburgerBtn.contains(event.target)
                ) {
                    sideMenu.classList.remove('open');
                    hamburgerBtn.classList.remove('open');
                }
            });
        });

    // Fade-out for Go links
    document.querySelectorAll('.fade-nav').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = href;
                }, 450);
            }
        });
    });

    // Handle EEG form submission if present
    const eegForm = document.querySelector('.eeg-form');
    if (eegForm) {
        eegForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const who = 'PlaceholderUser'; // Replace with actual logged-in user logic
            if (!document.getElementById('firstName').value || !document.getElementById('lastName').value) {
                alert('Please fill in all required fields.');
                return;
            }
            const data = {
                firstName: document.getElementById('firstName').value,
                middleName: document.getElementById('middleName').value,
                lastName: document.getElementById('lastName').value,
                who: who, // Use the placeholder or actual logged-in user
                //who: document.getElementById('who').value,
                datewhen: new Date().toISOString()
            };
            const response = await fetch('http://localhost:3001/api/eeg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                alert('Data submitted successfully!');
                e.target.reset();
            } else {
                alert('There was an error submitting the data.');
            }
        });
    }

    // Login form handler for 
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Add authentication logic here
            // For now, just redirect to html/welcome.html
            document.body.classList.add('fade-out');
            setTimeout(() => {
                window.location.href = "welcome/";
            }, 450);
        });
    }
});