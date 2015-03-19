/* global chain Audio */
var multipong = (function (chain) {

    var devices = 0,
        deviceIndex = 0,
        score = {left: 0, right: 0},
        maxScore = 20,

        balls = [],
        ballId = 0,
        maxBalls = 3,

        scoreSound,
        hitPaddleSound,
        hitWallSound,
        gameOverSound,
        startSound,

        isLeft = false,
        isRight = false,
        isCenter = false,
        frameInterval = 1000 / 60,
        interval,

        mouseLeft = 0,
        mouseTop = 0,

        leftElement,
        rightElement;

    function toRelative(left, top) {
        return {left: left / window.innerWidth, top: top / window.innerHeight};
    }

    function toAbsolute(left, top) {
        return {left: window.innerWidth * left, top: window.innerHeight * top};
    }

    function sendMessage(pos, message) {
        //chain.send('multipong', pos, message);
        handleIncomingMessage(message);
    }

    function gameLoop() {
        if (balls.forEach(function (ball) {
                // update ball object
                ball.left += Math.cos(ball.angle) * ball.speed;
                ball.top += Math.sin(ball.angle) * ball.speed;

                var ballElement = document.getElementById('ball' + ball.id);
                if (!ballElement) {
                    return;
                }
                // check edge collision
                var ballRect = ballElement.getBoundingClientRect();
                var dx = Math.cos(ball.angle),
                    dy = Math.sin(ball.angle);

                if (ballRect.top < 0 && dy < 0) {
                    dy = Math.abs(dy);
                    hitWallSound.play();
                } else if (ballRect.bottom > window.innerHeight && dy > 0) {
                    dy = -Math.abs(dy);
                    hitWallSound.play();
                } else if (ballRect.right < 0) {
                    balls.splice(balls.indexOf(ball), 1);
                    ballElement.parentNode.removeChild(ballElement);
                    if (isLeft) {
                        sendMessage(Math.floor(devices / 2), {action: 'restart', score: 'right'});
                    } else {
                        var relPos = toRelative(ball.left, ball.top);
                        var newBall = ball;
                        newBall.left = 1;
                        newBall.top = relPos.top;
                        sendMessage(deviceIndex - 1, {action: 'enter', ball: newBall});
                    }
                    return;
                } else if (ballRect.left > window.innerWidth) {
                    balls.splice(balls.indexOf(ball), 1);
                    ballElement.parentNode.removeChild(ballElement);
                    if (isRight) {
                        sendMessage(Math.floor(devices / 2), {action: 'restart', score: 'left'});
                    } else {
                        var relPos = toRelative(ball.left, ball.top);
                        var newBall = ball;
                        newBall.left = 0;
                        newBall.top = relPos.top;
                        sendMessage(deviceIndex + 1, {action: 'enter', ball: newBall});
                    }
                    return;
                }

                // check paddle collision
                var leftRect = leftElement.getBoundingClientRect(),
                    rightRect = rightElement.getBoundingClientRect();

                if (isRight && ballRect.right > rightRect.left && dx > 0 && ballRect.top < rightRect.bottom && ballRect.bottom > rightRect.top) {
                    dx = -Math.abs(dx + (Math.random() - 0.5) * 30 / 180 * Math.PI);
                    ball.speed += 2;
                    hitPaddleSound.play();
                    addBall();
                }

                if (isLeft && ballRect.left < leftRect.right && dx < 0 && ballRect.top < leftRect.bottom && ballRect.bottom > leftRect.top) {
                    dx = Math.abs(dx + (Math.random() - 0.5) * 30 / 180 * Math.PI);
                    ball.speed += 2;
                    hitPaddleSound.play();
                    addBall();
                }

                // update ball angle
                ball.angle = Math.atan2(dy, dx);
                // update positions in css
                if (ballElement) {
                    ballElement.style.left = ball.left + 'px';
                    ballElement.style.top = ball.top + 'px';
                }
            }));
    }

    function addBall(newBall) {
        // sorry there is a maximum number of balls
        if (balls.length > maxBalls) {
            return;
        }

        var newElement = document.createElement('div'),
            startPosition = toAbsolute(0.5, 0.5);

        //adds a new ball
        if (!newBall) {
            newBall = {
                id: (ballId++) % 10000,
                speed: 10,
                left: startPosition.left,
                top: startPosition.top,
                angle: Math.PI * Math.round(Math.random()) + (Math.random() - 0.5) * 30 / 180 * Math.PI
            };
        }

        newElement.style.left = newBall.left + 'px';
        newElement.style.top = newBall.top + 'px';
        newElement.id = 'ball' + newBall.id;
        newElement.classList.add('ball');
        document.getElementById('balls').appendChild(newElement);

        balls.push(newBall);
    }

    function restart() {
        if (isCenter) {
            console.log('restart');

            addBall();
        }
    }

    function enter(newBall) {
        addBall(newBall);
    }

    function init(_devices, _deviceIndex) {

        scoreSound = {audio: document.getElementById('score-sound'), play: function(){ console.log(this.audio); this.audio.play()}};
        hitPaddleSound = {audio: document.getElementById('hit-paddle-sound'), play: function(){ this.audio.play()}};
        hitWallSound = {audio: document.getElementById('hit-wall-sound'), play: function(){ this.audio.play()}};
        startSound = {audio: document.getElementById('start-sound'), play: function(){ this.audio.play()}};
        gameOverSound = {audio: document.getElementById('game-over-sound'), play: function(){ this.audio.play()}};

        leftElement = document.getElementById('left-paddle');
        rightElement = document.getElementById('right-paddle');

        devices = _devices;
        deviceIndex = _deviceIndex;

        isLeft = deviceIndex === 0;
        isRight = deviceIndex === devices - 1;
        isCenter = deviceIndex === Math.floor(devices / 2);

        // setting the body styles
        if (isLeft) {
            document.body.classList.add('left');
        }
        if (isRight) {
            document.body.classList.add('right');
        }
        if (isCenter) {
            document.body.classList.add('center');
        }

        if (isLeft || isRight) {
            document.addEventListener('mousemove', function (event) {
                mouseLeft = event.clientX;
                mouseTop = event.clientY;

                if (isLeft) {
                    leftElement.style.top = mouseTop + 'px';
                }
                if (isRight) {
                    rightElement.style.top = mouseTop + 'px';
                }
            })
        }

        restart();

        document.getElementById('message').innerText = isCenter? 'starting' : 'ready?';
        setTimeout(function(){
            document.getElementById('message').innerText = '';
            document.body.classList.add('playing');
            // start the game loop
            interval = setInterval(function () {
                gameLoop();
            }, frameInterval);
            updateScore();
            startSound.play();
        }, 3000);

    }

    function updateScore(side) {
        if (side === 'left') {
            score.left++;
            scoreSound.play();
        } else if (side === 'right') {
            score.right++;
            scoreSound.play();
        } else {
            score = {left: 0, right: 0};
        }
        document.getElementById('score').innerHTML = '<span>' + score.left + '</span><span>' + score.right + '</span>';

        if (score.left === maxScore || score.right === maxScore) {
            document.body.classList.remove('playing');
            document.getElementById('message').innerText = (score.left === maxScore?'left' : 'right') + ' wins';
            clearInterval(interval);
            gameOverSound.play();
        }
    }

    function handleIncomingMessage(data) {
        console.log(data);
        if (data.action === 'restart') {
            updateScore(data.score);
            restart();
        }
        if (data.action === 'enter') {
            var newBall = data.ball,
                absolute = toAbsolute(data.ball.left, data.ball.top);

            newBall.left = absolute.left;
            newBall.top = absolute.top;
            enter(newBall);
        }
    }

    return {
        init: init
    }
}(chain));
