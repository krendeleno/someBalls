// Matter module aliases
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

// Создание объектов
let ground = Bodies.rectangle(w/2, h, w,10,{isStatic: true, friction: 0.2});
let lava = Bodies.rectangle(w/2,h + 350,w * 10, 500, {isStatic: true, render: lavaStyle});
let ball = Bodies.circle(0,0,20, {
    isStatic: false,
    restitution: 1,
    render: bodyStyle,
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

    if (gameActive) {
        miniMap();
        // Траектория полета
        if (mouseDown) {
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
        text = "Вы проиграли!";
        ctx.fillStyle = "red";
        ctx.font = "30px 'Press Start 2P', cursive";
        ctx.fillText(text, w/2 - ctx.measureText(text).width/2, h/2);
    }
});

 // Слоу-моу при клике
Events.on(mouseConstraint, "mousedown", function(event) {
    if (gameActive) {
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

// Плагин для взрывов в matter.js
var Emitter = Particle.emitter;

// Столкновение
Events.on(engine, 'collisionStart', function(event) {
    if (event.pairs[0].bodyB.label !== "Rectangle Body" && event.pairs[0].bodyA.label !== "Rectangle Body"
    && !event.pairs[0].bodyB.isParticle && !event.pairs[0].bodyA.isParticle) {
        // Body.setVelocity(ball, {x: ball.velocity.x + 5, y: ball.velocity.y})
        score++;
        if (health < 100)
            health += 5;
    }
 });

// Взрыв при ударе
Events.on(engine, "collisionEnd", function(event) {
    if (!event.pairs[0].bodyB.isParticle && !event.pairs[0].bodyA.isParticle) {
        if (event.pairs[0].bodyB == ball && event.pairs[0].bodyA.label == "Circle Body") {
            playSound ("ballCollision");
            var explosion = Emitter.create(event.pairs[0].bodyA.position.x, event.pairs[0].bodyA.position.y, {
                amount: 20,
                collisions: false,
                colors: ["#B695C0", "purple"],
            });
            explosion.explode();
            World.remove(engine.world, event.pairs[0].bodyA);
            for (i = 0; i < balls.length; i++) {
                if (event.pairs[0].bodyA.position.x == balls[i].position.x
                    && event.pairs[0].bodyA.position.y == balls[i].position.y) {
                    balls.splice(i, 1);
                    break;
                }
            }
        } else if (event.pairs[0].bodyA == ball && event.pairs[0].bodyB.label == "Circle Body") {
            playSound ("ballCollision");
            var explosion = Emitter.create(event.pairs[0].bodyA.position.x, event.pairs[0].bodyA.position.y, {
                amount: 20,
                collisions: false,
                colors: ["#B695C0", "purple"],
            });
            explosion.explode();
            World.remove(engine.world, event.pairs[0].bodyB);
            for (i = 0; i < balls.length; i++) {
                if (event.pairs[0].bodyB.position.x == balls[i].position.x
                    && event.pairs[0].bodyB.position.y == balls[i].position.y) {
                    balls.splice(i, 1);
                    break;
                }
            }
        }
    }
});

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
    if (mouseDown && health > 0)
        health -= 0.2;

    // Сообщение о победе
    if (score == 30 && !wasPlayed) {
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
    setTimeout(() => {
            // Matter.Render.stop(render);
            gameActive = false;
            addRetry();},
        1000);
}

// Генерация шариков с нормальным распределением
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

// Генерация шариков в режиме реального времени
function addCircleLeft() {
    let ball_random =  Bodies.circle(getRandomArbitrary(render.bounds.max.x, render.bounds.max.x * 2),
        getRandomArbitrary(-1000, 600), 60, {
            isStatic: true,
            render: bodyStyle,
        });
    World.add(engine.world, ball_random);
}

function addCircleRight(){
    let ball_random =  Bodies.circle(getRandomArbitrary(- w * 2, 0),
        getRandomArbitrary(-1000, 600), 60, {
            isStatic: true,
            render: bodyStyle,
        });
    World.add(engine.world, ball_random);
}

function addCircleUp() {
    let ball_random =  Bodies.circle(getRandomArbitrary(render.bounds.min.x * 2, render.bounds.max.x * 2),
        getRandomArbitrary(-2000, -1000), 60, {
            isStatic: true,
            render: bodyStyle,
        });
    World.add(engine.world, ball_random);
}

function addRetry() {
    var foo = document.getElementsByTagName("canvas")[0];
    var parent = foo.parentNode;
    var helper = document.createElement('div');
    helper.innerHTML = "<button id='play' onclick='startGame()'>Еще раз?</button>";
    while (helper.firstChild) {
        parent.insertBefore(helper.firstChild, foo);
    }
    // document.body.innerHTML +=
    //     "<button id='play' onclick='startGame()'>Еще раз?</button>";
}

balls = [];
function startGame() {
    balls = [];
    World.clear(engine.world);
    isDefeat = false;
    isWin = false;
    health = 100;
    score = 0;
// Переменная, чтобы звук победы/поражения не проигрывался миллион раз
    wasPlayed = false;
    gameActive = true;
    var element = document.getElementById("play");
    element.parentNode.removeChild(element);
// Генерация шариков один раз
    for (i = 0; i < 30; i++) {
        let ball_random = Bodies.circle(getRandomArbitrary(-w * 2, w * 2),
            getRandomArbitrary(-h * 2, h), 25, {
                isStatic: true,
                render: ballStyle,
            });
        balls.push(ball_random);
        console.log("+1")
    }
    World.add(engine.world, balls);
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
    //draw dot for masses
    ctx.fillStyle = "purple";
    for (var i = 0; i < balls.length; i++) {
        ctx.fillRect(balls[i].position.x * scale + xOff - size, balls[i].position.y * scale + yOff, 3, 3);
    }
    //draw player's dot
    ctx.fillStyle = "white";
    ctx.fillRect(ball.position.x * scale + xOff - size, ball.position.y * scale + yOff, 5, 5);
    ctx.closePath();
}