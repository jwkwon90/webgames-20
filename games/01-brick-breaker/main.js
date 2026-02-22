const WIDTH = Math.min(window.innerWidth, 800);
const HEIGHT = Math.min(window.innerHeight, 600);

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // no external assets required; we'll draw simple shapes instead
}

function create() {
  this.score = 0;
  this.isGameOver = false;

  // set world bounds: allow left/right/top collisions but disable bottom collision so ball can fall through and trigger game over
  this.physics.world.setBoundsCollision(true, true, true, false);

  // paddle (graphics)
  this.paddle = this.add.rectangle(WIDTH/2, HEIGHT - 30, 120, 24, 0x3232c8);
  this.physics.add.existing(this.paddle, false);
  this.paddle.body.setImmovable(true);
  this.paddle.body.allowGravity = false;
  this.paddle.body.setCollideWorldBounds(true);

  // ball (graphics)
  this.ball = this.add.circle(WIDTH/2, HEIGHT - 50, 12, 0xc83232);
  this.physics.add.existing(this.ball);
  this.ball.body.setBounce(1,1);
  // keep collide world bounds enabled but bottom collision is disabled above
  this.ball.body.setCollideWorldBounds(true);
  this.ball.body.setVelocity(150, -150);

  // draw visible walls (left/right) and add static bodies so player sees boundaries
  const wallThickness = 10;
  const leftWall = this.add.rectangle(wallThickness/2, HEIGHT/2, wallThickness, HEIGHT, 0x444444);
  const rightWall = this.add.rectangle(WIDTH-wallThickness/2, HEIGHT/2, wallThickness, HEIGHT, 0x444444);
  this.physics.add.existing(leftWall, true);
  this.physics.add.existing(rightWall, true);

  // bricks (static rectangles with small gaps)
  this.bricks = this.add.group();
  const cols = 8; const rows = 5; const brickW = 64; const brickH = 24; const gap = 6; const offsetX = (WIDTH - cols*brickW - (cols-1)*gap)/2 + brickW/2;
  this.remainingBricks = cols * rows;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const x = offsetX + c*(brickW+gap);
      const y = 60 + r*(brickH+gap);
      const brick = this.add.rectangle(x,y,brickW,brickH,0x3cc850);
      // add static physics body to each brick
      this.physics.add.existing(brick, true);
      brick.body.setImmovable(true);
      this.bricks.add(brick);
    }
  }

  // enable collisions (ball with bricks/paddle and walls)
  // bricks is a plain group of GameObjects with physics bodies, so use collider with group
  this.physics.add.collider(this.ball, this.bricks, hitBrick, null, this);
  this.physics.add.collider(this.ball, this.paddle, hitPaddle, null, this);
  this.physics.add.collider(this.ball, leftWall);
  this.physics.add.collider(this.ball, rightWall);

  // input
  this.input.on('pointermove', pointer => {
    const nx = Phaser.Math.Clamp(pointer.x, 60, WIDTH-60);
    this.paddle.x = nx;
    this.paddle.body.x = nx - this.paddle.width/2;
  });

  // score text
  this.scoreText = this.add.text(10, HEIGHT-28, 'Score: 0', {font:'16px Arial', fill:'#fff'});

  // world bounds bottom check
  this.physics.world.on('worldbounds', body => {
    if (body.gameObject === this.ball && this.ball.y > HEIGHT-10) {
      gameOver.call(this);
    }
  });

  this.ball.body.onWorldBounds = true;
}

function update() {
  if (this.isGameOver) return;
  // keyboard control for desktop
  const cursors = this.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) {
    this.paddle.x -= 6;
    this.paddle.body.x = this.paddle.x - this.paddle.width/2;
  }
  if (cursors.right.isDown) {
    this.paddle.x += 6;
    this.paddle.body.x = this.paddle.x - this.paddle.width/2;
  }
}

function hitBrick(ball, brick) {
  // brick is a GameObject; remove it
  brick.destroy();
  this.remainingBricks -= 1;
  this.score += 10;
  this.scoreText.setText('Score: ' + this.score);
  if (this.remainingBricks <= 0) {
    this.add.text(WIDTH/2-60, HEIGHT/2, 'YOU WIN', {font:'32px Arial', fill:'#0f0'});
    this.isGameOver = true;
    this.ball.body.setVelocity(0,0);
    // restart after short delay
    this.time.delayedCall(1500, () => { this.scene.restart(); });
  }
}

function hitPaddle(ball, paddle) {
  const diff = ball.x - paddle.x;
  ball.body.setVelocityX(200 * (diff/50));
}

function gameOver() {
  this.isGameOver = true;
  this.add.text(WIDTH/2-70, HEIGHT/2, 'GAME OVER', {font:'32px Arial', fill:'#f00'});
  // reset score and restart after short delay
  this.time.delayedCall(1000, () => {
    this.score = 0;
    this.scene.restart();
  });
}
