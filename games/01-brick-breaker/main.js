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
  this.load.image('paddle', 'assets/paddle.png');
  this.load.image('ball', 'assets/ball.png');
  this.load.image('brick', 'assets/brick.png');
}

function create() {
  this.score = 0;
  this.isGameOver = false;

  // paddle
  this.paddle = this.physics.add.sprite(WIDTH/2, HEIGHT - 30, 'paddle').setImmovable();
  this.paddle.body.allowGravity = false;
  this.paddle.setCollideWorldBounds(true);

  // ball
  this.ball = this.physics.add.sprite(WIDTH/2, HEIGHT - 50, 'ball');
  this.ball.setCollideWorldBounds(true);
  this.ball.setBounce(1);
  this.ball.setVelocity(150, -150);

  // bricks
  this.bricks = this.physics.add.staticGroup();
  const cols = 8; const rows = 5; const brickW = 64; const brickH = 24; const offsetX = (WIDTH - cols*brickW)/2 + brickW/2;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const x = offsetX + c*brickW;
      const y = 60 + r*(brickH+6);
      this.bricks.create(x,y,'brick');
    }
  }

  // collisions
  this.physics.add.collider(this.ball, this.bricks, hitBrick, null, this);
  this.physics.add.collider(this.ball, this.paddle, hitPaddle, null, this);

  // input
  this.input.on('pointermove', pointer => {
    this.paddle.x = Phaser.Math.Clamp(pointer.x, 50, WIDTH-50);
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
  if (cursors.left.isDown) this.paddle.x -= 6;
  if (cursors.right.isDown) this.paddle.x += 6;
}

function hitBrick(ball, brick) {
  brick.disableBody(true,true);
  this.score += 10;
  this.scoreText.setText('Score: ' + this.score);
  if (this.bricks.countActive() === 0) {
    this.add.text(WIDTH/2-60, HEIGHT/2, 'YOU WIN', {font:'32px Arial', fill:'#0f0'});
    this.isGameOver = true;
    this.ball.setVelocity(0,0);
  }
}

function hitPaddle(ball, paddle) {
  const diff = ball.x - paddle.x;
  ball.setVelocityX(200 * (diff/50));
}

function gameOver() {
  this.isGameOver = true;
  this.add.text(WIDTH/2-70, HEIGHT/2, 'GAME OVER', {font:'32px Arial', fill:'#f00'});
  this.ball.disableBody(true,true);
}
