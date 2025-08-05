document
  .getElementById('rsvp-form')
  .addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      response: form.response.value
    };
    try {
      const res = await fetch('/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Thanks for your response!');
        form.reset();
      } else {
        console.error('Server error:', res.status, await res.text());
        alert('Something went wrong. Check console for details.');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error—make sure your backend is running on port 3000.');
    }
  });
