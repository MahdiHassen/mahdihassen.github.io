// Dark mode functionality
(function() {
  'use strict';

  const body = document.body;
  const toggle = document.getElementById('dark-mode-toggle');

  // Check for saved preference in localStorage
  const savedMode = localStorage.getItem('dark-mode');

  // Apply dark mode based on saved preference
  if (savedMode === 'enabled') {
    body.classList.add('dark-mode');
    if (toggle) toggle.textContent = 'light mode';
  } else {
    body.classList.remove('dark-mode');
    if (toggle) toggle.textContent = 'dark mode';
  }

  // Toggle dark mode on click (only if toggle button exists)
  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();

      body.classList.toggle('dark-mode');
      const isDark = body.classList.contains('dark-mode');

      if (isDark) {
        localStorage.setItem('dark-mode', 'enabled');
        toggle.textContent = 'light mode';
      } else {
        localStorage.setItem('dark-mode', 'disabled');
        toggle.textContent = 'dark mode';
      }
    });
  }
})();
