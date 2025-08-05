document.getElementById('rsvp-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const data = {
        name: form.name.value.trim(),
        response: form.response.value
      };
      const res = await fetch('/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Thanks for your response!');
        form.reset();
      } else {
        alert('Oops, something went wrong.');
      }
    });