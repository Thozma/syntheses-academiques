async function handleVote(fileId, type) {
  const votes = JSON.parse(localStorage.getItem('votes')) || {};
  const currentVote = votes[fileId];

  if (currentVote === type) return;

  try {
    const response = await fetch('/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fileId, vote: type })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const upSpan = document.getElementById(`up_${fileId}`);
    const downSpan = document.getElementById(`down_${fileId}`);

    // n'affiche que si >0
    upSpan.textContent = result.likes > 0 ? result.likes : '';
    downSpan.textContent = result.dislikes > 0 ? result.dislikes : '';

    votes[fileId] = type;
    localStorage.setItem('votes', JSON.stringify(votes));
  } catch (err) {
    console.error('Erreur vote:', err);
    alert('Erreur lors du vote');
  }
}
