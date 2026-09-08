export class InputHandler {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.mobileInput = document.getElementById('mobile-input');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Global keydown for typing
        document.addEventListener('keydown', (e) => {
            // Ignore input if in a modal or paused
            if (this.gameEngine.isPaused || this.gameEngine.isGameOver) {
                // Allow ESC to toggle pause
                if (e.key === 'Escape') this.gameEngine.togglePause();
                return;
            }
            
            // Allow ESC to toggle pause
            if (e.key === 'Escape') {
                this.gameEngine.togglePause();
                return;
            }
            
            // Fix character-doubling: ignore keydown if originating from the mobile input field
            if (e.target === this.mobileInput) return;
            
            // Ignore system keys
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            
            if (e.key.length === 1) {
                e.preventDefault();
                this.gameEngine.handleTyping(e.key);
            }
        });
        
        // Mobile Virtual Keyboard trigger
        const gameContainer = document.getElementById('game-container');
        gameContainer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (!this.gameEngine.isPaused && !this.gameEngine.isGameOver) {
                this.mobileInput.focus();
                document.getElementById('mobile-prompt').classList.remove('visible');
            }
        });
        
        // Show prompt if input loses focus on mobile
        this.mobileInput.addEventListener('blur', () => {
            if (!this.gameEngine.isPaused && !this.gameEngine.isGameOver) {
                document.getElementById('mobile-prompt').classList.add('visible');
            }
        });
        
        // Handle mobile input syncing
        this.mobileInput.addEventListener('input', (e) => {
            const val = this.mobileInput.value;
            if (val.length > 0) {
                const char = val.charAt(val.length - 1);
                this.gameEngine.handleTyping(char);
                this.mobileInput.value = '';
            }
        });
        
        // Modals shouldn't lose focus to canvas
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('pointerdown', e => e.stopPropagation());
        });
        
        // Security & Anti-Tamper: Disable context menu and drag
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('dragstart', e => e.preventDefault());
    }
}
