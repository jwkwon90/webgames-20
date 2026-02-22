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
  // Using simple generated sounds via WebAudio; no external assets
}

function create() {
  // --- Game state ---
  this.score = 0;
  this.lives = 3;
  this.isGameOver = false;
  this.isBallLaunched = true; // start launched

  // audio helper using WebAudio Oscillator for simple effects
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  this.sfx = {
    playBeep: (freq, type='sine', duration=0.08, gain=0.08) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + duration);
    }
  };

  // world bounds: disable bottom collision so ball can fall through
  this.physics.world.setBoundsCollision(true, true, true, false);

  // paddle (graphics)
  this.paddle = this.add.rectangle(WIDTH/2, HEIGHT - 30, 120, 24, 0x3232c8);
  this.physics.add.existing(this.paddle, false);
  this.paddle.body.setImmovable(true);
  this.paddle.body.allowGravity = false;
  this.paddle.body.setCollideWorldBounds(true);

  // ball (graphics)
  this.spawnBall();

  // visible walls
  const wallThickness = 10;
  const leftWall = this.add.rectangle(wallThickness/2, HEIGHT/2, wallThickness, HEIGHT, 0x444444);
  const rightWall = this.add.rectangle(WIDTH-wallThickness/2, HEIGHT/2, wallThickness, HEIGHT, 0x444444);
  this.physics.add.existing(leftWall, true);
  this.physics.add.existing(rightWall, true);

  // bricks with color/level (hp)
  this.bricks = this.add.group();
  const cols = 8; const rows = 5; const brickW = 64; const brickH = 24; const gap = 6;
  const offsetX = (WIDTH - cols*brickW - (cols-1)*gap)/2 + brickW/2;
  this.remainingBricks = cols * rows;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const x = offsetX + c*(brickW+gap);
      const y = 60 + r*(brickH+gap);
      // hp by row: top rows tougher
      const hp = Math.min(3, 1 + Math.floor(r/2));
      const color = hp===3?0xff6b6b: hp===2?0xffd166:0x3cc850;
      const brick = this.add.rectangle(x,y,brickW,brickH,color);
      brick.hp = hp;
      this.physics.add.existing(brick, true);
      brick.body.setImmovable(true);
      this.bricks.add(brick);
    }
  }

  // powerups group (falling)
  this.powerups = this.physics.add.group();

  // collisions
  this.physics.add.collider(this.ball, this.bricks, hitBrick, null, this);
  this.physics.add.collider(this.ball, this.paddle, hitPaddle, null, this);
  this.physics.add.collider(this.ball, leftWall);
  this.physics.add.collider(this.ball, rightWall);
  this.physics.add.overlap(this.paddle, this.powerups, collectPowerup, null, this);

  // input: smooth follow for pointer/touch and keyboard
  this.input.on('pointermove', pointer => {
    this.targetPaddleX = Phaser.Math.Clamp(pointer.x, 60, WIDTH-60);
    // if ball not launched, move ball with paddle
    if (!this.isBallLaunched && this.ball) {
      this.ball.x = this.targetPaddleX;
      this.ball.body.x = this.ball.x - (this.ball.displayWidth||12)/2;
    }
  });
  this.input.on('pointerdown', () => {
    // launch ball if not launched
    if (!this.isBallLaunched) this.launchBall();
  });

  // keyboard
  this.input.keyboard.on('keydown-R', () => { this.scene.restart(); });
  this.input.keyboard.on('keydown-SPACE', () => { if (!this.isBallLaunched) this.launchBall(); });

  // UI
  this.scoreText = this.add.text(10, HEIGHT-28, 'Score: 0', {font:'16px Arial', fill:'#fff'});
  this.livesText = this.add.text(WIDTH-110, HEIGHT-28, 'Lives: ' + this.lives, {font:'16px Arial', fill:'#fff'});

  // world bounds bottom check
  this.physics.world.on('worldbounds', body => {
    if (body.gameObject === this.ball && this.ball.y > HEIGHT-10) {
      // ball fell out
      this.sfx.playBeep(120, 'sine', 0.12, 0.12);
      this.ballFall();
    }
  });
  this.ball.body.onWorldBounds = true;
}

