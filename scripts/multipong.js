/* global chain */
var multipong = (function (chain) {

    var devices = 0,
        deviceIndex = 0,

        ball = {},

        isLeft = false,
        isRight = false,
        isCenter = false,
        frameInterval = 1000 / 60,
        frame,
        interval,

        mouseLeft = 0,
        mouseTop = 0,

        leftElement,
        rightElement,
        ballElement;

    function toRelative(left, top) {
        return {left: left / window.innerWidth, top: top / window.innerHeight};
    }

    function toAbsolute(left, top) {
        return {left: window.innerWidth * left, top: window.innerHeight * top};
    }

    function gameLoop() {
        frame++;

        // update ball object
        ball.left += Math.cos(ball.angle) * ball.speed;
        ball.top += Math.sin(ball.angle) * ball.speed;

        if (frame > 5) {
            var ballElement = document.getElementById('ball' + 1);
            if (!ballElement) {
                return;
            }
            // check edge collision
            var ballRect = ballElement.getBoundingClientRect();
            var dx = Math.cos(ball.angle),
                dy = Math.sin(ball.angle);

            if (ballRect.top < 0 && dy < 0) {
                dy = Math.abs(dy);
            } else if (ballRect.bottom > window.innerHeight && dy > 0) {
                dy = -Math.abs(dy);
            } else if (ballRect.right < 0) {
                ballElement.parentNode.removeChild(ballElement);
                clearInterval(interval);
                document.body.classList.remove('play');
                if (isLeft) {
                    chain.send('multipong', Math.floor(devices / 2), {action: 'restart', ball: ball});
                } else {
                    var relPos = toRelative(ball.left, ball.top);
                    var newBall = ball;
                    newBall.left = 1;
                    newBall.top = relPos.top;
                    chain.send('multipong', deviceIndex - 1, {action: 'enter', ball: newBall});
                }
            } else if (ballRect.left > window.innerWidth) {
                ballElement.parentNode.removeChild(ballElement);
                clearInterval(interval);
                document.body.classList.remove('play');
                if (isRight) {
                    chain.send('multipong', Math.floor(devices / 2), {action: 'restart', ball: ball});
                } else {
                    var relPos = toRelative(ball.left, ball.top);
                    var newBall = ball;
                    newBall.left = 0;
                    newBall.top = relPos.top;
                    chain.send('multipong', deviceIndex + 1, {action: 'enter', ball: newBall});
                }
            }

            // check paddle collision
            var leftRect = leftElement.getBoundingClientRect(),
                rightRect = rightElement.getBoundingClientRect();

            if (isRight && ballRect.right > rightRect.left && dx > 0 && ballRect.top < rightRect.bottom && ballRect.bottom > rightRect.top) {
                dx = -Math.abs(dx + (Math.random() - 0.5) * 30/180*Math.PI );
                ball.speed += 2;
            }

            if (isLeft && ballRect.left < leftRect.right && dx < 0 && ballRect.top < leftRect.bottom && ballRect.bottom > leftRect.top) {
                dx = Math.abs(dx + (Math.random() - 0.5) * 30/180*Math.PI);
                ball.speed += 2;
            }

            // update ball angle
            ball.angle = Math.atan2(dy, dx);
        }
        // update positions in css
        if (ballElement) {
            ballElement.style.left = ball.left + 'px';
            ballElement.style.top = ball.top + 'px';
        }

    }

    function restart() {
        if (isCenter) {
            // adds a new ball
            var newElement = document.createElement('div');
            newElement.id = 'ball' + 1;
            newElement.classList.add('ball');
            document.getElementById('balls').appendChild(newElement);


            var startPosition = toAbsolute(0.5, 0.5);
            ball = {speed: 10, left: startPosition.left, top: startPosition.top, angle: -30 / 180 * Math.PI};

            frame = 0;
            interval = setInterval(function () {
                document.body.classList.add('play');
                gameLoop();
            }, frameInterval);
        }
    }

    function enter(newBall) {
        ball = newBall;

        // adds a new ball
        var newElement = document.createElement('div');
        newElement.id = 'ball' + 1;
        newElement.classList.add('ball');
        document.getElementById('balls').appendChild(newElement);

        clearInterval(interval);

        frame = 0;
        interval = setInterval(function () {
            document.body.classList.add('play');
            gameLoop();
        }, frameInterval);
    }

    function init(_devices, _deviceIndex) {

        leftElement = document.getElementById('left-paddle');
        rightElement = document.getElementById('right-paddle');
        ballElement = document.getElementById('ball');

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
            document.body.classList.add('isCenter');
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

        chain.listen('multipong', deviceIndex, function (data) {
            if (data.action === 'restart') {
                restart();
            }
            if (data.action === 'enter') {
                var newBall = data.ball,
                    absolute = toAbsolute(data.ball.left, data.ball.top);

                newBall.left = absolute.left;
                newBall.top = absolute.top;
                enter(newBall);
            }
        });
    }

    return {
        init: init
    }
}(chain));
