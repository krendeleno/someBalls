// Модули matter.js
var Engine          = Matter.Engine,
    Render          = Matter.Render,
    World           = Matter.World,
    Body            = Matter.Body,
    Bodies          = Matter.Bodies,
    Events          = Matter.Events,
    Constraint      = Matter.Constraint,
    Composite       = Matter.Composite,
    Composites      = Matter.Composites,
    Bounds          = Matter.Bounds,
    Mouse           = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

let w = document.documentElement.clientWidth;
let h = document.documentElement.clientHeight;

// Создание тикера и физического движка
let engine = Engine.create();
let render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: w,
        height: h,
        wireframes: false,
        hasBounds: true,
        showShadows: true,
    }
});

let Draggable;
// Цвета
var bodyStyle = {fillStyle: 'white', shadowColor: 'white' };
var lavaStyle = {fillStyle: 'darkorange', shadowColor: 'darkorange'};
var ballStyle = {fillStyle: 'purple', shadowColor: 'purple'};
var badBallStyle = {fillStyle: 'red', shadowColor: 'red'};
var goodBallStyle = {fillStyle: 'gold', shadowColor: 'gold'};

// Создание объектов
let ground = Bodies.rectangle(w/2, h, w,10,{isStatic: true, friction: 0.2});
let lava = Bodies.rectangle(w/2,h + 350,w * 10, 500, {isStatic: true, render: lavaStyle});
let ball = Bodies.circle(0,0,20, {
    isStatic: false,
    restitution: 1,
    render: bodyStyle,
    plugin: {
        wrap: {
            min: {
                x: - w * 2.2,
                y: -h * 10
            },
            max: {
                x: w * 2.2,
                y: h + 80
            }
        }
    }
});

// Мышка
let mouse = Mouse.create(render.canvas);

let mouseConstraint = MouseConstraint.create(engine, {
    collisionFilter: {
        mask: Draggable
    },
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {visible: false}
    }
});
render.mouse = mouse;

// Звуки
function loadSound () {
    createjs.Sound.registerSound("music/ballCollision.mp3", "ballCollision");
    createjs.Sound.registerSound("music/destruction.mp3", "destruction");
    createjs.Sound.registerSound("music/win.mp3", "win");
}

function playSound (sound) {
    createjs.Sound.play(sound);
}

// Вывод очков и здоровья на экран
let score = 0;
let health = 100;
let fullHealth = 100;
let mouseDown = false;
let gameActive = false;

centerX = - w/2 + 25;
centerY = - h/2 + 25;

// Отслеживание позиции мышки относительно канваса
let pageX;
let pageY;

function handler(e) {
    pageX = e.clientX;
    pageY = e.clientY;
}

document.addEventListener('mousemove', handler);
let ctx = render.context;
Events.on(render, 'afterRender', function(event) {
    // Фикс очень странных багов со свечением из-за того, что я поменяла рендерер в matter.js
    ctx.shadowColor = 'transparent';

    if (gameActive || isDefeat || isWin) {
        miniMap();
        // Траектория полета
        if (mouseDown && !wasPlayed) {
            var grad= ctx.createLinearGradient(w/2, h/2, pageX, pageY);
            grad.addColorStop(0, "white");
            grad.addColorStop(1, "transparent ");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 6.5;
            ctx.beginPath();
            ctx.moveTo(w/2, h/2);
            ctx.lineTo(pageX, pageY);
            ctx.stroke();
            ctx.closePath();
        }
        // Очки
        ctx.fillStyle = "white";
        ctx.font = "18px 'Press Start 2P', cursive";
        ctx.fillText("Ваши очки: " + score, 50, 50);

        // Здоровье
        ctx.fillStyle = "darkred";
        ctx.beginPath();
        ctx.fillRect(w / 2 - fullHealth, 20, fullHealth * 2, 30);
        ctx.fillStyle = "green";
        ctx.fillRect(w / 2 - fullHealth, 20, health * 2, 30);
        ctx.closePath();
    }

    if (isWin) {
        text = "Победа!";
        ctx.fillStyle = "green";
        ctx.font = "30px 'Press Start 2P', cursive";
        ctx.fillText(text , w/2 - ctx.measureText(text).width/2, h/2);
    }

    if (isDefeat) {
        health = 0;
        text = "Вы проиграли!";
        ctx.fillStyle = "red";
        ctx.font = "30px 'Press Start 2P', cursive";
        ctx.fillText(text, w/2 - ctx.measureText(text).width/2, h/2);
    }
});

 // Слоу-моу при клике
Events.on(mouseConstraint, "mousedown", function(event) {
    if (gameActive && !wasPlayed) {
        engine.timing.timeScale = 0.2;
        mouseDown = true;
    }
});

