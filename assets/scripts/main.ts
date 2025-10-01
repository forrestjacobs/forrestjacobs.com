const BASE = 26;
const observed = new Set<HTMLElement>();

/* @__PURE__ */
function getRatio(target: HTMLElement): number | undefined {
    if (target.classList.contains("youtube")) {
        return 16 / 9;
    }
    if (target.classList.contains("goat")) {
        const rect = target.querySelector("svg")?.viewBox.baseVal;
        if (rect) {
            return rect.width / rect.height;
        }
    }
}

const resizeObserver = new ResizeObserver((entries) => {
    for (const e of entries) {
        const target = (e.target as HTMLElement);
        const ratio = getRatio(target);
        if (ratio === undefined) {
            continue;
        }
        
        const width = e.contentBoxSize[0].inlineSize;
        const height = `${Math.ceil(width / ratio / BASE) * BASE}px`;
        if (target.style.height !== height) {
            target.style.height = height;
        }
    }
});

function handleMutation() {
    const set = new Set(document.querySelectorAll<HTMLElement>('.youtube, .goat'));
    for (const e of observed.difference(set)) {
        resizeObserver.unobserve(e);
        observed.delete(e);
    }
    for (const e of set.difference(observed)) {
        resizeObserver.observe(e);
        observed.add(e);
    }
}

const observer = new MutationObserver(handleMutation);
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
});
handleMutation();
