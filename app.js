(() => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('about-text').textContent = data.about;
        })
        .catch(err => console.error('Error loading portfolio data:', err));
})();

(() => {
    const track = document.querySelector('.carousel-track');
    const cards = document.querySelectorAll('.carousel-card');
    const dotsContainer = document.querySelector('.carousel-dots');
    let currentIndex = 0;
    const intervalTime = 3000;

    // build dots dynamically based on number of cards
    cards.forEach((_, index) => {
        const dot = document.createElement('button');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentIndex = index;
            goToSlide(currentIndex);
        });
        dotsContainer.appendChild(dot);
    });
    const dots = document.querySelectorAll('.carousel-dots button');

    function goToSlide(index) {
        cards[index].scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
        });
        updateDots(index);
    }

    function updateDots(index) {
        dots.forEach(dot => dot.classList.remove('active'));
        dots[index].classList.add('active');
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % cards.length;
        goToSlide(currentIndex);
    }

    let autoplay = setInterval(nextSlide, intervalTime);

    // pause on hover
    track.addEventListener('mouseenter', () => clearInterval(autoplay));
    track.addEventListener('mouseleave', () => {
        autoplay = setInterval(nextSlide, intervalTime);
    });

    // pause briefly if user manually scrolls
    let isUserScrolling;
    track.addEventListener('scroll', () => {
        clearInterval(autoplay);
        clearTimeout(isUserScrolling);
        isUserScrolling = setTimeout(() => {
            autoplay = setInterval(nextSlide, intervalTime);
        }, 4000);
    });
})();

(() => {})()