// Изменение вектора скорости при клике
Events.on(mouseConstraint, "mouseup", function(event) {
    // Длина вектора скорости
    let dV = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);

    // Вектор между кликом мышки и центром шара
    let x = event.mouse.position.x - ball.position.x;
    let y = event.mouse.position.y - ball.position.y;
    let d = Math.sqrt(x * x + y * y);

    // Новые координаты вектора скорости
    //  x = x * dV / d;
    //  y = y * dV / d;
      x = x / 50;
      y = y / 50;

    // Изменение скорости
    Body.setVelocity( ball, {x: x, y: y});

    // Возвращение нормального времени
    engine.timing.timeScale = 1;
    mouseDown = false;
});

// Плагины matter.js
var Emitter = Particle.emitter;
Matter.use('matter-wrap');

// Взрыв при ударе
Events.on(engine, "collisionEnd", function(event) {
    if (!event.pairs[0].bodyB.isParticle && !event.pairs[0].bodyA.isParticle) {
        if (event.pairs[0].bodyB == ball) {
            if (event.pairs[0].bodyA.label == "Circle Body") {
                score++;
                if (health < 100)
                    health += 5;
                collisionExplosion(event.pairs[0].bodyA);

            } else if (event.pairs[0].bodyA.label == "Bad boy")
                health = 0;
            else if (event.pairs[0].bodyA.label == "Good boy") {
                health = 100;
                collisionExplosion(event.pairs[0].bodyA);
            }
        } else if (event.pairs[0].bodyA == ball) {
            if (event.pairs[0].bodyB.label == "Circle Body") {
                score++;
                if (health < 100)
                    health += 5;
                collisionExplosion(event.pairs[0].bodyB);
            } else if (event.pairs[0].bodyB.label == "Bad boy")
                health = 0;
            else if (event.pairs[0].bodyB.label == "Good boy") {
                health = 100;
                collisionExplosion(event.pairs[0].bodyB);
            }
        }
    }
});

function collisionExplosion(body) {
    playSound ("ballCollision");
    var explosion = Emitter.create(body.position.x, body.position.y, {
        amount: 25,
        collisions: false,
        colors: body.render.fillStyle,
    });
    explosion.explode();
    for (i = 0; i < balls.length; i++) {
        if (body.position.x == balls[i].position.x
            && body.position.y == balls[i].position.y) {
            balls.splice(i, 1);
            break;
        }
    }
    for (i = 0; i < goodBalls.length; i++) {
        if (body.position.x == goodBalls[i].position.x
            && body.position.y == goodBalls[i].position.y) {
            goodBalls.splice(i, 1);
            break;
        }
    }
    World.remove(engine.world, body);
}

// Границы для камеры
let initialEngineBoundsMaxX = render.bounds.max.x;
let initialEngineBoundsMaxY = render.bounds.max.y;

let isDefeat = false;
let isWin = false;

// Переменная, чтобы звук победы/поражения не проигрывался миллион раз
let wasPlayed = false;

// Камера
Events.on(engine, 'beforeUpdate', function(event) {
    // Следовать за игроком по Х
    render.bounds.min.x = centerX + ball.bounds.min.x;
    render.bounds.max.x = centerX + ball.bounds.min.x + initialEngineBoundsMaxX;

    // Следовать за игроком по Y
    render.bounds.min.y = centerY + ball.bounds.min.y;
    render.bounds.max.y = centerY + ball.bounds.min.y + initialEngineBoundsMaxY;

    // Обновление мышки
    Mouse.setOffset(mouseConstraint.mouse, render.bounds.min);

    // Composite.scale( engine.world, 1 * 1/(ball.speed/100) , 1 * 1/(ball.speed/100),
    //     {x: (render.bounds.max.x - render.bounds.min.x)/2, y: (render.bounds.max.y - render.bounds.min.y)/2});

    // Уменьшение здоровья
    if (mouseDown && health > 0 && !wasPlayed)
        health -= 0.3;

    // Сообщение о победе
    if (score == amountBalls && !wasPlayed) {
        isWin = true;
        ballExplosion();
        playSound("win");
    }

    // Уничтожение шарика, если он упал в лаву или закончилось здоровье
    if (ball.position.y > h + 80 || health <= 0) {
        isDefeat = true;
        if (!wasPlayed) {
            ballExplosion();
            playSound("destruction");
        }
    }
});

// Взрыв шарика при победе/поражении
function ballExplosion() {
    wasPlayed = true;
    var explosion = Emitter.create(ball.position.x, ball.position.y, {
        amount: 20,
        collisions: false,
        decaySpeed: 1,
        colors: "white",
    });
    explosion.explode();
    World.remove(engine.world, ball);
    gameActive = false;
    addRetry();
}

// Генерация шариков с нормальным распределением
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function checkPosition(body) {
    for (let i = 0; i < balls.length; i++)
        if (Math.abs(body.position.x - balls[i].position.x) < 60 && Math.abs(body.position.y - balls[i].position.y) < 120)
            return false;
    for (let i = 0; i < badBalls.length; i++)
        if (Math.abs(body.position.x - badBalls[i].position.x) < 60 && Math.abs(body.position.y - balls[i].position.y) < 120)
            return false;
    for (let i = 0; i < goodBalls.length; i++)
        if (Math.abs(body.position.x - goodBalls[i].position.x) < 60 && Math.abs(body.position.y - balls[i].position.y) < 120)
            return false;
    return true;
}