function update() {
  if (this.isGameOver) return;
  // smooth paddle move towards target for mobile responsiveness
  if (this.targetPaddleX !== undefined) {
    this.paddle.x = Phaser.Math.Linear(this.paddle.x, this.targetPaddleX, 0.2);
    this.paddle.body.x = this.paddle.x - this.paddle.width/2;
  }
  // keyboard control fallback
  const cursors = this.input.keyboard.createCursorKeys();
  if (cursors.left.isDown) {
    this.paddle.x -= 8;
    this.paddle.body.x = this.paddle.x - this.paddle.width/2;
  }
  if (cursors.right.isDown) {
    this.paddle.x += 8;
    this.paddle.body.x = this.paddle.x - this.paddle.width/2;
  }
}

// --- helpers ---
function spawnBall() {
  if (this.ball) this.ball.destroy();
  this.ball = this.add.circle(WIDTH/2, HEIGHT - 50, 12, 0xc83232);
  this.physics.add.existing(this.ball);
  this.ball.body.setBounce(1,1);
  this.ball.body.setCollideWorldBounds(true);
  this.ball.body.onWorldBounds = true;
  // start attached to paddle
  this.isBallLaunched = false;
  this.ball.body.setVelocity(0,0);
  this.ball.x = this.paddle.x;
  this.ball.body.x = this.ball.x - 12/2;
}

function launchBall() {
  if (!this.ball) return;
  this.isBallLaunched = true;
  // give a slight upward randomized angle
  const vx = Phaser.Math.Between(-120,120);
  const vy = -200;
  this.ball.body.setVelocity(vx, vy);
  this.sfx.playBeep(800, 'sine', 0.05, 0.06);
}

function ballFall() {
  // remove ball
  if (this.ball) {
    this.ball.destroy();
    this.ball = null;
  }
  this.lives -= 1;
  this.livesText.setText('Lives: ' + this.lives);
  if (this.lives > 0) {
    // respawn ball after short delay
    this.time.delayedCall(700, () => { spawnBall.call(this); });
  } else {
    // out of lives -> game over
    this.sfx.playBeep(140, 'sine', 0.25, 0.12);
    gameOver.call(this);
  }
}

function hitBrick(ball, brick) {
  // decrement hp
  brick.hp -= 1;
  this.sfx.playBeep(600 + 50*brick.hp, 'square', 0.06, 0.06);
  if (brick.hp <= 0) {
    // chance to drop powerup (20%)
    const drop = Math.random() < 0.2;
    const bx = brick.x; const by = brick.y;
    // destroy brick
    brick.destroy();
    this.remainingBricks -= 1;
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
    if (drop) spawnPowerup.call(this, bx, by);
    if (this.remainingBricks <= 0) {
      this.add.text(WIDTH/2-60, HEIGHT/2, 'YOU WIN', {font:'32px Arial', fill:'#0f0'});
      this.isGameOver = true;
      this.ball && this.ball.body && this.ball.body.setVelocity(0,0);
      this.time.delayedCall(1500, () => { this.scene.restart(); });
    }
  } else {
    // change color based on hp
    const color = brick.hp===2?0xffd166: 0x3cc850;
    brick.fillColor = color;
  }
}

function spawnPowerup(x,y) {
  // simple powerup: type either 'life' or 'widen'
  const type = Math.random() < 0.5 ? 'life' : 'widen';
  const pu = this.add.circle(x, y, 10, type==='life'?0xff6b6b:0x5eead4);
  pu.type = type;
  this.physics.add.existing(pu);
  pu.body.setVelocity(0, 80);
  pu.body.setImmovable(false);
  this.powerups.add(pu);
}

function collectPowerup(paddle, pu) {
  this.sfx.playBeep(pu.type==='life'?1000:1200, 'triangle', 0.08, 0.08);
  if (pu.type === 'life') {
    this.lives += 1;
    this.livesText.setText('Lives: ' + this.lives);
  } else if (pu.type === 'widen') {
    // widen paddle for a short time
    this.paddle.width += 40;
    this.paddle.body.setSize(this.paddle.width, this.paddle.height);
    // visually scale
    this.paddle.scaleX = 1; // keep consistent
    this.time.delayedCall(8000, () => {
      this.paddle.width = 120;
      this.paddle.body.setSize(this.paddle.width, this.paddle.height);
    });
  }
  pu.destroy();
}

function hitPaddle(ball, paddle) {
  const diff = ball.x - paddle.x;
  ball.body.setVelocityX(200 * (diff/50));
  this.sfx.playBeep(900, 'sine', 0.03, 0.04);
}

function gameOver() {
  this.isGameOver = true;
  this.add.text(WIDTH/2-70, HEIGHT/2, 'GAME OVER', {font:'32px Arial', fill:'#f00'});
  // reset score and restart after short delay
  this.time.delayedCall(1200, () => {
    this.score = 0;
    this.scene.restart();
  });
}
