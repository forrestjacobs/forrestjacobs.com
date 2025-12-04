+++
title = "Search"
sitemap.disable = true
params.showTitle = false
+++

<script src="/pagefind/pagefind-ui.js"></script>
<div id="search"></div>
<script>
window.addEventListener('DOMContentLoaded', (event) => {
    new PagefindUI({
        element: "#search",
        showSubResults: true,
        showImages: false,
        autofocus: true,
    });
});
</script>