function addRetry() {
    var canvas = document.getElementsByTagName("canvas")[0];
    var parent = canvas.parentNode;
    var helper = document.createElement('div');
    helper.innerHTML = "<button id='play' onclick='startGame()'>Еще раз?</button>";
    while (helper.firstChild) {
        parent.insertBefore(helper.firstChild, canvas);
    }
}
badBalls = [];
balls = [];
goodBalls = [];

let amountBalls;
let amountBadBalls;
let amountGoodBalls;
function startGame() {
    goodBalls = [];
    balls = [];
    badBalls = [];
    World.clear(engine.world);
    isDefeat = false;
    isWin = false;
    health = 100;
    score = 0;
    wasPlayed = false;
    gameActive = true;
    var element = document.getElementById("play");
    element.parentNode.removeChild(element);

// Генерация шариков один раз
    amountBalls = Math.floor(getRandomArbitrary(10,50));
    amountBadBalls = Math.floor(getRandomArbitrary(10,20));
    amountGoodBalls = Math.floor(getRandomArbitrary(1,5));
    for (i = 0; i < amountBalls; i++) {
        let ball_random = Bodies.circle(getRandomArbitrary(-w * 2, w * 2),
            getRandomArbitrary(-h * 2, h), 25, {
                isStatic: true,
                render: ballStyle,
            });
        if (checkPosition(ball_random))
            balls.push(ball_random);
        else {
            Body.setPosition(ball_random, {x: getRandomArbitrary(-w * 2, w * 2),
                y: getRandomArbitrary(-h * 2, h)});
            balls.push(ball_random);
        }
    }
    console.log(balls.length)
    console.log(amountBalls)
    for (i = 0; i < amountBadBalls; i++) {
        let ball_random = Bodies.polygon(getRandomArbitrary(-w * 2, w * 2),
            getRandomArbitrary(-h * 2, h), 6, 30, {
                isStatic: true,
                label: "Bad boy",
                render: badBallStyle,
            });
        if (checkPosition(ball_random))
            badBalls.push(ball_random);
        else {
            Body.setPosition(ball_random, {x: getRandomArbitrary(-w * 2, w * 2),
                y: getRandomArbitrary(-h * 2, h)});
            badBalls.push(ball_random);
        }
    }
    for (i = 0; i < amountGoodBalls; i++) {
        let ball_random = Bodies.circle(getRandomArbitrary(-w * 2, w * 2),
            getRandomArbitrary(-h * 2, h), 10, {
                isStatic: true,
                label: "Good boy",
                render: goodBallStyle,
            });
        if (checkPosition(ball_random))
            goodBalls.push(ball_random);
        else {
            Body.setPosition(ball_random, {x: getRandomArbitrary(-w * 2, w * 2),
                y: getRandomArbitrary(-h * 2, h)});
            goodBalls.push(ball_random);
        }
    }
    World.add(engine.world, balls);
    World.add(engine.world, badBalls);
    World.add(engine.world, goodBalls);
// Добавление объектов в мир
    Body.setPosition(ball, {x: 0, y: 0});
    Body.setVelocity(ball, {x: getRandomArbitrary(0, 20), y: getRandomArbitrary(-20,20)})
    World.add(engine.world, [ball, ground, mouseConstraint, lava]);
}

Render.run(render);
Engine.run(engine);

// Мини-карта
function miniMap() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "grey";
    ctx.beginPath();
    var xOff = w - 10;
    var yOff = 150;
    var size = 200;
    var scale = size / (w * 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.rect(xOff - 50, yOff - 100, -size -100, size - 50);
    ctx.stroke();
    ctx.fill();

    // Шарики на мини-карте
    ctx.fillStyle = "purple";
    for (var i = 0; i < balls.length; i++) {
        ctx.fillRect(balls[i].position.x * scale + xOff - size, balls[i].position.y * scale + yOff, 3, 3);
    }
    ctx.fillStyle = "red";
    for (var i = 0; i < badBalls.length; i++) {
        ctx.fillRect(badBalls[i].position.x * scale + xOff - size, badBalls[i].position.y * scale + yOff, 3, 3);
    }

    ctx.fillStyle = "gold";
    for (var i = 0; i < goodBalls.length; i++) {
        ctx.fillRect(goodBalls[i].position.x * scale + xOff - size, goodBalls[i].position.y * scale + yOff, 3, 3);
    }

    // Игрок на мини-карте
    ctx.fillStyle = "white";
    let PlayerX = ball.position.x * scale + xOff - size;
    let PlayerY = ball.position.y * scale + yOff;
    if (PlayerY > yOff - 100)
        ctx.fillRect(PlayerX, PlayerY, 5, 5);
    ctx.closePath();
}