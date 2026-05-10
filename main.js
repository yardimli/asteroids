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
		
		// Set the physics world and camera boundaries to 10,000 x 10,000
		this.physics.world.setBounds(0, 0, worldSize, worldSize);
		this.cameras.main.setBounds(0, 0, worldSize, worldSize);
		
		const screenW = this.scale.width;
		const screenH = this.scale.height;
		
		// --- PARALLAX BACKGROUND SETUP ---
		// For repeating backgrounds, we use tileSprites.
		// setScrollFactor(0) locks them to the camera so they never leave the screen.
		this.bgGalaxy = this.add.tileSprite(0, 0, screenW, screenH, 'galaxy').setOrigin(0).setScrollFactor(0);
		this.bgStars = this.add.tileSprite(0, 0, screenW, screenH, 'stars').setOrigin(0).setScrollFactor(0);
		
		// Planets are single images placed in the world.
		// setScrollFactor(0.3) makes them move slower than the camera, creating depth.
		this.add.image(3000, 3000, 'planet1').setScrollFactor(0.3);
		this.add.image(7000, 6000, 'planet2').setScrollFactor(0.5);
		
		// --- SPACESHIP SETUP ---
		// Place ship in the exact middle of the 10,000 x 10,000 world
		this.ship = this.physics.add.sprite(worldSize / 2, worldSize / 2, 'ship');
		this.ship.setCollideWorldBounds(true);
		this.ship.setDepth(10); // Ensures ship renders above backgrounds
		
		// Make the camera follow the ship. This keeps the ship "stationary" in the middle of the screen.
		this.cameras.main.startFollow(this.ship);
		
		// --- OVERLAYS SETUP ---
		// Add foreground overlays on top of the ship (depth 20)
		this.bgOverlay1 = this.add.tileSprite(0, 0, screenW, screenH, 'overlay1').setOrigin(0).setScrollFactor(0).setDepth(20);
		this.bgOverlay2 = this.add.tileSprite(0, 0, screenW, screenH, 'overlay2').setOrigin(0).setScrollFactor(0).setDepth(20);
		
		// Make overlays slightly transparent so we can see the game
		this.bgOverlay1.setAlpha(0.3);
		this.bgOverlay2.setAlpha(0.3);
		
		// --- ASTEROIDS SETUP ---
		this.asteroids = this.physics.add.group();
		
		for (let i = 0; i < 50; i++) {
			// Spawn randomly across the 10,000 x 10,000 area
			let x = Phaser.Math.Between(0, worldSize);
			let y = Phaser.Math.Between(0, worldSize);
			
			let asteroid = this.asteroids.create(x, y, 'asteroid');
			
			// Random Size (Scale between 0.1x and 0.3x)
			asteroid.setScale(Phaser.Math.FloatBetween(0.1, 0.3));
			
			// Random Movement Speed
			asteroid.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
			
			// Random Spin (Angular Velocity)
			asteroid.setAngularVelocity(Phaser.Math.Between(-80, 80));
			
			// Asteroids bounce off the edges of the 10,000x10,000 world
			asteroid.setCollideWorldBounds(true);
			asteroid.setBounce(1);
		}
		
		// --- SIMPLE RECTANGULAR COLLISION ---
		// Phaser Arcade physics uses AABB (Rectangular) collision by default
		this.physics.add.collider(this.ship, this.asteroids, this.handleCollision, null, this);
		
		// --- INPUT: MOUSE CLICK TO MOVE ---
		this.input.on('pointerdown', (pointer) => {
			// pointer.worldX/Y gets the exact coordinates in the 10,000px area
			const targetX = pointer.worldX;
			const targetY = pointer.worldY;
			
			// Calculate angle between ship and mouse click
			const angleInRadians = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, targetX, targetY);
			
			// Rotate the ship.
			// We add Math.PI / 2 (90 degrees) because the original PNG faces UP.
			this.ship.rotation = angleInRadians + (Math.PI / 2);
			
			// Move ship towards the click at 400 pixels per second
			this.physics.moveTo(this.ship, targetX, targetY, 400);
		});
		
		// Handle Window Resizing
		this.scale.on('resize', (gameSize) => {
			const width = gameSize.width;
			const height = gameSize.height;
			this.bgGalaxy.setSize(width, height);
			this.bgStars.setSize(width, height);
			this.bgOverlay1.setSize(width, height);
			this.bgOverlay2.setSize(width, height);
		});
	}
	
	handleCollision(ship, asteroid) {
		// What happens when the ship hits an asteroid (Simple rectangular bounce)
		ship.setVelocity(0, 0);
		console.log("Crash!");
	}
	
	update() {
		// --- PARALLAX TILE SCROLLING ---
		// As the camera moves, we shift the texture of the backgrounds to simulate flying.
		// Lower numbers = farther away (moves slower)
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
	}
}

// Phaser Configuration
const config = {
	type: Phaser.AUTO,
	scale: {
		mode: Phaser.Scale.RESIZE, // Automatically fills the browser window
		parent: 'game-container',
		width: '100%',
		height: '100%'
	},
	physics: {
		default: 'arcade', // Arcade physics handles the rectangular collisions natively
		arcade: {
			gravity: { y: 0 }, // No gravity in space
			debug: false // Set to true to see the rectangular hitboxes
		}
	},
	scene: [MainScene]
};

// Start the Game
new Phaser.Game(config);
