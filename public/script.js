document
  .getElementById('rsvp-form')
  .addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name:     form.name.value.trim(),
      response: form.response.value
    };

    try {
      const res = await fetch('/api/rsvp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
      });

      if (res.ok) {
        alert(`Thanks ${data.name}! Your response has been recorded.`);
        form.reset();
      } else {
        const errInfo = await res.json().catch(() => null);
        console.error('Server error:', res.status, errInfo);
        alert('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error—please check your connection and try again.');
    }
  });
