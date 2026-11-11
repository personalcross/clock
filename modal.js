document.addEventListener("DOMContentLoaded", () => {

    const modalElement = document.getElementById("settings-modal");
    const openButton = document.getElementById("open-settings");

    if (!modalElement || !openButton || !window.M) return;

    M.Modal.init(modalElement, {
        dismissible: true,
        opacity: 0.5,
        inDuration: 200,
        outDuration: 150
    });

    const modalInstance = M.Modal.getInstance(modalElement);

    openButton.addEventListener("click", () => {
        modalInstance.open();
    });

});
