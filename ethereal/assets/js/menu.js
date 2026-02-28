document.addEventListener("DOMContentLoaded", () => {

    const menuToggle = document.getElementById("mobile-menu");
    const navList = document.querySelector(".nav-list");
    const dropdownToggle = document.querySelector(".dropdown-toggle");
    const dropdown = document.querySelector(".dropdown");

    if (menuToggle && navList) {
        menuToggle.addEventListener("click", () => {
            navList.classList.toggle("active");
        });
    }

    if (dropdownToggle && dropdown) {
        dropdownToggle.addEventListener("click", (e) => {
            e.preventDefault();
            dropdown.classList.toggle("active");
        });
    }

});
