export const VILLES_KEY  = 'fdr_villes';
export const CLIENTS_KEY = 'fdr_clients';

function loadList(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveToList(key, value) {
    if (!value || !value.trim()) return;
    const val = value.trim().toUpperCase();
    const list = loadList(key);
    const idx = list.indexOf(val);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(val);
    if (list.length > 100) list.splice(100);
    localStorage.setItem(key, JSON.stringify(list));
}

export function memoriserValeurs(elements) {
    elements.forEach(item => {
        if (item.kind !== 'intervention') return;
        if (item.ville)  saveToList(VILLES_KEY,  item.ville);
        if (item.client) saveToList(CLIENTS_KEY, item.client);
    });
}

export function attachAutocomplete(inputEl, storageKey) {
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const dropdown = document.createElement('ul');
    dropdown.className = 'autocomplete-dropdown';
    wrapper.appendChild(dropdown);

    let activeIndex = -1;

    function showSuggestions() {
        const q = inputEl.value.toUpperCase();
        const list = loadList(storageKey);
        const matches = q.length === 0
            ? list.slice(0, 8)
            : list.filter(v => v.includes(q)).slice(0, 8);

        dropdown.innerHTML = '';
        activeIndex = -1;

        if (matches.length === 0) {
            dropdown.classList.remove('open');
            wrapper.classList.remove('open');
            return;
        }

        matches.forEach(val => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item';
            li.textContent = val;
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                inputEl.value = val;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                closeDropdown();
            });
            dropdown.appendChild(li);
        });

        dropdown.classList.add('open');
        wrapper.classList.add('open');
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        wrapper.classList.remove('open');
        activeIndex = -1;
    }

    function setActive(idx) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((li, i) => li.classList.toggle('active', i === idx));
        activeIndex = idx;
    }

    inputEl.addEventListener('focus', showSuggestions);

    inputEl.addEventListener('input', showSuggestions);

    inputEl.addEventListener('blur', () => setTimeout(closeDropdown, 150));

    inputEl.addEventListener('keydown', e => {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(Math.min(activeIndex + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(Math.max(activeIndex - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            items[activeIndex].dispatchEvent(new MouseEvent('mousedown'));
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });
}
