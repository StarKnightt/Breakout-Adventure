document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const scoreValue = document.getElementById('scoreValue');
    const livesValue = document.getElementById('livesValue');
    const highScoreValue = document.getElementById('highScoreValue');

    let ball, paddle, bricks, gameState, score, lives, highScore, powerUp;
    let rightPressed = false, leftPressed = false;
    const brickConfig = {rowCount: 5, columnCount: 8, width: 75, height: 20, padding: 10, offsetTop: 30, offsetLeft: 30};

    const THEMES = [
        {name: "SpaceX", ballColor: "#FF0000", paddleColor: "#FFFFFF", brickColor: "#808080", backgroundColor: "#000000"},
        {name: "Tesla", ballColor: "#CC0000", paddleColor: "#000000", brickColor: "#3E6AE1", backgroundColor: "#F5F5F5"},
        {name: "Neuralink", ballColor: "#00A3E0", paddleColor: "#000000", brickColor: "#808080", backgroundColor: "#FFFFFF"}
    ];
    let currentTheme = 0;

    function initGame() {
        resizeCanvas();
        ball = {x: canvas.width / 2, y: canvas.height - 30, dx: 3, dy: -3, radius: 10};
        paddle = {height: 10, width: canvas.width * 0.15, x: (canvas.width - canvas.width * 0.15) / 2};
        resetBricks();
        score = 0;
        lives = 3;
        gameState = 'ready';
        powerUp = null;
        highScore = localStorage.getItem('highScore') || 0;
        highScoreValue.textContent = highScore;
        updateUI();
    }

    function resizeCanvas() {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight * 0.8;  // Use 80% of viewport height
        const aspectRatio = 16 / 9;  // Desired aspect ratio

        let canvasWidth = containerWidth;
        let canvasHeight = canvasWidth / aspectRatio;

        if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }

    function resetBricks() {
        bricks = [];
        for (let c = 0; c < brickConfig.columnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickConfig.rowCount; r++) {
                bricks[c][r] = {x: 0, y: 0, status: 1};
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = THEMES[currentTheme].backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        if (powerUp) drawPowerUp();
        collisionDetection();

        // Ball movement and collision logic
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                ball.dy = -ball.dy;
                ball.dx = 8 * ((ball.x - (paddle.x + paddle.width / 2)) / paddle.width);
            } else {
                lives--;
                if (!lives) {
                    gameOver("GAME OVER");
                    return;
                } else {
                    resetBallAndPaddle();
                }
            }
        }

        // Paddle movement
        if (rightPressed) paddle.x = Math.min(paddle.x + 7, canvas.width - paddle.width);
        else if (leftPressed) paddle.x = Math.max(paddle.x - 7, 0);

        ball.x += ball.dx;
        ball.y += ball.dy;

        // Power-up logic
        if (powerUp) {
            powerUp.y += powerUp.dy;
            if (powerUp.y + powerUp.radius > canvas.height) {
                powerUp = null;
            } else if (powerUp.y + powerUp.radius > canvas.height - paddle.height &&
                       powerUp.x > paddle.x && powerUp.x < paddle.x + paddle.width) {
                activatePowerUp();
                powerUp = null;
            }
        }

        updateUI();

        if (gameState === 'playing') requestAnimationFrame(draw);
    }

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = THEMES[currentTheme].ballColor;
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height);
        ctx.fillStyle = THEMES[currentTheme].paddleColor;
        ctx.fill();
        ctx.closePath();
    }

    function drawBricks() {
        for (let c = 0; c < brickConfig.columnCount; c++) {
            for (let r = 0; r < brickConfig.rowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = (c * (brickConfig.width + brickConfig.padding)) + brickConfig.offsetLeft;
                    const brickY = (r * (brickConfig.height + brickConfig.padding)) + brickConfig.offsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brickConfig.width, brickConfig.height);
                    ctx.fillStyle = THEMES[currentTheme].brickColor;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    function updateUI() {
        scoreValue.textContent = score;
        livesValue.textContent = lives;
        highScoreValue.textContent = highScore;
    }

    function drawPowerUp() {
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
        ctx.fillStyle = powerUp.color;
        ctx.fill();
        ctx.closePath();
    }

    function collisionDetection() {
        for (let c = 0; c < brickConfig.columnCount; c++) {
            for (let r = 0; r < brickConfig.rowCount; r++) {
                let b = bricks[c][r];
                if (b.status === 1) {
                    if (ball.x > b.x && ball.x < b.x + brickConfig.width && ball.y > b.y && ball.y < b.y + brickConfig.height) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        score++;
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('highScore', highScore);
                        }
                        if (Math.random() < 0.1 && !powerUp) {
                            createPowerUp(b.x + brickConfig.width / 2, b.y + brickConfig.height);
                        }
                        if (score === brickConfig.rowCount * brickConfig.columnCount) {
                            gameOver("YOU WIN, CONGRATULATIONS!");
                        }
                    }
                }
            }
        }
    }

    function resetBallAndPaddle() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 30;
        ball.dx = 3 * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = -3;
        paddle.x = (canvas.width - paddle.width) / 2;
    }

    function gameOver(message) {
        gameState = 'over';
        ctx.font = "30px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        startButton.disabled = false;
        startButton.textContent = "Restart";
    }

    function startGame() {
        if (gameState === 'ready' || gameState === 'over') {
            initGame();
            startButton.disabled = true;
            startButton.textContent = "Playing";
            gameState = 'playing';
            draw();
        }
    }

    function createPowerUp(x, y) {
        const powerUpTypes = [
            {type: 'extraLife', color: '#00FF00'},
            {type: 'widePaddle', color: '#FFA500'},
            {type: 'multiball', color: '#FF00FF'}
        ];
        const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUp = {x, y, dy: 2, radius: 10, ...randomPowerUp};
    }

    function activatePowerUp() {
        switch (powerUp.type) {
            case 'extraLife':
                lives++;
                break;
            case 'widePaddle':
                paddle.width *= 1.5;
                setTimeout(() => paddle.width /= 1.5, 10000);
                break;
            case 'multiball':
                // Implement multiball logic here
                break;
        }
    }

    function handleResize() {
        resizeCanvas();
        resetBallAndPaddle();
        resetBricks();
    }

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    canvas.addEventListener("touchmove", touchMoveHandler, false);
    window.addEventListener("resize", handleResize, false);

    function keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    }

    function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
        else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    }

    function touchMoveHandler(e) {
        const relativeX = e.touches[0].clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
    }

    startButton.addEventListener("click", startGame);
    document.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            startGame();
        }
    });

    initGame();
});