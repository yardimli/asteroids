import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
	constructor () {
		super('MainScene');
	}
	
	preload () {
		// 1. Load Backgrounds
		this.load.image('galaxy', 'assets/background_01_parallax_01.png');
		this.load.image('stars', 'assets/background_01_parallax_02.png');
		this.load.image('planet1', 'assets/background_01_parallax_03.png');
		this.load.image('planet2', 'assets/background_01_parallax_04.png');
		this.load.image('overlay1', 'assets/background_01_parallax_05.png');
		this.load.image('overlay2', 'assets/background_01_parallax_06.png');
		
		// 2. Load Game Objects
		this.load.image('asteroid', 'assets/asteroid_01.png');
		this.load.image('ship', 'assets/DKO-api-X1.png');
	}
	
	create () {
		const worldSize = 10000;
		
		// Set the physics world and main camera boundaries to 10,000 x 10,000
		this.physics.world.setBounds(0, 0, worldSize, worldSize);
		this.cameras.main.setBounds(0, 0, worldSize, worldSize);
		
		const screenW = this.scale.width;
		const screenH = this.scale.height;
		const centerX = screenW / 2;
		const centerY = screenH / 2;
		
		// --- CAMERA SETUP ---
		// Create a new camera specifically for the backgrounds.
		// We do NOT set bounds or make it follow the ship, because everything inside it
		// will be fixed to the screen (scrollFactor=0) and manually positioned for perfect sync.
		this.bgCamera = this.cameras.add(0, 0, screenW, screenH);
		
		// Move bgCamera to the back of the camera list so it renders behind the main camera
		this.cameras.cameras.unshift(this.cameras.cameras.pop());
		
		// --- PARALLAX BACKGROUND SETUP ---
		this.bgGalaxy = this.add.tileSprite(centerX, centerY, screenW, screenH, 'galaxy').setOrigin(0.5).setScrollFactor(0).setDepth(0);
		this.bgStars = this.add.tileSprite(centerX, centerY, screenW, screenH, 'stars').setOrigin(0.5).setScrollFactor(0).setDepth(1);
		
		// --- PLANETS SETUP ---
		// Set scrollFactor to 0 so they are fixed to the screen.
		// We will manually calculate their screen position in update() based on the main camera's center.
		this.planet1 = this.add.image(0, 0, 'planet1').setScrollFactor(0).setDepth(4);
		this.planet2 = this.add.image(0, 0, 'planet2').setScrollFactor(0).setDepth(5);
		
		// Store their logical world positions for the parallax calculation
		this.planet1.worldX = 3000;
		this.planet1.worldY = 3000;
		this.planet2.worldX = 7000;
		this.planet2.worldY = 6000;
		
		// --- OVERLAYS SETUP ---
		this.bgOverlay1 = this.add.tileSprite(centerX, centerY, screenW, screenH, 'overlay1').setOrigin(0.5).setScrollFactor(0).setDepth(2);
		this.bgOverlay2 = this.add.tileSprite(centerX, centerY, screenW, screenH, 'overlay2').setOrigin(0.5).setScrollFactor(0).setDepth(3);
		
		this.bgOverlay1.setAlpha(0.3);
		this.bgOverlay2.setAlpha(0.3);
		
		// --- SPACESHIP SETUP ---
		this.ship = this.physics.add.sprite(worldSize / 2, worldSize / 2, 'ship');
		this.ship.setCollideWorldBounds(true);
		this.ship.setDepth(20); // Ensures ship renders above everything
		
		// --- SHIP MOVEMENT VARIABLES --- // New section
		this.ship.maxSpeed = 400; // Top flight speed in pixels per second // New line
		this.ship.acceleration = 300; // Acceleration in pixels per second squared // New line
		this.ship.deceleration = 300; // Deceleration in pixels per second squared // New line
		// 1 degree per 0.1 second = 10 degrees per second // New line
		this.ship.rotationSpeed = 10 * Phaser.Math.DEG_TO_RAD; // Rotation speed in radians per second // New line
		
		// Make the main camera follow the ship
		this.cameras.main.startFollow(this.ship);
		
		// --- ASTEROIDS SETUP ---
		this.asteroids = this.physics.add.group();
		
		for (let i = 0; i < 50; i++) {
			let x = Phaser.Math.Between(0, worldSize);
			let y = Phaser.Math.Between(0, worldSize);
			
			let asteroid = this.asteroids.create(x, y, 'asteroid');
			asteroid.setScale(Phaser.Math.FloatBetween(0.1, 0.3));
			asteroid.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
			asteroid.setAngularVelocity(Phaser.Math.Between(-80, 80));
			asteroid.setCollideWorldBounds(true);
			asteroid.setBounce(1);
			asteroid.setDepth(10); // Asteroids behind ship, but above backgrounds
		}
		
		// --- CAMERA IGNORE LISTS ---
		// Main camera ignores backgrounds and planets so they don't zoom 1:1 with the game objects
		this.cameras.main.ignore([this.bgGalaxy, this.bgStars, this.bgOverlay1, this.bgOverlay2, this.planet1, this.planet2]);
		
		// Background camera ignores ship and asteroids so they don't render twice
		this.bgCamera.ignore([this.ship, ...this.asteroids.getChildren()]);
		
		// --- SIMPLE RECTANGULAR COLLISION ---
		this.physics.add.collider(this.ship, this.asteroids, this.handleCollision, null, this);
		
		// --- INPUT: MOUSE CLICK TO MOVE ---
		this.input.on('pointerdown', (pointer) => {
			// Explicitly get world coordinates from the main camera to fix multi-camera offset issues // Modified line
			const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y); // Modified line
			const targetX = worldPoint.x; // Modified line
			const targetY = worldPoint.y; // Modified line
			
			// Store target to start moving and rotating towards it in update() // Modified line
			this.ship.target = { x: targetX, y: targetY }; // Modified line
			this.ship.lastDistance = undefined; // Modified line
		});
		
		// --- INPUT: MOUSE WHEEL TO ZOOM ---
		this.targetZoom = 1; // Starting size is the maximum zoom
		this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
			// deltaY > 0 is scroll down (zoom out), deltaY < 0 is scroll up (zoom in)
			this.targetZoom -= deltaY * 0.001;
			
			// Clamp zoom (1 is max zoom, 0.2 is an arbitrary min zoom limit)
			if (this.targetZoom > 1) this.targetZoom = 1;
			if (this.targetZoom < 0.2) this.targetZoom = 0.2;
		});
		
		// Handle Window Resizing
		this.scale.on('resize', (gameSize) => {
			const width = gameSize.width;
			const height = gameSize.height;
			
			// Update the background camera size
			this.bgCamera.setSize(width, height);
			
			// Keep the backgrounds centered when the window is resized
			this.bgGalaxy.setPosition(width / 2, height / 2);
			this.bgStars.setPosition(width / 2, height / 2);
			this.bgOverlay1.setPosition(width / 2, height / 2);
			this.bgOverlay2.setPosition(width / 2, height / 2);
		});
	}
	
	handleCollision (ship, asteroid) {
		ship.setVelocity(0, 0);
		ship.target = null; // Clear target on collision so it doesn't resume moving // New line
		ship.lastDistance = undefined; // Clear distance on collision // New line
		console.log('Crash!');
	}
	
	update (time, delta) { // Modified line: added time and delta for frame-independent movement
		// --- SHIP MOVEMENT LOGIC --- // Modified section
		if (this.ship.target) {
			const dx = this.ship.target.x - this.ship.x; // New line
			const dy = this.ship.target.y - this.ship.y; // New line
			const distance = Math.sqrt(dx * dx + dy * dy); // Modified line
			
			// Stop if close enough or if it overshot (distance is increasing)
			if (distance < 10 || (this.ship.lastDistance !== undefined && distance > this.ship.lastDistance)) {
				this.ship.setVelocity(0, 0);
				this.ship.target = null;
				this.ship.lastDistance = undefined;
			} else {
				this.ship.lastDistance = distance;
				
				// --- ROTATION LOGIC --- // New section
				const targetAngle = Math.atan2(dy, dx) + (Math.PI / 2); // New line
				// Wrap the angle difference to ensure the ship rotates the shortest way (-PI to PI) // New line
				const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - this.ship.rotation); // New line
				const maxRotation = this.ship.rotationSpeed * (delta / 1000); // New line
				
				if (Math.abs(angleDiff) <= maxRotation) { // New line
					this.ship.rotation = targetAngle; // New line
				} else { // New line
					this.ship.rotation += Math.sign(angleDiff) * maxRotation; // New line
				} // New line
				
				// --- ACCELERATION & DECELERATION LOGIC --- // New section
				// Calculate safe speed to allow deceleration before reaching target (kinematic equation: v = sqrt(2ad)) // New line
				const safeSpeed = Math.sqrt(2 * this.ship.deceleration * distance); // New line
				const targetSpeed = Math.min(this.ship.maxSpeed, safeSpeed); // New line
				
				let currentSpeed = this.ship.body.velocity.length(); // New line
				
				if (currentSpeed < targetSpeed) { // New line
					currentSpeed += this.ship.acceleration * (delta / 1000); // New line
					if (currentSpeed > targetSpeed) currentSpeed = targetSpeed; // New line
				} else if (currentSpeed > targetSpeed) { // New line
					currentSpeed -= this.ship.deceleration * (delta / 1000); // New line
					if (currentSpeed < targetSpeed) currentSpeed = targetSpeed; // New line
				} // New line
				
				// Apply velocity towards the target // New line
				const moveAngle = Math.atan2(dy, dx); // New line
				this.ship.setVelocity(Math.cos(moveAngle) * currentSpeed, Math.sin(moveAngle) * currentSpeed); // New line
			}
		}
		
		// --- ZOOM INTERPOLATION ---
		// Smoothly zoom the main camera (affects ship and asteroids)
		this.cameras.main.zoom += (this.targetZoom - this.cameras.main.zoom) * 0.1;
		
		// Background camera resizes much slower to simulate depth
		const bgZoom = 1 - (1 - this.cameras.main.zoom) * 0.1;
		this.bgCamera.setZoom(bgZoom);
		
		const screenW = this.scale.width;
		const screenH = this.scale.height;
		const screenCenterX = screenW / 2;
		const screenCenterY = screenH / 2;
		
		// Update tileSprite sizes to prevent black borders when bgCamera zooms out.
		const invBgZoom = 1 / bgZoom;
		this.bgGalaxy.setSize(screenW * invBgZoom, screenH * invBgZoom);
		this.bgStars.setSize(screenW * invBgZoom, screenH * invBgZoom);
		this.bgOverlay1.setSize(screenW * invBgZoom, screenH * invBgZoom);
		this.bgOverlay2.setSize(screenW * invBgZoom, screenH * invBgZoom);
		
		// --- PARALLAX TILE SCROLLING ---
		// Use main camera scroll for the parallax effect
		const camScrollX = this.cameras.main.scrollX;
		const camScrollY = this.cameras.main.scrollY;
		
		this.bgGalaxy.tilePositionX = camScrollX * 0.1;
		this.bgGalaxy.tilePositionY = camScrollY * 0.1;
		
		this.bgStars.tilePositionX = camScrollX * 0.2;
		this.bgStars.tilePositionY = camScrollY * 0.2;
		
		this.bgOverlay1.tilePositionX = camScrollX * 0.8;
		this.bgOverlay1.tilePositionY = camScrollY * 0.8;
		
		this.bgOverlay2.tilePositionX = camScrollX * 0.9;
		this.bgOverlay2.tilePositionY = camScrollY * 0.9;
		
		// --- PARALLAX PLANETS ---
		// We use the main camera's midPoint (center) to calculate the distance to the planet.
		// This ensures that when the ship is at 3000x3000, planet1 is exactly in the center of the screen.
		// Because it relies on the main camera's midPoint, it will stop moving exactly when the main camera hits the world bounds.
		const camCenterX = this.cameras.main.midPoint.x;
		const camCenterY = this.cameras.main.midPoint.y;
		
		this.planet1.x = screenCenterX + (this.planet1.worldX - camCenterX) * 0.3;
		this.planet1.y = screenCenterY + (this.planet1.worldY - camCenterY) * 0.3;
		
		this.planet2.x = screenCenterX + (this.planet2.worldX - camCenterX) * 0.5;
		this.planet2.y = screenCenterY + (this.planet2.worldY - camCenterY) * 0.5;
	}
}

// Phaser Configuration
const config = {
	type: Phaser.AUTO,
	scale: {
		mode: Phaser.Scale.RESIZE,
		parent: 'game-container',
		width: '100%',
		height: '100%'
	},
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 0 },
			debug: false
		}
	},
	scene: [MainScene]
};

// Start the Game
new Phaser.Game(config);
