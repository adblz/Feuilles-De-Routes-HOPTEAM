export const VILLES_KEY  = 'fdr_villes';
export const CLIENTS_KEY = 'fdr_clients';
const ASSOC_KEY = 'fdr_client_villes';

function loadList(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function loadAssoc() {
    try { return JSON.parse(localStorage.getItem(ASSOC_KEY) || '{}'); }
    catch { return {}; }
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

function deleteFromList(key, value) {
    const list = loadList(key).filter(v => v !== value);
    localStorage.setItem(key, JSON.stringify(list));
    if (key === CLIENTS_KEY) {
        const assoc = loadAssoc();
        delete assoc[value];
        localStorage.setItem(ASSOC_KEY, JSON.stringify(assoc));
    }
}

function saveAssociation(client, ville) {
    if (!client || !ville) return;
    const c = client.trim().toUpperCase();
    const v = ville.trim().toUpperCase();
    const assoc = loadAssoc();
    if (!assoc[c]) assoc[c] = [];
    if (!assoc[c].includes(v)) assoc[c].unshift(v);
    if (assoc[c].length > 20) assoc[c].splice(20);
    localStorage.setItem(ASSOC_KEY, JSON.stringify(assoc));
}

export function memoriserValeurs(elements) {
    elements.forEach(item => {
        if (item.kind !== 'intervention') return;
        if (item.ville)               saveToList(VILLES_KEY,  item.ville);
        if (item.client)              saveToList(CLIENTS_KEY, item.client);
        if (item.client && item.ville) saveAssociation(item.client, item.ville);
    });
}

export function attachAutocomplete(inputEl, storageKey, getContextValue) {
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-wrapper';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);

    const dropdown = document.createElement('ul');
    dropdown.className = 'autocomplete-dropdown';
    wrapper.appendChild(dropdown);

    let activeIndex = -1;

    function getSuggestions(q) {
        const list = loadList(storageKey);
        const matches = q.length === 0 ? list : list.filter(v => v.includes(q));

        if (storageKey === VILLES_KEY && getContextValue) {
            const ctx = getContextValue().trim().toUpperCase();
            if (ctx) {
                const linked = loadAssoc()[ctx] || [];
                const linkedMatches = matches.filter(v => linked.includes(v));
                const otherMatches  = matches.filter(v => !linked.includes(v));
                return [
                    ...linkedMatches.map(v => ({ value: v, linked: true })),
                    ...otherMatches.map(v =>  ({ value: v, linked: false }))
                ].slice(0, 8);
            }
        }

        return matches.slice(0, 8).map(v => ({ value: v, linked: false }));
    }

    function showSuggestions() {
        const q = inputEl.value.toUpperCase();
        const matches = getSuggestions(q);

        dropdown.innerHTML = '';
        activeIndex = -1;

        if (matches.length === 0) {
            dropdown.classList.remove('open');
            wrapper.classList.remove('open');
            return;
        }

        matches.forEach(({ value: val, linked }) => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item' + (linked ? ' autocomplete-item-linked' : '');

            const span = document.createElement('span');
            span.textContent = val;
            li.appendChild(span);

            const btn = document.createElement('button');
            btn.type    = 'button';
            btn.className = 'autocomplete-delete';
            btn.textContent = '×';
            btn.title = 'Supprimer';
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                deleteFromList(storageKey, val);
                showSuggestions();
            });
            li.appendChild(btn);

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
