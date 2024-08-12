document.addEventListener("DOMContentLoaded", function() {
    const containers = document.querySelectorAll(".product-image-container");

    containers.forEach(container => {
        const image = container.querySelector("img");

        container.addEventListener("mousemove", function(e) {
            const { left, top, width, height } = container.getBoundingClientRect();
            const x = (e.clientX - left) / width * 100;
            const y = (e.clientY - top) / height * 100;
            image.style.transformOrigin = `${x}% ${y}%`;
            image.style.transform = "scale(1.5)";
        });

        container.addEventListener("mouseleave", function() {
            image.style.transformOrigin = "center center";
            image.style.transform = "scale(1)";
        });
    });
});
