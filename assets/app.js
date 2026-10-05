'use strict';

/**
 * app.js - renders the active subdomain list from data/active.json.
 * No framework, no build step.
 */

(function () {
  var tbody = document.getElementById('domain-rows');
  var countEl = document.getElementById('domain-count');
  var searchEl = document.getElementById('search');

  if (!tbody) {
    return;
  }

  function setCount(value) {
    if (countEl) {
      countEl.textContent = String(value);
    }
  }

  function renderEmpty(message) {
    tbody.innerHTML = '';
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 2;
    cell.className = 'muted';
    cell.textContent = message;
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  function render(entries) {
    tbody.innerHTML = '';

    if (entries.length === 0) {
      renderEmpty('No subdomains match your filter.');
      return;
    }

    entries.forEach(function (entry) {
      var row = document.createElement('tr');

      var nameCell = document.createElement('td');
      var link = document.createElement('a');
      link.href = 'https://' + entry.subdomain;
      link.rel = 'noopener';
      link.textContent = entry.subdomain;
      nameCell.appendChild(link);

      var targetCell = document.createElement('td');
      targetCell.className = 'muted';
      targetCell.textContent = entry.target || '-';

      row.appendChild(nameCell);
      row.appendChild(targetCell);
      tbody.appendChild(row);
    });
  }

  fetch('data/active.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      var entries = data.entries || [];
      setCount(entries.length);
      render(entries);

      if (searchEl) {
        searchEl.addEventListener('input', function () {
          var term = searchEl.value.trim().toLowerCase();
          var filtered = entries.filter(function (entry) {
            return entry.subdomain.toLowerCase().indexOf(term) !== -1;
          });
          render(filtered);
        });
      }
    })
    .catch(function () {
      setCount('?');
      renderEmpty('Could not load data/active.json. Run "npm run build:index" first.');
    });
})();
