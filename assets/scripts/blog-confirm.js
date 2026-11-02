/* The token stays in the URL fragment until this page loads; it is never sent on a GET. */
const WORKER_URL = 'https://auri-subs-v2.auri-e60.workers.dev';
const title = document.getElementById('confirmTitle');
const message = document.getElementById('confirmMessage');
const button = document.getElementById('confirmButton');
const status = document.getElementById('confirmStatus');
const year = document.getElementById('y');

if (year) year.textContent = new Date().getFullYear();

const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
if (window.location.hash) {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
  title.textContent = 'This link is incomplete.';
  message.textContent = 'Return to the blog and request a new confirmation email.';
} else {
  button.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Confirming…';
    status.textContent = '';
    status.classList.remove('error');

    try {
      const response = await fetch(`${WORKER_URL}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 410) {
          title.textContent = 'This link has expired.';
          message.textContent = 'Return to the blog and request a new confirmation email.';
          button.hidden = true;
          return;
        }
        throw new Error(result.error || 'confirmation_failed');
      }

      title.textContent = result.action === 'subscribe' ? 'Welcome to the family!' : 'You’re unsubscribed.';
      message.textContent = result.action === 'subscribe'
        ? 'You’ll get notified when new blog posts go up. Stay cozy!'
        : 'You won’t receive future blog updates. You’re welcome back anytime.';
      button.hidden = true;
    } catch (error) {
      console.error('Blog confirmation failed:', error);
      status.textContent = 'Could not confirm right now. Please try again.';
      status.classList.add('error');
      button.disabled = false;
      button.textContent = 'Try again';
    }
  });
}
