/**
 * Landing Page JavaScript
 * Handles copy-to-clipboard functionality and tab switching
 */

(function() {
    'use strict';

    // ===========================
    // Copy to Clipboard
    // ===========================

    /**
     * Copies text to clipboard and provides visual feedback
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function copyToClipboard(text, button) {
        // Use modern clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => showCopySuccess(button))
                .catch(() => fallbackCopy(text, button));
        } else {
            fallbackCopy(text, button);
        }
    }

    /**
     * Fallback copy method for older browsers
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element
     */
    function fallbackCopy(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopySuccess(button);
            } else {
                showCopyError(button);
            }
        } catch (err) {
            showCopyError(button);
        }
        
        document.body.removeChild(textArea);
    }

    /**
     * Shows success feedback on copy button
     * @param {HTMLElement} button - Button element
     */
    function showCopySuccess(button) {
        button.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
            button.classList.remove('copied');
        }, 2000);
    }

    /**
     * Shows error feedback (optional enhancement)
     * @param {HTMLElement} button - Button element
     */
    function showCopyError(button) {
        // Could add error state styling if desired
        console.error('Failed to copy to clipboard');
    }

    /**
     * Initialize all copy buttons
     */
    function initCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-btn');
        
        copyButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const command = this.getAttribute('data-command');
                if (command) {
                    copyToClipboard(command, this);
                }
            });
        });
    }

    // ===========================
    // Installation Tabs
    // ===========================

    /**
     * Switches between installation tabs
     * @param {string} tabId - ID of the tab to show
     */
    function switchTab(tabId) {
        // Hide all panels
        const panels = document.querySelectorAll('.install-panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.install-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected panel
        const selectedPanel = document.getElementById(tabId);
        if (selectedPanel) {
            selectedPanel.classList.add('active');
        }
        
        // Add active class to selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
    }

    /**
     * Initialize installation tabs
     */
    function initTabs() {
        const tabs = document.querySelectorAll('.install-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                if (tabId) {
                    switchTab(tabId);
                }
            });
        });
    }

    // ===========================
    // Smooth Scroll
    // ===========================

    /**
     * Initialize smooth scroll for anchor links
     */
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Skip empty anchors
                if (href === '#' || !href) {
                    return;
                }
                
                const target = document.querySelector(href);
                
                if (target) {
                    e.preventDefault();
                    
                    // Account for fixed navbar
                    const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ===========================
    // Scroll Animations (Optional)
    // ===========================

    /**
     * Adds fade-in animation on scroll for elements
     * Uses Intersection Observer API
     */
    function initScrollAnimations() {
        // Check if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            return;
        }

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with animation
        const animatedElements = document.querySelectorAll('.feature-card, .step, .demo-item');
        animatedElements.forEach(el => {
            observer.observe(el);
        });
    }

    // ===========================
    // Navbar Scroll Effect
    // ===========================

    /**
     * Adds shadow to navbar on scroll
     */
    function initNavbarScroll() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            } else {
                nav.style.boxShadow = 'none';
            }
            
            lastScroll = currentScroll;
        });
    }

    // ===========================
    // Image Modal / Lightbox
    // ===========================

    /**
     * Opens the image modal with the clicked image
     * @param {HTMLElement} container - The clicked demo-media-container element
     */
    window.openImageModal = function(container) {
        // Don't open if it's a placeholder
        if (container.classList.contains('demo-placeholder')) {
            return;
        }

        const img = container.querySelector('.demo-media');
        if (!img || !img.src) {
            return;
        }

        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('modal-image');
        const captionText = document.getElementById('modal-caption');

        if (modal && modalImg) {
            modal.classList.add('active');
            modalImg.src = img.src;
            modalImg.alt = img.alt;
            
            // Set caption from data attribute or alt text
            if (captionText) {
                captionText.textContent = img.getAttribute('data-caption') || img.alt;
            }

            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
    };

    /**
     * Closes the image modal
     */
    function closeImageModal() {
        const modal = document.getElementById('image-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Initialize image modal functionality
     */
    function initImageModal() {
        const modal = document.getElementById('image-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.modal-close');
        
        // Close button click
        if (closeBtn) {
            closeBtn.addEventListener('click', closeImageModal);
        }

        // Click outside image to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (modal.classList.contains('active')) {
                if (e.key === 'Escape') {
                    closeImageModal();
                }
            }
        });
    }

    // ===========================
    // Copyright Year
    // ===========================

    /**
     * Updates the copyright year to current year
     */
    function updateCopyrightYear() {
        const yearElement = document.getElementById('copyright-year');
        if (yearElement) {
            const currentYear = new Date().getFullYear();
            yearElement.textContent = currentYear;
        }
    }

    // ===========================
    // Initialization
    // ===========================

    /**
     * Initialize all functionality when DOM is ready
     */
    function init() {
        initCopyButtons();
        initTabs();
        initSmoothScroll();
        initScrollAnimations();
        initNavbarScroll();
        initImageModal();
        updateCopyrightYear();
        
        console.log('✓ Vale-at-Red-Hat Online landing page loaded');
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

