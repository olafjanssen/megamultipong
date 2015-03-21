/* global chain Audio */
var multipong = (function (chain) {

    var devices = 0,
        deviceIndex = 0,
        registered = [],
        registerInterval,
        score = {left: 0, right: 0},
        maxScore = 20,

        balls = [],
        ballId = 0,
        maxBalls = 2,

        scoreSound,
        hitPaddleSound,
        hitWallSound,
        gameOverSound,
        startSound,

        isLeft = false,
        isRight = false,
        isMiddle = false,
        isCenter = false,
        time,

        leftElement,
        rightElement,
        middleElement,

        sound = true;

    function toRelative(left, top) {
        return {left: left / window.innerWidth, top: top / window.innerHeight};
    }

    function toAbsolute(left, top) {
        return {left: window.innerWidth * left, top: window.innerHeight * top};
    }

    function sendMessage(pos, message) {
        chain.send('multipong', pos, message);
        //handleIncomingMessage(message);
    }

    function sendGlobalMessage(message) {
        for (var i = 0; i < devices; i++) {
            chain.send('multipong', i, message);
        }
    }

    function gameLoop() {
        var newTime = new Date().getTime(),
            delay = newTime - time;

        if (document.body.classList.contains('playing')) {
            requestAnimationFrame(gameLoop);
        }

        time = newTime;
        balls.forEach(function (ball) {
            var ballElement = document.getElementById('ball' + ball.id),
                relPos,
                newBall,
                angleOffset = 0;

            // update ball object
            ball.left += Math.cos(ball.angle) * ball.speed * delay;
            ball.top += Math.sin(ball.angle) * ball.speed * delay;

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
                    scoreSound.play();
                    sendGlobalMessage({action: 'restart', score: 'right'});
                } else {
                    relPos = toRelative(ball.left, ball.top);
                    newBall = ball;
                    newBall.left = 1;
                    newBall.top = relPos.top;
                    sendMessage(deviceIndex - 1, {action: 'enter', ball: newBall});
                }
                return;
            } else if (ballRect.left > window.innerWidth) {
                balls.splice(balls.indexOf(ball), 1);
                ballElement.parentNode.removeChild(ballElement);
                if (isRight) {
                    scoreSound.play();
                    sendGlobalMessage({action: 'restart', score: 'left'});
                } else {
                    relPos = toRelative(ball.left, ball.top);
                    newBall = ball;
                    newBall.left = 0;
                    newBall.top = relPos.top;
                    sendMessage(deviceIndex + 1, {action: 'enter', ball: newBall});
                }
                return;
            }

            // check paddle collision
            var leftRect = leftElement.getBoundingClientRect(),
                rightRect = rightElement.getBoundingClientRect(),
                middleRect = middleElement.getBoundingClientRect();

            if (isRight && ballRect.right > rightRect.left && dx > 0 && ballRect.top < rightRect.bottom && ballRect.bottom > rightRect.top) {
                ball.left = rightRect.left - ballRect.width / 2;
                dx = -Math.abs(dx);
                angleOffset = ((ballRect.top - rightRect.top + ballRect.height) / (rightRect.height + ballRect.height) - 0.5) * -30 / 180 * Math.PI;
                ball.speed += 1.0 / 16.0;
                hitPaddleSound.play();
                sendMessage(Math.floor(devices / 2), {action: 'restart'});
            }

            if (isLeft && ballRect.left < leftRect.right && dx < 0 && ballRect.top < leftRect.bottom && ballRect.bottom > leftRect.top) {
                ball.left = leftRect.right + ballRect.width / 2;
                dx = Math.abs(dx);
                angleOffset = ((ballRect.top - leftRect.top + ballRect.height) / (leftRect.height + ballRect.height) - 0.5) * 30 / 180 * Math.PI;
                ball.speed += 1.0 / 16.0;
                hitPaddleSound.play();
                sendMessage(Math.floor(devices / 2), {action: 'restart'});
            }

            if (isMiddle && ballRect.left < middleRect.right && ballRect.right > middleRect.left && ballRect.top < middleRect.bottom && ballRect.bottom > middleRect.top) {
                ball.left = dx > 0 ? middleRect.left - ballRect.width : middleRect.right + ballRect.width / 2;
                angleOffset = ((ballRect.top - middleRect.top + ballRect.height) / (middleRect.height + ballRect.height) - 0.5) * dx / Math.abs(dx) * -30 / 180 * Math.PI;
                dx = -dx;
                ball.speed += 1.0 / 16.0;
                hitPaddleSound.play();
            }

            // update ball angle
            ball.angle = Math.atan2(dy, dx) + angleOffset;
            // update positions in css
            ballElement.style.transform = 'translate(' + ball.left + 'px, ' + ball.top + 'px)';
            ballElement.style.webkitTransform = 'translate(' + ball.left + 'px, ' + ball.top + 'px)';
        });

    }

    function addBall(newBall) {
        // sorry there is a maximum number of balls
        if (balls.length > maxBalls) {
            return;
        }

        var newElement = document.createElement('div'),
            angle = Math.PI * Math.round(Math.random()) + (Math.random() - 0.5) * 30 / 180 * Math.PI,
            startPosition = toAbsolute(isRight && isCenter && !isLeft ? 0 : isRight && isLeft ? 0.5 : Math.cos(angle) > 0 ? 0.75 : 0.25, 0.5);

        //adds a new ball
        if (!newBall) {
            newBall = {
                id: (ballId++) % 10000,
                angle: angle,
                speed: 10.0 / 16.0,
                left: startPosition.left,
                top: startPosition.top
            };
        }

        newElement.style.transform = 'translate(' + newBall.left + 'px, ' + newBall.top + 'px)';
        newElement.style.webkitTransform = 'translate(' + newBall.left + 'px, ' + newBall.top + 'px)';
        newElement.id = 'ball' + newBall.id;
        newElement.classList.add('ball');
        document.getElementById('balls').appendChild(newElement);

        balls.push(newBall);
    }

    function init(_devices, _deviceIndex) {

        scoreSound = {
            audio: document.getElementById('score-sound'), play: function () {
                if (sound) {
                    this.audio.play()
                }
            }
        };
        hitPaddleSound = {
            audio: document.getElementById('hit-paddle-sound'), play: function () {
                if (sound) {
                    this.audio.play()
                }
            }
        };
        hitWallSound = {
            audio: document.getElementById('hit-wall-sound'), play: function () {
                if (sound) {
                    this.audio.play()
                }
            }
        };
        startSound = {
            audio: document.getElementById('start-sound'), play: function () {
                if (sound) {
                    this.audio.play()
                }
            }
        };
        gameOverSound = {
            audio: document.getElementById('game-over-sound'), play: function () {
                if (sound) {
                    this.audio.play()
                }
            }
        };

        leftElement = document.getElementById('left-paddle');
        rightElement = document.getElementById('right-paddle');
        middleElement = document.getElementById('middle-paddle');

        devices = _devices;
        deviceIndex = _deviceIndex;

        isLeft = deviceIndex === 0;
        isRight = deviceIndex === devices - 1;
        isCenter = deviceIndex === Math.floor(devices / 2);
        isMiddle = !isLeft && !isRight;

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
        if (isMiddle) {
            document.body.classList.add('middle');
        }

        function interactionHandler(event) {
            var mouseTop = event.changedTouches ? parseInt(event.changedTouches[0].clientY) : event.clientY;
            event.preventDefault();

            if (isLeft) {
                leftElement.style.transform = 'translateY(' + mouseTop + 'px)';
                leftElement.style.webkitTransform = 'translateY(' + mouseTop + 'px)';
            }
            if (isRight) {
                rightElement.style.transform = 'translateY(' + mouseTop + 'px)';
                rightElement.style.webkitTransform = 'translateY(' + mouseTop + 'px)';
            }
            if (isMiddle) {
                middleElement.style.transform = 'translateY(' + mouseTop + 'px)';
                middleElement.style.webkitTransform = 'translateY(' + mouseTop + 'px)';
            }
        }

        if (isLeft || isRight || isMiddle) {
            document.addEventListener('mousemove', interactionHandler);
            document.addEventListener('touchmove', interactionHandler, false);
        }

        chain.listen('multipong', deviceIndex, handleIncomingMessage);

        if (isCenter) {
            addBall();
            setMessage('waiting');
        }

        registerInterval = window.setInterval(function () {
            sendMessage(Math.floor(devices / 2), {action: 'register', position: deviceIndex});
        }, 3000);

    }

    function start() {
        window.clearInterval(registerInterval);
        setMessage(isCenter ? 'starting' : 'ready?');
        setTimeout(function () {
            document.getElementById('message').innerText = '';
            document.body.classList.add('playing');

            updateScore();
            startSound.play();
            time = new Date().getTime();
            // start the game loop
            requestAnimationFrame(gameLoop);
        }, 3000);
    }

    function updateScore(side) {
        if (side === 'left') {
            score.left++;
        } else if (side === 'right') {
            score.right++;
        } else {
            score = {left: 0, right: 0};
        }
        document.getElementById('score').innerHTML = '<span>' + score.left + '</span><span>' + score.right + '</span>';

        if (score.left === maxScore || score.right === maxScore) {
            gameOver(score.left === maxScore ? 'left' : 'right');
        }
    }

    function setMessage(message) {
        document.getElementById('message').innerText = message;
    }

    function gameOver(winner) {
        document.body.classList.remove('playing');
        if ((isLeft && !isCenter && winner === 'left') || (isRight && !isLeft && winner) === 'right') {
            setMessage('you win!');
        } else if ((isLeft && !isCenter && winner !== 'left') || (isRight && !isLeft && winner !== 'right')) {
            setMessage('you lose!');
        } else {
            setMessage('game over');
        }

        gameOverSound.play();
    }

    function handleIncomingMessage(data) {
        if (data.action === 'restart') {
            if (data.score) {
                updateScore(data.score);
            }
            if (isCenter) {
                addBall();
            }
        } else if (data.action === 'enter') {
            var newBall = data.ball,
                absolute = toAbsolute(data.ball.left, data.ball.top);

            newBall.left = absolute.left;
            newBall.top = absolute.top;
            addBall(newBall);
        } else if (data.action === 'register') {
            if (registered.indexOf(data.position) === -1) {
                registered.push(data.position);
                if (registered.length === devices) {
                    sendGlobalMessage({action: 'start'});
                }
            }
        } else if (data.action === 'start') {
            start();
        }
    }

    return {
        init: init
    }
}(chain));
