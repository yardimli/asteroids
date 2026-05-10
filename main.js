import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
	constructor() {
		super('MainScene');
	}
	
	preload() {
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
	
	create() {
		const worldSize = 10000;
		
		// Set the physics world and main camera boundaries to 10,000 x 10,000
		this.physics.world.setBounds(0, 0, worldSize, worldSize);
		this.cameras.main.setBounds(0, 0, worldSize, worldSize);
		
		const screenW = this.scale.width;
		const screenH = this.scale.height;
		const centerX = screenW / 2;
		const centerY = screenH / 2;
		
		// --- CAMERA SETUP ---
		// Create a new camera specifically for the backgrounds
		this.bgCamera = this.cameras.add(0, 0, screenW, screenH);
		this.bgCamera.setBounds(0, 0, worldSize, worldSize);
		
		// Move bgCamera to the back of the camera list so it renders behind the main camera
		this.cameras.cameras.unshift(this.cameras.cameras.pop());
		
		// --- PARALLAX BACKGROUND SETUP ---
		// Changed origin to 0.5 and positioned at the center of the screen.
		// This ensures that when the camera zooms out, the background expands equally in all directions.
		this.bgGalaxy = this.add.tileSprite(centerX, centerY, screenW, screenH, 'galaxy').setOrigin(0.5).setScrollFactor(0).setDepth(0);
		this.bgStars = this.add.tileSprite(centerX, centerY, screenW, screenH, 'stars').setOrigin(0.5).setScrollFactor(0).setDepth(1);
		
		// Planets
		this.planet1 = this.add.image(3000, 3000, 'planet1').setScrollFactor(0.3).setDepth(4);
		this.planet2 = this.add.image(7000, 6000, 'planet2').setScrollFactor(0.5).setDepth(5);
		
		// --- OVERLAYS SETUP ---
		// Center overlays as well to prevent black padding on zoom out
		this.bgOverlay1 = this.add.tileSprite(centerX, centerY, screenW, screenH, 'overlay1').setOrigin(0.5).setScrollFactor(0).setDepth(2);
		this.bgOverlay2 = this.add.tileSprite(centerX, centerY, screenW, screenH, 'overlay2').setOrigin(0.5).setScrollFactor(0).setDepth(3);
		
		this.bgOverlay1.setAlpha(0.3);
		this.bgOverlay2.setAlpha(0.3);
		
		// --- SPACESHIP SETUP ---
		this.ship = this.physics.add.sprite(worldSize / 2, worldSize / 2, 'ship');
		this.ship.setCollideWorldBounds(true);
		this.ship.setDepth(20); // Ensures ship renders above everything
		
		// Make both cameras follow the ship to keep it centered
		this.cameras.main.startFollow(this.ship);
		this.bgCamera.startFollow(this.ship);
		
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
			const targetX = pointer.worldX;
			const targetY = pointer.worldY;
			const angleInRadians = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, targetX, targetY);
			this.ship.rotation = angleInRadians + (Math.PI / 2);
			this.physics.moveTo(this.ship, targetX, targetY, 400);
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
	
	handleCollision(ship, asteroid) {
		ship.setVelocity(0, 0);
		console.log("Crash!");
	}
	
	update() {
		// --- ZOOM INTERPOLATION ---
		// Smoothly zoom the main camera (affects ship and asteroids)
		this.cameras.main.zoom += (this.targetZoom - this.cameras.main.zoom) * 0.1;
		
		// Background camera resizes much slower to simulate depth
		const bgZoom = 1 - (1 - this.cameras.main.zoom) * 0.1;
		this.bgCamera.setZoom(bgZoom);
		
		// Update tileSprite sizes to prevent black borders when bgCamera zooms out.
		// Because the origin is now 0.5, increasing the size expands them equally in all directions.
		const screenW = this.scale.width;
		const screenH = this.scale.height;
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
		
		this.bgOverlay1.tilePositionX = camScrollX * 0.25;
		this.bgOverlay1.tilePositionY = camScrollY * 0.25;
		
		this.bgOverlay2.tilePositionX = camScrollX * 0.25;
		this.bgOverlay2.tilePositionY = camScrollY * 0.25;
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
