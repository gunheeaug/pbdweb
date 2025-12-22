// PBD LLC - Interactive Scripts

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initScrollAnimations();
    initCursorEffects();
    initParallax();
    initSmoothScroll();
});

// === Scroll-based Reveal Animations ===
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add animation classes to elements
    const animatedElements = document.querySelectorAll(
        '.hero-badge, .hero-title .title-line, .hero-subtitle, .hero-cta, ' +
        '.section-header, .app-card, .stat, .about-text, .feature-card'
    );

    animatedElements.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
        observer.observe(el);
    });

    // Add revealed class styles
    const style = document.createElement('style');
    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Trigger initial animations for hero
    setTimeout(() => {
        document.querySelectorAll('.hero-badge, .hero-title .title-line, .hero-subtitle, .hero-cta')
            .forEach(el => el.classList.add('revealed'));
    }, 100);
}

// === Custom Cursor Effects ===
function initCursorEffects() {
    // Only on desktop
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
    document.body.appendChild(cursor);

    const style = document.createElement('style');
    style.textContent = `
        .custom-cursor {
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            mix-blend-mode: difference;
        }
        .cursor-dot {
            position: absolute;
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.1s ease;
        }
        .cursor-ring {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.15s ease;
        }
        .cursor-hover .cursor-ring {
            width: 60px;
            height: 60px;
            border-color: rgba(99, 102, 241, 0.8);
        }
        .cursor-hover .cursor-dot {
            transform: translate(-50%, -50%) scale(1.5);
            background: var(--accent-primary);
        }
        body { cursor: none; }
        a, button { cursor: none; }
    `;
    document.head.appendChild(style);

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        requestAnimationFrame(animate);
    }
    animate();

    // Hover effects
    const interactiveElements = document.querySelectorAll('a, button, .app-card');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
}

// === Parallax Effects ===
function initParallax() {
    const orbs = document.querySelectorAll('.gradient-orb');
    
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 15;
            orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });

    // Parallax on scroll
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const cube = document.querySelector('.floating-cube');
        
        if (cube) {
            cube.style.transform = `translateY(${scrolled * 0.1}px)`;
        }
    });
}

// === Smooth Scroll ===
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// === 3D Card Tilt Effect ===
document.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// === Navbar Background on Scroll ===
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.style.background = 'rgba(10, 10, 11, 0.95)';
    } else {
        navbar.style.background = 'rgba(10, 10, 11, 0.8)';
    }
    
    lastScroll = currentScroll;
});


