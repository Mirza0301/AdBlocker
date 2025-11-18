setInterval(function() {
    var skipButton = document.getElementById('.adskip-button, .ytp-ad-skip-button, .skip-ad-button');
    if (skipButton != undefined && skipButton.length > 0) {
        skipButton[0].click();
        console.log("Ad skipped");
    }
}, 1000);